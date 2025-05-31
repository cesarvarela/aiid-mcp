#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_dotenv2 = __toESM(require("dotenv"), 1);

// tools/utils.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_zod = require("zod");
var import_node_fetch = __toESM(require("node-fetch"), 1);
var import_debug = __toESM(require("debug"), 1);
import_dotenv.default.config();
var debug = (0, import_debug.default)("aiid-mcp");
async function graphqlRequest({ query, variables = {} }) {
  const endpoint = process.env.AIID_GRAPHQL_ENDPOINT || "https://incidentdatabase.ai/api/graphql";
  const headers = {
    "Content-Type": "application/json"
  };
  let response;
  try {
    response = await (0, import_node_fetch.default)(endpoint, {
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
var paginationSchema = import_zod.z.object({
  limit: import_zod.z.number().int().positive().optional(),
  skip: import_zod.z.number().int().nonnegative().optional()
}).optional();

// tools/getIncidents.ts
var import_zod2 = require("zod");
var getIncidentsShape = {
  filter: import_zod2.z.object({
    incident_id: import_zod2.z.object({ EQ: import_zod2.z.number().int() }).optional()
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: import_zod2.z.object({
    incident_id: import_zod2.z.enum(["ASC", "DESC"]).optional(),
    date: import_zod2.z.enum(["ASC", "DESC"]).optional()
    // Add other sortable fields...
  }).optional(),
  fields: import_zod2.z.array(import_zod2.z.string()).optional().default(["incident_id", "title", "date", "description"]),
  format: import_zod2.z.enum(["json", "csv"]).optional().default("json")
};
var getIncidentsSchema = import_zod2.z.object(getIncidentsShape);
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
var import_zod3 = require("zod");
var getReportsShape = {
  filter: import_zod3.z.object({
    report_number: import_zod3.z.object({ EQ: import_zod3.z.number().int() }).optional(),
    title: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    url: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    source_domain: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    authors: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    date_published: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    date_downloaded: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    date_modified: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional(),
    date_submitted: import_zod3.z.object({ EQ: import_zod3.z.string() }).optional()
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: import_zod3.z.object({
    report_number: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    title: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    url: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    source_domain: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    date_published: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    date_downloaded: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    date_modified: import_zod3.z.enum(["ASC", "DESC"]).optional(),
    date_submitted: import_zod3.z.enum(["ASC", "DESC"]).optional()
    // Add other sortable fields here...
  }).optional(),
  fields: import_zod3.z.array(import_zod3.z.string()).optional().default(["report_number", "title", "url", "source_domain", "date_published"]),
  format: import_zod3.z.enum(["json", "csv"]).optional().default("json")
};
var getReportsSchema = import_zod3.z.object(getReportsShape);
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
var import_zod4 = require("zod");
var getClassificationsShape = {
  filter: import_zod4.z.object({
    _id: import_zod4.z.object({ EQ: import_zod4.z.string() }).optional(),
    // Changed from id, assuming ObjectId is treated as string for EQ filter
    namespace: import_zod4.z.object({ EQ: import_zod4.z.string() }).optional(),
    // Changed from name
    notes: import_zod4.z.object({ EQ: import_zod4.z.string() }).optional(),
    publish: import_zod4.z.object({ EQ: import_zod4.z.boolean() }).optional()
    // incidents and reports are likely relational and might not be directly filterable with simple EQ.
    // attributes is an array of objects, filtering might be complex and require specific handling if needed.
  }).optional(),
  pagination: paginationSchema,
  sort: import_zod4.z.object({
    _id: import_zod4.z.enum(["ASC", "DESC"]).optional(),
    // Changed from id
    namespace: import_zod4.z.enum(["ASC", "DESC"]).optional(),
    // Changed from name
    notes: import_zod4.z.enum(["ASC", "DESC"]).optional(),
    publish: import_zod4.z.enum(["ASC", "DESC"]).optional()
  }).optional(),
  fields: import_zod4.z.array(import_zod4.z.string()).optional().default(["_id", "namespace", "notes", "publish"]),
  // Updated default fields
  format: import_zod4.z.enum(["json", "csv"]).optional().default("json")
};
var getClassificationsSchema = import_zod4.z.object(getClassificationsShape);
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
var import_zod5 = require("zod");
var getTaxonomiesShape = {
  filter: import_zod5.z.object({
    _id: import_zod5.z.object({ EQ: import_zod5.z.string() }).optional(),
    // ObjectId is often string in filters
    namespace: import_zod5.z.object({ EQ: import_zod5.z.string() }).optional(),
    description: import_zod5.z.object({ EQ: import_zod5.z.string() }).optional(),
    automatedClassifications: import_zod5.z.object({ EQ: import_zod5.z.boolean() }).optional(),
    complete_entities: import_zod5.z.object({ EQ: import_zod5.z.boolean() }).optional(),
    weight: import_zod5.z.object({ EQ: import_zod5.z.number().int() }).optional()
    // dummy_fields and field_list are complex types; filtering might need specific input objects
    // For now, keeping it simple. Add more complex filter options if needed.
  }).optional(),
  pagination: paginationSchema,
  sort: import_zod5.z.object({
    _id: import_zod5.z.enum(["ASC", "DESC"]).optional(),
    namespace: import_zod5.z.enum(["ASC", "DESC"]).optional(),
    description: import_zod5.z.enum(["ASC", "DESC"]).optional(),
    automatedClassifications: import_zod5.z.enum(["ASC", "DESC"]).optional(),
    complete_entities: import_zod5.z.enum(["ASC", "DESC"]).optional(),
    weight: import_zod5.z.enum(["ASC", "DESC"]).optional()
  }).optional(),
  fields: import_zod5.z.array(import_zod5.z.string()).optional().default(["_id", "namespace", "description", "automatedClassifications", "complete_entities", "weight"]),
  format: import_zod5.z.enum(["json", "csv"]).optional().default("json")
};
var getTaxonomiesSchema = import_zod5.z.object(getTaxonomiesShape);
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
import_dotenv2.default.config();
var server = new import_mcp.McpServer({
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
  const transport = new import_stdio.StdioServerTransport();
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
//# sourceMappingURL=index.cjs.map