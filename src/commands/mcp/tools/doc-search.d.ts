/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Registers a tool with the MCP server to search the Angular documentation.
 *
 * This tool uses Algolia to search the official Angular documentation.
 *
 * @param server The MCP server instance with which to register the tool.
 */
export declare function registerDocSearchTool(server: McpServer): Promise<void>;
