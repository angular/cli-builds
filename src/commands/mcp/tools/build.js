"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_TOOL = void 0;
exports.runBuild = runBuild;
const zod_1 = require("zod");
const utils_1 = require("../utils");
const tool_registry_1 = require("./tool-registry");
const DEFAULT_CONFIGURATION = 'development';
const buildStatusSchema = zod_1.z.enum(['success', 'failure']);
const buildToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to build in a monorepo context. If not provided, builds the default project.'),
    configuration: zod_1.z
        .string()
        .optional()
        .describe('Which build configuration to use. Defaults to "development".'),
});
const buildToolOutputSchema = zod_1.z.object({
    status: buildStatusSchema.describe('Build status.'),
    logs: zod_1.z.array(zod_1.z.string()).optional().describe('Output logs from `ng build`.'),
    path: zod_1.z.string().optional().describe('The output location for the build, if successful.'),
});
async function runBuild(input, host) {
    // Build "ng"'s command line.
    const args = ['build'];
    if (input.project) {
        args.push(input.project);
    }
    args.push('-c', input.configuration ?? DEFAULT_CONFIGURATION);
    let status = 'success';
    let logs = [];
    let outputPath;
    try {
        logs = (await host.runCommand('ng', args)).logs;
    }
    catch (e) {
        status = 'failure';
        logs = (0, utils_1.getCommandErrorLogs)(e);
    }
    for (const line of logs) {
        const match = line.match(/Output location: (.*)/);
        if (match) {
            outputPath = match[1].trim();
            break;
        }
    }
    const structuredContent = {
        status,
        logs,
        path: outputPath,
    };
    return (0, utils_1.createStructuredContentOutput)(structuredContent);
}
exports.BUILD_TOOL = (0, tool_registry_1.declareTool)({
    name: 'build',
    title: 'Build Tool',
    description: `
<Purpose>
Perform a one-off, non-watched build using "ng build". Use this tool whenever the user wants to build an Angular project; this is similar to
"ng build", but the tool is smarter about using the right configuration and collecting the output logs.
</Purpose>
<Use Cases>
* Building an Angular project and getting build logs back.
</Use Cases>
<Operational Notes>
* This tool runs "ng build" so it expects to run within an Angular workspace.
* If you want a watched build which updates as files are changed, use "devserver.start" instead, which also serves the app.
* You can provide a project instead of building the root one. The "list_projects" MCP tool could be used to obtain the list of projects.
* This tool defaults to a development environment while a regular "ng build" defaults to a production environment. An unexpected build
  failure might suggest the project is not configured for the requested environment.
</Operational Notes>
`,
    isReadOnly: false,
    isLocalOnly: true,
    inputSchema: buildToolInputSchema.shape,
    outputSchema: buildToolOutputSchema.shape,
    factory: (context) => (input) => runBuild(input, context.host),
});
//# sourceMappingURL=build.js.map