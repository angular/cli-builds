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
        this.scope = CommandScope.Both;
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
        let stopPeriodicFlushes;
        if (this.shouldReportAnalytics) {
            await this.reportAnalytics(camelCasedOptions);
            stopPeriodicFlushes = this.periodicAnalyticsFlush(analytics);
        }
        let exitCode;
        try {
            // Run and time command.
            const startTime = Date.now();
            exitCode = await this.run(camelCasedOptions);
            const endTime = Date.now();
            analytics.timing(this.commandName, 'duration', endTime - startTime);
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
            await (stopPeriodicFlushes === null || stopPeriodicFlushes === void 0 ? void 0 : stopPeriodicFlushes());
            if (typeof exitCode === 'number' && exitCode > 0) {
                process.exitCode = exitCode;
            }
        }
    }
    async reportAnalytics(options, paths = [], dimensions = [], title) {
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
            title,
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
        const booleanOptionsWithNoPrefix = new Set();
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
            let dashedName = core_1.strings.dasherize(name);
            // Handle options which have been defined in the schema with `no` prefix.
            if (type === 'boolean' && dashedName.startsWith('no-')) {
                dashedName = dashedName.slice(3);
                booleanOptionsWithNoPrefix.add(dashedName);
            }
            if (positional === undefined) {
                localYargs = localYargs.option(dashedName, {
                    type,
                    ...sharedOptions,
                });
            }
            else {
                localYargs = localYargs.positional(dashedName, {
                    type: type === 'array' || type === 'count' ? 'string' : type,
                    ...sharedOptions,
                });
            }
            // Record option of analytics.
            if (userAnalytics !== undefined) {
                this.optionsWithAnalytics.set(name, userAnalytics);
            }
        }
        // Handle options which have been defined in the schema with `no` prefix.
        if (booleanOptionsWithNoPrefix.size) {
            localYargs.middleware((options) => {
                for (const key of booleanOptionsWithNoPrefix) {
                    if (key in options) {
                        options[`no-${key}`] = !options[key];
                        delete options[key];
                    }
                }
            }, false);
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
    /**
     * Flush on an interval (if the event loop is waiting).
     *
     * @returns a method that when called will terminate the periodic
     * flush and call flush one last time.
     */
    periodicAnalyticsFlush(analytics) {
        let analyticsFlushPromise = Promise.resolve();
        const analyticsFlushInterval = setInterval(() => {
            analyticsFlushPromise = analyticsFlushPromise.then(() => analytics.flush());
        }, 2000);
        return () => {
            clearInterval(analyticsFlushInterval);
            // Flush one last time.
            return analyticsFlushPromise.then(() => analytics.flush());
        };
    }
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTJFO0FBQzNFLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFVN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUN6RCx3REFBMEU7QUFFMUUsa0RBQStDO0FBTS9DLElBQVksWUFPWDtBQVBELFdBQVksWUFBWTtJQUN0Qix3REFBd0Q7SUFDeEQsMkNBQUUsQ0FBQTtJQUNGLHlEQUF5RDtJQUN6RCw2Q0FBRyxDQUFBO0lBQ0gsK0RBQStEO0lBQy9ELCtDQUFJLENBQUE7QUFDTixDQUFDLEVBUFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFPdkI7QUF3Q0QsTUFBc0IsYUFBYTtJQVNqQyxZQUErQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUxuQywwQkFBcUIsR0FBWSxJQUFJLENBQUM7UUFDaEQsVUFBSyxHQUFpQixZQUFZLENBQUMsSUFBSSxDQUFDO1FBRWhDLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBRVQsQ0FBQztJQUUxRDs7Ozs7T0FLRztJQUNILElBQVcsWUFBWTtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSztZQUM1QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQztnQkFDRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO29CQUMxQixDQUFDLENBQUM7d0JBQ0UsMkJBQTJCLEVBQUUsSUFBSTs2QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENB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QUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE3R0M7SUFBQyxpQkFBTzs7OztpREFPUDtBQTVISCxzQ0FrT0M7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGtCQUFtQixTQUFRLEtBQUs7Q0FBRztBQUFoRCxnREFBZ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQXJndW1lbnRzLFxuICBBcmd1bWVudHNDYW1lbENhc2UsXG4gIEFyZ3YsXG4gIENhbWVsQ2FzZUtleSxcbiAgUG9zaXRpb25hbE9wdGlvbnMsXG4gIENvbW1hbmRNb2R1bGUgYXMgWWFyZ3NDb21tYW5kTW9kdWxlLFxuICBPcHRpb25zIGFzIFlhcmdzT3B0aW9ucyxcbn0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIGFzIHlhcmdzUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBjcmVhdGVBbmFseXRpY3MgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvY29tcGxldGlvbic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgdHlwZSBPcHRpb25zPFQ+ID0geyBba2V5IGluIGtleW9mIFQgYXMgQ2FtZWxDYXNlS2V5PGtleT5dOiBUW2tleV0gfTtcblxuZXhwb3J0IGVudW0gQ29tbWFuZFNjb3BlIHtcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIGluc2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgSW4sXG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBPdXQsXG4gIC8qKiBDb21tYW5kIGNhbiBydW4gaW5zaWRlIGFuZCBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBCb3RoLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VycmVudERpcmVjdG9yeTogc3RyaW5nO1xuICByb290OiBzdHJpbmc7XG4gIHdvcmtzcGFjZT86IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIGdsb2JhbENvbmZpZ3VyYXRpb246IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXI7XG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlclV0aWxzO1xuICAvKiogQXJndW1lbnRzIHBhcnNlZCBpbiBmcmVlLWZyb20gd2l0aG91dCBwYXJzZXIgY29uZmlndXJhdGlvbi4gKi9cbiAgYXJnczoge1xuICAgIHBvc2l0aW9uYWw6IHN0cmluZ1tdO1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGhlbHA6IGJvb2xlYW47XG4gICAgICBqc29uSGVscDogYm9vbGVhbjtcbiAgICAgIGdldFlhcmdzQ29tcGxldGlvbnM6IGJvb2xlYW47XG4gICAgfSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBPdGhlck9wdGlvbnMgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VCBleHRlbmRzIHt9ID0ge30+XG4gIGV4dGVuZHMgT21pdDxZYXJnc0NvbW1hbmRNb2R1bGU8e30sIFQ+LCAnYnVpbGRlcicgfCAnaGFuZGxlcic+IHtcbiAgLyoqIFNjb3BlIGluIHdoaWNoIHRoZSBjb21tYW5kIGNhbiBiZSBleGVjdXRlZCBpbi4gKi9cbiAgc2NvcGU6IENvbW1hbmRTY29wZTtcbiAgLyoqIFBhdGggdXNlZCB0byBsb2FkIHRoZSBsb25nIGRlc2NyaXB0aW9uIGZvciB0aGUgY29tbWFuZCBpbiBKU09OIGhlbHAgdGV4dC4gKi9cbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgLyoqIE9iamVjdCBkZWNsYXJpbmcgdGhlIG9wdGlvbnMgdGhlIGNvbW1hbmQgYWNjZXB0cywgb3IgYSBmdW5jdGlvbiBhY2NlcHRpbmcgYW5kIHJldHVybmluZyBhIHlhcmdzIGluc3RhbmNlLiAqL1xuICBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgLyoqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBwYXNzZWQgdGhlIHBhcnNlZCBhcmd2LiAqL1xuICBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZ1bGxEZXNjcmliZSB7XG4gIGRlc2NyaWJlPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmRNb2R1bGU8VCBleHRlbmRzIHt9ID0ge30+IGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+IHtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgY29tbWFuZDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBkZXNjcmliZTogc3RyaW5nIHwgZmFsc2U7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIHByb3RlY3RlZCByZWFkb25seSBzaG91bGRSZXBvcnRBbmFseXRpY3M6IGJvb2xlYW4gPSB0cnVlO1xuICByZWFkb25seSBzY29wZTogQ29tbWFuZFNjb3BlID0gQ29tbWFuZFNjb3BlLkJvdGg7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zV2l0aEFuYWx5dGljcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXNjcmlwdGlvbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgdGhlIGxvbmcgY29tbWFuZCBkZXNjcm9wdGlvbi5cbiAgICogVGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIEpTT04gaGVscCB3aWNoIGlzIHVzZWQgaW4gQUlPLlxuICAgKlxuICAgKiBgZmFsc2VgIHdpbGwgcmVzdWx0IGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGZ1bGxEZXNjcmliZSgpOiBGdWxsRGVzY3JpYmUgfCBmYWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZGVzY3JpYmUgPT09IGZhbHNlXG4gICAgICA/IGZhbHNlXG4gICAgICA6IHtcbiAgICAgICAgICBkZXNjcmliZTogdGhpcy5kZXNjcmliZSxcbiAgICAgICAgICAuLi4odGhpcy5sb25nRGVzY3JpcHRpb25QYXRoXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg6IHBhdGhcbiAgICAgICAgICAgICAgICAgIC5yZWxhdGl2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vJyksIHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aClcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIHBhdGgucG9zaXguc2VwKSxcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb246IHJlYWRGaWxlU3luYyh0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgsICd1dGY4JykucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgIC9cXHJcXG4vZyxcbiAgICAgICAgICAgICAgICAgICdcXG4nLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmQuc3BsaXQoJyAnLCAxKVswXTtcbiAgfVxuXG4gIGFic3RyYWN0IGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICBhYnN0cmFjdCBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xuXG4gIGFzeW5jIGhhbmRsZXIoYXJnczogQXJndW1lbnRzQ2FtZWxDYXNlPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBfLCAkMCwgLi4ub3B0aW9ucyB9ID0gYXJncztcblxuICAgIC8vIENhbWVsaXplIG9wdGlvbnMgYXMgeWFyZ3Mgd2lsbCByZXR1cm4gdGhlIG9iamVjdCBpbiBrZWJhYi1jYXNlIHdoZW4gY2FtZWwgY2FzaW5nIGlzIGRpc2FibGVkLlxuICAgIGNvbnN0IGNhbWVsQ2FzZWRPcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMpKSB7XG4gICAgICBjYW1lbENhc2VkT3B0aW9uc1t5YXJnc1BhcnNlci5jYW1lbENhc2Uoa2V5KV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgYXV0b2NvbXBsZXRpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgY29uc3QgYXV0b2NvbXBsZXRpb25FeGl0Q29kZSA9IGF3YWl0IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24oXG4gICAgICB0aGlzLmNvbW1hbmROYW1lLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICApO1xuICAgIGlmIChhdXRvY29tcGxldGlvbkV4aXRDb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBhdXRvY29tcGxldGlvbkV4aXRDb2RlO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2F0aGVyIGFuZCByZXBvcnQgYW5hbHl0aWNzLlxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgbGV0IHN0b3BQZXJpb2RpY0ZsdXNoZXM6ICgoKSA9PiBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZDtcblxuICAgIGlmICh0aGlzLnNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoY2FtZWxDYXNlZE9wdGlvbnMpO1xuICAgICAgc3RvcFBlcmlvZGljRmx1c2hlcyA9IHRoaXMucGVyaW9kaWNBbmFseXRpY3NGbHVzaChhbmFseXRpY3MpO1xuICAgIH1cblxuICAgIGxldCBleGl0Q29kZTogbnVtYmVyIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgLy8gUnVuIGFuZCB0aW1lIGNvbW1hbmQuXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgZXhpdENvZGUgPSBhd2FpdCB0aGlzLnJ1bihjYW1lbENhc2VkT3B0aW9ucyBhcyBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgYW5hbHl0aWNzLnRpbWluZyh0aGlzLmNvbW1hbmROYW1lLCAnZHVyYXRpb24nLCBlbmRUaW1lIC0gc3RhcnRUaW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZmF0YWwoYEVycm9yOiAke2UubWVzc2FnZX1gKTtcbiAgICAgICAgZXhpdENvZGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgc3RvcFBlcmlvZGljRmx1c2hlcz8uKCk7XG5cbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgICBwYXRoczogc3RyaW5nW10gPSBbXSxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICAgIHRpdGxlPzogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBhbmFseXRpY3MucGFnZXZpZXcoJy9jb21tYW5kLycgKyBbdGhpcy5jb21tYW5kTmFtZSwgLi4ucGF0aHNdLmpvaW4oJy8nKSwge1xuICAgICAgZGltZW5zaW9ucyxcbiAgICAgIG1ldHJpY3M6IFtdLFxuICAgICAgdGl0bGUsXG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgZ2V0QW5hbHl0aWNzKCk6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICAgIHJldHVybiBjcmVhdGVBbmFseXRpY3MoXG4gICAgICAhIXRoaXMuY29udGV4dC53b3Jrc3BhY2UsXG4gICAgICAvLyBEb24ndCBwcm9tcHQgZm9yIGBuZyB1cGRhdGVgIGFuZCBgbmcgYW5hbHl0aWNzYCBjb21tYW5kcy5cbiAgICAgIFsndXBkYXRlJywgJ2FuYWx5dGljcyddLmluY2x1ZGVzKHRoaXMuY29tbWFuZE5hbWUpLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBzY2hlbWEgb3B0aW9ucyB0byBhIGNvbW1hbmQgYWxzbyB0aGlzIGtlZXBzIHRyYWNrIG9mIG9wdGlvbnMgdGhhdCBhcmUgcmVxdWlyZWQgZm9yIGFuYWx5dGljcy5cbiAgICogKipOb3RlOioqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSB0aGUgY29tbWFuZCBidW5kbGVyIG1ldGhvZC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kPFQ+KGxvY2FsWWFyZ3M6IEFyZ3Y8VD4sIG9wdGlvbnM6IE9wdGlvbltdKTogQXJndjxUPiB7XG4gICAgY29uc3QgYm9vbGVhbk9wdGlvbnNXaXRoTm9QcmVmaXggPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVmYXVsdDogZGVmYXVsdFZhbCxcbiAgICAgICAgcG9zaXRpb25hbCxcbiAgICAgICAgZGVwcmVjYXRlZCxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIGFsaWFzLFxuICAgICAgICB1c2VyQW5hbHl0aWNzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGNob2ljZXMsXG4gICAgICB9ID0gb3B0aW9uO1xuXG4gICAgICBjb25zdCBzaGFyZWRPcHRpb25zOiBZYXJnc09wdGlvbnMgJiBQb3NpdGlvbmFsT3B0aW9ucyA9IHtcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGNob2ljZXMsXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG9ubHkgYmUgZG9uZSB3aGVuIGAtLWhlbHBgIGlzIHVzZWQgb3RoZXJ3aXNlIGRlZmF1bHQgd2lsbCBvdmVycmlkZSBvcHRpb25zIHNldCBpbiBhbmd1bGFyLmpzb24uXG4gICAgICAgIC4uLih0aGlzLmNvbnRleHQuYXJncy5vcHRpb25zLmhlbHAgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWwgfSA6IHt9KSxcbiAgICAgIH07XG5cbiAgICAgIGxldCBkYXNoZWROYW1lID0gc3RyaW5ncy5kYXNoZXJpemUobmFtZSk7XG5cbiAgICAgIC8vIEhhbmRsZSBvcHRpb25zIHdoaWNoIGhhdmUgYmVlbiBkZWZpbmVkIGluIHRoZSBzY2hlbWEgd2l0aCBgbm9gIHByZWZpeC5cbiAgICAgIGlmICh0eXBlID09PSAnYm9vbGVhbicgJiYgZGFzaGVkTmFtZS5zdGFydHNXaXRoKCduby0nKSkge1xuICAgICAgICBkYXNoZWROYW1lID0gZGFzaGVkTmFtZS5zbGljZSgzKTtcbiAgICAgICAgYm9vbGVhbk9wdGlvbnNXaXRoTm9QcmVmaXguYWRkKGRhc2hlZE5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9zaXRpb25hbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLm9wdGlvbihkYXNoZWROYW1lLCB7XG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLnBvc2l0aW9uYWwoZGFzaGVkTmFtZSwge1xuICAgICAgICAgIHR5cGU6IHR5cGUgPT09ICdhcnJheScgfHwgdHlwZSA9PT0gJ2NvdW50JyA/ICdzdHJpbmcnIDogdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVjb3JkIG9wdGlvbiBvZiBhbmFseXRpY3MuXG4gICAgICBpZiAodXNlckFuYWx5dGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3Muc2V0KG5hbWUsIHVzZXJBbmFseXRpY3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBvcHRpb25zIHdoaWNoIGhhdmUgYmVlbiBkZWZpbmVkIGluIHRoZSBzY2hlbWEgd2l0aCBgbm9gIHByZWZpeC5cbiAgICBpZiAoYm9vbGVhbk9wdGlvbnNXaXRoTm9QcmVmaXguc2l6ZSkge1xuICAgICAgbG9jYWxZYXJncy5taWRkbGV3YXJlKChvcHRpb25zOiBBcmd1bWVudHMpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgYm9vbGVhbk9wdGlvbnNXaXRoTm9QcmVmaXgpIHtcbiAgICAgICAgICBpZiAoa2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIG9wdGlvbnNbYG5vLSR7a2V5fWBdID0gIW9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0V29ya3NwYWNlT3JUaHJvdygpOiBBbmd1bGFyV29ya3NwYWNlIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIHdvcmtzcGFjZSBpcyByZXF1aXJlZCBmb3IgdGhpcyBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH1cblxuICAvKipcbiAgICogRmx1c2ggb24gYW4gaW50ZXJ2YWwgKGlmIHRoZSBldmVudCBsb29wIGlzIHdhaXRpbmcpLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1ldGhvZCB0aGF0IHdoZW4gY2FsbGVkIHdpbGwgdGVybWluYXRlIHRoZSBwZXJpb2RpY1xuICAgKiBmbHVzaCBhbmQgY2FsbCBmbHVzaCBvbmUgbGFzdCB0aW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBwZXJpb2RpY0FuYWx5dGljc0ZsdXNoKGFuYWx5dGljczogYW5hbHl0aWNzLkFuYWx5dGljcyk6ICgpID0+IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBjb25zdCBhbmFseXRpY3NGbHVzaEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgYW5hbHl0aWNzRmx1c2hQcm9taXNlID0gYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gYW5hbHl0aWNzLmZsdXNoKCkpO1xuICAgIH0sIDIwMDApO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCk7XG5cbiAgICAgIC8vIEZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAgICByZXR1cm4gYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gYW5hbHl0aWNzLmZsdXNoKCkpO1xuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGtub3duIGNvbW1hbmQgbW9kdWxlIGVycm9yLlxuICogVGhpcyBpcyB1c2VkIHNvIGR1cmluZyBleGVjdXRhdGlvbiB3ZSBjYW4gZmlsdGVyIGJldHdlZW4ga25vd24gdmFsaWRhdGlvbiBlcnJvciBhbmQgcmVhbCBub24gaGFuZGxlZCBlcnJvcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tYW5kTW9kdWxlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuIl19