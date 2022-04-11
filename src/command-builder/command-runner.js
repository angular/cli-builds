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
const cli_5 = require("../commands/config/cli");
const cli_6 = require("../commands/deploy/cli");
const cli_7 = require("../commands/doc/cli");
const cli_8 = require("../commands/e2e/cli");
const cli_9 = require("../commands/extract-i18n/cli");
const cli_10 = require("../commands/generate/cli");
const cli_11 = require("../commands/lint/cli");
const cli_12 = require("../commands/make-this-awesome/cli");
const cli_13 = require("../commands/new/cli");
const cli_14 = require("../commands/run/cli");
const cli_15 = require("../commands/serve/cli");
const cli_16 = require("../commands/test/cli");
const cli_17 = require("../commands/update/cli");
const cli_18 = require("../commands/version/cli");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
const package_manager_1 = require("../utilities/package-manager");
const command_module_1 = require("./command-module");
const command_1 = require("./utilities/command");
const json_help_1 = require("./utilities/json-help");
const normalize_options_middleware_1 = require("./utilities/normalize-options-middleware");
const COMMANDS = [
    cli_18.VersionCommandModule,
    cli_7.DocCommandModule,
    cli_12.AwesomeCommandModule,
    cli_5.ConfigCommandModule,
    cli_2.AnalyticsCommandModule,
    cli_1.AddCommandModule,
    cli_10.GenerateCommandModule,
    cli_3.BuildCommandModule,
    cli_8.E2eCommandModule,
    cli_16.TestCommandModule,
    cli_15.ServeCommandModule,
    cli_9.ExtractI18nCommandModule,
    cli_6.DeployCommandModule,
    cli_11.LintCommandModule,
    cli_13.NewCommandModule,
    cli_17.UpdateCommandModule,
    cli_14.RunCommandModule,
    cli_4.CacheCommandModule,
].sort(); // Will be sorted by class name.
const yargsParser = helpers_1.Parser;
async function runCommand(args, logger) {
    var _a, _b;
    const { $0, _: positional, help = false, jsonHelp = false, ...rest } = yargsParser(args, { boolean: ['help', 'json-help'], alias: { 'collection': 'c' } });
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
        localYargs.getInternalMethods().getUsageInstance().help = () => (0, json_help_1.jsonHelpUsage)();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELGdEQUE2RDtBQUM3RCxnREFBNkQ7QUFDN0QsNkNBQXVEO0FBQ3ZELDZDQUF1RDtBQUN2RCxzREFBd0U7QUFDeEUsbURBQWlFO0FBQ2pFLCtDQUF5RDtBQUN6RCw0REFBeUU7QUFDekUsOENBQXVEO0FBQ3ZELDhDQUF1RDtBQUN2RCxnREFBMkQ7QUFDM0QsK0NBQXlEO0FBQ3pELGlEQUE2RDtBQUM3RCxrREFBK0Q7QUFDL0QsOENBQTRDO0FBQzVDLGdEQUFxRTtBQUNyRSxrRUFBbUU7QUFDbkUscURBQW9GO0FBQ3BGLGlEQUEyRjtBQUMzRixxREFBc0Q7QUFDdEQsMkZBQXNGO0FBRXRGLE1BQU0sUUFBUSxHQUFHO0lBQ2YsMkJBQW9CO0lBQ3BCLHNCQUFnQjtJQUNoQiwyQkFBb0I7SUFDcEIseUJBQW1CO0lBQ25CLDRCQUFzQjtJQUN0QixzQkFBZ0I7SUFDaEIsNEJBQXFCO0lBQ3JCLHdCQUFrQjtJQUNsQixzQkFBZ0I7SUFDaEIsd0JBQWlCO0lBQ2pCLHlCQUFrQjtJQUNsQiw4QkFBd0I7SUFDeEIseUJBQW1CO0lBQ25CLHdCQUFpQjtJQUNqQix1QkFBZ0I7SUFDaEIsMEJBQW1CO0lBQ25CLHVCQUFnQjtJQUNoQix3QkFBa0I7Q0FDbkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdDQUFnQztBQUUxQyxNQUFNLFdBQVcsR0FBRyxnQkFBMEMsQ0FBQztBQUV4RCxLQUFLLFVBQVUsVUFBVSxDQUFDLElB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cHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgQWRkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FkZC9jbGknO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FuYWx5dGljcy9jbGknO1xuaW1wb3J0IHsgQnVpbGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYnVpbGQvY2xpJztcbmltcG9ydCB7IENhY2hlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NhY2hlL2NsaSc7XG5pbXBvcnQgeyBDb25maWdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY29uZmlnL2NsaSc7XG5pbXBvcnQgeyBEZXBsb3lDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZGVwbG95L2NsaSc7XG5pbXBvcnQgeyBEb2NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZG9jL2NsaSc7XG5pbXBvcnQgeyBFMmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZTJlL2NsaSc7XG5pbXBvcnQgeyBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9leHRyYWN0LWkxOG4vY2xpJztcbmltcG9ydCB7IEdlbmVyYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2dlbmVyYXRlL2NsaSc7XG5pbXBvcnQgeyBMaW50Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2xpbnQvY2xpJztcbmltcG9ydCB7IEF3ZXNvbWVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbWFrZS10aGlzLWF3ZXNvbWUvY2xpJztcbmltcG9ydCB7IE5ld0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9uZXcvY2xpJztcbmltcG9ydCB7IFJ1bkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9ydW4vY2xpJztcbmltcG9ydCB7IFNlcnZlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3NlcnZlL2NsaSc7XG5pbXBvcnQgeyBUZXN0Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3Rlc3QvY2xpJztcbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy91cGRhdGUvY2xpJztcbmltcG9ydCB7IFZlcnNpb25Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdmVyc2lvbi9jbGknO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IEFuZ3VsYXJXb3Jrc3BhY2UsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXJVdGlscyB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciwgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncywgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBqc29uSGVscFVzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1oZWxwJztcbmltcG9ydCB7IG5vcm1hbGl6ZU9wdGlvbnNNaWRkbGV3YXJlIH0gZnJvbSAnLi91dGlsaXRpZXMvbm9ybWFsaXplLW9wdGlvbnMtbWlkZGxld2FyZSc7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBWZXJzaW9uQ29tbWFuZE1vZHVsZSxcbiAgRG9jQ29tbWFuZE1vZHVsZSxcbiAgQXdlc29tZUNvbW1hbmRNb2R1bGUsXG4gIENvbmZpZ0NvbW1hbmRNb2R1bGUsXG4gIEFuYWx5dGljc0NvbW1hbmRNb2R1bGUsXG4gIEFkZENvbW1hbmRNb2R1bGUsXG4gIEdlbmVyYXRlQ29tbWFuZE1vZHVsZSxcbiAgQnVpbGRDb21tYW5kTW9kdWxlLFxuICBFMmVDb21tYW5kTW9kdWxlLFxuICBUZXN0Q29tbWFuZE1vZHVsZSxcbiAgU2VydmVDb21tYW5kTW9kdWxlLFxuICBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUsXG4gIERlcGxveUNvbW1hbmRNb2R1bGUsXG4gIExpbnRDb21tYW5kTW9kdWxlLFxuICBOZXdDb21tYW5kTW9kdWxlLFxuICBVcGRhdGVDb21tYW5kTW9kdWxlLFxuICBSdW5Db21tYW5kTW9kdWxlLFxuICBDYWNoZUNvbW1hbmRNb2R1bGUsXG5dLnNvcnQoKTsgLy8gV2lsbCBiZSBzb3J0ZWQgYnkgY2xhc3MgbmFtZS5cblxuY29uc3QgeWFyZ3NQYXJzZXIgPSBQYXJzZXIgYXMgdW5rbm93biBhcyB0eXBlb2YgUGFyc2VyLmRlZmF1bHQ7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKGFyZ3M6IHN0cmluZ1tdLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qge1xuICAgICQwLFxuICAgIF86IHBvc2l0aW9uYWwsXG4gICAgaGVscCA9IGZhbHNlLFxuICAgIGpzb25IZWxwID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywgeyBib29sZWFuOiBbJ2hlbHAnLCAnanNvbi1oZWxwJ10sIGFsaWFzOiB7ICdjb2xsZWN0aW9uJzogJ2MnIH0gfSk7XG5cbiAgbGV0IHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZDtcbiAgbGV0IGdsb2JhbENvbmZpZ3VyYXRpb246IEFuZ3VsYXJXb3Jrc3BhY2UgfCB1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgW3dvcmtzcGFjZSwgZ2xvYmFsQ29uZmlndXJhdGlvbl0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyksXG4gICAgICBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpLFxuICAgIF0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmZhdGFsKGUubWVzc2FnZSk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGNvbnN0IHJvb3QgPSB3b3Jrc3BhY2U/LmJhc2VQYXRoID8/IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0ID0ge1xuICAgIGdsb2JhbENvbmZpZ3VyYXRpb24sXG4gICAgd29ya3NwYWNlLFxuICAgIGxvZ2dlcixcbiAgICBjdXJyZW50RGlyZWN0b3J5OiBwcm9jZXNzLmN3ZCgpLFxuICAgIHJvb3QsXG4gICAgcGFja2FnZU1hbmFnZXI6IG5ldyBQYWNrYWdlTWFuYWdlclV0aWxzKHsgZ2xvYmFsQ29uZmlndXJhdGlvbiwgd29ya3NwYWNlLCByb290IH0pLFxuICAgIGFyZ3M6IHtcbiAgICAgIHBvc2l0aW9uYWw6IHBvc2l0aW9uYWwubWFwKCh2KSA9PiB2LnRvU3RyaW5nKCkpLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBoZWxwLFxuICAgICAgICBqc29uSGVscCxcbiAgICAgICAgLi4ucmVzdCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBsZXQgbG9jYWxZYXJncyA9IHlhcmdzKGFyZ3MpO1xuICBmb3IgKGNvbnN0IENvbW1hbmRNb2R1bGUgb2YgQ09NTUFORFMpIHtcbiAgICBpZiAoIWpzb25IZWxwKSB7XG4gICAgICAvLyBTa2lwIHNjb3BlIHZhbGlkYXRpb24gd2hlbiBydW5uaW5nIHdpdGggJy0tanNvbi1oZWxwJyBzaW5jZSBpdCdzIGVhc2llciB0byBnZW5lcmF0ZSB0aGUgb3V0cHV0IGZvciBhbGwgY29tbWFuZHMgdGhpcyB3YXkuXG4gICAgICBjb25zdCBzY29wZSA9IENvbW1hbmRNb2R1bGUuc2NvcGU7XG4gICAgICBpZiAoKHNjb3BlID09PSBDb21tYW5kU2NvcGUuSW4gJiYgIXdvcmtzcGFjZSkgfHwgKHNjb3BlID09PSBDb21tYW5kU2NvcGUuT3V0ICYmIHdvcmtzcGFjZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9jYWxZYXJncyA9IGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIENvbW1hbmRNb2R1bGUsIGNvbnRleHQpO1xuICB9XG5cbiAgaWYgKGpzb25IZWxwKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAobG9jYWxZYXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpLmdldFVzYWdlSW5zdGFuY2UoKS5oZWxwID0gKCkgPT4ganNvbkhlbHBVc2FnZSgpO1xuICB9XG5cbiAgYXdhaXQgbG9jYWxZYXJnc1xuICAgIC5zY3JpcHROYW1lKCduZycpXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9kb2NzL2FkdmFuY2VkLm1kI2N1c3RvbWl6aW5nLXlhcmdzLXBhcnNlclxuICAgIC5wYXJzZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICdwb3B1bGF0ZS0tJzogdHJ1ZSxcbiAgICAgICd1bmtub3duLW9wdGlvbnMtYXMtYXJncyc6IGZhbHNlLFxuICAgICAgJ2RvdC1ub3RhdGlvbic6IGZhbHNlLFxuICAgICAgJ2Jvb2xlYW4tbmVnYXRpb24nOiB0cnVlLFxuICAgICAgJ3N0cmlwLWFsaWFzZWQnOiB0cnVlLFxuICAgICAgJ3N0cmlwLWRhc2hlZCc6IHRydWUsXG4gICAgICAnY2FtZWwtY2FzZS1leHBhbnNpb24nOiBmYWxzZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2pzb24taGVscCcsIHtcbiAgICAgIGRlc2NyaWJlOiAnU2hvdyBoZWxwIGluIEpTT04gZm9ybWF0LicsXG4gICAgICBpbXBsaWVzOiBbJ2hlbHAnXSxcbiAgICAgIGhpZGRlbjogdHJ1ZSxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICB9KVxuICAgIC5oZWxwKCdoZWxwJywgJ1Nob3dzIGEgaGVscCBtZXNzYWdlIGZvciB0aGlzIGNvbW1hbmQgaW4gdGhlIGNvbnNvbGUuJylcbiAgICAvLyBBIGNvbXBsZXRlIGxpc3Qgb2Ygc3RyaW5ncyBjYW4gYmUgZm91bmQ6IGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vbG9jYWxlcy9lbi5qc29uXG4gICAgLnVwZGF0ZVN0cmluZ3Moe1xuICAgICAgJ0NvbW1hbmRzOic6IGNvbG9ycy5jeWFuKCdDb21tYW5kczonKSxcbiAgICAgICdPcHRpb25zOic6IGNvbG9ycy5jeWFuKCdPcHRpb25zOicpLFxuICAgICAgJ1Bvc2l0aW9uYWxzOic6IGNvbG9ycy5jeWFuKCdBcmd1bWVudHM6JyksXG4gICAgICAnZGVwcmVjYXRlZCc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQnKSxcbiAgICAgICdkZXByZWNhdGVkOiAlcyc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQ6JykgKyAnICVzJyxcbiAgICAgICdEaWQgeW91IG1lYW4gJXM/JzogJ1Vua25vd24gY29tbWFuZC4gRGlkIHlvdSBtZWFuICVzPycsXG4gICAgfSlcbiAgICAuZGVtYW5kQ29tbWFuZCgxLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UpXG4gICAgLnJlY29tbWVuZENvbW1hbmRzKClcbiAgICAubWlkZGxld2FyZShub3JtYWxpemVPcHRpb25zTWlkZGxld2FyZSlcbiAgICAudmVyc2lvbihmYWxzZSlcbiAgICAuc2hvd0hlbHBPbkZhaWwoZmFsc2UpXG4gICAgLnN0cmljdCgpXG4gICAgLmZhaWwoKG1zZywgZXJyKSA9PiB7XG4gICAgICB0aHJvdyBtc2dcbiAgICAgICAgPyAvLyBWYWxpZGF0aW9uIGZhaWxlZCBleGFtcGxlOiBgVW5rbm93biBhcmd1bWVudDpgXG4gICAgICAgICAgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihtc2cpXG4gICAgICAgIDogLy8gVW5rbm93biBleGNlcHRpb24sIHJlLXRocm93LlxuICAgICAgICAgIGVycjtcbiAgICB9KVxuICAgIC53cmFwKHlhcmdzLnRlcm1pbmFsV2lkdGgoKSlcbiAgICAucGFyc2VBc3luYygpO1xuXG4gIHJldHVybiBwcm9jZXNzLmV4aXRDb2RlID8/IDA7XG59XG4iXX0=