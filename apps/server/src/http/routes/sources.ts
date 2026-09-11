import { Router, Request, Response } from 'express';
import { getDatabase } from '../../../../../packages/storage/src/database.js';
import { BlobStore } from '../../../../../packages/storage/src/blob_store.js';
import { PdfParser } from '../../../../../packages/ingestion/src/pdf_parser.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';

// Temporary disk storage for uploads before they go to blob store
const upload = multer({ dest: 'uploads/' });

export function createSourcesRouter(dbPath: string, blobStorePath: string) {
  const router = Router();
  const blobStore = new BlobStore(blobStorePath);

  router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.body;
      const file = req.file;

      if (!projectId || !file) {
        res.status(400).json({ error: 'Missing projectId or file' });
        return;
      }

      // 1. Move to BlobStore and deduplicate
      const buffer = fs.readFileSync(file.path);
      const blobHash = blobStore.put(buffer);

      // Clean up temp multer file
      fs.unlinkSync(file.path);

      // 2. Parse (using PDF parser for now)
      const parser = new PdfParser();
      const parseResult = await parser.parse(buffer, file.mimetype);

      const db = getDatabase(dbPath);
      const sourceId = crypto.randomUUID();

      // 3. Save to Database
      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO sources (id, project_id, file_name, mime_type, file_hash, blob_id, status, anomalies_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(sourceId, projectId, file.originalname, file.mimetype, parseResult.fileHash, blobHash, 'READY', JSON.stringify(parseResult.anomalies));

        const insertUnit = db.prepare(`
          INSERT INTO source_pages (id, source_id, unit_index, original_text, normalized_text, quality, needs_review)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const unit of parseResult.units) {
          const unitId = crypto.randomUUID();
          insertUnit.run(unitId, sourceId, unit.id, unit.originalText, unit.normalizedText, unit.quality, unit.needsReview ? 1 : 0);
        }
      });

      tx();

      res.status(201).json({ success: true, sourceId, anomalies: parseResult.anomalies });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/project/:projectId', (req: Request, res: Response) => {
    try {
      const db = getDatabase(dbPath);
      const sources = db.prepare('SELECT * FROM sources WHERE project_id = ?').all(req.params.projectId);
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:sourceId/units', (req: Request, res: Response) => {
    try {
      const db = getDatabase(dbPath);
      const units = db.prepare('SELECT * FROM source_pages WHERE source_id = ?').all(req.params.sourceId);
      res.json(units);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
