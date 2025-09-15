import { Timer, TimerStatus, TimerCreateRequest } from './timer';
import { TimerStore, Scheduler, EventBus, TimerEventType } from './interfaces';

/**
 * Core timer service implementing business logic (Single Responsibility)
 * Follows Dependency Inversion - depends on abstractions, not concrete implementations
 */
export class TimerService {
  private readonly store: TimerStore;
  private readonly scheduler: Scheduler;
  private readonly eventBus: EventBus;

  constructor(store: TimerStore, scheduler: Scheduler, eventBus: EventBus) {
    this.store = store;
    this.scheduler = scheduler;
    this.eventBus = eventBus;
  }

  async createTimer(request: TimerCreateRequest): Promise<string> {
    const id = this.generateId();
    const durationMs = this.parseDuration(request.duration);
    const now = performance.now();
    
    const timer: Timer = {
      id,
      name: request.name,
      durationMs,
      startMonotonicMs: now,
      paused: false,
      remainingMs: durationMs,
      createdAt: new Date(),
      status: TimerStatus.RUNNING
    };

    await this.store.put(timer);
    
    // Schedule completion
    const abortController = new AbortController();
    this.scheduler.schedule(
      id, 
      durationMs, 
      () => this.completeTimer(id),
      abortController.signal
    );

    this.eventBus.emit({
      type: TimerEventType.TIMER_CREATED,
      id,
      name: request.name,
      timestamp: new Date()
    });

    return id;
  }

  async getTimer(id: string): Promise<Timer | null> {
    const timer = await this.store.get(id);
    if (!timer) return null;

    // Update remaining time based on current monotonic time
    if (timer.status === TimerStatus.RUNNING && !timer.paused) {
      const now = performance.now();
      const elapsed = now - timer.startMonotonicMs;
      timer.remainingMs = Math.max(0, timer.durationMs - elapsed);
    }

    return timer;
  }

  async pauseTimer(id: string): Promise<void> {
    const timer = await this.store.get(id);
    if (!timer || timer.status !== TimerStatus.RUNNING || timer.paused) {
      return; // Idempotent
    }

    // Calculate remaining time
    const now = performance.now();
    const elapsed = now - timer.startMonotonicMs;
    timer.remainingMs = Math.max(0, timer.durationMs - elapsed);
    timer.paused = true;
    timer.status = TimerStatus.PAUSED;

    await this.store.put(timer);
    this.scheduler.cancel(id);

    this.eventBus.emit({
      type: TimerEventType.TIMER_PAUSED,
      id,
      name: timer.name,
      timestamp: new Date()
    });
  }

  async resumeTimer(id: string): Promise<void> {
    const timer = await this.store.get(id);
    if (!timer || timer.status !== TimerStatus.PAUSED) {
      return; // Idempotent
    }

    // Reset start time and schedule for remaining duration
    timer.startMonotonicMs = performance.now();
    timer.durationMs = timer.remainingMs;
    timer.paused = false;
    timer.status = TimerStatus.RUNNING;

    await this.store.put(timer);

    const abortController = new AbortController();
    this.scheduler.schedule(
      id,
      timer.remainingMs,
      () => this.completeTimer(id),
      abortController.signal
    );

    this.eventBus.emit({
      type: TimerEventType.TIMER_RESUMED,
      id,
      name: timer.name,
      timestamp: new Date()
    });
  }

  async cancelTimer(id: string): Promise<void> {
    const timer = await this.store.get(id);
    if (!timer || timer.status === TimerStatus.COMPLETED || timer.status === TimerStatus.CANCELED) {
      return; // Idempotent
    }

    timer.status = TimerStatus.CANCELED;
    await this.store.put(timer);
    this.scheduler.cancel(id);

    this.eventBus.emit({
      type: TimerEventType.TIMER_CANCELED,
      id,
      name: timer.name,
      timestamp: new Date()
    });
  }

  async listTimers(): Promise<Timer[]> {
    return this.store.list();
  }

  private async completeTimer(id: string): Promise<void> {
    const timer = await this.store.get(id);
    if (!timer || timer.status === TimerStatus.COMPLETED) {
      return; // Idempotent
    }

    timer.status = TimerStatus.COMPLETED;
    timer.remainingMs = 0;
    await this.store.put(timer);

    this.eventBus.emit({
      type: TimerEventType.TIMER_COMPLETED,
      id,
      name: timer.name,
      timestamp: new Date()
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private parseDuration(duration: string | number | { ms: number }): number {
    if (typeof duration === 'number') {
      return duration;
    }
    
    if (typeof duration === 'object' && 'ms' in duration) {
      return duration.ms;
    }

    // Parse string format like "10m", "2h30m", "45s"
    const timeStr = duration.toString().toLowerCase();
    const regex = /(\d+)([smhd])/g;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(timeStr)) !== null) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 's': totalMs += value * 1000; break;
        case 'm': totalMs += value * 60 * 1000; break;
        case 'h': totalMs += value * 60 * 60 * 1000; break;
        case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
      }
    }

    if (totalMs === 0) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    return totalMs;
  }
}
