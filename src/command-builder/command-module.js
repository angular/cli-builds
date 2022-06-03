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
        for (const option of options) {
            const { default: defaultVal, positional, deprecated, description, alias, userAnalytics, type, hidden, name, choices, } = option;
            const sharedOptions = {
                alias,
                hidden,
                description,
                deprecated,
                choices,
                // This should only be done when `--help` is used otherwise default will override options set in angular.json.
                ...(this.context.args.options.help ? { default: defaultVal } : {}),
            };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTJFO0FBQzNFLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUN6RCx3REFBMEU7QUFFMUUsa0RBQStDO0FBTS9DLElBQVksWUFPWDtBQVBELFdBQVksWUFBWTtJQUN0Qix3REFBd0Q7SUFDeEQsMkNBQUUsQ0FBQTtJQUNGLHlEQUF5RDtJQUN6RCw2Q0FBRyxDQUFBO0lBQ0gsK0RBQStEO0lBQy9ELCtDQUFJLENBQUE7QUFDTixDQUFDLEVBUFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFPdkI7QUFzQ0QsTUFBc0IsYUFBYTtJQVNqQyxZQUErQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUxuQywwQkFBcUIsR0FBWSxJQUFJLENBQUM7UUFHeEMseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFFVCxDQUFDO0lBRTFEOzs7OztPQUtHO0lBQ0gsSUFBVyxZQUFZO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLO1lBQzVCLENBQUMsQ0FBQyxLQUFLO1lBQ1AsQ0FBQyxDQUFDO2dCQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUI7b0JBQzFCLENBQUMsQ0FBQzt3QkFDRSwyQkFBMkIsRUFBRSxJQUFJOzZCQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFD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LCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQXJndW1lbnRzQ2FtZWxDYXNlLFxuICBBcmd2LFxuICBDYW1lbENhc2VLZXksXG4gIFBvc2l0aW9uYWxPcHRpb25zLFxuICBDb21tYW5kTW9kdWxlIGFzIFlhcmdzQ29tbWFuZE1vZHVsZSxcbiAgT3B0aW9ucyBhcyBZYXJnc09wdGlvbnMsXG59IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciBhcyB5YXJnc1BhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgY3JlYXRlQW5hbHl0aWNzIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBjb25zaWRlclNldHRpbmdVcEF1dG9jb21wbGV0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbXBsZXRpb24nO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyVXRpbHMgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgT3B0aW9uczxUPiA9IHsgW2tleSBpbiBrZXlvZiBUIGFzIENhbWVsQ2FzZUtleTxrZXk+XTogVFtrZXldIH07XG5cbmV4cG9ydCBlbnVtIENvbW1hbmRTY29wZSB7XG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBpbnNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEluLFxuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgT3V0LFxuICAvKiogQ29tbWFuZCBjYW4gcnVuIGluc2lkZSBhbmQgb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgQm90aCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJlbnREaXJlY3Rvcnk6IHN0cmluZztcbiAgcm9vdDogc3RyaW5nO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICBnbG9iYWxDb25maWd1cmF0aW9uPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyVXRpbHM7XG4gIC8qKiBBcmd1bWVudHMgcGFyc2VkIGluIGZyZWUtZnJvbSB3aXRob3V0IHBhcnNlciBjb25maWd1cmF0aW9uLiAqL1xuICBhcmdzOiB7XG4gICAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gICAgb3B0aW9uczoge1xuICAgICAgaGVscDogYm9vbGVhbjtcbiAgICAgIGpzb25IZWxwOiBib29sZWFuO1xuICAgICAgZ2V0WWFyZ3NDb21wbGV0aW9uczogYm9vbGVhbjtcbiAgICB9ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE90aGVyT3B0aW9ucyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUIGV4dGVuZHMge30gPSB7fT5cbiAgZXh0ZW5kcyBPbWl0PFlhcmdzQ29tbWFuZE1vZHVsZTx7fSwgVD4sICdidWlsZGVyJyB8ICdoYW5kbGVyJz4ge1xuICAvKiogUGF0aCB1c2VkIHRvIGxvYWQgdGhlIGxvbmcgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kIGluIEpTT04gaGVscCB0ZXh0LiAqL1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICAvKiogT2JqZWN0IGRlY2xhcmluZyB0aGUgb3B0aW9ucyB0aGUgY29tbWFuZCBhY2NlcHRzLCBvciBhIGZ1bmN0aW9uIGFjY2VwdGluZyBhbmQgcmV0dXJuaW5nIGEgeWFyZ3MgaW5zdGFuY2UuICovXG4gIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICAvKiogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgcGFyc2VkIGFyZ3YuICovXG4gIHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnVsbERlc2NyaWJlIHtcbiAgZGVzY3JpYmU/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMge30gPSB7fT4gaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD4ge1xuICBhYnN0cmFjdCByZWFkb25seSBjb21tYW5kOiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGRlc2NyaWJlOiBzdHJpbmcgfCBmYWxzZTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljczogYm9vbGVhbiA9IHRydWU7XG4gIHN0YXRpYyBzY29wZSA9IENvbW1hbmRTY29wZS5Cb3RoO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uc1dpdGhBbmFseXRpY3MgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBjb250ZXh0OiBDb21tYW5kQ29udGV4dCkge31cblxuICAvKipcbiAgICogRGVzY3JpcHRpb24gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIHRoZSBsb25nIGNvbW1hbmQgZGVzY3JvcHRpb24uXG4gICAqIFRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSBKU09OIGhlbHAgd2ljaCBpcyB1c2VkIGluIEFJTy5cbiAgICpcbiAgICogYGZhbHNlYCB3aWxsIHJlc3VsdCBpbiBhIGhpZGRlbiBjb21tYW5kLlxuICAgKi9cbiAgcHVibGljIGdldCBmdWxsRGVzY3JpYmUoKTogRnVsbERlc2NyaWJlIHwgZmFsc2Uge1xuICAgIHJldHVybiB0aGlzLmRlc2NyaWJlID09PSBmYWxzZVxuICAgICAgPyBmYWxzZVxuICAgICAgOiB7XG4gICAgICAgICAgZGVzY3JpYmU6IHRoaXMuZGVzY3JpYmUsXG4gICAgICAgICAgLi4uKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aFxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoOiBwYXRoXG4gICAgICAgICAgICAgICAgICAucmVsYXRpdmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uLycpLCB0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgpXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCBwYXRoLnBvc2l4LnNlcCksXG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uOiByZWFkRmlsZVN5bmModGhpcy5sb25nRGVzY3JpcHRpb25QYXRoLCAndXRmOCcpLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAvXFxyXFxuL2csXG4gICAgICAgICAgICAgICAgICAnXFxuJyxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kLnNwbGl0KCcgJywgMSlbMF07XG4gIH1cblxuICBhYnN0cmFjdCBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgYWJzdHJhY3QgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHwgbnVtYmVyIHwgdm9pZDtcblxuICBhc3luYyBoYW5kbGVyKGFyZ3M6IEFyZ3VtZW50c0NhbWVsQ2FzZTxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgXywgJDAsIC4uLm9wdGlvbnMgfSA9IGFyZ3M7XG5cbiAgICAvLyBDYW1lbGl6ZSBvcHRpb25zIGFzIHlhcmdzIHdpbGwgcmV0dXJuIHRoZSBvYmplY3QgaW4ga2ViYWItY2FzZSB3aGVuIGNhbWVsIGNhc2luZyBpcyBkaXNhYmxlZC5cbiAgICBjb25zdCBjYW1lbENhc2VkT3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRpb25zKSkge1xuICAgICAgY2FtZWxDYXNlZE9wdGlvbnNbeWFyZ3NQYXJzZXIuY2FtZWxDYXNlKGtleSldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gU2V0IHVwIGF1dG9jb21wbGV0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgIGNvbnN0IGF1dG9jb21wbGV0aW9uRXhpdENvZGUgPSBhd2FpdCBjb25zaWRlclNldHRpbmdVcEF1dG9jb21wbGV0aW9uKFxuICAgICAgdGhpcy5jb21tYW5kTmFtZSxcbiAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIsXG4gICAgKTtcbiAgICBpZiAoYXV0b2NvbXBsZXRpb25FeGl0Q29kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gYXV0b2NvbXBsZXRpb25FeGl0Q29kZTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEdhdGhlciBhbmQgcmVwb3J0IGFuYWx5dGljcy5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpO1xuICAgIGlmICh0aGlzLnNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoY2FtZWxDYXNlZE9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCBleGl0Q29kZTogbnVtYmVyIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgLy8gUnVuIGFuZCB0aW1lIGNvbW1hbmQuXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgZXhpdENvZGUgPSBhd2FpdCB0aGlzLnJ1bihjYW1lbENhc2VkT3B0aW9ucyBhcyBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgYW5hbHl0aWNzLnRpbWluZyh0aGlzLmNvbW1hbmROYW1lLCAnZHVyYXRpb24nLCBlbmRUaW1lIC0gc3RhcnRUaW1lKTtcbiAgICAgIGF3YWl0IGFuYWx5dGljcy5mbHVzaCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAodHlwZW9mIGV4aXRDb2RlID09PSAnbnVtYmVyJyAmJiBleGl0Q29kZSA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhcbiAgICBvcHRpb25zOiAoT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucykgfCBPdGhlck9wdGlvbnMsXG4gICAgcGF0aHM6IHN0cmluZ1tdID0gW10sXG4gICAgZGltZW5zaW9uczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdWFdIG9mIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3MpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uc1tuYW1lXTtcblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICBkaW1lbnNpb25zW3VhXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgYW5hbHl0aWNzLnBhZ2V2aWV3KCcvY29tbWFuZC8nICsgW3RoaXMuY29tbWFuZE5hbWUsIC4uLnBhdGhzXS5qb2luKCcvJyksIHtcbiAgICAgIGRpbWVuc2lvbnMsXG4gICAgICBtZXRyaWNzOiBbXSxcbiAgICB9KTtcbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBnZXRBbmFseXRpY3MoKTogUHJvbWlzZTxhbmFseXRpY3MuQW5hbHl0aWNzPiB7XG4gICAgcmV0dXJuIGNyZWF0ZUFuYWx5dGljcyhcbiAgICAgICEhdGhpcy5jb250ZXh0LndvcmtzcGFjZSxcbiAgICAgIC8vIERvbid0IHByb21wdCBmb3IgYG5nIHVwZGF0ZWAgYW5kIGBuZyBhbmFseXRpY3NgIGNvbW1hbmRzLlxuICAgICAgWyd1cGRhdGUnLCAnYW5hbHl0aWNzJ10uaW5jbHVkZXModGhpcy5jb21tYW5kTmFtZSksXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHNjaGVtYSBvcHRpb25zIHRvIGEgY29tbWFuZCBhbHNvIHRoaXMga2VlcHMgdHJhY2sgb2Ygb3B0aW9ucyB0aGF0IGFyZSByZXF1aXJlZCBmb3IgYW5hbHl0aWNzLlxuICAgKiAqKk5vdGU6KiogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIHRoZSBjb21tYW5kIGJ1bmRsZXIgbWV0aG9kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQ8VD4obG9jYWxZYXJnczogQXJndjxUPiwgb3B0aW9uczogT3B0aW9uW10pOiBBcmd2PFQ+IHtcbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgICAgIHBvc2l0aW9uYWwsXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhcyxcbiAgICAgICAgdXNlckFuYWx5dGljcyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICBpZiAocG9zaXRpb25hbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLm9wdGlvbihzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5wb3NpdGlvbmFsKHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpLCB7XG4gICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ2FycmF5JyB8fCB0eXBlID09PSAnY291bnQnID8gJ3N0cmluZycgOiB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWNvcmQgb3B0aW9uIG9mIGFuYWx5dGljcy5cbiAgICAgIGlmICh1c2VyQW5hbHl0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcy5zZXQobmFtZSwgdXNlckFuYWx5dGljcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0V29ya3NwYWNlT3JUaHJvdygpOiBBbmd1bGFyV29ya3NwYWNlIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIHdvcmtzcGFjZSBpcyByZXF1aXJlZCBmb3IgdGhpcyBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGtub3duIGNvbW1hbmQgbW9kdWxlIGVycm9yLlxuICogVGhpcyBpcyB1c2VkIHNvIGR1cmluZyBleGVjdXRhdGlvbiB3ZSBjYW4gZmlsdGVyIGJldHdlZW4ga25vd24gdmFsaWRhdGlvbiBlcnJvciBhbmQgcmVhbCBub24gaGFuZGxlZCBlcnJvcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tYW5kTW9kdWxlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuIl19