"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2E_TOOL = void 0;
exports.runE2e = runE2e;
const zod_1 = require("zod");
const host_1 = require("../host");
const utils_1 = require("../utils");
const tool_registry_1 = require("./tool-registry");
const e2eStatusSchema = zod_1.z.enum(['success', 'failure']);
const e2eToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to test in a monorepo context. If not provided, tests the default project.'),
});
const e2eToolOutputSchema = zod_1.z.object({
    status: e2eStatusSchema.describe('E2E execution status.'),
    logs: zod_1.z.array(zod_1.z.string()).optional().describe('Output logs from `ng e2e`.'),
});
async function runE2e(input, host, context) {
    const projectName = input.project ?? (0, utils_1.getDefaultProjectName)(context);
    if (context.workspace && projectName) {
        // Verify that if a project can be found, it has an e2e testing already set up.
        const targetProject = (0, utils_1.getProject)(context, projectName);
        if (targetProject) {
            if (!targetProject.targets.has('e2e')) {
                return (0, utils_1.createStructuredContentOutput)({
                    status: 'failure',
                    logs: [
                        `No e2e target is defined for project '${projectName}'. Please set up e2e testing` +
                            ' first by calling `ng e2e` in an interactive console.' +
                            ' See https://angular.dev/tools/cli/end-to-end.',
                    ],
                });
            }
        }
    }
    // Build "ng"'s command line.
    const args = ['e2e'];
    if (input.project) {
        args.push(input.project);
    }
    let status = 'success';
    let logs = [];
    try {
        logs = (await host.runCommand('ng', args)).logs;
    }
    catch (e) {
        status = 'failure';
        logs = (0, utils_1.getCommandErrorLogs)(e);
    }
    const structuredContent = {
        status,
        logs,
    };
    return (0, utils_1.createStructuredContentOutput)(structuredContent);
}
exports.E2E_TOOL = (0, tool_registry_1.declareTool)({
    name: 'e2e',
    title: 'E2E Tool',
    description: `
<Purpose>
Perform an end-to-end test with ng e2e.
</Purpose>
<Use Cases>
* When the user requests running end-to-end tests for the project.
* When verifying changes that cross unit boundaries, such as changes to both client and server, changes to shared data types, etc.
</Use Cases>
<Operational Notes>
* This tool uses "ng e2e".
* Important: this relies on e2e tests being already configured for this project. It will error out if no "e2e" target is defined.
</Operational Notes>
`,
    isReadOnly: false,
    isLocalOnly: true,
    inputSchema: e2eToolInputSchema.shape,
    outputSchema: e2eToolOutputSchema.shape,
    factory: (context) => (input) => runE2e(input, host_1.LocalWorkspaceHost, context),
});
//# sourceMappingURL=e2e.js.map