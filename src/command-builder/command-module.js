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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTJFO0FBQzNFLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFVN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUN6RCx3REFBMEU7QUFFMUUsa0RBQStDO0FBTS9DLElBQVksWUFPWDtBQVBELFdBQVksWUFBWTtJQUN0Qix3REFBd0Q7SUFDeEQsMkNBQUUsQ0FBQTtJQUNGLHlEQUF5RDtJQUN6RCw2Q0FBRyxDQUFBO0lBQ0gsK0RBQStEO0lBQy9ELCtDQUFJLENBQUE7QUFDTixDQUFDLEVBUFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFPdkI7QUF3Q0QsTUFBc0IsYUFBYTtJQVNqQyxZQUErQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUxuQywwQkFBcUIsR0FBWSxJQUFJLENBQUM7UUFDaEQsVUFBSyxHQUFpQixZQUFZLENBQUMsSUFBSSxDQUFDO1FBRWhDLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBRVQsQ0FBQztJQUUxRDs7Ozs7T0FLRztJQUNILElBQVcsWUFBWTtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSztZQUM1QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQztnQkFDRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO29CQUMxQixDQUFDLENBQUM7d0JBQ0UsMkJBQTJCLEVBQUUsSUFBSTs2QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENB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LENBQUMsT0FBa0IsRUFBRSxFQUFFO2dCQUMzQyxLQUFLLE1BQU0sR0FBRyxJQUFJLDBCQUEwQixFQUFFO29CQUM1QyxJQUFJLEdBQUcsSUFBSSxPQUFPLEVBQUU7d0JBQ2xCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3JDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNyQjtpQkFDRjtZQUNILENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNYO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVTLG1CQUFtQjtRQUMzQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2QsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDJDQUEyQyxDQUFDLENBQUM7U0FDM0U7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0NBQ0Y7QUF6RkM7SUFBQyxpQkFBTzs7OztpREFPUDtBQXRISCxzQ0F3TUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGtCQUFtQixTQUFRLEtBQUs7Q0FBRztBQUFoRCxnREFBZ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQXJndW1lbnRzLFxuICBBcmd1bWVudHNDYW1lbENhc2UsXG4gIEFyZ3YsXG4gIENhbWVsQ2FzZUtleSxcbiAgUG9zaXRpb25hbE9wdGlvbnMsXG4gIENvbW1hbmRNb2R1bGUgYXMgWWFyZ3NDb21tYW5kTW9kdWxlLFxuICBPcHRpb25zIGFzIFlhcmdzT3B0aW9ucyxcbn0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIGFzIHlhcmdzUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBjcmVhdGVBbmFseXRpY3MgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvY29tcGxldGlvbic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBtZW1vaXplIH0gZnJvbSAnLi4vdXRpbGl0aWVzL21lbW9pemUnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgdHlwZSBPcHRpb25zPFQ+ID0geyBba2V5IGluIGtleW9mIFQgYXMgQ2FtZWxDYXNlS2V5PGtleT5dOiBUW2tleV0gfTtcblxuZXhwb3J0IGVudW0gQ29tbWFuZFNjb3BlIHtcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIGluc2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgSW4sXG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBPdXQsXG4gIC8qKiBDb21tYW5kIGNhbiBydW4gaW5zaWRlIGFuZCBvdXRzaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBCb3RoLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRDb250ZXh0IHtcbiAgY3VycmVudERpcmVjdG9yeTogc3RyaW5nO1xuICByb290OiBzdHJpbmc7XG4gIHdvcmtzcGFjZT86IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIGdsb2JhbENvbmZpZ3VyYXRpb246IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXI7XG4gIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlclV0aWxzO1xuICAvKiogQXJndW1lbnRzIHBhcnNlZCBpbiBmcmVlLWZyb20gd2l0aG91dCBwYXJzZXIgY29uZmlndXJhdGlvbi4gKi9cbiAgYXJnczoge1xuICAgIHBvc2l0aW9uYWw6IHN0cmluZ1tdO1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGhlbHA6IGJvb2xlYW47XG4gICAgICBqc29uSGVscDogYm9vbGVhbjtcbiAgICAgIGdldFlhcmdzQ29tcGxldGlvbnM6IGJvb2xlYW47XG4gICAgfSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBPdGhlck9wdGlvbnMgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VCBleHRlbmRzIHt9ID0ge30+XG4gIGV4dGVuZHMgT21pdDxZYXJnc0NvbW1hbmRNb2R1bGU8e30sIFQ+LCAnYnVpbGRlcicgfCAnaGFuZGxlcic+IHtcbiAgLyoqIFNjb3BlIGluIHdoaWNoIHRoZSBjb21tYW5kIGNhbiBiZSBleGVjdXRlZCBpbi4gKi9cbiAgc2NvcGU6IENvbW1hbmRTY29wZTtcbiAgLyoqIFBhdGggdXNlZCB0byBsb2FkIHRoZSBsb25nIGRlc2NyaXB0aW9uIGZvciB0aGUgY29tbWFuZCBpbiBKU09OIGhlbHAgdGV4dC4gKi9cbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgLyoqIE9iamVjdCBkZWNsYXJpbmcgdGhlIG9wdGlvbnMgdGhlIGNvbW1hbmQgYWNjZXB0cywgb3IgYSBmdW5jdGlvbiBhY2NlcHRpbmcgYW5kIHJldHVybmluZyBhIHlhcmdzIGluc3RhbmNlLiAqL1xuICBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgLyoqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBwYXNzZWQgdGhlIHBhcnNlZCBhcmd2LiAqL1xuICBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZ1bGxEZXNjcmliZSB7XG4gIGRlc2NyaWJlPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmRNb2R1bGU8VCBleHRlbmRzIHt9ID0ge30+IGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+IHtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgY29tbWFuZDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBkZXNjcmliZTogc3RyaW5nIHwgZmFsc2U7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIHByb3RlY3RlZCByZWFkb25seSBzaG91bGRSZXBvcnRBbmFseXRpY3M6IGJvb2xlYW4gPSB0cnVlO1xuICByZWFkb25seSBzY29wZTogQ29tbWFuZFNjb3BlID0gQ29tbWFuZFNjb3BlLkJvdGg7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zV2l0aEFuYWx5dGljcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXNjcmlwdGlvbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgdGhlIGxvbmcgY29tbWFuZCBkZXNjcm9wdGlvbi5cbiAgICogVGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIEpTT04gaGVscCB3aWNoIGlzIHVzZWQgaW4gQUlPLlxuICAgKlxuICAgKiBgZmFsc2VgIHdpbGwgcmVzdWx0IGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGZ1bGxEZXNjcmliZSgpOiBGdWxsRGVzY3JpYmUgfCBmYWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZGVzY3JpYmUgPT09IGZhbHNlXG4gICAgICA/IGZhbHNlXG4gICAgICA6IHtcbiAgICAgICAgICBkZXNjcmliZTogdGhpcy5kZXNjcmliZSxcbiAgICAgICAgICAuLi4odGhpcy5sb25nRGVzY3JpcHRpb25QYXRoXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg6IHBhdGhcbiAgICAgICAgICAgICAgICAgIC5yZWxhdGl2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vJyksIHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aClcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIHBhdGgucG9zaXguc2VwKSxcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb246IHJlYWRGaWxlU3luYyh0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgsICd1dGY4JykucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgIC9cXHJcXG4vZyxcbiAgICAgICAgICAgICAgICAgICdcXG4nLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmQuc3BsaXQoJyAnLCAxKVswXTtcbiAgfVxuXG4gIGFic3RyYWN0IGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICBhYnN0cmFjdCBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xuXG4gIGFzeW5jIGhhbmRsZXIoYXJnczogQXJndW1lbnRzQ2FtZWxDYXNlPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBfLCAkMCwgLi4ub3B0aW9ucyB9ID0gYXJncztcblxuICAgIC8vIENhbWVsaXplIG9wdGlvbnMgYXMgeWFyZ3Mgd2lsbCByZXR1cm4gdGhlIG9iamVjdCBpbiBrZWJhYi1jYXNlIHdoZW4gY2FtZWwgY2FzaW5nIGlzIGRpc2FibGVkLlxuICAgIGNvbnN0IGNhbWVsQ2FzZWRPcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMpKSB7XG4gICAgICBjYW1lbENhc2VkT3B0aW9uc1t5YXJnc1BhcnNlci5jYW1lbENhc2Uoa2V5KV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgYXV0b2NvbXBsZXRpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgY29uc3QgYXV0b2NvbXBsZXRpb25FeGl0Q29kZSA9IGF3YWl0IGNvbnNpZGVyU2V0dGluZ1VwQXV0b2NvbXBsZXRpb24oXG4gICAgICB0aGlzLmNvbW1hbmROYW1lLFxuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlcixcbiAgICApO1xuICAgIGlmIChhdXRvY29tcGxldGlvbkV4aXRDb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBhdXRvY29tcGxldGlvbkV4aXRDb2RlO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2F0aGVyIGFuZCByZXBvcnQgYW5hbHl0aWNzLlxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgaWYgKHRoaXMuc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhjYW1lbENhc2VkT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBSdW4gYW5kIHRpbWUgY29tbWFuZC5cbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICBleGl0Q29kZSA9IGF3YWl0IHRoaXMucnVuKGNhbWVsQ2FzZWRPcHRpb25zIGFzIE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XG4gICAgICBhbmFseXRpY3MudGltaW5nKHRoaXMuY29tbWFuZE5hbWUsICdkdXJhdGlvbicsIGVuZFRpbWUgLSBzdGFydFRpbWUpO1xuICAgICAgYXdhaXQgYW5hbHl0aWNzLmZsdXNoKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgICBwYXRoczogc3RyaW5nW10gPSBbXSxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBhbmFseXRpY3MucGFnZXZpZXcoJy9jb21tYW5kLycgKyBbdGhpcy5jb21tYW5kTmFtZSwgLi4ucGF0aHNdLmpvaW4oJy8nKSwge1xuICAgICAgZGltZW5zaW9ucyxcbiAgICAgIG1ldHJpY3M6IFtdLFxuICAgIH0pO1xuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJvdGVjdGVkIGdldEFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgICByZXR1cm4gY3JlYXRlQW5hbHl0aWNzKFxuICAgICAgISF0aGlzLmNvbnRleHQud29ya3NwYWNlLFxuICAgICAgLy8gRG9uJ3QgcHJvbXB0IGZvciBgbmcgdXBkYXRlYCBhbmQgYG5nIGFuYWx5dGljc2AgY29tbWFuZHMuXG4gICAgICBbJ3VwZGF0ZScsICdhbmFseXRpY3MnXS5pbmNsdWRlcyh0aGlzLmNvbW1hbmROYW1lKSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgc2NoZW1hIG9wdGlvbnMgdG8gYSBjb21tYW5kIGFsc28gdGhpcyBrZWVwcyB0cmFjayBvZiBvcHRpb25zIHRoYXQgYXJlIHJlcXVpcmVkIGZvciBhbmFseXRpY3MuXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGNvbW1hbmQgYnVuZGxlciBtZXRob2QuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZDxUPihsb2NhbFlhcmdzOiBBcmd2PFQ+LCBvcHRpb25zOiBPcHRpb25bXSk6IEFyZ3Y8VD4ge1xuICAgIGNvbnN0IGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgICAgIHBvc2l0aW9uYWwsXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhcyxcbiAgICAgICAgdXNlckFuYWx5dGljcyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICBsZXQgZGFzaGVkTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpO1xuXG4gICAgICAvLyBIYW5kbGUgb3B0aW9ucyB3aGljaCBoYXZlIGJlZW4gZGVmaW5lZCBpbiB0aGUgc2NoZW1hIHdpdGggYG5vYCBwcmVmaXguXG4gICAgICBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nICYmIGRhc2hlZE5hbWUuc3RhcnRzV2l0aCgnbm8tJykpIHtcbiAgICAgICAgZGFzaGVkTmFtZSA9IGRhc2hlZE5hbWUuc2xpY2UoMyk7XG4gICAgICAgIGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4LmFkZChkYXNoZWROYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5vcHRpb24oZGFzaGVkTmFtZSwge1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5wb3NpdGlvbmFsKGRhc2hlZE5hbWUsIHtcbiAgICAgICAgICB0eXBlOiB0eXBlID09PSAnYXJyYXknIHx8IHR5cGUgPT09ICdjb3VudCcgPyAnc3RyaW5nJyA6IHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlY29yZCBvcHRpb24gb2YgYW5hbHl0aWNzLlxuICAgICAgaWYgKHVzZXJBbmFseXRpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnNXaXRoQW5hbHl0aWNzLnNldChuYW1lLCB1c2VyQW5hbHl0aWNzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgb3B0aW9ucyB3aGljaCBoYXZlIGJlZW4gZGVmaW5lZCBpbiB0aGUgc2NoZW1hIHdpdGggYG5vYCBwcmVmaXguXG4gICAgaWYgKGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4LnNpemUpIHtcbiAgICAgIGxvY2FsWWFyZ3MubWlkZGxld2FyZSgob3B0aW9uczogQXJndW1lbnRzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGJvb2xlYW5PcHRpb25zV2l0aE5vUHJlZml4KSB7XG4gICAgICAgICAgaWYgKGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zW2Buby0ke2tleX1gXSA9ICFvcHRpb25zW2tleV07XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9uc1trZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgZmFsc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFdvcmtzcGFjZU9yVGhyb3coKTogQW5ndWxhcldvcmtzcGFjZSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBrbm93biBjb21tYW5kIG1vZHVsZSBlcnJvci5cbiAqIFRoaXMgaXMgdXNlZCBzbyBkdXJpbmcgZXhlY3V0YXRpb24gd2UgY2FuIGZpbHRlciBiZXR3ZWVuIGtub3duIHZhbGlkYXRpb24gZXJyb3IgYW5kIHJlYWwgbm9uIGhhbmRsZWQgZXJyb3JzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbWFuZE1vZHVsZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbiJdfQ==