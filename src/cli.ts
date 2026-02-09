import { defineCommand, runMain, runCommand } from "citty";
import { fetchCommand } from "./commands/fetch";
import { addCommand } from "./commands/add";
import { updateCommand } from "./commands/update";
import { listCommand } from "./commands/list";
import { serveCommand } from "./commands/serve";

const subCommands: Record<string, any> = {
  add: addCommand,
  update: updateCommand,
  list: listCommand,
  serve: serveCommand,
};

// Check if first non-flag arg is a subcommand
const firstArg = process.argv[2];
const isSubCommand = firstArg && firstArg in subCommands;

if (isSubCommand) {
  // Let citty handle subcommand routing
  const main = defineCommand({
    meta: {
      name: "docs2ai",
      version: "0.1.0",
      description: "Convert documentation URLs into AI-ready Markdown files",
    },
    subCommands,
  });
  runMain(main);
} else if (firstArg && !firstArg.startsWith("-") && firstArg !== "--help") {
  // Treat as a URL — run fetch command directly
  runCommand(fetchCommand, { rawArgs: process.argv.slice(2) });
} else {
  // No args or --help — show usage
  const main = defineCommand({
    meta: {
      name: "docs2ai",
      version: "0.1.0",
      description: "Convert documentation URLs into AI-ready Markdown files",
    },
    subCommands,
    run() {
      console.log("Usage: docs2ai <url> [-o output.md] [--crawl]");
      console.log("       docs2ai add <url> [--name name] [--crawl]");
      console.log("       docs2ai update [--name name]");
      console.log("       docs2ai list");
      console.log("       docs2ai serve [-d dir]");
      console.log("\nRun `docs2ai --help` for full usage.");
    },
  });
  runMain(main);
}
