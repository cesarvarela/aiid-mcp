#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as graphql from "./graphql/generated/graphql.js"; // Import generated types
import dotenv from "dotenv";
import { z, ZodRawShape, ZodTypeAny } from "zod";
import fetch, { Response } from "node-fetch"; // Use node-fetch v2 for CommonJS compatibility if needed, else v3+ for ESM
import Debug from "debug";

dotenv.config();

const debug = Debug("aiid-mcp");

interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, unknown>;
}

async function graphqlRequest<T>({ query, variables = {} }: GraphQLRequestOptions): Promise<T> {
  const endpoint = process.env.AIID_GRAPHQL_ENDPOINT || 'https://incidentdatabase.ai/api/graphql';

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch (error: any) {
    debug("GraphQL request network error: %o", error);
    throw new Error(`Network error calling AIID GraphQL API: ${error.message}`);
  }

  if (!response.ok) {
    let errorBody = await response.text();
    try {
      errorBody = JSON.stringify(JSON.parse(errorBody));
    } catch (e) {
    }
    debug("GraphQL request failed: %s %s - %s", response.status, response.statusText, errorBody);
    throw new Error(`${response.status} ${response.statusText} calling AIID GraphQL API: ${errorBody}`);
  }

  const result = await response.json() as { data?: T; errors?: any[] };

  if (result.errors) {
    debug("GraphQL query errors: %O", result.errors);
    throw new Error(`GraphQL errors returned from AIID API: ${JSON.stringify(result.errors)}`);
  }

  if (result.data === undefined) {
    debug("GraphQL response missing data field");
    throw new Error("Malformed response from AIID GraphQL API: missing 'data' field.");
  }

  return result.data;
}

// --- Tool Implementations ---

// Define the expected response structure type
type McpToolResponse = Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;


// Helper function to create McpResponse object
function createMcpSuccessResponse(data: unknown): { content: { type: "text"; text: string }[] } {
  try {
    const text = JSON.stringify(data, null, 2); // Pretty print JSON
    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    debug("Error stringifying response data: %o", err);
    // Re-throw as a standard error for the server to catch
    throw new Error(`Failed to serialize response data: ${err.message}`);
  }
}

// Helper function to create McpResponse object for errors
function createMcpErrorResponse(message: string, err?: any): { content: { type: "text"; text: string }[]; isError: true } {
  const errorMessage = err instanceof Error ? err.message : String(err);
  debug("%s error: %s", message, errorMessage);
  return {
    content: [{ type: "text", text: `Error ${message}: ${errorMessage}` }],
    isError: true
  };
}

// Zod schema for pagination (reusable)
const paginationSchema = z.object({
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
}).optional();

