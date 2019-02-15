"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const command_runner_1 = require("../../models/command-runner");
const config_1 = require("../../utilities/config");
const project_1 = require("../../utilities/project");
async function default_1(options) {
    const logger = node_1.createConsoleLogger(false, process.stdout, process.stderr, {
        warn: s => core_1.terminal.bold(core_1.terminal.yellow(s)),
        error: s => core_1.terminal.bold(core_1.terminal.red(s)),
        fatal: s => core_1.terminal.bold(core_1.terminal.red(s)),
    });
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
        return 1;
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBZ0Q7QUFDaEQsb0RBQWdFO0FBQ2hFLGdFQUF5RDtBQUN6RCxtREFBeUQ7QUFDekQscURBQThEO0FBRy9DLEtBQUssb0JBQVUsT0FBaUQ7SUFDN0UsTUFBTSxNQUFNLEdBQUcsMEJBQW1CLENBQ2hDLEtBQUssRUFDTCxPQUFPLENBQUMsTUFBTSxFQUNkLE9BQU8sQ0FBQyxNQUFNLEVBQ2Q7UUFDRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxlQUFRLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQVEsQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzQyxDQUNGLENBQUM7SUFFRixJQUFJLGNBQWMsR0FBRyw2QkFBbUIsRUFBRSxDQUFDO0lBQzNDLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtRQUMzQixNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsR0FBRyx3QkFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxTQUFTLEtBQUs7a0JBQzNELHFEQUFxRCxDQUFDLENBQUM7WUFFcEUsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELGNBQWMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztLQUMxQztJQUVELElBQUk7UUFDRixNQUFNLGFBQWEsR0FBRyxNQUFNLDJCQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEYsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUU7WUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFFaEQsT0FBTyxhQUFhLENBQUM7U0FDdEI7UUFFRCxPQUFPLENBQUMsQ0FBQztLQUNWO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO2dCQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDbEMsZUFBZTtTQUNoQjthQUFNO1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEU7UUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDbkIsUUFBUSxDQUFDO1lBQ1QsTUFBTSxHQUFHLENBQUM7U0FDWDtRQUVELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7QUFDSCxDQUFDO0FBdkRELDRCQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgY3JlYXRlQ29uc29sZUxvZ2dlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgcnVuQ29tbWFuZCB9IGZyb20gJy4uLy4uL21vZGVscy9jb21tYW5kLXJ1bm5lcic7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2VSYXcgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZURldGFpbHMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvamVjdCc7XG5cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0aW9uczogeyB0ZXN0aW5nPzogYm9vbGVhbiwgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICBjb25zdCBsb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKFxuICAgIGZhbHNlLFxuICAgIHByb2Nlc3Muc3Rkb3V0LFxuICAgIHByb2Nlc3Muc3RkZXJyLFxuICAgIHtcbiAgICAgIHdhcm46IHMgPT4gdGVybWluYWwuYm9sZCh0ZXJtaW5hbC55ZWxsb3cocykpLFxuICAgICAgZXJyb3I6IHMgPT4gdGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQocykpLFxuICAgICAgZmF0YWw6IHMgPT4gdGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQocykpLFxuICAgIH0sXG4gICk7XG5cbiAgbGV0IHByb2plY3REZXRhaWxzID0gZ2V0V29ya3NwYWNlRGV0YWlscygpO1xuICBpZiAocHJvamVjdERldGFpbHMgPT09IG51bGwpIHtcbiAgICBjb25zdCBbLCBsb2NhbFBhdGhdID0gZ2V0V29ya3NwYWNlUmF3KCdsb2NhbCcpO1xuICAgIGlmIChsb2NhbFBhdGggIT09IG51bGwpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChgQW4gaW52YWxpZCBjb25maWd1cmF0aW9uIGZpbGUgd2FzIGZvdW5kIFsnJHtsb2NhbFBhdGh9J10uYFxuICAgICAgICAgICAgICAgICArICcgUGxlYXNlIGRlbGV0ZSB0aGUgZmlsZSBiZWZvcmUgcnVubmluZyB0aGUgY29tbWFuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcHJvamVjdERldGFpbHMgPSB7IHJvb3Q6IHByb2Nlc3MuY3dkKCkgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgbWF5YmVFeGl0Q29kZSA9IGF3YWl0IHJ1bkNvbW1hbmQob3B0aW9ucy5jbGlBcmdzLCBsb2dnZXIsIHByb2plY3REZXRhaWxzKTtcbiAgICBpZiAodHlwZW9mIG1heWJlRXhpdENvZGUgPT09ICdudW1iZXInKSB7XG4gICAgICBjb25zb2xlLmFzc2VydChOdW1iZXIuaXNJbnRlZ2VyKG1heWJlRXhpdENvZGUpKTtcblxuICAgICAgcmV0dXJuIG1heWJlRXhpdENvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgbG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcbiAgICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKGVyci5zdGFjayk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmZhdGFsKGVycik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyID09PSAnbnVtYmVyJykge1xuICAgICAgLy8gTG9nIG5vdGhpbmcuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZDogJyArIEpTT04uc3RyaW5naWZ5KGVycikpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnRlc3RpbmcpIHtcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG4iXX0=