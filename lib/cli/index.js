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
const core_1 = require("@angular-devkit/core");
const util_1 = require("util");
const command_module_1 = require("../../src/command-builder/command-module");
const command_runner_1 = require("../../src/command-builder/command-runner");
const color_1 = require("../../src/utilities/color");
const environment_options_1 = require("../../src/utilities/environment-options");
const log_file_1 = require("../../src/utilities/log-file");
var version_1 = require("../../src/utilities/version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
const MIN_NODEJS_VERISON = [14, 15];
/* eslint-disable no-console */
async function default_1(options) {
    // This node version check ensures that the requirements of the project instance of the CLI are met
    const [major, minor] = process.versions.node.split('.').map((part) => Number(part));
    if (major < MIN_NODEJS_VERISON[0] ||
        (major === MIN_NODEJS_VERISON[0] && minor < MIN_NODEJS_VERISON[1])) {
        process.stderr.write(`Node.js version ${process.version} detected.\n` +
            `The Angular CLI requires a minimum of v${MIN_NODEJS_VERISON[0]}.${MIN_NODEJS_VERISON[1]}.\n\n` +
            'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n');
        return 3;
    }
    const colorLevels = {
        info: (s) => s,
        debug: (s) => s,
        warn: (s) => color_1.colors.bold.yellow(s),
        error: (s) => color_1.colors.bold.red(s),
        fatal: (s) => color_1.colors.bold.red(s),
    };
    const logger = new core_1.logging.IndentLogger('cli-main-logger');
    const logInfo = console.log;
    const logError = console.error;
    const loggerFinished = logger.forEach((entry) => {
        if (!environment_options_1.ngDebug && entry.level === 'debug') {
            return;
        }
        const color = color_1.colors.enabled ? colorLevels[entry.level] : color_1.removeColor;
        const message = color(entry.message);
        switch (entry.level) {
            case 'warn':
            case 'fatal':
            case 'error':
                logError(message);
                break;
            default:
                logInfo(message);
                break;
        }
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
    finally {
        logger.complete();
        await loggerFinished;
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9saWIvY2xpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUErQztBQUMvQywrQkFBOEI7QUFDOUIsNkVBQThFO0FBQzlFLDZFQUFzRTtBQUN0RSxxREFBZ0U7QUFDaEUsaUZBQWtFO0FBQ2xFLDJEQUFtRTtBQUVuRSx1REFBc0Q7QUFBN0Msa0dBQUEsT0FBTyxPQUFBO0FBRWhCLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFVLENBQUM7QUFFN0MsK0JBQStCO0FBQ2hCLEtBQUssb0JBQVcsT0FBOEI7SUFDM0QsbUdBQW1HO0lBQ25HLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFDRSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzdCLENBQUMsS0FBSyxLQUFLLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsRTtRQUNBLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsT0FBTyxDQUFDLE9BQU8sY0FBYztZQUM5QywwQ0FBMEMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQWtCLENBQUMsQ0FBQyxDQUFDLE9BQU87WUFDL0YsZ0dBQWdHLENBQ25HLENBQUM7UUFFRixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsTUFBTSxXQUFXLEdBQWdEO1FBQy9ELElBQUksRUFB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SyxDQUNWLG9DQUFvQyxHQUFHLENBQUMsT0FBTyxJQUFJO29CQUNqRCx1Q0FBdUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUNyRCxDQUFDO2dCQUNGLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDYixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDekI7YUFDRjtZQUVELE9BQU8sR0FBRyxDQUFDO1NBQ1o7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDbEMsZUFBZTtTQUNoQjthQUFNO1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FDVixpQ0FBaUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQzVGLENBQUM7U0FDSDtRQUVELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7WUFBUztRQUNSLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQixNQUFNLGNBQWMsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFoR0QsNEJBZ0dDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGVFcnJvciB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL3NyYy9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgY29sb3JzLCByZW1vdmVDb2xvciB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgbmdEZWJ1ZyB9IGZyb20gJy4uLy4uL3NyYy91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyB3cml0ZUVycm9yVG9Mb2dGaWxlIH0gZnJvbSAnLi4vLi4vc3JjL3V0aWxpdGllcy9sb2ctZmlsZSc7XG5cbmV4cG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5jb25zdCBNSU5fTk9ERUpTX1ZFUklTT04gPSBbMTQsIDE1XSBhcyBjb25zdDtcblxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IHsgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICAvLyBUaGlzIG5vZGUgdmVyc2lvbiBjaGVjayBlbnN1cmVzIHRoYXQgdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgcHJvamVjdCBpbnN0YW5jZSBvZiB0aGUgQ0xJIGFyZSBtZXRcbiAgY29uc3QgW21ham9yLCBtaW5vcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gIGlmIChcbiAgICBtYWpvciA8IE1JTl9OT0RFSlNfVkVSSVNPTlswXSB8fFxuICAgIChtYWpvciA9PT0gTUlOX05PREVKU19WRVJJU09OWzBdICYmIG1pbm9yIDwgTUlOX05PREVKU19WRVJJU09OWzFdKVxuICApIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBOb2RlLmpzIHZlcnNpb24gJHtwcm9jZXNzLnZlcnNpb259IGRldGVjdGVkLlxcbmAgK1xuICAgICAgICBgVGhlIEFuZ3VsYXIgQ0xJIHJlcXVpcmVzIGEgbWluaW11bSBvZiB2JHtNSU5fTk9ERUpTX1ZFUklTT05bMF19LiR7TUlOX05PREVKU19WRVJJU09OWzFdfS5cXG5cXG5gICtcbiAgICAgICAgJ1BsZWFzZSB1cGRhdGUgeW91ciBOb2RlLmpzIHZlcnNpb24gb3IgdmlzaXQgaHR0cHM6Ly9ub2RlanMub3JnLyBmb3IgYWRkaXRpb25hbCBpbnN0cnVjdGlvbnMuXFxuJyxcbiAgICApO1xuXG4gICAgcmV0dXJuIDM7XG4gIH1cblxuICBjb25zdCBjb2xvckxldmVsczogUmVjb3JkPHN0cmluZywgKG1lc3NhZ2U6IHN0cmluZykgPT4gc3RyaW5nPiA9IHtcbiAgICBpbmZvOiAocykgPT4gcyxcbiAgICBkZWJ1ZzogKHMpID0+IHMsXG4gICAgd2FybjogKHMpID0+IGNvbG9ycy5ib2xkLnllbGxvdyhzKSxcbiAgICBlcnJvcjogKHMpID0+IGNvbG9ycy5ib2xkLnJlZChzKSxcbiAgICBmYXRhbDogKHMpID0+IGNvbG9ycy5ib2xkLnJlZChzKSxcbiAgfTtcbiAgY29uc3QgbG9nZ2VyID0gbmV3IGxvZ2dpbmcuSW5kZW50TG9nZ2VyKCdjbGktbWFpbi1sb2dnZXInKTtcbiAgY29uc3QgbG9nSW5mbyA9IGNvbnNvbGUubG9nO1xuICBjb25zdCBsb2dFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG5cbiAgY29uc3QgbG9nZ2VyRmluaXNoZWQgPSBsb2dnZXIuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICBpZiAoIW5nRGVidWcgJiYgZW50cnkubGV2ZWwgPT09ICdkZWJ1ZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb2xvciA9IGNvbG9ycy5lbmFibGVkID8gY29sb3JMZXZlbHNbZW50cnkubGV2ZWxdIDogcmVtb3ZlQ29sb3I7XG4gICAgY29uc3QgbWVzc2FnZSA9IGNvbG9yKGVudHJ5Lm1lc3NhZ2UpO1xuXG4gICAgc3dpdGNoIChlbnRyeS5sZXZlbCkge1xuICAgICAgY2FzZSAnd2Fybic6XG4gICAgICBjYXNlICdmYXRhbCc6XG4gICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgIGxvZ0Vycm9yKG1lc3NhZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxvZ0luZm8obWVzc2FnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUmVkaXJlY3QgY29uc29sZSB0byBsb2dnZXJcbiAgY29uc29sZS5pbmZvID0gY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGxvZ2dlci5pbmZvKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG4gIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLndhcm4oZm9ybWF0KC4uLmFyZ3MpKTtcbiAgfTtcbiAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgbG9nZ2VyLmVycm9yKGZvcm1hdCguLi5hcmdzKSk7XG4gIH07XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlcik7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBDb21tYW5kTW9kdWxlRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSBlbHNlIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9nUGF0aCA9IHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyKTtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICAgIGBBbiB1bmhhbmRsZWQgZXhjZXB0aW9uIG9jY3VycmVkOiAke2Vyci5tZXNzYWdlfVxcbmAgK1xuICAgICAgICAgICAgYFNlZSBcIiR7bG9nUGF0aH1cIiBmb3IgZnVydGhlciBkZXRhaWxzLmAsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChcbiAgICAgICAgICBgQW4gdW5oYW5kbGVkIGV4Y2VwdGlvbiBvY2N1cnJlZDogJHtlcnIubWVzc2FnZX1cXG5gICtcbiAgICAgICAgICAgIGBGYXRhbCBlcnJvciB3cml0aW5nIGRlYnVnIGxvZyBmaWxlOiAke2UubWVzc2FnZX1gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDEyNztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKFxuICAgICAgICBgQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZDogJHsndG9TdHJpbmcnIGluIGVyciA/IGVyci50b1N0cmluZygpIDogSlNPTi5zdHJpbmdpZnkoZXJyKX1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfSBmaW5hbGx5IHtcbiAgICBsb2dnZXIuY29tcGxldGUoKTtcbiAgICBhd2FpdCBsb2dnZXJGaW5pc2hlZDtcbiAgfVxufVxuIl19