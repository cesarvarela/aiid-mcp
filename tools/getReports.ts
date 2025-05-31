import { z, ZodRawShape } from "zod";
import * as graphql from "../graphql/generated/graphql";
import {
  graphqlRequest,
  McpToolResponse,
  createMcpSuccessResponse,
  createMcpErrorResponse,
  paginationSchema
} from "./utils";

export const getReportsShape: ZodRawShape = {
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
export const getReportsSchema = z.object(getReportsShape);

export async function getReports(params: z.infer<typeof getReportsSchema>): McpToolResponse {
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
      const rows: graphql.Report[] = result.reports;
      const csv = [
        headers.join(","),
        ...rows.map((item: graphql.Report) =>
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
