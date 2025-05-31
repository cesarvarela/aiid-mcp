import { ZodRawShape } from "zod";
import {
  graphqlRequest,
  McpToolResponse,
  createMcpSuccessResponse,
  createMcpErrorResponse
} from "./utils";

export const getSchemaShape: ZodRawShape = {};

export async function getSchema(): McpToolResponse {
  try {
    const query = `
      {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            kind
            name
            description
            fields {
              name
              description
              args {
                name
                description
                type { kind name }
                defaultValue
              }
              type { kind name }
            }
            inputFields { name description type { kind name } defaultValue }
            interfaces { name }
            enumValues { name description }
            possibleTypes { name }
          }
          directives {
            name
            description
            locations
            args { name description type { kind name } defaultValue }
          }
        }
      }
    `;
    
    const result = await graphqlRequest<{ __schema: any }>({ query });
    return createMcpSuccessResponse(result);
  } catch (err) {
    return createMcpErrorResponse("fetching schema", err);
  }
}
