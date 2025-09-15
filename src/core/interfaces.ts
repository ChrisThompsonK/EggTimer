import { Timer } from './timer';

/**
 * Interface for timer storage (follows Interface Segregation Principle)
 */
export interface TimerStore {
  get(id: string): Promise<Timer | null>;
  put(timer: Timer): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<Timer[]>;
  close(): Promise<void>;
}

/**
 * Interface for scheduling timer completions (Single Responsibility)
 */
export interface Scheduler {
  schedule(id: string, dueInMs: number, callback: () => Promise<void>, signal: AbortSignal): Promise<void>;
  cancel(id: string): void;
  shutdown(): Promise<void>;
}

/**
 * Interface for event publishing (Single Responsibility)
 */
export interface EventBus {
  emit(event: TimerEvent): void;
  subscribe(type: TimerEventType, handler: (event: TimerEvent) => void): void;
  unsubscribe(type: TimerEventType, handler: (event: TimerEvent) => void): void;
}

export enum TimerEventType {
  TIMER_CREATED = 'timer_created',
  TIMER_COMPLETED = 'timer_completed',
  TIMER_PAUSED = 'timer_paused',
  TIMER_RESUMED = 'timer_resumed',
  TIMER_CANCELED = 'timer_canceled'
}

export interface TimerEvent {
  type: TimerEventType;
  id: string;
  name?: string;
  timestamp: Date;
  data?: any;
}
