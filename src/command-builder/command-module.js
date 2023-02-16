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
            if (analytics) {
                this.reportCommandRunAnalytics(analytics);
                this.reportWorkspaceInfoAnalytics(analytics);
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
            await stopPeriodicFlushes?.();
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
    reportCommandRunAnalytics(analytics) {
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
    reportWorkspaceInfoAnalytics(analytics) {
        const { workspace } = this.context;
        if (!workspace) {
            return;
        }
        let applicationProjectsCount = 0;
        let librariesProjectsCount = 0;
        for (const project of workspace.projects.values()) {
            switch (project.extensions['projectType']) {
                case 'application':
                    applicationProjectsCount++;
                    break;
                case 'library':
                    librariesProjectsCount++;
                    break;
            }
        }
        analytics.reportWorkspaceInfoEvent({
            [analytics_parameters_1.EventCustomMetric.AllProjectsCount]: librariesProjectsCount + applicationProjectsCount,
            [analytics_parameters_1.EventCustomMetric.ApplicationProjectsCount]: applicationProjectsCount,
            [analytics_parameters_1.EventCustomMetric.LibraryProjectsCount]: librariesProjectsCount,
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWdFO0FBQ2hFLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFDN0Isa0RBUWU7QUFDZiwyQ0FBc0Q7QUFDdEQsc0RBQTREO0FBQzVELDBFQUFzRTtBQUN0RSw0RUFBNEY7QUFDNUYsd0RBQTBFO0FBRTFFLGtEQUErQztBQU0vQyxJQUFZLFlBT1g7QUFQRCxXQUFZLFlBQVk7SUFDdEIsd0RBQXdEO0lBQ3hELDJDQUFFLENBQUE7SUFDRix5REFBeUQ7SUFDekQsNkNBQUcsQ0FBQTtJQUNILCtEQUErRDtJQUMvRCwrQ0FBSSxDQUFBO0FBQ04sQ0FBQyxFQVBXLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBT3ZCO0FBd0NELE1BQXNCLGFBQWE7SUFTakMsWUFBK0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFMbkMsMEJBQXFCLEdBQVksSUFBSSxDQUFDO1FBQ2hELFVBQUssR0FBaUIsWUFBWSxDQUFDLElBQUksQ0FBQztRQUVoQyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUVULENBQUM7SUFFMUQ7Ozs7O09BS0c7SUFDSCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUs7WUFDNUIsQ0FBQyxDQUFDLEtBQUs7WUFDUCxDQUFDLENBQUM7Z0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtvQkFDMUIsQ0FBQyxDQUFDO3dCQUNFLDJCQUEyQixFQUFF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b29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHlhcmdzLCB7XG4gIEFyZ3VtZW50cyxcbiAgQXJndW1lbnRzQ2FtZWxDYXNlLFxuICBBcmd2LFxuICBDYW1lbENhc2VLZXksXG4gIFBvc2l0aW9uYWxPcHRpb25zLFxuICBDb21tYW5kTW9kdWxlIGFzIFlhcmdzQ29tbWFuZE1vZHVsZSxcbiAgT3B0aW9ucyBhcyBZYXJnc09wdGlvbnMsXG59IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciBhcyB5YXJnc1BhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgZ2V0QW5hbHl0aWNzVXNlcklkIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb2xsZWN0b3IgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzLWNvbGxlY3Rvcic7XG5pbXBvcnQgeyBFdmVudEN1c3RvbURpbWVuc2lvbiwgRXZlbnRDdXN0b21NZXRyaWMgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzLXBhcmFtZXRlcnMnO1xuaW1wb3J0IHsgY29uc2lkZXJTZXR0aW5nVXBBdXRvY29tcGxldGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9jb21wbGV0aW9uJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IG1lbW9pemUgfSBmcm9tICcuLi91dGlsaXRpZXMvbWVtb2l6ZSc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlclV0aWxzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnM8VD4gPSB7IFtrZXkgaW4ga2V5b2YgVCBhcyBDYW1lbENhc2VLZXk8a2V5Pl06IFRba2V5XSB9O1xuXG5leHBvcnQgZW51bSBDb21tYW5kU2NvcGUge1xuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gaW5zaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBJbixcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIE91dCxcbiAgLyoqIENvbW1hbmQgY2FuIHJ1biBpbnNpZGUgYW5kIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEJvdGgsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyZW50RGlyZWN0b3J5OiBzdHJpbmc7XG4gIHJvb3Q6IHN0cmluZztcbiAgd29ya3NwYWNlPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgZ2xvYmFsQ29uZmlndXJhdGlvbjogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyVXRpbHM7XG4gIC8qKiBBcmd1bWVudHMgcGFyc2VkIGluIGZyZWUtZnJvbSB3aXRob3V0IHBhcnNlciBjb25maWd1cmF0aW9uLiAqL1xuICBhcmdzOiB7XG4gICAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gICAgb3B0aW9uczoge1xuICAgICAgaGVscDogYm9vbGVhbjtcbiAgICAgIGpzb25IZWxwOiBib29sZWFuO1xuICAgICAgZ2V0WWFyZ3NDb21wbGV0aW9uczogYm9vbGVhbjtcbiAgICB9ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE90aGVyT3B0aW9ucyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUIGV4dGVuZHMge30gPSB7fT5cbiAgZXh0ZW5kcyBPbWl0PFlhcmdzQ29tbWFuZE1vZHVsZTx7fSwgVD4sICdidWlsZGVyJyB8ICdoYW5kbGVyJz4ge1xuICAvKiogU2NvcGUgaW4gd2hpY2ggdGhlIGNvbW1hbmQgY2FuIGJlIGV4ZWN1dGVkIGluLiAqL1xuICBzY29wZTogQ29tbWFuZFNjb3BlO1xuICAvKiogUGF0aCB1c2VkIHRvIGxvYWQgdGhlIGxvbmcgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kIGluIEpTT04gaGVscCB0ZXh0LiAqL1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICAvKiogT2JqZWN0IGRlY2xhcmluZyB0aGUgb3B0aW9ucyB0aGUgY29tbWFuZCBhY2NlcHRzLCBvciBhIGZ1bmN0aW9uIGFjY2VwdGluZyBhbmQgcmV0dXJuaW5nIGEgeWFyZ3MgaW5zdGFuY2UuICovXG4gIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICAvKiogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgcGFyc2VkIGFyZ3YuICovXG4gIHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnVsbERlc2NyaWJlIHtcbiAgZGVzY3JpYmU/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMge30gPSB7fT4gaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD4ge1xuICBhYnN0cmFjdCByZWFkb25seSBjb21tYW5kOiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGRlc2NyaWJlOiBzdHJpbmcgfCBmYWxzZTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljczogYm9vbGVhbiA9IHRydWU7XG4gIHJlYWRvbmx5IHNjb3BlOiBDb21tYW5kU2NvcGUgPSBDb21tYW5kU2NvcGUuQm90aDtcblxuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnNXaXRoQW5hbHl0aWNzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgY29udGV4dDogQ29tbWFuZENvbnRleHQpIHt9XG5cbiAgLyoqXG4gICAqIERlc2NyaXB0aW9uIG9iamVjdCB3aGljaCBjb250YWlucyB0aGUgbG9uZyBjb21tYW5kIGRlc2Nyb3B0aW9uLlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgSlNPTiBoZWxwIHdpY2ggaXMgdXNlZCBpbiBBSU8uXG4gICAqXG4gICAqIGBmYWxzZWAgd2lsbCByZXN1bHQgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICovXG4gIHB1YmxpYyBnZXQgZnVsbERlc2NyaWJlKCk6IEZ1bGxEZXNjcmliZSB8IGZhbHNlIHtcbiAgICByZXR1cm4gdGhpcy5kZXNjcmliZSA9PT0gZmFsc2VcbiAgICAgID8gZmFsc2VcbiAgICAgIDoge1xuICAgICAgICAgIGRlc2NyaWJlOiB0aGlzLmRlc2NyaWJlLFxuICAgICAgICAgIC4uLih0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGhcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aDogcGF0aFxuICAgICAgICAgICAgICAgICAgLnJlbGF0aXZlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi8nKSwgdGhpcy5sb25nRGVzY3JpcHRpb25QYXRoKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgcGF0aC5wb3NpeC5zZXApLFxuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvbjogcmVhZEZpbGVTeW5jKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aCwgJ3V0ZjgnKS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgL1xcclxcbi9nLFxuICAgICAgICAgICAgICAgICAgJ1xcbicsXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZC5zcGxpdCgnICcsIDEpWzBdO1xuICB9XG5cbiAgYWJzdHJhY3QgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIGFic3RyYWN0IHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG5cbiAgYXN5bmMgaGFuZGxlcihhcmdzOiBBcmd1bWVudHNDYW1lbENhc2U8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IF8sICQwLCAuLi5vcHRpb25zIH0gPSBhcmdzO1xuXG4gICAgLy8gQ2FtZWxpemUgb3B0aW9ucyBhcyB5YXJncyB3aWxsIHJldHVybiB0aGUgb2JqZWN0IGluIGtlYmFiLWNhc2Ugd2hlbiBjYW1lbCBjYXNpbmcgaXMgZGlzYWJsZWQuXG4gICAgY29uc3QgY2FtZWxDYXNlZE9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0aW9ucykpIHtcbiAgICAgIGNhbWVsQ2FzZWRPcHRpb25zW3lhcmdzUGFyc2VyLmNhbWVsQ2FzZShrZXkpXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBhdXRvY29tcGxldGlvbiBpZiBhcHByb3ByaWF0ZS5cbiAgICBjb25zdCBhdXRvY29tcGxldGlvbkV4aXRDb2RlID0gYXdhaXQgY29uc2lkZXJTZXR0aW5nVXBBdXRvY29tcGxldGlvbihcbiAgICAgIHRoaXMuY29tbWFuZE5hbWUsXG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLFxuICAgICk7XG4gICAgaWYgKGF1dG9jb21wbGV0aW9uRXhpdENvZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF1dG9jb21wbGV0aW9uRXhpdENvZGU7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHYXRoZXIgYW5kIHJlcG9ydCBhbmFseXRpY3MuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBjb25zdCBzdG9wUGVyaW9kaWNGbHVzaGVzID0gYW5hbHl0aWNzICYmIGFuYWx5dGljcy5wZXJpb2RGbHVzaCgpO1xuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBpZiAoYW5hbHl0aWNzKSB7XG4gICAgICAgIHRoaXMucmVwb3J0Q29tbWFuZFJ1bkFuYWx5dGljcyhhbmFseXRpY3MpO1xuICAgICAgICB0aGlzLnJlcG9ydFdvcmtzcGFjZUluZm9BbmFseXRpY3MoYW5hbHl0aWNzKTtcbiAgICAgIH1cblxuICAgICAgZXhpdENvZGUgPSBhd2FpdCB0aGlzLnJ1bihjYW1lbENhc2VkT3B0aW9ucyBhcyBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZmF0YWwoYEVycm9yOiAke2UubWVzc2FnZX1gKTtcbiAgICAgICAgZXhpdENvZGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgc3RvcFBlcmlvZGljRmx1c2hlcz8uKCk7XG5cbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFuYWx5dGljcygpOiBQcm9taXNlPEFuYWx5dGljc0NvbGxlY3RvciB8IHVuZGVmaW5lZD4ge1xuICAgIGlmICghdGhpcy5zaG91bGRSZXBvcnRBbmFseXRpY3MpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlcklkID0gYXdhaXQgZ2V0QW5hbHl0aWNzVXNlcklkKFxuICAgICAgdGhpcy5jb250ZXh0LFxuICAgICAgLy8gRG9uJ3QgcHJvbXB0IGZvciBgbmcgdXBkYXRlYCBhbmQgYG5nIGFuYWx5dGljc2AgY29tbWFuZHMuXG4gICAgICBbJ3VwZGF0ZScsICdhbmFseXRpY3MnXS5pbmNsdWRlcyh0aGlzLmNvbW1hbmROYW1lKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHVzZXJJZCA/IG5ldyBBbmFseXRpY3NDb2xsZWN0b3IodGhpcy5jb250ZXh0LCB1c2VySWQpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgc2NoZW1hIG9wdGlvbnMgdG8gYSBjb21tYW5kIGFsc28gdGhpcyBrZWVwcyB0cmFjayBvZiBvcHRpb25zIHRoYXQgYXJlIHJlcXVpcmVkIGZvciBhbmFseXRpY3MuXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGNvbW1hbmQgYnVuZGxlciBtZXRob2QuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZDxUPihsb2NhbFlhcmdzOiBBcmd2PFQ+LCBvcHRpb25zOiBPcHRpb25bXSk6IEFyZ3Y8VD4ge1xuICAgIGNvbnN0IGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgICAgIHBvc2l0aW9uYWwsXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhcyxcbiAgICAgICAgdXNlckFuYWx5dGljcyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICBsZXQgZGFzaGVkTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpO1xuXG4gICAgICAvLyBIYW5kbGUgb3B0aW9ucyB3aGljaCBoYXZlIGJlZW4gZGVmaW5lZCBpbiB0aGUgc2NoZW1hIHdpdGggYG5vYCBwcmVmaXguXG4gICAgICBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nICYmIGRhc2hlZE5hbWUuc3RhcnRzV2l0aCgnbm8tJykpIHtcbiAgICAgICAgZGFzaGVkTmFtZSA9IGRhc2hlZE5hbWUuc2xpY2UoMyk7XG4gICAgICAgIGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4LmFkZChkYXNoZWROYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5vcHRpb24oZGFzaGVkTmFtZSwge1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5wb3NpdGlvbmFsKGRhc2hlZE5hbWUsIHtcbiAgICAgICAgICB0eXBlOiB0eXBlID09PSAnYXJyYXknIHx8IHR5cGUgPT09ICdjb3VudCcgPyAnc3RyaW5nJyA6IHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlY29yZCBvcHRpb24gb2YgYW5hbHl0aWNzLlxuICAgICAgaWYgKHVzZXJBbmFseXRpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnNXaXRoQW5hbHl0aWNzLnNldChuYW1lLCB1c2VyQW5hbHl0aWNzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgb3B0aW9ucyB3aGljaCBoYXZlIGJlZW4gZGVmaW5lZCBpbiB0aGUgc2NoZW1hIHdpdGggYG5vYCBwcmVmaXguXG4gICAgaWYgKGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4LnNpemUpIHtcbiAgICAgIGxvY2FsWWFyZ3MubWlkZGxld2FyZSgob3B0aW9uczogQXJndW1lbnRzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4KSB7XG4gICAgICAgICAgaWYgKGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zW2Buby0ke2tleX1gXSA9ICFvcHRpb25zW2tleV07XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9uc1trZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgZmFsc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFdvcmtzcGFjZU9yVGhyb3coKTogQW5ndWxhcldvcmtzcGFjZSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEZsdXNoIG9uIGFuIGludGVydmFsIChpZiB0aGUgZXZlbnQgbG9vcCBpcyB3YWl0aW5nKS5cbiAgICpcbiAgICogQHJldHVybnMgYSBtZXRob2QgdGhhdCB3aGVuIGNhbGxlZCB3aWxsIHRlcm1pbmF0ZSB0aGUgcGVyaW9kaWNcbiAgICogZmx1c2ggYW5kIGNhbGwgZmx1c2ggb25lIGxhc3QgdGltZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRBbmFseXRpY3NQYXJhbWV0ZXJzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgKTogUGFydGlhbDxSZWNvcmQ8RXZlbnRDdXN0b21EaW1lbnNpb24gfCBFdmVudEN1c3RvbU1ldHJpYywgc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlcj4+IHtcbiAgICBjb25zdCBwYXJhbWV0ZXJzOiBQYXJ0aWFsPFxuICAgICAgUmVjb3JkPEV2ZW50Q3VzdG9tRGltZW5zaW9uIHwgRXZlbnRDdXN0b21NZXRyaWMsIHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXI+XG4gICAgPiA9IHt9O1xuXG4gICAgY29uc3QgdmFsaWRFdmVudEN1c3RvbURpbWVuc2lvbkFuZE1ldHJpY3MgPSBuZXcgU2V0KFtcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoRXZlbnRDdXN0b21EaW1lbnNpb24pLFxuICAgICAgLi4uT2JqZWN0LnZhbHVlcyhFdmVudEN1c3RvbU1ldHJpYyksXG4gICAgXSk7XG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSAmJlxuICAgICAgICB2YWxpZEV2ZW50Q3VzdG9tRGltZW5zaW9uQW5kTWV0cmljcy5oYXModWEgYXMgRXZlbnRDdXN0b21EaW1lbnNpb24gfCBFdmVudEN1c3RvbU1ldHJpYylcbiAgICAgICkge1xuICAgICAgICBwYXJhbWV0ZXJzW3VhIGFzIEV2ZW50Q3VzdG9tRGltZW5zaW9uIHwgRXZlbnRDdXN0b21NZXRyaWNdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtZXRlcnM7XG4gIH1cblxuICBwcml2YXRlIHJlcG9ydENvbW1hbmRSdW5BbmFseXRpY3MoYW5hbHl0aWNzOiBBbmFseXRpY3NDb2xsZWN0b3IpOiB2b2lkIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IGludGVybmFsTWV0aG9kcyA9ICh5YXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpO1xuICAgIC8vICQwIGdlbmVyYXRlIGNvbXBvbmVudCBbbmFtZV0gLT4gZ2VuZXJhdGVfY29tcG9uZW50XG4gICAgLy8gJDAgYWRkIDxjb2xsZWN0aW9uPiAtPiBhZGRcbiAgICBjb25zdCBmdWxsQ29tbWFuZCA9IChpbnRlcm5hbE1ldGhvZHMuZ2V0VXNhZ2VJbnN0YW5jZSgpLmdldFVzYWdlKClbMF1bMF0gYXMgc3RyaW5nKVxuICAgICAgLnNwbGl0KCcgJylcbiAgICAgIC5maWx0ZXIoKHgpID0+IHtcbiAgICAgICAgY29uc3QgY29kZSA9IHguY2hhckNvZGVBdCgwKTtcblxuICAgICAgICByZXR1cm4gY29kZSA+PSA5NyAmJiBjb2RlIDw9IDEyMjtcbiAgICAgIH0pXG4gICAgICAuam9pbignXycpO1xuXG4gICAgYW5hbHl0aWNzLnJlcG9ydENvbW1hbmRSdW5FdmVudChmdWxsQ29tbWFuZCk7XG4gIH1cblxuICBwcml2YXRlIHJlcG9ydFdvcmtzcGFjZUluZm9BbmFseXRpY3MoYW5hbHl0aWNzOiBBbmFseXRpY3NDb2xsZWN0b3IpOiB2b2lkIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGFwcGxpY2F0aW9uUHJvamVjdHNDb3VudCA9IDA7XG4gICAgbGV0IGxpYnJhcmllc1Byb2plY3RzQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiB3b3Jrc3BhY2UucHJvamVjdHMudmFsdWVzKCkpIHtcbiAgICAgIHN3aXRjaCAocHJvamVjdC5leHRlbnNpb25zWydwcm9qZWN0VHlwZSddKSB7XG4gICAgICAgIGNhc2UgJ2FwcGxpY2F0aW9uJzpcbiAgICAgICAgICBhcHBsaWNhdGlvblByb2plY3RzQ291bnQrKztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbGlicmFyeSc6XG4gICAgICAgICAgbGlicmFyaWVzUHJvamVjdHNDb3VudCsrO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFuYWx5dGljcy5yZXBvcnRXb3Jrc3BhY2VJbmZvRXZlbnQoe1xuICAgICAgW0V2ZW50Q3VzdG9tTWV0cmljLkFsbFByb2plY3RzQ291bnRdOiBsaWJyYXJpZXNQcm9qZWN0c0NvdW50ICsgYXBwbGljYXRpb25Qcm9qZWN0c0NvdW50LFxuICAgICAgW0V2ZW50Q3VzdG9tTWV0cmljLkFwcGxpY2F0aW9uUHJvamVjdHNDb3VudF06IGFwcGxpY2F0aW9uUHJvamVjdHNDb3VudCxcbiAgICAgIFtFdmVudEN1c3RvbU1ldHJpYy5MaWJyYXJ5UHJvamVjdHNDb3VudF06IGxpYnJhcmllc1Byb2plY3RzQ291bnQsXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGtub3duIGNvbW1hbmQgbW9kdWxlIGVycm9yLlxuICogVGhpcyBpcyB1c2VkIHNvIGR1cmluZyBleGVjdXRhdGlvbiB3ZSBjYW4gZmlsdGVyIGJldHdlZW4ga25vd24gdmFsaWRhdGlvbiBlcnJvciBhbmQgcmVhbCBub24gaGFuZGxlZCBlcnJvcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tYW5kTW9kdWxlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuIl19