import { z, ZodRawShape } from "zod";
import { McpToolResponse } from "./utils.js";
export declare const getTaxonomiesShape: ZodRawShape;
export declare const getTaxonomiesSchema: z.ZodObject<z.ZodRawShape, "strip", z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}>;
export declare function getTaxonomies(params: z.infer<typeof getTaxonomiesSchema>): McpToolResponse;
