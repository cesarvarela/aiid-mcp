import { z } from "zod";
import { graphqlRequest, createMcpSuccessResponse, createMcpErrorResponse, paginationSchema } from "./utils.js";
export const getClassificationsShape = {
    filter: z.object({
        _id: z.object({ EQ: z.string() }).optional(), // Changed from id, assuming ObjectId is treated as string for EQ filter
        namespace: z.object({ EQ: z.string() }).optional(), // Changed from name
        notes: z.object({ EQ: z.string() }).optional(),
        publish: z.object({ EQ: z.boolean() }).optional(),
        // incidents and reports are likely relational and might not be directly filterable with simple EQ.
        // attributes is an array of objects, filtering might be complex and require specific handling if needed.
    }).optional(),
    pagination: paginationSchema,
    sort: z.object({
        _id: z.enum(["ASC", "DESC"]).optional(), // Changed from id
        namespace: z.enum(["ASC", "DESC"]).optional(), // Changed from name
        notes: z.enum(["ASC", "DESC"]).optional(),
        publish: z.enum(["ASC", "DESC"]).optional(),
    }).optional(),
    fields: z.array(z.string()).optional().default(["_id", "namespace", "notes", "publish"]), // Updated default fields
    format: z.enum(["json", "csv"]).optional().default("json")
};
export const getClassificationsSchema = z.object(getClassificationsShape);
export async function getClassifications(params) {
    const { format } = params;
    try {
        const fieldSelection = params.fields.join('\n          ');
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
            sort: params.sort,
        };
        Object.keys(variables).forEach(key => variables[key] === undefined && delete variables[key]);
        const result = await graphqlRequest({ query, variables });
        if (format === "csv") {
            const headers = params.fields;
            const rows = result.classifications;
            const csv = [
                headers.join(","),
                ...rows.map((item) => headers.map((h) => `"${String(item[h] ?? "").replace(/"/g, '""')}"`).join(","))
            ].join("\n");
            return { content: [{ type: "text", text: csv }] };
        }
        return createMcpSuccessResponse(result.classifications);
    }
    catch (err) {
        return createMcpErrorResponse("fetching classifications", err);
    }
}
