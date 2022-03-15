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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXNGO0FBQ3RGLDJCQUFrQztBQUNsQywyQ0FBNkI7QUFTN0IsMkNBQXNEO0FBQ3RELHNEQUF5RDtBQU16RCxJQUFZLFlBT1g7QUFQRCxXQUFZLFlBQVk7SUFDdEIsd0RBQXdEO0lBQ3hELDJDQUFFLENBQUE7SUFDRix5REFBeUQ7SUFDekQsNkNBQUcsQ0FBQTtJQUNILCtEQUErRDtJQUMvRCwrQ0FBSSxDQUFBO0FBQ04sQ0FBQyxFQVBXLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBT3ZCO0FBbUNELE1BQXNCLGFBQWE7SUFTakMsWUFBK0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFMNUMsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBR3RCLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBRVQsQ0FBQztJQUUxRDs7Ozs7T0FLRztJQUNILElBQVcsWUFBWTtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSztZQUM1QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQztnQkFDRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO29CQUMxQixDQUFDLENBQUM7d0JBQ0UsMkJBQTJCLEVBQUUsSUFBSTs2QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQzs2QkFDeEUsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQzt3QkFDakMsZUFBZSxFQUFFLElBQUEsaUJBQVksRUFBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUNyRSxPQUFPLEVBQ1AsSUFBSSxDQUNMO3FCQUNGO29CQUNILENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDUixDQUFDO0lBQ1IsQ0FBQztJQUVELElBQWMsV0FBVztRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBS0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUEwQztRQUN0RCxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztRQUVuQyxnR0FBZ0c7UUFDaEcsTUFBTSxpQkFBaUIsR0FBNEIsRUFBRSxDQUFDO1FBQ3RELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2xELGlCQUFpQixDQUFDLGdCQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3ZEO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzlCLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsSUFBSSxRQUFtQyxDQUFDO1FBQ3hDLElBQUk7WUFDRix3QkFBd0I7WUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzdCLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQThDLENBQUMsQ0FBQztZQUMxRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDM0IsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUM7WUFDcEUsTUFBTSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDekI7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLElBQUksQ0FBQyxZQUFZLGFBQU0sQ0FBQyx5QkFBeUIsRUFBRTtnQkFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ2pELFFBQVEsR0FBRyxDQUFDLENBQUM7YUFDZDtpQkFBTTtnQkFDTCxNQUFNLENBQUMsQ0FBQzthQUNUO1NBQ0Y7Z0JBQVM7WUFDUixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO2dCQUNoRCxPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQzthQUM3QjtTQUNGO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQ25CLE9BQW1ELEVBQ25ELFFBQWtCLEVBQUUsRUFDcEIsYUFBNEMsRUFBRTtRQUU5QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFO2dCQUN4RixVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO2FBQ3hCO1NBQ0Y7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM1QyxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkUsVUFBVTtZQUNWLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUdTLEtBQUssQ0FBQyxZQUFZO1FBQzFCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7U0FDeEI7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLElBQUEsMkJBQWUsRUFDN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUztRQUN4Qiw0REFBNEQ7UUFDNUQsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FDbkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNPLHlCQUF5QixDQUFJLFVBQW1CLEVBQUUsT0FBaUI7UUFDM0UsTUFBTSxVQUFVLEdBQUcsSUFBQSxnQkFBUyxFQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5RSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtZQUM1QixNQUFNLEVBQ0osT0FBTyxFQUFFLFVBQVUsRUFDbkIsVUFBVSxFQUNWLFVBQVUsRUFDVixXQUFXLEVBQ1gsS0FBSyxFQUNMLGFBQWEsRUFDYixJQUFJLEVBQ0osTUFBTSxFQUNOLElBQUksRUFDSixPQUFPLEVBQ1AsTUFBTSxHQUNQLEdBQUcsTUFBTSxDQUFDO1lBRVgsTUFBTSxhQUFhLEdBQXFDO2dCQUN0RCxLQUFLO2dCQUNMLE1BQU07Z0JBQ04sV0FBVztnQkFDWCxVQUFVO2dCQUNWLE9BQU87Z0JBQ1AsOEdBQThHO2dCQUM5RyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUNuRSxDQUFDO1lBRUYsOEJBQThCO1lBQzlCLElBQUksVUFBVSxJQUFJLE1BQU0sS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLE1BQU0sSUFBSSxNQUFNLEVBQUU7Z0JBQ2hFLGFBQWEsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO2FBQ3BDO1lBRUQsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUM1QixVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxjQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN0RCxJQUFJO29CQUNKLEdBQUcsYUFBYTtpQkFDakIsQ0FBQyxDQUFDO2FBQ0o7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDMUQsSUFBSSxFQUFFLElBQUksS0FBSyxPQUFPLElBQUksSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJO29CQUM1RCxHQUFHLGFBQWE7aUJBQ2pCLENBQUMsQ0FBQzthQUNKO1lBRUQsOEJBQThCO1lBQzlCLElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7YUFDcEQ7U0FDRjtRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFUyxtQkFBbUI7UUFDM0IsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1NBQzNFO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQzs7QUFsTEgsc0NBbUxDO0FBOUtRLG1CQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztBQWdMbkM7OztHQUdHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSxLQUFLO0NBQUc7QUFBaEQsZ0RBQWdEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGFuYWx5dGljcywgbG9nZ2luZywgbm9ybWFsaXplLCBzY2hlbWEsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQXJndW1lbnRzQ2FtZWxDYXNlLFxuICBBcmd2LFxuICBDYW1lbENhc2VLZXksXG4gIFBvc2l0aW9uYWxPcHRpb25zLFxuICBDb21tYW5kTW9kdWxlIGFzIFlhcmdzQ29tbWFuZE1vZHVsZSxcbiAgT3B0aW9ucyBhcyBZYXJnc09wdGlvbnMsXG59IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciBhcyB5YXJnc1BhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgY3JlYXRlQW5hbHl0aWNzIH0gZnJvbSAnLi4vYW5hbHl0aWNzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnM8VD4gPSB7IFtrZXkgaW4ga2V5b2YgVCBhcyBDYW1lbENhc2VLZXk8a2V5Pl06IFRba2V5XSB9O1xuXG5leHBvcnQgZW51bSBDb21tYW5kU2NvcGUge1xuICAvKiogQ29tbWFuZCBjYW4gb25seSBydW4gaW5zaWRlIGFuIEFuZ3VsYXIgd29ya3NwYWNlLiAqL1xuICBJbixcbiAgLyoqIENvbW1hbmQgY2FuIG9ubHkgcnVuIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIE91dCxcbiAgLyoqIENvbW1hbmQgY2FuIHJ1biBpbnNpZGUgYW5kIG91dHNpZGUgYW4gQW5ndWxhciB3b3Jrc3BhY2UuICovXG4gIEJvdGgsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZENvbnRleHQge1xuICBjdXJyZW50RGlyZWN0b3J5OiBzdHJpbmc7XG4gIHJvb3Q6IHN0cmluZztcbiAgd29ya3NwYWNlPzogQW5ndWxhcldvcmtzcGFjZTtcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcjtcbiAgLyoqIEFyZ3VtZW50cyBwYXJzZWQgaW4gZnJlZS1mcm9tIHdpdGhvdXQgcGFyc2VyIGNvbmZpZ3VyYXRpb24uICovXG4gIGFyZ3M6IHtcbiAgICBwb3NpdGlvbmFsOiBzdHJpbmdbXTtcbiAgICBvcHRpb25zOiB7XG4gICAgICBoZWxwOiBib29sZWFuO1xuICAgICAganNvbkhlbHA6IGJvb2xlYW47XG4gICAgfSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBPdGhlck9wdGlvbnMgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248VCBleHRlbmRzIHt9ID0ge30+XG4gIGV4dGVuZHMgT21pdDxZYXJnc0NvbW1hbmRNb2R1bGU8e30sIFQ+LCAnYnVpbGRlcicgfCAnaGFuZGxlcic+IHtcbiAgLyoqIFBhdGggdXNlZCB0byBsb2FkIHRoZSBsb25nIGRlc2NyaXB0aW9uIGZvciB0aGUgY29tbWFuZCBpbiBKU09OIGhlbHAgdGV4dC4gKi9cbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZztcbiAgLyoqIE9iamVjdCBkZWNsYXJpbmcgdGhlIG9wdGlvbnMgdGhlIGNvbW1hbmQgYWNjZXB0cywgb3IgYSBmdW5jdGlvbiBhY2NlcHRpbmcgYW5kIHJldHVybmluZyBhIHlhcmdzIGluc3RhbmNlLiAqL1xuICBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8VD4+IHwgQXJndjxUPjtcbiAgLyoqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBwYXNzZWQgdGhlIHBhcnNlZCBhcmd2LiAqL1xuICBydW4ob3B0aW9uczogT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4gfCBudW1iZXIgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZ1bGxEZXNjcmliZSB7XG4gIGRlc2NyaWJlPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbW1hbmRNb2R1bGU8VCBleHRlbmRzIHt9ID0ge30+IGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFQ+IHtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgY29tbWFuZDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBkZXNjcmliZTogc3RyaW5nIHwgZmFsc2U7XG4gIGFic3RyYWN0IHJlYWRvbmx5IGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzaG91bGRSZXBvcnRBbmFseXRpY3MgPSB0cnVlO1xuICBzdGF0aWMgc2NvcGUgPSBDb21tYW5kU2NvcGUuQm90aDtcblxuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnNXaXRoQW5hbHl0aWNzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgY29udGV4dDogQ29tbWFuZENvbnRleHQpIHt9XG5cbiAgLyoqXG4gICAqIERlc2NyaXB0aW9uIG9iamVjdCB3aGljaCBjb250YWlucyB0aGUgbG9uZyBjb21tYW5kIGRlc2Nyb3B0aW9uLlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgSlNPTiBoZWxwIHdpY2ggaXMgdXNlZCBpbiBBSU8uXG4gICAqXG4gICAqIGBmYWxzZWAgd2lsbCByZXN1bHQgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICovXG4gIHB1YmxpYyBnZXQgZnVsbERlc2NyaWJlKCk6IEZ1bGxEZXNjcmliZSB8IGZhbHNlIHtcbiAgICByZXR1cm4gdGhpcy5kZXNjcmliZSA9PT0gZmFsc2VcbiAgICAgID8gZmFsc2VcbiAgICAgIDoge1xuICAgICAgICAgIGRlc2NyaWJlOiB0aGlzLmRlc2NyaWJlLFxuICAgICAgICAgIC4uLih0aGlzLmxvbmdEZXNjcmlwdGlvblBhdGhcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aDogcGF0aFxuICAgICAgICAgICAgICAgICAgLnJlbGF0aXZlKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi8uLi8nKSwgdGhpcy5sb25nRGVzY3JpcHRpb25QYXRoKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgcGF0aC5wb3NpeC5zZXApLFxuICAgICAgICAgICAgICAgIGxvbmdEZXNjcmlwdGlvbjogcmVhZEZpbGVTeW5jKHRoaXMubG9uZ0Rlc2NyaXB0aW9uUGF0aCwgJ3V0ZjgnKS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgL1xcclxcbi9nLFxuICAgICAgICAgICAgICAgICAgJ1xcbicsXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZC5zcGxpdCgnICcsIDEpWzBdO1xuICB9XG5cbiAgYWJzdHJhY3QgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFQ+PiB8IEFyZ3Y8VD47XG4gIGFic3RyYWN0IHJ1bihvcHRpb25zOiBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB8IG51bWJlciB8IHZvaWQ7XG5cbiAgYXN5bmMgaGFuZGxlcihhcmdzOiBBcmd1bWVudHNDYW1lbENhc2U8VD4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IF8sICQwLCAuLi5vcHRpb25zIH0gPSBhcmdzO1xuXG4gICAgLy8gQ2FtZWxpemUgb3B0aW9ucyBhcyB5YXJncyB3aWxsIHJldHVybiB0aGUgb2JqZWN0IGluIGtlYmFiLWNhc2Ugd2hlbiBjYW1lbCBjYXNpbmcgaXMgZGlzYWJsZWQuXG4gICAgY29uc3QgY2FtZWxDYXNlZE9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0aW9ucykpIHtcbiAgICAgIGNhbWVsQ2FzZWRPcHRpb25zW3lhcmdzUGFyc2VyLmNhbWVsQ2FzZShrZXkpXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIEdhdGhlciBhbmQgcmVwb3J0IGFuYWx5dGljcy5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBhd2FpdCB0aGlzLmdldEFuYWx5dGljcygpO1xuICAgIGlmICh0aGlzLnNob3VsZFJlcG9ydEFuYWx5dGljcykge1xuICAgICAgYXdhaXQgdGhpcy5yZXBvcnRBbmFseXRpY3MoY2FtZWxDYXNlZE9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCBleGl0Q29kZTogbnVtYmVyIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgLy8gUnVuIGFuZCB0aW1lIGNvbW1hbmQuXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgZXhpdENvZGUgPSBhd2FpdCB0aGlzLnJ1bihjYW1lbENhc2VkT3B0aW9ucyBhcyBPcHRpb25zPFQ+ICYgT3RoZXJPcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgYW5hbHl0aWNzLnRpbWluZyh0aGlzLmNvbW1hbmROYW1lLCAnZHVyYXRpb24nLCBlbmRUaW1lIC0gc3RhcnRUaW1lKTtcbiAgICAgIGF3YWl0IGFuYWx5dGljcy5mbHVzaCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5mYXRhbChgRXJyb3I6ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAodHlwZW9mIGV4aXRDb2RlID09PSAnbnVtYmVyJyAmJiBleGl0Q29kZSA+IDApIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcG9ydEFuYWx5dGljcyhcbiAgICBvcHRpb25zOiAoT3B0aW9uczxUPiAmIE90aGVyT3B0aW9ucykgfCBPdGhlck9wdGlvbnMsXG4gICAgcGF0aHM6IHN0cmluZ1tdID0gW10sXG4gICAgZGltZW5zaW9uczogKGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcpW10gPSBbXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdWFdIG9mIHRoaXMub3B0aW9uc1dpdGhBbmFseXRpY3MpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uc1tuYW1lXTtcblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICBkaW1lbnNpb25zW3VhXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFuYWx5dGljcyA9IGF3YWl0IHRoaXMuZ2V0QW5hbHl0aWNzKCk7XG4gICAgYW5hbHl0aWNzLnBhZ2V2aWV3KCcvY29tbWFuZC8nICsgW3RoaXMuY29tbWFuZE5hbWUsIC4uLnBhdGhzXS5qb2luKCcvJyksIHtcbiAgICAgIGRpbWVuc2lvbnMsXG4gICAgICBtZXRyaWNzOiBbXSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2FuYWx5dGljczogYW5hbHl0aWNzLkFuYWx5dGljcyB8IHVuZGVmaW5lZDtcbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl0aWNzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYW5hbHl0aWNzO1xuICAgIH1cblxuICAgIHJldHVybiAodGhpcy5fYW5hbHl0aWNzID0gYXdhaXQgY3JlYXRlQW5hbHl0aWNzKFxuICAgICAgISF0aGlzLmNvbnRleHQud29ya3NwYWNlLFxuICAgICAgLy8gRG9uJ3QgcHJvbXB0IGZvciBgbmcgdXBkYXRlYCBhbmQgYG5nIGFuYWx5dGljc2AgY29tbWFuZHMuXG4gICAgICBbJ3VwZGF0ZScsICdhbmFseXRpY3MnXS5pbmNsdWRlcyh0aGlzLmNvbW1hbmROYW1lKSxcbiAgICApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHNjaGVtYSBvcHRpb25zIHRvIGEgY29tbWFuZCBhbHNvIHRoaXMga2VlcHMgdHJhY2sgb2Ygb3B0aW9ucyB0aGF0IGFyZSByZXF1aXJlZCBmb3IgYW5hbHl0aWNzLlxuICAgKiAqKk5vdGU6KiogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIHRoZSBjb21tYW5kIGJ1bmRsZXIgbWV0aG9kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQ8VD4obG9jYWxZYXJnczogQXJndjxUPiwgb3B0aW9uczogT3B0aW9uW10pOiBBcmd2PFQ+IHtcbiAgICBjb25zdCB3b3JraW5nRGlyID0gbm9ybWFsaXplKHBhdGgucmVsYXRpdmUodGhpcy5jb250ZXh0LnJvb3QsIHByb2Nlc3MuY3dkKCkpKTtcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVmYXVsdDogZGVmYXVsdFZhbCxcbiAgICAgICAgcG9zaXRpb25hbCxcbiAgICAgICAgZGVwcmVjYXRlZCxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIGFsaWFzLFxuICAgICAgICB1c2VyQW5hbHl0aWNzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGNob2ljZXMsXG4gICAgICAgIGZvcm1hdCxcbiAgICAgIH0gPSBvcHRpb247XG5cbiAgICAgIGNvbnN0IHNoYXJlZE9wdGlvbnM6IFlhcmdzT3B0aW9ucyAmIFBvc2l0aW9uYWxPcHRpb25zID0ge1xuICAgICAgICBhbGlhcyxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgZGVwcmVjYXRlZCxcbiAgICAgICAgY2hvaWNlcyxcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgb25seSBiZSBkb25lIHdoZW4gYC0taGVscGAgaXMgdXNlZCBvdGhlcndpc2UgZGVmYXVsdCB3aWxsIG92ZXJyaWRlIG9wdGlvbnMgc2V0IGluIGFuZ3VsYXIuanNvbi5cbiAgICAgICAgLi4uKHRoaXMuY29udGV4dC5hcmdzLm9wdGlvbnMuaGVscCA/IHsgZGVmYXVsdDogZGVmYXVsdFZhbCB9IDoge30pLFxuICAgICAgfTtcblxuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBzY2hlbWF0aWNzXG4gICAgICBpZiAod29ya2luZ0RpciAmJiBmb3JtYXQgPT09ICdwYXRoJyAmJiBuYW1lID09PSAncGF0aCcgJiYgaGlkZGVuKSB7XG4gICAgICAgIHNoYXJlZE9wdGlvbnMuZGVmYXVsdCA9IHdvcmtpbmdEaXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb3NpdGlvbmFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3Mub3B0aW9uKHN0cmluZ3MuZGFzaGVyaXplKG5hbWUpLCB7XG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICAuLi5zaGFyZWRPcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLnBvc2l0aW9uYWwoc3RyaW5ncy5kYXNoZXJpemUobmFtZSksIHtcbiAgICAgICAgICB0eXBlOiB0eXBlID09PSAnYXJyYXknIHx8IHR5cGUgPT09ICdjb3VudCcgPyAnc3RyaW5nJyA6IHR5cGUsXG4gICAgICAgICAgLi4uc2hhcmVkT3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlY29yZCBvcHRpb24gb2YgYW5hbHl0aWNzLlxuICAgICAgaWYgKHVzZXJBbmFseXRpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnNXaXRoQW5hbHl0aWNzLnNldChuYW1lLCB1c2VyQW5hbHl0aWNzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRXb3Jrc3BhY2VPclRocm93KCk6IEFuZ3VsYXJXb3Jrc3BhY2Uge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0Egd29ya3NwYWNlIGlzIHJlcXVpcmVkIGZvciB0aGlzIGNvbW1hbmQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdvcmtzcGFjZTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4ga25vd24gY29tbWFuZCBtb2R1bGUgZXJyb3IuXG4gKiBUaGlzIGlzIHVzZWQgc28gZHVyaW5nIGV4ZWN1dGF0aW9uIHdlIGNhbiBmaWx0ZXIgYmV0d2VlbiBrbm93biB2YWxpZGF0aW9uIGVycm9yIGFuZCByZWFsIG5vbiBoYW5kbGVkIGVycm9ycy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1hbmRNb2R1bGVFcnJvciBleHRlbmRzIEVycm9yIHt9XG4iXX0=