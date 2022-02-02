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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvY29tbWFuZC1ydW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQVE4QjtBQUM5QiwyQkFBa0M7QUFDbEMsK0JBQXFDO0FBRXJDLHNEQUEwRDtBQUMxRCwwREFBK0U7QUFDL0UsMkNBTXFCO0FBQ3JCLHVDQUFvQztBQUVwQyxpREFBbUM7QUFFbkMsOEZBQThGO0FBQzlGLE1BQU0sZ0JBQWdCLEdBQUc7SUFDdkIsS0FBSyxFQUFFLHNCQUFzQjtJQUM3QixXQUFXLEVBQUUsNEJBQTRCO0lBQ3pDLE9BQU8sRUFBRSx3QkFBd0I7SUFDakMsUUFBUSxFQUFFLHlCQUF5QjtJQUNuQyxRQUFRLEVBQUUseUJBQXlCO0lBQ25DLEtBQUssRUFBRSxzQkFBc0I7SUFDN0IsS0FBSyxFQUFFLHNCQUFzQjtJQUM3QixjQUFjLEVBQUUsK0JBQStCO0lBQy9DLG1CQUFtQixFQUFFLDZCQUE2QjtJQUNsRCxVQUFVLEVBQUUsMkJBQTJCO0lBQ3ZDLE1BQU0sRUFBRSx1QkFBdUI7SUFDL0IsTUFBTSxFQUFFLHVCQUF1QjtJQUMvQixLQUFLLEVBQUUsc0JBQXNCO0lBQzdCLEtBQUssRUFBRSxzQkFBc0I7SUFDN0IsT0FBTyxFQUFFLHdCQUF3QjtJQUNqQyxNQUFNLEVBQUUsdUJBQXVCO0lBQy9CLFFBQVEsRUFBRSx5QkFBeUI7SUFDbkMsU0FBUyxFQUFFLDBCQUEwQjtDQUN0QyxDQUFDO0FBTUY7OztHQUdHO0FBQ0gsS0FBSyxVQUFVLGdCQUFnQixDQUM3QixTQUFrQixFQUNsQixVQUFVLEdBQUcsS0FBSztJQUVsQixJQUFJLE1BQU0sR0FBRyxNQUFNLElBQUEsOEJBQWtCLEdBQUUsQ0FBQztJQUN4Qyw0RUFBNEU7SUFDNUUsSUFB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Q0FBQztBQXpKRCxnQ0F5SkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgYW5hbHl0aWNzLFxuICBpc0pzb25PYmplY3QsXG4gIGpzb24sXG4gIGxvZ2dpbmcsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgcmVhZEFuZFBhcnNlSnNvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLWZpbGUnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHtcbiAgZ2V0R2xvYmFsQW5hbHl0aWNzLFxuICBnZXRTaGFyZWRBbmFseXRpY3MsXG4gIGdldFdvcmtzcGFjZUFuYWx5dGljcyxcbiAgaGFzV29ya3NwYWNlQW5hbHl0aWNzQ29uZmlndXJhdGlvbixcbiAgcHJvbXB0UHJvamVjdEFuYWx5dGljcyxcbn0gZnJvbSAnLi9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgeyBDb21tYW5kRGVzY3JpcHRpb24gfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSAnLi9wYXJzZXInO1xuXG4vLyBOT1RFOiBVcGRhdGUgY29tbWFuZHMuanNvbiBpZiBjaGFuZ2luZyB0aGlzLiAgSXQncyBzdGlsbCBkZWVwIGltcG9ydGVkIGluIG9uZSBDSSB2YWxpZGF0aW9uXG5jb25zdCBzdGFuZGFyZENvbW1hbmRzID0ge1xuICAnYWRkJzogJy4uL2NvbW1hbmRzL2FkZC5qc29uJyxcbiAgJ2FuYWx5dGljcyc6ICcuLi9jb21tYW5kcy9hbmFseXRpY3MuanNvbicsXG4gICdidWlsZCc6ICcuLi9jb21tYW5kcy9idWlsZC5qc29uJyxcbiAgJ2RlcGxveSc6ICcuLi9jb21tYW5kcy9kZXBsb3kuanNvbicsXG4gICdjb25maWcnOiAnLi4vY29tbWFuZHMvY29uZmlnLmpzb24nLFxuICAnZG9jJzogJy4uL2NvbW1hbmRzL2RvYy5qc29uJyxcbiAgJ2UyZSc6ICcuLi9jb21tYW5kcy9lMmUuanNvbicsXG4gICdleHRyYWN0LWkxOG4nOiAnLi4vY29tbWFuZHMvZXh0cmFjdC1pMThuLmpzb24nLFxuICAnbWFrZS10aGlzLWF3ZXNvbWUnOiAnLi4vY29tbWFuZHMvZWFzdGVyLWVnZy5qc29uJyxcbiAgJ2dlbmVyYXRlJzogJy4uL2NvbW1hbmRzL2dlbmVyYXRlLmpzb24nLFxuICAnaGVscCc6ICcuLi9jb21tYW5kcy9oZWxwLmpzb24nLFxuICAnbGludCc6ICcuLi9jb21tYW5kcy9saW50Lmpzb24nLFxuICAnbmV3JzogJy4uL2NvbW1hbmRzL25ldy5qc29uJyxcbiAgJ3J1bic6ICcuLi9jb21tYW5kcy9ydW4uanNvbicsXG4gICdzZXJ2ZSc6ICcuLi9jb21tYW5kcy9zZXJ2ZS5qc29uJyxcbiAgJ3Rlc3QnOiAnLi4vY29tbWFuZHMvdGVzdC5qc29uJyxcbiAgJ3VwZGF0ZSc6ICcuLi9jb21tYW5kcy91cGRhdGUuanNvbicsXG4gICd2ZXJzaW9uJzogJy4uL2NvbW1hbmRzL3ZlcnNpb24uanNvbicsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNYXBPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG4vKipcbiAqIENyZWF0ZSB0aGUgYW5hbHl0aWNzIGluc3RhbmNlLlxuICogQHByaXZhdGVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gX2NyZWF0ZUFuYWx5dGljcyhcbiAgd29ya3NwYWNlOiBib29sZWFuLFxuICBza2lwUHJvbXB0ID0gZmFsc2UsXG4pOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgbGV0IGNvbmZpZyA9IGF3YWl0IGdldEdsb2JhbEFuYWx5dGljcygpO1xuICAvLyBJZiBpbiB3b3Jrc3BhY2UgYW5kIGdsb2JhbCBhbmFseXRpY3MgaXMgZW5hYmxlZCwgZGVmZXIgdG8gd29ya3NwYWNlIGxldmVsXG4gIGlmICh3b3Jrc3BhY2UgJiYgY29uZmlnKSB7XG4gICAgY29uc3Qgc2tpcEFuYWx5dGljcyA9XG4gICAgICBza2lwUHJvbXB0IHx8XG4gICAgICAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSAmJlxuICAgICAgICAocHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXS50b0xvd2VyQ2FzZSgpID09PSAnZmFsc2UnIHx8XG4gICAgICAgICAgcHJvY2Vzcy5lbnZbJ05HX0NMSV9BTkFMWVRJQ1MnXSA9PT0gJzAnKSk7XG4gICAgLy8gVE9ETzogVGhpcyBzaG91bGQgaG9ub3IgdGhlIGBuby1pbnRlcmFjdGl2ZWAgb3B0aW9uLlxuICAgIC8vICAgICAgIEl0IGlzIGN1cnJlbnRseSBub3QgYW4gYG5nYCBvcHRpb24gYnV0IHJhdGhlciBvbmx5IGFuIG9wdGlvbiBmb3Igc3BlY2lmaWMgY29tbWFuZHMuXG4gICAgLy8gICAgICAgVGhlIGNvbmNlcHQgb2YgYG5nYC13aWRlIG9wdGlvbnMgYXJlIG5lZWRlZCB0byBjbGVhbmx5IGhhbmRsZSB0aGlzLlxuICAgIGlmICghc2tpcEFuYWx5dGljcyAmJiAhKGF3YWl0IGhhc1dvcmtzcGFjZUFuYWx5dGljc0NvbmZpZ3VyYXRpb24oKSkpIHtcbiAgICAgIGF3YWl0IHByb21wdFByb2plY3RBbmFseXRpY3MoKTtcbiAgICB9XG4gICAgY29uZmlnID0gYXdhaXQgZ2V0V29ya3NwYWNlQW5hbHl0aWNzKCk7XG4gIH1cblxuICBjb25zdCBtYXliZVNoYXJlZEFuYWx5dGljcyA9IGF3YWl0IGdldFNoYXJlZEFuYWx5dGljcygpO1xuXG4gIGlmIChjb25maWcgJiYgbWF5YmVTaGFyZWRBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gbmV3IGFuYWx5dGljcy5NdWx0aUFuYWx5dGljcyhbY29uZmlnLCBtYXliZVNoYXJlZEFuYWx5dGljc10pO1xuICB9IGVsc2UgaWYgKGNvbmZpZykge1xuICAgIHJldHVybiBjb25maWc7XG4gIH0gZWxzZSBpZiAobWF5YmVTaGFyZWRBbmFseXRpY3MpIHtcbiAgICByZXR1cm4gbWF5YmVTaGFyZWRBbmFseXRpY3M7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRDb21tYW5kRGVzY3JpcHRpb24oXG4gIG5hbWU6IHN0cmluZyxcbiAgcGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5LFxuKTogUHJvbWlzZTxDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgY29uc3Qgc2NoZW1hUGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCBwYXRoKTtcbiAgY29uc3Qgc2NoZW1hID0gcmVhZEFuZFBhcnNlSnNvbihzY2hlbWFQYXRoKTtcbiAgaWYgKCFpc0pzb25PYmplY3Qoc2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb21tYW5kIEpTT04gbG9hZGVkIGZyb20gJyArIEpTT04uc3RyaW5naWZ5KHNjaGVtYVBhdGgpKTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBzY2hlbWFQYXRoLCByZWdpc3RyeSwgc2NoZW1hKTtcbn1cblxuLyoqXG4gKiBSdW4gYSBjb21tYW5kLlxuICogQHBhcmFtIGFyZ3MgUmF3IHVucGFyc2VkIGFyZ3VtZW50cy5cbiAqIEBwYXJhbSBsb2dnZXIgVGhlIGxvZ2dlciB0byB1c2UuXG4gKiBAcGFyYW0gd29ya3NwYWNlIFdvcmtzcGFjZSBpbmZvcm1hdGlvbi5cbiAqIEBwYXJhbSBjb21tYW5kcyBUaGUgbWFwIG9mIHN1cHBvcnRlZCBjb21tYW5kcy5cbiAqIEBwYXJhbSBvcHRpb25zIEFkZGl0aW9uYWwgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNvbW1hbmQoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICB3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UgfCB1bmRlZmluZWQsXG4gIGNvbW1hbmRzOiBDb21tYW5kTWFwT3B0aW9ucyA9IHN0YW5kYXJkQ29tbWFuZHMsXG4gIG9wdGlvbnM6IHsgYW5hbHl0aWNzPzogYW5hbHl0aWNzLkFuYWx5dGljczsgY3VycmVudERpcmVjdG9yeTogc3RyaW5nIH0gPSB7XG4gICAgY3VycmVudERpcmVjdG9yeTogcHJvY2Vzcy5jd2QoKSxcbiAgfSxcbik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAvLyBUaGlzIHJlZ2lzdHJ5IGlzIGV4Y2x1c2l2ZWx5IHVzZWQgZm9yIGZsYXR0ZW5pbmcgc2NoZW1hcywgYW5kIG5vdCBmb3IgdmFsaWRhdGluZy5cbiAgY29uc3QgcmVnaXN0cnkgPSBuZXcgc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeShbXSk7XG4gIHJlZ2lzdHJ5LnJlZ2lzdGVyVXJpSGFuZGxlcigodXJpOiBzdHJpbmcpID0+IHtcbiAgICBpZiAodXJpLnN0YXJ0c1dpdGgoJ25nLWNsaTovLycpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4nLCB1cmkuc3Vic3RyKCduZy1jbGk6Ly8nLmxlbmd0aCkpLCAndXRmLTgnKTtcblxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY29tbWFuZE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmICghYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGxldCBkZXNjcmlwdGlvbjogQ29tbWFuZERlc2NyaXB0aW9uIHwgbnVsbCA9IG51bGw7XG5cbiAgLy8gaWYgbm8gY29tbWFuZHMgd2VyZSBmb3VuZCwgdXNlIGBoZWxwYC5cbiAgaWYgKCFjb21tYW5kTmFtZSkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiBhcmdzWzBdID09PSAnLS12ZXJzaW9uJykge1xuICAgICAgY29tbWFuZE5hbWUgPSAndmVyc2lvbic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmROYW1lID0gJ2hlbHAnO1xuICAgIH1cblxuICAgIGlmICghKGNvbW1hbmROYW1lIGluIGNvbW1hbmRzKSkge1xuICAgICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgICAgVGhlIFwiJHtjb21tYW5kTmFtZX1cIiBjb21tYW5kIHNlZW1zIHRvIGJlIGRpc2FibGVkLlxuICAgICAgICAgIFRoaXMgaXMgYW4gaXNzdWUgd2l0aCB0aGUgQ0xJIGl0c2VsZi4gSWYgeW91IHNlZSB0aGlzIGNvbW1lbnQsIHBsZWFzZSByZXBvcnQgaXQgYW5kXG4gICAgICAgICAgcHJvdmlkZSB5b3VyIHJlcG9zaXRvcnkuXG4gICAgICAgIGApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gIH1cblxuICBpZiAoY29tbWFuZE5hbWUgaW4gY29tbWFuZHMpIHtcbiAgICBkZXNjcmlwdGlvbiA9IGF3YWl0IGxvYWRDb21tYW5kRGVzY3JpcHRpb24oY29tbWFuZE5hbWUsIGNvbW1hbmRzW2NvbW1hbmROYW1lXSwgcmVnaXN0cnkpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNvbW1hbmROYW1lcyA9IE9iamVjdC5rZXlzKGNvbW1hbmRzKTtcblxuICAgIC8vIE9wdGltaXplIGxvYWRpbmcgZm9yIGNvbW1vbiBhbGlhc2VzXG4gICAgaWYgKGNvbW1hbmROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29tbWFuZE5hbWVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgY29uc3QgYU1hdGNoID0gYVswXSA9PT0gY29tbWFuZE5hbWU7XG4gICAgICAgIGNvbnN0IGJNYXRjaCA9IGJbMF0gPT09IGNvbW1hbmROYW1lO1xuICAgICAgICBpZiAoYU1hdGNoICYmICFiTWF0Y2gpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAoIWFNYXRjaCAmJiBiTWF0Y2gpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbW1hbmROYW1lcykge1xuICAgICAgY29uc3QgYWxpYXNEZXNjID0gYXdhaXQgbG9hZENvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBjb21tYW5kc1tuYW1lXSwgcmVnaXN0cnkpO1xuICAgICAgY29uc3QgYWxpYXNlcyA9IGFsaWFzRGVzYy5hbGlhc2VzO1xuXG4gICAgICBpZiAoYWxpYXNlcyAmJiBhbGlhc2VzLnNvbWUoKGFsaWFzKSA9PiBhbGlhcyA9PT0gY29tbWFuZE5hbWUpKSB7XG4gICAgICAgIGNvbW1hbmROYW1lID0gbmFtZTtcbiAgICAgICAgZGVzY3JpcHRpb24gPSBhbGlhc0Rlc2M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghZGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBjb21tYW5kc0Rpc3RhbmNlID0ge30gYXMgeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH07XG4gICAgY29uc3QgbmFtZSA9IGNvbW1hbmROYW1lO1xuICAgIGNvbnN0IGFsbENvbW1hbmRzID0gT2JqZWN0LmtleXMoY29tbWFuZHMpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGlmICghKGEgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgY29tbWFuZHNEaXN0YW5jZVthXSA9IHN0cmluZ3MubGV2ZW5zaHRlaW4oYSwgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoIShiIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYl0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGIsIG5hbWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29tbWFuZHNEaXN0YW5jZVthXSAtIGNvbW1hbmRzRGlzdGFuY2VbYl07XG4gICAgfSk7XG5cbiAgICBsb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhlIHNwZWNpZmllZCBjb21tYW5kIChcIiR7Y29tbWFuZE5hbWV9XCIpIGlzIGludmFsaWQuIEZvciBhIGxpc3Qgb2YgYXZhaWxhYmxlIG9wdGlvbnMsXG4gICAgICAgIHJ1biBcIm5nIGhlbHBcIi5cblxuICAgICAgICBEaWQgeW91IG1lYW4gXCIke2FsbENvbW1hbmRzWzBdfVwiP1xuICAgIGApO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZXIucGFyc2VBcmd1bWVudHMoYXJncywgZGVzY3JpcHRpb24ub3B0aW9ucywgbG9nZ2VyKTtcbiAgICBDb21tYW5kLnNldENvbW1hbmRNYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbWFwOiBSZWNvcmQ8c3RyaW5nLCBDb21tYW5kRGVzY3JpcHRpb24+ID0ge307XG4gICAgICBmb3IgKGNvbnN0IFtuYW1lLCBwYXRoXSBvZiBPYmplY3QuZW50cmllcyhjb21tYW5kcykpIHtcbiAgICAgICAgbWFwW25hbWVdID0gYXdhaXQgbG9hZENvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBwYXRoLCByZWdpc3RyeSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSk7XG5cbiAgICBjb25zdCBhbmFseXRpY3MgPVxuICAgICAgb3B0aW9ucy5hbmFseXRpY3MgfHwgKGF3YWl0IF9jcmVhdGVBbmFseXRpY3MoISF3b3Jrc3BhY2UsIGRlc2NyaXB0aW9uLm5hbWUgPT09ICd1cGRhdGUnKSk7XG4gICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgIHdvcmtzcGFjZSxcbiAgICAgIGFuYWx5dGljcyxcbiAgICAgIGN1cnJlbnREaXJlY3Rvcnk6IG9wdGlvbnMuY3VycmVudERpcmVjdG9yeSxcbiAgICAgIHJvb3Q6IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gb3B0aW9ucy5jdXJyZW50RGlyZWN0b3J5LFxuICAgIH07XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBkZXNjcmlwdGlvbi5pbXBsKGNvbnRleHQsIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuXG4gICAgLy8gRmx1c2ggb24gYW4gaW50ZXJ2YWwgKGlmIHRoZSBldmVudCBsb29wIGlzIHdhaXRpbmcpLlxuICAgIGxldCBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBjb25zdCBhbmFseXRpY3NGbHVzaEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgYW5hbHl0aWNzRmx1c2hQcm9taXNlID0gYW5hbHl0aWNzRmx1c2hQcm9taXNlLnRoZW4oKCkgPT4gYW5hbHl0aWNzLmZsdXNoKCkpO1xuICAgIH0sIDEwMDApO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29tbWFuZC52YWxpZGF0ZUFuZFJ1bihwYXJzZWRPcHRpb25zKTtcblxuICAgIC8vIEZsdXNoIG9uZSBsYXN0IHRpbWUuXG4gICAgY2xlYXJJbnRlcnZhbChhbmFseXRpY3NGbHVzaEludGVydmFsKTtcbiAgICBhd2FpdCBhbmFseXRpY3NGbHVzaFByb21pc2UudGhlbigoKSA9PiBhbmFseXRpY3MuZmx1c2goKSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBwYXJzZXIuUGFyc2VBcmd1bWVudEV4Y2VwdGlvbikge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdDYW5ub3QgcGFyc2UgYXJndW1lbnRzLiBTZWUgYmVsb3cgZm9yIHRoZSByZWFzb25zLicpO1xuICAgICAgbG9nZ2VyLmZhdGFsKCcgICAgJyArIGUuY29tbWVudHMuam9pbignXFxuICAgICcpKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG4iXX0=