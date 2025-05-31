import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import dotenv from "dotenv";
import { debug } from "./tools/utils";
import { getIncidents, getIncidentsShape } from "./tools/getIncidents";
import { getReports, getReportsShape } from "./tools/getReports";
import { getClassifications, getClassificationsShape } from "./tools/getClassifications";
import { getTaxonomies, getTaxonomiesShape } from "./tools/getTaxonomies.js";
import { getSchema, getSchemaShape } from "./tools/getSchema.js";

dotenv.config();

const server = new McpServer({
  name: "AIID GraphQL MCP Server",
  version: "1.0.0",
  description: "Expose AI Incident Database GraphQL API via MCP",
  debug: true,
});

server.tool(
  "get-incidents",
  "Fetch incidents from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific incident fields.",
  getIncidentsShape,
  getIncidents
);

server.tool(
  "get-reports",
  "Fetch reports from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific report fields.",
  getReportsShape,
  getReports
);

server.tool(
  "get-classifications",
  "Fetch classifications from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific classification fields.",
  getClassificationsShape, getClassifications
);

server.tool(
  "get-taxonomies",
  "Fetch taxonomies from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific taxonomy fields.",
  getTaxonomiesShape, // Corrected: Use the shape directly
  getTaxonomies
);

server.tool(
  "get-schema",
  "Fetch the GraphQL schema from the AIID GraphQL API in JSON format.",
  getSchemaShape,
  getSchema
);

async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    debug("AIID MCP Server connected via stdio");
  } catch (error) {
    console.error("Failed to start AIID MCP Server:", error);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  debug("Unhandled Rejection: %o", reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  debug("Uncaught Exception: %o", error);
  process.exit(1);
});