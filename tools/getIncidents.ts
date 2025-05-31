import { z, ZodRawShape } from "zod";
import * as graphql from "../graphql/generated/graphql";
import {
  McpToolResponse,
  createMcpSuccessResponse,
  createMcpErrorResponse,
  paginationSchema,
  graphqlRequest,
  debug 
} from "./utils";

export const getIncidentsShape: ZodRawShape = {
  filter: z.object({
    incident_id: z.object({ EQ: z.number().int() }).optional(),
    // Add other filterable fields here...
  }).optional(),
  pagination: paginationSchema,
  sort: z.object({
    incident_id: z.enum(["ASC", "DESC"]).optional(),
    date: z.enum(["ASC", "DESC"]).optional(),
    // Add other sortable fields...
  }).optional(),
  fields: z.array(z.string()).optional().default(["incident_id", "title", "date", "description"]),
  format: z.enum(["json", "csv"]).optional().default("json")
};

export const getIncidentsSchema = z.object(getIncidentsShape);

export async function getIncidents(params: z.infer<typeof getIncidentsSchema>): McpToolResponse {
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
        ...rows.map((item: graphql.Incident) =>
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
