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
        .epilogue(color_1.colors.gray(getEpilogue(!!workspace)))
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
function getEpilogue(isInsideWorkspace) {
    let message;
    if (isInsideWorkspace) {
        message =
            'The above commands are available when running the Angular CLI inside a workspace.' +
                'More commands are available when running outside a workspace.\n';
    }
    else {
        message =
            'The above commands are available when running the Angular CLI outside a workspace.' +
                'More commands are available when running inside a workspace.\n';
    }
    return message + 'For more information, see https://angular.io/cli/.\n';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELG9EQUFxRTtBQUNyRSxnREFBNkQ7QUFDN0QsZ0RBQTZEO0FBQzdELDZDQUF1RDtBQUN2RCw2Q0FBdUQ7QUFDdkQsdURBQXdFO0FBQ3hFLG1EQUFpRTtBQUNqRSwrQ0FBeUQ7QUFDekQsNERBQXlFO0FBQ3pFLDhDQUF1RDtBQUN2RCw4Q0FBdUQ7QUFDdkQsZ0RBQTJEO0FBQzNELCtDQUF5RDtBQUN6RCxpREFBNkQ7QUFDN0Qsa0RBQStEO0FBQy9ELDhDQUE0QztBQUM1QyxnREFBcUU7QUFDckUsa0VBQW1FO0FBQ25FLHFEQUFvRjtBQUNwRixpREFBMkY7QUFDM0YscURBQXNEO0FBQ3RELDJGQUFzRjtBQUV0RixNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDRCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsK0JBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7SUFDaEIsd0JBQWtCO0lBQ2xCLDZCQUF1QjtDQUN4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FB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QUNQLENBQUMsQ0FBQyxpREFBaUQ7Z0JBQ2pELElBQUksbUNBQWtCLENBQUMsR0FBRyxDQUFDO1lBQzdCLENBQUMsQ0FBQywrQkFBK0I7Z0JBQy9CLEdBQUcsQ0FBQztJQUNWLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxlQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDM0IsVUFBVSxFQUFFLENBQUM7SUFFaEIsT0FBTyxNQUFBLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBakhELGdDQWlIQztBQUVELFNBQVMsV0FBVyxDQUFDLGlCQUEwQjtJQUM3QyxJQUFJLE9BQWUsQ0FBQztJQUNwQixJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLE9BQU87WUFDTCxtRkFBbUY7Z0JBQ25GLGlFQUFpRSxDQUFDO0tBQ3JFO1NBQU07UUFDTCxPQUFPO1lBQ0wsb0ZBQW9GO2dCQUNwRixnRUFBZ0UsQ0FBQztLQUNwRTtJQUVELE9BQU8sT0FBTyxHQUFHLHNEQUFzRCxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB5YXJncyBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBQYXJzZXIgfSBmcm9tICd5YXJncy9oZWxwZXJzJztcbmltcG9ydCB7IEFkZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9hZGQvY2xpJztcbmltcG9ydCB7IEFuYWx5dGljc0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9hbmFseXRpY3MvY2xpJztcbmltcG9ydCB7IEJ1aWxkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2J1aWxkL2NsaSc7XG5pbXBvcnQgeyBDYWNoZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jYWNoZS9jbGknO1xuaW1wb3J0IHsgQ29tcGxldGlvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb21wbGV0aW9uL2NsaSc7XG5pbXBvcnQgeyBDb25maWdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY29uZmlnL2NsaSc7XG5pbXBvcnQgeyBEZXBsb3lDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZGVwbG95L2NsaSc7XG5pbXBvcnQgeyBEb2NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZG9jL2NsaSc7XG5pbXBvcnQgeyBFMmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZTJlL2NsaSc7XG5pbXBvcnQgeyBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9leHRyYWN0LWkxOG4vY2xpJztcbmltcG9ydCB7IEdlbmVyYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2dlbmVyYXRlL2NsaSc7XG5pbXBvcnQgeyBMaW50Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2xpbnQvY2xpJztcbmltcG9ydCB7IEF3ZXNvbWVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbWFrZS10aGlzLWF3ZXNvbWUvY2xpJztcbmltcG9ydCB7IE5ld0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9uZXcvY2xpJztcbmltcG9ydCB7IFJ1bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9ydW4vY2xpJztcbmltcG9ydCB7IFNlcnZlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3NlcnZlL2NsaSc7XG5pbXBvcnQgeyBUZXN0Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3Rlc3QvY2xpJztcbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy91cGRhdGUvY2xpJztcbmltcG9ydCB7IFZlcnNpb25Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdmVyc2lvbi9jbGknO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciwgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncywgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBqc29uSGVscFVzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1oZWxwJztcbmltcG9ydCB7IG5vcm1hbGl6ZU9wdGlvbnNNaWRkbGV3YXJlIH0gZnJvbSAnLi91dGlsaXRpZXMvbm9ybWFsaXplLW9wdGlvbnMtbWlkZGxld2FyZSc7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBWZXJzaW9uQ29tbWFuZE1vZHVsZSxcbiAgRG9jQ29tbWFuZE1vZHVsZSxcbiAgQXdlc29tZUNvbW1hbmRNb2R1bGUsXG4gIENvbmZpZ0NvbW1hbmRNb2R1bGUsXG4gIEFuYWx5dGljc0NvbW1hbmRNb2R1bGUsXG4gIEFkZENvbW1hbmRNb2R1bGUsXG4gIEdlbmVyYXRlQ29tbWFuZE1vZHVsZSxcbiAgQnVpbGRDb21tYW5kTW9kdWxlLFxuICBFMmVDb21tYW5kTW9kdWxlLFxuICBUZXN0Q29tbWFuZE1vZHVsZSxcbiAgU2VydmVDb21tYW5kTW9kdWxlLFxuICBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUsXG4gIERlcGxveUNvbW1hbmRNb2R1bGUsXG4gIExpbnRDb21tYW5kTW9kdWxlLFxuICBOZXdDb21tYW5kTW9kdWxlLFxuICBVcGRhdGVDb21tYW5kTW9kdWxlLFxuICBSdW5Db21tYW5kTW9kdWxlLFxuICBDYWNoZUNvbW1hbmRNb2R1bGUsXG4gIENvbXBsZXRpb25Db21tYW5kTW9kdWxlLFxuXS5zb3J0KCk7IC8vIFdpbGwgYmUgc29ydGVkIGJ5IGNsYXNzIG5hbWUuXG5cbmNvbnN0IHlhcmdzUGFyc2VyID0gUGFyc2VyIGFzIHVua25vd24gYXMgdHlwZW9mIFBhcnNlci5kZWZhdWx0O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChhcmdzOiBzdHJpbmdbXSwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHtcbiAgICAkMCxcbiAgICBfLFxuICAgIGhlbHAgPSBmYWxzZSxcbiAgICBqc29uSGVscCA9IGZhbHNlLFxuICAgIGdldFlhcmdzQ29tcGxldGlvbnMgPSBmYWxzZSxcbiAgICAuLi5yZXN0XG4gIH0gPSB5YXJnc1BhcnNlcihhcmdzLCB7XG4gICAgYm9vbGVhbjogWydoZWxwJywgJ2pzb24taGVscCcsICdnZXQteWFyZ3MtY29tcGxldGlvbnMnXSxcbiAgICBhbGlhczogeyAnY29sbGVjdGlvbic6ICdjJyB9LFxuICB9KTtcblxuICAvLyBXaGVuIGBnZXRZYXJnc0NvbXBsZXRpb25zYCBpcyB0cnVlIHRoZSBzY3JpcHROYW1lICduZycgYXQgaW5kZXggMCBpcyBub3QgcmVtb3ZlZC5cbiAgY29uc3QgcG9zaXRpb25hbCA9IGdldFlhcmdzQ29tcGxldGlvbnMgPyBfLnNsaWNlKDEpIDogXztcblxuICBsZXQgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkO1xuICBsZXQgZ2xvYmFsQ29uZmlndXJhdGlvbjogQW5ndWxhcldvcmtzcGFjZTtcbiAgdHJ5IHtcbiAgICBbd29ya3NwYWNlLCBnbG9iYWxDb25maWd1cmF0aW9uXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIGdldFdvcmtzcGFjZSgnbG9jYWwnKSxcbiAgICAgIGdldFdvcmtzcGFjZSgnZ2xvYmFsJyksXG4gICAgXSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2dnZXIuZmF0YWwoZS5tZXNzYWdlKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgY29uc3Qgcm9vdCA9IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgZ2xvYmFsQ29uZmlndXJhdGlvbixcbiAgICB3b3Jrc3BhY2UsXG4gICAgbG9nZ2VyLFxuICAgIGN1cnJlbnREaXJlY3Rvcnk6IHByb2Nlc3MuY3dkKCksXG4gICAgcm9vdCxcbiAgICBwYWNrYWdlTWFuYWdlcjogbmV3IFBhY2thZ2VNYW5hZ2VyVXRpbHMoeyBnbG9iYWxDb25maWd1cmF0aW9uLCB3b3Jrc3BhY2UsIHJvb3QgfSksXG4gICAgYXJnczoge1xuICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbC5tYXAoKHYpID0+IHYudG9TdHJpbmcoKSksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGhlbHAsXG4gICAgICAgIGpzb25IZWxwLFxuICAgICAgICBnZXRZYXJnc0NvbXBsZXRpb25zLFxuICAgICAgICAuLi5yZXN0LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGxldCBsb2NhbFlhcmdzID0geWFyZ3MoYXJncyk7XG4gIGZvciAoY29uc3QgQ29tbWFuZE1vZHVsZSBvZiBDT01NQU5EUykge1xuICAgIGlmICghanNvbkhlbHApIHtcbiAgICAgIC8vIFNraXAgc2NvcGUgdmFsaWRhdGlvbiB3aGVuIHJ1bm5pbmcgd2l0aCAnLS1qc29uLWhlbHAnIHNpbmNlIGl0J3MgZWFzaWVyIHRvIGdlbmVyYXRlIHRoZSBvdXRwdXQgZm9yIGFsbCBjb21tYW5kcyB0aGlzIHdheS5cbiAgICAgIGNvbnN0IHNjb3BlID0gQ29tbWFuZE1vZHVsZS5zY29wZTtcbiAgICAgIGlmICgoc2NvcGUgPT09IENvbW1hbmRTY29wZS5JbiAmJiAhd29ya3NwYWNlKSB8fCAoc2NvcGUgPT09IENvbW1hbmRTY29wZS5PdXQgJiYgd29ya3NwYWNlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2NhbFlhcmdzID0gYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MobG9jYWxZYXJncywgQ29tbWFuZE1vZHVsZSwgY29udGV4dCk7XG4gIH1cblxuICBpZiAoanNvbkhlbHApIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHVzYWdlSW5zdGFuY2UgPSAobG9jYWxZYXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpLmdldFVzYWdlSW5zdGFuY2UoKTtcbiAgICB1c2FnZUluc3RhbmNlLmhlbHAgPSAoKSA9PiBqc29uSGVscFVzYWdlKCk7XG4gIH1cblxuICBhd2FpdCBsb2NhbFlhcmdzXG4gICAgLnNjcmlwdE5hbWUoJ25nJylcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2RvY3MvYWR2YW5jZWQubWQjY3VzdG9taXppbmcteWFyZ3MtcGFyc2VyXG4gICAgLnBhcnNlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgJ3BvcHVsYXRlLS0nOiB0cnVlLFxuICAgICAgJ3Vua25vd24tb3B0aW9ucy1hcy1hcmdzJzogZmFsc2UsXG4gICAgICAnZG90LW5vdGF0aW9uJzogZmFsc2UsXG4gICAgICAnYm9vbGVhbi1uZWdhdGlvbic6IHRydWUsXG4gICAgICAnc3RyaXAtYWxpYXNlZCc6IHRydWUsXG4gICAgICAnc3RyaXAtZGFzaGVkJzogdHJ1ZSxcbiAgICAgICdjYW1lbC1jYXNlLWV4cGFuc2lvbic6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbignanNvbi1oZWxwJywge1xuICAgICAgZGVzY3JpYmU6ICdTaG93IGhlbHAgaW4gSlNPTiBmb3JtYXQuJyxcbiAgICAgIGltcGxpZXM6IFsnaGVscCddLFxuICAgICAgaGlkZGVuOiB0cnVlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIH0pXG4gICAgLmhlbHAoJ2hlbHAnLCAnU2hvd3MgYSBoZWxwIG1lc3NhZ2UgZm9yIHRoaXMgY29tbWFuZCBpbiB0aGUgY29uc29sZS4nKVxuICAgIC8vIEEgY29tcGxldGUgbGlzdCBvZiBzdHJpbmdzIGNhbiBiZSBmb3VuZDogaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9sb2NhbGVzL2VuLmpzb25cbiAgICAudXBkYXRlU3RyaW5ncyh7XG4gICAgICAnQ29tbWFuZHM6JzogY29sb3JzLmN5YW4oJ0NvbW1hbmRzOicpLFxuICAgICAgJ09wdGlvbnM6JzogY29sb3JzLmN5YW4oJ09wdGlvbnM6JyksXG4gICAgICAnUG9zaXRpb25hbHM6JzogY29sb3JzLmN5YW4oJ0FyZ3VtZW50czonKSxcbiAgICAgICdkZXByZWNhdGVkJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZCcpLFxuICAgICAgJ2RlcHJlY2F0ZWQ6ICVzJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZDonKSArICcgJXMnLFxuICAgICAgJ0RpZCB5b3UgbWVhbiAlcz8nOiAnVW5rbm93biBjb21tYW5kLiBEaWQgeW91IG1lYW4gJXM/JyxcbiAgICB9KVxuICAgIC5lcGlsb2d1ZShjb2xvcnMuZ3JheShnZXRFcGlsb2d1ZSghIXdvcmtzcGFjZSkpKVxuICAgIC5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSlcbiAgICAucmVjb21tZW5kQ29tbWFuZHMoKVxuICAgIC5taWRkbGV3YXJlKG5vcm1hbGl6ZU9wdGlvbnNNaWRkbGV3YXJlKVxuICAgIC52ZXJzaW9uKGZhbHNlKVxuICAgIC5zaG93SGVscE9uRmFpbChmYWxzZSlcbiAgICAuc3RyaWN0KClcbiAgICAuZmFpbCgobXNnLCBlcnIpID0+IHtcbiAgICAgIHRocm93IG1zZ1xuICAgICAgICA/IC8vIFZhbGlkYXRpb24gZmFpbGVkIGV4YW1wbGU6IGBVbmtub3duIGFyZ3VtZW50OmBcbiAgICAgICAgICBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKG1zZylcbiAgICAgICAgOiAvLyBVbmtub3duIGV4Y2VwdGlvbiwgcmUtdGhyb3cuXG4gICAgICAgICAgZXJyO1xuICAgIH0pXG4gICAgLndyYXAoeWFyZ3MudGVybWluYWxXaWR0aCgpKVxuICAgIC5wYXJzZUFzeW5jKCk7XG5cbiAgcmV0dXJuIHByb2Nlc3MuZXhpdENvZGUgPz8gMDtcbn1cblxuZnVuY3Rpb24gZ2V0RXBpbG9ndWUoaXNJbnNpZGVXb3Jrc3BhY2U6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBsZXQgbWVzc2FnZTogc3RyaW5nO1xuICBpZiAoaXNJbnNpZGVXb3Jrc3BhY2UpIHtcbiAgICBtZXNzYWdlID1cbiAgICAgICdUaGUgYWJvdmUgY29tbWFuZHMgYXJlIGF2YWlsYWJsZSB3aGVuIHJ1bm5pbmcgdGhlIEFuZ3VsYXIgQ0xJIGluc2lkZSBhIHdvcmtzcGFjZS4nICtcbiAgICAgICdNb3JlIGNvbW1hbmRzIGFyZSBhdmFpbGFibGUgd2hlbiBydW5uaW5nIG91dHNpZGUgYSB3b3Jrc3BhY2UuXFxuJztcbiAgfSBlbHNlIHtcbiAgICBtZXNzYWdlID1cbiAgICAgICdUaGUgYWJvdmUgY29tbWFuZHMgYXJlIGF2YWlsYWJsZSB3aGVuIHJ1bm5pbmcgdGhlIEFuZ3VsYXIgQ0xJIG91dHNpZGUgYSB3b3Jrc3BhY2UuJyArXG4gICAgICAnTW9yZSBjb21tYW5kcyBhcmUgYXZhaWxhYmxlIHdoZW4gcnVubmluZyBpbnNpZGUgYSB3b3Jrc3BhY2UuXFxuJztcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlICsgJ0ZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2NsaS8uXFxuJztcbn1cbiJdfQ==