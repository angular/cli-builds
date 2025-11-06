"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAIT_FOR_DEVSERVER_BUILD_TOOL = exports.WATCH_DELAY = void 0;
exports.waitForDevserverBuild = waitForDevserverBuild;
const zod_1 = require("zod");
const dev_server_1 = require("../../dev-server");
const utils_1 = require("../../utils");
const tool_registry_1 = require("../tool-registry");
/**
 * How long to wait to give "ng serve" time to identify whether the watched workspace has changed.
 */
exports.WATCH_DELAY = 1000;
/**
 * Default timeout for waiting for the build to complete.
 */
const DEFAULT_TIMEOUT = 180_000; // In milliseconds
const waitForDevserverBuildToolInputSchema = zod_1.z.object({
    project: zod_1.z
        .string()
        .optional()
        .describe('Which project to wait for in a monorepo context. If not provided, waits for the default project server.'),
    timeout: zod_1.z
        .number()
        .default(DEFAULT_TIMEOUT)
        .describe(`The maximum time to wait for the build to complete, in milliseconds. This can't be lower than ${exports.WATCH_DELAY}.`),
});
const waitForDevserverBuildToolOutputSchema = zod_1.z.object({
    status: zod_1.z
        .enum(['success', 'failure', 'unknown', 'timeout', 'no_devserver_found'])
        .describe("The status of the build if it's complete, or a status indicating why the wait operation failed."),
    logs: zod_1.z
        .array(zod_1.z.string())
        .optional()
        .describe('The logs from the most recent build, if one exists.'),
});
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForDevserverBuild(input, context) {
    const projectKey = (0, dev_server_1.devServerKey)(input.project);
    const devServer = context.devServers.get(projectKey);
    const deadline = Date.now() + input.timeout;
    if (!devServer) {
        return (0, utils_1.createStructuredContentOutput)({
            status: 'no_devserver_found',
        });
    }
    await wait(exports.WATCH_DELAY);
    while (devServer.isBuilding()) {
        if (Date.now() > deadline) {
            return (0, utils_1.createStructuredContentOutput)({
                status: 'timeout',
            });
        }
        await wait(exports.WATCH_DELAY);
    }
    return (0, utils_1.createStructuredContentOutput)({
        ...devServer.getMostRecentBuild(),
    });
}
exports.WAIT_FOR_DEVSERVER_BUILD_TOOL = (0, tool_registry_1.declareTool)({
    name: 'wait_for_devserver_build',
    title: 'Wait for Devserver Build',
    description: `
<Purpose>
Waits for a dev server that was started with the "start_devserver" tool to complete its build, then reports the build logs from its most
recent build.
</Purpose>
<Use Cases>
* **Waiting for a build:** As long as a devserver is alive ("start_devserver" was called for this project and "stop_devserver" wasn't
  called yet), then if you're making a file change and want to ensure it was successfully built, call this tool instead of any other build
  tool or command. When it retuns you'll get build logs back **and** you'll know the user's devserver is up-to-date with the latest changes.
</Use Cases>
<Operational Notes>
* This tool expects that a dev server was launched on the same project with the "start_devserver" tool, otherwise a "no_devserver_found"
  status will be returned.
* This tool will block until the build is complete or the timeout is reached. If you expect a long build process, consider increasing the
  timeout. Timeouts on initial run (right after "start_devserver" calls) or after a big change are not necessarily indicative of an error.
* If you encountered a timeout and it might be reasonable, just call this tool again.
* If the dev server is not building, it will return quickly, with the logs from the last build.
* A 'no_devserver_found' status can indicate the underlying server was stopped for some reason. Try first to call the "start_devserver"
  tool again, before giving up.
</Operational Notes>
`,
    isReadOnly: true,
    isLocalOnly: true,
    inputSchema: waitForDevserverBuildToolInputSchema.shape,
    outputSchema: waitForDevserverBuildToolOutputSchema.shape,
    factory: (context) => (input) => {
        return waitForDevserverBuild(input, context);
    },
});
//# sourceMappingURL=wait-for-devserver-build.js.map