const getIncidentsShape: ZodRawShape = {
  // Define filter fields based on IncidentFilterType from graphql.ts
  // Example: filter on incident_id
  filter: z.object({
    incident_id: z.object({ EQ: z.number().int() }).optional(),
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  // Define sort fields based on IncidentSortType
  sort: z.object({
    incident_id: z.enum(["ASC", "DESC"]).optional(),
    date: z.enum(["ASC", "DESC"]).optional(),
    // Add other sortable fields...
  }).optional(),
  // Define which fields to return (optional, defaults to a basic set)
  fields: z.array(z.string()).optional().default(["incident_id", "title", "date", "description"]),
  format: z.enum(["json", "csv"]).optional().default("json")
};

// Create the Zod schema from the shape for type inference
const getIncidentsSchema = z.object(getIncidentsShape);

async function getIncidents(params: z.infer<typeof getIncidentsSchema>): McpToolResponse {
  const { format } = params;
  try {
    // Construct the GraphQL query string dynamically based on requested fields
    const fieldSelection = params.fields.join('\n          ');
    const query = `
      query GetIncidents($filter: IncidentFilterType, $pagination: PaginationType, $sort: IncidentSortType) {
        incidents(filter: $filter, pagination: $pagination, sort: $sort) {
          ${fieldSelection}
        }
      }
    `;

    const variables = {
      filter: params.filter,
      pagination: params.pagination,
      sort: params.sort,
    };
    Object.keys(variables).forEach(key => variables[key as keyof typeof variables] === undefined && delete variables[key as keyof typeof variables]);

    const result = await graphqlRequest<{ incidents: graphql.Incident[] }>({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.incidents;
      const csv = [
        headers.join(","),
        ...rows.map(item =>
          headers.map((h: string) => `"${String((item as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.incidents);
  } catch (err) {
    return createMcpErrorResponse("fetching incidents", err);
  }
}


const getReportsShape: ZodRawShape = {
  filter: z.object({
    report_number: z.object({ EQ: z.number().int() }).optional(),
    title: z.object({ EQ: z.string() }).optional(),
    url: z.object({ EQ: z.string() }).optional(),
    source_domain: z.object({ EQ: z.string() }).optional(),
    authors: z.object({ EQ: z.string() }).optional(),
    date_published: z.object({ EQ: z.string() }).optional(),
    date_downloaded: z.object({ EQ: z.string() }).optional(),
    date_modified: z.object({ EQ: z.string() }).optional(),
    date_submitted: z.object({ EQ: z.string() }).optional(),
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: z.object({
    report_number: z.enum(["ASC", "DESC"]).optional(),
    title: z.enum(["ASC", "DESC"]).optional(),
    url: z.enum(["ASC", "DESC"]).optional(),
    source_domain: z.enum(["ASC", "DESC"]).optional(),
    date_published: z.enum(["ASC", "DESC"]).optional(),
    date_downloaded: z.enum(["ASC", "DESC"]).optional(),
    date_modified: z.enum(["ASC", "DESC"]).optional(),
    date_submitted: z.enum(["ASC", "DESC"]).optional(),
    // Add other sortable fields here...
  }).optional(),
  fields: z.array(z.string()).optional().default(["report_number", "title", "url", "source_domain", "date_published"]),
  format: z.enum(["json", "csv"]).optional().default("json")
};
const getReportsSchema = z.object(getReportsShape);


async function getReports(params: z.infer<typeof getReportsSchema>): McpToolResponse {
  const { format } = params;
  try {
    const fieldSelection = params.fields.join('\n          ');
    const query = `
            query GetReports($filter: ReportFilterType, $pagination: PaginationType, $sort: ReportSortType) {
                reports(filter: $filter, pagination: $pagination, sort: $sort) {
                    ${fieldSelection}
                }
            }
        `;

    const variables = {
      filter: params.filter,
      pagination: params.pagination,
      sort: params.sort,
    };
    Object.keys(variables).forEach(key => variables[key as keyof typeof variables] === undefined && delete variables[key as keyof typeof variables]);

    const result = await graphqlRequest<{ reports: graphql.Report[] }>({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.reports;
      const csv = [
        headers.join(","),
        ...rows.map(item =>
          headers.map((h: string) => `"${String((item as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.reports);
  } catch (err) {
    return createMcpErrorResponse("fetching reports", err);
  }
}

const getSchemaShape: ZodRawShape = {};

async function getSchema(): McpToolResponse {
  try {
    const query = `
      {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            kind
            name
            description
            fields {
              name
              description
              args {
                name
                description
                type { kind name }
                defaultValue
              }
              type { kind name }
            }
            inputFields { name description type { kind name } defaultValue }
            interfaces { name }
            enumValues { name description }
            possibleTypes { name }
          }
          directives {
            name
            description
            locations
            args { name description type { kind name } defaultValue }
          }
        }
      }
    `;
    
    const result = await graphqlRequest<{ __schema: any }>({ query });
    return createMcpSuccessResponse(result);
  } catch (err) {
    return createMcpErrorResponse("fetching schema", err);
  }
}

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