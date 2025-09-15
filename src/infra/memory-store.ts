import { Timer } from '../core/timer';
import { TimerStore } from '../core/interfaces';

/**
 * Simple in-memory timer store implementation
 * Follows Single Responsibility and Interface Segregation principles
 */
export class InMemoryTimerStore implements TimerStore {
  private readonly timers = new Map<string, Timer>();

  async get(id: string): Promise<Timer | null> {
    const timer = this.timers.get(id);
    return timer ? { ...timer } : null; // Return copy to avoid mutations
  }

  async put(timer: Timer): Promise<void> {
    this.timers.set(timer.id, { ...timer }); // Store copy to avoid mutations
  }

  async delete(id: string): Promise<void> {
    this.timers.delete(id);
  }

  async list(): Promise<Timer[]> {
    return Array.from(this.timers.values()).map(timer => ({ ...timer }));
  }

  async close(): Promise<void> {
    this.timers.clear();
  }
}
