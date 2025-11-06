"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.START_DEVSERVER_TOOL = void 0;
exports.startDevServer = startDevServer;
const zod_1 = require("zod");
const dev_server_1 = require("../../dev-server");
const host_1 = require("../../host");
const utils_1 = require("../../utils");
const tool_registry_1 = require("../tool-registry");
const startDevServerToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to serve in a monorepo context. If not provided, serves the default project.'),
});
const startDevServerToolOutputSchema = zod_1.z.object({
    message: zod_1.z.string().describe('A message indicating the result of the operation.'),
    address: zod_1.z
        .string()
        .optional()
        .describe('If the operation was successful, this is the HTTP address that the server can be found at.'),
});
function localhostAddress(port) {
    return `http://localhost:${port}/`;
}
async function startDevServer(input, context, host) {
    const projectKey = (0, dev_server_1.devServerKey)(input.project);
    let devServer = context.devServers.get(projectKey);
    if (devServer) {
        return (0, utils_1.createStructuredContentOutput)({
            message: `Development server for project '${projectKey}' is already running.`,
            address: localhostAddress(devServer.port),
        });
    }
    const port = await host.getAvailablePort();
    devServer = new dev_server_1.LocalDevServer({ host, project: input.project, port });
    devServer.start();
    context.devServers.set(projectKey, devServer);
    return (0, utils_1.createStructuredContentOutput)({
        message: `Development server for project '${projectKey}' started and watching for workspace changes.`,
        address: localhostAddress(port),
    });
}
exports.START_DEVSERVER_TOOL = (0, tool_registry_1.declareTool)({
    name: 'start_devserver',
    title: 'Start Development Server',
    description: `
<Purpose>
Starts the Angular development server ("ng serve") as a background process. Follow this up with "wait_for_devserver_build" to wait until
the first build completes.
</Purpose>
<Use Cases>
* **Starting the Server:** Use this tool to begin serving the application. The tool will return immediately while the server runs in the
  background.
* **Get Initial Build Logs:** Once a dev server has started, use the "wait_for_devserver_build" tool to ensure it's alive. If there are any
  build errors, "wait_for_devserver_build" would provide them back and you can give them to the user or rely on them to propose a fix.
* **Get Updated Build Logs:** Important: as long as a devserver is alive (i.e. "stop_devserver" wasn't called), after every time you make a
  change to the workspace, re-run "wait_for_devserver_build" to see whether the change was successfully built and wait for the devserver to
  be updated.
</Use Cases>
<Operational Notes>
* This tool manages development servers by itself. It maintains at most a single dev server instance for each project in the monorepo.
* This is an asynchronous operation. Subsequent commands can be ran while the server is active.
* Use 'stop_devserver' to gracefully shut down the server and access the full log output.
</Operational Notes>
`,
    isReadOnly: true,
    isLocalOnly: true,
    inputSchema: startDevServerToolInputSchema.shape,
    outputSchema: startDevServerToolOutputSchema.shape,
    factory: (context) => (input) => {
        return startDevServer(input, context, host_1.LocalWorkspaceHost);
    },
});
//# sourceMappingURL=start-devserver.js.map