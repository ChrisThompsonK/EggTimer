import { Request, Response } from 'express';
import { TimerService } from '../core/timer-service';
import { CreateTimerRequest, TimerParams } from '../api/schemas';

/**
 * Timer API controller - follows Single Responsibility Principle
 * Handles all timer-related HTTP requests
 */
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  /**
   * Create a new timer
   */
  createTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      const request = req.body as CreateTimerRequest;
      const timerId = await this.timerService.createTimer(request);
      const timer = await this.timerService.getTimer(timerId);
      res.json(timer);
    } catch (error) {
      console.error('Error creating timer:', error);
      res.status(500).json({ error: 'Failed to create timer' });
    }
  };

  /**
   * Get all timers
   */
  getTimers = async (req: Request, res: Response): Promise<void> => {
    try {
      const timers = await this.timerService.listTimers();
      res.json(timers);
    } catch (error) {
      console.error('Error getting timers:', error);
      res.status(500).json({ error: 'Failed to get timers' });
    }
  };

  /**
   * Get a specific timer by ID
   */
  getTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as TimerParams;
      const timer = await this.timerService.getTimer(id);
      
      if (!timer) {
        res.status(404).json({ error: 'Timer not found' });
        return;
      }
      
      res.json(timer);
    } catch (error) {
      console.error('Error getting timer:', error);
      res.status(500).json({ error: 'Failed to get timer' });
    }
  };

  /**
   * Pause a timer
   */
  pauseTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as TimerParams;
      await this.timerService.pauseTimer(id);
      res.json({ message: 'Timer paused' });
    } catch (error) {
      console.error('Error pausing timer:', error);
      if (error instanceof Error && error.message === 'Timer not found') {
        res.status(404).json({ error: 'Timer not found' });
      } else {
        res.status(500).json({ error: 'Failed to pause timer' });
      }
    }
  };

  /**
   * Resume a timer
   */
  resumeTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as TimerParams;
      await this.timerService.resumeTimer(id);
      res.json({ message: 'Timer resumed' });
    } catch (error) {
      console.error('Error resuming timer:', error);
      if (error instanceof Error && error.message === 'Timer not found') {
        res.status(404).json({ error: 'Timer not found' });
      } else {
        res.status(500).json({ error: 'Failed to resume timer' });
      }
    }
  };

  /**
   * Cancel/delete a timer
   */
  cancelTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as TimerParams;
      await this.timerService.cancelTimer(id);
      res.json({ message: 'Timer cancelled' });
    } catch (error) {
      console.error('Error cancelling timer:', error);
      if (error instanceof Error && error.message === 'Timer not found') {
        res.status(404).json({ error: 'Timer not found' });
      } else {
        res.status(500).json({ error: 'Failed to cancel timer' });
      }
    }
  };
}
