#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { z } from "zod";
import fetch from "node-fetch"; // Use node-fetch v2 for CommonJS compatibility if needed, else v3+ for ESM
import Debug from "debug";
dotenv.config();
const debug = Debug("aiid-mcp");
async function graphqlRequest({ query, variables = {} }) {
    const endpoint = process.env.AIID_GRAPHQL_ENDPOINT || 'https://incidentdatabase.ai/api/graphql';
    const headers = {
        "Content-Type": "application/json",
    };
    let response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ query, variables }),
        });
    }
    catch (error) {
        debug("GraphQL request network error: %o", error);
        throw new Error(`Network error calling AIID GraphQL API: ${error.message}`);
    }
    if (!response.ok) {
        let errorBody = await response.text();
        try {
            errorBody = JSON.stringify(JSON.parse(errorBody));
        }
        catch (e) {
        }
        debug("GraphQL request failed: %s %s - %s", response.status, response.statusText, errorBody);
        throw new Error(`${response.status} ${response.statusText} calling AIID GraphQL API: ${errorBody}`);
    }
    const result = await response.json();
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
// Helper function to create McpResponse object
function createMcpSuccessResponse(data) {
    try {
        const text = JSON.stringify(data, null, 2); // Pretty print JSON
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        debug("Error stringifying response data: %o", err);
        // Re-throw as a standard error for the server to catch
        throw new Error(`Failed to serialize response data: ${err.message}`);
    }
}
// Helper function to create McpResponse object for errors
function createMcpErrorResponse(message, err) {
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
/**
 * Shape schema for the 'get-incidents' tool.
 * Defines the allowed input parameters for fetching incidents:
 *   - filter?: Filter conditions based on incident fields (e.g., incident_id EQ).
 *   - pagination?: Controls result limit and offset.
 *   - sort?: Ordering of results by specified fields.
 *   - fields?: List of incident fields to include in the response.
 */
const getIncidentsShape = {
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
/**
 * Executes the 'get-incidents' tool.
 * Sends a GraphQL query to the AI Incident Database to retrieve incidents based on parameters.
 * Returns an MCP response containing the list of incidents or an error response.
 */
async function getIncidents(params) {
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
        Object.keys(variables).forEach(key => variables[key] === undefined && delete variables[key]);
        const result = await graphqlRequest({ query, variables });
        if (format === "csv") {
            const headers = params.fields;
            const rows = result.incidents;
            const csv = [
                headers.join(","),
                ...rows.map(item => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(","))
            ].join("\n");
            return { content: [{ type: "text", text: csv }] };
        }
        return createMcpSuccessResponse(result.incidents);
    }
    catch (err) {
        return createMcpErrorResponse("fetching incidents", err);
    }
}
/**
 * Shape schema for the 'get-reports' tool.
 * Defines the allowed input parameters for fetching reports:
 *   - filter?: Filter conditions based on report fields (e.g., report_number EQ).
 *   - pagination?: Controls result limit and offset.
 *   - sort?: Ordering of results by specified fields.
 *   - fields?: List of report fields to include in the response.
 */
const getReportsShape = {
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
/**
 * Executes the 'get-reports' tool.
 * Sends a GraphQL query to the AI Incident Database to retrieve reports based on parameters.
 * Returns an MCP response containing the list of reports or an error response.
 */
async function getReports(params) {
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
        Object.keys(variables).forEach(key => variables[key] === undefined && delete variables[key]);
        const result = await graphqlRequest({ query, variables });
        if (format === "csv") {
            const headers = params.fields;
            const rows = result.reports;
            const csv = [
                headers.join(","),
                ...rows.map(item => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(","))
            ].join("\n");
            return { content: [{ type: "text", text: csv }] };
        }
        return createMcpSuccessResponse(result.reports);
    }
    catch (err) {
        return createMcpErrorResponse("fetching reports", err);
    }
}
const server = new McpServer({
    name: "AIID GraphQL MCP Server",
    version: "1.0.0",
    description: "Expose AI Incident Database GraphQL API via MCP",
    debug: true, // Enable debug logging within the MCP server itself
});
server.tool("get-incidents", "Fetch incidents from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific incident fields.", getIncidentsShape, getIncidents);
server.tool("get-reports", "Fetch reports from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific report fields.", getReportsShape, getReports);
async function main() {
    const transport = new StdioServerTransport();
    try {
        await server.connect(transport);
        debug("AIID MCP Server connected via stdio");
    }
    catch (error) {
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
