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
        return (this._analytics = await (0, analytics_1.createAnalytics)(!!this.context.workspace, 
        // Don't prompt for `ng update` and `ng analytics` commands.
        ['update', 'analytics'].includes(this.commandName)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXNGO0FBQ3RGLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBRXRELHNEQUF5RDtBQU16RCxJQUFZLFlBT1g7QUFQRCxXQUFZLFlBQVk7SUFDdEIsd0RBQXdEO0lBQ3hELDJDQUFFLENBQUE7SUFDRix5REFBeUQ7SUFDekQsNkNBQUcsQ0FBQTtJQUNILCtEQUErRDtJQUMvRCwrQ0FBSSxDQUFBO0FBQ04sQ0FBQyxFQVBXLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBT3ZCO0FBb0NELE1BQXNCLGFBQWE7SUFTakMsWUFBK0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFMbkMsMEJBQXFCLEdBQVksSUFBSSxDQUFDO1FBR3hDLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBRVQsQ0FBQztJQUUxRDs7Ozs7T0FLRztJQUNILElBQVcsWUFBWTtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSztZQUM1QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQztnQkFDRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO29CQUMxQixDQUFDLENBQUM7d0JBQ0UsMkJBQTJCLEVBQUUsSUFBSTs2QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQzs2QkFDeEUsT0FBTyxDQUFDLEtBQUss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QUFsTEgsc0NBbUxDO0FBOUtRLG1CQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztBQWdMbkM7OztHQUdHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSxLQUFLO0NBQUc7QUFBaEQsZ0RBQWdEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGFuYWx5dGljcywgbG9nZ2luZywgbm9ybWFsaXplLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQXJndW1lbnRzQ2FtZWxDYXNlLFxuICBBcmd2LFxuICBDYW1lbENhc2VLZXksXG4gIFBvc2l0aW9uYWxPcHRpb25zLFxuICBDb21tYW5kTW9kdWxlIGFzIFlhcmdzQ29tbWFuZE1vZHVsZSxcbiAgT3B0aW9ucyBhcyBZYXJnc09wdGlvbnMsXG59IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciBhcyB5YXJnc1BhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgY3JlYXRlQW5hbHl0aWNzIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnM8VD4gPSB7IFtrZXkgaW4ga2V5b2YgVCBhcyBDYW1lbENhc2VLZXk8a2V5Pl06IFRba2V5XSB9O1xuXG5leHBvcnQgZW51bSBDb21tYW5kU2NvcGUge1xuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gaW5zaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBJbixcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIE91dCxcbiAgLyoqIENvbW1hbmQgY2FuIHJ1biBpbnNpZGUgYW5kIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEJvdGgsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyZW50RGlyZWN0b3J5OiBzdHJpbmc7XG4gIHJvb3Q6IHN0cmluZztcbiAgd29ya3NwYWNlPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyO1xuICAvKiogQXJndW1lbnRzIHBhcnNlZCBpbiBmcmVlLWZyb20gd2l0aG91dCBwYXJzZXIgY29uZmlndXJhdGlvbi4gKi9cbiAgYXJnczoge1xuICAgIHBvc2l0aW9uYWw6IHN0cmluZ1tdO1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGhlbHA6IGJvb2xlYW47XG4gICAgICBqc29uSGVscDogYm9vbGVhbjtcbiAgICB9ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE90aGVyT3B0aW9ucyA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxUIGV4dGVuZHMge30gPSB7fT5cbiAgZXh0ZW5kcyBPbWl0PFlhcmdzQ29tbWFuZE1vZHVsZTx7fSwgVD4sICdidWlsZGVyJyB8ICdoYW5kbGVyJz4ge1xuICAvKiogUGF0aCB1c2VkIHRvIGxvYWQgdGhlIGxvbmcgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kIGluIEpTT04gaGVscCB0ZXh0LiAqL1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xuICAvKiogT2JqZWN0IGRlY2xhcmluZyB0aGUgb3B0aW9ucyB0aGUgY29tbWFuZCBhY2NlcHRzLCBvciBhIGZ1bmN0aW9uIGFjY2VwdGluZyBhbmQgcmV0dXJuaW5nIGEgeWFyZ3MgaW5zdGFuY2UuICovXG4gIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxUPj4gfCBBcmd2PFQ+O1xuICAvKiogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgcGFyc2VkIGFyZ3YuICovXG4gIHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnVsbERlc2NyaWJlIHtcbiAgZGVzY3JpYmU/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tbWFuZE1vZHVsZTxUIGV4dGVuZHMge30gPSB7fT4gaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VD4ge1xuICBhYnN0cmFjdCByZWFkb25seSBjb21tYW5kOiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGRlc2NyaWJlOiBzdHJpbmcgfCBmYWxzZTtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3VsZFJlcG9ydEFuYWx5dGljczogYm9vbGVhbiA9IHRydWU7XG4gIHN0YXRpYyBzY29wZSA9IENvbW1hbmRTY29wZS5Cb3RoO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uc1dpdGhBbmFseXRpY3MgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBjb250ZXh0OiBDb21tYW5kQ29udGV4dCkge31cblxuICAvKipcbiAgICogRGVzY3JpcHRpb24gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIHRoZSBsb25nIGNvbW1hbmQgZGVzY3JvcHRpb24uXG4gICAqIFRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSBKU09OIGhlbHAgd2ljaCBpcyB1c2VkIGluIEFJTy5cbiAgICpcbiAgICogYGZhbHNlYCB3aWxsIHJlc3VsdCBpbiBhIGhpZGRlbiBjb21tYW5kLlxuICAgKi9cbiAgcHVibGljIGdldCBmdWxsRGVzY3JpYmUoKTogRnVsbERlc2NyaWJlIHwgZmFsc2Uge1xuICAgIHJldHVybiB0aGlzLmRlc2NyaWJlID09PSBmYWxzZVxuICAgICAgPyBmYWxzZVxuICAgICAgOiB7XG4gICAgICAgICAgZGVzY3JpYmU6IHRoaXMuZGVzY3JpYmUsXG4gICAgICAgICAgLi4uKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aFxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoOiBwYXRoXG4gICAgICAgICAgICAgICAgICAucmVsYXRpdmUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uLy4uLycpLCB0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGgpXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCBwYXRoLnBvc2l4LnNlcCksXG4gICAgICAgICAgICAgICAgbG9uZ0Rlc2NyaXB0aW9uOiByZWFkRmlsZVN5bmModGhpcy5sb25nRGVzY3JpcHRpb25QYXRoLCAndXRmOCcpLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAvXFxyXFxuL2csXG4gICAgICAgICAgICAgICAgICAnXFxuJyxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kLnNwbGl0KCcgJywgMSlbMF07XG4gIH1cblxuICBhYnN0cmFjdCBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgYWJzdHJhY3QgcnVuKG9wdGlvbnM6IE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHwgbnVtYmVyIHwgdm9pZDtcblxuICBhc3luYyBoYW5kbGVyKGFyZ3M6IEFyZ3VtZW50c0NhbWVsQ2FzZTxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgXywgJDAsIC4uLm9wdGlvbnMgfSA9IGFyZ3M7XG5cbiAgICAvLyBDYW1lbGl6ZSBvcHRpb25zIGFzIHlhcmdzIHdpbGwgcmV0dXJuIHRoZSBvYmplY3QgaW4ga2ViYWItY2FzZSB3aGVuIGNhbWVsIGNhc2luZyBpcyBkaXNhYmxlZC5cbiAgICBjb25zdCBjYW1lbENhc2VkT3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRpb25zKSkge1xuICAgICAgY2FtZWxDYXNlZE9wdGlvbnNbeWFyZ3NQYXJzZXIuY2FtZWxDYXNlKGtleSldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gR2F0aGVyIGFuZCByZXBvcnQgYW5hbHl0aWNzLlxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgaWYgKHRoaXMuc2hvdWxkUmVwb3J0QW5hbHl0aWNzKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcG9ydEFuYWx5dGljcyhjYW1lbENhc2VkT3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBSdW4gYW5kIHRpbWUgY29tbWFuZC5cbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICBleGl0Q29kZSA9IGF3YWl0IHRoaXMucnVuKGNhbWVsQ2FzZWRPcHRpb25zIGFzIE9wdGlvbnM8VD4gJiBPdGhlck9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XG4gICAgICBhbmFseXRpY3MudGltaW5nKHRoaXMuY29tbWFuZE5hbWUsICdkdXJhdGlvbicsIGVuZFRpbWUgLSBzdGFydFRpbWUpO1xuICAgICAgYXdhaXQgYW5hbHl0aWNzLmZsdXNoKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmZhdGFsKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICh0eXBlb2YgZXhpdENvZGUgPT09ICdudW1iZXInICYmIGV4aXRDb2RlID4gMCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIG9wdGlvbnM6IChPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKSB8IE90aGVyT3B0aW9ucyxcbiAgICBwYXRoczogc3RyaW5nW10gPSBbXSxcbiAgICBkaW1lbnNpb25zOiAoYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZylbXSA9IFtdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB1YV0gb2YgdGhpcy5vcHRpb25zV2l0aEFuYWx5dGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25zW25hbWVdO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIGRpbWVuc2lvbnNbdWFdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gYXdhaXQgdGhpcy5nZXRBbmFseXRpY3MoKTtcbiAgICBhbmFseXRpY3MucGFnZXZpZXcoJy9jb21tYW5kLycgKyBbdGhpcy5jb21tYW5kTmFtZSwgLi4ucGF0aHNdLmpvaW4oJy8nKSwge1xuICAgICAgZGltZW5zaW9ucyxcbiAgICAgIG1ldHJpY3M6IFtdLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYW5hbHl0aWNzOiBhbmFseXRpY3MuQW5hbHl0aWNzIHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0QW5hbHl0aWNzKCk6IFByb21pc2U8YW5hbHl0aWNzLkFuYWx5dGljcz4ge1xuICAgIGlmICh0aGlzLl9hbmFseXRpY3MpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbmFseXRpY3M7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl9hbmFseXRpY3MgPSBhd2FpdCBjcmVhdGVBbmFseXRpY3MoXG4gICAgICAhIXRoaXMuY29udGV4dC53b3Jrc3BhY2UsXG4gICAgICAvLyBEb24ndCBwcm9tcHQgZm9yIGBuZyB1cGRhdGVgIGFuZCBgbmcgYW5hbHl0aWNzYCBjb21tYW5kcy5cbiAgICAgIFsndXBkYXRlJywgJ2FuYWx5dGljcyddLmluY2x1ZGVzKHRoaXMuY29tbWFuZE5hbWUpLFxuICAgICkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgc2NoZW1hIG9wdGlvbnMgdG8gYSBjb21tYW5kIGFsc28gdGhpcyBrZWVwcyB0cmFjayBvZiBvcHRpb25zIHRoYXQgYXJlIHJlcXVpcmVkIGZvciBhbmFseXRpY3MuXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gdGhlIGNvbW1hbmQgYnVuZGxlciBtZXRob2QuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZDxUPihsb2NhbFlhcmdzOiBBcmd2PFQ+LCBvcHRpb25zOiBPcHRpb25bXSk6IEFyZ3Y8VD4ge1xuICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBub3JtYWxpemUocGF0aC5yZWxhdGl2ZSh0aGlzLmNvbnRleHQucm9vdCwgcHJvY2Vzcy5jd2QoKSkpO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgY29uc3Qge1xuICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsLFxuICAgICAgICBwb3NpdGlvbmFsLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgYWxpYXMsXG4gICAgICAgIHVzZXJBbmFseXRpY3MsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgICAgZm9ybWF0LFxuICAgICAgfSA9IG9wdGlvbjtcblxuICAgICAgY29uc3Qgc2hhcmVkT3B0aW9uczogWWFyZ3NPcHRpb25zICYgUG9zaXRpb25hbE9wdGlvbnMgPSB7XG4gICAgICAgIGFsaWFzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBkZXByZWNhdGVkLFxuICAgICAgICBjaG9pY2VzLFxuICAgICAgICAvLyBUaGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiBgLS1oZWxwYCBpcyB1c2VkIG90aGVyd2lzZSBkZWZhdWx0IHdpbGwgb3ZlcnJpZGUgb3B0aW9ucyBzZXQgaW4gYW5ndWxhci5qc29uLlxuICAgICAgICAuLi4odGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucy5oZWxwID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsIH0gOiB7fSksXG4gICAgICB9O1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIHNjaGVtYXRpY3NcbiAgICAgIGlmICh3b3JraW5nRGlyICYmIGZvcm1hdCA9PT0gJ3BhdGgnICYmIG5hbWUgPT09ICdwYXRoJyAmJiBoaWRkZW4pIHtcbiAgICAgICAgc2hhcmVkT3B0aW9ucy5kZWZhdWx0ID0gd29ya2luZ0RpcjtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc2l0aW9uYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5vcHRpb24oc3RyaW5ncy5kYXNoZXJpemUobmFtZSksIHtcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIC4uLnNoYXJlZE9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MucG9zaXRpb25hbChzdHJpbmdzLmRhc2hlcml6ZShuYW1lKSwge1xuICAgICAgICAgIHR5cGU6IHR5cGUgPT09ICdhcnJheScgfHwgdHlwZSA9PT0gJ2NvdW50JyA/ICdzdHJpbmcnIDogdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVjb3JkIG9wdGlvbiBvZiBhbmFseXRpY3MuXG4gICAgICBpZiAodXNlckFuYWx5dGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3Muc2V0KG5hbWUsIHVzZXJBbmFseXRpY3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFdvcmtzcGFjZU9yVGhyb3coKTogQW5ndWxhcldvcmtzcGFjZSB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuY29udGV4dDtcbiAgICBpZiAoIXdvcmtzcGFjZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSB3b3Jrc3BhY2UgaXMgcmVxdWlyZWQgZm9yIHRoaXMgY29tbWFuZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBrbm93biBjb21tYW5kIG1vZHVsZSBlcnJvci5cbiAqIFRoaXMgaXMgdXNlZCBzbyBkdXJpbmcgZXhlY3V0YXRpb24gd2UgY2FuIGZpbHRlciBiZXR3ZWVuIGtub3duIHZhbGlkYXRpb24gZXJyb3IgYW5kIHJlYWwgbm9uIGhhbmRsZWQgZXJyb3JzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbWFuZE1vZHVsZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cbiJdfQ==