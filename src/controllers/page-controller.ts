import { Request, Response } from 'express';
import { ViewRenderer } from '../views/view-renderer';

/**
 * Page controller - follows Single Responsibility Principle
 * Handles web page routing and rendering
 */
export class PageController {
  constructor(private readonly viewRenderer: ViewRenderer) {}

  /**
   * Render the main timer page
   */
  renderTimerPage = (req: Request, res: Response): void => {
    try {
      const html = this.viewRenderer.render('timer');
      res.send(html);
    } catch (error) {
      console.error('Error rendering timer page:', error);
      res.status(500).send('Internal Server Error');
    }
  };

  /**
   * Render the about page
   */
  renderAboutPage = (req: Request, res: Response): void => {
    try {
      const html = this.viewRenderer.render('about');
      res.send(html);
    } catch (error) {
      console.error('Error rendering about page:', error);
      res.status(500).send('Internal Server Error');
    }
  };
}
