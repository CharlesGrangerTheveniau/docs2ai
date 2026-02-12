import { defineCommand, runMain, runCommand } from "citty";
import consola from "consola";
import { fetchCommand } from "./commands/fetch";
import { addCommand } from "./commands/add";
import { updateCommand } from "./commands/update";
import { listCommand } from "./commands/list";
import { serveCommand } from "./commands/serve";
import { pullCommand } from "./commands/pull";

process.on("uncaughtException", (err: any) => {
  if (err.code === "ERR_PLAYWRIGHT_NOT_INSTALLED") {
    consola.error(err.message);
  } else {
    consola.error(err.message || err);
  }
  process.exit(1);
});

process.on("unhandledRejection", (err: any) => {
  if (err?.code === "ERR_PLAYWRIGHT_NOT_INSTALLED") {
    consola.error(err.message);
  } else {
    consola.error(err?.message || err);
  }
  process.exit(1);
});

const subCommands: Record<string, any> = {
  add: addCommand,
  update: updateCommand,
  list: listCommand,
  serve: serveCommand,
  pull: pullCommand,
};

// Check if first non-flag arg is a subcommand
const firstArg = process.argv[2];
const isSubCommand = firstArg && firstArg in subCommands;

if (isSubCommand) {
  // Let citty handle subcommand routing
  const main = defineCommand({
    meta: {
      name: "docmunch",
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
      name: "docmunch",
      version: "0.1.0",
      description: "Convert documentation URLs into AI-ready Markdown files",
    },
    subCommands,
    run() {
      console.log("Usage: docmunch <url> [-o output.md] [--crawl]");
      console.log("       docmunch add <url> [--name name] [--crawl]");
      console.log("       docmunch update [--name name]");
      console.log("       docmunch list");
      console.log("       docmunch serve [-d dir]");
      console.log("       docmunch pull <name>");
      console.log("\nRun `docmunch --help` for full usage.");
    },
  });
  runMain(main);
}
