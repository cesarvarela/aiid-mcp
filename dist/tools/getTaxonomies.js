import { z } from "zod";
import { graphqlRequest, createMcpSuccessResponse, createMcpErrorResponse, paginationSchema } from "./utils.js";
export const getTaxonomiesShape = {
    filter: z.object({
        _id: z.object({ EQ: z.string() }).optional(), // ObjectId is often string in filters
        namespace: z.object({ EQ: z.string() }).optional(),
        description: z.object({ EQ: z.string() }).optional(),
        automatedClassifications: z.object({ EQ: z.boolean() }).optional(),
        complete_entities: z.object({ EQ: z.boolean() }).optional(),
        weight: z.object({ EQ: z.number().int() }).optional(),
        // dummy_fields and field_list are complex types; filtering might need specific input objects
        // For now, keeping it simple. Add more complex filter options if needed.
    }).optional(),
    pagination: paginationSchema,
    sort: z.object({
        _id: z.enum(["ASC", "DESC"]).optional(),
        namespace: z.enum(["ASC", "DESC"]).optional(),
        description: z.enum(["ASC", "DESC"]).optional(),
        automatedClassifications: z.enum(["ASC", "DESC"]).optional(),
        complete_entities: z.enum(["ASC", "DESC"]).optional(),
        weight: z.enum(["ASC", "DESC"]).optional(),
    }).optional(),
    fields: z.array(z.string()).optional().default(["_id", "namespace", "description", "automatedClassifications", "complete_entities", "weight"]),
    format: z.enum(["json", "csv"]).optional().default("json")
};
export const getTaxonomiesSchema = z.object(getTaxonomiesShape);
export async function getTaxonomies(params) {
    const { format } = params;
    try {
        const fieldSelection = params.fields.join('\n          ');
        // Corrected query to use 'taxa', 'TaxaFilterType', and 'TaxaSortType'
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
            sort: params.sort,
        };
        Object.keys(variables).forEach(key => variables[key] === undefined && delete variables[key]);
        // Corrected result type to graphql.Taxa[]
        const result = await graphqlRequest({ query, variables });
        if (format === "csv") {
            const headers = params.fields;
            const rows = result.taxa; // Use result.taxa
            const csv = [
                headers.join(","),
                ...rows.map((item) => headers.map((h) => {
                    const value = item[h];
                    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    }
                    return `"${String(value ?? "").replace(/"/g, '""')}"`;
                }).join(","))
            ].join("\n");
            return { content: [{ type: "text", text: csv }] };
        }
        return createMcpSuccessResponse(result.taxa); // Uses createMcpSuccessResponse from utils
    }
    catch (err) {
        return createMcpErrorResponse("fetching taxonomies", err); // Uses createMcpErrorResponse from utils
    }
}
