import { EventBus, TimerEvent, TimerEventType } from '../core/interfaces';

/**
 * Simple in-memory event bus implementation
 * Follows Single Responsibility and Open/Closed principles
 */
export class InMemoryEventBus implements EventBus {
  private readonly listeners = new Map<TimerEventType, Set<(event: TimerEvent) => void>>();

  emit(event: TimerEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      // Use setImmediate to avoid blocking if many handlers
      setImmediate(() => {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      });
    }
  }

  subscribe(type: TimerEventType, handler: (event: TimerEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  unsubscribe(type: TimerEventType, handler: (event: TimerEvent) => void): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}
