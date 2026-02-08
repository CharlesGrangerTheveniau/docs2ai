import { defineCommand, runMain } from "citty";
import { fetchCommand } from "./commands/fetch";
import { addCommand } from "./commands/add";
import { updateCommand } from "./commands/update";
import { listCommand } from "./commands/list";

const main = defineCommand({
  meta: {
    name: "ctxify",
    version: "0.1.0",
    description: "Convert documentation URLs into AI-ready Markdown files",
  },
  args: {
    url: {
      type: "positional",
      description: "Documentation URL to convert",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output file path",
    },
    crawl: {
      type: "boolean",
      description: "Follow sidebar/nav links",
      default: false,
    },
    "max-depth": {
      type: "string",
      description: "Maximum crawl depth",
      default: "2",
    },
  },
  subCommands: {
    add: addCommand,
    update: updateCommand,
    list: listCommand,
  },
  run({ args }) {
    if (!args.url) {
      console.log("Usage: ctxify <url> [-o output.md] [--crawl]");
      console.log("       ctxify add <url> [--name name] [--crawl]");
      console.log("       ctxify update [--name name]");
      console.log("       ctxify list");
      console.log("\nRun `ctxify --help` for full usage.");
      return;
    }
    return (fetchCommand as any).run({ args });
  },
});

runMain(main);
