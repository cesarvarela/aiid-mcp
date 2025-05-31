import { z, ZodRawShape } from "zod";
import { McpToolResponse } from "./utils.js";
export declare const getClassificationsShape: ZodRawShape;
export declare const getClassificationsSchema: z.ZodObject<z.ZodRawShape, "strip", z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}>;
export declare function getClassifications(params: z.infer<typeof getClassificationsSchema>): McpToolResponse;
