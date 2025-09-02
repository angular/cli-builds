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
exports.LIST_PROJECTS_TOOL = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const zod_1 = __importDefault(require("zod"));
const config_1 = require("../../../utilities/config");
const error_1 = require("../../../utilities/error");
const tool_registry_1 = require("./tool-registry");
exports.LIST_PROJECTS_TOOL = (0, tool_registry_1.declareTool)({
    name: 'list_projects',
    title: 'List Angular Projects',
    description: `
<Purpose>
Provides a comprehensive overview of all Angular workspaces and projects within a monorepo.
It is essential to use this tool as a first step before performing any project-specific actions to understand the available projects,
their types, and their locations.
</Purpose>
<Use Cases>
* Finding the correct project name to use in other commands (e.g., \`ng generate component my-comp --project=my-app\`).
* Identifying the \`root\` and \`sourceRoot\` of a project to read, analyze, or modify its files.
* Determining if a project is an \`application\` or a \`library\`.
* Getting the \`selectorPrefix\` for a project before generating a new component to ensure it follows conventions.
</Use Cases>
<Operational Notes>
* **Working Directory:** Shell commands for a project (like \`ng generate\`) **MUST**
  be executed from the parent directory of the \`path\` field for the relevant workspace.
* **Disambiguation:** A monorepo may contain multiple workspaces (e.g., for different applications or even in output directories).
  Use the \`path\` of each workspace to understand its context and choose the correct project.
</Operational Notes>`,
    outputSchema: {
        workspaces: zod_1.default.array(zod_1.default.object({
            path: zod_1.default.string().describe('The path to the `angular.json` file for this workspace.'),
            projects: zod_1.default.array(zod_1.default.object({
                name: zod_1.default
                    .string()
                    .describe('The name of the project, as defined in the `angular.json` file.'),
                type: zod_1.default
                    .enum(['application', 'library'])
                    .optional()
                    .describe(`The type of the project, either 'application' or 'library'.`),
                root: zod_1.default
                    .string()
                    .describe('The root directory of the project, relative to the workspace root.'),
                sourceRoot: zod_1.default
                    .string()
                    .describe(`The root directory of the project's source files, relative to the workspace root.`),
                selectorPrefix: zod_1.default
                    .string()
                    .optional()
                    .describe('The prefix to use for component selectors.' +
                    ` For example, a prefix of 'app' would result in selectors like '<app-my-component>'.`),
            })),
        })),
        parsingErrors: zod_1.default
            .array(zod_1.default.object({
            filePath: zod_1.default.string().describe('The path to the file that could not be parsed.'),
            message: zod_1.default.string().describe('The error message detailing why parsing failed.'),
        }))
            .optional()
            .describe('A list of files that looked like workspaces but failed to parse.'),
    },
    isReadOnly: true,
    isLocalOnly: true,
    factory: createListProjectsHandler,
});
/**
 * Recursively finds all 'angular.json' files in a directory, skipping 'node_modules'.
 * @param dir The directory to start the search from.
 * @returns An async generator that yields the full path of each found 'angular.json' file.
 */
async function* findAngularJsonFiles(dir) {
    try {
        const entries = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = node_path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules') {
                    continue;
                }
                yield* findAngularJsonFiles(fullPath);
            }
            else if (entry.name === 'angular.json') {
                yield fullPath;
            }
        }
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        // Silently ignore errors for directories that cannot be read
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            return;
        }
        throw error;
    }
}
async function createListProjectsHandler({ server }) {
    return async () => {
        const workspaces = [];
        const parsingErrors = [];
        const seenPaths = new Set();
        let searchRoots;
        const clientCapabilities = server.server.getClientCapabilities();
        if (clientCapabilities?.roots) {
            const { roots } = await server.server.listRoots();
            searchRoots = roots?.map((r) => node_path_1.default.normalize((0, node_url_1.fileURLToPath)(r.uri))) ?? [];
            throw new Error('hi');
        }
        else {
            // Fallback to the current working directory if client does not support roots
            searchRoots = [process.cwd()];
        }
        for (const root of searchRoots) {
            for await (const configFile of findAngularJsonFiles(root)) {
                try {
                    // A workspace may be found multiple times in a monorepo
                    const resolvedPath = node_path_1.default.resolve(configFile);
                    if (seenPaths.has(resolvedPath)) {
                        continue;
                    }
                    seenPaths.add(resolvedPath);
                    const ws = await config_1.AngularWorkspace.load(configFile);
                    const projects = [];
                    for (const [name, project] of ws.projects.entries()) {
                        projects.push({
                            name,
                            type: project.extensions['projectType'],
                            root: project.root,
                            sourceRoot: project.sourceRoot ?? node_path_1.default.posix.join(project.root, 'src'),
                            selectorPrefix: project.extensions['prefix'],
                        });
                    }
                    workspaces.push({
                        path: configFile,
                        projects,
                    });
                }
                catch (error) {
                    let message;
                    if (error instanceof Error) {
                        message = error.message;
                    }
                    else {
                        // For any non-Error objects thrown, use a generic message
                        message = 'An unknown error occurred while parsing the file.';
                    }
                    parsingErrors.push({
                        filePath: configFile,
                        message,
                    });
                }
            }
        }
        if (workspaces.length === 0 && parsingErrors.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No Angular workspace found.' +
                            ' An `angular.json` file, which marks the root of a workspace,' +
                            ' could not be located in the current directory or any of its parent directories.',
                    },
                ],
                structuredContent: { workspaces: [] },
            };
        }
        let text = `Found ${workspaces.length} workspace(s).\n${JSON.stringify({ workspaces })}`;
        if (parsingErrors.length > 0) {
            text += `\n\nWarning: The following ${parsingErrors.length} file(s) could not be parsed and were skipped:\n`;
            text += parsingErrors.map((e) => `- ${e.filePath}: ${e.message}`).join('\n');
        }
        return {
            content: [{ type: 'text', text }],
            structuredContent: { workspaces, parsingErrors },
        };
    };
}
