"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUN_TARGET_TOOL = void 0;
exports.runTarget = runTarget;
const utils_1 = require("../../utils");
const workspace_utils_1 = require("../../workspace-utils");
const tool_registry_1 = require("../tool-registry");
const generic_target_strategy_1 = require("./generic-target-strategy");
const types_1 = require("./types");
const FALLBACK_STRATEGY = new generic_target_strategy_1.GenericTargetStrategy();
const STRATEGIES = [];
async function runTarget(input, context) {
    const { workspace, workspacePath, projectName } = await (0, workspace_utils_1.resolveWorkspaceAndProject)({
        host: context.host,
        server: context.server,
        workspacePathInput: input.workspace,
        projectNameInput: input.project,
        mcpWorkspace: context.workspace,
    });
    const targetDefinition = workspace.projects.get(projectName)?.targets.get(input.target);
    const builder = targetDefinition?.builder;
    const strategy = STRATEGIES.find((s) => s.canHandle(input.target, builder)) ?? FALLBACK_STRATEGY;
    const result = await strategy.execute({
        workspacePath,
        projectName,
        target: input.target,
        configuration: input.configuration,
        options: input.options,
    }, context);
    return (0, utils_1.createStructuredContentOutput)(result);
}
exports.RUN_TARGET_TOOL = (0, tool_registry_1.declareTool)({
    name: 'run_target',
    title: 'Run Project Target',
    description: `
<Purpose>
Executes a configured target (such as build, test, lint, e2e) for an Angular project.
This is the single, unified interface for executing all project tasks natively.
</Purpose>
<Use Cases>
* Building an application or library.
* Running unit tests, E2E tests, or linters.
* Deploying or running custom workspace targets discovered via 'list_projects'.
</Use Cases>
<Operational Notes>
* Mandatory Discovery: You MUST discover available project targets by calling 'list_projects' first.
* Watch mode (serve target or watch options) is NOT yet supported in this version of run_target.
  You MUST use the legacy 'devserver.*' tools for background server lifecycles.
</Operational Notes>`,
    isReadOnly: false,
    isLocalOnly: true,
    inputSchema: types_1.runTargetInputSchema.shape,
    outputSchema: types_1.runTargetOutputSchema.shape,
    factory: (context) => (input) => runTarget(input, context),
});
//# sourceMappingURL=run-target.js.map