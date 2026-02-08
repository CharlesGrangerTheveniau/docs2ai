import type { PlatformId, PlatformStrategy } from "./base";
import { mintlify } from "./mintlify";
import { docusaurus } from "./docusaurus";
import { readme } from "./readme";
import { gitbook } from "./gitbook";
import { generic } from "./generic";

/** Ordered list of platform strategies. Generic must be last (always matches). */
export const platformStrategies: PlatformStrategy[] = [
  mintlify,
  docusaurus,
  readme,
  gitbook,
  generic,
];

/** Get a strategy by its platform ID. */
export function getStrategy(id: PlatformId): PlatformStrategy {
  const strategy = platformStrategies.find((s) => s.id === id);
  if (!strategy) {
    throw new Error(`Unknown platform: ${id}`);
  }
  return strategy;
}
