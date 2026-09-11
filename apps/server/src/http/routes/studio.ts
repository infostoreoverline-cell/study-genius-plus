import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import type Database from 'better-sqlite3';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BlobStore } from '../../../../../packages/storage/src/blob_store.js';
import {
  buildStudyPrompt,
  createDemoSummary,
  generateWithProvider,
  getDefaultModel,
  STUDIO_PROFILES,
  type StudioProfile,
  type StudioProvider
} from '../../studio/generator.js';

type SqliteDatabase = Database.Database;

type StudioSettings = {
  provider: StudioProvider;
  apiKey: string;
  model: string;
  source: 'environment' | 'session' | 'none';
};

type ProjectRow = {
  id: string;
  title: string;
  subject_profile_id: string;
  created_at: string;
  sources_count?: number;
  outputs_count?: number;
  last_generated_at?: string | null;
};

type SourceRow = {
  id: string;
  project_id: string;
  file_name: string;
  mime_type: string;
  file_hash: string;
  status: string;
  anomalies_json: string | null;
  created_at: string;
  units_count?: number;
  chars_count?: number;
};

type OutputRow = {
  id: string;
  project_id: string;
  source_id: string;
  title: string;
  profile_id: string;
  mode: string;
  provider: string;
  model: string;
  content_md: string;
  created_at: string;
  source_name?: string | null;
  project_title?: string | null;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_STORED_TEXT = 300_000;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

const profilesById = new Map<string, StudioProfile>(
  STUDIO_PROFILES.map((profile) => [profile.id, profile])
);

export function createStudioRouter(db: SqliteDatabase, blobStorePath: string): Router {
  const router = Router();
  const blobStore = new BlobStore(blobStorePath);
  let settings = settingsFromEnvironment();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ready', mode: 'local-first-mvp' });
  });

  router.get('/profiles', (_req: Request, res: Response) => {
    res.json({ profiles: STUDIO_PROFILES });
  });

  router.get('/settings', (_req: Request, res: Response) => {
    res.json({
      configured: Boolean(settings.apiKey),
      provider: settings.provider,
      model: settings.model,
      source: settings.source
    });
  });

  router.post('/settings', (req: Request, res: Response) => {
    const provider = parseProvider(req.body?.provider);
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';

    if (!provider) {
      res.status(400).json({ error: 'Provider non supportato.' });
      return;
    }
    const model = sanitiseModel(req.body?.model, provider);
    if (apiKey.length < 8) {
      res.status(400).json({ error: 'Inserisci una chiave API valida.' });
      return;
    }

    settings = { provider, apiKey, model, source: 'session' };
    res.json({ configured: true, provider, model, source: 'session' });
  });

  router.get('/projects', (_req: Request, res: Response) => {
    const rows = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.subject_profile_id,
        p.created_at,
        (SELECT COUNT(*) FROM sources AS s WHERE s.project_id = p.id) AS sources_count,
        (SELECT COUNT(*) FROM study_outputs AS o WHERE o.project_id = p.id) AS outputs_count,
        (SELECT MAX(created_at) FROM study_outputs AS o WHERE o.project_id = p.id) AS last_generated_at
      FROM projects AS p
      ORDER BY p.created_at DESC
    `).all() as ProjectRow[];

    res.json({ projects: rows.map(mapProject) });
  });

  router.post('/projects', (req: Request, res: Response) => {
    const title = sanitiseTitle(req.body?.title);
    const profileId = typeof req.body?.profileId === 'string' ? req.body.profileId : '';

    if (!title) {
      res.status(400).json({ error: 'Inserisci un titolo per il progetto.' });
      return;
    }
    if (!profilesById.has(profileId)) {
      res.status(400).json({ error: 'Seleziona un profilo disciplinare valido.' });
      return;
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, title, subject_profile_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, title, profileId, createdAt);

    res.status(201).json({ project: mapProject({ id, title, subject_profile_id: profileId, created_at: createdAt }) });
  });

  router.get('/projects/:projectId/sources', (req: Request, res: Response) => {
    const projectId = routeParam(req.params.projectId);
    if (!projectExists(db, projectId)) {
      res.status(404).json({ error: 'Progetto non trovato.' });
      return;
    }

    const rows = db.prepare(`
      SELECT
        s.id,
        s.project_id,
        s.file_name,
        s.mime_type,
        s.file_hash,
        s.status,
        s.anomalies_json,
        s.created_at,
        (SELECT COUNT(*) FROM source_pages AS sp WHERE sp.source_id = s.id) AS units_count,
        (SELECT COALESCE(SUM(LENGTH(sp.normalized_text)), 0) FROM source_pages AS sp WHERE sp.source_id = s.id) AS chars_count
      FROM sources AS s
      WHERE s.project_id = ?
      ORDER BY s.created_at DESC
    `).all(projectId) as SourceRow[];

    res.json({ sources: rows.map(mapSource) });
  });

  router.post('/sources', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : '';
      const file = req.file;
      if (!projectId || !projectExists(db, projectId)) {
        throw new StudioHttpError(404, 'Progetto non trovato.');
      }
      if (!file) {
        throw new StudioHttpError(400, 'Seleziona un file PDF, TXT o Markdown.');
      }
      if (file.size === 0) {
        throw new StudioHttpError(400, 'Il file selezionato e vuoto.');
      }

      const extension = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        throw new StudioHttpError(400, 'Sono supportati solo file PDF, TXT e Markdown.');
      }

      const extraction = await extractText(file.buffer, extension);
      const sourceId = randomUUID();
      const sourceText = extraction.text.slice(0, MAX_STORED_TEXT);
      const anomalies = [...extraction.anomalies];
      if (extraction.text.length > MAX_STORED_TEXT) {
        anomalies.push(`Testo limitato ai primi ${MAX_STORED_TEXT.toLocaleString('it-IT')} caratteri.`);
      }
      if (!sourceText.trim()) {
        anomalies.push('Non e stato trovato testo selezionabile. Per i PDF scansiti esegui prima un OCR.');
      }

      const blobHash = blobStore.put(file.buffer);
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');
      const createdAt = new Date().toISOString();
      const mimeType = extension === '.pdf' ? 'application/pdf' : 'text/plain';
      const sourceName = sanitiseFileName(file.originalname);

      const saveSource = db.transaction(() => {
        db.prepare(`
          INSERT INTO sources (id, project_id, file_name, mime_type, file_hash, blob_id, status, anomalies_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, ?)
        `).run(sourceId, projectId, sourceName, mimeType, fileHash, blobHash, JSON.stringify(anomalies), createdAt);

        const insertPage = db.prepare(`
          INSERT INTO source_pages (id, source_id, unit_index, original_text, normalized_text, quality, needs_review)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const pages = splitIntoUnits(sourceText);
        pages.forEach((page, index) => {
          const hasText = page.trim().length >= 80;
          insertPage.run(
            randomUUID(),
            sourceId,
            `unit_${index + 1}`,
            page,
            normaliseWhitespace(page),
            hasText ? 'good' : 'ocr_needed',
            hasText ? 0 : 1
          );
        });
      });
      saveSource();

      const row = getSource(db, sourceId);
      res.status(201).json({ source: row ? mapSource(row) : null });
    } catch (error) {
      next(error);
    }
  });

  router.get('/projects/:projectId/outputs', (req: Request, res: Response) => {
    const projectId = routeParam(req.params.projectId);
    if (!projectExists(db, projectId)) {
      res.status(404).json({ error: 'Progetto non trovato.' });
      return;
    }
    const rows = db.prepare(`
      SELECT o.*, s.file_name AS source_name, p.title AS project_title
      FROM study_outputs AS o
      LEFT JOIN sources AS s ON s.id = o.source_id
      LEFT JOIN projects AS p ON p.id = o.project_id
      WHERE o.project_id = ?
      ORDER BY o.created_at DESC
    `).all(projectId) as OutputRow[];
    res.json({ outputs: rows.map(mapOutput) });
  });

  router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : '';
      const sourceId = typeof req.body?.sourceId === 'string' ? req.body.sourceId : '';
      const useAi = req.body?.useAi === true;
      const project = getProject(db, projectId);
      const source = getSource(db, sourceId);

      if (!project) throw new StudioHttpError(404, 'Progetto non trovato.');
      if (!source || source.project_id !== projectId) {
        throw new StudioHttpError(404, 'Fonte non trovata nel progetto selezionato.');
      }

      const profileId = typeof req.body?.profileId === 'string' ? req.body.profileId : project.subject_profile_id;
      const profile = profilesById.get(profileId);
      if (!profile) throw new StudioHttpError(400, 'Profilo disciplinare non valido.');

      const sourceText = getSourceText(db, sourceId);
      if (sourceText.trim().length < 80) {
        throw new StudioHttpError(422, 'Il file non contiene testo sufficiente. Usa un PDF con testo selezionabile oppure esegui prima un OCR.');
      }

      const input = {
        title: project.title,
        sourceName: source.file_name,
        sourceText,
        profile,
        mode: 'RIASSUNTO'
      };
      let content: string;
      let provider = 'demo';
      let model = 'local-extractive-v1';

      if (useAi) {
        if (!settings.apiKey) {
          throw new StudioHttpError(422, 'Configura prima una chiave API nelle Impostazioni oppure usa la modalita demo locale.');
        }
        try {
          content = await generateWithProvider(
            settings.provider,
            settings.apiKey,
            settings.model,
            buildStudyPrompt(input)
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Errore sconosciuto.';
          throw new StudioHttpError(502, `Il provider AI non ha completato la generazione. ${detail}`);
        }
        provider = settings.provider;
        model = settings.model;
      } else {
        content = createDemoSummary(input);
      }

      const outputId = randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO study_outputs (id, project_id, source_id, title, profile_id, mode, provider, model, content_md, created_at)
        VALUES (?, ?, ?, ?, ?, 'RIASSUNTO', ?, ?, ?, ?)
      `).run(outputId, projectId, sourceId, project.title, profile.id, provider, model, content, createdAt);

      const output = getOutput(db, outputId);
      res.status(201).json({ output: output ? mapOutput(output) : null });
    } catch (error) {
      next(error);
    }
  });

  router.get('/outputs/:outputId', (req: Request, res: Response) => {
    const output = getOutput(db, routeParam(req.params.outputId));
    if (!output) {
      res.status(404).json({ error: 'Risultato non trovato.' });
      return;
    }
    res.json({ output: mapOutput(output) });
  });

  router.get('/outputs/:outputId/download', (req: Request, res: Response) => {
    const output = getOutput(db, routeParam(req.params.outputId));
    if (!output) {
      res.status(404).json({ error: 'Risultato non trovato.' });
      return;
    }
    const fileName = `${sanitiseFileName(output.title || 'studygenius')}-riassunto.md`;
    res.type('text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(output.content_md);
  });

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof StudioHttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Il file supera il limite di 15 MB.' });
      return;
    }
    const detail = error instanceof Error ? error.message : 'Errore sconosciuto.';
    console.error('Studio API error:', detail);
    res.status(500).json({ error: 'Operazione non completata. Controlla il terminale del server.' });
  });

  return router;
}

class StudioHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function settingsFromEnvironment(): StudioSettings {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() ?? '';
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: sanitiseModel(process.env.GEMINI_MODEL, 'gemini'),
      source: 'environment'
    };
  }
  if (deepseekKey) {
    return {
      provider: 'deepseek',
      apiKey: deepseekKey,
      model: sanitiseModel(process.env.DEEPSEEK_MODEL, 'deepseek'),
      source: 'environment'
    };
  }
  return { provider: 'gemini', apiKey: '', model: getDefaultModel('gemini'), source: 'none' };
}

function parseProvider(value: unknown): StudioProvider | null {
  return value === 'gemini' || value === 'deepseek' ? value : null;
}

function routeParam(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function sanitiseModel(value: unknown, provider: StudioProvider): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return /^[a-zA-Z0-9._:-]{2,120}$/u.test(candidate) ? candidate : getDefaultModel(provider);
}

function sanitiseTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.replace(/[\r\n]+/gu, ' ').trim().slice(0, 120);
  return title.length >= 2 ? title : null;
}

function sanitiseFileName(value: string): string {
  const name = basename(value).replace(/[\r\n"\\/]+/gu, '-').trim().slice(0, 140);
  return name || 'fonte';
}

function projectExists(db: SqliteDatabase, projectId: string): boolean {
  return Boolean(db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId));
}

function getProject(db: SqliteDatabase, projectId: string): ProjectRow | undefined {
  return db.prepare(`
    SELECT id, title, subject_profile_id, created_at
    FROM projects
    WHERE id = ?
  `).get(projectId) as ProjectRow | undefined;
}

function getSource(db: SqliteDatabase, sourceId: string): SourceRow | undefined {
  return db.prepare(`
    SELECT
      s.id,
      s.project_id,
      s.file_name,
      s.mime_type,
      s.file_hash,
      s.status,
      s.anomalies_json,
      s.created_at,
      (SELECT COUNT(*) FROM source_pages AS sp WHERE sp.source_id = s.id) AS units_count,
      (SELECT COALESCE(SUM(LENGTH(sp.normalized_text)), 0) FROM source_pages AS sp WHERE sp.source_id = s.id) AS chars_count
    FROM sources AS s
    WHERE s.id = ?
  `).get(sourceId) as SourceRow | undefined;
}

function getSourceText(db: SqliteDatabase, sourceId: string): string {
  const rows = db.prepare(`
    SELECT normalized_text
    FROM source_pages
    WHERE source_id = ?
    ORDER BY unit_index ASC
  `).all(sourceId) as Array<{ normalized_text: string | null }>;
  return rows.map((row) => row.normalized_text ?? '').join('\n\n').slice(0, MAX_STORED_TEXT);
}

function getOutput(db: SqliteDatabase, outputId: string): OutputRow | undefined {
  return db.prepare(`
    SELECT o.*, s.file_name AS source_name, p.title AS project_title
    FROM study_outputs AS o
    LEFT JOIN sources AS s ON s.id = o.source_id
    LEFT JOIN projects AS p ON p.id = o.project_id
    WHERE o.id = ?
  `).get(outputId) as OutputRow | undefined;
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    title: row.title,
    profileId: row.subject_profile_id,
    createdAt: row.created_at,
    sourcesCount: Number(row.sources_count ?? 0),
    outputsCount: Number(row.outputs_count ?? 0),
    lastGeneratedAt: row.last_generated_at ?? null
  };
}

function mapSource(row: SourceRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileHash: row.file_hash,
    status: row.status,
    anomalies: parseJsonStringArray(row.anomalies_json),
    createdAt: row.created_at,
    unitsCount: Number(row.units_count ?? 0),
    charsCount: Number(row.chars_count ?? 0)
  };
}

function mapOutput(row: OutputRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceId: row.source_id,
    title: row.title,
    profileId: row.profile_id,
    mode: row.mode,
    provider: row.provider,
    model: row.model,
    content: row.content_md,
    createdAt: row.created_at,
    sourceName: row.source_name ?? null,
    projectTitle: row.project_title ?? null
  };
}

function parseJsonStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function extractText(buffer: Buffer, extension: string): Promise<{ text: string; anomalies: string[] }> {
  if (extension !== '.pdf') {
    return { text: buffer.toString('utf8'), anomalies: [] };
  }

  type PdfTextResult = { text?: unknown };
  type PdfParserInstance = {
    getText(): Promise<PdfTextResult>;
    destroy?: () => void | Promise<void>;
  };
  type PdfParserConstructor = new (options: { data: Uint8Array }) => PdfParserInstance;
  type PdfModule = { PDFParse?: PdfParserConstructor };

  const pdfModule = await import('pdf-parse') as unknown as PdfModule;
  if (!pdfModule.PDFParse) {
    throw new StudioHttpError(500, 'La libreria di lettura PDF non e disponibile. Esegui npm install e riavvia il server.');
  }

  const parser = new pdfModule.PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = typeof result.text === 'string' ? result.text : '';
    return { text, anomalies: text.trim() ? [] : ['Il PDF non contiene testo estraibile.'] };
  } finally {
    await parser.destroy?.();
  }
}

function splitIntoUnits(text: string): string[] {
  const pages = text.split(/\f/gu).map((page) => page.trim()).filter(Boolean);
  return pages.length > 0 ? pages : [text];
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}
