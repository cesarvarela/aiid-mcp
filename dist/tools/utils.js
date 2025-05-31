import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";
import fetch from "node-fetch";
import Debug from "debug";
export const debug = Debug("aiid-mcp");
export async function graphqlRequest({ query, variables = {} }) {
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
            // ignore parsing error if not JSON
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
export function createMcpSuccessResponse(data) {
    try {
        const text = JSON.stringify(data, null, 2); // Pretty print JSON
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        debug("Error stringifying response data: %o", err);
        throw new Error(`Failed to serialize response data: ${err.message}`);
    }
}
export function createMcpErrorResponse(message, err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    debug("%s error: %s", message, errorMessage);
    return {
        content: [{ type: "text", text: `Error ${message}: ${errorMessage}` }],
        isError: true
    };
}
export const paginationSchema = z.object({
    limit: z.number().int().positive().optional(),
    skip: z.number().int().nonnegative().optional(),
}).optional();
