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
exports.runCommand = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path_1 = require("path");
const json_file_1 = require("../utilities/json-file");
const json_schema_1 = require("../utilities/json-schema");
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser = __importStar(require("./parser"));
// NOTE: Update commands.json if changing this.  It's still deep imported in one CI validation
const standardCommands = {
    'add': '../commands/add.json',
    'analytics': '../commands/analytics.json',
    'build': '../commands/build.json',
    'deploy': '../commands/deploy.json',
    'config': '../commands/config.json',
    'doc': '../commands/doc.json',
    'e2e': '../commands/e2e.json',
    'extract-i18n': '../commands/extract-i18n.json',
    'make-this-awesome': '../commands/easter-egg.json',
    'generate': '../commands/generate.json',
    'help': '../commands/help.json',
    'lint': '../commands/lint.json',
    'new': '../commands/new.json',
    'run': '../commands/run.json',
    'serve': '../commands/serve.json',
    'test': '../commands/test.json',
    'update': '../commands/update.json',
    'version': '../commands/version.json',
};
/**
 * Create the analytics instance.
 * @private
 */
async function _createAnalytics(workspace, skipPrompt = false) {
    let config = await (0, analytics_1.getGlobalAnalytics)();
    // If in workspace and global analytics is enabled, defer to workspace level
    if (workspace && config) {
        const skipAnalytics = skipPrompt ||
            (process.env['NG_CLI_ANALYTICS'] &&
                (process.env['NG_CLI_ANALYTICS'].toLowerCase() === 'false' ||
                    process.env['NG_CLI_ANALYTICS'] === '0'));
        // TODO: This should honor the `no-interactive` option.
        //       It is currently not an `ng` option but rather only an option for specific commands.
        //       The concept of `ng`-wide options are needed to cleanly handle this.
        if (!skipAnalytics && !(await (0, analytics_1.hasWorkspaceAnalyticsConfiguration)())) {
            await (0, analytics_1.promptProjectAnalytics)();
        }
        config = await (0, analytics_1.getWorkspaceAnalytics)();
    }
    const maybeSharedAnalytics = await (0, analytics_1.getSharedAnalytics)();
    if (config && maybeSharedAnalytics) {
        return new core_1.analytics.MultiAnalytics([config, maybeSharedAnalytics]);
    }
    else if (config) {
        return config;
    }
    else if (maybeSharedAnalytics) {
        return maybeSharedAnalytics;
    }
    else {
        return new core_1.analytics.NoopAnalytics();
    }
}
async function loadCommandDescription(name, path, registry) {
    const schemaPath = (0, path_1.resolve)(__dirname, path);
    const schema = (0, json_file_1.readAndParseJson)(schemaPath);
    if (!(0, core_1.isJsonObject)(schema)) {
        throw new Error('Invalid command JSON loaded from ' + JSON.stringify(schemaPath));
    }
    return (0, json_schema_1.parseJsonSchemaToCommandDescription)(name, schemaPath, registry, schema);
}
/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param workspace Workspace information.
 * @param commands The map of supported commands.
 * @param options Additional options.
 */
