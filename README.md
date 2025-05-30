# AIID MCP Server

A Model Context Protocol (MCP) server that provides access to the AI Incident Database GraphQL API through VS Code.

## Overview

This server implements the Model Context Protocol to allow AI assistants like GitHub Copilot to interact with the AI Incident Database (AIID). It enables querying incidents and reports with support for filtering, pagination, sorting, and output format selection.

## Features

- **Incident Data Access**: Query AI incidents with filtering and sorting options
- **Report Data Access**: Access reports linked to incidents with customizable field selection
- **Multiple Output Formats**: Return data in JSON or CSV format
- **Pagination Support**: Control result size and offset for large datasets

## Installation

1. Install the package from npm:
   ```bash
   npm install -g aiid-mcp
   ```

4. Add the MCP server configuration to your VS Code settings.json:
   ```json
   "mcp": {
       "servers": {
           "aiid-mcp": {
               "type": "stdio",
               "command": "npx",
               "args": [
                   "aiid-mcp"
               ]
           }
       }
   }
   ```

5. Restart VS Code to activate the MCP server.

## Usage

Once configured, you can use the MCP tools from VS Code:

### Get Incidents

Query incidents from the AI Incident Database:

```javascript
// Example: Get incidents in CSV format
{
  "fields": ["incident_id", "title", "date", "description"],
  "format": "csv",
  "pagination": {"limit": 5}
}
```

### Get Reports

Query reports from the AI Incident Database:

```javascript
// Example: Get reports for a specific source domain
{
  "fields": ["report_number", "title", "source_domain", "date_published"],
  "filter": {
    "source_domain": {"EQ": "nytimes.com"}
  },
  "format": "json"
}
```

## Development

If you want to develop or modify this MCP server:

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/aiid-mcp.git
   cd aiid-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Configure VS Code to use your local development version:
   ```json
   "mcp": {
       "servers": {
           "aiid-mcp": {
               "type": "stdio",
               "command": "node",
               "args": [
                   "/absolute/path/to/aiid-mcp/dist/index.js"
               ]
           }
       }
   }
   ```
   Replace `/absolute/path/to/aiid-mcp` with the actual path to your project.

5. Reload VS Code to apply changes.

For development guidelines, refer to [AGENTS.md](AGENTS.md) for detailed instructions on:

- Understanding the MCP architecture
- Making changes to MCP tool implementations
- Building the TypeScript code
- Testing MCP functionality
- Common pitfalls to avoid

### Key Development Workflow

1. Make code changes
2. Build the TypeScript code: `npm run build`
3. Reload VS Code to apply changes
4. Test the functionality

## GraphQL Schema Generation

This project uses GraphQL Code Generator to create TypeScript types from the AIID GraphQL schema:

```bash
npm run codegen
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Resources

- [AI Incident Database](https://incidentdatabase.ai/)
- [Model Context Protocol Documentation](https://github.com/microsoft/modelcontextprotocol)
