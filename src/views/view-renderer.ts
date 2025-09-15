import * as fs from 'fs';
import * as path from 'path';

/**
 * View renderer interface - follows Single Responsibility Principle
 */
export interface ViewRenderer {
  render(templateName: string, data?: Record<string, any>): string;
}

/**
 * Simple template renderer implementation
 * Follows Open/Closed Principle - can be extended for more complex templating
 */
export class SimpleViewRenderer implements ViewRenderer {
  private readonly viewsPath: string;

  constructor(viewsPath: string = path.join(__dirname, './')) {
    this.viewsPath = viewsPath;
  }

  render(templateName: string, data: Record<string, any> = {}): string {
    const template = this.getTemplate(templateName);
    return this.interpolateTemplate(template, data);
  }

  private getTemplate(templateName: string): string {
    try {
      const templatePath = path.join(this.viewsPath, `${templateName}.html`);
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      throw new Error(`Template '${templateName}' not found at ${this.viewsPath}`);
    }
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    // Simple template interpolation - could be extended with a proper template engine
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value));
    });

    return result;
  }
}
