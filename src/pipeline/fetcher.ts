import { ofetch } from "ofetch";

/**
 * Fetch the raw HTML of a documentation page.
 * Uses static fetch by default.
 */
export async function fetchPage(url: string): Promise<string> {
  const html = await ofetch(url, { responseType: "text" });
  return html;
}

/**
 * Fetch a page using Playwright for JS-rendered sites.
 * Playwright is an optional dependency — throws a typed error if not installed.
 */
export async function fetchWithBrowser(url: string): Promise<string> {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    const err = new Error(
      "Playwright is not installed. Run:\n  npm install -D playwright && npx playwright install chromium"
    );
    (err as any).code = "ERR_PLAYWRIGHT_NOT_INSTALLED";
    throw err;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    // Extra buffer for late-loading content
    await page.waitForTimeout(1000);
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}
