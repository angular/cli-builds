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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXNGO0FBQ3RGLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQUV6RCxrREFBK0M7QUFNL0MsSUFBWSxZQU9YO0FBUEQsV0FBWSxZQUFZO0lBQ3RCLHdEQUF3RDtJQUN4RCwyQ0FBRSxDQUFBO0lBQ0YseURBQXlEO0lBQ3pELDZDQUFHLENBQUE7SUFDSCwrREFBK0Q7SUFDL0QsK0NBQUksQ0FBQTtBQUNOLENBQUMsRUFQVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQU92QjtBQXNDRCxNQUFzQixhQUFhO0lBU2pDLFlBQStCLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBTG5DLDBCQUFxQixHQUFZLElBQUksQ0FBQztRQUd4Qyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUVULENBQUM7SUFFMUQ7Ozs7O09BS0c7SUFDSCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUs7WUFDNUIsQ0FBQyxDQUFDLEtBQUs7WUFDUCxDQUFDLENBQUM7Z0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtvQkFDMUIsQ0FBQyxDQUFDO3dCQUNFLDJCQUEyQixFQUFFLElBQUk7NkJBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUM7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QUNILE1BQWEsa0JBQW1CLFNBQVEsS0FBSztDQUFHO0FBQWhELGdEQUFnRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhbmFseXRpY3MsIGxvZ2dpbmcsIG5vcm1hbGl6ZSwgc2NoZW1hLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIEFyZ3VtZW50c0NhbWVsQ2FzZSxcbiAgQXJndixcbiAgQ2FtZWxDYXNlS2V5LFxuICBQb3NpdGlvbmFsT3B0aW9ucyxcbiAgQ29tbWFuZE1vZHVsZSBhcyBZYXJnc0NvbW1hbmRNb2R1bGUsXG4gIE9wdGlvbnMgYXMgWWFyZ3NPcHRpb25zLFxufSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYXJzZXIgYXMgeWFyZ3NQYXJzZXIgfSBmcm9tICd5YXJncy9oZWxwZXJzJztcbmltcG9ydCB7IGNyZWF0ZUFuYWx5dGljcyB9IGZyb20gJy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgbWVtb2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9tZW1vaXplJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyVXRpbHMgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgT3B0aW9uczxUPiA9IHsgW2tleSBpbiBrZXlvZiBUIGFzIENhbWVsQ2FzZUtleTxrZXk+XTogVFtrZXldIH07XG5cbmV4cG9ydCBlbnVtIENvbW1hbmRTY29wZSB7XG4gIC8qKiBDb21tYW5kIGNhbiBvbmx5IHJ1biBpbnNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEluLFxuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgT3V0LFxuICAvKiogQ29tbWFuZCBjYW4gcnVuIGluc2lkZSBhbmQgb3V0c2lkZSBhbiBBbmd1bGFyIHdvcmtzcGFjZS4gKi9cbiAgQm90aCxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kQ29udGV4dCB7XG4gIGN1cnJlbnREaXJlY3Rvcnk6IHN0cmluZztcbiAgcm9vdDogc3RyaW5nO1xuICB3b3Jrc3BhY2U/OiBBbmd1bGFyV29ya3NwYWNlO1xuICBnbG9iYWxDb25maWd1cmF0aW9uPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyVXRpbHM7XG4gIC8qKiBBcmd1bWVudHMgcGFyc2VkIGluIGZyZWUtZnJvbSB3aXRob3V0IHBhcnNlciBjb25maWd1cmF0aW9uLiAqL1xuICBhcmdzOiB7XG4gICAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gICAgb3B0aW9uczoge1xuICAgICAgaGVscDogYm9vbGVhbjtcbiAgICAgIGpzb25IZWxwOiBib29sZWFuO1xuICAgICAgZ2V0WWFyZ3NDb21wbGV0aW9uczogYm9vbGVhbjtcbiAgICB9ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE90aGVyT3B0aW9ucyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUIGV4dGVuZHMge30gPSB7fT5cbiAgZXh0ZW5kcyBPbWl0PFlhcmdzQ29tbWFuZE1vZHVsZTx7fSwgVD4sICdidWlsZGVyJyB8ICdoYW5kbGVyJz4ge1xuICAvKiogUGF0aCB1c2VkIHRvIGxvYWQgdGhlIGxvbmcgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kIGluIEpTT04gaGVscCB0ZXh0LiAqL1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICAvKiogT2JqZWN0IGRlY2xhcmluZyB0aGUgb3B0aW9ucyB0aGUgY29tbWFuZCBhY2NlcHRzLCBvciBhIGZ1bmN0aW9uIGFjY2VwdGluZyBhbmQgcmV0dXJuaW5nIGEgeWFyZ3MgaW5zdGFuY2UuICovXG4gIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICAvKiogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgcGFyc2VkIGFyZ3YuICovXG4gIHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnVsbERlc2NyaWJlIHtcbiAgZGVzY3JpYmU/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMge30gPSB7fT4gaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD4ge1xuICBhYnN0cmFjdCByZWFkb25seSBjb21tYW5kOiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGRlc2NyaWJlOiBzdHJpbmcgfCBmYWxzZTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljczogYm9vbGVhbiA9IHRydWU7XG4gIHN0YXRpYyBzY29wZSA9IENvbW1hbmRTY29wZS5Cb3RoO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uc1dpdGhBbmFseXRpY3MgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBjb250ZXh0OiBDb21tYW5kQ29udGV4dCkge31cblxuICAvKipcbiAgICogRGVzY3JpcHRpb24gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIHRoZSBsb25nIGNvbW1hbmQgZGVzY3JvcHRpb24uXG4gICAqIFRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSBKU09OIGhlbHAgd2ljaCBpcyB1c2VkIGluIEFJTy5cbiAgICpcbiAgICogYGZhbHNlYCB3aWxsIHJlc3VsdCBpbiBhIGhpZGRlbiBjb21tYW5kLlxuICAgKi9cbiAgcHVibGljIGdldCBmdWxsRGVzY3JpYmUoKTogRnVsbERlc2NyaWJlIHwgZmFsc2Uge1xuICAgIHJldHVybiB0aGlzLmRlc2NyaWJlID09PSBmYWxzZVxuICAgICAgPyBmYWxzZVxuICAgICAgOiB7XG4gICAgICAgICAgZGVzY3JpYmU6IHRoaXMuZGVzY3JpYmUsXG4gICAgICAgICAgLi4uKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aFxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoOiBwYXRoXG4gICAgICAgICAgICAgICAgICAucmVsYXRpdmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uLycpLCB0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgpXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCBwYXRoLnBvc2l4LnNlcCksXG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uOiByZWFkRmlsZVN5bmModGhpcy5sb25nRGVzY3JpcHRpb25QYXRoLCAndXRmOCcpLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAvXFxyXFxuL2csXG4gICAgICAgICAgICAgICAgICAnXFxuJyxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kLnNwbGl0KCcgJywgMSlbMF07XG4gIH1cblxuICBhYnN0cmFjdCBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgYWJzdHJhY3QgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHwgbnVtYmVyIHwgdm9pZDtcblxuICBhc3luYyBoYW5kbGVyKGFyZ3M6IEFyZ3VtZW50c0NhbWVsQ2FzZTxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgXywgJDAsIC4uLm9wdGlvbnMgfSA9IGFyZ3M7XG5cbiAgICAvLyBDYW1lbGl6ZSBvcHRpb25zIGFzIHlhcmdzIHdpbGwgcmV0dXJuIHRoZSBvYmplY3QgaW4ga2ViYWItY2FzZSB3aGVuIGNhbWVsIGNhc2luZyBpcyBkaXNhYmxlZC5cbiAgICBjb25zdCBjYW1lbENhc2VkT3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRpb25zKSkge1xuICAgICAgY2FtZWxDYXNlZE9wdGlvbnNbeWFyZ3NQYXJzZXIuY2FtZWxDYXNlKGtleSldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gR2F0aGVyIGFuZCByZXBvcnQgYW5hbHl0aWNzLlxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgaWYgKHRoaXMuc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhjYW1lbENhc2VkT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBSdW4gYW5kIHRpbWUgY29tbWFuZC5cbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICBleGl0Q29kZSA9IGF3YWl0IHRoaXMucnVuKGNhbWVsQ2FzZWRPcHRpb25zIGFzIE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XG4gICAgICBhbmFseXRpY3MudGltaW5nKHRoaXMuY29tbWFuZE5hbWUsICdkdXJhdGlvbicsIGVuZFRpbWUgLSBzdGFydFRpbWUpO1xuICAgICAgYXdhaXQgYW5hbHl0aWNzLmZsdXNoKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgICBwYXRoczogc3RyaW5nW10gPSBbXSxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBhbmFseXRpY3MucGFnZXZpZXcoJy9jb21tYW5kLycgKyBbdGhpcy5jb21tYW5kTmFtZSwgLi4ucGF0aHNdLmpvaW4oJy8nKSwge1xuICAgICAgZGltZW5zaW9ucyxcbiAgICAgIG1ldHJpY3M6IFtdLFxuICAgIH0pO1xuICB9XG5cbiAgQG1lbW9pemVcbiAgcHJvdGVjdGVkIGdldEFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgICByZXR1cm4gY3JlYXRlQW5hbHl0aWNzKFxuICAgICAgISF0aGlzLmNvbnRleHQud29ya3NwYWNlLFxuICAgICAgLy8gRG9uJ3QgcHJvbXB0IGZvciBgbmcgdXBkYXRlYCBhbmQgYG5nIGFuYWx5dGljc2AgY29tbWFuZHMuXG4gICAgICBbJ3VwZGF0ZScsICdhbmFseXRpY3MnXS5pbmNsdWRlcyh0aGlzLmNvbW1hbmROYW1lKSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgc2NoZW1hIG9wdGlvbnMgdG8gYSBjb21tYW5kIGFsc28gdGhpcyBrZWVwcyB0cmFjayBvZiBvcHRpb25zIHRoYXQgYXJlIHJlcXVpcmVkIGZvciBhbmFseXRpY3MuXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGNvbW1hbmQgYnVuZGxlciBtZXRob2QuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZDxUPihsb2NhbFlhcmdzOiBBcmd2PFQ+LCBvcHRpb25zOiBPcHRpb25bXSk6IEFyZ3Y8VD4ge1xuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUocGF0aC5yZWxhdGl2ZSh0aGlzLmNvbnRleHQucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgY29uc3Qge1xuICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsLFxuICAgICAgICBwb3NpdGlvbmFsLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIHVzZXJBbmFseXRpY3MsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgICAgZm9ybWF0LFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNjaGVtYXRpY3NcbiAgICAgIGlmICh3b3JraW5nRGlyICYmIGZvcm1hdCA9PT0gJ3BhdGgnICYmIG5hbWUgPT09ICdwYXRoJyAmJiBoaWRkZW4pIHtcbiAgICAgICAgc2hhcmVkT3B0aW9ucy5kZWZhdWx0ID0gd29ya2luZ0RpcjtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5vcHRpb24oc3RyaW5ncy5kYXNoZXJpemUobmFtZSksIHtcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MucG9zaXRpb25hbChzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGU6IHR5cGUgPT09ICdhcnJheScgfHwgdHlwZSA9PT0gJ2NvdW50JyA/ICdzdHJpbmcnIDogdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVjb3JkIG9wdGlvbiBvZiBhbmFseXRpY3MuXG4gICAgICBpZiAodXNlckFuYWx5dGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3Muc2V0KG5hbWUsIHVzZXJBbmFseXRpY3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFdvcmtzcGFjZU9yVGhyb3coKTogQW5ndWxhcldvcmtzcGFjZSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBrbm93biBjb21tYW5kIG1vZHVsZSBlcnJvci5cbiAqIFRoaXMgaXMgdXNlZCBzbyBkdXJpbmcgZXhlY3V0YXRpb24gd2UgY2FuIGZpbHRlciBiZXR3ZWVuIGtub3duIHZhbGlkYXRpb24gZXJyb3IgYW5kIHJlYWwgbm9uIGhhbmRsZWQgZXJyb3JzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbWFuZE1vZHVsZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbiJdfQ==