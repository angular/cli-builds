"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
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
                logger.fatal('An unexpected error occured: ' + JSON.stringify(err));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHNEQUFzRDtBQUN0RCwrQ0FBeUQ7QUFDekQsOENBQXdDO0FBQ3hDLGdFQUF5RDtBQUN6RCxxREFBNEQ7QUFHNUQ7SUFDRSxNQUFNLENBQUM7UUFDTCx1QkFBdUI7UUFDdkIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU87UUFDNUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU87UUFDNUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU87UUFDdEQsUUFBUSxFQUFFLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLE9BQU87UUFFbEQsc0JBQXNCO1FBQ3RCLE9BQU8sRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPO1FBQ2hELE9BQU8sRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPO1FBQ2hELE1BQU0sRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPO1FBQzlDLEtBQUssRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPO1FBQzVDLE1BQU0sRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPO1FBQzlDLE9BQU8sRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPO1FBQ2hELEtBQUssRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPO1FBRTVDLHFCQUFxQjtRQUNyQixPQUFPLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsT0FBTztRQUVoRCxlQUFlO1FBQ2YsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTztRQUVqRSxT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UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgbG9nZ2luZywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBmaWx0ZXIgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBydW5Db21tYW5kIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2NvbW1hbmQtcnVubmVyJztcbmltcG9ydCB7IGdldFByb2plY3REZXRhaWxzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3Byb2plY3QnO1xuXG5cbmZ1bmN0aW9uIGxvYWRDb21tYW5kcygpIHtcbiAgcmV0dXJuIHtcbiAgICAvLyBTY2hlbWF0aWNzIGNvbW1hbmRzLlxuICAgICdhZGQnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9hZGQnKS5kZWZhdWx0LFxuICAgICduZXcnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9uZXcnKS5kZWZhdWx0LFxuICAgICdnZW5lcmF0ZSc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2dlbmVyYXRlJykuZGVmYXVsdCxcbiAgICAndXBkYXRlJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvdXBkYXRlJykuZGVmYXVsdCxcblxuICAgIC8vIEFyY2hpdGVjdCBjb21tYW5kcy5cbiAgICAnYnVpbGQnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9idWlsZCcpLmRlZmF1bHQsXG4gICAgJ3NlcnZlJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvc2VydmUnKS5kZWZhdWx0LFxuICAgICd0ZXN0JzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvdGVzdCcpLmRlZmF1bHQsXG4gICAgJ2UyZSc6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL2UyZScpLmRlZmF1bHQsXG4gICAgJ2xpbnQnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9saW50JykuZGVmYXVsdCxcbiAgICAneGkxOG4nOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy94aTE4bicpLmRlZmF1bHQsXG4gICAgJ3J1bic6IHJlcXVpcmUoJy4uLy4uL2NvbW1hbmRzL3J1bicpLmRlZmF1bHQsXG5cbiAgICAvLyBEaXNhYmxlZCBjb21tYW5kcy5cbiAgICAnZWplY3QnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9lamVjdCcpLmRlZmF1bHQsXG5cbiAgICAvLyBFYXN0ZXIgZWdncy5cbiAgICAnbWFrZS10aGlzLWF3ZXNvbWUnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9lYXN0ZXItZWdnJykuZGVmYXVsdCxcblxuICAgIC8vIE90aGVyLlxuICAgICdjb25maWcnOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy9jb25maWcnKS5kZWZhdWx0LFxuICAgICdoZWxwJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvaGVscCcpLmRlZmF1bHQsXG4gICAgJ3ZlcnNpb24nOiByZXF1aXJlKCcuLi8uLi9jb21tYW5kcy92ZXJzaW9uJykuZGVmYXVsdCxcbiAgICAnZG9jJzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvZG9jJykuZGVmYXVsdCxcblxuICAgIC8vIGRlcHJlY2F0ZWRcbiAgICAnZ2V0JzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvZ2V0c2V0JykuZGVmYXVsdCxcbiAgICAnc2V0JzogcmVxdWlyZSgnLi4vLi4vY29tbWFuZHMvZ2V0c2V0JykuZGVmYXVsdCxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0aW9uczogeyB0ZXN0aW5nPzogYm9vbGVhbiwgY2xpQXJnczogc3RyaW5nW10gfSkge1xuICBjb25zdCBjb21tYW5kcyA9IGxvYWRDb21tYW5kcygpO1xuXG4gIGNvbnN0IGxvZ2dlciA9IG5ldyBsb2dnaW5nLkluZGVudExvZ2dlcignY2xpbmcnKTtcbiAgbGV0IGxvZ2dpbmdTdWJzY3JpcHRpb247XG4gIGlmICghb3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgbG9nZ2luZ1N1YnNjcmlwdGlvbiA9IGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcik7XG4gIH1cblxuICBsZXQgcHJvamVjdERldGFpbHMgPSBnZXRQcm9qZWN0RGV0YWlscygpO1xuICBpZiAocHJvamVjdERldGFpbHMgPT09IG51bGwpIHtcbiAgICBwcm9qZWN0RGV0YWlscyA9IHsgcm9vdDogcHJvY2Vzcy5jd2QoKSB9O1xuICB9XG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgcHJvamVjdDogcHJvamVjdERldGFpbHMsXG4gIH07XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBtYXliZUV4aXRDb2RlID0gYXdhaXQgcnVuQ29tbWFuZChjb21tYW5kcywgb3B0aW9ucy5jbGlBcmdzLCBsb2dnZXIsIGNvbnRleHQpO1xuICAgIGlmICh0eXBlb2YgbWF5YmVFeGl0Q29kZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KE51bWJlci5pc0ludGVnZXIobWF5YmVFeGl0Q29kZSkpO1xuXG4gICAgICByZXR1cm4gbWF5YmVFeGl0Q29kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyLm1lc3NhZ2UpO1xuICAgICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgICBsb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuZmF0YWwoZXJyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnIgPT09ICdudW1iZXInKSB7XG4gICAgICAvLyBMb2cgbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VyZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0aW5nKSB7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBpZiAobG9nZ2luZ1N1YnNjcmlwdGlvbikge1xuICAgICAgbG9nZ2luZ1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cblxuICAgIHJldHVybiAxO1xuICB9XG59XG5cbi8vIEluaXRpYWxpemUgbG9nZ2luZy5cbmZ1bmN0aW9uIGluaXRpYWxpemVMb2dnaW5nKGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpIHtcbiAgcmV0dXJuIGxvZ2dlclxuICAgIC5waXBlKGZpbHRlcihlbnRyeSA9PiAoZW50cnkubGV2ZWwgIT0gJ2RlYnVnJykpKVxuICAgIC5zdWJzY3JpYmUoZW50cnkgPT4ge1xuICAgICAgbGV0IGNvbG9yID0gKHg6IHN0cmluZykgPT4gdGVybWluYWwuZGltKHRlcm1pbmFsLndoaXRlKHgpKTtcbiAgICAgIGxldCBvdXRwdXQgPSBwcm9jZXNzLnN0ZG91dDtcbiAgICAgIHN3aXRjaCAoZW50cnkubGV2ZWwpIHtcbiAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC53aGl0ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgY29sb3IgPSB0ZXJtaW5hbC55ZWxsb3c7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICBjb2xvciA9IHRlcm1pbmFsLnJlZDtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmF0YWwnOlxuICAgICAgICAgIGNvbG9yID0gKHgpID0+IHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHgpKTtcbiAgICAgICAgICBvdXRwdXQgPSBwcm9jZXNzLnN0ZGVycjtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgb3V0cHV0LndyaXRlKGNvbG9yKGVudHJ5Lm1lc3NhZ2UpICsgJ1xcbicpO1xuICAgIH0pO1xufVxuIl19