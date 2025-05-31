import { z } from "zod";
import Debug from "debug";
export declare const debug: Debug.Debugger;
export interface GraphQLRequestOptions {
    query: string;
    variables?: Record<string, unknown>;
}
export declare function graphqlRequest<T>({ query, variables }: GraphQLRequestOptions): Promise<T>;
export type McpToolResponse = Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: boolean;
}>;
export declare function createMcpSuccessResponse(data: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function createMcpErrorResponse(message: string, err?: any): {
    content: {
        type: "text";
        text: string;
    }[];
    isError: true;
};
export declare const paginationSchema: z.ZodOptional<z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    skip?: number | undefined;
}, {
    limit?: number | undefined;
    skip?: number | undefined;
}>>;
