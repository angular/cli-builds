"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandModuleError = exports.CommandModule = exports.CommandScope = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const helpers_1 = require("yargs/helpers");
const analytics_1 = require("../analytics/analytics");
const completion_1 = require("../utilities/completion");
const memoize_1 = require("../utilities/memoize");
var CommandScope;
(function (CommandScope) {
    /** Command can only run inside an Angular workspace. */
    CommandScope[CommandScope["In"] = 0] = "In";
    /** Command can only run outside an Angular workspace. */
    CommandScope[CommandScope["Out"] = 1] = "Out";
    /** Command can run inside and outside an Angular workspace. */
    CommandScope[CommandScope["Both"] = 2] = "Both";
})(CommandScope = exports.CommandScope || (exports.CommandScope = {}));
class CommandModule {
    constructor(context) {
        this.context = context;
        this.shouldReportAnalytics = true;
        this.optionsWithAnalytics = new Map();
    }
    /**
     * Description object which contains the long command descroption.
     * This is used to generate JSON help wich is used in AIO.
     *
     * `false` will result in a hidden command.
     */
    get fullDescribe() {
        return this.describe === false
            ? false
            : {
                describe: this.describe,
                ...(this.longDescriptionPath
                    ? {
                        longDescriptionRelativePath: path
                            .relative(path.join(__dirname, '../../../../'), this.longDescriptionPath)
                            .replace(/\\/g, path.posix.sep),
                        longDescription: (0, fs_1.readFileSync)(this.longDescriptionPath, 'utf8').replace(/\r\n/g, '\n'),
                    }
                    : {}),
            };
    }
    get commandName() {
        return this.command.split(' ', 1)[0];
    }
    async handler(args) {
        const { _, $0, ...options } = args;
        // Camelize options as yargs will return the object in kebab-case when camel casing is disabled.
        const camelCasedOptions = {};
        for (const [key, value] of Object.entries(options)) {
            camelCasedOptions[helpers_1.Parser.camelCase(key)] = value;
        }
        // Set up autocompletion if appropriate.
        const autocompletionExitCode = await (0, completion_1.considerSettingUpAutocompletion)(this.commandName, this.context.logger);
        if (autocompletionExitCode !== undefined) {
            process.exitCode = autocompletionExitCode;
            return;
        }
        // Gather and report analytics.
        const analytics = await this.getAnalytics();
        if (this.shouldReportAnalytics) {
            await this.reportAnalytics(camelCasedOptions);
        }
        let exitCode;
        try {
            // Run and time command.
            const startTime = Date.now();
            exitCode = await this.run(camelCasedOptions);
            const endTime = Date.now();
            analytics.timing(this.commandName, 'duration', endTime - startTime);
            await analytics.flush();
        }
        catch (e) {
            if (e instanceof core_1.schema.SchemaValidationException) {
                this.context.logger.fatal(`Error: ${e.message}`);
                exitCode = 1;
            }
            else {
                throw e;
            }
        }
        finally {
            if (typeof exitCode === 'number' && exitCode > 0) {
                process.exitCode = exitCode;
            }
        }
    }
    async reportAnalytics(options, paths = [], dimensions = []) {
        for (const [name, ua] of this.optionsWithAnalytics) {
            const value = options[name];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                dimensions[ua] = value;
            }
        }
        const analytics = await this.getAnalytics();
        analytics.pageview('/command/' + [this.commandName, ...paths].join('/'), {
            dimensions,
            metrics: [],
        });
    }
    getAnalytics() {
        return (0, analytics_1.createAnalytics)(!!this.context.workspace, 
        // Don't prompt for `ng update` and `ng analytics` commands.
        ['update', 'analytics'].includes(this.commandName));
    }
    /**
     * Adds schema options to a command also this keeps track of options that are required for analytics.
     * **Note:** This method should be called from the command bundler method.
     */
    addSchemaOptionsToCommand(localYargs, options) {
        const workingDir = (0, core_1.normalize)(path.relative(this.context.root, process.cwd()));
        for (const option of options) {
            const { default: defaultVal, positional, deprecated, description, alias, userAnalytics, type, hidden, name, choices, format, } = option;
            const sharedOptions = {
                alias,
                hidden,
                description,
                deprecated,
                choices,
                // This should only be done when `--help` is used otherwise default will override options set in angular.json.
                ...(this.context.args.options.help ? { default: defaultVal } : {}),
            };
            // Special case for schematics
            if (workingDir && format === 'path' && name === 'path' && hidden) {
                sharedOptions.default = workingDir;
            }
            if (positional === undefined) {
                localYargs = localYargs.option(core_1.strings.dasherize(name), {
                    type,
                    ...sharedOptions,
                });
            }
            else {
                localYargs = localYargs.positional(core_1.strings.dasherize(name), {
                    type: type === 'array' || type === 'count' ? 'string' : type,
                    ...sharedOptions,
                });
            }
            // Record option of analytics.
            if (userAnalytics !== undefined) {
                this.optionsWithAnalytics.set(name, userAnalytics);
            }
        }
        return localYargs;
    }
    getWorkspaceOrThrow() {
        const { workspace } = this.context;
        if (!workspace) {
            throw new CommandModuleError('A workspace is required for this command.');
        }
        return workspace;
    }
}
CommandModule.scope = CommandScope.Both;
__decorate([
    memoize_1.memoize,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommandModule.prototype, "getAnalytics", null);
exports.CommandModule = CommandModule;
/**
 * Creates an known command module error.
 * This is used so during executation we can filter between known validation error and real non handled errors.
 */
class CommandModuleError extends Error {
}
exports.CommandModuleError = CommandModuleError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXNGO0FBQ3RGLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUN6RCx3REFBMEU7QUFFMUUsa0RBQStDO0FBTS9DLElBQVksWUFPWDtBQVBELFdBQVksWUFBWTtJQUN0Qix3REFBd0Q7SUFDeEQsMkNBQUUsQ0FBQTtJQUNGLHlEQUF5RDtJQUN6RCw2Q0FBRyxDQUFBO0lBQ0gsK0RBQStEO0lBQy9ELCtDQUFJLENBQUE7QUFDTixDQUFDLEVBUFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFPdkI7QUFzQ0QsTUFBc0IsYUFBYTtJQVNqQyxZQUErQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUxuQywwQkFBcUIsR0FBWSxJQUFJLENBQUM7UUFHeEMseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFFVCxDQUFDO0lBRTFEOzs7OztPQUtHO0lBQ0gsSUFBVyxZQUFZO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLO1lBQzVCLENBQUMsQ0FBQyxLQUFLO1lBQ1AsQ0FBQyxDQUFDO2dCQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUI7b0JBQzFCLENBQUMsQ0FBQzt3QkFDRSwyQkFBMkIsRUFBRSxJQUFJOzZCQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFD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LENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxNQUFNLElBQUksa0JBQWtCLENBQUMsMkNBQTJDLENBQUMsQ0FBQztTQUMzRTtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7O0FBcExNLG1CQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztBQTJHakM7SUFEQyxpQkFBTzs7OztpREFPUDtBQXRISCxzQ0EwTEM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGtCQUFtQixTQUFRLEtBQUs7Q0FBRztBQUFoRCxnREFBZ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nLCBub3JtYWxpemUsIHNjaGVtYSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBBcmd1bWVudHNDYW1lbENhc2UsXG4gIEFyZ3YsXG4gIENhbWVsQ2FzZUtleSxcbiAgUG9zaXRpb25hbE9wdGlvbnMsXG4gIENvbW1hbmRNb2R1bGUgYXMgWWFyZ3NDb21tYW5kTW9kdWxlLFxuICBPcHRpb25zIGFzIFlhcmdzT3B0aW9ucyxcbn0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIGFzIHlhcmdzUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBjcmVhdGVBbmFseXRpY3MgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvY29tcGxldGlvbic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgdHlwZSBPcHRpb25zPFQ+ID0geyBba2V5IGluIGtleW9mIFQgYXMgQ2FtZWxDYXNlS2V5PGtleT5dOiBUW2tleV0gfTtcblxuZXhwb3J0IGVudW0gQ29tbWFuZFNjb3BlIHtcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIGluc2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgSW4sXG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBPdXQsXG4gIC8qKiBDb21tYW5kIGNhbiBydW4gaW5zaWRlIGFuZCBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBCb3RoLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VycmVudERpcmVjdG9yeTogc3RyaW5nO1xuICByb290OiBzdHJpbmc7XG4gIHdvcmtzcGFjZT86IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIGdsb2JhbENvbmZpZ3VyYXRpb24/OiBBbmd1bGFyV29ya3NwYWNlO1xuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyO1xuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXJVdGlscztcbiAgLyoqIEFyZ3VtZW50cyBwYXJzZWQgaW4gZnJlZS1mcm9tIHdpdGhvdXQgcGFyc2VyIGNvbmZpZ3VyYXRpb24uICovXG4gIGFyZ3M6IHtcbiAgICBwb3NpdGlvbmFsOiBzdHJpbmdbXTtcbiAgICBvcHRpb25zOiB7XG4gICAgICBoZWxwOiBib29sZWFuO1xuICAgICAganNvbkhlbHA6IGJvb2xlYW47XG4gICAgICBnZXRZYXJnc0NvbXBsZXRpb25zOiBib29sZWFuO1xuICAgIH0gJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgT3RoZXJPcHRpb25zID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQgZXh0ZW5kcyB7fSA9IHt9PlxuICBleHRlbmRzIE9taXQ8WWFyZ3NDb21tYW5kTW9kdWxlPHt9LCBUPiwgJ2J1aWxkZXInIHwgJ2hhbmRsZXInPiB7XG4gIC8qKiBQYXRoIHVzZWQgdG8gbG9hZCB0aGUgbG9uZyBkZXNjcmlwdGlvbiBmb3IgdGhlIGNvbW1hbmQgaW4gSlNPTiBoZWxwIHRleHQuICovXG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIC8qKiBPYmplY3QgZGVjbGFyaW5nIHRoZSBvcHRpb25zIHRoZSBjb21tYW5kIGFjY2VwdHMsIG9yIGEgZnVuY3Rpb24gYWNjZXB0aW5nIGFuZCByZXR1cm5pbmcgYSB5YXJncyBpbnN0YW5jZS4gKi9cbiAgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIC8qKiBBIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgcGFzc2VkIHRoZSBwYXJzZWQgYXJndi4gKi9cbiAgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHwgbnVtYmVyIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGdWxsRGVzY3JpYmUge1xuICBkZXNjcmliZT86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21tYW5kTW9kdWxlPFQgZXh0ZW5kcyB7fSA9IHt9PiBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUPiB7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGNvbW1hbmQ6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgZGVzY3JpYmU6IHN0cmluZyB8IGZhbHNlO1xuICBhYnN0cmFjdCByZWFkb25seSBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2hvdWxkUmVwb3J0QW5hbHl0aWNzOiBib29sZWFuID0gdHJ1ZTtcbiAgc3RhdGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLkJvdGg7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zV2l0aEFuYWx5dGljcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXNjcmlwdGlvbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgdGhlIGxvbmcgY29tbWFuZCBkZXNjcm9wdGlvbi5cbiAgICogVGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIEpTT04gaGVscCB3aWNoIGlzIHVzZWQgaW4gQUlPLlxuICAgKlxuICAgKiBgZmFsc2VgIHdpbGwgcmVzdWx0IGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGZ1bGxEZXNjcmliZSgpOiBGdWxsRGVzY3JpYmUgfCBmYWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZGVzY3JpYmUgPT09IGZhbHNlXG4gICAgICA/IGZhbHNlXG4gICAgICA6IHtcbiAgICAgICAgICBkZXNjcmliZTogdGhpcy5kZXNjcmliZSxcbiAgICAgICAgICAuLi4odGhpcy5sb25nRGVzY3JpcHRpb25QYXRoXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg6IHBhdGhcbiAgICAgICAgICAgICAgICAgIC5yZWxhdGl2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vJyksIHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aClcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIHBhdGgucG9zaXguc2VwKSxcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb246IHJlYWRGaWxlU3luYyh0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgsICd1dGY4JykucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgIC9cXHJcXG4vZyxcbiAgICAgICAgICAgICAgICAgICdcXG4nLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmQuc3BsaXQoJyAnLCAxKVswXTtcbiAgfVxuXG4gIGFic3RyYWN0IGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICBhYnN0cmFjdCBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xuXG4gIGFzeW5jIGhhbmRsZXIoYXJnczogQXJndW1lbnRzQ2FtZWxDYXNlPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBfLCAkMCwgLi4ub3B0aW9ucyB9ID0gYXJncztcblxuICAgIC8vIENhbWVsaXplIG9wdGlvbnMgYXMgeWFyZ3Mgd2lsbCByZXR1cm4gdGhlIG9iamVjdCBpbiBrZWJhYi1jYXNlIHdoZW4gY2FtZWwgY2FzaW5nIGlzIGRpc2FibGVkLlxuICAgIGNvbnN0IGNhbWVsQ2FzZWRPcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMpKSB7XG4gICAgICBjYW1lbENhc2VkT3B0aW9uc1t5YXJnc1BhcnNlci5jYW1lbENhc2Uoa2V5KV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgYXV0b2NvbXBsZXRpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgY29uc3QgYXV0b2NvbXBsZXRpb25FeGl0Q29kZSA9IGF3YWl0IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24oXG4gICAgICB0aGlzLmNvbW1hbmROYW1lLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICApO1xuICAgIGlmIChhdXRvY29tcGxldGlvbkV4aXRDb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBhdXRvY29tcGxldGlvbkV4aXRDb2RlO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2F0aGVyIGFuZCByZXBvcnQgYW5hbHl0aWNzLlxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgaWYgKHRoaXMuc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhjYW1lbENhc2VkT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBSdW4gYW5kIHRpbWUgY29tbWFuZC5cbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICBleGl0Q29kZSA9IGF3YWl0IHRoaXMucnVuKGNhbWVsQ2FzZWRPcHRpb25zIGFzIE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XG4gICAgICBhbmFseXRpY3MudGltaW5nKHRoaXMuY29tbWFuZE5hbWUsICdkdXJhdGlvbicsIGVuZFRpbWUgLSBzdGFydFRpbWUpO1xuICAgICAgYXdhaXQgYW5hbHl0aWNzLmZsdXNoKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgICBwYXRoczogc3RyaW5nW10gPSBbXSxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBhbmFseXRpY3MucGFnZXZpZXcoJy9jb21tYW5kLycgKyBbdGhpcy5jb21tYW5kTmFtZSwgLi4ucGF0aHNdLmpvaW4oJy8nKSwge1xuICAgICAgZGltZW5zaW9ucyxcbiAgICAgIG1ldHJpY3M6IFtdLFxuICAgIH0pO1xuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJvdGVjdGVkIGdldEFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgICByZXR1cm4gY3JlYXRlQW5hbHl0aWNzKFxuICAgICAgISF0aGlzLmNvbnRleHQud29ya3NwYWNlLFxuICAgICAgLy8gRG9uJ3QgcHJvbXB0IGZvciBgbmcgdXBkYXRlYCBhbmQgYG5nIGFuYWx5dGljc2AgY29tbWFuZHMuXG4gICAgICBbJ3VwZGF0ZScsICdhbmFseXRpY3MnXS5pbmNsdWRlcyh0aGlzLmNvbW1hbmROYW1lKSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgc2NoZW1hIG9wdGlvbnMgdG8gYSBjb21tYW5kIGFsc28gdGhpcyBrZWVwcyB0cmFjayBvZiBvcHRpb25zIHRoYXQgYXJlIHJlcXVpcmVkIGZvciBhbmFseXRpY3MuXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGNvbW1hbmQgYnVuZGxlciBtZXRob2QuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZDxUPihsb2NhbFlhcmdzOiBBcmd2PFQ+LCBvcHRpb25zOiBPcHRpb25bXSk6IEFyZ3Y8VD4ge1xuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUocGF0aC5yZWxhdGl2ZSh0aGlzLmNvbnRleHQucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgY29uc3Qge1xuICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsLFxuICAgICAgICBwb3NpdGlvbmFsLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIHVzZXJBbmFseXRpY3MsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgICAgZm9ybWF0LFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNjaGVtYXRpY3NcbiAgICAgIGlmICh3b3JraW5nRGlyICYmIGZvcm1hdCA9PT0gJ3BhdGgnICYmIG5hbWUgPT09ICdwYXRoJyAmJiBoaWRkZW4pIHtcbiAgICAgICAgc2hhcmVkT3B0aW9ucy5kZWZhdWx0ID0gd29ya2luZ0RpcjtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5vcHRpb24oc3RyaW5ncy5kYXNoZXJpemUobmFtZSksIHtcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MucG9zaXRpb25hbChzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGU6IHR5cGUgPT09ICdhcnJheScgfHwgdHlwZSA9PT0gJ2NvdW50JyA/ICdzdHJpbmcnIDogdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVjb3JkIG9wdGlvbiBvZiBhbmFseXRpY3MuXG4gICAgICBpZiAodXNlckFuYWx5dGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3Muc2V0KG5hbWUsIHVzZXJBbmFseXRpY3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFdvcmtzcGFjZU9yVGhyb3coKTogQW5ndWxhcldvcmtzcGFjZSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBrbm93biBjb21tYW5kIG1vZHVsZSBlcnJvci5cbiAqIFRoaXMgaXMgdXNlZCBzbyBkdXJpbmcgZXhlY3V0YXRpb24gd2UgY2FuIGZpbHRlciBiZXR3ZWVuIGtub3duIHZhbGlkYXRpb24gZXJyb3IgYW5kIHJlYWwgbm9uIGhhbmRsZWQgZXJyb3JzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbWFuZE1vZHVsZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbiJdfQ==