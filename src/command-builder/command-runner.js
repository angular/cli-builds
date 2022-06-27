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
    return (_b = process.exitCode) !== null && _b !== void 0 ? _b : 0;
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELG9EQUFxRTtBQUNyRSxnREFBNkQ7QUFDN0QsZ0RBQTZEO0FBQzdELDZDQUF1RDtBQUN2RCw2Q0FBdUQ7QUFDdkQsdURBQXdFO0FBQ3hFLG1EQUFpRTtBQUNqRSwrQ0FBeUQ7QUFDekQsNERBQXlFO0FBQ3pFLDhDQUF1RDtBQUN2RCw4Q0FBdUQ7QUFDdkQsZ0RBQTJEO0FBQzNELCtDQUF5RDtBQUN6RCxpREFBNkQ7QUFDN0Qsa0RBQStEO0FBQy9ELDhDQUE0QztBQUM1QyxnREFBcUU7QUFDckUsa0VBQW1FO0FBQ25FLHFEQUFvRjtBQUNwRixpREFBMkY7QUFDM0YscURBQXNEO0FBQ3RELDJGQUFzRjtBQUV0RixNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDRCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsK0JBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7SUFDaEIsd0JBQWtCO0lBQ2xCLDZCQUF1QjtDQUN4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FB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biAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB5YXJncyBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYXJzZXIgfSBmcm9tICd5YXJncy9oZWxwZXJzJztcbmltcG9ydCB7IEFkZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9hZGQvY2xpJztcbmltcG9ydCB7IEFuYWx5dGljc0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9hbmFseXRpY3MvY2xpJztcbmltcG9ydCB7IEJ1aWxkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2J1aWxkL2NsaSc7XG5pbXBvcnQgeyBDYWNoZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jYWNoZS9jbGknO1xuaW1wb3J0IHsgQ29tcGxldGlvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb21wbGV0aW9uL2NsaSc7XG5pbXBvcnQgeyBDb25maWdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY29uZmlnL2NsaSc7XG5pbXBvcnQgeyBEZXBsb3lDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZGVwbG95L2NsaSc7XG5pbXBvcnQgeyBEb2NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZG9jL2NsaSc7XG5pbXBvcnQgeyBFMmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZTJlL2NsaSc7XG5pbXBvcnQgeyBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9leHRyYWN0LWkxOG4vY2xpJztcbmltcG9ydCB7IEdlbmVyYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2dlbmVyYXRlL2NsaSc7XG5pbXBvcnQgeyBMaW50Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2xpbnQvY2xpJztcbmltcG9ydCB7IEF3ZXNvbWVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbWFrZS10aGlzLWF3ZXNvbWUvY2xpJztcbmltcG9ydCB7IE5ld0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9uZXcvY2xpJztcbmltcG9ydCB7IFJ1bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9ydW4vY2xpJztcbmltcG9ydCB7IFNlcnZlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3NlcnZlL2NsaSc7XG5pbXBvcnQgeyBUZXN0Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3Rlc3QvY2xpJztcbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy91cGRhdGUvY2xpJztcbmltcG9ydCB7IFZlcnNpb25Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdmVyc2lvbi9jbGknO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciwgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncywgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBqc29uSGVscFVzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1oZWxwJztcbmltcG9ydCB7IG5vcm1hbGl6ZU9wdGlvbnNNaWRkbGV3YXJlIH0gZnJvbSAnLi91dGlsaXRpZXMvbm9ybWFsaXplLW9wdGlvbnMtbWlkZGxld2FyZSc7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBWZXJzaW9uQ29tbWFuZE1vZHVsZSxcbiAgRG9jQ29tbWFuZE1vZHVsZSxcbiAgQXdlc29tZUNvbW1hbmRNb2R1bGUsXG4gIENvbmZpZ0NvbW1hbmRNb2R1bGUsXG4gIEFuYWx5dGljc0NvbW1hbmRNb2R1bGUsXG4gIEFkZENvbW1hbmRNb2R1bGUsXG4gIEdlbmVyYXRlQ29tbWFuZE1vZHVsZSxcbiAgQnVpbGRDb21tYW5kTW9kdWxlLFxuICBFMmVDb21tYW5kTW9kdWxlLFxuICBUZXN0Q29tbWFuZE1vZHVsZSxcbiAgU2VydmVDb21tYW5kTW9kdWxlLFxuICBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUsXG4gIERlcGxveUNvbW1hbmRNb2R1bGUsXG4gIExpbnRDb21tYW5kTW9kdWxlLFxuICBOZXdDb21tYW5kTW9kdWxlLFxuICBVcGRhdGVDb21tYW5kTW9kdWxlLFxuICBSdW5Db21tYW5kTW9kdWxlLFxuICBDYWNoZUNvbW1hbmRNb2R1bGUsXG4gIENvbXBsZXRpb25Db21tYW5kTW9kdWxlLFxuXS5zb3J0KCk7IC8vIFdpbGwgYmUgc29ydGVkIGJ5IGNsYXNzIG5hbWUuXG5cbmNvbnN0IHlhcmdzUGFyc2VyID0gUGFyc2VyIGFzIHVua25vd24gYXMgdHlwZW9mIFBhcnNlci5kZWZhdWx0O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChhcmdzOiBzdHJpbmdbXSwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHtcbiAgICAkMCxcbiAgICBfLFxuICAgIGhlbHAgPSBmYWxzZSxcbiAgICBqc29uSGVscCA9IGZhbHNlLFxuICAgIGdldFlhcmdzQ29tcGxldGlvbnMgPSBmYWxzZSxcbiAgICAuLi5yZXN0XG4gIH0gPSB5YXJnc1BhcnNlcihhcmdzLCB7XG4gICAgYm9vbGVhbjogWydoZWxwJywgJ2pzb24taGVscCcsICdnZXQteWFyZ3MtY29tcGxldGlvbnMnXSxcbiAgICBhbGlhczogeyAnY29sbGVjdGlvbic6ICdjJyB9LFxuICB9KTtcblxuICAvLyBXaGVuIGBnZXRZYXJnc0NvbXBsZXRpb25zYCBpcyB0cnVlIHRoZSBzY3JpcHROYW1lICduZycgYXQgaW5kZXggMCBpcyBub3QgcmVtb3ZlZC5cbiAgY29uc3QgcG9zaXRpb25hbCA9IGdldFlhcmdzQ29tcGxldGlvbnMgPyBfLnNsaWNlKDEpIDogXztcblxuICBsZXQgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkO1xuICBsZXQgZ2xvYmFsQ29uZmlndXJhdGlvbjogQW5ndWxhcldvcmtzcGFjZTtcbiAgdHJ5IHtcbiAgICBbd29ya3NwYWNlLCBnbG9iYWxDb25maWd1cmF0aW9uXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIGdldFdvcmtzcGFjZSgnbG9jYWwnKSxcbiAgICAgIGdldFdvcmtzcGFjZSgnZ2xvYmFsJyksXG4gICAgXSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2dnZXIuZmF0YWwoZS5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgY29uc3Qgcm9vdCA9IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgZ2xvYmFsQ29uZmlndXJhdGlvbixcbiAgICB3b3Jrc3BhY2UsXG4gICAgbG9nZ2VyLFxuICAgIGN1cnJlbnREaXJlY3Rvcnk6IHByb2Nlc3MuY3dkKCksXG4gICAgcm9vdCxcbiAgICBwYWNrYWdlTWFuYWdlcjogbmV3IFBhY2thZ2VNYW5hZ2VyVXRpbHMoeyBnbG9iYWxDb25maWd1cmF0aW9uLCB3b3Jrc3BhY2UsIHJvb3QgfSksXG4gICAgYXJnczoge1xuICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbC5tYXAoKHYpID0+IHYudG9TdHJpbmcoKSksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGhlbHAsXG4gICAgICAgIGpzb25IZWxwLFxuICAgICAgICBnZXRZYXJnc0NvbXBsZXRpb25zLFxuICAgICAgICAuLi5yZXN0LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGxldCBsb2NhbFlhcmdzID0geWFyZ3MoYXJncyk7XG4gIGZvciAoY29uc3QgQ29tbWFuZE1vZHVsZSBvZiBDT01NQU5EUykge1xuICAgIGxvY2FsWWFyZ3MgPSBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21tYW5kTW9kdWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIGlmIChqc29uSGVscCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgdXNhZ2VJbnN0YW5jZSA9IChsb2NhbFlhcmdzIGFzIGFueSkuZ2V0SW50ZXJuYWxNZXRob2RzKCkuZ2V0VXNhZ2VJbnN0YW5jZSgpO1xuICAgIHVzYWdlSW5zdGFuY2UuaGVscCA9ICgpID0+IGpzb25IZWxwVXNhZ2UoKTtcbiAgfVxuXG4gIGF3YWl0IGxvY2FsWWFyZ3NcbiAgICAuc2NyaXB0TmFtZSgnbmcnKVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vZG9jcy9hZHZhbmNlZC5tZCNjdXN0b21pemluZy15YXJncy1wYXJzZXJcbiAgICAucGFyc2VyQ29uZmlndXJhdGlvbih7XG4gICAgICAncG9wdWxhdGUtLSc6IHRydWUsXG4gICAgICAndW5rbm93bi1vcHRpb25zLWFzLWFyZ3MnOiBmYWxzZSxcbiAgICAgICdkb3Qtbm90YXRpb24nOiBmYWxzZSxcbiAgICAgICdib29sZWFuLW5lZ2F0aW9uJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1hbGlhc2VkJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1kYXNoZWQnOiB0cnVlLFxuICAgICAgJ2NhbWVsLWNhc2UtZXhwYW5zaW9uJzogZmFsc2UsXG4gICAgfSlcbiAgICAub3B0aW9uKCdqc29uLWhlbHAnLCB7XG4gICAgICBkZXNjcmliZTogJ1Nob3cgaGVscCBpbiBKU09OIGZvcm1hdC4nLFxuICAgICAgaW1wbGllczogWydoZWxwJ10sXG4gICAgICBoaWRkZW46IHRydWUsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgfSlcbiAgICAuaGVscCgnaGVscCcsICdTaG93cyBhIGhlbHAgbWVzc2FnZSBmb3IgdGhpcyBjb21tYW5kIGluIHRoZSBjb25zb2xlLicpXG4gICAgLy8gQSBjb21wbGV0ZSBsaXN0IG9mIHN0cmluZ3MgY2FuIGJlIGZvdW5kOiBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2xvY2FsZXMvZW4uanNvblxuICAgIC51cGRhdGVTdHJpbmdzKHtcbiAgICAgICdDb21tYW5kczonOiBjb2xvcnMuY3lhbignQ29tbWFuZHM6JyksXG4gICAgICAnT3B0aW9uczonOiBjb2xvcnMuY3lhbignT3B0aW9uczonKSxcbiAgICAgICdQb3NpdGlvbmFsczonOiBjb2xvcnMuY3lhbignQXJndW1lbnRzOicpLFxuICAgICAgJ2RlcHJlY2F0ZWQnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkJyksXG4gICAgICAnZGVwcmVjYXRlZDogJXMnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkOicpICsgJyAlcycsXG4gICAgICAnRGlkIHlvdSBtZWFuICVzPyc6ICdVbmtub3duIGNvbW1hbmQuIERpZCB5b3UgbWVhbiAlcz8nLFxuICAgIH0pXG4gICAgLmVwaWxvZ3VlKCdGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIGh0dHBzOi8vYW5ndWxhci5pby9jbGkvLlxcbicpXG4gICAgLmRlbWFuZENvbW1hbmQoMSwgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlKVxuICAgIC5yZWNvbW1lbmRDb21tYW5kcygpXG4gICAgLm1pZGRsZXdhcmUobm9ybWFsaXplT3B0aW9uc01pZGRsZXdhcmUpXG4gICAgLnZlcnNpb24oZmFsc2UpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5zdHJpY3QoKVxuICAgIC5mYWlsKChtc2csIGVycikgPT4ge1xuICAgICAgdGhyb3cgbXNnXG4gICAgICAgID8gLy8gVmFsaWRhdGlvbiBmYWlsZWQgZXhhbXBsZTogYFVua25vd24gYXJndW1lbnQ6YFxuICAgICAgICAgIG5ldyBDb21tYW5kTW9kdWxlRXJyb3IobXNnKVxuICAgICAgICA6IC8vIFVua25vd24gZXhjZXB0aW9uLCByZS10aHJvdy5cbiAgICAgICAgICBlcnI7XG4gICAgfSlcbiAgICAud3JhcCh5YXJncy50ZXJtaW5hbFdpZHRoKCkpXG4gICAgLnBhcnNlQXN5bmMoKTtcblxuICByZXR1cm4gcHJvY2Vzcy5leGl0Q29kZSA/PyAwO1xufVxuIl19