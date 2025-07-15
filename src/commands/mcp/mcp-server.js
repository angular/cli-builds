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
const zod_1 = require("zod");
const version_1 = require("../../utilities/version");
const doc_search_1 = require("./tools/doc-search");
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
    server.registerTool('list_projects', {
        title: 'List Angular Projects',
        description: 'Lists the names of all applications and libraries defined within an Angular workspace. ' +
            'It reads the `angular.json` configuration file to identify the projects. ',
        annotations: {
            readOnlyHint: true,
        },
        outputSchema: {
            projects: zod_1.z.array(zod_1.z.object({
                name: zod_1.z
                    .string()
                    .describe('The name of the project, as defined in the `angular.json` file.'),
                type: zod_1.z
                    .enum(['application', 'library'])
                    .optional()
                    .describe(`The type of the project, either 'application' or 'library'.`),
                root: zod_1.z
                    .string()
                    .describe('The root directory of the project, relative to the workspace root.'),
                sourceRoot: zod_1.z
                    .string()
                    .describe(`The root directory of the project's source files, relative to the workspace root.`),
                selectorPrefix: zod_1.z
                    .string()
                    .optional()
                    .describe('The prefix to use for component selectors.' +
                    ` For example, a prefix of 'app' would result in selectors like '<app-my-component>'.`),
            })),
        },
    }, async () => {
        const { workspace } = context;
        if (!workspace) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No Angular workspace found.' +
                            ' An `angular.json` file, which marks the root of a workspace,' +
                            ' could not be located in the current directory or any of its parent directories.',
                    },
                ],
            };
        }
        const projects = [];
        // Convert to output format
        for (const [name, project] of workspace.projects.entries()) {
            projects.push({
                name,
                type: project.extensions['projectType'],
                root: project.root,
                sourceRoot: project.sourceRoot ?? node_path_1.default.posix.join(project.root, 'src'),
                selectorPrefix: project.extensions['prefix'],
            });
        }
        // The structuredContent field is newer and may not be supported by all hosts.
        // A text representation of the content is also provided for compatibility.
        return {
            content: [
                {
                    type: 'text',
                    text: `Projects in the Angular workspace:\n${JSON.stringify(projects)}`,
                },
            ],
            structuredContent: { projects },
        };
    });
    await (0, doc_search_1.registerDocSearchTool)(server);
    return server;
}
