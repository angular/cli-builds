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
const listProjectsOutputSchema = {
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
        .default([])
        .describe('A list of files that looked like workspaces but failed to parse.'),
};
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
    outputSchema: listProjectsOutputSchema,
    isReadOnly: true,
    isLocalOnly: true,
    factory: createListProjectsHandler,
});
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage']);
/**
 * Iteratively finds all 'angular.json' files with controlled concurrency and directory exclusions.
 * This non-recursive implementation is suitable for very large directory trees
 * and prevents file descriptor exhaustion (`EMFILE` errors).
 * @param rootDir The directory to start the search from.
 * @returns An async generator that yields the full path of each found 'angular.json' file.
 */
async function* findAngularJsonFiles(rootDir) {
    const CONCURRENCY_LIMIT = 50;
    const queue = [rootDir];
    while (queue.length > 0) {
        const batch = queue.splice(0, CONCURRENCY_LIMIT);
        const foundFilesInBatch = [];
        const promises = batch.map(async (dir) => {
            try {
                const entries = await (0, promises_1.readdir)(dir, { withFileTypes: true });
                const subdirectories = [];
                for (const entry of entries) {
                    const fullPath = node_path_1.default.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        // Exclude dot-directories, build/cache directories, and node_modules
                        if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) {
                            continue;
                        }
                        subdirectories.push(fullPath);
                    }
                    else if (entry.name === 'angular.json') {
                        foundFilesInBatch.push(fullPath);
                    }
                }
                return subdirectories;
            }
            catch (error) {
                (0, error_1.assertIsError)(error);
                if (error.code === 'EACCES' || error.code === 'EPERM') {
                    return []; // Silently ignore permission errors.
                }
                throw error;
            }
        });
        const nestedSubdirs = await Promise.all(promises);
        queue.push(...nestedSubdirs.flat());
        yield* foundFilesInBatch;
    }
}
/**
 * Loads, parses, and transforms a single angular.json file into the tool's output format.
 * It checks a set of seen paths to avoid processing the same workspace multiple times.
 * @param configFile The path to the angular.json file.
 * @param seenPaths A Set of absolute paths that have already been processed.
 * @returns A promise resolving to the workspace data or a parsing error.
 */
async function loadAndParseWorkspace(configFile, seenPaths) {
    try {
        const resolvedPath = node_path_1.default.resolve(configFile);
        if (seenPaths.has(resolvedPath)) {
            return { workspace: null, error: null }; // Already processed, skip.
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
        return { workspace: { path: configFile, projects }, error: null };
    }
    catch (error) {
        let message;
        if (error instanceof Error) {
            message = error.message;
        }
        else {
            message = 'An unknown error occurred while parsing the file.';
        }
        return { workspace: null, error: { filePath: configFile, message } };
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
        }
        else {
            // Fallback to the current working directory if client does not support roots
            searchRoots = [process.cwd()];
        }
        for (const root of searchRoots) {
            for await (const configFile of findAngularJsonFiles(root)) {
                const { workspace, error } = await loadAndParseWorkspace(configFile, seenPaths);
                if (workspace) {
                    workspaces.push(workspace);
                }
                if (error) {
                    parsingErrors.push(error);
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
