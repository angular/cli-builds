"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericTargetStrategy = void 0;
const utils_1 = require("../../utils");
const BUILT_IN_COMMANDS = new Set([
    'build',
    'test',
    'e2e',
    'serve',
    'deploy',
    'extract-i18n',
    'lint',
]);
class GenericTargetStrategy {
    canHandle(target, builder) {
        return true; // Universal fallback strategy
    }
    async execute(input, context) {
        if (input.target === 'serve' || input.options?.['watch'] === true) {
            throw new Error(`Watch mode execution (serve target or watch option) is not yet supported by 'run_target'. ` +
                `Please use the legacy 'devserver.start' / 'devserver.wait_for_build' tools instead.`);
        }
        const args = [];
        if (BUILT_IN_COMMANDS.has(input.target)) {
            args.push(input.target, input.projectName);
        }
        else {
            args.push('run', `${input.projectName}:${input.target}`);
        }
        if (input.configuration) {
            args.push('-c', input.configuration);
        }
        let options = input.options;
        if (input.target === 'test') {
            options = {
                ...options,
                watch: false,
            };
        }
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                if (!/^[a-zA-Z0-9-_]+$/.test(key)) {
                    throw new Error(`Invalid option key: '${key}'. Option keys must be alphanumeric, hyphens, or underscores.`);
                }
                if (typeof value === 'boolean') {
                    args.push(value ? `--${key}` : `--no-${key}`);
                }
                else if (Array.isArray(value)) {
                    for (const item of value) {
                        args.push(`--${key}=${item}`);
                    }
                }
                else if (value !== null && value !== undefined) {
                    args.push(`--${key}=${value}`);
                }
            }
        }
        let status = 'success';
        let logs;
        try {
            const result = await context.host.executeNgCommand(args, { cwd: input.workspacePath });
            logs = result.logs;
        }
        catch (e) {
            status = 'failure';
            logs = (0, utils_1.getCommandErrorLogs)(e);
        }
        return { status, logs };
    }
}
exports.GenericTargetStrategy = GenericTargetStrategy;
//# sourceMappingURL=generic-target-strategy.js.map