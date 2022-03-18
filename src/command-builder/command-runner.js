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
const package_manager_1 = require("../utilities/package-manager");
const command_module_1 = require("./command-module");
const command_1 = require("./utilities/command");
const json_help_1 = require("./utilities/json-help");
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
async function runCommand(args, logger, workspace) {
    var _a, _b, _c;
    const { $0, _: positional, help = false, jsonHelp = false, ...rest } = yargsParser(args, { boolean: ['help', 'json-help'], alias: { 'collection': 'c' } });
    const context = {
        workspace,
        logger,
        currentDirectory: process.cwd(),
        root: (_a = workspace === null || workspace === void 0 ? void 0 : workspace.basePath) !== null && _a !== void 0 ? _a : process.cwd(),
        packageManager: await (0, package_manager_1.getPackageManager)((_b = workspace === null || workspace === void 0 ? void 0 : workspace.basePath) !== null && _b !== void 0 ? _b : process.cwd()),
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
    return (_c = process.exitCode) !== null && _c !== void 0 ? _c : 0;
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsK0NBQTJEO0FBQzNELGdEQUE2RDtBQUM3RCxnREFBNkQ7QUFDN0QsNkNBQXVEO0FBQ3ZELDZDQUF1RDtBQUN2RCxzREFBd0U7QUFDeEUsbURBQWlFO0FBQ2pFLCtDQUF5RDtBQUN6RCw0REFBeUU7QUFDekUsOENBQXVEO0FBQ3ZELDhDQUF1RDtBQUN2RCxnREFBMkQ7QUFDM0QsK0NBQXlEO0FBQ3pELGlEQUE2RDtBQUM3RCxrREFBK0Q7QUFDL0QsOENBQTRDO0FBRTVDLGtFQUFpRTtBQUNqRSxxREFBb0Y7QUFDcEYsaURBQTJGO0FBQzNGLHFEQUFzRDtBQUV0RCxNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDRCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsOEJBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7SUFDaEIsd0JBQWtCO0NBQ25CLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxnQ0FBZ0M7QUFFMUMsTUFBTSxXQUFXLEdBQUcsZ0JBQTBDLENBQUM7QUFFeEQsS0FBSyxVQUFVLFVBQVUsQ0FDOUIsSUFBYyxFQUNkLE1BQXNCLEVBQ3RCLFNBQXVD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UUFDekMsZ0JBQWdCLEVBQUUsY0FBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxLQUFLO1FBQ3RELGtCQUFrQixFQUFFLG1DQUFtQztLQUN4RCxDQUFDO1NBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxxQ0FBMkIsQ0FBQztTQUM3QyxpQkFBaUIsRUFBRTtTQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ2QsY0FBYyxDQUFDLEtBQUssQ0FBQztTQUNyQixNQUFNLEVBQUU7U0FDUixJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakIsTUFBTSxHQUFHO1lBQ1AsQ0FBQyxDQUFDLGlEQUFpRDtnQkFDakQsSUFBSSxtQ0FBa0IsQ0FBQyxHQUFHLENBQUM7WUFDN0IsQ0FBQyxDQUFDLCtCQUErQjtnQkFDL0IsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxDQUFDO1NBQ0QsSUFBSSxDQUFDLGVBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUMzQixVQUFVLEVBQUUsQ0FBQztJQUVoQixPQUFPLE1BQUEsT0FBTyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUEzRkQsZ0NBMkZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBBZGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYWRkL2NsaSc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYW5hbHl0aWNzL2NsaSc7XG5pbXBvcnQgeyBCdWlsZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9idWlsZC9jbGknO1xuaW1wb3J0IHsgQ2FjaGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvY2FjaGUvY2xpJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb25maWcvY2xpJztcbmltcG9ydCB7IERlcGxveUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kZXBsb3kvY2xpJztcbmltcG9ydCB7IERvY0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kb2MvY2xpJztcbmltcG9ydCB7IEUyZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9lMmUvY2xpJztcbmltcG9ydCB7IEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi9jbGknO1xuaW1wb3J0IHsgR2VuZXJhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZ2VuZXJhdGUvY2xpJztcbmltcG9ydCB7IExpbnRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbGludC9jbGknO1xuaW1wb3J0IHsgQXdlc29tZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9tYWtlLXRoaXMtYXdlc29tZS9jbGknO1xuaW1wb3J0IHsgTmV3Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL25ldy9jbGknO1xuaW1wb3J0IHsgUnVuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3J1bi9jbGknO1xuaW1wb3J0IHsgU2VydmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvc2VydmUvY2xpJztcbmltcG9ydCB7IFRlc3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdGVzdC9jbGknO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3VwZGF0ZS9jbGknO1xuaW1wb3J0IHsgVmVyc2lvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy92ZXJzaW9uL2NsaSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IENvbW1hbmRDb250ZXh0LCBDb21tYW5kTW9kdWxlRXJyb3IsIENvbW1hbmRTY29wZSB9IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsganNvbkhlbHBVc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24taGVscCc7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBWZXJzaW9uQ29tbWFuZE1vZHVsZSxcbiAgRG9jQ29tbWFuZE1vZHVsZSxcbiAgQXdlc29tZUNvbW1hbmRNb2R1bGUsXG4gIENvbmZpZ0NvbW1hbmRNb2R1bGUsXG4gIEFuYWx5dGljc0NvbW1hbmRNb2R1bGUsXG4gIEFkZENvbW1hbmRNb2R1bGUsXG4gIEdlbmVyYXRlQ29tbWFuZE1vZHVsZSxcbiAgQnVpbGRDb21tYW5kTW9kdWxlLFxuICBFMmVDb21tYW5kTW9kdWxlLFxuICBUZXN0Q29tbWFuZE1vZHVsZSxcbiAgU2VydmVDb21tYW5kTW9kdWxlLFxuICBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUsXG4gIERlcGxveUNvbW1hbmRNb2R1bGUsXG4gIExpbnRDb21tYW5kTW9kdWxlLFxuICBOZXdDb21tYW5kTW9kdWxlLFxuICBVcGRhdGVDb21tYW5kTW9kdWxlLFxuICBSdW5Db21tYW5kTW9kdWxlLFxuICBDYWNoZUNvbW1hbmRNb2R1bGUsXG5dLnNvcnQoKTsgLy8gV2lsbCBiZSBzb3J0ZWQgYnkgY2xhc3MgbmFtZS5cblxuY29uc3QgeWFyZ3NQYXJzZXIgPSBQYXJzZXIgYXMgdW5rbm93biBhcyB0eXBlb2YgUGFyc2VyLmRlZmF1bHQ7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qge1xuICAgICQwLFxuICAgIF86IHBvc2l0aW9uYWwsXG4gICAgaGVscCA9IGZhbHNlLFxuICAgIGpzb25IZWxwID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywgeyBib29sZWFuOiBbJ2hlbHAnLCAnanNvbi1oZWxwJ10sIGFsaWFzOiB7ICdjb2xsZWN0aW9uJzogJ2MnIH0gfSk7XG5cbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgd29ya3NwYWNlLFxuICAgIGxvZ2dlcixcbiAgICBjdXJyZW50RGlyZWN0b3J5OiBwcm9jZXNzLmN3ZCgpLFxuICAgIHJvb3Q6IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKSxcbiAgICBwYWNrYWdlTWFuYWdlcjogYXdhaXQgZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlPy5iYXNlUGF0aCA/PyBwcm9jZXNzLmN3ZCgpKSxcbiAgICBhcmdzOiB7XG4gICAgICBwb3NpdGlvbmFsOiBwb3NpdGlvbmFsLm1hcCgodikgPT4gdi50b1N0cmluZygpKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgaGVscCxcbiAgICAgICAganNvbkhlbHAsXG4gICAgICAgIC4uLnJlc3QsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgbGV0IGxvY2FsWWFyZ3MgPSB5YXJncyhhcmdzKTtcbiAgZm9yIChjb25zdCBDb21tYW5kTW9kdWxlIG9mIENPTU1BTkRTKSB7XG4gICAgaWYgKCFqc29uSGVscCkge1xuICAgICAgLy8gU2tpcCBzY29wZSB2YWxpZGF0aW9uIHdoZW4gcnVubmluZyB3aXRoICctLWpzb24taGVscCcgc2luY2UgaXQncyBlYXNpZXIgdG8gZ2VuZXJhdGUgdGhlIG91dHB1dCBmb3IgYWxsIGNvbW1hbmRzIHRoaXMgd2F5LlxuICAgICAgY29uc3Qgc2NvcGUgPSBDb21tYW5kTW9kdWxlLnNjb3BlO1xuICAgICAgaWYgKChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLkluICYmICF3b3Jrc3BhY2UpIHx8IChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLk91dCAmJiB3b3Jrc3BhY2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxvY2FsWWFyZ3MgPSBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21tYW5kTW9kdWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIGlmIChqc29uSGVscCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKGxvY2FsWWFyZ3MgYXMgYW55KS5nZXRJbnRlcm5hbE1ldGhvZHMoKS5nZXRVc2FnZUluc3RhbmNlKCkuaGVscCA9ICgpID0+IGpzb25IZWxwVXNhZ2UoKTtcbiAgfVxuXG4gIGF3YWl0IGxvY2FsWWFyZ3NcbiAgICAuc2NyaXB0TmFtZSgnbmcnKVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vZG9jcy9hZHZhbmNlZC5tZCNjdXN0b21pemluZy15YXJncy1wYXJzZXJcbiAgICAucGFyc2VyQ29uZmlndXJhdGlvbih7XG4gICAgICAncG9wdWxhdGUtLSc6IHRydWUsXG4gICAgICAndW5rbm93bi1vcHRpb25zLWFzLWFyZ3MnOiBmYWxzZSxcbiAgICAgICdkb3Qtbm90YXRpb24nOiBmYWxzZSxcbiAgICAgICdib29sZWFuLW5lZ2F0aW9uJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1hbGlhc2VkJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1kYXNoZWQnOiB0cnVlLFxuICAgICAgJ2NhbWVsLWNhc2UtZXhwYW5zaW9uJzogZmFsc2UsXG4gICAgfSlcbiAgICAub3B0aW9uKCdqc29uLWhlbHAnLCB7XG4gICAgICBkZXNjcmliZTogJ1Nob3cgaGVscCBpbiBKU09OIGZvcm1hdC4nLFxuICAgICAgaW1wbGllczogWydoZWxwJ10sXG4gICAgICBoaWRkZW46IHRydWUsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgfSlcbiAgICAuaGVscCgnaGVscCcsICdTaG93cyBhIGhlbHAgbWVzc2FnZSBmb3IgdGhpcyBjb21tYW5kIGluIHRoZSBjb25zb2xlLicpXG4gICAgLy8gQSBjb21wbGV0ZSBsaXN0IG9mIHN0cmluZ3MgY2FuIGJlIGZvdW5kOiBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2xvY2FsZXMvZW4uanNvblxuICAgIC51cGRhdGVTdHJpbmdzKHtcbiAgICAgICdDb21tYW5kczonOiBjb2xvcnMuY3lhbignQ29tbWFuZHM6JyksXG4gICAgICAnT3B0aW9uczonOiBjb2xvcnMuY3lhbignT3B0aW9uczonKSxcbiAgICAgICdQb3NpdGlvbmFsczonOiBjb2xvcnMuY3lhbignQXJndW1lbnRzOicpLFxuICAgICAgJ2RlcHJlY2F0ZWQnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkJyksXG4gICAgICAnZGVwcmVjYXRlZDogJXMnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkOicpICsgJyAlcycsXG4gICAgICAnRGlkIHlvdSBtZWFuICVzPyc6ICdVbmtub3duIGNvbW1hbmQuIERpZCB5b3UgbWVhbiAlcz8nLFxuICAgIH0pXG4gICAgLmRlbWFuZENvbW1hbmQoMSwgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlKVxuICAgIC5yZWNvbW1lbmRDb21tYW5kcygpXG4gICAgLnZlcnNpb24oZmFsc2UpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5zdHJpY3QoKVxuICAgIC5mYWlsKChtc2csIGVycikgPT4ge1xuICAgICAgdGhyb3cgbXNnXG4gICAgICAgID8gLy8gVmFsaWRhdGlvbiBmYWlsZWQgZXhhbXBsZTogYFVua25vd24gYXJndW1lbnQ6YFxuICAgICAgICAgIG5ldyBDb21tYW5kTW9kdWxlRXJyb3IobXNnKVxuICAgICAgICA6IC8vIFVua25vd24gZXhjZXB0aW9uLCByZS10aHJvdy5cbiAgICAgICAgICBlcnI7XG4gICAgfSlcbiAgICAud3JhcCh5YXJncy50ZXJtaW5hbFdpZHRoKCkpXG4gICAgLnBhcnNlQXN5bmMoKTtcblxuICByZXR1cm4gcHJvY2Vzcy5leGl0Q29kZSA/PyAwO1xufVxuIl19