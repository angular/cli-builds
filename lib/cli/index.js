"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = exports.VERSION = void 0;
const node_1 = require("@angular-devkit/core/node");
const util_1 = require("util");
const command_runner_1 = require("../../models/command-runner");
const color_1 = require("../../utilities/color");
const config_1 = require("../../utilities/config");
const log_file_1 = require("../../utilities/log-file");
const project_1 = require("../../utilities/project");
var version_1 = require("../../models/version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
Object.defineProperty(exports, "Version", { enumerable: true, get: function () { return version_1.Version; } });
const debugEnv = process.env['NG_DEBUG'];
const isDebug = debugEnv !== undefined && debugEnv !== '0' && debugEnv.toLowerCase() !== 'false';
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
    const logger = (0, node_1.createConsoleLogger)(isDebug, process.stdout, process.stderr, {
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
    let workspace;
    const workspaceFile = (0, project_1.findWorkspaceFile)();
    if (workspaceFile === null) {
        const [, localPath] = (0, config_1.getWorkspaceRaw)('local');
        if (localPath !== null) {
            logger.fatal(`An invalid configuration file was found ['${localPath}'].` +
                ' Please delete the file before running the command.');
            return 1;
        }
    }
    else {
        try {
            workspace = await config_1.AngularWorkspace.load(workspaceFile);
        }
        catch (e) {
            logger.fatal(`Unable to read workspace file '${workspaceFile}': ${e.message}`);
            return 1;
        }
    }
    try {
        const maybeExitCode = await (0, command_runner_1.runCommand)(options.cliArgs, logger, workspace);
        if (typeof maybeExitCode === 'number') {
            console.assert(Number.isInteger(maybeExitCode));
            return maybeExitCode;
        }
        return 0;
    }
    catch (err) {
        if (err instanceof Error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsZ0VBQXlEO0FBQ3pELGlEQUE0RDtBQUM1RCxtREFBMkU7QUFDM0UsdURBQStEO0FBQy9ELHFEQUE0RDtBQUU1RCxnREFBd0Q7QUFBL0Msa0dBQUEsT0FBTyxPQUFBO0FBQUUsa0dBQUEsT0FBTyxPQUFBO0FBRXpCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDekMsTUFBTSxPQUFPLEdBQUcsUUFBUSxLQUFLLFNBQVMsSUFBSSxRQUFRLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUM7QUFFakcsK0JBQStCO0FBQ2hCLEtBQUssb0JBQVcsT0FBaUQ7SUFDOUUsbUdBQW1HO0lBQ25HLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxLQUFLLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLEVBQUU7UUFDOUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2xCLG1CQUFtQixPQUFPLENBQUMsT0FBTyxjQUFjO1lBQzlDLGdEQUFnRDtZQUNoRCxnR0FBZ0csQ0FDbkcsQ0FBQztRQUVGLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFRCxNQUFNLE1BQU0sR0FBRyxJ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RyxDQUFDO1NBQ1g7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0FBQ0gsQ0FBQztBQWxHRCw0QkFrR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlQ29uc29sZUxvZ2dlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2NvbW1hbmQtcnVubmVyJztcbmltcG9ydCB7IGNvbG9ycywgcmVtb3ZlQ29sb3IgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUmF3IH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2xvZy1maWxlJztcbmltcG9ydCB7IGZpbmRXb3Jrc3BhY2VGaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb2plY3QnO1xuXG5leHBvcnQgeyBWRVJTSU9OLCBWZXJzaW9uIH0gZnJvbSAnLi4vLi4vbW9kZWxzL3ZlcnNpb24nO1xuXG5jb25zdCBkZWJ1Z0VudiA9IHByb2Nlc3MuZW52WydOR19ERUJVRyddO1xuY29uc3QgaXNEZWJ1ZyA9IGRlYnVnRW52ICE9PSB1bmRlZmluZWQgJiYgZGVidWdFbnYgIT09ICcwJyAmJiBkZWJ1Z0Vudi50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogeyB0ZXN0aW5nPzogYm9vbGVhbjsgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICAvLyBUaGlzIG5vZGUgdmVyc2lvbiBjaGVjayBlbnN1cmVzIHRoYXQgdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgcHJvamVjdCBpbnN0YW5jZSBvZiB0aGUgQ0xJIGFyZSBtZXRcbiAgY29uc3QgW21ham9yLCBtaW5vcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gIGlmIChtYWpvciA8IDE0IHx8IChtYWpvciA9PT0gMTQgJiYgbWlub3IgPCAxNSkpIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBOb2RlLmpzIHZlcnNpb24gJHtwcm9jZXNzLnZlcnNpb259IGRldGVjdGVkLlxcbmAgK1xuICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIHJlcXVpcmVzIGEgbWluaW11bSB2MTQuMTUuXFxuXFxuJyArXG4gICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgTm9kZS5qcyB2ZXJzaW9uIG9yIHZpc2l0IGh0dHBzOi8vbm9kZWpzLm9yZy8gZm9yIGFkZGl0aW9uYWwgaW5zdHJ1Y3Rpb25zLlxcbicsXG4gICAgKTtcblxuICAgIHJldHVybiAzO1xuICB9XG5cbiAgY29uc3QgbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcihpc0RlYnVnLCBwcm9jZXNzLnN0ZG91dCwgcHJvY2Vzcy5zdGRlcnIsIHtcbiAgICBpbmZvOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gcyA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBkZWJ1ZzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgd2FybjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnllbGxvdyhzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBlcnJvcjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBmYXRhbDogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgfSk7XG5cbiAgLy8gUmVkaXJlY3QgY29uc29sZSB0byBsb2dnZXJcbiAgY29uc29sZS5pbmZvID0gY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5pbmZvKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLndhcm4oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmVycm9yKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG5cbiAgbGV0IHdvcmtzcGFjZTtcbiAgY29uc3Qgd29ya3NwYWNlRmlsZSA9IGZpbmRXb3Jrc3BhY2VGaWxlKCk7XG4gIGlmICh3b3Jrc3BhY2VGaWxlID09PSBudWxsKSB7XG4gICAgY29uc3QgWywgbG9jYWxQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgICBpZiAobG9jYWxQYXRoICE9PSBudWxsKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgIGBBbiBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZmlsZSB3YXMgZm91bmQgWycke2xvY2FsUGF0aH0nXS5gICtcbiAgICAgICAgICAnIFBsZWFzZSBkZWxldGUgdGhlIGZpbGUgYmVmb3JlIHJ1bm5pbmcgdGhlIGNvbW1hbmQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlID0gYXdhaXQgQW5ndWxhcldvcmtzcGFjZS5sb2FkKHdvcmtzcGFjZUZpbGUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgVW5hYmxlIHRvIHJlYWQgd29ya3NwYWNlIGZpbGUgJyR7d29ya3NwYWNlRmlsZX0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBtYXliZUV4aXRDb2RlID0gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgd29ya3NwYWNlKTtcbiAgICBpZiAodHlwZW9mIG1heWJlRXhpdENvZGUgPT09ICdudW1iZXInKSB7XG4gICAgICBjb25zb2xlLmFzc2VydChOdW1iZXIuaXNJbnRlZ2VyKG1heWJlRXhpdENvZGUpKTtcblxuICAgICAgcmV0dXJuIG1heWJlRXhpdENvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLmAsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBGYXRhbCBlcnJvciB3cml0aW5nIGRlYnVnIGxvZyBmaWxlOiAke2UubWVzc2FnZX1gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDEyNztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudGVzdGluZykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWRlYnVnZ2VyXG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19