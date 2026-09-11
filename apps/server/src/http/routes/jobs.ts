import express from 'express';
import type { Request, Response } from 'express';
import { JobRepository } from '../../../../../packages/storage/src/job_repository.js';
import crypto from 'crypto';

export function createJobsRouter(repo: JobRepository) {
  const router = express.Router();

  // M03 - Create Job
  router.post('/', (req: Request, res: Response) => {
    const { projectId, requestRevisionId, budgetAccountId } = req.body;
    if (!projectId || !requestRevisionId || !budgetAccountId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const jobId = repo.createJob(projectId, requestRevisionId, budgetAccountId);
    repo.appendJobEvent(jobId, 'job.created', { jobId, status: 'DRAFT' });
    res.json({ data: { jobId } });
  });

  // M03 - Start Job
  router.post('/:id/start', (req: Request, res: Response) => {
    const jobId = req.params.id;
    const job = repo.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'DRAFT' && job.status !== 'PAUSED' && job.status !== 'WAITING_BUDGET' && job.status !== 'WAITING_PROVIDER') {
      return res.status(409).json({ error: 'Invalid state transition' });
    }

    repo.updateJobStatus(jobId, 'QUEUED');
    repo.appendJobEvent(jobId, 'job.state_changed', { status: 'QUEUED' });
    
    // Create an initial task if not already tasks exist
    const existingTasks = repo.getTasksForJob(jobId);
    if (existingTasks.length === 0) {
      repo.createTask(jobId, 'EXTRACT_TEXT', crypto.createHash('sha256').update(jobId).digest('hex'));
    }

    res.json({ ok: true });
  });

  // M03 - Pause Job
  router.post('/:id/pause', (req: Request, res: Response) => {
    const jobId = req.params.id;
    const job = repo.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    repo.updateJobStatus(jobId, 'PAUSED');
    repo.appendJobEvent(jobId, 'job.state_changed', { status: 'PAUSED' });
    res.json({ ok: true });
  });

  // M03 - Resume Job
  router.post('/:id/resume', (req: Request, res: Response) => {
    const jobId = req.params.id;
    const job = repo.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.status !== 'PAUSED') {
      return res.status(409).json({ error: 'Job is not paused' });
    }

    repo.updateJobStatus(jobId, 'QUEUED');
    repo.appendJobEvent(jobId, 'job.state_changed', { status: 'QUEUED' });
    res.json({ ok: true });
  });

  // M03 - Cancel Job
  router.post('/:id/cancel', (req: Request, res: Response) => {
    const jobId = req.params.id;
    const job = repo.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    repo.updateJobStatus(jobId, 'CANCELLED');
    repo.appendJobEvent(jobId, 'job.state_changed', { status: 'CANCELLED' });
    res.json({ ok: true });
  });

  // M03 - SSE Events
  router.get('/:id/events', (req: Request, res: Response) => {
    const jobId = req.params.id;
    const job = repo.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let lastSeq = parseInt(req.header('Last-Event-ID') || req.query.since as string || '0', 10);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvents = () => {
      const events = repo.getJobEvents(jobId, lastSeq);
      for (const ev of events) {
        res.write(`id: ${ev.sequence}\n`);
        res.write(`event: ${ev.type}\n`);
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
        lastSeq = ev.sequence;
      }
    };

    // Send initial catch-up events
    sendEvents();

    // Poll for new events (In a real scalable system we'd use an EventEmitter or Redis pubsub. Here polling the DB is fine for M03 local app)
    const interval = setInterval(() => {
      sendEvents();
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  return router;
}
