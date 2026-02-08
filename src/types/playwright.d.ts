declare module "playwright" {
  interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  interface Page {
    goto(url: string, options?: { waitUntil?: string }): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    content(): Promise<string>;
  }

  interface BrowserType {
    launch(options?: { headless?: boolean }): Promise<Browser>;
  }

  export const chromium: BrowserType;
}
