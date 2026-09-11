import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { getSettings } from './settings.js';
import { extractEvidenceWithGemini, synthesizeWithDeepSeek, STUDIO_PROFILES, validateSvgWithGemini } from './generator.js';
import { createStudyVisuals } from './visuals.js';
import { extractCropFromPdf } from './crop_extractor.js';
import { BlobStore } from '../../../../packages/storage/src/blob_store.js';

export function startBatchWorker(db: Database, blobStorePath: string) {
  console.log("Starting batch worker loop...");
  setTimeout(() => processNextBatchItem(db, blobStorePath), 1000);
}

async function processNextBatchItem(db: Database, blobStorePath: string) {
  let currentItemId: string | undefined;

  try {
    // 1. Check if there are any jobs in PROCESSING that have no pending items
    const completedJobs = db.prepare(`
      SELECT id FROM batch_jobs 
      WHERE status IN ('PENDING', 'PROCESSING') 
      AND (
        SELECT COUNT(*) FROM batch_job_items 
        WHERE batch_job_id = batch_jobs.id AND status != 'COMPLETED' AND status != 'FAILED'
      ) = 0
    `).all() as { id: string }[];

    for (const job of completedJobs) {
      console.log(`Batch job ${job.id} has finished processing all items. Marking COMPLETED.`);
      db.prepare(`UPDATE batch_jobs SET status = 'COMPLETED', updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), job.id);
    }

    // 2. Find a pending item to process
    const item = db.prepare(`
      SELECT i.id, i.batch_job_id, i.source_id, j.project_id
      FROM batch_job_items i
      JOIN batch_jobs j ON j.id = i.batch_job_id
      WHERE i.status = 'PENDING'
      ORDER BY i.created_at ASC
      LIMIT 1
    `).get() as { id: string, batch_job_id: string, source_id: string, project_id: string } | undefined;

    if (!item) {
      // Nothing to do, wait and try again
      setTimeout(() => processNextBatchItem(db, blobStorePath), 1000);
      return;
    }

    currentItemId = item.id;

    // Mark job as processing
    db.prepare(`UPDATE batch_jobs SET status = 'PROCESSING', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), item.batch_job_id);

    console.log(`Processing batch item ${item.id} for source ${item.source_id}...`);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(item.project_id) as any;
    const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(item.source_id) as any;
    
    if (!project || !source) {
      db.prepare(`UPDATE batch_job_items SET status = 'FAILED', error = 'Project or Source missing' WHERE id = ?`).run(item.id);
      setTimeout(() => processNextBatchItem(db, blobStorePath), 1000);
      return;
    }

    const profile = STUDIO_PROFILES.find(p => p.id === project.subject_profile_id);
    if (!profile) {
      db.prepare(`UPDATE batch_job_items SET status = 'FAILED', error = 'Profile not found' WHERE id = ?`).run(item.id);
      setTimeout(() => processNextBatchItem(db, blobStorePath), 1000);
      return;
    }

    const rows = db.prepare(`
      SELECT normalized_text
      FROM source_pages
      WHERE source_id = ?
      ORDER BY unit_index ASC
    `).all(item.source_id) as Array<{ normalized_text: string | null }>;
    const sourceText = rows.map((row) => row.normalized_text ?? '').join('\n\n').slice(0, 5000000);
    
    const blobStore = new BlobStore(blobStorePath);
    const pdfPath = blobStore.getPath(source.file_hash);

    let evidenceJson = "";
    const settings = await getSettings(db);

    // Step 1: EXTRACTING
    db.prepare(`UPDATE batch_job_items SET status = 'EXTRACTING', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), item.id);

    if (settings.isDemo) {
      evidenceJson = JSON.stringify({
        pages: [{ concepts: ["Demo Concept 1", "Demo Concept 2"] }]
      });
    } else {
      if (!settings.geminiKey) throw new Error("Gemini API Key missing");
      if (!pdfPath) throw new Error("PDF file missing");
      
      console.log(`Extracting evidence with Gemini for source ${item.source_id}...`);
      evidenceJson = await extractEvidenceWithGemini(
        settings.geminiKey,
        "gemini-3.1-pro-preview",
        pdfPath,
        source.file_name
      );
      
      db.prepare(`UPDATE batch_job_items SET gemini_evidence_json = ?, updated_at = ? WHERE id = ?`)
        .run(evidenceJson, new Date().toISOString(), item.id);
    }

    // Step 2: SYNTHESIZING
    db.prepare(`UPDATE batch_job_items SET status = 'SYNTHESIZING', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), item.id);
      
    let summaryMd = "";
    if (settings.isDemo) {
      summaryMd = "## Riassunto Demo\nQuesto e un riassunto demo.";
    } else {
      if (!settings.deepseekKey) throw new Error("DeepSeek API Key missing");
      console.log(`Synthesizing with DeepSeek for source ${item.source_id}...`);
      summaryMd = await synthesizeWithDeepSeek(
        settings.deepseekKey,
        "deepseek-chat",
        {
          title: project.title,
          sourceName: source.file_name,
          profile,
          mode: 'RIASSUNTO'
        },
        evidenceJson
      );
      
      db.prepare(`UPDATE batch_job_items SET deepseek_summary = ?, updated_at = ? WHERE id = ?`)
        .run(summaryMd, new Date().toISOString(), item.id);
    }

    // Step 3: SVG & Save Output
    db.prepare(`UPDATE batch_job_items SET status = 'SVG', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), item.id);

    console.log(`Generating SVGs and saving outputs for source ${item.source_id}...`);
    const outputId = randomUUID();
    const now = new Date().toISOString();
    
    let generatedVisuals = createStudyVisuals({
      title: project.title,
      sourceName: source.file_name,
      sourceText,
      profile,
      evidenceJson
    });

    // Validazione Iterativa
    for (let i = 0; i < generatedVisuals.length; i++) {
      const v = generatedVisuals[i];
      if (v.boundingBox && Array.isArray(v.boundingBox) && v.boundingBox.length === 4) {
        try {
          console.log(`Extracting crop for figure ${v.id} (Page ${v.pageNumber})`);
          const cropBuffer = await extractCropFromPdf(pdfPath, v.pageNumber || 1, v.boundingBox as [number, number, number, number]);
          
          const instructions = `L'SVG intende rappresentare una figura di tipo "${v.kind}".`;
          console.log(`Validating SVG for figure ${v.id}...`);
          
          const svgBuffer = Buffer.from(v.svg, 'utf-8');
          const validation = await validateSvgWithGemini(settings.geminiKey, svgBuffer, cropBuffer, instructions);
          
          if (!validation.passed) {
            console.warn(`SVG validation failed for ${v.id}: ${validation.feedback}`);
            // Fallback: embed the raster crop in an SVG wrapper
            const b64 = cropBuffer.toString('base64');
            v.svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <image href="data:image/png;base64,${b64}" width="800" height="600" preserveAspectRatio="xMidYMid meet" />
</svg>`;
            v.kind = 'crop_fallback';
          } else {
            console.log(`SVG validation PASSED for ${v.id}`);
          }
        } catch (e) {
          console.error(`Validation error for ${v.id}`, e);
        }
      }
    }

    const saveOutput = db.transaction(() => {
      db.prepare(`
        INSERT INTO study_outputs (id, project_id, source_id, title, profile_id, mode, provider, model, content_md, created_at)
        VALUES (?, ?, ?, ?, ?, 'RIASSUNTO', ?, ?, ?, ?)
      `).run(outputId, project.id, source.id, project.title, profile.id, settings.provider, settings.model, summaryMd, now);

      const insertVisual = db.prepare(`
        INSERT INTO study_visuals (id, output_id, project_id, source_id, title, kind, svg, alt_text, caption, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      generatedVisuals.forEach((visual) => {
        insertVisual.run(
          randomUUID(),
          outputId,
          project.id,
          source.id,
          visual.title,
          visual.kind,
          visual.svg,
          visual.altText,
          visual.caption,
          now
        );
      });
      
      db.prepare(`UPDATE batch_job_items SET status = 'COMPLETED', updated_at = ? WHERE id = ?`)
        .run(now, item.id);
    });
    
    saveOutput();
    console.log(`Finished processing batch item ${item.id}.`);

  } catch (error) {
    console.error("Batch worker error:", error);
    if (currentItemId) {
      db.prepare(`UPDATE batch_job_items SET status = 'FAILED', error = ?, updated_at = ? WHERE id = ?`)
        .run(error instanceof Error ? error.message : String(error), new Date().toISOString(), currentItemId);
    }
  }

  // Continue polling
  setTimeout(() => processNextBatchItem(db, blobStorePath), 1000);
}
