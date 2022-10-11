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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandModuleError = exports.CommandModule = exports.CommandScope = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const analytics_1 = require("../analytics/analytics");
const analytics_collector_1 = require("../analytics/analytics-collector");
const analytics_parameters_1 = require("../analytics/analytics-parameters");
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
        const stopPeriodicFlushes = analytics && analytics.periodFlush();
        let exitCode;
        try {
            // Run and time command.
            if (analytics) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const internalMethods = yargs_1.default.getInternalMethods();
                // $0 generate component [name] -> generate_component
                // $0 add <collection> -> add
                const fullCommand = internalMethods.getUsageInstance().getUsage()[0][0]
                    .split(' ')
                    .filter((x) => {
                    const code = x.charCodeAt(0);
                    return code >= 97 && code <= 122;
                })
                    .join('_');
                analytics.reportCommandRunEvent(fullCommand);
            }
            exitCode = await this.run(camelCasedOptions);
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
    async getAnalytics() {
        if (!this.shouldReportAnalytics) {
            return undefined;
        }
        const userId = await (0, analytics_1.getAnalyticsUserId)(this.context, 
        // Don't prompt for `ng update` and `ng analytics` commands.
        ['update', 'analytics'].includes(this.commandName));
        return userId ? new analytics_collector_1.AnalyticsCollector(this.context, userId) : undefined;
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
    getAnalyticsParameters(options) {
        const parameters = {};
        const validEventCustomDimensionAndMetrics = new Set([
            ...Object.values(analytics_parameters_1.EventCustomDimension),
            ...Object.values(analytics_parameters_1.EventCustomMetric),
        ]);
        for (const [name, ua] of this.optionsWithAnalytics) {
            const value = options[name];
            if ((typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
                validEventCustomDimensionAndMetrics.has(ua)) {
                parameters[ua] = value;
            }
        }
        return parameters;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWdFO0FBQ2hFLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFDN0Isa0RBUWU7QUFDZiwyQ0FBc0Q7QUFDdEQsc0RBQTREO0FBQzVELDBFQUFzRTtBQUN0RSw0RUFBNEY7QUFDNUYsd0RBQTBFO0FBRTFFLGtEQUErQztBQU0vQyxJQUFZLFlBT1g7QUFQRCxXQUFZLFlBQVk7SUFDdEIsd0RBQXdEO0lBQ3hELDJDQUFFLENBQUE7SUFDRix5REFBeUQ7SUFDekQsNkNBQUcsQ0FBQTtJQUNILCtEQUErRDtJQUMvRCwrQ0FBSSxDQUFBO0FBQ04sQ0FBQyxFQVBXLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBT3ZCO0FBd0NELE1BQXNCLGFBQWE7SUFTakMsWUFBK0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFMbkMsMEJBQXFCLEdBQVksSUFBSSxDQUFDO1FBQ2hELFVBQUssR0FBaUIsWUFBWSxDQUFDLElBQUksQ0FBQztRQUVoQyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUVULENBQUM7SUFFMUQ7Ozs7O09BS0c7SUFDSCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUs7WUFDNUIsQ0FBQyxDQUFDLEtBQUs7WUFDUCxDQUFDLENBQUM7Z0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtvQkFDMUIsQ0FBQyxDQUFDO3dCQUNFLDJCQUEyQixFQUFF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LENBQUMsRUFBOEMsQ0FBQyxHQUFHLEtBQUssQ0FBQzthQUNwRTtTQUNGO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBN0hpQjtJQURmLGlCQUFPOzs7O2lEQWFQO0FBckhILHNDQXNPQztBQUVEOzs7R0FHRztBQUNILE1BQWEsa0JBQW1CLFNBQVEsS0FBSztDQUFHO0FBQWhELGdEQUFnRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHlhcmdzLCB7XG4gIEFyZ3VtZW50cyxcbiAgQXJndW1lbnRzQ2FtZWxDYXNlLFxuICBBcmd2LFxuICBDYW1lbENhc2VLZXksXG4gIFBvc2l0aW9uYWxPcHRpb25zLFxuICBDb21tYW5kTW9kdWxlIGFzIFlhcmdzQ29tbWFuZE1vZHVsZSxcbiAgT3B0aW9ucyBhcyBZYXJnc09wdGlvbnMsXG59IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciBhcyB5YXJnc1BhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgZ2V0QW5hbHl0aWNzVXNlcklkIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvcic7XG5pbXBvcnQgeyBFdmVudEN1c3RvbURpbWVuc2lvbiwgRXZlbnRDdXN0b21NZXRyaWMgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzLXBhcmFtZXRlcnMnO1xuaW1wb3J0IHsgY29uc2lkZXJTZXR0aW5nVXBBdXRvY29tcGxldGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9jb21wbGV0aW9uJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IG1lbW9pemUgfSBmcm9tICcuLi91dGlsaXRpZXMvbWVtb2l6ZSc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlclV0aWxzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnM8VD4gPSB7IFtrZXkgaW4ga2V5b2YgVCBhcyBDYW1lbENhc2VLZXk8a2V5Pl06IFRba2V5XSB9O1xuXG5leHBvcnQgZW51bSBDb21tYW5kU2NvcGUge1xuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gaW5zaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBJbixcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIE91dCxcbiAgLyoqIENvbW1hbmQgY2FuIHJ1biBpbnNpZGUgYW5kIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEJvdGgsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyZW50RGlyZWN0b3J5OiBzdHJpbmc7XG4gIHJvb3Q6IHN0cmluZztcbiAgd29ya3NwYWNlPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgZ2xvYmFsQ29uZmlndXJhdGlvbjogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyVXRpbHM7XG4gIC8qKiBBcmd1bWVudHMgcGFyc2VkIGluIGZyZWUtZnJvbSB3aXRob3V0IHBhcnNlciBjb25maWd1cmF0aW9uLiAqL1xuICBhcmdzOiB7XG4gICAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gICAgb3B0aW9uczoge1xuICAgICAgaGVscDogYm9vbGVhbjtcbiAgICAgIGpzb25IZWxwOiBib29sZWFuO1xuICAgICAgZ2V0WWFyZ3NDb21wbGV0aW9uczogYm9vbGVhbjtcbiAgICB9ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE90aGVyT3B0aW9ucyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUIGV4dGVuZHMge30gPSB7fT5cbiAgZXh0ZW5kcyBPbWl0PFlhcmdzQ29tbWFuZE1vZHVsZTx7fSwgVD4sICdidWlsZGVyJyB8ICdoYW5kbGVyJz4ge1xuICAvKiogU2NvcGUgaW4gd2hpY2ggdGhlIGNvbW1hbmQgY2FuIGJlIGV4ZWN1dGVkIGluLiAqL1xuICBzY29wZTogQ29tbWFuZFNjb3BlO1xuICAvKiogUGF0aCB1c2VkIHRvIGxvYWQgdGhlIGxvbmcgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kIGluIEpTT04gaGVscCB0ZXh0LiAqL1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICAvKiogT2JqZWN0IGRlY2xhcmluZyB0aGUgb3B0aW9ucyB0aGUgY29tbWFuZCBhY2NlcHRzLCBvciBhIGZ1bmN0aW9uIGFjY2VwdGluZyBhbmQgcmV0dXJuaW5nIGEgeWFyZ3MgaW5zdGFuY2UuICovXG4gIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICAvKiogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgcGFyc2VkIGFyZ3YuICovXG4gIHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnVsbERlc2NyaWJlIHtcbiAgZGVzY3JpYmU/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMge30gPSB7fT4gaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD4ge1xuICBhYnN0cmFjdCByZWFkb25seSBjb21tYW5kOiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGRlc2NyaWJlOiBzdHJpbmcgfCBmYWxzZTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljczogYm9vbGVhbiA9IHRydWU7XG4gIHJlYWRvbmx5IHNjb3BlOiBDb21tYW5kU2NvcGUgPSBDb21tYW5kU2NvcGUuQm90aDtcblxuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnNXaXRoQW5hbHl0aWNzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgY29udGV4dDogQ29tbWFuZENvbnRleHQpIHt9XG5cbiAgLyoqXG4gICAqIERlc2NyaXB0aW9uIG9iamVjdCB3aGljaCBjb250YWlucyB0aGUgbG9uZyBjb21tYW5kIGRlc2Nyb3B0aW9uLlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgSlNPTiBoZWxwIHdpY2ggaXMgdXNlZCBpbiBBSU8uXG4gICAqXG4gICAqIGBmYWxzZWAgd2lsbCByZXN1bHQgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICovXG4gIHB1YmxpYyBnZXQgZnVsbERlc2NyaWJlKCk6IEZ1bGxEZXNjcmliZSB8IGZhbHNlIHtcbiAgICByZXR1cm4gdGhpcy5kZXNjcmliZSA9PT0gZmFsc2VcbiAgICAgID8gZmFsc2VcbiAgICAgIDoge1xuICAgICAgICAgIGRlc2NyaWJlOiB0aGlzLmRlc2NyaWJlLFxuICAgICAgICAgIC4uLih0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGhcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aDogcGF0aFxuICAgICAgICAgICAgICAgICAgLnJlbGF0aXZlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi8nKSwgdGhpcy5sb25nRGVzY3JpcHRpb25QYXRoKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgcGF0aC5wb3NpeC5zZXApLFxuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvbjogcmVhZEZpbGVTeW5jKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aCwgJ3V0ZjgnKS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgL1xcclxcbi9nLFxuICAgICAgICAgICAgICAgICAgJ1xcbicsXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZC5zcGxpdCgnICcsIDEpWzBdO1xuICB9XG5cbiAgYWJzdHJhY3QgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIGFic3RyYWN0IHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG5cbiAgYXN5bmMgaGFuZGxlcihhcmdzOiBBcmd1bWVudHNDYW1lbENhc2U8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IF8sICQwLCAuLi5vcHRpb25zIH0gPSBhcmdzO1xuXG4gICAgLy8gQ2FtZWxpemUgb3B0aW9ucyBhcyB5YXJncyB3aWxsIHJldHVybiB0aGUgb2JqZWN0IGluIGtlYmFiLWNhc2Ugd2hlbiBjYW1lbCBjYXNpbmcgaXMgZGlzYWJsZWQuXG4gICAgY29uc3QgY2FtZWxDYXNlZE9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0aW9ucykpIHtcbiAgICAgIGNhbWVsQ2FzZWRPcHRpb25zW3lhcmdzUGFyc2VyLmNhbWVsQ2FzZShrZXkpXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBhdXRvY29tcGxldGlvbiBpZiBhcHByb3ByaWF0ZS5cbiAgICBjb25zdCBhdXRvY29tcGxldGlvbkV4aXRDb2RlID0gYXdhaXQgY29uc2lkZXJTZXR0aW5nVXBBdXRvY29tcGxldGlvbihcbiAgICAgIHRoaXMuY29tbWFuZE5hbWUsXG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLFxuICAgICk7XG4gICAgaWYgKGF1dG9jb21wbGV0aW9uRXhpdENvZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF1dG9jb21wbGV0aW9uRXhpdENvZGU7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHYXRoZXIgYW5kIHJlcG9ydCBhbmFseXRpY3MuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBjb25zdCBzdG9wUGVyaW9kaWNGbHVzaGVzID0gYW5hbHl0aWNzICYmIGFuYWx5dGljcy5wZXJpb2RGbHVzaCgpO1xuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBSdW4gYW5kIHRpbWUgY29tbWFuZC5cbiAgICAgIGlmIChhbmFseXRpY3MpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgY29uc3QgaW50ZXJuYWxNZXRob2RzID0gKHlhcmdzIGFzIGFueSkuZ2V0SW50ZXJuYWxNZXRob2RzKCk7XG4gICAgICAgIC8vICQwIGdlbmVyYXRlIGNvbXBvbmVudCBbbmFtZV0gLT4gZ2VuZXJhdGVfY29tcG9uZW50XG4gICAgICAgIC8vICQwIGFkZCA8Y29sbGVjdGlvbj4gLT4gYWRkXG4gICAgICAgIGNvbnN0IGZ1bGxDb21tYW5kID0gKGludGVybmFsTWV0aG9kcy5nZXRVc2FnZUluc3RhbmNlKCkuZ2V0VXNhZ2UoKVswXVswXSBhcyBzdHJpbmcpXG4gICAgICAgICAgLnNwbGl0KCcgJylcbiAgICAgICAgICAuZmlsdGVyKCh4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2RlID0geC5jaGFyQ29kZUF0KDApO1xuXG4gICAgICAgICAgICByZXR1cm4gY29kZSA+PSA5NyAmJiBjb2RlIDw9IDEyMjtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5qb2luKCdfJyk7XG5cbiAgICAgICAgYW5hbHl0aWNzLnJlcG9ydENvbW1hbmRSdW5FdmVudChmdWxsQ29tbWFuZCk7XG4gICAgICB9XG5cbiAgICAgIGV4aXRDb2RlID0gYXdhaXQgdGhpcy5ydW4oY2FtZWxDYXNlZE9wdGlvbnMgYXMgT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IHN0b3BQZXJpb2RpY0ZsdXNoZXM/LigpO1xuXG4gICAgICBpZiAodHlwZW9mIGV4aXRDb2RlID09PSAnbnVtYmVyJyAmJiBleGl0Q29kZSA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEBtZW1vaXplXG4gIHByb3RlY3RlZCBhc3luYyBnZXRBbmFseXRpY3MoKTogUHJvbWlzZTxBbmFseXRpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ+IHtcbiAgICBpZiAoIXRoaXMuc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHVzZXJJZCA9IGF3YWl0IGdldEFuYWx5dGljc1VzZXJJZChcbiAgICAgIHRoaXMuY29udGV4dCxcbiAgICAgIC8vIERvbid0IHByb21wdCBmb3IgYG5nIHVwZGF0ZWAgYW5kIGBuZyBhbmFseXRpY3NgIGNvbW1hbmRzLlxuICAgICAgWyd1cGRhdGUnLCAnYW5hbHl0aWNzJ10uaW5jbHVkZXModGhpcy5jb21tYW5kTmFtZSksXG4gICAgKTtcblxuICAgIHJldHVybiB1c2VySWQgPyBuZXcgQW5hbHl0aWNzQ29sbGVjdG9yKHRoaXMuY29udGV4dCwgdXNlcklkKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHNjaGVtYSBvcHRpb25zIHRvIGEgY29tbWFuZCBhbHNvIHRoaXMga2VlcHMgdHJhY2sgb2Ygb3B0aW9ucyB0aGF0IGFyZSByZXF1aXJlZCBmb3IgYW5hbHl0aWNzLlxuICAgKiAqKk5vdGU6KiogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIHRoZSBjb21tYW5kIGJ1bmRsZXIgbWV0aG9kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQ8VD4obG9jYWxZYXJnczogQXJndjxUPiwgb3B0aW9uczogT3B0aW9uW10pOiBBcmd2PFQ+IHtcbiAgICBjb25zdCBib29sZWFuT3B0aW9uc1dpdGhOb1ByZWZpeCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgY29uc3Qge1xuICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsLFxuICAgICAgICBwb3NpdGlvbmFsLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIHVzZXJBbmFseXRpY3MsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgIH0gPSBvcHRpb247XG5cbiAgICAgIGNvbnN0IHNoYXJlZE9wdGlvbnM6IFlhcmdzT3B0aW9ucyAmIFBvc2l0aW9uYWxPcHRpb25zID0ge1xuICAgICAgICBhbGlhcyxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgZGVwcmVjYXRlZCxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgb25seSBiZSBkb25lIHdoZW4gYC0taGVscGAgaXMgdXNlZCBvdGhlcndpc2UgZGVmYXVsdCB3aWxsIG92ZXJyaWRlIG9wdGlvbnMgc2V0IGluIGFuZ3VsYXIuanNvbi5cbiAgICAgICAgLi4uKHRoaXMuY29udGV4dC5hcmdzLm9wdGlvbnMuaGVscCA/IHsgZGVmYXVsdDogZGVmYXVsdFZhbCB9IDoge30pLFxuICAgICAgfTtcblxuICAgICAgbGV0IGRhc2hlZE5hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShuYW1lKTtcblxuICAgICAgLy8gSGFuZGxlIG9wdGlvbnMgd2hpY2ggaGF2ZSBiZWVuIGRlZmluZWQgaW4gdGhlIHNjaGVtYSB3aXRoIGBub2AgcHJlZml4LlxuICAgICAgaWYgKHR5cGUgPT09ICdib29sZWFuJyAmJiBkYXNoZWROYW1lLnN0YXJ0c1dpdGgoJ25vLScpKSB7XG4gICAgICAgIGRhc2hlZE5hbWUgPSBkYXNoZWROYW1lLnNsaWNlKDMpO1xuICAgICAgICBib29sZWFuT3B0aW9uc1dpdGhOb1ByZWZpeC5hZGQoZGFzaGVkTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3NpdGlvbmFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3Mub3B0aW9uKGRhc2hlZE5hbWUsIHtcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MucG9zaXRpb25hbChkYXNoZWROYW1lLCB7XG4gICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ2FycmF5JyB8fCB0eXBlID09PSAnY291bnQnID8gJ3N0cmluZycgOiB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWNvcmQgb3B0aW9uIG9mIGFuYWx5dGljcy5cbiAgICAgIGlmICh1c2VyQW5hbHl0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcy5zZXQobmFtZSwgdXNlckFuYWx5dGljcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG9wdGlvbnMgd2hpY2ggaGF2ZSBiZWVuIGRlZmluZWQgaW4gdGhlIHNjaGVtYSB3aXRoIGBub2AgcHJlZml4LlxuICAgIGlmIChib29sZWFuT3B0aW9uc1dpdGhOb1ByZWZpeC5zaXplKSB7XG4gICAgICBsb2NhbFlhcmdzLm1pZGRsZXdhcmUoKG9wdGlvbnM6IEFyZ3VtZW50cykgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBib29sZWFuT3B0aW9uc1dpdGhOb1ByZWZpeCkge1xuICAgICAgICAgIGlmIChrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9uc1tgbm8tJHtrZXl9YF0gPSAhb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnNba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIGZhbHNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRXb3Jrc3BhY2VPclRocm93KCk6IEFuZ3VsYXJXb3Jrc3BhY2Uge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0Egd29ya3NwYWNlIGlzIHJlcXVpcmVkIGZvciB0aGlzIGNvbW1hbmQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdvcmtzcGFjZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbHVzaCBvbiBhbiBpbnRlcnZhbCAoaWYgdGhlIGV2ZW50IGxvb3AgaXMgd2FpdGluZykuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWV0aG9kIHRoYXQgd2hlbiBjYWxsZWQgd2lsbCB0ZXJtaW5hdGUgdGhlIHBlcmlvZGljXG4gICAqIGZsdXNoIGFuZCBjYWxsIGZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0QW5hbHl0aWNzUGFyYW1ldGVycyhcbiAgICBvcHRpb25zOiAoT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucykgfCBPdGhlck9wdGlvbnMsXG4gICk6IFBhcnRpYWw8UmVjb3JkPEV2ZW50Q3VzdG9tRGltZW5zaW9uIHwgRXZlbnRDdXN0b21NZXRyaWMsIHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXI+PiB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFydGlhbDxcbiAgICAgIFJlY29yZDxFdmVudEN1c3RvbURpbWVuc2lvbiB8IEV2ZW50Q3VzdG9tTWV0cmljLCBzdHJpbmcgfCBib29sZWFuIHwgbnVtYmVyPlxuICAgID4gPSB7fTtcblxuICAgIGNvbnN0IHZhbGlkRXZlbnRDdXN0b21EaW1lbnNpb25BbmRNZXRyaWNzID0gbmV3IFNldChbXG4gICAgICAuLi5PYmplY3QudmFsdWVzKEV2ZW50Q3VzdG9tRGltZW5zaW9uKSxcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoRXZlbnRDdXN0b21NZXRyaWMpLFxuICAgIF0pO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgdWFdIG9mIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3MpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIGlmIChcbiAgICAgICAgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykgJiZcbiAgICAgICAgdmFsaWRFdmVudEN1c3RvbURpbWVuc2lvbkFuZE1ldHJpY3MuaGFzKHVhIGFzIEV2ZW50Q3VzdG9tRGltZW5zaW9uIHwgRXZlbnRDdXN0b21NZXRyaWMpXG4gICAgICApIHtcbiAgICAgICAgcGFyYW1ldGVyc1t1YSBhcyBFdmVudEN1c3RvbURpbWVuc2lvbiB8IEV2ZW50Q3VzdG9tTWV0cmljXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBrbm93biBjb21tYW5kIG1vZHVsZSBlcnJvci5cbiAqIFRoaXMgaXMgdXNlZCBzbyBkdXJpbmcgZXhlY3V0YXRpb24gd2UgY2FuIGZpbHRlciBiZXR3ZWVuIGtub3duIHZhbGlkYXRpb24gZXJyb3IgYW5kIHJlYWwgbm9uIGhhbmRsZWQgZXJyb3JzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbWFuZE1vZHVsZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbiJdfQ==