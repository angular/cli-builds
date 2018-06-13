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
function loadCommands() {
    return {
        // Schematics commands.
        'add': require('../../commands/add').default,
        'new': require('../../commands/new').default,
        'generate': require('../../commands/generate').default,
        'update': require('../../commands/update').default,
        // Architect commands.
        'build': require('../../commands/build').default,
        'serve': require('../../commands/serve').default,
        'test': require('../../commands/test').default,
        'e2e': require('../../commands/e2e').default,
        'lint': require('../../commands/lint').default,
        'xi18n': require('../../commands/xi18n').default,
        'run': require('../../commands/run').default,
        // Disabled commands.
        'eject': require('../../commands/eject').default,
        // Easter eggs.
        'make-this-awesome': require('../../commands/easter-egg').default,
        // Other.
        'config': require('../../commands/config').default,
        'help': require('../../commands/help').default,
        'version': require('../../commands/version').default,
        'doc': require('../../commands/doc').default,
        // deprecated
        'get': require('../../commands/getset').default,
        'set': require('../../commands/getset').default,
    };
}
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const commands = loadCommands();
        const logger = new core_1.logging.IndentLogger('cling');
        let loggingSubscription;
        if (!options.testing) {
            loggingSubscription = initializeLogging(logger);
        }
        let projectDetails = project_1.getProjectDetails();
        if (projectDetails === null) {
            projectDetails = { root: process.cwd() };
        }
        const context = {
            project: projectDetails,
        };
        try {
            const maybeExitCode = yield command_runner_1.runCommand(commands, options.cliArgs, logger, context);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUF5RDtBQUN6RCw4Q0FBd0M7QUFDeEMsZ0VBQXlEO0FBQ3pELHFEQUE0RDtBQUc1RDtJQUNFLE1BQU0sQ0FBQztRQUNMLHVCQUF1QjtRQUN2QixLQUFLLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTztRQUM1QyxLQUFLLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTztRQUM1QyxVQUFVLEVBQUUsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTztRQUN0RCxRQUFRLEVBQUUsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsT0FBTztRQUVsRCxzQkFBc0I7UUFDdEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU87UUFDaEQsT0FBTyxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU87UUFDaEQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU87UUFDOUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU87UUFDNUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU87UUFDOUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU87UUFDaEQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU87UUFFNUMscUJBQXFCO1FBQ3JCLE9BQU8sRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPO1FBRWhELGVBQWU7UUFDZixtQkFBbUIsRUFBRSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxPQUFPO1FBRWpF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QztRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGZpbHRlciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHJ1bkNvbW1hbmQgfSBmcm9tICcuLi8uLi9tb2RlbHMvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgZ2V0UHJvamVjdERldGFpbHMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcHJvamVjdCc7XG5cblxuZnVuY3Rpb24gbG9hZENvbW1hbmRzKCkge1xuICByZXR1cm4ge1xuICAgIC8vIFNjaGVtYXRpY3MgY29tbWFuZHMuXG4gICAgJ2FkZCc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2FkZCcpLmRlZmF1bHQsXG4gICAgJ25ldyc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL25ldycpLmRlZmF1bHQsXG4gICAgJ2dlbmVyYXRlJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvZ2VuZXJhdGUnKS5kZWZhdWx0LFxuICAgICd1cGRhdGUnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy91cGRhdGUnKS5kZWZhdWx0LFxuXG4gICAgLy8gQXJjaGl0ZWN0IGNvbW1hbmRzLlxuICAgICdidWlsZCc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2J1aWxkJykuZGVmYXVsdCxcbiAgICAnc2VydmUnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9zZXJ2ZScpLmRlZmF1bHQsXG4gICAgJ3Rlc3QnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy90ZXN0JykuZGVmYXVsdCxcbiAgICAnZTJlJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvZTJlJykuZGVmYXVsdCxcbiAgICAnbGludCc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2xpbnQnKS5kZWZhdWx0LFxuICAgICd4aTE4bic6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL3hpMThuJykuZGVmYXVsdCxcbiAgICAncnVuJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvcnVuJykuZGVmYXVsdCxcblxuICAgIC8vIERpc2FibGVkIGNvbW1hbmRzLlxuICAgICdlamVjdCc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2VqZWN0JykuZGVmYXVsdCxcblxuICAgIC8vIEVhc3RlciBlZ2dzLlxuICAgICdtYWtlLXRoaXMtYXdlc29tZSc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2Vhc3Rlci1lZ2cnKS5kZWZhdWx0LFxuXG4gICAgLy8gT3RoZXIuXG4gICAgJ2NvbmZpZyc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2NvbmZpZycpLmRlZmF1bHQsXG4gICAgJ2hlbHAnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9oZWxwJykuZGVmYXVsdCxcbiAgICAndmVyc2lvbic6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL3ZlcnNpb24nKS5kZWZhdWx0LFxuICAgICdkb2MnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9kb2MnKS5kZWZhdWx0LFxuXG4gICAgLy8gZGVwcmVjYXRlZFxuICAgICdnZXQnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9nZXRzZXQnKS5kZWZhdWx0LFxuICAgICdzZXQnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9nZXRzZXQnKS5kZWZhdWx0LFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiB7IHRlc3Rpbmc/OiBib29sZWFuLCBjbGlBcmdzOiBzdHJpbmdbXSB9KSB7XG4gIGNvbnN0IGNvbW1hbmRzID0gbG9hZENvbW1hbmRzKCk7XG5cbiAgY29uc3QgbG9nZ2VyID0gbmV3IGxvZ2dpbmcuSW5kZW50TG9nZ2VyKCdjbGluZycpO1xuICBsZXQgbG9nZ2luZ1N1YnNjcmlwdGlvbjtcbiAgaWYgKCFvcHRpb25zLnRlc3RpbmcpIHtcbiAgICBsb2dnaW5nU3Vic2NyaXB0aW9uID0gaW5pdGlhbGl6ZUxvZ2dpbmcobG9nZ2VyKTtcbiAgfVxuXG4gIGxldCBwcm9qZWN0RGV0YWlscyA9IGdldFByb2plY3REZXRhaWxzKCk7XG4gIGlmIChwcm9qZWN0RGV0YWlscyA9PT0gbnVsbCkge1xuICAgIHByb2plY3REZXRhaWxzID0geyByb290OiBwcm9jZXNzLmN3ZCgpIH07XG4gIH1cbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBwcm9qZWN0OiBwcm9qZWN0RGV0YWlscyxcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IG1heWJlRXhpdENvZGUgPSBhd2FpdCBydW5Db21tYW5kKGNvbW1hbmRzLCBvcHRpb25zLmNsaUFyZ3MsIGxvZ2dlciwgY29udGV4dCk7XG4gICAgaWYgKHR5cGVvZiBtYXliZUV4aXRDb2RlID09PSAnbnVtYmVyJykge1xuICAgICAgY29uc29sZS5hc3NlcnQoTnVtYmVyLmlzSW50ZWdlcihtYXliZUV4aXRDb2RlKSk7XG5cbiAgICAgIHJldHVybiBtYXliZUV4aXRDb2RlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIubWVzc2FnZSk7XG4gICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnIuc3RhY2spO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5mYXRhbChlcnIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVyciA9PT0gJ251bWJlcicpIHtcbiAgICAgIC8vIExvZyBub3RoaW5nLlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZmF0YWwoJ0FuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBpZiAobG9nZ2luZ1N1YnNjcmlwdGlvbikge1xuICAgICAgbG9nZ2luZ1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG5cbi8vIEluaXRpYWxpemUgbG9nZ2luZy5cbmZ1bmN0aW9uIGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpIHtcbiAgcmV0dXJuIGxvZ2dlclxuICAgIC5waXBlKGZpbHRlcihlbnRyeSA9PiAoZW50cnkubGV2ZWwgIT0gJ2RlYnVnJykpKVxuICAgIC5zdWJzY3JpYmUoZW50cnkgPT4ge1xuICAgICAgbGV0IGNvbG9yID0gKHg6IHN0cmluZykgPT4gdGVybWluYWwuZGltKHRlcm1pbmFsLndoaXRlKHgpKTtcbiAgICAgIGxldCBvdXRwdXQgPSBwcm9jZXNzLnN0ZG91dDtcbiAgICAgIHN3aXRjaCAoZW50cnkubGV2ZWwpIHtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC53aGl0ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC55ZWxsb3c7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLnJlZDtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmF0YWwnOlxuICAgICAgICAgIGNvbG9yID0gKHgpID0+IHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHgpKTtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgb3V0cHV0LndyaXRlKGNvbG9yKGVudHJ5Lm1lc3NhZ2UpICsgJ1xcbicpO1xuICAgIH0pO1xufVxuIl19