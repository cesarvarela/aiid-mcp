import { z, ZodRawShape } from "zod";
import { McpToolResponse } from "./utils";
export declare const getIncidentsShape: ZodRawShape;
export declare const getIncidentsSchema: z.ZodObject<z.ZodRawShape, "strip", z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}>;
export declare function getIncidents(params: z.infer<typeof getIncidentsSchema>): McpToolResponse;
