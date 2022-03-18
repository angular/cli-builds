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
const config_1 = require("../../src/utilities/config");
const environment_options_1 = require("../../src/utilities/environment-options");
const log_file_1 = require("../../src/utilities/log-file");
const project_1 = require("../../src/utilities/project");
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
        return await (0, command_runner_1.runCommand)(options.cliArgs, logger, workspace);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsdURBQStFO0FBQy9FLGlGQUFrRTtBQUNsRSwyREFBbUU7QUFDbkUseURBQWdFO0FBRWhFLHVEQUFzRDtBQUE3QyxrR0FBQSxPQUFPLE9BQUE7QUFFaEIsK0JBQStCO0FBQ2hCLEtBQUssb0JBQVcsT0FBaUQ7SUFDOUUsbUdBQW1HO0lBQ25HLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxLQUFLLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLEVBQUU7UUFDOUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2xCLG1CQUFtQixPQUFPLENBQUMsT0FBTyxjQUFjO1lBQzlDLGdEQUFnRDtZQUNoRCxnR0FBZ0csQ0FDbkcsQ0FBQztRQUVGLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFBLDBCQUFtQixFQUFDLDZCQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQzFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFD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LEVBQUU7WUFDL0IsSUFBSTtnQkFDRixNQUFNLE9BQU8sR0FBRyxJQUFBLDhCQUFtQixFQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLENBQUMsS0FBSyxDQUNWLG9DQUFvQyxHQUFHLENBQUMsT0FBTyxJQUFJO29CQUNqRCxRQUFRLE9BQU8sd0JBQXdCLENBQzFDLENBQUM7YUFDSDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysb0NBQW9DLEdBQUcsQ0FBQyxPQUFPLElBQUk7b0JBQ2pELHVDQUF1QyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQ3JELENBQUM7Z0JBQ0YsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN6QjthQUNGO1lBRUQsT0FBTyxHQUFHLENBQUM7U0FDWjthQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO1lBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkI7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxlQUFlO1NBQ2hCO2FBQU07WUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0RTtRQUVELElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNuQix1Q0FBdUM7WUFDdkMsUUFBUSxDQUFDO1lBQ1QsTUFBTSxHQUFHLENBQUM7U0FDWDtRQUVELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7QUFDSCxDQUFDO0FBN0ZELDRCQTZGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGVFcnJvciB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgY29sb3JzLCByZW1vdmVDb2xvciB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUmF3IH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgbmdEZWJ1ZyB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5pbXBvcnQgeyBmaW5kV29ya3NwYWNlRmlsZSB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvcHJvamVjdCc7XG5cbmV4cG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogeyB0ZXN0aW5nPzogYm9vbGVhbjsgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICAvLyBUaGlzIG5vZGUgdmVyc2lvbiBjaGVjayBlbnN1cmVzIHRoYXQgdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgcHJvamVjdCBpbnN0YW5jZSBvZiB0aGUgQ0xJIGFyZSBtZXRcbiAgY29uc3QgW21ham9yLCBtaW5vcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gIGlmIChtYWpvciA8IDE0IHx8IChtYWpvciA9PT0gMTQgJiYgbWlub3IgPCAxNSkpIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBOb2RlLmpzIHZlcnNpb24gJHtwcm9jZXNzLnZlcnNpb259IGRldGVjdGVkLlxcbmAgK1xuICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIHJlcXVpcmVzIGEgbWluaW11bSB2MTQuMTUuXFxuXFxuJyArXG4gICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgTm9kZS5qcyB2ZXJzaW9uIG9yIHZpc2l0IGh0dHBzOi8vbm9kZWpzLm9yZy8gZm9yIGFkZGl0aW9uYWwgaW5zdHJ1Y3Rpb25zLlxcbicsXG4gICAgKTtcblxuICAgIHJldHVybiAzO1xuICB9XG5cbiAgY29uc3QgbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcihuZ0RlYnVnLCBwcm9jZXNzLnN0ZG91dCwgcHJvY2Vzcy5zdGRlcnIsIHtcbiAgICBpbmZvOiAocykgPT4gKGNvbG9ycy5lbmFibGVkID8gcyA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBkZWJ1ZzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgd2FybjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnllbGxvdyhzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBlcnJvcjogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgICBmYXRhbDogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IGNvbG9ycy5ib2xkLnJlZChzKSA6IHJlbW92ZUNvbG9yKHMpKSxcbiAgfSk7XG5cbiAgLy8gUmVkaXJlY3QgY29uc29sZSB0byBsb2dnZXJcbiAgY29uc29sZS5pbmZvID0gY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5pbmZvKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLndhcm4oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmVycm9yKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG5cbiAgbGV0IHdvcmtzcGFjZTtcbiAgY29uc3Qgd29ya3NwYWNlRmlsZSA9IGZpbmRXb3Jrc3BhY2VGaWxlKCk7XG4gIGlmICh3b3Jrc3BhY2VGaWxlID09PSBudWxsKSB7XG4gICAgY29uc3QgWywgbG9jYWxQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgICBpZiAobG9jYWxQYXRoICE9PSBudWxsKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgIGBBbiBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZmlsZSB3YXMgZm91bmQgWycke2xvY2FsUGF0aH0nXS5gICtcbiAgICAgICAgICAnIFBsZWFzZSBkZWxldGUgdGhlIGZpbGUgYmVmb3JlIHJ1bm5pbmcgdGhlIGNvbW1hbmQuJyxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlID0gYXdhaXQgQW5ndWxhcldvcmtzcGFjZS5sb2FkKHdvcmtzcGFjZUZpbGUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgVW5hYmxlIHRvIHJlYWQgd29ya3NwYWNlIGZpbGUgJyR7d29ya3NwYWNlRmlsZX0nOiAke2UubWVzc2FnZX1gKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgd29ya3NwYWNlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIENvbW1hbmRNb2R1bGVFcnJvcikge1xuICAgICAgbG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9IGVsc2UgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2dQYXRoID0gd3JpdGVFcnJvclRvTG9nRmlsZShlcnIpO1xuICAgICAgICBsb2dnZXIuZmF0YWwoXG4gICAgICAgICAgYEFuIHVuaGFuZGxlZCBleGNlcHRpb24gb2NjdXJyZWQ6ICR7ZXJyLm1lc3NhZ2V9XFxuYCArXG4gICAgICAgICAgICBgU2VlIFwiJHtsb2dQYXRofVwiIGZvciBmdXJ0aGVyIGRldGFpbHMuYCxcbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYEZhdGFsIGVycm9yIHdyaXRpbmcgZGVidWcgbG9nIGZpbGU6ICR7ZS5tZXNzYWdlfWAsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gMTI3O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ251bWJlcicpIHtcbiAgICAgIC8vIExvZyBub3RoaW5nLlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZmF0YWwoJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZGVidWdnZXJcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG4iXX0=