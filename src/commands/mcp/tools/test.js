"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_TOOL = void 0;
exports.runTest = runTest;
const zod_1 = require("zod");
const shared_options_1 = require("../shared-options");
const utils_1 = require("../utils");
const workspace_utils_1 = require("../workspace-utils");
const tool_registry_1 = require("./tool-registry");
const testStatusSchema = zod_1.z.enum(['success', 'failure']);
const testToolInputSchema = zod_1.z.object({
    ...shared_options_1.workspaceAndProjectOptions,
    filter: zod_1.z.string().optional().describe('Filter the executed tests by spec name.'),
});
const testToolOutputSchema = zod_1.z.object({
    status: testStatusSchema.describe('Test execution status.'),
    logs: zod_1.z.array(zod_1.z.string()).optional().describe('Output logs from `ng test`.'),
});
async function runTest(input, context) {
    const { workspacePath, projectName } = await (0, workspace_utils_1.resolveWorkspaceAndProject)({
        host: context.host,
        workspacePathInput: input.workspace,
        projectNameInput: input.project,
        mcpWorkspace: context.workspace,
    });
    // Build "ng"'s command line.
    const args = ['test', projectName];
    // This is ran by the agent so we want a non-watched, headless test.
    args.push('--browsers', 'ChromeHeadless');
    args.push('--watch', 'false');
    if (input.filter) {
        args.push('--filter', input.filter);
    }
    let status = 'success';
    let logs = [];
    try {
        logs = (await context.host.runCommand('ng', args, { cwd: workspacePath })).logs;
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
exports.TEST_TOOL = (0, tool_registry_1.declareTool)({
    name: 'test',
    title: 'Test Tool',
    description: `
<Purpose>
Perform a one-off, non-watched unit test execution with ng test.
</Purpose>
<Use Cases>
* Running unit tests for the project.
* Verifying code changes with tests.
</Use Cases>
<Operational Notes>
* This tool uses "ng test".
* It supports filtering by spec name if the underlying builder supports it (e.g., 'unit-test' builder).
* This runs a headless Chrome as a browser, so requires Chrome to be installed.
</Operational Notes>
`,
    isReadOnly: false,
    isLocalOnly: true,
    inputSchema: testToolInputSchema.shape,
    outputSchema: testToolOutputSchema.shape,
    factory: (context) => (input) => runTest(input, context),
});
//# sourceMappingURL=test.js.map