async function runCommand(args, logger, workspace, commands = standardCommands, options = {
    currentDirectory: process.cwd(),
}) {
    var _a;
    // This registry is exclusively used for flattening schemas, and not for validating.
    const registry = new core_1.schema.CoreSchemaRegistry([]);
    registry.registerUriHandler((uri) => {
        if (uri.startsWith('ng-cli://')) {
            const content = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', uri.substr('ng-cli://'.length)), 'utf-8');
            return Promise.resolve(JSON.parse(content));
        }
        else {
            return null;
        }
    });
    let commandName = undefined;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg.startsWith('-')) {
            commandName = arg;
            args.splice(i, 1);
            break;
        }
    }
    let description = null;
    // if no commands were found, use `help`.
    if (!commandName) {
        if (args.length === 1 && args[0] === '--version') {
            commandName = 'version';
        }
        else {
            commandName = 'help';
        }
        if (!(commandName in commands)) {
            logger.error(core_1.tags.stripIndent `
          The "${commandName}" command seems to be disabled.
          This is an issue with the CLI itself. If you see this comment, please report it and
          provide your repository.
        `);
            return 1;
        }
    }
    if (commandName in commands) {
        description = await loadCommandDescription(commandName, commands[commandName], registry);
    }
    else {
        const commandNames = Object.keys(commands);
        // Optimize loading for common aliases
        if (commandName.length === 1) {
            commandNames.sort((a, b) => {
                const aMatch = a[0] === commandName;
                const bMatch = b[0] === commandName;
                if (aMatch && !bMatch) {
                    return -1;
                }
                else if (!aMatch && bMatch) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
        }
        for (const name of commandNames) {
            const aliasDesc = await loadCommandDescription(name, commands[name], registry);
            const aliases = aliasDesc.aliases;
            if (aliases && aliases.some((alias) => alias === commandName)) {
                commandName = name;
                description = aliasDesc;
                break;
            }
        }
    }
    if (!description) {
        const commandsDistance = {};
        const name = commandName;
        const allCommands = Object.keys(commands).sort((a, b) => {
            if (!(a in commandsDistance)) {
                commandsDistance[a] = core_1.strings.levenshtein(a, name);
            }
            if (!(b in commandsDistance)) {
                commandsDistance[b] = core_1.strings.levenshtein(b, name);
            }
            return commandsDistance[a] - commandsDistance[b];
        });
        logger.error(core_1.tags.stripIndent `
        The specified command ("${commandName}") is invalid. For a list of available options,
        run "ng help".

        Did you mean "${allCommands[0]}"?
    `);
        return 1;
    }
    try {
        const parsedOptions = parser.parseArguments(args, description.options, logger);
        command_1.Command.setCommandMap(async () => {
            const map = {};
            for (const [name, path] of Object.entries(commands)) {
                map[name] = await loadCommandDescription(name, path, registry);
            }
            return map;
        });
        const analytics = options.analytics || (await _createAnalytics(!!workspace, description.name === 'update'));
        const context = {
            workspace,
            analytics,
            currentDirectory: options.currentDirectory,
            root: (_a = workspace === null || workspace === void 0 ? void 0 : workspace.basePath) !== null && _a !== void 0 ? _a : options.currentDirectory,
        };
        const command = new description.impl(context, description, logger);
        // Flush on an interval (if the event loop is waiting).
        let analyticsFlushPromise = Promise.resolve();
        const analyticsFlushInterval = setInterval(() => {
            analyticsFlushPromise = analyticsFlushPromise.then(() => analytics.flush());
        }, 1000);
        const result = await command.validateAndRun(parsedOptions);
        // Flush one last time.
        clearInterval(analyticsFlushInterval);
        await analyticsFlushPromise.then(() => analytics.flush());
        return result;
    }
    catch (e) {
        if (e instanceof parser.ParseArgumentException) {
            logger.fatal('Cannot parse arguments. See below for the reasons.');
            logger.fatal('    ' + e.comments.join('\n    '));
            return 1;
        }
        else {
            throw e;
        }
    }
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvY29tbWFuZC1ydW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FROEI7QUFDOUIsMkJBQWtDO0FBQ2xDLCtCQUFxQztBQUVyQyxzREFBMEQ7QUFDMUQsMERBQStFO0FBQy9FLDJDQU1xQjtBQUNyQix1Q0FBb0M7QUFFcEMsaURBQW1DO0FBRW5DLDhGQUE4RjtBQUM5RixNQUFNLGdCQUFnQixHQUFHO0lBQ3ZCLEtBQUssRUFBRSxzQkFBc0I7SUFDN0IsV0FBVyxFQUFFLDRCQUE0QjtJQUN6QyxPQUFPLEVBQUUsd0JBQXdCO0lBQ2pDLFFBQVEsRUFBRSx5QkFBeUI7SUFDbkMsUUFBUSxFQUFFLHlCQUF5QjtJQUNuQyxLQUFLLEVBQUUsc0JBQXNCO0lBQzdCLEtBQUssRUFBRSxzQkFBc0I7SUFDN0IsY0FBYyxFQUFFLCtCQUErQjtJQUMvQyxtQkFBbUIsRUFBRSw2QkFBNkI7SUFDbEQsVUFBVSxFQUFFLDJCQUEyQjtJQUN2QyxNQUFNLEVBQUUsdUJBQXVCO0lBQy9CLE1BQU0sRUFBRSx1QkFBdUI7SUFDL0IsS0FBSyxFQUFFLHNCQUFzQjtJQUM3QixLQUFLLEVBQUUsc0JBQXNCO0lBQzdCLE9BQU8sRUFBRSx3QkFBd0I7SUFDakMsTUFBTSxFQUFFLHVCQUF1QjtJQUMvQixRQUFRLEVBQUUseUJBQXlCO0lBQ25DLFNBQVMsRUFBRSwwQkFBMEI7Q0FDdEMsQ0FBQztBQU1GOzs7R0FHRztBQUNILEtBQUssVUFBVSxnQkFBZ0IsQ0FDN0IsU0FBa0IsRUFDbEIsVUFBVSxHQUFHLEtBQUs7SUFFbEIsSUFBSSxNQUFNLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixHQUFFLENBQUM7SUFDeEMsNEVBQTRFO0lBQzVFLElBQUksU0FBUyxJQUFJLE1BQU0sRUFBRTtRQUN2QixNQUFNLGFBQWEsR0FDakIsVUFBVTtZQUNWLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDOUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTztvQkFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEQsdURBQXVEO1FBQ3ZELDRGQUE0RjtRQUM1Riw0RUFBNEU7UUFDNUUsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFBLDhDQUFrQyxHQUFFLENBQUMsRUFBRTtZQUNuRSxNQUFNLElBQUEsa0NBQXNCLEdBQUUsQ0FBQztTQUNoQztRQUNELE1BQU0sR0FBRyxNQUFNLElBQUEsaUNBQXFCLEdBQUUsQ0FBQztLQUN4QztJQUVELE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixHQUFFLENBQUM7SUFFeEQsSUFBSSxNQUFNLElBQUksb0JBQW9CLEVBQUU7UUFDbEMsT0FBTyxJQUFJLGdCQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztLQUNyRTtTQUFNLElBQUksTUFBTSxFQUFFO1FBQ2pCLE9BQU8sTUFBTSxDQUFDO0tBQ2Y7U0FBTSxJQUFJLG9CQUFvQixFQUFFO1FBQy9CLE9BQU8sb0JBQW9CLENBQUM7S0FDN0I7U0FBTTtRQUNMLE9BQU8sSUFBSSxnQkFBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO0tBQ3RDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxzQkFBc0IsQ0FDbkMsSUFBWSxFQUNaLElBQVksRUFDWixRQUF3QztJQUV4QyxNQUFNLFVBQVUsR0FBRyxJQUFBLGNBQU8sRUFBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBQSw0QkFBZ0IsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUM1QyxJQUFJLENBQUMsSUFBQSxtQkFBWSxFQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0tBQ25GO0lBRUQsT0FBTyxJQUFBLGlEQUFtQyxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2pGLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FDOUIsSUFBYyxFQUNkLE1BQXNCLEVBQ3RCLFNBQXVDLEVBQ3ZDLFdBQThCLGdCQUFnQixFQUM5QyxVQUF5RTtJQUN2RSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO0NBQ2hDOztJQUVELG9GQUFvRjtJQUNwRixNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRCxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRTtRQUMxQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUU3RixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzdDO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLFdBQVcsR0FBdUIsU0FBUyxDQUFDO0lBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4QixXQUFXLEdBQUcsR0FBRyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLE1BQU07U0FDUDtLQUNGO0lBRUQsSUFBSSxXQUFXLEdBQThCLElBQUksQ0FBQztJQUVsRCx5Q0FBeUM7SUFDekMsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNoQixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLEVBQUU7WUFDaEQsV0FBVyxHQUFHLFNBQVMsQ0FBQztTQUN6QjthQUFNO1lBQ0wsV0FBVyxHQUFHLE1BQU0sQ0FBQztTQUN0QjtRQUVELElBQUksQ0FBQyxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsRUFBRTtZQUM5QixNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxXQUFXLENBQUE7aUJBQ2xCLFdBQVc7OztTQUduQixDQUFDLENBQUM7WUFFTCxPQUFPLENBQUMsQ0FBQztTQUNWO0tBQ0Y7SUFFRCxJQUFJLFdBQVcsSUFBSSxRQUFRLEVBQUU7UUFDM0IsV0FBVyxHQUFHLE1BQU0sc0JBQXNCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxRjtTQUFNO1FBQ0wsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUzQyxzQ0FBc0M7UUFDdEMsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUM1QixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN6QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssV0FBVyxDQUFDO2dCQUNwQyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssV0FBVyxDQUFDO2dCQUNwQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDckIsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDWDtxQkFBTSxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRTtvQkFDNUIsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7cUJBQU07b0JBQ0wsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLEVBQUU7WUFDL0IsTUFBTSxTQUFTLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9FLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFFbEMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxFQUFFO2dCQUM3RCxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixXQUFXLEdBQUcsU0FBUyxDQUFDO2dCQUN4QixNQUFNO2FBQ1A7U0FDRjtLQUNGO0lBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNoQixNQUFNLGdCQUFnQixHQUFHLEVBQWdDLENBQUM7UUFDMUQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RELElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUM1QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNwRDtZQUNELElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUM1QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNwRDtZQUVELE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxXQUFXLENBQUE7a0NBQ0MsV0FBVzs7O3dCQUdyQixXQUFXLENBQUMsQ0FBQyxDQUFDO0tBQ2pDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFRCxJQUFJO1FBQ0YsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvRSxpQkFBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBdUMsRUFBRSxDQUFDO1lBQ25ELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ2hFO1lBRUQsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUNiLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxNQUFNLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sT0FBTyxHQUFHO1lBQ2QsU0FBUztZQUNULFNBQVM7WUFDVCxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCO1lBQzFDLElBQUksRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxRQUFRLG1DQUFJLE9BQU8sQ0FBQyxnQkFBZ0I7U0FDdEQsQ0FBQztRQUNGLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5FLHVEQUF1RDtRQUN2RCxJQUFJLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM5QyxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDOUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVULE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUzRCx1QkFBdUI7UUFDdkIsYUFBYSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDdEMsTUFBTSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFMUQsT0FBTyxNQUFNLENBQUM7S0FDZjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsSUFBSSxDQUFDLFlBQVksTUFBTSxDQUFDLHNCQUFzQixFQUFFO1lBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRWpELE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7YUFBTTtZQUNMLE1BQU0sQ0FBQyxDQUFDO1NBQ1Q7S0FDRjtBQUNILENBQUM7QUF6SkQsZ0NBeUpDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIGFuYWx5dGljcyxcbiAgaXNKc29uT2JqZWN0LFxuICBqc29uLFxuICBsb2dnaW5nLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IHJlYWRBbmRQYXJzZUpzb24gfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1maWxlJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7XG4gIGdldEdsb2JhbEFuYWx5dGljcyxcbiAgZ2V0U2hhcmVkQW5hbHl0aWNzLFxuICBnZXRXb3Jrc3BhY2VBbmFseXRpY3MsXG4gIGhhc1dvcmtzcGFjZUFuYWx5dGljc0NvbmZpZ3VyYXRpb24sXG4gIHByb21wdFByb2plY3RBbmFseXRpY3MsXG59IGZyb20gJy4vYW5hbHl0aWNzJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgQ29tbWFuZERlc2NyaXB0aW9uIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0ICogYXMgcGFyc2VyIGZyb20gJy4vcGFyc2VyJztcblxuLy8gTk9URTogVXBkYXRlIGNvbW1hbmRzLmpzb24gaWYgY2hhbmdpbmcgdGhpcy4gIEl0J3Mgc3RpbGwgZGVlcCBpbXBvcnRlZCBpbiBvbmUgQ0kgdmFsaWRhdGlvblxuY29uc3Qgc3RhbmRhcmRDb21tYW5kcyA9IHtcbiAgJ2FkZCc6ICcuLi9jb21tYW5kcy9hZGQuanNvbicsXG4gICdhbmFseXRpY3MnOiAnLi4vY29tbWFuZHMvYW5hbHl0aWNzLmpzb24nLFxuICAnYnVpbGQnOiAnLi4vY29tbWFuZHMvYnVpbGQuanNvbicsXG4gICdkZXBsb3knOiAnLi4vY29tbWFuZHMvZGVwbG95Lmpzb24nLFxuICAnY29uZmlnJzogJy4uL2NvbW1hbmRzL2NvbmZpZy5qc29uJyxcbiAgJ2RvYyc6ICcuLi9jb21tYW5kcy9kb2MuanNvbicsXG4gICdlMmUnOiAnLi4vY29tbWFuZHMvZTJlLmpzb24nLFxuICAnZXh0cmFjdC1pMThuJzogJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi5qc29uJyxcbiAgJ21ha2UtdGhpcy1hd2Vzb21lJzogJy4uL2NvbW1hbmRzL2Vhc3Rlci1lZ2cuanNvbicsXG4gICdnZW5lcmF0ZSc6ICcuLi9jb21tYW5kcy9nZW5lcmF0ZS5qc29uJyxcbiAgJ2hlbHAnOiAnLi4vY29tbWFuZHMvaGVscC5qc29uJyxcbiAgJ2xpbnQnOiAnLi4vY29tbWFuZHMvbGludC5qc29uJyxcbiAgJ25ldyc6ICcuLi9jb21tYW5kcy9uZXcuanNvbicsXG4gICdydW4nOiAnLi4vY29tbWFuZHMvcnVuLmpzb24nLFxuICAnc2VydmUnOiAnLi4vY29tbWFuZHMvc2VydmUuanNvbicsXG4gICd0ZXN0JzogJy4uL2NvbW1hbmRzL3Rlc3QuanNvbicsXG4gICd1cGRhdGUnOiAnLi4vY29tbWFuZHMvdXBkYXRlLmpzb24nLFxuICAndmVyc2lvbic6ICcuLi9jb21tYW5kcy92ZXJzaW9uLmpzb24nLFxufTtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTWFwT3B0aW9ucyB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZztcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGFuYWx5dGljcyBpbnN0YW5jZS5cbiAqIEBwcml2YXRlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIF9jcmVhdGVBbmFseXRpY3MoXG4gIHdvcmtzcGFjZTogYm9vbGVhbixcbiAgc2tpcFByb21wdCA9IGZhbHNlLFxuKTogUHJvbWlzZTxhbmFseXRpY3MuQW5hbHl0aWNzPiB7XG4gIGxldCBjb25maWcgPSBhd2FpdCBnZXRHbG9iYWxBbmFseXRpY3MoKTtcbiAgLy8gSWYgaW4gd29ya3NwYWNlIGFuZCBnbG9iYWwgYW5hbHl0aWNzIGlzIGVuYWJsZWQsIGRlZmVyIHRvIHdvcmtzcGFjZSBsZXZlbFxuICBpZiAod29ya3NwYWNlICYmIGNvbmZpZykge1xuICAgIGNvbnN0IHNraXBBbmFseXRpY3MgPVxuICAgICAgc2tpcFByb21wdCB8fFxuICAgICAgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gJiZcbiAgICAgICAgKHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10udG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyB8fFxuICAgICAgICAgIHByb2Nlc3MuZW52WydOR19DTElfQU5BTFlUSUNTJ10gPT09ICcwJykpO1xuICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIGhvbm9yIHRoZSBgbm8taW50ZXJhY3RpdmVgIG9wdGlvbi5cbiAgICAvLyAgICAgICBJdCBpcyBjdXJyZW50bHkgbm90IGFuIGBuZ2Agb3B0aW9uIGJ1dCByYXRoZXIgb25seSBhbiBvcHRpb24gZm9yIHNwZWNpZmljIGNvbW1hbmRzLlxuICAgIC8vICAgICAgIFRoZSBjb25jZXB0IG9mIGBuZ2Atd2lkZSBvcHRpb25zIGFyZSBuZWVkZWQgdG8gY2xlYW5seSBoYW5kbGUgdGhpcy5cbiAgICBpZiAoIXNraXBBbmFseXRpY3MgJiYgIShhd2FpdCBoYXNXb3Jrc3BhY2VBbmFseXRpY3NDb25maWd1cmF0aW9uKCkpKSB7XG4gICAgICBhd2FpdCBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKCk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGF3YWl0IGdldFdvcmtzcGFjZUFuYWx5dGljcygpO1xuICB9XG5cbiAgY29uc3QgbWF5YmVTaGFyZWRBbmFseXRpY3MgPSBhd2FpdCBnZXRTaGFyZWRBbmFseXRpY3MoKTtcblxuICBpZiAoY29uZmlnICYmIG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTXVsdGlBbmFseXRpY3MoW2NvbmZpZywgbWF5YmVTaGFyZWRBbmFseXRpY3NdKTtcbiAgfSBlbHNlIGlmIChjb25maWcpIHtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9IGVsc2UgaWYgKG1heWJlU2hhcmVkQW5hbHl0aWNzKSB7XG4gICAgcmV0dXJuIG1heWJlU2hhcmVkQW5hbHl0aWNzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgYW5hbHl0aWNzLk5vb3BBbmFseXRpY3MoKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBsb2FkQ29tbWFuZERlc2NyaXB0aW9uKFxuICBuYW1lOiBzdHJpbmcsXG4gIHBhdGg6IHN0cmluZyxcbiAgcmVnaXN0cnk6IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSxcbik6IFByb21pc2U8Q29tbWFuZERlc2NyaXB0aW9uPiB7XG4gIGNvbnN0IHNjaGVtYVBhdGggPSByZXNvbHZlKF9fZGlybmFtZSwgcGF0aCk7XG4gIGNvbnN0IHNjaGVtYSA9IHJlYWRBbmRQYXJzZUpzb24oc2NoZW1hUGF0aCk7XG4gIGlmICghaXNKc29uT2JqZWN0KHNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCBKU09OIGxvYWRlZCBmcm9tICcgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFQYXRoKSk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24obmFtZSwgc2NoZW1hUGF0aCwgcmVnaXN0cnksIHNjaGVtYSk7XG59XG5cbi8qKlxuICogUnVuIGEgY29tbWFuZC5cbiAqIEBwYXJhbSBhcmdzIFJhdyB1bnBhcnNlZCBhcmd1bWVudHMuXG4gKiBAcGFyYW0gbG9nZ2VyIFRoZSBsb2dnZXIgdG8gdXNlLlxuICogQHBhcmFtIHdvcmtzcGFjZSBXb3Jrc3BhY2UgaW5mb3JtYXRpb24uXG4gKiBAcGFyYW0gY29tbWFuZHMgVGhlIG1hcCBvZiBzdXBwb3J0ZWQgY29tbWFuZHMuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkLFxuICBjb21tYW5kczogQ29tbWFuZE1hcE9wdGlvbnMgPSBzdGFuZGFyZENvbW1hbmRzLFxuICBvcHRpb25zOiB7IGFuYWx5dGljcz86IGFuYWx5dGljcy5BbmFseXRpY3M7IGN1cnJlbnREaXJlY3Rvcnk6IHN0cmluZyB9ID0ge1xuICAgIGN1cnJlbnREaXJlY3Rvcnk6IHByb2Nlc3MuY3dkKCksXG4gIH0sXG4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgLy8gVGhpcyByZWdpc3RyeSBpcyBleGNsdXNpdmVseSB1c2VkIGZvciBmbGF0dGVuaW5nIHNjaGVtYXMsIGFuZCBub3QgZm9yIHZhbGlkYXRpbmcuXG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoW10pO1xuICByZWdpc3RyeS5yZWdpc3RlclVyaUhhbmRsZXIoKHVyaTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHVyaS5zdGFydHNXaXRoKCduZy1jbGk6Ly8nKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uJywgdXJpLnN1YnN0cignbmctY2xpOi8vJy5sZW5ndGgpKSwgJ3V0Zi04Jyk7XG5cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNvbW1hbmROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGFyZyA9IGFyZ3NbaV07XG5cbiAgICBpZiAoIWFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGNvbW1hbmROYW1lID0gYXJnO1xuICAgICAgYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBsZXQgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbiB8IG51bGwgPSBudWxsO1xuXG4gIC8vIGlmIG5vIGNvbW1hbmRzIHdlcmUgZm91bmQsIHVzZSBgaGVscGAuXG4gIGlmICghY29tbWFuZE5hbWUpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDEgJiYgYXJnc1swXSA9PT0gJy0tdmVyc2lvbicpIHtcbiAgICAgIGNvbW1hbmROYW1lID0gJ3ZlcnNpb24nO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21tYW5kTmFtZSA9ICdoZWxwJztcbiAgICB9XG5cbiAgICBpZiAoIShjb21tYW5kTmFtZSBpbiBjb21tYW5kcykpIHtcbiAgICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICAgIFRoZSBcIiR7Y29tbWFuZE5hbWV9XCIgY29tbWFuZCBzZWVtcyB0byBiZSBkaXNhYmxlZC5cbiAgICAgICAgICBUaGlzIGlzIGFuIGlzc3VlIHdpdGggdGhlIENMSSBpdHNlbGYuIElmIHlvdSBzZWUgdGhpcyBjb21tZW50LCBwbGVhc2UgcmVwb3J0IGl0IGFuZFxuICAgICAgICAgIHByb3ZpZGUgeW91ciByZXBvc2l0b3J5LlxuICAgICAgICBgKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNvbW1hbmROYW1lIGluIGNvbW1hbmRzKSB7XG4gICAgZGVzY3JpcHRpb24gPSBhd2FpdCBsb2FkQ29tbWFuZERlc2NyaXB0aW9uKGNvbW1hbmROYW1lLCBjb21tYW5kc1tjb21tYW5kTmFtZV0sIHJlZ2lzdHJ5KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjb21tYW5kTmFtZXMgPSBPYmplY3Qua2V5cyhjb21tYW5kcyk7XG5cbiAgICAvLyBPcHRpbWl6ZSBsb2FkaW5nIGZvciBjb21tb24gYWxpYXNlc1xuICAgIGlmIChjb21tYW5kTmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbW1hbmROYW1lcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGNvbnN0IGFNYXRjaCA9IGFbMF0gPT09IGNvbW1hbmROYW1lO1xuICAgICAgICBjb25zdCBiTWF0Y2ggPSBiWzBdID09PSBjb21tYW5kTmFtZTtcbiAgICAgICAgaWYgKGFNYXRjaCAmJiAhYk1hdGNoKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9IGVsc2UgaWYgKCFhTWF0Y2ggJiYgYk1hdGNoKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb21tYW5kTmFtZXMpIHtcbiAgICAgIGNvbnN0IGFsaWFzRGVzYyA9IGF3YWl0IGxvYWRDb21tYW5kRGVzY3JpcHRpb24obmFtZSwgY29tbWFuZHNbbmFtZV0sIHJlZ2lzdHJ5KTtcbiAgICAgIGNvbnN0IGFsaWFzZXMgPSBhbGlhc0Rlc2MuYWxpYXNlcztcblxuICAgICAgaWYgKGFsaWFzZXMgJiYgYWxpYXNlcy5zb21lKChhbGlhcykgPT4gYWxpYXMgPT09IGNvbW1hbmROYW1lKSkge1xuICAgICAgICBjb21tYW5kTmFtZSA9IG5hbWU7XG4gICAgICAgIGRlc2NyaXB0aW9uID0gYWxpYXNEZXNjO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWRlc2NyaXB0aW9uKSB7XG4gICAgY29uc3QgY29tbWFuZHNEaXN0YW5jZSA9IHt9IGFzIHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9O1xuICAgIGNvbnN0IG5hbWUgPSBjb21tYW5kTmFtZTtcbiAgICBjb25zdCBhbGxDb21tYW5kcyA9IE9iamVjdC5rZXlzKGNvbW1hbmRzKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoIShhIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYV0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGEsIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKCEoYiBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2JdID0gc3RyaW5ncy5sZXZlbnNodGVpbihiLCBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbW1hbmRzRGlzdGFuY2VbYV0gLSBjb21tYW5kc0Rpc3RhbmNlW2JdO1xuICAgIH0pO1xuXG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoZSBzcGVjaWZpZWQgY29tbWFuZCAoXCIke2NvbW1hbmROYW1lfVwiKSBpcyBpbnZhbGlkLiBGb3IgYSBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zLFxuICAgICAgICBydW4gXCJuZyBoZWxwXCIuXG5cbiAgICAgICAgRGlkIHlvdSBtZWFuIFwiJHthbGxDb21tYW5kc1swXX1cIj9cbiAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VyLnBhcnNlQXJndW1lbnRzKGFyZ3MsIGRlc2NyaXB0aW9uLm9wdGlvbnMsIGxvZ2dlcik7XG4gICAgQ29tbWFuZC5zZXRDb21tYW5kTWFwKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1hcDogUmVjb3JkPHN0cmluZywgQ29tbWFuZERlc2NyaXB0aW9uPiA9IHt9O1xuICAgICAgZm9yIChjb25zdCBbbmFtZSwgcGF0aF0gb2YgT2JqZWN0LmVudHJpZXMoY29tbWFuZHMpKSB7XG4gICAgICAgIG1hcFtuYW1lXSA9IGF3YWl0IGxvYWRDb21tYW5kRGVzY3JpcHRpb24obmFtZSwgcGF0aCwgcmVnaXN0cnkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWFwO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYW5hbHl0aWNzID1cbiAgICAgIG9wdGlvbnMuYW5hbHl0aWNzIHx8IChhd2FpdCBfY3JlYXRlQW5hbHl0aWNzKCEhd29ya3NwYWNlLCBkZXNjcmlwdGlvbi5uYW1lID09PSAndXBkYXRlJykpO1xuICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICB3b3Jrc3BhY2UsXG4gICAgICBhbmFseXRpY3MsXG4gICAgICBjdXJyZW50RGlyZWN0b3J5OiBvcHRpb25zLmN1cnJlbnREaXJlY3RvcnksXG4gICAgICByb290OiB3b3Jrc3BhY2U/LmJhc2VQYXRoID8/IG9wdGlvbnMuY3VycmVudERpcmVjdG9yeSxcbiAgICB9O1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgZGVzY3JpcHRpb24uaW1wbChjb250ZXh0LCBkZXNjcmlwdGlvbiwgbG9nZ2VyKTtcblxuICAgIC8vIEZsdXNoIG9uIGFuIGludGVydmFsIChpZiB0aGUgZXZlbnQgbG9vcCBpcyB3YWl0aW5nKS5cbiAgICBsZXQgYW5hbHl0aWNzRmx1c2hQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgY29uc3QgYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGFuYWx5dGljc0ZsdXNoUHJvbWlzZSA9IGFuYWx5dGljc0ZsdXNoUHJvbWlzZS50aGVuKCgpID0+IGFuYWx5dGljcy5mbHVzaCgpKTtcbiAgICB9LCAxMDAwKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbW1hbmQudmFsaWRhdGVBbmRSdW4ocGFyc2VkT3B0aW9ucyk7XG5cbiAgICAvLyBGbHVzaCBvbmUgbGFzdCB0aW1lLlxuICAgIGNsZWFySW50ZXJ2YWwoYW5hbHl0aWNzRmx1c2hJbnRlcnZhbCk7XG4gICAgYXdhaXQgYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gYW5hbHl0aWNzLmZsdXNoKCkpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgcGFyc2VyLlBhcnNlQXJndW1lbnRFeGNlcHRpb24pIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQ2Fubm90IHBhcnNlIGFyZ3VtZW50cy4gU2VlIGJlbG93IGZvciB0aGUgcmVhc29ucy4nKTtcbiAgICAgIGxvZ2dlci5mYXRhbCgnICAgICcgKyBlLmNvbW1lbnRzLmpvaW4oJ1xcbiAgICAnKSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuIl19