"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalWorkspaceHost = exports.CommandError = void 0;
/**
 * @fileoverview
 * This file defines an abstraction layer for operating-system or file-system operations, such as
 * command execution. This allows for easier testing by enabling the injection of mock or
 * test-specific implementations.
 */
const fs_1 = require("fs");
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_module_1 = require("node:module");
const node_net_1 = require("node:net");
/**
 * An error thrown when a command fails to execute.
 */
class CommandError extends Error {
    logs;
    code;
    constructor(message, logs, code) {
        super(message);
        this.logs = logs;
        this.code = code;
    }
}
exports.CommandError = CommandError;
/**
 * A concrete implementation of the `Host` interface that runs on a local workspace.
 */
exports.LocalWorkspaceHost = {
    stat: promises_1.stat,
    existsSync: fs_1.existsSync,
    readFile: promises_1.readFile,
    glob: function (pattern, options) {
        return (0, promises_1.glob)(pattern, { ...options, withFileTypes: true });
    },
    resolveModule(request, from) {
        return (0, node_module_1.createRequire)(from).resolve(request);
    },
    runCommand: async (command, args, options = {}) => {
        const signal = options.timeout ? AbortSignal.timeout(options.timeout) : undefined;
        return new Promise((resolve, reject) => {
            const childProcess = (0, node_child_process_1.spawn)(command, args, {
                shell: false,
                stdio: options.stdio ?? 'pipe',
                signal,
                cwd: options.cwd,
                env: {
                    ...process.env,
                    ...options.env,
                },
            });
            const logs = [];
            childProcess.stdout?.on('data', (data) => logs.push(data.toString()));
            childProcess.stderr?.on('data', (data) => logs.push(data.toString()));
            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ logs });
                }
                else {
                    const message = `Process exited with code ${code}.`;
                    reject(new CommandError(message, logs, code));
                }
            });
            childProcess.on('error', (err) => {
                if (err.name === 'AbortError') {
                    const message = `Process timed out.`;
                    reject(new CommandError(message, logs, null));
                    return;
                }
                const message = `Process failed with error: ${err.message}`;
                reject(new CommandError(message, logs, null));
            });
        });
    },
    spawn(command, args, options = {}) {
        return (0, node_child_process_1.spawn)(command, args, {
            shell: false,
            stdio: options.stdio ?? 'pipe',
            cwd: options.cwd,
            env: {
                ...process.env,
                ...options.env,
            },
        });
    },
    getAvailablePort() {
        return new Promise((resolve, reject) => {
            // Create a new temporary server from Node's net library.
            const server = (0, node_net_1.createServer)();
            server.once('error', (err) => {
                reject(err);
            });
            // Listen on port 0 to let the OS assign an available port.
            server.listen(0, () => {
                const address = server.address();
                // Ensure address is an object with a port property.
                if (address && typeof address === 'object') {
                    const port = address.port;
                    server.close();
                    resolve(port);
                }
                else {
                    reject(new Error('Unable to retrieve address information from server.'));
                }
            });
        });
    },
};
//# sourceMappingURL=host.js.map