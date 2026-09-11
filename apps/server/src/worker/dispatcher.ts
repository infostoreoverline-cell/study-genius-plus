import { JobRepository } from '../../../../packages/storage/src/job_repository.js';
import { SimulatedProvider } from './simulated_provider.js';
import type { LedgerClient } from '../../../../packages/budget/src/ledger.js';
import type { AiGateway } from '../../../../packages/providers/src/gateway.js';

export class Dispatcher {
  private isRunning = false;
  private provider = new SimulatedProvider();
  private pollInterval: NodeJS.Timeout | null = null;
  private providers: Record<string, any> = {};

  constructor(
    private repo: JobRepository, 
    private ledger?: LedgerClient,
    private gateway?: AiGateway,
    private workerId: string = 'local-worker-1'
  ) {
    this.registerProvider('simulated_provider', this.provider);
  }

  registerProvider(id: string, provider: any) {
    this.providers[id] = provider;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) clearTimeout(this.pollInterval);
  }

  private loop() {
    if (!this.isRunning) return;
    
    // Attempt to claim a task (lease for 30 seconds)
    const task = this.repo.claimReadyTask(this.workerId, 30000);
    
    if (task) {
      this.processTask(task).finally(() => {
        // Immediately loop again if we found a task, to clear the queue faster
        setImmediate(() => this.loop());
      });
    } else {
      // Sleep briefly if no tasks
      this.pollInterval = setTimeout(() => this.loop(), 1000);
    }
  }

  private async processTask(task: any) {
    this.repo.appendJobEvent(task.job_id, 'task.started', { taskId: task.id, kind: task.kind });
    
    let callId: string | undefined;
    let reservedCost = 0;
    const job = this.repo.getJob(task.job_id);

    // M04: Reserve budget before execution
    if (this.ledger && job) {
      // Very naive estimation for tests
      reservedCost = 1000; // 0.001 EUR
      try {
        callId = this.ledger.reserve(job.budget_account_id, task.id, 'simulated-model', reservedCost);
        this.ledger.dispatch(callId);
      } catch (err: any) {
        this.repo.updateTaskState(task.id, 'FAILED');
        this.repo.appendJobEvent(task.job_id, 'task.failed', { taskId: task.id, error: err.message });
        return;
      }
    }

    let result: any;
    
    // Check if it's a real AI generation task to route to gateway
    if (this.gateway && task.kind === 'ai_generation') {
      try {
        const aiRequest = JSON.parse(task.input_hash); // Assuming input_hash contains JSON stringified req for now
        // In real app, we would reconstruct AiRequest from DB
        result = await this.gateway.execute(aiRequest);
        
        // Map AiResult back to expected format
        result = {
          success: !result.error,
          result: result.output[0]?.text || '',
          error: result.error
        };
      } catch (err: any) {
        result = { success: false, error: err.message };
      }
    } else {
      const providerToUse = this.providers['simulated_provider'] || this.provider;
      result = await providerToUse.executeTask(task.kind, task.input_hash, (msg: string) => {
        this.repo.appendJobEvent(task.job_id, 'task.progress', { taskId: task.id, message: msg });
      });
    }

    if (result.success) {
      if (this.ledger && callId && job) {
        // Assume actual cost is slightly less than reserved for test
        this.ledger.settle(job.budget_account_id, callId, reservedCost, reservedCost - 100);
      }
      
      this.repo.updateTaskState(task.id, 'SUCCEEDED');
      this.repo.appendJobEvent(task.job_id, 'task.completed', { taskId: task.id, result: result.result });
      
      // Check if this was the last task. In our simple mockup we transition job to COMPLETED for now.
      if (job && job.status === 'RUNNING' || job.status === 'QUEUED') {
        const remainingTasks = this.repo.getTasksForJob(job.id).filter((t: any) => t.state !== 'SUCCEEDED' && t.state !== 'FAILED' && t.state !== 'CANCELLED');
        if (remainingTasks.length === 0) {
          this.repo.updateJobStatus(job.id, 'COMPLETED');
          this.repo.appendJobEvent(job.id, 'job.state_changed', { status: 'COMPLETED' });
        }
      }
    } else {
      if (this.ledger && callId && job) {
        // If it failed in a retryable/ambiguous way we mark it uncertain, otherwise cancel
        if (result.error?.includes('429')) {
          this.ledger.markUncertain(job.budget_account_id, callId, reservedCost);
        } else {
          // If we are sure it wasn't charged:
          this.ledger.cancel(job.budget_account_id, callId, reservedCost);
        }
      }
      
      // On failure, if retryable we would reset to READY, but for M03/M04 we mark FAILED
      this.repo.updateTaskState(task.id, 'FAILED');
      this.repo.appendJobEvent(task.job_id, 'task.failed', { taskId: task.id, error: result.error });
      this.repo.updateJobStatus(task.job_id, 'FAILED');
      this.repo.appendJobEvent(task.job_id, 'job.state_changed', { status: 'FAILED' });
    }
  }
}
