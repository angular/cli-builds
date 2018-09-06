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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUF5RDtBQUN6RCw4Q0FBd0M7QUFDeEMsZ0VBQXlEO0FBQ3pELHFEQUE4RDtBQUc5RCxtQkFBOEIsT0FBaUQ7O1FBQzdFLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLG1CQUFtQixDQUFDO1FBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3BCLG1CQUFtQixHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2pEO1FBRUQsSUFBSSxjQUFjLEdBQUcsNkJBQW1CLEVBQUUsQ0FBQztRQUMzQyxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1NBQzFDO1FBRUQsSUFBSTtZQUNGLE1BQU0sYUFBYSxHQUFHLE1BQU0sMkJBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNoRixJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRTtnQkFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBRWhELE9BQU8sYUFBYSxDQUFDO2FBQ3RCO1lBRUQsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osSUFBSSxHQUFHLFlBQVksS0FBSyxFQUFFO2dCQUN4QixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN6QjthQUNGO2lCQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO2dCQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ25CO2lCQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO2dCQUNsQyxlQUFlO2FBQ2hCO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ3RFO1lBRUQsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUNuQixRQUFRLENBQUM7Z0JBQ1QsTUFBTSxHQUFHLENBQUM7YUFDWDtZQUVELElBQUksbUJBQW1CLEVBQUU7Z0JBQ3ZCLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ25DO1lBRUQsT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUM7Q0FBQTtBQTlDRCw0QkE4Q0M7QUFFRCxzQkFBc0I7QUFDdEIsMkJBQTJCLE1BQXNCO0lBQy9DLE9BQU8sTUFBTTtTQUNWLElBQUksQ0FBQyxrQkFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDL0MsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2pCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNuQixLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLGVBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLE1BQU07Z0JBQ1QsS0FBSyxHQUFHLGVBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsS0FBSyxHQUFHLGVBQVEsQ0FBQyxHQUFHLENBQUM7Z0JBQ3JCLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNO1lBQ1IsS0FBSyxPQUFPO2dCQUNWLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUN4QixNQUFNO1NBQ1Q7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGZpbHRlciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHJ1bkNvbW1hbmQgfSBmcm9tICcuLi8uLi9tb2RlbHMvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlRGV0YWlscyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wcm9qZWN0JztcblxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiB7IHRlc3Rpbmc/OiBib29sZWFuLCBjbGlBcmdzOiBzdHJpbmdbXSB9KSB7XG4gIGNvbnN0IGxvZ2dlciA9IG5ldyBsb2dnaW5nLkluZGVudExvZ2dlcignY2xpbmcnKTtcbiAgbGV0IGxvZ2dpbmdTdWJzY3JpcHRpb247XG4gIGlmICghb3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgbG9nZ2luZ1N1YnNjcmlwdGlvbiA9IGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcik7XG4gIH1cblxuICBsZXQgcHJvamVjdERldGFpbHMgPSBnZXRXb3Jrc3BhY2VEZXRhaWxzKCk7XG4gIGlmIChwcm9qZWN0RGV0YWlscyA9PT0gbnVsbCkge1xuICAgIHByb2plY3REZXRhaWxzID0geyByb290OiBwcm9jZXNzLmN3ZCgpIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IG1heWJlRXhpdENvZGUgPSBhd2FpdCBydW5Db21tYW5kKG9wdGlvbnMuY2xpQXJncywgbG9nZ2VyLCBwcm9qZWN0RGV0YWlscyk7XG4gICAgaWYgKHR5cGVvZiBtYXliZUV4aXRDb2RlID09PSAnbnVtYmVyJykge1xuICAgICAgY29uc29sZS5hc3NlcnQoTnVtYmVyLmlzSW50ZWdlcihtYXliZUV4aXRDb2RlKSk7XG5cbiAgICAgIHJldHVybiBtYXliZUV4aXRDb2RlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnIuc3RhY2spO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ251bWJlcicpIHtcbiAgICAgIC8vIExvZyBub3RoaW5nLlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZmF0YWwoJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBpZiAobG9nZ2luZ1N1YnNjcmlwdGlvbikge1xuICAgICAgbG9nZ2luZ1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG5cbi8vIEluaXRpYWxpemUgbG9nZ2luZy5cbmZ1bmN0aW9uIGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpIHtcbiAgcmV0dXJuIGxvZ2dlclxuICAgIC5waXBlKGZpbHRlcihlbnRyeSA9PiAoZW50cnkubGV2ZWwgIT0gJ2RlYnVnJykpKVxuICAgIC5zdWJzY3JpYmUoZW50cnkgPT4ge1xuICAgICAgbGV0IGNvbG9yID0gKHg6IHN0cmluZykgPT4gdGVybWluYWwuZGltKHRlcm1pbmFsLndoaXRlKHgpKTtcbiAgICAgIGxldCBvdXRwdXQgPSBwcm9jZXNzLnN0ZG91dDtcbiAgICAgIHN3aXRjaCAoZW50cnkubGV2ZWwpIHtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC53aGl0ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC55ZWxsb3c7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLnJlZDtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmF0YWwnOlxuICAgICAgICAgIGNvbG9yID0gKHgpID0+IHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHgpKTtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgb3V0cHV0LndyaXRlKGNvbG9yKGVudHJ5Lm1lc3NhZ2UpICsgJ1xcbicpO1xuICAgIH0pO1xufVxuIl19