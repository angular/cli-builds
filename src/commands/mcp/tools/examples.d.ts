/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Registers the `find_examples` tool with the MCP server.
 *
 * This tool allows users to search for best-practice Angular code examples
 * from a local SQLite database.
 *
 * @param server The MCP server instance.
 * @param exampleDatabasePath The path to the SQLite database file containing the examples.
 */
export declare function registerFindExampleTool(server: McpServer, exampleDatabasePath: string): void;
/**
 * Escapes a search query for FTS5 by tokenizing and quoting terms.
 *
 * This function processes a raw search string and prepares it for an FTS5 full-text search.
 * It correctly handles quoted phrases, logical operators (AND, OR, NOT), parentheses,
 * and prefix searches (ending with an asterisk), ensuring that individual search
 * terms are properly quoted to be treated as literals by the search engine.
 * This is primarily intended to avoid unintentional usage of FTS5 query syntax by consumers.
 *
 * @param query The raw search query string.
 * @returns A sanitized query string suitable for FTS5.
 */
export declare function escapeSearchQuery(query: string): string;
