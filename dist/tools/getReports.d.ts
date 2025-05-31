import { z, ZodRawShape } from "zod";
import { McpToolResponse } from "./utils";
export declare const getReportsShape: ZodRawShape;
export declare const getReportsSchema: z.ZodObject<z.ZodRawShape, "strip", z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}>;
export declare function getReports(params: z.infer<typeof getReportsSchema>): McpToolResponse;
