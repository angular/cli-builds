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
async function createMcpServer(context) {
    const server = new mcp_js_1.McpServer({
        name: 'angular-cli-server',
        version: version_1.VERSION.full,
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    server.registerResource('instructions', 'instructions://best-practices', {
        title: 'Angular System Instructions',
        description: 'A set of instructions to help LLMs generate correct code that follows Angular best practices.',
        mimeType: 'text/markdown',
    }, async () => {
        const text = await (0, promises_1.readFile)(node_path_1.default.join(__dirname, 'instructions', 'best-practices.md'), 'utf-8');
        return { contents: [{ uri: 'instructions://best-practices', text }] };
    });
    server.registerTool('list_projects', {
        title: 'List projects',
        description: 'List projects within an Angular workspace.' +
            ' This information is read from the `angular.json` file at the root path of the Angular workspace',
    }, () => {
        if (!context.workspace) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Not within an Angular project.',
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: 'Projects in the Angular workspace: ' +
                        [...context.workspace.projects.keys()].join(','),
                },
            ],
        };
    });
    return server;
}
