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
    const version = process.versions.node.split('.').map((part) => Number(part));
    if (version[0] < 12 || (version[0] === 12 && version[1] < 20)) {
        process.stderr.write(`Node.js version ${process.version} detected.\n` +
            'The Angular CLI requires a minimum v12.20.\n\n' +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsZ0VBQXlEO0FBQ3pELGlEQUE0RDtBQUM1RCxtREFBMkU7QUFDM0UsdURBQStEO0FBQy9ELHFEQUE0RDtBQUU1RCxnREFBd0Q7QUFBL0Msa0dBQUEsT0FBTyxPQUFBO0FBQUUsa0dBQUEsT0FBTyxPQUFBO0FBRXpCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDekMsTUFBTSxPQUFPLEdBQUcsUUFBUSxLQUFLLFNBQVMsSUFBSSxRQUFRLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUM7QUFFakcsK0JBQStCO0FBQ2hCLEtBQUssb0JBQVcsT0FBaUQ7SUFDOUUsbUdBQW1HO0lBQ25HLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQzdELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QyxnREFBZ0Q7WUFDaEQsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztL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QyxRQUFRLENBQUM7WUFDVCxNQUFNLEdBQUcsQ0FBQztTQUNYO1FBRUQsT0FBTyxDQUFDLENBQUM7S0FDVjtBQUNILENBQUM7QUFsR0QsNEJBa0dDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL21vZGVscy9jb21tYW5kLXJ1bm5lcic7XG5pbXBvcnQgeyBjb2xvcnMsIHJlbW92ZUNvbG9yIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQgeyBmaW5kV29ya3NwYWNlRmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9qZWN0JztcblxuZXhwb3J0IHsgVkVSU0lPTiwgVmVyc2lvbiB9IGZyb20gJy4uLy4uL21vZGVscy92ZXJzaW9uJztcblxuY29uc3QgZGVidWdFbnYgPSBwcm9jZXNzLmVudlsnTkdfREVCVUcnXTtcbmNvbnN0IGlzRGVidWcgPSBkZWJ1Z0VudiAhPT0gdW5kZWZpbmVkICYmIGRlYnVnRW52ICE9PSAnMCcgJiYgZGVidWdFbnYudG9Mb3dlckNhc2UoKSAhPT0gJ2ZhbHNlJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IHsgdGVzdGluZz86IGJvb2xlYW47IGNsaUFyZ3M6IHN0cmluZ1tdIH0pIHtcbiAgLy8gVGhpcyBub2RlIHZlcnNpb24gY2hlY2sgZW5zdXJlcyB0aGF0IHRoZSByZXF1aXJlbWVudHMgb2YgdGhlIHByb2plY3QgaW5zdGFuY2Ugb2YgdGhlIENMSSBhcmUgbWV0XG4gIGNvbnN0IHZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gIGlmICh2ZXJzaW9uWzBdIDwgMTIgfHwgKHZlcnNpb25bMF0gPT09IDEyICYmIHZlcnNpb25bMV0gPCAyMCkpIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBOb2RlLmpzIHZlcnNpb24gJHtwcm9jZXNzLnZlcnNpb259IGRldGVjdGVkLlxcbmAgK1xuICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIHJlcXVpcmVzIGEgbWluaW11bSB2MTIuMjAuXFxuXFxuJyArXG4gICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgTm9kZS5qcyB2ZXJzaW9uIG9yIHZpc2l0IGh0dHBzOi8vbm9kZWpzLm9yZy8gZm9yIGFkZGl0aW9uYWwgaW5zdHJ1Y3Rpb25zLlxcbicsXG4gICAgKTtcblxuICAgIHJldHVybiAzO1xuICB9XG5cbiAgY29uc3QgbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcihpc0RlYnVnLCBwcm9jZXNzLnN0ZG91dCwgcHJvY2Vzcy5zdGRlcnIsIHtcbiAgICBpbmZvOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gcyA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBkZWJ1ZzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgd2FybjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnllbGxvdyhzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBlcnJvcjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBmYXRhbDogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgfSk7XG5cbiAgLy8gUmVkaXJlY3QgY29uc29sZSB0byBsb2dnZXJcbiAgY29uc29sZS5pbmZvID0gY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5pbmZvKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLndhcm4oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmVycm9yKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG5cbiAgbGV0IHdvcmtzcGFjZTtcbiAgY29uc3Qgd29ya3NwYWNlRmlsZSA9IGZpbmRXb3Jrc3BhY2VGaWxlKCk7XG4gIGlmICh3b3Jrc3BhY2VGaWxlID09PSBudWxsKSB7XG4gICAgY29uc3QgWywgbG9jYWxQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgICBpZiAobG9jYWxQYXRoICE9PSBudWxsKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgIGBBbiBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZmlsZSB3YXMgZm91bmQgWycke2xvY2FsUGF0aH0nXS5gICtcbiAgICAgICAgICAnIFBsZWFzZSBkZWxldGUgdGhlIGZpbGUgYmVmb3JlIHJ1bm5pbmcgdGhlIGNvbW1hbmQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlID0gYXdhaXQgQW5ndWxhcldvcmtzcGFjZS5sb2FkKHdvcmtzcGFjZUZpbGUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgVW5hYmxlIHRvIHJlYWQgd29ya3NwYWNlIGZpbGUgJyR7d29ya3NwYWNlRmlsZX0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBtYXliZUV4aXRDb2RlID0gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgd29ya3NwYWNlKTtcbiAgICBpZiAodHlwZW9mIG1heWJlRXhpdENvZGUgPT09ICdudW1iZXInKSB7XG4gICAgICBjb25zb2xlLmFzc2VydChOdW1iZXIuaXNJbnRlZ2VyKG1heWJlRXhpdENvZGUpKTtcblxuICAgICAgcmV0dXJuIG1heWJlRXhpdENvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLmAsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBGYXRhbCBlcnJvciB3cml0aW5nIGRlYnVnIGxvZyBmaWxlOiAke2UubWVzc2FnZX1gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDEyNztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudGVzdGluZykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWRlYnVnZ2VyXG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19