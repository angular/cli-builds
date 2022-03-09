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
const log_file_1 = require("../../src/utilities/log-file");
const project_1 = require("../../src/utilities/project");
var version_1 = require("../../src/utilities/version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILG9EQUFnRTtBQUNoRSwrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsdURBQStFO0FBQy9FLDJEQUFtRTtBQUNuRSx5REFBZ0U7QUFFaEUsdURBQXNEO0FBQTdDLGtHQUFBLE9BQU8sT0FBQTtBQUVoQixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sT0FBTyxHQUFHLFFBQVEsS0FBSyxTQUFTLElBQUksUUFBUSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDO0FBRWpHLCtCQUErQjtBQUNoQixLQUFLLG9CQUFXLE9BQWlEO0lBQzlFLG1HQUFtRztJQUNuRyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLElBQUksS0FBSyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QyxnREFBZ0Q7WUFDaEQsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQzFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxjQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsbUJBQVcsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckUsQ0FBQyxDQUFDO0lBRUgsNkJBQTZCO0lBQzdCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsSUFBSTtRQUM1QyxNQUFNLENB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ZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGVFcnJvciB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgY29sb3JzLCByZW1vdmVDb2xvciB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUmF3IH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgd3JpdGVFcnJvclRvTG9nRmlsZSB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvbG9nLWZpbGUnO1xuaW1wb3J0IHsgZmluZFdvcmtzcGFjZUZpbGUgfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL3Byb2plY3QnO1xuXG5leHBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuY29uc3QgZGVidWdFbnYgPSBwcm9jZXNzLmVudlsnTkdfREVCVUcnXTtcbmNvbnN0IGlzRGVidWcgPSBkZWJ1Z0VudiAhPT0gdW5kZWZpbmVkICYmIGRlYnVnRW52ICE9PSAnMCcgJiYgZGVidWdFbnYudG9Mb3dlckNhc2UoKSAhPT0gJ2ZhbHNlJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IHsgdGVzdGluZz86IGJvb2xlYW47IGNsaUFyZ3M6IHN0cmluZ1tdIH0pIHtcbiAgLy8gVGhpcyBub2RlIHZlcnNpb24gY2hlY2sgZW5zdXJlcyB0aGF0IHRoZSByZXF1aXJlbWVudHMgb2YgdGhlIHByb2plY3QgaW5zdGFuY2Ugb2YgdGhlIENMSSBhcmUgbWV0XG4gIGNvbnN0IFttYWpvciwgbWlub3JdID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KCcuJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydCkpO1xuICBpZiAobWFqb3IgPCAxNCB8fCAobWFqb3IgPT09IDE0ICYmIG1pbm9yIDwgMTUpKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgTm9kZS5qcyB2ZXJzaW9uICR7cHJvY2Vzcy52ZXJzaW9ufSBkZXRlY3RlZC5cXG5gICtcbiAgICAgICAgJ1RoZSBBbmd1bGFyIENMSSByZXF1aXJlcyBhIG1pbmltdW0gdjE0LjE1LlxcblxcbicgK1xuICAgICAgICAnUGxlYXNlIHVwZGF0ZSB5b3VyIE5vZGUuanMgdmVyc2lvbiBvciB2aXNpdCBodHRwczovL25vZGVqcy5vcmcvIGZvciBhZGRpdGlvbmFsIGluc3RydWN0aW9ucy5cXG4nLFxuICAgICk7XG5cbiAgICByZXR1cm4gMztcbiAgfVxuXG4gIGNvbnN0IGxvZ2dlciA9IGNyZWF0ZUNvbnNvbGVMb2dnZXIoaXNEZWJ1ZywgcHJvY2Vzcy5zdGRvdXQsIHByb2Nlc3Muc3RkZXJyLCB7XG4gICAgaW5mbzogKHMpID0+IChjb2xvcnMuZW5hYmxlZCA/IHMgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZGVidWc6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBzIDogcmVtb3ZlQ29sb3IocykpLFxuICAgIHdhcm46IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC55ZWxsb3cocykgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZXJyb3I6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC5yZWQocykgOiByZW1vdmVDb2xvcihzKSksXG4gICAgZmF0YWw6IChzKSA9PiAoY29sb3JzLmVuYWJsZWQgPyBjb2xvcnMuYm9sZC5yZWQocykgOiByZW1vdmVDb2xvcihzKSksXG4gIH0pO1xuXG4gIC8vIFJlZGlyZWN0IGNvbnNvbGUgdG8gbG9nZ2VyXG4gIGNvbnNvbGUuaW5mbyA9IGNvbnNvbGUubG9nID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICBsb2dnZXIuaW5mbyhmb3JtYXQoLi4uYXJncykpO1xuICB9O1xuICBjb25zb2xlLndhcm4gPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci53YXJuKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUuZXJyb3IgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5lcnJvcihmb3JtYXQoLi4uYXJncykpO1xuICB9O1xuXG4gIGxldCB3b3Jrc3BhY2U7XG4gIGNvbnN0IHdvcmtzcGFjZUZpbGUgPSBmaW5kV29ya3NwYWNlRmlsZSgpO1xuICBpZiAod29ya3NwYWNlRmlsZSA9PT0gbnVsbCkge1xuICAgIGNvbnN0IFssIGxvY2FsUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gICAgaWYgKGxvY2FsUGF0aCAhPT0gbnVsbCkge1xuICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICBgQW4gaW52YWxpZCBjb25maWd1cmF0aW9uIGZpbGUgd2FzIGZvdW5kIFsnJHtsb2NhbFBhdGh9J10uYCArXG4gICAgICAgICAgJyBQbGVhc2UgZGVsZXRlIHRoZSBmaWxlIGJlZm9yZSBydW5uaW5nIHRoZSBjb21tYW5kLicsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdHJ5IHtcbiAgICAgIHdvcmtzcGFjZSA9IGF3YWl0IEFuZ3VsYXJXb3Jrc3BhY2UubG9hZCh3b3Jrc3BhY2VGaWxlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoYFVuYWJsZSB0byByZWFkIHdvcmtzcGFjZSBmaWxlICcke3dvcmtzcGFjZUZpbGV9JzogJHtlLm1lc3NhZ2V9YCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IHJ1bkNvbW1hbmQob3B0aW9ucy5jbGlBcmdzLCBsb2dnZXIsIHdvcmtzcGFjZSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb21tYW5kTW9kdWxlRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSBlbHNlIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLmAsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBGYXRhbCBlcnJvciB3cml0aW5nIGRlYnVnIGxvZyBmaWxlOiAke2UubWVzc2FnZX1gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDEyNztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudGVzdGluZykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWRlYnVnZ2VyXG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuIl19