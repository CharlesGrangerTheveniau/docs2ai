import { defineCommand } from "citty";
import { resolve } from "node:path";

export const serveCommand = defineCommand({
  meta: {
    name: "serve",
    description: "Start an MCP server exposing documentation tools",
  },
  args: {
    dir: {
      type: "string",
      alias: "d",
      description: "Documentation directory to serve",
      default: ".ai/docs/",
    },
  },
  async run({ args }) {
    const docsDir = resolve(process.cwd(), args.dir as string);
    const { createMcpServer } = await import("../mcp/server");
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const server = createMcpServer(docsDir);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  },
});
