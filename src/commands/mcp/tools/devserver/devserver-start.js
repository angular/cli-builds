"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVSERVER_START_TOOL = void 0;
exports.startDevserver = startDevserver;
const zod_1 = require("zod");
const devserver_1 = require("../../devserver");
const utils_1 = require("../../utils");
const tool_registry_1 = require("../tool-registry");
const devserverStartToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to serve in a monorepo context. If not provided, serves the default project.'),
});
const devserverStartToolOutputSchema = zod_1.z.object({
    message: zod_1.z.string().describe('A message indicating the result of the operation.'),
    address: zod_1.z
        .string()
        .optional()
        .describe('If the operation was successful, this is the HTTP address that the server can be found at.'),
});
function localhostAddress(port) {
    return `http://localhost:${port}/`;
}
async function startDevserver(input, context) {
    const projectName = input.project ?? (0, utils_1.getDefaultProjectName)(context);
    if (!projectName) {
        return (0, utils_1.createStructuredContentOutput)({
            message: ['Project name not provided, and no default project found.'],
        });
    }
    let devserver = context.devservers.get(projectName);
    if (devserver) {
        return (0, utils_1.createStructuredContentOutput)({
            message: `Development server for project '${projectName}' is already running.`,
            address: localhostAddress(devserver.port),
        });
    }
    const port = await context.host.getAvailablePort();
    devserver = new devserver_1.LocalDevserver({ host: context.host, project: input.project, port });
    devserver.start();
    context.devservers.set(projectName, devserver);
    return (0, utils_1.createStructuredContentOutput)({
        message: `Development server for project '${projectName}' started and watching for workspace changes.`,
        address: localhostAddress(port),
    });
}
exports.DEVSERVER_START_TOOL = (0, tool_registry_1.declareTool)({
    name: 'devserver.start',
    title: 'Start Development Server',
    description: `
<Purpose>
Starts the Angular development server ("ng serve") as a background process. Follow this up with "devserver.wait_for_build" to wait until
the first build completes.
</Purpose>
<Use Cases>
* **Starting the Server:** Use this tool to begin serving the application. The tool will return immediately while the server runs in the
  background.
* **Get Initial Build Logs:** Once a dev server has started, use the "devserver.wait_for_build" tool to ensure it's alive. If there are any
  build errors, "devserver.wait_for_build" would provide them back and you can give them to the user or rely on them to propose a fix.
* **Get Updated Build Logs:** Important: as long as a devserver is alive (i.e. "devserver.stop" wasn't called), after every time you make a
  change to the workspace, re-run "devserver.wait_for_build" to see whether the change was successfully built and wait for the devserver to
  be updated.
</Use Cases>
<Operational Notes>
* This tool manages development servers by itself. It maintains at most a single dev server instance for each project in the monorepo.
* This is an asynchronous operation. Subsequent commands can be ran while the server is active.
* Use 'devserver.stop' to gracefully shut down the server and access the full log output.
</Operational Notes>
`,
    isReadOnly: true,
    isLocalOnly: true,
    inputSchema: devserverStartToolInputSchema.shape,
    outputSchema: devserverStartToolOutputSchema.shape,
    factory: (context) => (input) => {
        return startDevserver(input, context);
    },
});
//# sourceMappingURL=devserver-start.js.map