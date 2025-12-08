"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVSERVER_STOP_TOOL = void 0;
exports.stopDevserver = stopDevserver;
const zod_1 = require("zod");
const devserver_1 = require("../../devserver");
const utils_1 = require("../../utils");
const tool_registry_1 = require("../tool-registry");
const devserverStopToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to stop serving in a monorepo context. If not provided, stops the default project server.'),
});
const devserverStopToolOutputSchema = zod_1.z.object({
    message: zod_1.z.string().describe('A message indicating the result of the operation.'),
    logs: zod_1.z.array(zod_1.z.string()).optional().describe('The full logs from the dev server.'),
});
function stopDevserver(input, context) {
    const projectKey = (0, devserver_1.devserverKey)(input.project);
    const devServer = context.devservers.get(projectKey);
    if (!devServer) {
        return (0, utils_1.createStructuredContentOutput)({
            message: `Development server for project '${projectKey}' was not running.`,
            logs: undefined,
        });
    }
    devServer.stop();
    context.devservers.delete(projectKey);
    return (0, utils_1.createStructuredContentOutput)({
        message: `Development server for project '${projectKey}' stopped.`,
        logs: devServer.getServerLogs(),
    });
}
exports.DEVSERVER_STOP_TOOL = (0, tool_registry_1.declareTool)({
    name: 'devserver/stop',
    title: 'Stop Development Server',
    description: `
<Purpose>
Stops a running Angular development server ("ng serve") that was started with the "devserver/start" tool.
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
    inputSchema: devserverStopToolInputSchema.shape,
    outputSchema: devserverStopToolOutputSchema.shape,
    factory: (context) => (input) => {
        return stopDevserver(input, context);
    },
});
//# sourceMappingURL=devserver-stop.js.map