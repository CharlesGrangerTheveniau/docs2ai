import type { CheerioAPI } from "cheerio";
import type { PlatformId } from "../platforms/base";
import { platformStrategies } from "../platforms/registry";

/**
 * Detect which documentation platform a page belongs to.
 * Tries platform-specific strategies in order, falls back to generic.
 */
export function resolve(url: string, $: CheerioAPI): PlatformId {
  for (const strategy of platformStrategies) {
    if (strategy.detect(url, $)) {
      return strategy.id;
    }
  }
  return "generic";
}
