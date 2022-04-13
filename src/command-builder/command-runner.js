"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = void 0;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const cli_1 = require("../commands/add/cli");
const cli_2 = require("../commands/analytics/cli");
const cli_3 = require("../commands/build/cli");
const cli_4 = require("../commands/cache/cli");
const cli_5 = require("../commands/completion/cli");
const cli_6 = require("../commands/config/cli");
const cli_7 = require("../commands/deploy/cli");
const cli_8 = require("../commands/doc/cli");
const cli_9 = require("../commands/e2e/cli");
const cli_10 = require("../commands/extract-i18n/cli");
const cli_11 = require("../commands/generate/cli");
const cli_12 = require("../commands/lint/cli");
const cli_13 = require("../commands/make-this-awesome/cli");
const cli_14 = require("../commands/new/cli");
const cli_15 = require("../commands/run/cli");
const cli_16 = require("../commands/serve/cli");
const cli_17 = require("../commands/test/cli");
const cli_18 = require("../commands/update/cli");
const cli_19 = require("../commands/version/cli");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const package_manager_1 = require("../utilities/package-manager");
const command_module_1 = require("./command-module");
const command_1 = require("./utilities/command");
const json_help_1 = require("./utilities/json-help");
const normalize_options_middleware_1 = require("./utilities/normalize-options-middleware");
const COMMANDS = [
    cli_19.VersionCommandModule,
    cli_8.DocCommandModule,
    cli_13.AwesomeCommandModule,
    cli_6.ConfigCommandModule,
    cli_2.AnalyticsCommandModule,
    cli_1.AddCommandModule,
    cli_11.GenerateCommandModule,
    cli_3.BuildCommandModule,
    cli_9.E2eCommandModule,
    cli_17.TestCommandModule,
    cli_16.ServeCommandModule,
    cli_10.ExtractI18nCommandModule,
    cli_7.DeployCommandModule,
    cli_12.LintCommandModule,
    cli_14.NewCommandModule,
    cli_18.UpdateCommandModule,
    cli_15.RunCommandModule,
    cli_4.CacheCommandModule,
    cli_5.CompletionCommandModule,
].sort(); // Will be sorted by class name.
const yargsParser = helpers_1.Parser;
async function runCommand(args, logger) {
    var _a, _b;
    const { $0, _, help = false, jsonHelp = false, getYargsCompletions = false, ...rest } = yargsParser(args, {
        boolean: ['help', 'json-help', 'get-yargs-completions'],
        alias: { 'collection': 'c' },
    });
    // When `getYargsCompletions` is true the scriptName 'ng' at index 0 is not removed.
    const positional = getYargsCompletions ? _.slice(1) : _;
    let workspace;
    let globalConfiguration;
    try {
        [workspace, globalConfiguration] = await Promise.all([
            (0, config_1.getWorkspace)('local'),
            (0, config_1.getWorkspace)('global'),
        ]);
    }
    catch (e) {
        logger.fatal(e.message);
        return 1;
    }
    const root = (_a = workspace === null || workspace === void 0 ? void 0 : workspace.basePath) !== null && _a !== void 0 ? _a : process.cwd();
    const context = {
        globalConfiguration,
        workspace,
        logger,
        currentDirectory: process.cwd(),
        root,
        packageManager: new package_manager_1.PackageManagerUtils({ globalConfiguration, workspace, root }),
        args: {
            positional: positional.map((v) => v.toString()),
            options: {
                help,
                jsonHelp,
                getYargsCompletions,
                ...rest,
            },
        },
    };
    let localYargs = (0, yargs_1.default)(args);
    for (const CommandModule of COMMANDS) {
        if (!jsonHelp) {
            // Skip scope validation when running with '--json-help' since it's easier to generate the output for all commands this way.
            const scope = CommandModule.scope;
            if ((scope === command_module_1.CommandScope.In && !workspace) || (scope === command_module_1.CommandScope.Out && workspace)) {
                continue;
            }
        }
        localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, CommandModule, context);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageInstance = localYargs.getInternalMethods().getUsageInstance();
    if (jsonHelp) {
        usageInstance.help = () => (0, json_help_1.jsonHelpUsage)();
    }
    if (getYargsCompletions) {
        // When in auto completion mode avoid printing description as it causes a slugish
        // experience when there are a large set of options.
        usageInstance.getDescriptions = () => ({});
    }
    await localYargs
        .scriptName('ng')
        // https://github.com/yargs/yargs/blob/main/docs/advanced.md#customizing-yargs-parser
        .parserConfiguration({
        'populate--': true,
        'unknown-options-as-args': false,
        'dot-notation': false,
        'boolean-negation': true,
        'strip-aliased': true,
        'strip-dashed': true,
        'camel-case-expansion': false,
    })
        .option('json-help', {
        describe: 'Show help in JSON format.',
        implies: ['help'],
        hidden: true,
        type: 'boolean',
    })
        .help('help', 'Shows a help message for this command in the console.')
        // A complete list of strings can be found: https://github.com/yargs/yargs/blob/main/locales/en.json
        .updateStrings({
        'Commands:': color_1.colors.cyan('Commands:'),
        'Options:': color_1.colors.cyan('Options:'),
        'Positionals:': color_1.colors.cyan('Arguments:'),
        'deprecated': color_1.colors.yellow('deprecated'),
        'deprecated: %s': color_1.colors.yellow('deprecated:') + ' %s',
        'Did you mean %s?': 'Unknown command. Did you mean %s?',
    })
        .demandCommand(1, command_1.demandCommandFailureMessage)
        .recommendCommands()
        .middleware(normalize_options_middleware_1.normalizeOptionsMiddleware)
        .version(false)
        .showHelpOnFail(false)
        .strict()
        .fail((msg, err) => {
        throw msg
            ? // Validation failed example: `Unknown argument:`
                new command_module_1.CommandModuleError(msg)
            : // Unknown exception, re-throw.
                err;
    })
        .wrap(yargs_1.default.terminalWidth())
        .parseAsync();
    return (_b = process.exitCode) !== null && _b !== void 0 ? _b : 0;
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELG9EQUFxRTtBQUNyRSxnREFBNkQ7QUFDN0QsZ0RBQTZEO0FBQzdELDZDQUF1RDtBQUN2RCw2Q0FBdUQ7QUFDdkQsdURBQXdFO0FBQ3hFLG1EQUFpRTtBQUNqRSwrQ0FBeUQ7QUFDekQsNERBQXlFO0FBQ3pFLDhDQUF1RDtBQUN2RCw4Q0FBdUQ7QUFDdkQsZ0RBQTJEO0FBQzNELCtDQUF5RDtBQUN6RCxpREFBNkQ7QUFDN0Qsa0RBQStEO0FBQy9ELDhDQUE0QztBQUM1QyxnREFBcUU7QUFDckUsa0VBQW1FO0FBQ25FLHFEQUFvRjtBQUNwRixpREFBMkY7QUFDM0YscURBQXNEO0FBQ3RELDJGQUFzRjtBQUV0RixNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDRCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsK0JBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7SUFDaEIsd0JBQWtCO0lBQ2xCLDZCQUF1QjtDQUN4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FB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RyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pCLE1BQU0sR0FBRztZQUNQLENBQUMsQ0FBQyxpREFBaUQ7Z0JBQ2pELElBQUksbUNBQWtCLENBQUMsR0FBRyxDQUFDO1lBQzdCLENBQUMsQ0FBQywrQkFBK0I7Z0JBQy9CLEdBQUcsQ0FBQztJQUNWLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxlQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDM0IsVUFBVSxFQUFFLENBQUM7SUFFaEIsT0FBTyxNQUFBLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBdEhELGdDQXNIQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgQWRkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FkZC9jbGknO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FuYWx5dGljcy9jbGknO1xuaW1wb3J0IHsgQnVpbGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYnVpbGQvY2xpJztcbmltcG9ydCB7IENhY2hlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NhY2hlL2NsaSc7XG5pbXBvcnQgeyBDb21wbGV0aW9uQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NvbXBsZXRpb24vY2xpJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb25maWcvY2xpJztcbmltcG9ydCB7IERlcGxveUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kZXBsb3kvY2xpJztcbmltcG9ydCB7IERvY0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kb2MvY2xpJztcbmltcG9ydCB7IEUyZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9lMmUvY2xpJztcbmltcG9ydCB7IEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi9jbGknO1xuaW1wb3J0IHsgR2VuZXJhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZ2VuZXJhdGUvY2xpJztcbmltcG9ydCB7IExpbnRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbGludC9jbGknO1xuaW1wb3J0IHsgQXdlc29tZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9tYWtlLXRoaXMtYXdlc29tZS9jbGknO1xuaW1wb3J0IHsgTmV3Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL25ldy9jbGknO1xuaW1wb3J0IHsgUnVuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3J1bi9jbGknO1xuaW1wb3J0IHsgU2VydmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvc2VydmUvY2xpJztcbmltcG9ydCB7IFRlc3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdGVzdC9jbGknO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3VwZGF0ZS9jbGknO1xuaW1wb3J0IHsgVmVyc2lvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy92ZXJzaW9uL2NsaSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSwgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlclV0aWxzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBDb21tYW5kQ29udGV4dCwgQ29tbWFuZE1vZHVsZUVycm9yLCBDb21tYW5kU2NvcGUgfSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UgfSBmcm9tICcuL3V0aWxpdGllcy9jb21tYW5kJztcbmltcG9ydCB7IGpzb25IZWxwVXNhZ2UgfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLWhlbHAnO1xuaW1wb3J0IHsgbm9ybWFsaXplT3B0aW9uc01pZGRsZXdhcmUgfSBmcm9tICcuL3V0aWxpdGllcy9ub3JtYWxpemUtb3B0aW9ucy1taWRkbGV3YXJlJztcblxuY29uc3QgQ09NTUFORFMgPSBbXG4gIFZlcnNpb25Db21tYW5kTW9kdWxlLFxuICBEb2NDb21tYW5kTW9kdWxlLFxuICBBd2Vzb21lQ29tbWFuZE1vZHVsZSxcbiAgQ29uZmlnQ29tbWFuZE1vZHVsZSxcbiAgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSxcbiAgQWRkQ29tbWFuZE1vZHVsZSxcbiAgR2VuZXJhdGVDb21tYW5kTW9kdWxlLFxuICBCdWlsZENvbW1hbmRNb2R1bGUsXG4gIEUyZUNvbW1hbmRNb2R1bGUsXG4gIFRlc3RDb21tYW5kTW9kdWxlLFxuICBTZXJ2ZUNvbW1hbmRNb2R1bGUsXG4gIEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSxcbiAgRGVwbG95Q29tbWFuZE1vZHVsZSxcbiAgTGludENvbW1hbmRNb2R1bGUsXG4gIE5ld0NvbW1hbmRNb2R1bGUsXG4gIFVwZGF0ZUNvbW1hbmRNb2R1bGUsXG4gIFJ1bkNvbW1hbmRNb2R1bGUsXG4gIENhY2hlQ29tbWFuZE1vZHVsZSxcbiAgQ29tcGxldGlvbkNvbW1hbmRNb2R1bGUsXG5dLnNvcnQoKTsgLy8gV2lsbCBiZSBzb3J0ZWQgYnkgY2xhc3MgbmFtZS5cblxuY29uc3QgeWFyZ3NQYXJzZXIgPSBQYXJzZXIgYXMgdW5rbm93biBhcyB0eXBlb2YgUGFyc2VyLmRlZmF1bHQ7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKGFyZ3M6IHN0cmluZ1tdLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qge1xuICAgICQwLFxuICAgIF8sXG4gICAgaGVscCA9IGZhbHNlLFxuICAgIGpzb25IZWxwID0gZmFsc2UsXG4gICAgZ2V0WWFyZ3NDb21wbGV0aW9ucyA9IGZhbHNlLFxuICAgIC4uLnJlc3RcbiAgfSA9IHlhcmdzUGFyc2VyKGFyZ3MsIHtcbiAgICBib29sZWFuOiBbJ2hlbHAnLCAnanNvbi1oZWxwJywgJ2dldC15YXJncy1jb21wbGV0aW9ucyddLFxuICAgIGFsaWFzOiB7ICdjb2xsZWN0aW9uJzogJ2MnIH0sXG4gIH0pO1xuXG4gIC8vIFdoZW4gYGdldFlhcmdzQ29tcGxldGlvbnNgIGlzIHRydWUgdGhlIHNjcmlwdE5hbWUgJ25nJyBhdCBpbmRleCAwIGlzIG5vdCByZW1vdmVkLlxuICBjb25zdCBwb3NpdGlvbmFsID0gZ2V0WWFyZ3NDb21wbGV0aW9ucyA/IF8uc2xpY2UoMSkgOiBfO1xuXG4gIGxldCB3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UgfCB1bmRlZmluZWQ7XG4gIGxldCBnbG9iYWxDb25maWd1cmF0aW9uOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIFt3b3Jrc3BhY2UsIGdsb2JhbENvbmZpZ3VyYXRpb25dID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgZ2V0V29ya3NwYWNlKCdsb2NhbCcpLFxuICAgICAgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKSxcbiAgICBdKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZ2dlci5mYXRhbChlLm1lc3NhZ2UpO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBjb25zdCByb290ID0gd29ya3NwYWNlPy5iYXNlUGF0aCA/PyBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBjb250ZXh0OiBDb21tYW5kQ29udGV4dCA9IHtcbiAgICBnbG9iYWxDb25maWd1cmF0aW9uLFxuICAgIHdvcmtzcGFjZSxcbiAgICBsb2dnZXIsXG4gICAgY3VycmVudERpcmVjdG9yeTogcHJvY2Vzcy5jd2QoKSxcbiAgICByb290LFxuICAgIHBhY2thZ2VNYW5hZ2VyOiBuZXcgUGFja2FnZU1hbmFnZXJVdGlscyh7IGdsb2JhbENvbmZpZ3VyYXRpb24sIHdvcmtzcGFjZSwgcm9vdCB9KSxcbiAgICBhcmdzOiB7XG4gICAgICBwb3NpdGlvbmFsOiBwb3NpdGlvbmFsLm1hcCgodikgPT4gdi50b1N0cmluZygpKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgaGVscCxcbiAgICAgICAganNvbkhlbHAsXG4gICAgICAgIGdldFlhcmdzQ29tcGxldGlvbnMsXG4gICAgICAgIC4uLnJlc3QsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgbGV0IGxvY2FsWWFyZ3MgPSB5YXJncyhhcmdzKTtcbiAgZm9yIChjb25zdCBDb21tYW5kTW9kdWxlIG9mIENPTU1BTkRTKSB7XG4gICAgaWYgKCFqc29uSGVscCkge1xuICAgICAgLy8gU2tpcCBzY29wZSB2YWxpZGF0aW9uIHdoZW4gcnVubmluZyB3aXRoICctLWpzb24taGVscCcgc2luY2UgaXQncyBlYXNpZXIgdG8gZ2VuZXJhdGUgdGhlIG91dHB1dCBmb3IgYWxsIGNvbW1hbmRzIHRoaXMgd2F5LlxuICAgICAgY29uc3Qgc2NvcGUgPSBDb21tYW5kTW9kdWxlLnNjb3BlO1xuICAgICAgaWYgKChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLkluICYmICF3b3Jrc3BhY2UpIHx8IChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLk91dCAmJiB3b3Jrc3BhY2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxvY2FsWWFyZ3MgPSBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21tYW5kTW9kdWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IHVzYWdlSW5zdGFuY2UgPSAobG9jYWxZYXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpLmdldFVzYWdlSW5zdGFuY2UoKTtcbiAgaWYgKGpzb25IZWxwKSB7XG4gICAgdXNhZ2VJbnN0YW5jZS5oZWxwID0gKCkgPT4ganNvbkhlbHBVc2FnZSgpO1xuICB9XG5cbiAgaWYgKGdldFlhcmdzQ29tcGxldGlvbnMpIHtcbiAgICAvLyBXaGVuIGluIGF1dG8gY29tcGxldGlvbiBtb2RlIGF2b2lkIHByaW50aW5nIGRlc2NyaXB0aW9uIGFzIGl0IGNhdXNlcyBhIHNsdWdpc2hcbiAgICAvLyBleHBlcmllbmNlIHdoZW4gdGhlcmUgYXJlIGEgbGFyZ2Ugc2V0IG9mIG9wdGlvbnMuXG4gICAgdXNhZ2VJbnN0YW5jZS5nZXREZXNjcmlwdGlvbnMgPSAoKSA9PiAoe30pO1xuICB9XG5cbiAgYXdhaXQgbG9jYWxZYXJnc1xuICAgIC5zY3JpcHROYW1lKCduZycpXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9kb2NzL2FkdmFuY2VkLm1kI2N1c3RvbWl6aW5nLXlhcmdzLXBhcnNlclxuICAgIC5wYXJzZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICdwb3B1bGF0ZS0tJzogdHJ1ZSxcbiAgICAgICd1bmtub3duLW9wdGlvbnMtYXMtYXJncyc6IGZhbHNlLFxuICAgICAgJ2RvdC1ub3RhdGlvbic6IGZhbHNlLFxuICAgICAgJ2Jvb2xlYW4tbmVnYXRpb24nOiB0cnVlLFxuICAgICAgJ3N0cmlwLWFsaWFzZWQnOiB0cnVlLFxuICAgICAgJ3N0cmlwLWRhc2hlZCc6IHRydWUsXG4gICAgICAnY2FtZWwtY2FzZS1leHBhbnNpb24nOiBmYWxzZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2pzb24taGVscCcsIHtcbiAgICAgIGRlc2NyaWJlOiAnU2hvdyBoZWxwIGluIEpTT04gZm9ybWF0LicsXG4gICAgICBpbXBsaWVzOiBbJ2hlbHAnXSxcbiAgICAgIGhpZGRlbjogdHJ1ZSxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICB9KVxuICAgIC5oZWxwKCdoZWxwJywgJ1Nob3dzIGEgaGVscCBtZXNzYWdlIGZvciB0aGlzIGNvbW1hbmQgaW4gdGhlIGNvbnNvbGUuJylcbiAgICAvLyBBIGNvbXBsZXRlIGxpc3Qgb2Ygc3RyaW5ncyBjYW4gYmUgZm91bmQ6IGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vbG9jYWxlcy9lbi5qc29uXG4gICAgLnVwZGF0ZVN0cmluZ3Moe1xuICAgICAgJ0NvbW1hbmRzOic6IGNvbG9ycy5jeWFuKCdDb21tYW5kczonKSxcbiAgICAgICdPcHRpb25zOic6IGNvbG9ycy5jeWFuKCdPcHRpb25zOicpLFxuICAgICAgJ1Bvc2l0aW9uYWxzOic6IGNvbG9ycy5jeWFuKCdBcmd1bWVudHM6JyksXG4gICAgICAnZGVwcmVjYXRlZCc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQnKSxcbiAgICAgICdkZXByZWNhdGVkOiAlcyc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQ6JykgKyAnICVzJyxcbiAgICAgICdEaWQgeW91IG1lYW4gJXM/JzogJ1Vua25vd24gY29tbWFuZC4gRGlkIHlvdSBtZWFuICVzPycsXG4gICAgfSlcbiAgICAuZGVtYW5kQ29tbWFuZCgxLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UpXG4gICAgLnJlY29tbWVuZENvbW1hbmRzKClcbiAgICAubWlkZGxld2FyZShub3JtYWxpemVPcHRpb25zTWlkZGxld2FyZSlcbiAgICAudmVyc2lvbihmYWxzZSlcbiAgICAuc2hvd0hlbHBPbkZhaWwoZmFsc2UpXG4gICAgLnN0cmljdCgpXG4gICAgLmZhaWwoKG1zZywgZXJyKSA9PiB7XG4gICAgICB0aHJvdyBtc2dcbiAgICAgICAgPyAvLyBWYWxpZGF0aW9uIGZhaWxlZCBleGFtcGxlOiBgVW5rbm93biBhcmd1bWVudDpgXG4gICAgICAgICAgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihtc2cpXG4gICAgICAgIDogLy8gVW5rbm93biBleGNlcHRpb24sIHJlLXRocm93LlxuICAgICAgICAgIGVycjtcbiAgICB9KVxuICAgIC53cmFwKHlhcmdzLnRlcm1pbmFsV2lkdGgoKSlcbiAgICAucGFyc2VBc3luYygpO1xuXG4gIHJldHVybiBwcm9jZXNzLmV4aXRDb2RlID8/IDA7XG59XG4iXX0=