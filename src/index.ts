import express from 'express';
import pino from 'pino';
import * as path from 'path';
import { TimerService } from './core/timer-service';
import { InMemoryTimerStore } from './infra/memory-store';
import { NodeScheduler } from './infra/scheduler';
import { InMemoryEventBus } from './infra/event-bus';
import { createTimerRouter } from './api/timer-routes';
import { SimpleViewRenderer } from './views/view-renderer';
import { PageController } from './controllers/page-controller';

const config = {
  port: parseInt(process.env.EGGTIMER_PORT || '3000'),
  logLevel: process.env.LOG_LEVEL || 'info'
};

const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty'
  }
});

/**
 * Clean MVC Application bootstrap
 * Follows SOLID principles with proper separation of concerns
 */
class Application {
  private readonly app: express.Application;
  private readonly timerService: TimerService;
  private readonly store: InMemoryTimerStore;
  private readonly scheduler: NodeScheduler;
  private readonly eventBus: InMemoryEventBus;
  private readonly viewRenderer: SimpleViewRenderer;
  private readonly pageController: PageController;
  private server: any;

  constructor() {
    this.store = new InMemoryTimerStore();
    this.scheduler = new NodeScheduler();
    this.eventBus = new InMemoryEventBus();
    this.timerService = new TimerService(this.store, this.scheduler, this.eventBus);
    this.viewRenderer = new SimpleViewRenderer();
    this.pageController = new PageController(this.viewRenderer);
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    // Serve static CSS files
    this.app.use('/css', express.static(path.join(__dirname, 'views/css')));
  }

  private setupRoutes(): void {
    this.app.get('/', this.pageController.renderTimerPage);
    this.app.get('/about', this.pageController.renderAboutPage);
    this.app.use('/api/timers', createTimerRouter({ timerService: this.timerService }));
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error({ err, req: req.url }, 'Unhandled error');
      res.status(500).json({ error: 'Internal server error' });
    });

    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');
          
          try {
            await this.scheduler.shutdown();
            await this.store.close();
            logger.info('Cleanup complete');
            process.exit(0);
          } catch (error) {
            logger.error({ error }, 'Error during cleanup');
            process.exit(1);
          }
        });
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async start(): Promise<void> {
    this.server = this.app.listen(config.port, () => {
      logger.info(`🥚 Egg Timer server running on port ${config.port}`);
      logger.info(`🌐 Visit http://localhost:${config.port} to use the timer`);
      logger.info(`📖 Visit http://localhost:${config.port}/about for more info`);
    });
  }
}

const app = new Application();
app.start().catch((error) => {
  logger.error({ error }, 'Failed to start application');
  process.exit(1);
});
