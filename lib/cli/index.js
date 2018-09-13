"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const command_runner_1 = require("../../models/command-runner");
const config_1 = require("../../utilities/config");
const project_1 = require("../../utilities/project");
async function default_1(options) {
    const logger = new core_1.logging.IndentLogger('cling');
    let loggingSubscription;
    if (!options.testing) {
        loggingSubscription = initializeLogging(logger);
    }
    let projectDetails = project_1.getWorkspaceDetails();
    if (projectDetails === null) {
        const [, localPath] = config_1.getWorkspaceRaw('local');
        if (localPath !== null) {
            logger.fatal(`An invalid configuration file was found ['${localPath}'].`
                + ' Please delete the file before running the command.');
            return 1;
        }
        projectDetails = { root: process.cwd() };
    }
    try {
        const maybeExitCode = await command_runner_1.runCommand(options.cliArgs, logger, projectDetails);
        if (typeof maybeExitCode === 'number') {
            console.assert(Number.isInteger(maybeExitCode));
            return maybeExitCode;
        }
        return 0;
    }
    catch (err) {
        if (err instanceof Error) {
            logger.fatal(err.message);
            if (err.stack) {
                logger.fatal(err.stack);
            }
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
            debugger;
            throw err;
        }
        if (loggingSubscription) {
            loggingSubscription.unsubscribe();
        }
        return 1;
    }
}
exports.default = default_1;
// Initialize logging.
function initializeLogging(logger) {
    return logger
        .pipe(operators_1.filter(entry => (entry.level != 'debug')))
        .subscribe(entry => {
        let color = (x) => core_1.terminal.dim(core_1.terminal.white(x));
        let output = process.stdout;
        switch (entry.level) {
            case 'info':
                color = core_1.terminal.white;
                break;
            case 'warn':
                color = core_1.terminal.yellow;
                break;
            case 'error':
                color = core_1.terminal.red;
                output = process.stderr;
                break;
            case 'fatal':
                color = (x) => core_1.terminal.bold(core_1.terminal.red(x));
                output = process.stderr;
                break;
        }
        output.write(color(entry.message) + '\n');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBeUQ7QUFDekQsOENBQXdDO0FBQ3hDLGdFQUF5RDtBQUN6RCxtREFBeUQ7QUFDekQscURBQThEO0FBRy9DLEtBQUssb0JBQVUsT0FBaUQ7SUFDN0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELElBQUksbUJBQW1CLENBQUM7SUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDcEIsbUJBQW1CLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDakQ7SUFFRCxJQUFJLGNBQWMsR0FBRyw2QkFBbUIsRUFBRSxDQUFDO0lBQzNDLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtRQUMzQixNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsR0FBRyx3QkFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxTQUFTLEtBQUs7a0JBQzNELHFEQUFxRCxDQUFDLENBQUM7WUFFcEUsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELGNBQWMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztLQUMxQztJQUVELElBQUk7UUFDRixNQUFNLGFBQWEsR0FBRyxNQUFNLDJCQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEYsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUU7WUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFFaEQsT0FBTyxhQUFhLENBQUM7U0FDdEI7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDbEMsZUFBZTtTQUNoQjthQUFNO1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEU7UUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDbkIsUUFBUSxDQUFDO1lBQ1QsTUFBTSxHQUFHLENBQUM7U0FDWDtRQUVELElBQUksbUJBQW1CLEVBQUU7WUFDdkIsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDbkM7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0FBQ0gsQ0FBQztBQXRERCw0QkFzREM7QUFFRCxzQkFBc0I7QUFDdEIsU0FBUyxpQkFBaUIsQ0FBQyxNQUFzQjtJQUMvQyxPQUFPLE1BQU07U0FDVixJQUFJLENBQUMsa0JBQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQy9DLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNqQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixRQUFRLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDbkIsS0FBSyxNQUFNO2dCQUNULEtBQUssR0FBRyxlQUFRLENBQUMsS0FBSyxDQUFDO2dCQUN2QixNQUFNO1lBQ1IsS0FBSyxNQUFNO2dCQUNULEtBQUssR0FBRyxlQUFRLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNO1lBQ1IsS0FBSyxPQUFPO2dCQUNWLEtBQUssR0FBRyxlQUFRLENBQUMsR0FBRyxDQUFDO2dCQUNyQixNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDeEIsTUFBTTtZQUNSLEtBQUssT0FBTztnQkFDVixLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGVBQVEsQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDeEIsTUFBTTtTQUNUO1FBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBmaWx0ZXIgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2NvbW1hbmQtcnVubmVyJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlRGV0YWlscyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9qZWN0JztcblxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiB7IHRlc3Rpbmc/OiBib29sZWFuLCBjbGlBcmdzOiBzdHJpbmdbXSB9KSB7XG4gIGNvbnN0IGxvZ2dlciA9IG5ldyBsb2dnaW5nLkluZGVudExvZ2dlcignY2xpbmcnKTtcbiAgbGV0IGxvZ2dpbmdTdWJzY3JpcHRpb247XG4gIGlmICghb3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgbG9nZ2luZ1N1YnNjcmlwdGlvbiA9IGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcik7XG4gIH1cblxuICBsZXQgcHJvamVjdERldGFpbHMgPSBnZXRXb3Jrc3BhY2VEZXRhaWxzKCk7XG4gIGlmIChwcm9qZWN0RGV0YWlscyA9PT0gbnVsbCkge1xuICAgIGNvbnN0IFssIGxvY2FsUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcoJ2xvY2FsJyk7XG4gICAgaWYgKGxvY2FsUGF0aCAhPT0gbnVsbCkge1xuICAgICAgbG9nZ2VyLmZhdGFsKGBBbiBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gZmlsZSB3YXMgZm91bmQgWycke2xvY2FsUGF0aH0nXS5gXG4gICAgICAgICAgICAgICAgICsgJyBQbGVhc2UgZGVsZXRlIHRoZSBmaWxlIGJlZm9yZSBydW5uaW5nIHRoZSBjb21tYW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBwcm9qZWN0RGV0YWlscyA9IHsgcm9vdDogcHJvY2Vzcy5jd2QoKSB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBtYXliZUV4aXRDb2RlID0gYXdhaXQgcnVuQ29tbWFuZChvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgcHJvamVjdERldGFpbHMpO1xuICAgIGlmICh0eXBlb2YgbWF5YmVFeGl0Q29kZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KE51bWJlci5pc0ludGVnZXIobWF5YmVFeGl0Q29kZSkpO1xuXG4gICAgICByZXR1cm4gbWF5YmVFeGl0Q29kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudGVzdGluZykge1xuICAgICAgZGVidWdnZXI7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgaWYgKGxvZ2dpbmdTdWJzY3JpcHRpb24pIHtcbiAgICAgIGxvZ2dpbmdTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMTtcbiAgfVxufVxuXG4vLyBJbml0aWFsaXplIGxvZ2dpbmcuXG5mdW5jdGlvbiBpbml0aWFsaXplTG9nZ2luZyhsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyKSB7XG4gIHJldHVybiBsb2dnZXJcbiAgICAucGlwZShmaWx0ZXIoZW50cnkgPT4gKGVudHJ5LmxldmVsICE9ICdkZWJ1ZycpKSlcbiAgICAuc3Vic2NyaWJlKGVudHJ5ID0+IHtcbiAgICAgIGxldCBjb2xvciA9ICh4OiBzdHJpbmcpID0+IHRlcm1pbmFsLmRpbSh0ZXJtaW5hbC53aGl0ZSh4KSk7XG4gICAgICBsZXQgb3V0cHV0ID0gcHJvY2Vzcy5zdGRvdXQ7XG4gICAgICBzd2l0Y2ggKGVudHJ5LmxldmVsKSB7XG4gICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgIGNvbG9yID0gdGVybWluYWwud2hpdGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3dhcm4nOlxuICAgICAgICAgIGNvbG9yID0gdGVybWluYWwueWVsbG93O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC5yZWQ7XG4gICAgICAgICAgb3V0cHV0ID0gcHJvY2Vzcy5zdGRlcnI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2ZhdGFsJzpcbiAgICAgICAgICBjb2xvciA9ICh4KSA9PiB0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh4KSk7XG4gICAgICAgICAgb3V0cHV0ID0gcHJvY2Vzcy5zdGRlcnI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIG91dHB1dC53cml0ZShjb2xvcihlbnRyeS5tZXNzYWdlKSArICdcXG4nKTtcbiAgICB9KTtcbn1cbiJdfQ==