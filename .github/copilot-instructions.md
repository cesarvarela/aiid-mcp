# GitHub Copilot Instructions

## Overview

This repository contains the AIID MCP (AI Incident Database Model Context Protocol) server implementation.

## Important Development Guidelines

When working with this codebase, please refer to the **[AGENTS.md](../AGENTS.md)** file at the root of the repository for detailed instructions on:

- Understanding the MCP architecture
- Making changes to MCP tool implementations
- Building the TypeScript code
- Instructing users to reload VS Code after changes
- Testing MCP functionality
- Common pitfalls to avoid

## Key Development Workflow Reminder

1. Make code changes
2. Run `npm run build` to compile TypeScript
3. Ask the user to reload the VS Code window
4. Test the functionality after reload

Always ensure you're working with the latest build by instructing users to reload VS Code after any changes to the MCP server code.

## CSV Format Example

The repository includes functionality to output data in both JSON and CSV formats. Refer to AGENTS.md for detailed implementation examples.

## Configuration

The MCP server configuration lives in the user's VS Code settings.json and requires a specific format. See AGENTS.md for configuration details.
