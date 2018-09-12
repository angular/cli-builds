"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const command_runner_1 = require("../../models/command-runner");
const config_1 = require("../../utilities/config");
const project_1 = require("../../utilities/project");
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const maybeExitCode = yield command_runner_1.runCommand(options.cliArgs, logger, projectDetails);
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
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUF5RDtBQUN6RCw4Q0FBd0M7QUFDeEMsZ0VBQXlEO0FBQ3pELG1EQUF5RDtBQUN6RCxxREFBOEQ7QUFHOUQsbUJBQThCLE9BQWlEOztRQUM3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsSUFBSSxtQkFBbUIsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQixtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNqRDtRQUVELElBQUksY0FBYyxHQUFHLDZCQUFtQixFQUFFLENBQUM7UUFDM0MsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO1lBQzNCLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLHdCQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxTQUFTLEtBQUs7c0JBQzNELHFEQUFxRCxDQUFDLENBQUM7Z0JBRXBFLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7WUFFRCxjQUFjLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7U0FDMUM7UUFFRCxJQUFJO1lBQ0YsTUFBTSxhQUFhLEdBQUcsTUFBTSwyQkFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2hGLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO2dCQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFFaEQsT0FBTyxhQUFhLENBQUM7YUFDdEI7WUFFRCxPQUFPLENBQUMsQ0FBQztTQUNWO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7Z0JBQ3hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQixJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7b0JBQ2IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3pCO2FBQ0Y7aUJBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7Z0JBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDbkI7aUJBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7Z0JBQ2xDLGVBQWU7YUFDaEI7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDdEU7WUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25CLFFBQVEsQ0FBQztnQkFDVCxNQUFNLEdBQUcsQ0FBQzthQUNYO1lBRUQsSUFBSSxtQkFBbUIsRUFBRTtnQkFDdkIsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDbkM7WUFFRCxPQUFPLENBQUMsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBdERELDRCQXNEQztBQUVELHNCQUFzQjtBQUN0QixTQUFTLGlCQUFpQixDQUFDLE1BQXNCO0lBQy9DLE9BQU8sTUFBTTtTQUNWLElBQUksQ0FBQyxrQkFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDL0MsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2pCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNuQixLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLGVBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLGVBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsS0FBSyxHQUFHLGVBQVEsQ0FBQyxHQUFHLENBQUM7Z0JBQ3JCLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNO1lBQ1IsS0FBSyxPQUFPO2dCQUNWLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNO1NBQ1Q7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGZpbHRlciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHJ1bkNvbW1hbmQgfSBmcm9tICcuLi8uLi9tb2RlbHMvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlUmF3IH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2VEZXRhaWxzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb2plY3QnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdGlvbnM6IHsgdGVzdGluZz86IGJvb2xlYW4sIGNsaUFyZ3M6IHN0cmluZ1tdIH0pIHtcbiAgY29uc3QgbG9nZ2VyID0gbmV3IGxvZ2dpbmcuSW5kZW50TG9nZ2VyKCdjbGluZycpO1xuICBsZXQgbG9nZ2luZ1N1YnNjcmlwdGlvbjtcbiAgaWYgKCFvcHRpb25zLnRlc3RpbmcpIHtcbiAgICBsb2dnaW5nU3Vic2NyaXB0aW9uID0gaW5pdGlhbGl6ZUxvZ2dpbmcobG9nZ2VyKTtcbiAgfVxuXG4gIGxldCBwcm9qZWN0RGV0YWlscyA9IGdldFdvcmtzcGFjZURldGFpbHMoKTtcbiAgaWYgKHByb2plY3REZXRhaWxzID09PSBudWxsKSB7XG4gICAgY29uc3QgWywgbG9jYWxQYXRoXSA9IGdldFdvcmtzcGFjZVJhdygnbG9jYWwnKTtcbiAgICBpZiAobG9jYWxQYXRoICE9PSBudWxsKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoYEFuIGludmFsaWQgY29uZmlndXJhdGlvbiBmaWxlIHdhcyBmb3VuZCBbJyR7bG9jYWxQYXRofSddLmBcbiAgICAgICAgICAgICAgICAgKyAnIFBsZWFzZSBkZWxldGUgdGhlIGZpbGUgYmVmb3JlIHJ1bm5pbmcgdGhlIGNvbW1hbmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHByb2plY3REZXRhaWxzID0geyByb290OiBwcm9jZXNzLmN3ZCgpIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IG1heWJlRXhpdENvZGUgPSBhd2FpdCBydW5Db21tYW5kKG9wdGlvbnMuY2xpQXJncywgbG9nZ2VyLCBwcm9qZWN0RGV0YWlscyk7XG4gICAgaWYgKHR5cGVvZiBtYXliZUV4aXRDb2RlID09PSAnbnVtYmVyJykge1xuICAgICAgY29uc29sZS5hc3NlcnQoTnVtYmVyLmlzSW50ZWdlcihtYXliZUV4aXRDb2RlKSk7XG5cbiAgICAgIHJldHVybiBtYXliZUV4aXRDb2RlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnIuc3RhY2spO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ251bWJlcicpIHtcbiAgICAgIC8vIExvZyBub3RoaW5nLlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZmF0YWwoJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBpZiAobG9nZ2luZ1N1YnNjcmlwdGlvbikge1xuICAgICAgbG9nZ2luZ1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG5cbi8vIEluaXRpYWxpemUgbG9nZ2luZy5cbmZ1bmN0aW9uIGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpIHtcbiAgcmV0dXJuIGxvZ2dlclxuICAgIC5waXBlKGZpbHRlcihlbnRyeSA9PiAoZW50cnkubGV2ZWwgIT0gJ2RlYnVnJykpKVxuICAgIC5zdWJzY3JpYmUoZW50cnkgPT4ge1xuICAgICAgbGV0IGNvbG9yID0gKHg6IHN0cmluZykgPT4gdGVybWluYWwuZGltKHRlcm1pbmFsLndoaXRlKHgpKTtcbiAgICAgIGxldCBvdXRwdXQgPSBwcm9jZXNzLnN0ZG91dDtcbiAgICAgIHN3aXRjaCAoZW50cnkubGV2ZWwpIHtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC53aGl0ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC55ZWxsb3c7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLnJlZDtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmF0YWwnOlxuICAgICAgICAgIGNvbG9yID0gKHgpID0+IHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHgpKTtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgb3V0cHV0LndyaXRlKGNvbG9yKGVudHJ5Lm1lc3NhZ2UpICsgJ1xcbicpO1xuICAgIH0pO1xufVxuIl19