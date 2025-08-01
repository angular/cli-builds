"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const version_1 = require("../../utilities/version");
const best_practices_1 = require("./tools/best-practices");
const doc_search_1 = require("./tools/doc-search");
const projects_1 = require("./tools/projects");
async function createMcpServer(context) {
    const server = new mcp_js_1.McpServer({
        name: 'angular-cli-server',
        version: version_1.VERSION.full,
        capabilities: {
            resources: {},
            tools: {},
        },
        instructions: 'For Angular development, this server provides tools to adhere to best practices, search documentation, and find code examples. ' +
            'When writing or modifying Angular code, use the MCP server and its tools instead of direct shell commands where possible.',
    });
    server.registerResource('instructions', 'instructions://best-practices', {
        title: 'Angular Best Practices and Code Generation Guide',
        description: "A comprehensive guide detailing Angular's best practices for code generation and development." +
            ' This guide should be used as a reference by an LLM to ensure any generated code' +
            ' adheres to modern Angular standards, including the use of standalone components,' +
            ' typed forms, modern control flow syntax, and other current conventions.',
        mimeType: 'text/markdown',
    }, async () => {
        const text = await (0, promises_1.readFile)(node_path_1.default.join(__dirname, 'instructions', 'best-practices.md'), 'utf-8');
        return { contents: [{ uri: 'instructions://best-practices', text }] };
    });
    (0, best_practices_1.registerBestPracticesTool)(server);
    // If run outside an Angular workspace (e.g., globally) skip the workspace specific tools.
    if (context.workspace) {
        (0, projects_1.registerListProjectsTool)(server, context);
    }
    await (0, doc_search_1.registerDocSearchTool)(server);
    return server;
}
