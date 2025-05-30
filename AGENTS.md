# AIID MCP Development Guide for LLMs

This guide is designed to help AI assistants like GitHub Copilot understand how to effectively work with and test the AIID MCP (Model Context Protocol) server in Visual Studio Code environments.

## What is MCP?

The Model Context Protocol (MCP) is a framework that allows AI models to interact with external tools and services. In our case, the AIID MCP server provides access to the AI Incident Database GraphQL API.

## Development and Testing Workflow

When making changes to the MCP server code, follow this workflow to ensure the changes are properly applied and tested:

### 1. Understand the Code Structure

The main components of this project are:

- **index.ts**: Main server implementation with tool definitions
- **GraphQL Integration**: API client that fetches data from the AI Incident Database
- **Zod Schemas**: Define input validation for tools
- **Tool Implementation Functions**: Functions like `getIncidents` and `getReports`

### 2. Making Changes

When modifying features (like adding a CSV output format):

1. Update the Zod schema to include new parameters (e.g., `format: z.enum(["json", "csv"])`)
2. Implement the functionality in the tool functions
3. Build the TypeScript code to generate JavaScript files in the dist folder

### 3. Building the Code

After making changes, always build the code with:

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist` directory.

### 4. Restarting the MCP Server in VS Code

VS Code doesn't automatically detect changes to the MCP server code. After building, you must ask the user to reload the VS Code window:

1. **Ask the user to reload**: Request that the user reload their VS Code window
   - They can do this by pressing `Cmd+Shift+P` (macOS) and selecting "Developer: Reload Window"
   - Or by closing and reopening VS Code

### 5. Testing the Changes

Test the functionality after restarting:

1. Use the appropriate tool function (e.g., `get-incidents` or `get-reports`)
2. Include the new parameters in your test (e.g., `format: "csv"`)
3. Verify the output matches the expected format

Example test for CSV functionality:

```
get-incidents with parameters:
{
  "fields": ["incident_id", "title", "date", "description"],
  "format": "csv",
  "pagination": {"limit": 5}
}
```

Expected output should be properly formatted CSV data with headers and quoted text fields.

## Understanding VS Code MCP Configuration

The MCP server configuration lives in the user's VS Code settings.json:

```json
"mcp": {
    "servers": {
        "aiid-mcp": {
            "type": "stdio",
            "command": "node",
            "args": [
                "/path/to/aiid-mcp/dist/index.js"
            ]
        }
    }
}
```

This configuration tells VS Code:
- How to start the MCP server (using Node.js)
- Where to find the compiled JavaScript code (`dist/index.js`)
- That it communicates via standard input/output (`stdio`)

## Common Pitfalls

1. **Forgetting to build**: Always run `npm run build` after making changes
2. **Not asking the user to reload VS Code**: Changes aren't picked up until VS Code is reloaded
3. **Testing old code**: Ensure the user has reloaded VS Code and you're testing the latest build
4. **Mismatched schema and implementation**: Ensure the Zod schema matches your implementation

## Feature Development Example: CSV Output

Adding CSV output format involved:

1. Adding `format: z.enum(["json", "csv"]).optional().default("json")` to the schema
2. Implementing CSV generation in the tool functions:
   ```typescript
   if (format === "csv") {
     const headers = params.fields;
     const rows = result.incidents;
     const csv = [
       headers.join(","),
       ...rows.map(item =>
         headers.map((h: string) => `"${String((item as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
       )
     ].join("\n");
     return { content: [{ type: "text", text: csv }] };
   }
   ```
3. Building the code and asking the user to reload VS Code
4. Testing with `get-incidents` or `get-reports` with `format: "csv"` after reload

By following this guide, AI assistants should be able to effectively help with development, testing, and troubleshooting of MCP tools in VS Code environments.
