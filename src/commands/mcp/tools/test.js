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
function shouldUseHeadlessOption(testTarget) {
    return (testTarget?.builder === '@angular/build:unit-test' && testTarget.options?.['runner'] !== 'karma');
}
async function runTest(input, context) {
    const { workspace, workspacePath, projectName } = await (0, workspace_utils_1.resolveWorkspaceAndProject)({
        host: context.host,
        workspacePathInput: input.workspace,
        projectNameInput: input.project,
        mcpWorkspace: context.workspace,
    });
    // Build "ng"'s command line.
    const args = ['test', projectName];
    if (shouldUseHeadlessOption(workspace.projects.get(projectName)?.targets.get('test'))) {
        args.push('--headless', 'true');
    }
    else {
        // Karma-based projects need an explicit headless browser for non-interactive MCP execution.
        args.push('--browsers', 'ChromeHeadless');
    }
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
* For the "@angular/build:unit-test" builder with Vitest, this tool requests headless execution via "--headless true".
* For Karma-based projects, this tool forces headless Chrome with "--browsers ChromeHeadless", so Chrome must be installed.
</Operational Notes>
`,
    isReadOnly: false,
    isLocalOnly: true,
    inputSchema: testToolInputSchema.shape,
    outputSchema: testToolOutputSchema.shape,
    factory: (context) => (input) => runTest(input, context),
});
//# sourceMappingURL=test.js.map