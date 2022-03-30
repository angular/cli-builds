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
        return 1;
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsaUZBQWtFO0FBQ2xFLDJEQUFtRTtBQUVuRSx1REFBc0Q7QUFBN0Msa0dBQUEsT0FBTyxPQUFBO0FBRWhCLCtCQUErQjtBQUNoQixLQUFLLG9CQUFXLE9BQThCO0lBQzNELG1HQUFtRztJQUNuRyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLElBQUksS0FBSyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QyxnREFBZ0Q7WUFDaEQsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyw2QkFBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRTtRQUMxRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFX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QWU7U0FDaEI7YUFBTTtZQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3RFO1FBRUQsT0FBTyxDQUFDLENBQUM7S0FDVjtBQUNILENBQUM7QUFqRUQsNEJBaUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZUVycm9yIH0gZnJvbSAnLi4vLi4vc3JjL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vc3JjL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLXJ1bm5lcic7XG5pbXBvcnQgeyBjb2xvcnMsIHJlbW92ZUNvbG9yIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBuZ0RlYnVnIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IHdyaXRlRXJyb3JUb0xvZ0ZpbGUgfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL2xvZy1maWxlJztcblxuZXhwb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvdmVyc2lvbic7XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiB7IGNsaUFyZ3M6IHN0cmluZ1tdIH0pIHtcbiAgLy8gVGhpcyBub2RlIHZlcnNpb24gY2hlY2sgZW5zdXJlcyB0aGF0IHRoZSByZXF1aXJlbWVudHMgb2YgdGhlIHByb2plY3QgaW5zdGFuY2Ugb2YgdGhlIENMSSBhcmUgbWV0XG4gIGNvbnN0IFttYWpvciwgbWlub3JdID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KCcuJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydCkpO1xuICBpZiAobWFqb3IgPCAxNCB8fCAobWFqb3IgPT09IDE0ICYmIG1pbm9yIDwgMTUpKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgTm9kZS5qcyB2ZXJzaW9uICR7cHJvY2Vzcy52ZXJzaW9ufSBkZXRlY3RlZC5cXG5gICtcbiAgICAgICAgJ1RoZSBBbmd1bGFyIENMSSByZXF1aXJlcyBhIG1pbmltdW0gdjE0LjE1LlxcblxcbicgK1xuICAgICAgICAnUGxlYXNlIHVwZGF0ZSB5b3VyIE5vZGUuanMgdmVyc2lvbiBvciB2aXNpdCBodHRwczovL25vZGVqcy5vcmcvIGZvciBhZGRpdGlvbmFsIGluc3RydWN0aW9ucy5cXG4nLFxuICAgICk7XG5cbiAgICByZXR1cm4gMztcbiAgfVxuXG4gIGNvbnN0IGxvZ2dlciA9IGNyZWF0ZUNvbnNvbGVMb2dnZXIobmdEZWJ1ZywgcHJvY2Vzcy5zdGRvdXQsIHByb2Nlc3Muc3RkZXJyLCB7XG4gICAgaW5mbzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZGVidWc6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBzIDogcmVtb3ZlQ29sb3IocykpLFxuICAgIHdhcm46IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC55ZWxsb3cocykgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZXJyb3I6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC5yZWQocykgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZmF0YWw6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC5yZWQocykgOiByZW1vdmVDb2xvcihzKSksXG4gIH0pO1xuXG4gIC8vIFJlZGlyZWN0IGNvbnNvbGUgdG8gbG9nZ2VyXG4gIGNvbnNvbGUuaW5mbyA9IGNvbnNvbGUubG9nID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICBsb2dnZXIuaW5mbyhmb3JtYXQoLi4uYXJncykpO1xuICB9O1xuICBjb25zb2xlLndhcm4gPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci53YXJuKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUuZXJyb3IgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5lcnJvcihmb3JtYXQoLi4uYXJncykpO1xuICB9O1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IHJ1bkNvbW1hbmQob3B0aW9ucy5jbGlBcmdzLCBsb2dnZXIpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQ29tbWFuZE1vZHVsZUVycm9yKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoYEVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgIH0gZWxzZSBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxvZ1BhdGggPSB3cml0ZUVycm9yVG9Mb2dGaWxlKGVycik7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBTZWUgXCIke2xvZ1BhdGh9XCIgZm9yIGZ1cnRoZXIgZGV0YWlscy5gLFxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYEFuIHVuaGFuZGxlZCBleGNlcHRpb24gb2NjdXJyZWQ6ICR7ZXJyLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgRmF0YWwgZXJyb3Igd3JpdGluZyBkZWJ1ZyBsb2cgZmlsZTogJHtlLm1lc3NhZ2V9YCxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgICAgIGxvZ2dlci5mYXRhbChlcnIuc3RhY2spO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAxMjc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmZhdGFsKGVycik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnbnVtYmVyJykge1xuICAgICAgLy8gTG9nIG5vdGhpbmcuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZDogJyArIEpTT04uc3RyaW5naWZ5KGVycikpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG4iXX0=