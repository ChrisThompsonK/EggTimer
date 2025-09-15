import express, { Request, Response, NextFunction } from 'express';
import { TimerService } from '../core/timer-service';
import { CreateTimerSchema, TimerParamsSchema } from './schemas';
import { z } from 'zod';

interface TimerRouterDependencies {
  timerService: TimerService;
}

/**
 * Express router for timer endpoints
 * Follows Dependency Inversion - depends on TimerService abstraction
 */
export function createTimerRouter({ timerService }: TimerRouterDependencies) {
  const router = express.Router();

  // Middleware for JSON parsing
  router.use(express.json());

  // POST /timers - Create new timer
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = CreateTimerSchema.parse(req.body);
      const id = await timerService.createTimer(validatedData);
      res.status(201).json({ id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.issues 
        });
      } else {
        next(error);
      }
    }
  });

  // GET /timers/:id - Get timer details
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = TimerParamsSchema.parse(req.params);
      const timer = await timerService.getTimer(id);
      
      if (!timer) {
        res.status(404).json({ error: 'Timer not found' });
        return;
      }

      // Convert to response format (exclude internal monotonic timestamp)
      const { startMonotonicMs, ...timerResponse } = timer;
      res.json(timerResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid timer ID', 
          details: error.issues 
        });
      } else {
        next(error);
      }
    }
  });

  // POST /timers/:id/pause - Pause timer
  router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = TimerParamsSchema.parse(req.params);
      await timerService.pauseTimer(id);
      res.status(200).json({ message: 'Timer paused' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid timer ID', 
          details: error.issues 
        });
      } else {
        next(error);
      }
    }
  });

  // POST /timers/:id/resume - Resume timer
  router.post('/:id/resume', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = TimerParamsSchema.parse(req.params);
      await timerService.resumeTimer(id);
      res.status(200).json({ message: 'Timer resumed' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid timer ID', 
          details: error.issues 
        });
      } else {
        next(error);
      }
    }
  });

  // DELETE /timers/:id - Cancel timer
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = TimerParamsSchema.parse(req.params);
      await timerService.cancelTimer(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid timer ID', 
          details: error.issues 
        });
      } else {
        next(error);
      }
    }
  });

  // GET /timers - List all timers
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timers = await timerService.listTimers();
      const timersResponse = timers.map(({ startMonotonicMs, ...timer }) => timer);
      res.json(timersResponse);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
