#!/usr/bin/env node

// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv2 from "dotenv";

// tools/utils.ts
import dotenv from "dotenv";
import { z } from "zod";
import fetch from "node-fetch";
import Debug from "debug";
dotenv.config();
var debug = Debug("aiid-mcp");
async function graphqlRequest({ query, variables = {} }) {
  const endpoint = process.env.AIID_GRAPHQL_ENDPOINT || "https://incidentdatabase.ai/api/graphql";
  const headers = {
    "Content-Type": "application/json"
  };
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables })
    });
  } catch (error) {
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
  const result = await response.json();
  if (result.errors) {
    debug("GraphQL query errors: %O", result.errors);
    throw new Error(`GraphQL errors returned from AIID API: ${JSON.stringify(result.errors)}`);
  }
  if (result.data === void 0) {
    debug("GraphQL response missing data field");
    throw new Error("Malformed response from AIID GraphQL API: missing 'data' field.");
  }
  return result.data;
}
function createMcpSuccessResponse(data) {
  try {
    const text = JSON.stringify(data, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    debug("Error stringifying response data: %o", err);
    throw new Error(`Failed to serialize response data: ${err.message}`);
  }
}
function createMcpErrorResponse(message, err) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  debug("%s error: %s", message, errorMessage);
  return {
    content: [{ type: "text", text: `Error ${message}: ${errorMessage}` }],
    isError: true
  };
}
var paginationSchema = z.object({
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional()
}).optional();

