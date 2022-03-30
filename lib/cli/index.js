"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
const node_1 = require("@angular-devkit/core/node");
const util_1 = require("util");
const command_module_1 = require("../../src/command-builder/command-module");
const command_runner_1 = require("../../src/command-builder/command-runner");
const color_1 = require("../../src/utilities/color");
const environment_options_1 = require("../../src/utilities/environment-options");
const log_file_1 = require("../../src/utilities/log-file");
var version_1 = require("../../src/utilities/version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
/* eslint-disable no-console */
async function default_1(options) {
    // This node version check ensures that the requirements of the project instance of the CLI are met
    const [major, minor] = process.versions.node.split('.').map((part) => Number(part));
    if (major < 14 || (major === 14 && minor < 15)) {
        process.stderr.write(`Node.js version ${process.version} detected.\n` +
            'The Angular CLI requires a minimum v14.15.\n\n' +
            'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n');
        return 3;
    }
    const logger = (0, node_1.createConsoleLogger)(environment_options_1.ngDebug, process.stdout, process.stderr, {
        info: (s) => (color_1.colors.enabled ? s : (0, color_1.removeColor)(s)),
        debug: (s) => (color_1.colors.enabled ? s : (0, color_1.removeColor)(s)),
        warn: (s) => (color_1.colors.enabled ? color_1.colors.bold.yellow(s) : (0, color_1.removeColor)(s)),
        error: (s) => (color_1.colors.enabled ? color_1.colors.bold.red(s) : (0, color_1.removeColor)(s)),
        fatal: (s) => (color_1.colors.enabled ? color_1.colors.bold.red(s) : (0, color_1.removeColor)(s)),
    });
    // Redirect console to logger
    console.info = console.log = function (...args) {
        logger.info((0, util_1.format)(...args));
    };
    console.warn = function (...args) {
        logger.warn((0, util_1.format)(...args));
    };
    console.error = function (...args) {
        logger.error((0, util_1.format)(...args));
    };
    try {
        return await (0, command_runner_1.runCommand)(options.cliArgs, logger);
    }
    catch (err) {
        if (err instanceof command_module_1.CommandModuleError) {
            logger.fatal(`Error: ${err.message}`);
        }
        else if (err instanceof Error) {
            try {
                const logPath = (0, log_file_1.writeErrorToLogFile)(err);
                logger.fatal(`An unhandled exception occurred: ${err.message}\n` +
                    `See "${logPath}" for further details.`);
            }
            catch (e) {
                logger.fatal(`An unhandled exception occurred: ${err.message}\n` +
                    `Fatal error writing debug log file: ${e.message}`);
                if (err.stack) {
                    logger.fatal(err.stack);
                }
            }
            return 127;
        }
        else if (typeof err === 'string') {
            logger.fatal(err);
        }
        else if (typeof err === 'number') {
            // Log nothing.
        }
        else {
            logger.fatal('An unexpected error occurred: ' + JSON.stringify(err));
        }
        if (options.testing) {
            // eslint-disable-next-line no-debugger
            debugger;
            throw err;
        }
        return 1;
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsaUZBQWtFO0FBQ2xFLDJEQUFtRTtBQUVuRSx1REFBc0Q7QUFBN0Msa0dBQUEsT0FBTyxPQUFBO0FBRWhCLCtCQUErQjtBQUNoQixLQUFLLG9CQUFXLE9BQWlEO0lBQzlFLG1HQUFtRztJQUNuRyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLElBQUksS0FBSyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QyxnREFBZ0Q7WUFDaEQsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyw2QkFBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRTtRQUMxRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFX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QWU7U0FDaEI7YUFBTTtZQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3RFO1FBRUQsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ25CLHVDQUF1QztZQUN2QyxRQUFRLENBQUM7WUFDVCxNQUFNLEdBQUcsQ0FBQztTQUNYO1FBRUQsT0FBTyxDQUFDLENBQUM7S0FDVjtBQUNILENBQUM7QUF2RUQsNEJBdUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZUVycm9yIH0gZnJvbSAnLi4vLi4vc3JjL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vc3JjL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLXJ1bm5lcic7XG5pbXBvcnQgeyBjb2xvcnMsIHJlbW92ZUNvbG9yIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBuZ0RlYnVnIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IHdyaXRlRXJyb3JUb0xvZ0ZpbGUgfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL2xvZy1maWxlJztcblxuZXhwb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvdmVyc2lvbic7XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiB7IHRlc3Rpbmc/OiBib29sZWFuOyBjbGlBcmdzOiBzdHJpbmdbXSB9KSB7XG4gIC8vIFRoaXMgbm9kZSB2ZXJzaW9uIGNoZWNrIGVuc3VyZXMgdGhhdCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSBwcm9qZWN0IGluc3RhbmNlIG9mIHRoZSBDTEkgYXJlIG1ldFxuICBjb25zdCBbbWFqb3IsIG1pbm9yXSA9IHByb2Nlc3MudmVyc2lvbnMubm9kZS5zcGxpdCgnLicpLm1hcCgocGFydCkgPT4gTnVtYmVyKHBhcnQpKTtcbiAgaWYgKG1ham9yIDwgMTQgfHwgKG1ham9yID09PSAxNCAmJiBtaW5vciA8IDE1KSkge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYE5vZGUuanMgdmVyc2lvbiAke3Byb2Nlc3MudmVyc2lvbn0gZGV0ZWN0ZWQuXFxuYCArXG4gICAgICAgICdUaGUgQW5ndWxhciBDTEkgcmVxdWlyZXMgYSBtaW5pbXVtIHYxNC4xNS5cXG5cXG4nICtcbiAgICAgICAgJ1BsZWFzZSB1cGRhdGUgeW91ciBOb2RlLmpzIHZlcnNpb24gb3IgdmlzaXQgaHR0cHM6Ly9ub2RlanMub3JnLyBmb3IgYWRkaXRpb25hbCBpbnN0cnVjdGlvbnMuXFxuJyxcbiAgICApO1xuXG4gICAgcmV0dXJuIDM7XG4gIH1cblxuICBjb25zdCBsb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKG5nRGVidWcsIHByb2Nlc3Muc3Rkb3V0LCBwcm9jZXNzLnN0ZGVyciwge1xuICAgIGluZm86IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBzIDogcmVtb3ZlQ29sb3IocykpLFxuICAgIGRlYnVnOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gcyA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICB3YXJuOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gY29sb3JzLmJvbGQueWVsbG93KHMpIDogcmVtb3ZlQ29sb3IocykpLFxuICAgIGVycm9yOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gY29sb3JzLmJvbGQucmVkKHMpIDogcmVtb3ZlQ29sb3IocykpLFxuICAgIGZhdGFsOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gY29sb3JzLmJvbGQucmVkKHMpIDogcmVtb3ZlQ29sb3IocykpLFxuICB9KTtcblxuICAvLyBSZWRpcmVjdCBjb25zb2xlIHRvIGxvZ2dlclxuICBjb25zb2xlLmluZm8gPSBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmluZm8oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS53YXJuID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICBsb2dnZXIud2Fybihmb3JtYXQoLi4uYXJncykpO1xuICB9O1xuICBjb25zb2xlLmVycm9yID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICBsb2dnZXIuZXJyb3IoZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcblxuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCBydW5Db21tYW5kKG9wdGlvbnMuY2xpQXJncywgbG9nZ2VyKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIENvbW1hbmRNb2R1bGVFcnJvcikge1xuICAgICAgbG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9IGVsc2UgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlcnIpO1xuICAgICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYEFuIHVuaGFuZGxlZCBleGNlcHRpb24gb2NjdXJyZWQ6ICR7ZXJyLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgU2VlIFwiJHtsb2dQYXRofVwiIGZvciBmdXJ0aGVyIGRldGFpbHMuYCxcbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYEZhdGFsIGVycm9yIHdyaXRpbmcgZGVidWcgbG9nIGZpbGU6ICR7ZS5tZXNzYWdlfWAsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gMTI3O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ251bWJlcicpIHtcbiAgICAgIC8vIExvZyBub3RoaW5nLlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZmF0YWwoJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZGVidWdnZXJcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG4iXX0=