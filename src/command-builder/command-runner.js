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
        .epilogue(color_1.colors.gray('For more information, see https://angular.io/cli/.\n'))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELG9EQUFxRTtBQUNyRSxnREFBNkQ7QUFDN0QsZ0RBQTZEO0FBQzdELDZDQUF1RDtBQUN2RCw2Q0FBdUQ7QUFDdkQsdURBQXdFO0FBQ3hFLG1EQUFpRTtBQUNqRSwrQ0FBeUQ7QUFDekQsNERBQXlFO0FBQ3pFLDhDQUF1RDtBQUN2RCw4Q0FBdUQ7QUFDdkQsZ0RBQTJEO0FBQzNELCtDQUF5RDtBQUN6RCxpREFBNkQ7QUFDN0Qsa0RBQStEO0FBQy9ELDhDQUE0QztBQUM1QyxnREFBcUU7QUFDckUsa0VBQW1FO0FBQ25FLHFEQUFvRjtBQUNwRixpREFBMkY7QUFDM0YscURBQXNEO0FBQ3RELDJGQUFzRjtBQUV0RixNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDRCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsK0JBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7SUFDaEIsd0JBQWtCO0lBQ2xCLDZCQUF1QjtDQUN4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FB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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBBZGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYWRkL2NsaSc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYW5hbHl0aWNzL2NsaSc7XG5pbXBvcnQgeyBCdWlsZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9idWlsZC9jbGknO1xuaW1wb3J0IHsgQ2FjaGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY2FjaGUvY2xpJztcbmltcG9ydCB7IENvbXBsZXRpb25Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY29tcGxldGlvbi9jbGknO1xuaW1wb3J0IHsgQ29uZmlnQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NvbmZpZy9jbGknO1xuaW1wb3J0IHsgRGVwbG95Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RlcGxveS9jbGknO1xuaW1wb3J0IHsgRG9jQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RvYy9jbGknO1xuaW1wb3J0IHsgRTJlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2UyZS9jbGknO1xuaW1wb3J0IHsgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZXh0cmFjdC1pMThuL2NsaSc7XG5pbXBvcnQgeyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9nZW5lcmF0ZS9jbGknO1xuaW1wb3J0IHsgTGludENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9saW50L2NsaSc7XG5pbXBvcnQgeyBBd2Vzb21lQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL21ha2UtdGhpcy1hd2Vzb21lL2NsaSc7XG5pbXBvcnQgeyBOZXdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbmV3L2NsaSc7XG5pbXBvcnQgeyBSdW5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvcnVuL2NsaSc7XG5pbXBvcnQgeyBTZXJ2ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9zZXJ2ZS9jbGknO1xuaW1wb3J0IHsgVGVzdENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy90ZXN0L2NsaSc7XG5pbXBvcnQgeyBVcGRhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdXBkYXRlL2NsaSc7XG5pbXBvcnQgeyBWZXJzaW9uQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3ZlcnNpb24vY2xpJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlLCBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyVXRpbHMgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IENvbW1hbmRDb250ZXh0LCBDb21tYW5kTW9kdWxlRXJyb3IsIENvbW1hbmRTY29wZSB9IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsganNvbkhlbHBVc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24taGVscCc7XG5pbXBvcnQgeyBub3JtYWxpemVPcHRpb25zTWlkZGxld2FyZSB9IGZyb20gJy4vdXRpbGl0aWVzL25vcm1hbGl6ZS1vcHRpb25zLW1pZGRsZXdhcmUnO1xuXG5jb25zdCBDT01NQU5EUyA9IFtcbiAgVmVyc2lvbkNvbW1hbmRNb2R1bGUsXG4gIERvY0NvbW1hbmRNb2R1bGUsXG4gIEF3ZXNvbWVDb21tYW5kTW9kdWxlLFxuICBDb25maWdDb21tYW5kTW9kdWxlLFxuICBBbmFseXRpY3NDb21tYW5kTW9kdWxlLFxuICBBZGRDb21tYW5kTW9kdWxlLFxuICBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUsXG4gIEJ1aWxkQ29tbWFuZE1vZHVsZSxcbiAgRTJlQ29tbWFuZE1vZHVsZSxcbiAgVGVzdENvbW1hbmRNb2R1bGUsXG4gIFNlcnZlQ29tbWFuZE1vZHVsZSxcbiAgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlLFxuICBEZXBsb3lDb21tYW5kTW9kdWxlLFxuICBMaW50Q29tbWFuZE1vZHVsZSxcbiAgTmV3Q29tbWFuZE1vZHVsZSxcbiAgVXBkYXRlQ29tbWFuZE1vZHVsZSxcbiAgUnVuQ29tbWFuZE1vZHVsZSxcbiAgQ2FjaGVDb21tYW5kTW9kdWxlLFxuICBDb21wbGV0aW9uQ29tbWFuZE1vZHVsZSxcbl0uc29ydCgpOyAvLyBXaWxsIGJlIHNvcnRlZCBieSBjbGFzcyBuYW1lLlxuXG5jb25zdCB5YXJnc1BhcnNlciA9IFBhcnNlciBhcyB1bmtub3duIGFzIHR5cGVvZiBQYXJzZXIuZGVmYXVsdDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNvbW1hbmQoYXJnczogc3RyaW5nW10sIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7XG4gICAgJDAsXG4gICAgXyxcbiAgICBoZWxwID0gZmFsc2UsXG4gICAganNvbkhlbHAgPSBmYWxzZSxcbiAgICBnZXRZYXJnc0NvbXBsZXRpb25zID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywge1xuICAgIGJvb2xlYW46IFsnaGVscCcsICdqc29uLWhlbHAnLCAnZ2V0LXlhcmdzLWNvbXBsZXRpb25zJ10sXG4gICAgYWxpYXM6IHsgJ2NvbGxlY3Rpb24nOiAnYycgfSxcbiAgfSk7XG5cbiAgLy8gV2hlbiBgZ2V0WWFyZ3NDb21wbGV0aW9uc2AgaXMgdHJ1ZSB0aGUgc2NyaXB0TmFtZSAnbmcnIGF0IGluZGV4IDAgaXMgbm90IHJlbW92ZWQuXG4gIGNvbnN0IHBvc2l0aW9uYWwgPSBnZXRZYXJnc0NvbXBsZXRpb25zID8gXy5zbGljZSgxKSA6IF87XG5cbiAgbGV0IHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZDtcbiAgbGV0IGdsb2JhbENvbmZpZ3VyYXRpb246IEFuZ3VsYXJXb3Jrc3BhY2U7XG4gIHRyeSB7XG4gICAgW3dvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbl0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyksXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpLFxuICAgIF0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmZhdGFsKGUubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGNvbnN0IHJvb3QgPSB3b3Jrc3BhY2U/LmJhc2VQYXRoID8/IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0ID0ge1xuICAgIGdsb2JhbENvbmZpZ3VyYXRpb24sXG4gICAgd29ya3NwYWNlLFxuICAgIGxvZ2dlcixcbiAgICBjdXJyZW50RGlyZWN0b3J5OiBwcm9jZXNzLmN3ZCgpLFxuICAgIHJvb3QsXG4gICAgcGFja2FnZU1hbmFnZXI6IG5ldyBQYWNrYWdlTWFuYWdlclV0aWxzKHsgZ2xvYmFsQ29uZmlndXJhdGlvbiwgd29ya3NwYWNlLCByb290IH0pLFxuICAgIGFyZ3M6IHtcbiAgICAgIHBvc2l0aW9uYWw6IHBvc2l0aW9uYWwubWFwKCh2KSA9PiB2LnRvU3RyaW5nKCkpLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBoZWxwLFxuICAgICAgICBqc29uSGVscCxcbiAgICAgICAgZ2V0WWFyZ3NDb21wbGV0aW9ucyxcbiAgICAgICAgLi4ucmVzdCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBsZXQgbG9jYWxZYXJncyA9IHlhcmdzKGFyZ3MpO1xuICBmb3IgKGNvbnN0IENvbW1hbmRNb2R1bGUgb2YgQ09NTUFORFMpIHtcbiAgICBsb2NhbFlhcmdzID0gYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MobG9jYWxZYXJncywgQ29tbWFuZE1vZHVsZSwgY29udGV4dCk7XG4gIH1cblxuICBpZiAoanNvbkhlbHApIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHVzYWdlSW5zdGFuY2UgPSAobG9jYWxZYXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpLmdldFVzYWdlSW5zdGFuY2UoKTtcbiAgICB1c2FnZUluc3RhbmNlLmhlbHAgPSAoKSA9PiBqc29uSGVscFVzYWdlKCk7XG4gIH1cblxuICBhd2FpdCBsb2NhbFlhcmdzXG4gICAgLnNjcmlwdE5hbWUoJ25nJylcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2RvY3MvYWR2YW5jZWQubWQjY3VzdG9taXppbmcteWFyZ3MtcGFyc2VyXG4gICAgLnBhcnNlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgJ3BvcHVsYXRlLS0nOiB0cnVlLFxuICAgICAgJ3Vua25vd24tb3B0aW9ucy1hcy1hcmdzJzogZmFsc2UsXG4gICAgICAnZG90LW5vdGF0aW9uJzogZmFsc2UsXG4gICAgICAnYm9vbGVhbi1uZWdhdGlvbic6IHRydWUsXG4gICAgICAnc3RyaXAtYWxpYXNlZCc6IHRydWUsXG4gICAgICAnc3RyaXAtZGFzaGVkJzogdHJ1ZSxcbiAgICAgICdjYW1lbC1jYXNlLWV4cGFuc2lvbic6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbignanNvbi1oZWxwJywge1xuICAgICAgZGVzY3JpYmU6ICdTaG93IGhlbHAgaW4gSlNPTiBmb3JtYXQuJyxcbiAgICAgIGltcGxpZXM6IFsnaGVscCddLFxuICAgICAgaGlkZGVuOiB0cnVlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIH0pXG4gICAgLmhlbHAoJ2hlbHAnLCAnU2hvd3MgYSBoZWxwIG1lc3NhZ2UgZm9yIHRoaXMgY29tbWFuZCBpbiB0aGUgY29uc29sZS4nKVxuICAgIC8vIEEgY29tcGxldGUgbGlzdCBvZiBzdHJpbmdzIGNhbiBiZSBmb3VuZDogaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9sb2NhbGVzL2VuLmpzb25cbiAgICAudXBkYXRlU3RyaW5ncyh7XG4gICAgICAnQ29tbWFuZHM6JzogY29sb3JzLmN5YW4oJ0NvbW1hbmRzOicpLFxuICAgICAgJ09wdGlvbnM6JzogY29sb3JzLmN5YW4oJ09wdGlvbnM6JyksXG4gICAgICAnUG9zaXRpb25hbHM6JzogY29sb3JzLmN5YW4oJ0FyZ3VtZW50czonKSxcbiAgICAgICdkZXByZWNhdGVkJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZCcpLFxuICAgICAgJ2RlcHJlY2F0ZWQ6ICVzJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZDonKSArICcgJXMnLFxuICAgICAgJ0RpZCB5b3UgbWVhbiAlcz8nOiAnVW5rbm93biBjb21tYW5kLiBEaWQgeW91IG1lYW4gJXM/JyxcbiAgICB9KVxuICAgIC5lcGlsb2d1ZShjb2xvcnMuZ3JheSgnRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vY2xpLy5cXG4nKSlcbiAgICAuZGVtYW5kQ29tbWFuZCgxLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UpXG4gICAgLnJlY29tbWVuZENvbW1hbmRzKClcbiAgICAubWlkZGxld2FyZShub3JtYWxpemVPcHRpb25zTWlkZGxld2FyZSlcbiAgICAudmVyc2lvbihmYWxzZSlcbiAgICAuc2hvd0hlbHBPbkZhaWwoZmFsc2UpXG4gICAgLnN0cmljdCgpXG4gICAgLmZhaWwoKG1zZywgZXJyKSA9PiB7XG4gICAgICB0aHJvdyBtc2dcbiAgICAgICAgPyAvLyBWYWxpZGF0aW9uIGZhaWxlZCBleGFtcGxlOiBgVW5rbm93biBhcmd1bWVudDpgXG4gICAgICAgICAgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihtc2cpXG4gICAgICAgIDogLy8gVW5rbm93biBleGNlcHRpb24sIHJlLXRocm93LlxuICAgICAgICAgIGVycjtcbiAgICB9KVxuICAgIC53cmFwKHlhcmdzLnRlcm1pbmFsV2lkdGgoKSlcbiAgICAucGFyc2VBc3luYygpO1xuXG4gIHJldHVybiBwcm9jZXNzLmV4aXRDb2RlID8/IDA7XG59XG4iXX0=