// tools/getIncidents.ts
import { z as z2 } from "zod";
var getIncidentsShape = {
  filter: z2.object({
    incident_id: z2.object({ EQ: z2.number().int() }).optional()
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: z2.object({
    incident_id: z2.enum(["ASC", "DESC"]).optional(),
    date: z2.enum(["ASC", "DESC"]).optional()
    // Add other sortable fields...
  }).optional(),
  fields: z2.array(z2.string()).optional().default(["incident_id", "title", "date", "description"]),
  format: z2.enum(["json", "csv"]).optional().default("json")
};
var getIncidentsSchema = z2.object(getIncidentsShape);
async function getIncidents(params) {
  const { format } = params;
  try {
    const fieldSelection = params.fields.join("\n          ");
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
      sort: params.sort
    };
    Object.keys(variables).forEach((key) => variables[key] === void 0 && delete variables[key]);
    const result = await graphqlRequest({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.incidents;
      const csv = [
        headers.join(","),
        ...rows.map(
          (item) => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.incidents);
  } catch (err) {
    return createMcpErrorResponse("fetching incidents", err);
  }
}

// tools/getReports.ts
import { z as z3 } from "zod";
var getReportsShape = {
  filter: z3.object({
    report_number: z3.object({ EQ: z3.number().int() }).optional(),
    title: z3.object({ EQ: z3.string() }).optional(),
    url: z3.object({ EQ: z3.string() }).optional(),
    source_domain: z3.object({ EQ: z3.string() }).optional(),
    authors: z3.object({ EQ: z3.string() }).optional(),
    date_published: z3.object({ EQ: z3.string() }).optional(),
    date_downloaded: z3.object({ EQ: z3.string() }).optional(),
    date_modified: z3.object({ EQ: z3.string() }).optional(),
    date_submitted: z3.object({ EQ: z3.string() }).optional()
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: z3.object({
    report_number: z3.enum(["ASC", "DESC"]).optional(),
    title: z3.enum(["ASC", "DESC"]).optional(),
    url: z3.enum(["ASC", "DESC"]).optional(),
    source_domain: z3.enum(["ASC", "DESC"]).optional(),
    date_published: z3.enum(["ASC", "DESC"]).optional(),
    date_downloaded: z3.enum(["ASC", "DESC"]).optional(),
    date_modified: z3.enum(["ASC", "DESC"]).optional(),
    date_submitted: z3.enum(["ASC", "DESC"]).optional()
    // Add other sortable fields here...
  }).optional(),
  fields: z3.array(z3.string()).optional().default(["report_number", "title", "url", "source_domain", "date_published"]),
  format: z3.enum(["json", "csv"]).optional().default("json")
};
var getReportsSchema = z3.object(getReportsShape);
async function getReports(params) {
  const { format } = params;
  try {
    const fieldSelection = params.fields.join("\n          ");
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
      sort: params.sort
    };
    Object.keys(variables).forEach((key) => variables[key] === void 0 && delete variables[key]);
    const result = await graphqlRequest({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.reports;
      const csv = [
        headers.join(","),
        ...rows.map(
          (item) => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.reports);
  } catch (err) {
    return createMcpErrorResponse("fetching reports", err);
  }
}

// tools/getClassifications.ts
import { z as z4 } from "zod";
var getClassificationsShape = {
  filter: z4.object({
    _id: z4.object({ EQ: z4.string() }).optional(),
    // Changed from id, assuming ObjectId is treated as string for EQ filter
    namespace: z4.object({ EQ: z4.string() }).optional(),
    // Changed from name
    notes: z4.object({ EQ: z4.string() }).optional(),
    publish: z4.object({ EQ: z4.boolean() }).optional()
    // incidents and reports are likely relational and might not be directly filterable with simple EQ.
    // attributes is an array of objects, filtering might be complex and require specific handling if needed.
  }).optional(),
  pagination: paginationSchema,
  sort: z4.object({
    _id: z4.enum(["ASC", "DESC"]).optional(),
    // Changed from id
    namespace: z4.enum(["ASC", "DESC"]).optional(),
    // Changed from name
    notes: z4.enum(["ASC", "DESC"]).optional(),
    publish: z4.enum(["ASC", "DESC"]).optional()
  }).optional(),
  fields: z4.array(z4.string()).optional().default(["_id", "namespace", "notes", "publish"]),
  // Updated default fields
  format: z4.enum(["json", "csv"]).optional().default("json")
};
var getClassificationsSchema = z4.object(getClassificationsShape);
async function getClassifications(params) {
  const { format } = params;
  try {
    const fieldSelection = params.fields.join("\n          ");
    const query = `
      query GetClassifications($filter: ClassificationFilterType, $pagination: PaginationType, $sort: ClassificationSortType) {
        classifications(filter: $filter, pagination: $pagination, sort: $sort) {
          ${fieldSelection}
        }
      }
    `;
    const variables = {
      filter: params.filter,
      pagination: params.pagination,
      sort: params.sort
    };
    Object.keys(variables).forEach((key) => variables[key] === void 0 && delete variables[key]);
    const result = await graphqlRequest({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.classifications;
      const csv = [
        headers.join(","),
        ...rows.map(
          (item) => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.classifications);
  } catch (err) {
    return createMcpErrorResponse("fetching classifications", err);
  }
}

// tools/getTaxonomies.ts
import { z as z5 } from "zod";
var getTaxonomiesShape = {
  filter: z5.object({
    _id: z5.object({ EQ: z5.string() }).optional(),
    // ObjectId is often string in filters
    namespace: z5.object({ EQ: z5.string() }).optional(),
    description: z5.object({ EQ: z5.string() }).optional(),
    automatedClassifications: z5.object({ EQ: z5.boolean() }).optional(),
    complete_entities: z5.object({ EQ: z5.boolean() }).optional(),
    weight: z5.object({ EQ: z5.number().int() }).optional()
    // dummy_fields and field_list are complex types; filtering might need specific input objects
    // For now, keeping it simple. Add more complex filter options if needed.
  }).optional(),
  pagination: paginationSchema,
  sort: z5.object({
    _id: z5.enum(["ASC", "DESC"]).optional(),
    namespace: z5.enum(["ASC", "DESC"]).optional(),
    description: z5.enum(["ASC", "DESC"]).optional(),
    automatedClassifications: z5.enum(["ASC", "DESC"]).optional(),
    complete_entities: z5.enum(["ASC", "DESC"]).optional(),
    weight: z5.enum(["ASC", "DESC"]).optional()
  }).optional(),
  fields: z5.array(z5.string()).optional().default(["_id", "namespace", "description", "automatedClassifications", "complete_entities", "weight"]),
  format: z5.enum(["json", "csv"]).optional().default("json")
};
var getTaxonomiesSchema = z5.object(getTaxonomiesShape);
async function getTaxonomies(params) {
  const { format } = params;
  try {
    const fieldSelection = params.fields.join("\n          ");
    const query = `
      query GetTaxonomies($filter: TaxaFilterType, $pagination: PaginationType, $sort: TaxaSortType) {
        taxa(filter: $filter, pagination: $pagination, sort: $sort) {
          ${fieldSelection}
        }
      }
    `;
    const variables = {
      filter: params.filter,
      pagination: params.pagination,
      sort: params.sort
    };
    Object.keys(variables).forEach((key) => variables[key] === void 0 && delete variables[key]);
    const result = await graphqlRequest({ query, variables });
    if (format === "csv") {
      const headers = params.fields;
      const rows = result.taxa;
      const csv = [
        headers.join(","),
        ...rows.map(
          (item) => headers.map((h) => {
            const value = item[h];
            if (Array.isArray(value) || typeof value === "object" && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          }).join(",")
        )
      ].join("\n");
      return { content: [{ type: "text", text: csv }] };
    }
    return createMcpSuccessResponse(result.taxa);
  } catch (err) {
    return createMcpErrorResponse("fetching taxonomies", err);
  }
}

// tools/getSchema.ts
var getSchemaShape = {};
async function getSchema() {
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
    const result = await graphqlRequest({ query });
    return createMcpSuccessResponse(result);
  } catch (err) {
    return createMcpErrorResponse("fetching schema", err);
  }
}

// index.ts
dotenv2.config();
var server = new McpServer({
  name: "AIID GraphQL MCP Server",
  version: "1.0.0",
  description: "Expose AI Incident Database GraphQL API via MCP",
  debug: true
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
  getClassificationsShape,
  getClassifications
);
server.tool(
  "get-taxonomies",
  "Fetch taxonomies from the AIID GraphQL API. Supports filtering, pagination, sorting, and selecting specific taxonomy fields.",
  getTaxonomiesShape,
  // Corrected: Use the shape directly
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
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  debug("Unhandled Rejection: %o", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  debug("Uncaught Exception: %o", error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map