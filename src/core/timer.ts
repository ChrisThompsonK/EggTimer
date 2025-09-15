export enum TimerStatus {
  CREATED = 'created',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELED = 'canceled'
}

export interface Timer {
  id: string;
  name?: string;
  durationMs: number;
  startMonotonicMs: number;
  paused: boolean;
  remainingMs: number;
  createdAt: Date;
  status: TimerStatus;
}

export interface TimerCreateRequest {
  name?: string;
  duration: string | number | { ms: number };
}

export interface TimerResponse extends Omit<Timer, 'startMonotonicMs'> {
  remainingMs: number;
}
