import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import type { GenerateCardInput } from "./card.schema.js";

export class CardService {
  /**
   * Escape HTML characters for safe inclusion
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Generate HTML string for Reddit card
   */
  private generateRedditHtml(params: GenerateCardInput["body"]): string {
    const { username, avatarUrl, text } = params;

    // Read the template file
    const templatePath = path.join(process.cwd(), "src", "features", "card", "template", "reddit-card.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    const userHandle = username.toLowerCase().replace(/\s+/g, "_");
    const avatarInitial = username[0]?.toUpperCase() || "R";

    html = html.replace(/Puppy Redditor/g, this.escapeHtml(username));
    html = html.replace(/u\/puppy_redditor/g, `u/${this.escapeHtml(userHandle)}`);
    html = html.replace(/<div class="avatar">P<\/div>/g, `<div class="avatar">${avatarInitial}</div>`);
    html = html.replace(/My family didn't invite me to christmas because it's 'no place for losers' my brother said. I calmly agreed & stopped funding his children and wife. Now he's going crazy.../g, this.escapeHtml(text));

    // Handle avatar URL
    if (avatarUrl) {
      const avatarPlaceholder = `<div class="avatar">${avatarInitial}</div>`;
      const avatarHtml = `<div class="avatar"><img src="${this.escapeHtml(avatarUrl)}" alt="avatar"></div>`;
      html = html.replace(avatarPlaceholder, avatarHtml);
    }

    return html;
  }

  /**
   * Generate HTML string for X (Twitter) card
   */
  private generateXHtml(params: GenerateCardInput["body"]): string {
    const { username, avatarUrl, text } = params;

    // Read the template file
    const templatePath = path.join(process.cwd(), "src", "features", "card", "template", "x-card.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    const userHandle = username.toLowerCase().replace(/\s+/g, "");
    const avatarInitial = username[0]?.toUpperCase() || "X";

    html = html.replace(/X User/g, this.escapeHtml(username));
    html = html.replace(/@xuser/g, `@${this.escapeHtml(userHandle)}`);
    html = html.replace(/<div class="avatar">X<\/div>/g, `<div class="avatar">${avatarInitial}</div>`);
    html = html.replace(/This is a tweet that's going viral on X! The quick brown fox jumps over the lazy dog, and everyone is talking about it!/g, this.escapeHtml(text));

    // Handle avatar URL
    if (avatarUrl) {
      const avatarPlaceholder = `<div class="avatar">${avatarInitial}</div>`;
      const avatarHtml = `<div class="avatar"><img src="${this.escapeHtml(avatarUrl)}" alt="avatar"></div>`;
      html = html.replace(avatarPlaceholder, avatarHtml);
    }

    return html;
  }

  /**
   * Generate PNG card from HTML
   */
  private async generatePngFromHtml(html: string): Promise<Buffer> {
    // Launch Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 800, height: 450, deviceScaleFactor: 2 });
    
    // Set HTML content
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    // Capture only the card element
    const cardElement = await page.$('.card');
    if (!cardElement) throw new Error('Card element not found!');
    
    // Take screenshot
    const screenshot = (await cardElement.screenshot({ type: 'png' })) as Buffer;
    
    // Close browser
    await browser.close();
    
    return screenshot;
  }

  /**
   * Generate Reddit-style PNG card
   */
  async generateRedditCard(params: GenerateCardInput["body"]): Promise<Buffer> {
    const html = this.generateRedditHtml(params);
    return this.generatePngFromHtml(html);
  }

  /**
   * Generate X (Twitter)-style PNG card
   */
  async generateXCard(params: GenerateCardInput["body"]): Promise<Buffer> {
    const html = this.generateXHtml(params);
    return this.generatePngFromHtml(html);
  }
}

export const cardService = new CardService();
export default cardService;
