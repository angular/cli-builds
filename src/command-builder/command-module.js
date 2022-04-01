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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXNGO0FBQ3RGLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUV6RCxrREFBK0M7QUFNL0MsSUFBWSxZQU9YO0FBUEQsV0FBWSxZQUFZO0lBQ3RCLHdEQUF3RDtJQUN4RCwyQ0FBRSxDQUFBO0lBQ0YseURBQXlEO0lBQ3pELDZDQUFHLENBQUE7SUFDSCwrREFBK0Q7SUFDL0QsK0NBQUksQ0FBQTtBQUNOLENBQUMsRUFQVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQU92QjtBQXFDRCxNQUFzQixhQUFhO0lBU2pDLFlBQStCLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBTG5DLDBCQUFxQixHQUFZLElBQUksQ0FBQztRQUd4Qyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUVULENBQUM7SUFFMUQ7Ozs7O09BS0c7SUFDSCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUs7WUFDNUIsQ0FBQyxDQUFDLEtBQUs7WUFDUCxDQUFDLENBQUM7Z0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtvQkFDMUIsQ0FBQyxDQUFDO3dCQUNFLDJCQUEyQixFQUFFLElBQUk7NkJBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUM7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QUNILE1BQWEsa0JBQW1CLFNBQVEsS0FBSztDQUFHO0FBQWhELGdEQUFnRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGxvZ2dpbmcsIG5vcm1hbGl6ZSwgc2NoZW1hLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIEFyZ3VtZW50c0NhbWVsQ2FzZSxcbiAgQXJndixcbiAgQ2FtZWxDYXNlS2V5LFxuICBQb3NpdGlvbmFsT3B0aW9ucyxcbiAgQ29tbWFuZE1vZHVsZSBhcyBZYXJnc0NvbW1hbmRNb2R1bGUsXG4gIE9wdGlvbnMgYXMgWWFyZ3NPcHRpb25zLFxufSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYXJzZXIgYXMgeWFyZ3NQYXJzZXIgfSBmcm9tICd5YXJncy9oZWxwZXJzJztcbmltcG9ydCB7IGNyZWF0ZUFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyVXRpbHMgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgT3B0aW9uczxUPiA9IHsgW2tleSBpbiBrZXlvZiBUIGFzIENhbWVsQ2FzZUtleTxrZXk+XTogVFtrZXldIH07XG5cbmV4cG9ydCBlbnVtIENvbW1hbmRTY29wZSB7XG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBpbnNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEluLFxuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgT3V0LFxuICAvKiogQ29tbWFuZCBjYW4gcnVuIGluc2lkZSBhbmQgb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgQm90aCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJlbnREaXJlY3Rvcnk6IHN0cmluZztcbiAgcm9vdDogc3RyaW5nO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICBnbG9iYWxDb25maWd1cmF0aW9uPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyVXRpbHM7XG4gIC8qKiBBcmd1bWVudHMgcGFyc2VkIGluIGZyZWUtZnJvbSB3aXRob3V0IHBhcnNlciBjb25maWd1cmF0aW9uLiAqL1xuICBhcmdzOiB7XG4gICAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gICAgb3B0aW9uczoge1xuICAgICAgaGVscDogYm9vbGVhbjtcbiAgICAgIGpzb25IZWxwOiBib29sZWFuO1xuICAgIH0gJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgT3RoZXJPcHRpb25zID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQgZXh0ZW5kcyB7fSA9IHt9PlxuICBleHRlbmRzIE9taXQ8WWFyZ3NDb21tYW5kTW9kdWxlPHt9LCBUPiwgJ2J1aWxkZXInIHwgJ2hhbmRsZXInPiB7XG4gIC8qKiBQYXRoIHVzZWQgdG8gbG9hZCB0aGUgbG9uZyBkZXNjcmlwdGlvbiBmb3IgdGhlIGNvbW1hbmQgaW4gSlNPTiBoZWxwIHRleHQuICovXG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIC8qKiBPYmplY3QgZGVjbGFyaW5nIHRoZSBvcHRpb25zIHRoZSBjb21tYW5kIGFjY2VwdHMsIG9yIGEgZnVuY3Rpb24gYWNjZXB0aW5nIGFuZCByZXR1cm5pbmcgYSB5YXJncyBpbnN0YW5jZS4gKi9cbiAgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIC8qKiBBIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgcGFzc2VkIHRoZSBwYXJzZWQgYXJndi4gKi9cbiAgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHwgbnVtYmVyIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGdWxsRGVzY3JpYmUge1xuICBkZXNjcmliZT86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21tYW5kTW9kdWxlPFQgZXh0ZW5kcyB7fSA9IHt9PiBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUPiB7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGNvbW1hbmQ6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgZGVzY3JpYmU6IHN0cmluZyB8IGZhbHNlO1xuICBhYnN0cmFjdCByZWFkb25seSBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2hvdWxkUmVwb3J0QW5hbHl0aWNzOiBib29sZWFuID0gdHJ1ZTtcbiAgc3RhdGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLkJvdGg7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zV2l0aEFuYWx5dGljcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXNjcmlwdGlvbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgdGhlIGxvbmcgY29tbWFuZCBkZXNjcm9wdGlvbi5cbiAgICogVGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIEpTT04gaGVscCB3aWNoIGlzIHVzZWQgaW4gQUlPLlxuICAgKlxuICAgKiBgZmFsc2VgIHdpbGwgcmVzdWx0IGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGZ1bGxEZXNjcmliZSgpOiBGdWxsRGVzY3JpYmUgfCBmYWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZGVzY3JpYmUgPT09IGZhbHNlXG4gICAgICA/IGZhbHNlXG4gICAgICA6IHtcbiAgICAgICAgICBkZXNjcmliZTogdGhpcy5kZXNjcmliZSxcbiAgICAgICAgICAuLi4odGhpcy5sb25nRGVzY3JpcHRpb25QYXRoXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg6IHBhdGhcbiAgICAgICAgICAgICAgICAgIC5yZWxhdGl2ZShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vJyksIHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aClcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIHBhdGgucG9zaXguc2VwKSxcbiAgICAgICAgICAgICAgICBsb25nRGVzY3JpcHRpb246IHJlYWRGaWxlU3luYyh0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgsICd1dGY4JykucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgIC9cXHJcXG4vZyxcbiAgICAgICAgICAgICAgICAgICdcXG4nLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmQuc3BsaXQoJyAnLCAxKVswXTtcbiAgfVxuXG4gIGFic3RyYWN0IGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICBhYnN0cmFjdCBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xuXG4gIGFzeW5jIGhhbmRsZXIoYXJnczogQXJndW1lbnRzQ2FtZWxDYXNlPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBfLCAkMCwgLi4ub3B0aW9ucyB9ID0gYXJncztcblxuICAgIC8vIENhbWVsaXplIG9wdGlvbnMgYXMgeWFyZ3Mgd2lsbCByZXR1cm4gdGhlIG9iamVjdCBpbiBrZWJhYi1jYXNlIHdoZW4gY2FtZWwgY2FzaW5nIGlzIGRpc2FibGVkLlxuICAgIGNvbnN0IGNhbWVsQ2FzZWRPcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMpKSB7XG4gICAgICBjYW1lbENhc2VkT3B0aW9uc1t5YXJnc1BhcnNlci5jYW1lbENhc2Uoa2V5KV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBHYXRoZXIgYW5kIHJlcG9ydCBhbmFseXRpY3MuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBpZiAodGhpcy5zaG91bGRSZXBvcnRBbmFseXRpY3MpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVwb3J0QW5hbHl0aWNzKGNhbWVsQ2FzZWRPcHRpb25zKTtcbiAgICB9XG5cbiAgICBsZXQgZXhpdENvZGU6IG51bWJlciB8IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJ1biBhbmQgdGltZSBjb21tYW5kLlxuICAgICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgIGV4aXRDb2RlID0gYXdhaXQgdGhpcy5ydW4oY2FtZWxDYXNlZE9wdGlvbnMgYXMgT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk7XG4gICAgICBjb25zdCBlbmRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgIGFuYWx5dGljcy50aW1pbmcodGhpcy5jb21tYW5kTmFtZSwgJ2R1cmF0aW9uJywgZW5kVGltZSAtIHN0YXJ0VGltZSk7XG4gICAgICBhd2FpdCBhbmFseXRpY3MuZmx1c2goKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZmF0YWwoYEVycm9yOiAke2UubWVzc2FnZX1gKTtcbiAgICAgICAgZXhpdENvZGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKHR5cGVvZiBleGl0Q29kZSA9PT0gJ251bWJlcicgJiYgZXhpdENvZGUgPiAwKSB7XG4gICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBleGl0Q29kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyByZXBvcnRBbmFseXRpY3MoXG4gICAgb3B0aW9uczogKE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpIHwgT3RoZXJPcHRpb25zLFxuICAgIHBhdGhzOiBzdHJpbmdbXSA9IFtdLFxuICAgIGRpbWVuc2lvbnM6IChib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nKVtdID0gW10sXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHVhXSBvZiB0aGlzLm9wdGlvbnNXaXRoQW5hbHl0aWNzKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbnNbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgZGltZW5zaW9uc1t1YV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpO1xuICAgIGFuYWx5dGljcy5wYWdldmlldygnL2NvbW1hbmQvJyArIFt0aGlzLmNvbW1hbmROYW1lLCAuLi5wYXRoc10uam9pbignLycpLCB7XG4gICAgICBkaW1lbnNpb25zLFxuICAgICAgbWV0cmljczogW10sXG4gICAgfSk7XG4gIH1cblxuICBAbWVtb2l6ZVxuICBwcm90ZWN0ZWQgZ2V0QW5hbHl0aWNzKCk6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICAgIHJldHVybiBjcmVhdGVBbmFseXRpY3MoXG4gICAgICAhIXRoaXMuY29udGV4dC53b3Jrc3BhY2UsXG4gICAgICAvLyBEb24ndCBwcm9tcHQgZm9yIGBuZyB1cGRhdGVgIGFuZCBgbmcgYW5hbHl0aWNzYCBjb21tYW5kcy5cbiAgICAgIFsndXBkYXRlJywgJ2FuYWx5dGljcyddLmluY2x1ZGVzKHRoaXMuY29tbWFuZE5hbWUpLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBzY2hlbWEgb3B0aW9ucyB0byBhIGNvbW1hbmQgYWxzbyB0aGlzIGtlZXBzIHRyYWNrIG9mIG9wdGlvbnMgdGhhdCBhcmUgcmVxdWlyZWQgZm9yIGFuYWx5dGljcy5cbiAgICogKipOb3RlOioqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSB0aGUgY29tbWFuZCBidW5kbGVyIG1ldGhvZC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kPFQ+KGxvY2FsWWFyZ3M6IEFyZ3Y8VD4sIG9wdGlvbnM6IE9wdGlvbltdKTogQXJndjxUPiB7XG4gICAgY29uc3Qgd29ya2luZ0RpciA9IG5vcm1hbGl6ZShwYXRoLnJlbGF0aXZlKHRoaXMuY29udGV4dC5yb290LCBwcm9jZXNzLmN3ZCgpKSk7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgICAgIHBvc2l0aW9uYWwsXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhcyxcbiAgICAgICAgdXNlckFuYWx5dGljcyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICBmb3JtYXQsXG4gICAgICB9ID0gb3B0aW9uO1xuXG4gICAgICBjb25zdCBzaGFyZWRPcHRpb25zOiBZYXJnc09wdGlvbnMgJiBQb3NpdGlvbmFsT3B0aW9ucyA9IHtcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIGRlcHJlY2F0ZWQsXG4gICAgICAgIGNob2ljZXMsXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG9ubHkgYmUgZG9uZSB3aGVuIGAtLWhlbHBgIGlzIHVzZWQgb3RoZXJ3aXNlIGRlZmF1bHQgd2lsbCBvdmVycmlkZSBvcHRpb25zIHNldCBpbiBhbmd1bGFyLmpzb24uXG4gICAgICAgIC4uLih0aGlzLmNvbnRleHQuYXJncy5vcHRpb25zLmhlbHAgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWwgfSA6IHt9KSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3Igc2NoZW1hdGljc1xuICAgICAgaWYgKHdvcmtpbmdEaXIgJiYgZm9ybWF0ID09PSAncGF0aCcgJiYgbmFtZSA9PT0gJ3BhdGgnICYmIGhpZGRlbikge1xuICAgICAgICBzaGFyZWRPcHRpb25zLmRlZmF1bHQgPSB3b3JraW5nRGlyO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9zaXRpb25hbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLm9wdGlvbihzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5wb3NpdGlvbmFsKHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpLCB7XG4gICAgICAgICAgdHlwZTogdHlwZSA9PT0gJ2FycmF5JyB8fCB0eXBlID09PSAnY291bnQnID8gJ3N0cmluZycgOiB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWNvcmQgb3B0aW9uIG9mIGFuYWx5dGljcy5cbiAgICAgIGlmICh1c2VyQW5hbHl0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcy5zZXQobmFtZSwgdXNlckFuYWx5dGljcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0V29ya3NwYWNlT3JUaHJvdygpOiBBbmd1bGFyV29ya3NwYWNlIHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5jb250ZXh0O1xuICAgIGlmICghd29ya3NwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIHdvcmtzcGFjZSBpcyByZXF1aXJlZCBmb3IgdGhpcyBjb21tYW5kLicpO1xuICAgIH1cblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGtub3duIGNvbW1hbmQgbW9kdWxlIGVycm9yLlxuICogVGhpcyBpcyB1c2VkIHNvIGR1cmluZyBleGVjdXRhdGlvbiB3ZSBjYW4gZmlsdGVyIGJldHdlZW4ga25vd24gdmFsaWRhdGlvbiBlcnJvciBhbmQgcmVhbCBub24gaGFuZGxlZCBlcnJvcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tYW5kTW9kdWxlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuIl19