import { setTimeout as sleep } from 'node:timers/promises';
import { Scheduler } from '../core/interfaces';

/**
 * Node.js timer-based scheduler implementation
 * Follows Single Responsibility principle
 */
export class NodeScheduler implements Scheduler {
  private readonly scheduledTimers = new Map<string, AbortController>();

  async schedule(
    id: string, 
    dueInMs: number, 
    callback: () => Promise<void>, 
    signal: AbortSignal
  ): Promise<void> {
    // Cancel any existing timer for this ID
    this.cancel(id);

    const abortController = new AbortController();
    this.scheduledTimers.set(id, abortController);

    try {
      await sleep(dueInMs, undefined, { signal: abortController.signal });
      
      // Only execute if not aborted
      if (!abortController.signal.aborted) {
        await callback();
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error(`Timer ${id} callback error:`, error);
      }
    } finally {
      this.scheduledTimers.delete(id);
    }
  }

  cancel(id: string): void {
    const controller = this.scheduledTimers.get(id);
    if (controller) {
      controller.abort();
      this.scheduledTimers.delete(id);
    }
  }

  async shutdown(): Promise<void> {
    // Cancel all scheduled timers
    for (const [id, controller] of this.scheduledTimers) {
      controller.abort();
    }
    this.scheduledTimers.clear();
  }
}
