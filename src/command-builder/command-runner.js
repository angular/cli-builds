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
const error_1 = require("../utilities/error");
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
        (0, error_1.assertIsError)(e);
        logger.fatal(e.message);
        return 1;
    }
    const root = workspace?.basePath ?? process.cwd();
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
        localYargs = (0, command_1.addCommandModuleToYargs)(localYargs, CommandModule, context);
    }
    if (jsonHelp) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usageInstance = localYargs.getInternalMethods().getUsageInstance();
        usageInstance.help = () => (0, json_help_1.jsonHelpUsage)();
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
        .epilogue('For more information, see https://angular.io/cli/.\n')
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
    return process.exitCode ?? 0;
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELG9EQUFxRTtBQUNyRSxnREFBNkQ7QUFDN0QsZ0RBQTZEO0FBQzdELDZDQUF1RDtBQUN2RCw2Q0FBdUQ7QUFDdkQsdURBQXdFO0FBQ3hFLG1EQUFpRTtBQUNqRSwrQ0FBeUQ7QUFDekQsNERBQXlFO0FBQ3pFLDhDQUF1RDtBQUN2RCw4Q0FBdUQ7QUFDdkQsZ0RBQTJEO0FBQzNELCtDQUF5RDtBQUN6RCxpREFBNkQ7QUFDN0Qsa0RBQStEO0FBQy9ELDhDQUE0QztBQUM1QyxnREFBcUU7QUFDckUsOENBQW1EO0FBQ25ELGtFQUFtRTtBQUNuRSxxREFBc0U7QUFDdEUsaURBQTJGO0FBQzNGLHFEQUFzRDtBQUN0RCwyRkFBc0Y7QUFFdEYsTUFBTSxRQUFRLEdBQUc7SUFDZiwyQkFBb0I7SUFDcEIsc0JBQWdCO0lBQ2hCLDJCQUFvQjtJQUNwQix5QkFBbUI7SUFDbkIsNEJBQXNCO0lBQ3RCLHNCQUFnQjtJQUNoQiw0QkFBcUI7SUFDckIsd0JBQWtCO0lBQ2xCLHNCQUFnQjtJQUNoQix3QkFBaUI7SUFDakIseUJBQWtCO0lBQ2xCLCtCQUF3QjtJQUN4Qix5QkFBbUI7SUFDbkIsd0JBQWlCO0lBQ2pCLHVCQUFnQjtJQUNoQiwwQkFBbUI7SUFDbkIsdUJBQWdCO0lBQ2hCLHdCQUFrQjtJQUNsQiw2QkFBdUI7Q0FDeEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdDQUFnQztBQUUxQyxNQUFNLFdBQVcsR0FBRyxn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c0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBBZGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYWRkL2NsaSc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYW5hbHl0aWNzL2NsaSc7XG5pbXBvcnQgeyBCdWlsZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9idWlsZC9jbGknO1xuaW1wb3J0IHsgQ2FjaGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY2FjaGUvY2xpJztcbmltcG9ydCB7IENvbXBsZXRpb25Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY29tcGxldGlvbi9jbGknO1xuaW1wb3J0IHsgQ29uZmlnQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NvbmZpZy9jbGknO1xuaW1wb3J0IHsgRGVwbG95Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RlcGxveS9jbGknO1xuaW1wb3J0IHsgRG9jQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RvYy9jbGknO1xuaW1wb3J0IHsgRTJlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2UyZS9jbGknO1xuaW1wb3J0IHsgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZXh0cmFjdC1pMThuL2NsaSc7XG5pbXBvcnQgeyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9nZW5lcmF0ZS9jbGknO1xuaW1wb3J0IHsgTGludENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9saW50L2NsaSc7XG5pbXBvcnQgeyBBd2Vzb21lQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL21ha2UtdGhpcy1hd2Vzb21lL2NsaSc7XG5pbXBvcnQgeyBOZXdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbmV3L2NsaSc7XG5pbXBvcnQgeyBSdW5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvcnVuL2NsaSc7XG5pbXBvcnQgeyBTZXJ2ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9zZXJ2ZS9jbGknO1xuaW1wb3J0IHsgVGVzdENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy90ZXN0L2NsaSc7XG5pbXBvcnQgeyBVcGRhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdXBkYXRlL2NsaSc7XG5pbXBvcnQgeyBWZXJzaW9uQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3ZlcnNpb24vY2xpJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlLCBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi91dGlsaXRpZXMvZXJyb3InO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciB9IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsganNvbkhlbHBVc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24taGVscCc7XG5pbXBvcnQgeyBub3JtYWxpemVPcHRpb25zTWlkZGxld2FyZSB9IGZyb20gJy4vdXRpbGl0aWVzL25vcm1hbGl6ZS1vcHRpb25zLW1pZGRsZXdhcmUnO1xuXG5jb25zdCBDT01NQU5EUyA9IFtcbiAgVmVyc2lvbkNvbW1hbmRNb2R1bGUsXG4gIERvY0NvbW1hbmRNb2R1bGUsXG4gIEF3ZXNvbWVDb21tYW5kTW9kdWxlLFxuICBDb25maWdDb21tYW5kTW9kdWxlLFxuICBBbmFseXRpY3NDb21tYW5kTW9kdWxlLFxuICBBZGRDb21tYW5kTW9kdWxlLFxuICBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUsXG4gIEJ1aWxkQ29tbWFuZE1vZHVsZSxcbiAgRTJlQ29tbWFuZE1vZHVsZSxcbiAgVGVzdENvbW1hbmRNb2R1bGUsXG4gIFNlcnZlQ29tbWFuZE1vZHVsZSxcbiAgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlLFxuICBEZXBsb3lDb21tYW5kTW9kdWxlLFxuICBMaW50Q29tbWFuZE1vZHVsZSxcbiAgTmV3Q29tbWFuZE1vZHVsZSxcbiAgVXBkYXRlQ29tbWFuZE1vZHVsZSxcbiAgUnVuQ29tbWFuZE1vZHVsZSxcbiAgQ2FjaGVDb21tYW5kTW9kdWxlLFxuICBDb21wbGV0aW9uQ29tbWFuZE1vZHVsZSxcbl0uc29ydCgpOyAvLyBXaWxsIGJlIHNvcnRlZCBieSBjbGFzcyBuYW1lLlxuXG5jb25zdCB5YXJnc1BhcnNlciA9IFBhcnNlciBhcyB1bmtub3duIGFzIHR5cGVvZiBQYXJzZXIuZGVmYXVsdDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNvbW1hbmQoYXJnczogc3RyaW5nW10sIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7XG4gICAgJDAsXG4gICAgXyxcbiAgICBoZWxwID0gZmFsc2UsXG4gICAganNvbkhlbHAgPSBmYWxzZSxcbiAgICBnZXRZYXJnc0NvbXBsZXRpb25zID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywge1xuICAgIGJvb2xlYW46IFsnaGVscCcsICdqc29uLWhlbHAnLCAnZ2V0LXlhcmdzLWNvbXBsZXRpb25zJ10sXG4gICAgYWxpYXM6IHsgJ2NvbGxlY3Rpb24nOiAnYycgfSxcbiAgfSk7XG5cbiAgLy8gV2hlbiBgZ2V0WWFyZ3NDb21wbGV0aW9uc2AgaXMgdHJ1ZSB0aGUgc2NyaXB0TmFtZSAnbmcnIGF0IGluZGV4IDAgaXMgbm90IHJlbW92ZWQuXG4gIGNvbnN0IHBvc2l0aW9uYWwgPSBnZXRZYXJnc0NvbXBsZXRpb25zID8gXy5zbGljZSgxKSA6IF87XG5cbiAgbGV0IHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZDtcbiAgbGV0IGdsb2JhbENvbmZpZ3VyYXRpb246IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIHRyeSB7XG4gICAgW3dvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbl0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyksXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpLFxuICAgIF0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICBsb2dnZXIuZmF0YWwoZS5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgY29uc3Qgcm9vdCA9IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgZ2xvYmFsQ29uZmlndXJhdGlvbixcbiAgICB3b3Jrc3BhY2UsXG4gICAgbG9nZ2VyLFxuICAgIGN1cnJlbnREaXJlY3Rvcnk6IHByb2Nlc3MuY3dkKCksXG4gICAgcm9vdCxcbiAgICBwYWNrYWdlTWFuYWdlcjogbmV3IFBhY2thZ2VNYW5hZ2VyVXRpbHMoeyBnbG9iYWxDb25maWd1cmF0aW9uLCB3b3Jrc3BhY2UsIHJvb3QgfSksXG4gICAgYXJnczoge1xuICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbC5tYXAoKHYpID0+IHYudG9TdHJpbmcoKSksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGhlbHAsXG4gICAgICAgIGpzb25IZWxwLFxuICAgICAgICBnZXRZYXJnc0NvbXBsZXRpb25zLFxuICAgICAgICAuLi5yZXN0LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGxldCBsb2NhbFlhcmdzID0geWFyZ3MoYXJncyk7XG4gIGZvciAoY29uc3QgQ29tbWFuZE1vZHVsZSBvZiBDT01NQU5EUykge1xuICAgIGxvY2FsWWFyZ3MgPSBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21tYW5kTW9kdWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIGlmIChqc29uSGVscCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgdXNhZ2VJbnN0YW5jZSA9IChsb2NhbFlhcmdzIGFzIGFueSkuZ2V0SW50ZXJuYWxNZXRob2RzKCkuZ2V0VXNhZ2VJbnN0YW5jZSgpO1xuICAgIHVzYWdlSW5zdGFuY2UuaGVscCA9ICgpID0+IGpzb25IZWxwVXNhZ2UoKTtcbiAgfVxuXG4gIGF3YWl0IGxvY2FsWWFyZ3NcbiAgICAuc2NyaXB0TmFtZSgnbmcnKVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vZG9jcy9hZHZhbmNlZC5tZCNjdXN0b21pemluZy15YXJncy1wYXJzZXJcbiAgICAucGFyc2VyQ29uZmlndXJhdGlvbih7XG4gICAgICAncG9wdWxhdGUtLSc6IHRydWUsXG4gICAgICAndW5rbm93bi1vcHRpb25zLWFzLWFyZ3MnOiBmYWxzZSxcbiAgICAgICdkb3Qtbm90YXRpb24nOiBmYWxzZSxcbiAgICAgICdib29sZWFuLW5lZ2F0aW9uJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1hbGlhc2VkJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1kYXNoZWQnOiB0cnVlLFxuICAgICAgJ2NhbWVsLWNhc2UtZXhwYW5zaW9uJzogZmFsc2UsXG4gICAgfSlcbiAgICAub3B0aW9uKCdqc29uLWhlbHAnLCB7XG4gICAgICBkZXNjcmliZTogJ1Nob3cgaGVscCBpbiBKU09OIGZvcm1hdC4nLFxuICAgICAgaW1wbGllczogWydoZWxwJ10sXG4gICAgICBoaWRkZW46IHRydWUsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgfSlcbiAgICAuaGVscCgnaGVscCcsICdTaG93cyBhIGhlbHAgbWVzc2FnZSBmb3IgdGhpcyBjb21tYW5kIGluIHRoZSBjb25zb2xlLicpXG4gICAgLy8gQSBjb21wbGV0ZSBsaXN0IG9mIHN0cmluZ3MgY2FuIGJlIGZvdW5kOiBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2xvY2FsZXMvZW4uanNvblxuICAgIC51cGRhdGVTdHJpbmdzKHtcbiAgICAgICdDb21tYW5kczonOiBjb2xvcnMuY3lhbignQ29tbWFuZHM6JyksXG4gICAgICAnT3B0aW9uczonOiBjb2xvcnMuY3lhbignT3B0aW9uczonKSxcbiAgICAgICdQb3NpdGlvbmFsczonOiBjb2xvcnMuY3lhbignQXJndW1lbnRzOicpLFxuICAgICAgJ2RlcHJlY2F0ZWQnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkJyksXG4gICAgICAnZGVwcmVjYXRlZDogJXMnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkOicpICsgJyAlcycsXG4gICAgICAnRGlkIHlvdSBtZWFuICVzPyc6ICdVbmtub3duIGNvbW1hbmQuIERpZCB5b3UgbWVhbiAlcz8nLFxuICAgIH0pXG4gICAgLmVwaWxvZ3VlKCdGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9jbGkvLlxcbicpXG4gICAgLmRlbWFuZENvbW1hbmQoMSwgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlKVxuICAgIC5yZWNvbW1lbmRDb21tYW5kcygpXG4gICAgLm1pZGRsZXdhcmUobm9ybWFsaXplT3B0aW9uc01pZGRsZXdhcmUpXG4gICAgLnZlcnNpb24oZmFsc2UpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5zdHJpY3QoKVxuICAgIC5mYWlsKChtc2csIGVycikgPT4ge1xuICAgICAgdGhyb3cgbXNnXG4gICAgICAgID8gLy8gVmFsaWRhdGlvbiBmYWlsZWQgZXhhbXBsZTogYFVua25vd24gYXJndW1lbnQ6YFxuICAgICAgICAgIG5ldyBDb21tYW5kTW9kdWxlRXJyb3IobXNnKVxuICAgICAgICA6IC8vIFVua25vd24gZXhjZXB0aW9uLCByZS10aHJvdy5cbiAgICAgICAgICBlcnI7XG4gICAgfSlcbiAgICAud3JhcCh5YXJncy50ZXJtaW5hbFdpZHRoKCkpXG4gICAgLnBhcnNlQXN5bmMoKTtcblxuICByZXR1cm4gcHJvY2Vzcy5leGl0Q29kZSA/PyAwO1xufVxuIl19