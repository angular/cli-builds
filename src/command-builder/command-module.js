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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandModuleError = exports.CommandModule = exports.CommandScope = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const helpers_1 = require("yargs/helpers");
const analytics_1 = require("../analytics/analytics");
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
    async getAnalytics() {
        if (this._analytics) {
            return this._analytics;
        }
        return (this._analytics = await (0, analytics_1.createAnalytics)(!!this.context.workspace, this.commandName === 'update'));
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
exports.CommandModule = CommandModule;
CommandModule.scope = CommandScope.Both;
/**
 * Creates an known command module error.
 * This is used so during executation we can filter between known validation error and real non handled errors.
 */
class CommandModuleError extends Error {
}
exports.CommandModuleError = CommandModuleError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBc0Y7QUFDdEYsMkJBQWtDO0FBQ2xDLDJDQUE2QjtBQVM3QiwyQ0FBc0Q7QUFDdEQsc0RBQXlEO0FBTXpELElBQVksWUFPWDtBQVBELFdBQVksWUFBWTtJQUN0Qix3REFBd0Q7SUFDeEQsMkNBQUUsQ0FBQTtJQUNGLHlEQUF5RDtJQUN6RCw2Q0FBRyxDQUFBO0lBQ0gsK0RBQStEO0lBQy9ELCtDQUFJLENBQUE7QUFDTixDQUFDLEVBUFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFPdkI7QUFrQ0QsTUFBc0IsYUFBYTtJQVNqQyxZQUErQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUw1QywwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFHdEIseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFFVCxDQUFDO0lBRTFEOzs7OztPQUtHO0lBQ0gsSUFBVyxZQUFZO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLO1lBQzVCLENBQUMsQ0FBQyxLQUFLO1lBQ1AsQ0FBQyxDQUFDO2dCQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUI7b0JBQzFCLENBQUMsQ0FBQzt3QkFDRSwyQkFBMkIsRUFBRSxJQUFJOzZCQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDOzZCQUN4RSxPQUFPLENBQUMsS0FBSyxFQUFF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K0tuQzs7O0dBR0c7QUFDSCxNQUFhLGtCQUFtQixTQUFRLEtBQUs7Q0FBRztBQUFoRCxnREFBZ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgYW5hbHl0aWNzLCBsb2dnaW5nLCBub3JtYWxpemUsIHNjaGVtYSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBBcmd1bWVudHNDYW1lbENhc2UsXG4gIEFyZ3YsXG4gIENhbWVsQ2FzZUtleSxcbiAgUG9zaXRpb25hbE9wdGlvbnMsXG4gIENvbW1hbmRNb2R1bGUgYXMgWWFyZ3NDb21tYW5kTW9kdWxlLFxuICBPcHRpb25zIGFzIFlhcmdzT3B0aW9ucyxcbn0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIGFzIHlhcmdzUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBjcmVhdGVBbmFseXRpY3MgfSBmcm9tICcuLi9hbmFseXRpY3MvYW5hbHl0aWNzJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgT3B0aW9uczxUPiA9IHsgW2tleSBpbiBrZXlvZiBUIGFzIENhbWVsQ2FzZUtleTxrZXk+XTogVFtrZXldIH07XG5cbmV4cG9ydCBlbnVtIENvbW1hbmRTY29wZSB7XG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBpbnNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEluLFxuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgT3V0LFxuICAvKiogQ29tbWFuZCBjYW4gcnVuIGluc2lkZSBhbmQgb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgQm90aCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJlbnREaXJlY3Rvcnk6IHN0cmluZztcbiAgcm9vdDogc3RyaW5nO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyO1xuICAvKiogQXJndW1lbnRzIHBhcnNlZCBpbiBmcmVlLWZyb20gd2l0aG91dCBwYXJzZXIgY29uZmlndXJhdGlvbi4gKi9cbiAgYXJnczoge1xuICAgIHBvc2l0aW9uYWw6IHN0cmluZ1tdO1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGhlbHA6IGJvb2xlYW47XG4gICAgfSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBPdGhlck9wdGlvbnMgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VCBleHRlbmRzIHt9ID0ge30+XG4gIGV4dGVuZHMgT21pdDxZYXJnc0NvbW1hbmRNb2R1bGU8e30sIFQ+LCAnYnVpbGRlcicgfCAnaGFuZGxlcic+IHtcbiAgLyoqIFBhdGggdXNlZCB0byBsb2FkIHRoZSBsb25nIGRlc2NyaXB0aW9uIGZvciB0aGUgY29tbWFuZCBpbiBKU09OIGhlbHAgdGV4dC4gKi9cbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgLyoqIE9iamVjdCBkZWNsYXJpbmcgdGhlIG9wdGlvbnMgdGhlIGNvbW1hbmQgYWNjZXB0cywgb3IgYSBmdW5jdGlvbiBhY2NlcHRpbmcgYW5kIHJldHVybmluZyBhIHlhcmdzIGluc3RhbmNlLiAqL1xuICBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgLyoqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBwYXNzZWQgdGhlIHBhcnNlZCBhcmd2LiAqL1xuICBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZ1bGxEZXNjcmliZSB7XG4gIGRlc2NyaWJlPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmRNb2R1bGU8VCBleHRlbmRzIHt9ID0ge30+IGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+IHtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgY29tbWFuZDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBkZXNjcmliZTogc3RyaW5nIHwgZmFsc2U7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICBzdGF0aWMgc2NvcGUgPSBDb21tYW5kU2NvcGUuQm90aDtcblxuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnNXaXRoQW5hbHl0aWNzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgY29udGV4dDogQ29tbWFuZENvbnRleHQpIHt9XG5cbiAgLyoqXG4gICAqIERlc2NyaXB0aW9uIG9iamVjdCB3aGljaCBjb250YWlucyB0aGUgbG9uZyBjb21tYW5kIGRlc2Nyb3B0aW9uLlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgSlNPTiBoZWxwIHdpY2ggaXMgdXNlZCBpbiBBSU8uXG4gICAqXG4gICAqIGBmYWxzZWAgd2lsbCByZXN1bHQgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICovXG4gIHB1YmxpYyBnZXQgZnVsbERlc2NyaWJlKCk6IEZ1bGxEZXNjcmliZSB8IGZhbHNlIHtcbiAgICByZXR1cm4gdGhpcy5kZXNjcmliZSA9PT0gZmFsc2VcbiAgICAgID8gZmFsc2VcbiAgICAgIDoge1xuICAgICAgICAgIGRlc2NyaWJlOiB0aGlzLmRlc2NyaWJlLFxuICAgICAgICAgIC4uLih0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGhcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aDogcGF0aFxuICAgICAgICAgICAgICAgICAgLnJlbGF0aXZlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi8nKSwgdGhpcy5sb25nRGVzY3JpcHRpb25QYXRoKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgcGF0aC5wb3NpeC5zZXApLFxuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvbjogcmVhZEZpbGVTeW5jKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aCwgJ3V0ZjgnKS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgL1xcclxcbi9nLFxuICAgICAgICAgICAgICAgICAgJ1xcbicsXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZC5zcGxpdCgnICcsIDEpWzBdO1xuICB9XG5cbiAgYWJzdHJhY3QgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIGFic3RyYWN0IHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG5cbiAgYXN5bmMgaGFuZGxlcihhcmdzOiBBcmd1bWVudHNDYW1lbENhc2U8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IF8sICQwLCAuLi5vcHRpb25zIH0gPSBhcmdzO1xuXG4gICAgLy8gQ2FtZWxpemUgb3B0aW9ucyBhcyB5YXJncyB3aWxsIHJldHVybiB0aGUgb2JqZWN0IGluIGtlYmFiLWNhc2Ugd2hlbiBjYW1lbCBjYXNpbmcgaXMgZGlzYWJsZWQuXG4gICAgY29uc3QgY2FtZWxDYXNlZE9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0aW9ucykpIHtcbiAgICAgIGNhbWVsQ2FzZWRPcHRpb25zW3lhcmdzUGFyc2VyLmNhbWVsQ2FzZShrZXkpXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIEdhdGhlciBhbmQgcmVwb3J0IGFuYWx5dGljcy5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpO1xuICAgIGlmICh0aGlzLnNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoY2FtZWxDYXNlZE9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCBleGl0Q29kZTogbnVtYmVyIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgLy8gUnVuIGFuZCB0aW1lIGNvbW1hbmQuXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgZXhpdENvZGUgPSBhd2FpdCB0aGlzLnJ1bihjYW1lbENhc2VkT3B0aW9ucyBhcyBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgYW5hbHl0aWNzLnRpbWluZyh0aGlzLmNvbW1hbmROYW1lLCAnZHVyYXRpb24nLCBlbmRUaW1lIC0gc3RhcnRUaW1lKTtcbiAgICAgIGF3YWl0IGFuYWx5dGljcy5mbHVzaCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAodHlwZW9mIGV4aXRDb2RlID09PSAnbnVtYmVyJyAmJiBleGl0Q29kZSA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhcbiAgICBvcHRpb25zOiAoT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucykgfCBPdGhlck9wdGlvbnMsXG4gICAgcGF0aHM6IHN0cmluZ1tdID0gW10sXG4gICAgZGltZW5zaW9uczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdWFdIG9mIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3MpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uc1tuYW1lXTtcblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICBkaW1lbnNpb25zW3VhXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgYW5hbHl0aWNzLnBhZ2V2aWV3KCcvY29tbWFuZC8nICsgW3RoaXMuY29tbWFuZE5hbWUsIC4uLnBhdGhzXS5qb2luKCcvJyksIHtcbiAgICAgIGRpbWVuc2lvbnMsXG4gICAgICBtZXRyaWNzOiBbXSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2FuYWx5dGljczogYW5hbHl0aWNzLkFuYWx5dGljcyB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl0aWNzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYW5hbHl0aWNzO1xuICAgIH1cblxuICAgIHJldHVybiAodGhpcy5fYW5hbHl0aWNzID0gYXdhaXQgY3JlYXRlQW5hbHl0aWNzKFxuICAgICAgISF0aGlzLmNvbnRleHQud29ya3NwYWNlLFxuICAgICAgdGhpcy5jb21tYW5kTmFtZSA9PT0gJ3VwZGF0ZScsXG4gICAgKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBzY2hlbWEgb3B0aW9ucyB0byBhIGNvbW1hbmQgYWxzbyB0aGlzIGtlZXBzIHRyYWNrIG9mIG9wdGlvbnMgdGhhdCBhcmUgcmVxdWlyZWQgZm9yIGFuYWx5dGljcy5cbiAgICogKipOb3RlOioqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSB0aGUgY29tbWFuZCBidW5kbGVyIG1ldGhvZC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kPFQ+KGxvY2FsWWFyZ3M6IEFyZ3Y8VD4sIG9wdGlvbnM6IE9wdGlvbltdKTogQXJndjxUPiB7XG4gICAgY29uc3Qgd29ya2luZ0RpciA9IG5vcm1hbGl6ZShwYXRoLnJlbGF0aXZlKHRoaXMuY29udGV4dC5yb290LCBwcm9jZXNzLmN3ZCgpKSk7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgICAgIHBvc2l0aW9uYWwsXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhcyxcbiAgICAgICAgdXNlckFuYWx5dGljcyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICBmb3JtYXQsXG4gICAgICB9ID0gb3B0aW9uO1xuXG4gICAgICBjb25zdCBzaGFyZWRPcHRpb25zOiBZYXJnc09wdGlvbnMgJiBQb3NpdGlvbmFsT3B0aW9ucyA9IHtcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGNob2ljZXMsXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG9ubHkgYmUgZG9uZSB3aGVuIGAtLWhlbHBgIGlzIHVzZWQgb3RoZXJ3aXNlIGRlZmF1bHQgd2lsbCBvdmVycmlkZSBvcHRpb25zIHNldCBpbiBhbmd1bGFyLmpzb24uXG4gICAgICAgIC4uLih0aGlzLmNvbnRleHQuYXJncy5vcHRpb25zLmhlbHAgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWwgfSA6IHt9KSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3Igc2NoZW1hdGljc1xuICAgICAgaWYgKHdvcmtpbmdEaXIgJiYgZm9ybWF0ID09PSAncGF0aCcgJiYgbmFtZSA9PT0gJ3BhdGgnICYmIGhpZGRlbikge1xuICAgICAgICBzaGFyZWRPcHRpb25zLmRlZmF1bHQgPSB3b3JraW5nRGlyO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9zaXRpb25hbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLm9wdGlvbihzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5wb3NpdGlvbmFsKHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpLCB7XG4gICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ2FycmF5JyB8fCB0eXBlID09PSAnY291bnQnID8gJ3N0cmluZycgOiB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWNvcmQgb3B0aW9uIG9mIGFuYWx5dGljcy5cbiAgICAgIGlmICh1c2VyQW5hbHl0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcy5zZXQobmFtZSwgdXNlckFuYWx5dGljcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0V29ya3NwYWNlT3JUaHJvdygpOiBBbmd1bGFyV29ya3NwYWNlIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIHdvcmtzcGFjZSBpcyByZXF1aXJlZCBmb3IgdGhpcyBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGtub3duIGNvbW1hbmQgbW9kdWxlIGVycm9yLlxuICogVGhpcyBpcyB1c2VkIHNvIGR1cmluZyBleGVjdXRhdGlvbiB3ZSBjYW4gZmlsdGVyIGJldHdlZW4ga25vd24gdmFsaWRhdGlvbiBlcnJvciBhbmQgcmVhbCBub24gaGFuZGxlZCBlcnJvcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tYW5kTW9kdWxlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuIl19