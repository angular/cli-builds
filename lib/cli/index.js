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
            logger.fatal(`An unexpected error occurred: ${'toString' in err ? err.toString() : JSON.stringify(err)}`);
        }
        return 1;
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsaUZBQWtFO0FBQ2xFLDJEQUFtRTtBQUVuRSx1REFBc0Q7QUFBN0Msa0dBQUEsT0FBTyxPQUFBO0FBRWhCLCtCQUErQjtBQUNoQixLQUFLLG9CQUFXLE9BQThCO0lBQzNELG1HQUFtRztJQUNuRyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLElBQUksS0FBSyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QyxnREFBZ0Q7WUFDaEQsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyw2QkFBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRTtRQUMxRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFX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QWU7U0FDaEI7YUFBTTtZQUNMLE1BQU0sQ0FBQyxLQUFLLENBQ1YsaUNBQWlDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUM1RixDQUFDO1NBQ0g7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0FBQ0gsQ0FBQztBQW5FRCw0QkFtRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlQ29uc29sZUxvZ2dlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlRXJyb3IgfSBmcm9tICcuLi8uLi9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IHJ1bkNvbW1hbmQgfSBmcm9tICcuLi8uLi9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyJztcbmltcG9ydCB7IGNvbG9ycywgcmVtb3ZlQ29sb3IgfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IG5nRGVidWcgfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvbG9nLWZpbGUnO1xuXG5leHBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IHsgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICAvLyBUaGlzIG5vZGUgdmVyc2lvbiBjaGVjayBlbnN1cmVzIHRoYXQgdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgcHJvamVjdCBpbnN0YW5jZSBvZiB0aGUgQ0xJIGFyZSBtZXRcbiAgY29uc3QgW21ham9yLCBtaW5vcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gIGlmIChtYWpvciA8IDE0IHx8IChtYWpvciA9PT0gMTQgJiYgbWlub3IgPCAxNSkpIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBOb2RlLmpzIHZlcnNpb24gJHtwcm9jZXNzLnZlcnNpb259IGRldGVjdGVkLlxcbmAgK1xuICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIHJlcXVpcmVzIGEgbWluaW11bSB2MTQuMTUuXFxuXFxuJyArXG4gICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgTm9kZS5qcyB2ZXJzaW9uIG9yIHZpc2l0IGh0dHBzOi8vbm9kZWpzLm9yZy8gZm9yIGFkZGl0aW9uYWwgaW5zdHJ1Y3Rpb25zLlxcbicsXG4gICAgKTtcblxuICAgIHJldHVybiAzO1xuICB9XG5cbiAgY29uc3QgbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcihuZ0RlYnVnLCBwcm9jZXNzLnN0ZG91dCwgcHJvY2Vzcy5zdGRlcnIsIHtcbiAgICBpbmZvOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gcyA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBkZWJ1ZzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgd2FybjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnllbGxvdyhzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBlcnJvcjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBmYXRhbDogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgfSk7XG5cbiAgLy8gUmVkaXJlY3QgY29uc29sZSB0byBsb2dnZXJcbiAgY29uc29sZS5pbmZvID0gY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5pbmZvKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLndhcm4oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmVycm9yKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb21tYW5kTW9kdWxlRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSBlbHNlIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLmAsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBGYXRhbCBlcnJvciB3cml0aW5nIGRlYnVnIGxvZyBmaWxlOiAke2UubWVzc2FnZX1gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDEyNztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZDogJHsndG9TdHJpbmcnIGluIGVyciA/IGVyci50b1N0cmluZygpIDogSlNPTi5zdHJpbmdpZnkoZXJyKX1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19