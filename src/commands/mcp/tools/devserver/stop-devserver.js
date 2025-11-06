"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOP_DEVSERVER_TOOL = void 0;
exports.stopDevserver = stopDevserver;
const zod_1 = require("zod");
const dev_server_1 = require("../../dev-server");
const utils_1 = require("../../utils");
const tool_registry_1 = require("../tool-registry");
const stopDevserverToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to stop serving in a monorepo context. If not provided, stops the default project server.'),
});
const stopDevserverToolOutputSchema = zod_1.z.object({
    message: zod_1.z.string().describe('A message indicating the result of the operation.'),
    logs: zod_1.z.array(zod_1.z.string()).optional().describe('The full logs from the dev server.'),
});
function stopDevserver(input, context) {
    const projectKey = (0, dev_server_1.devServerKey)(input.project);
    const devServer = context.devServers.get(projectKey);
    if (!devServer) {
        return (0, utils_1.createStructuredContentOutput)({
            message: `Development server for project '${projectKey}' was not running.`,
            logs: undefined,
        });
    }
    devServer.stop();
    context.devServers.delete(projectKey);
    return (0, utils_1.createStructuredContentOutput)({
        message: `Development server for project '${projectKey}' stopped.`,
        logs: devServer.getServerLogs(),
    });
}
exports.STOP_DEVSERVER_TOOL = (0, tool_registry_1.declareTool)({
    name: 'stop_devserver',
    title: 'Stop Development Server',
    description: `
<Purpose>
Stops a running Angular development server ("ng serve") that was started with the "start_devserver" tool.
</Purpose>
<Use Cases>
* **Stopping the Server:** Use this tool to terminate a running development server and retrieve the logs.
</Use Cases>
<Operational Notes>
* This should be called to gracefully shut down the server and access the full log output.
* This just sends a SIGTERM to the server and returns immediately; so the server might still be functional for a short
  time after this is called. However note that this is not a blocker for starting a new devserver.
</Operational Notes>
`,
    isReadOnly: true,
    isLocalOnly: true,
    inputSchema: stopDevserverToolInputSchema.shape,
    outputSchema: stopDevserverToolOutputSchema.shape,
    factory: (context) => (input) => {
        return stopDevserver(input, context);
    },
});
//# sourceMappingURL=stop-devserver.js.map