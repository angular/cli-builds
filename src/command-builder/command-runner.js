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
const cli_4 = require("../commands/config/cli");
const cli_5 = require("../commands/deploy/cli");
const cli_6 = require("../commands/doc/cli");
const cli_7 = require("../commands/e2e/cli");
const cli_8 = require("../commands/extract-i18n/cli");
const cli_9 = require("../commands/generate/cli");
const cli_10 = require("../commands/lint/cli");
const cli_11 = require("../commands/make-this-awesome/cli");
const cli_12 = require("../commands/new/cli");
const cli_13 = require("../commands/run/cli");
const cli_14 = require("../commands/serve/cli");
const cli_15 = require("../commands/test/cli");
const cli_16 = require("../commands/update/cli");
const cli_17 = require("../commands/version/cli");
const color_1 = require("../utilities/color");
const command_module_1 = require("./command-module");
const command_1 = require("./utilities/command");
const json_help_1 = require("./utilities/json-help");
const COMMANDS = [
    cli_17.VersionCommandModule,
    cli_6.DocCommandModule,
    cli_11.AwesomeCommandModule,
    cli_4.ConfigCommandModule,
    cli_2.AnalyticsCommandModule,
    cli_1.AddCommandModule,
    cli_9.GenerateCommandModule,
    cli_3.BuildCommandModule,
    cli_7.E2eCommandModule,
    cli_15.TestCommandModule,
    cli_14.ServeCommandModule,
    cli_8.ExtractI18nCommandModule,
    cli_5.DeployCommandModule,
    cli_10.LintCommandModule,
    cli_12.NewCommandModule,
    cli_16.UpdateCommandModule,
    cli_13.RunCommandModule,
].sort(); // Will be sorted by class name.
const yargsParser = helpers_1.Parser;
async function runCommand(args, logger, workspace) {
    var _a, _b;
    const { $0, _: positional, help = false, jsonHelp = false, ...rest } = yargsParser(args, { boolean: ['help', 'json-help'], alias: { 'collection': 'c' } });
    const context = {
        workspace,
        logger,
        currentDirectory: process.cwd(),
        root: (_a = workspace === null || workspace === void 0 ? void 0 : workspace.basePath) !== null && _a !== void 0 ? _a : process.cwd(),
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
    return (_b = process.exitCode) !== null && _b !== void 0 ? _b : 0;
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsZ0RBQTZEO0FBQzdELGdEQUE2RDtBQUM3RCw2Q0FBdUQ7QUFDdkQsNkNBQXVEO0FBQ3ZELHNEQUF3RTtBQUN4RSxrREFBaUU7QUFDakUsK0NBQXlEO0FBQ3pELDREQUF5RTtBQUN6RSw4Q0FBdUQ7QUFDdkQsOENBQXVEO0FBQ3ZELGdEQUEyRDtBQUMzRCwrQ0FBeUQ7QUFDekQsaURBQTZEO0FBQzdELGtEQUErRDtBQUMvRCw4Q0FBNEM7QUFFNUMscURBQW9GO0FBQ3BGLGlEQUEyRjtBQUMzRixxREFBc0Q7QUFFdEQsTUFBTSxRQUFRLEdBQUc7SUFDZiwyQkFBb0I7SUFDcEIsc0JBQWdCO0lBQ2hCLDJCQUFvQjtJQUNwQix5QkFBbUI7SUFDbkIsNEJBQXNCO0lBQ3RCLHNCQUFnQjtJQUNoQiwyQkFBcUI7SUFDckIsd0JBQWtCO0lBQ2xCLHNCQUFnQjtJQUNoQix3QkFBaUI7SUFDakIseUJBQWtCO0lBQ2xCLDhCQUF3QjtJQUN4Qix5QkFBbUI7SUFDbkIsd0JBQWlCO0lBQ2pCLHVCQUFnQjtJQUNoQiwwQkFBbUI7SUFDbkIsdUJBQWdCO0NBQ2pCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxnQ0FBZ0M7QUFFMUMsTUFBTSxXQUFXLEdBQUcsZ0JBQTBDLENBQUM7QUFFeEQsS0FBSyxVQUFVLFVBQVUsQ0FDOUIsSUFBYyxFQUNkLE1BQXNCLEVBQ3RCLFNBQXVDOztJQUV2QyxNQUFNLEVBQ0osRUFBRSxFQUNGLENBQUMsRUFBRSxV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U0FDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNkLGNBQWMsQ0FBQyxLQUFLLENBQUM7U0FDckIsTUFBTSxFQUFFO1NBQ1IsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pCLE1BQU0sR0FBRztZQUNQLENBQUMsQ0FBQyxpREFBaUQ7Z0JBQ2pELElBQUksbUNBQWtCLENBQUMsR0FBRyxDQUFDO1lBQzdCLENBQUMsQ0FBQywrQkFBK0I7Z0JBQy9CLEdBQUcsQ0FBQztJQUNWLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxlQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDM0IsVUFBVSxFQUFFLENBQUM7SUFFaEIsT0FBTyxNQUFBLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBMUZELGdDQTBGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgQWRkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FkZC9jbGknO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FuYWx5dGljcy9jbGknO1xuaW1wb3J0IHsgQnVpbGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYnVpbGQvY2xpJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb25maWcvY2xpJztcbmltcG9ydCB7IERlcGxveUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kZXBsb3kvY2xpJztcbmltcG9ydCB7IERvY0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kb2MvY2xpJztcbmltcG9ydCB7IEUyZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9lMmUvY2xpJztcbmltcG9ydCB7IEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi9jbGknO1xuaW1wb3J0IHsgR2VuZXJhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZ2VuZXJhdGUvY2xpJztcbmltcG9ydCB7IExpbnRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbGludC9jbGknO1xuaW1wb3J0IHsgQXdlc29tZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9tYWtlLXRoaXMtYXdlc29tZS9jbGknO1xuaW1wb3J0IHsgTmV3Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL25ldy9jbGknO1xuaW1wb3J0IHsgUnVuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3J1bi9jbGknO1xuaW1wb3J0IHsgU2VydmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvc2VydmUvY2xpJztcbmltcG9ydCB7IFRlc3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdGVzdC9jbGknO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3VwZGF0ZS9jbGknO1xuaW1wb3J0IHsgVmVyc2lvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy92ZXJzaW9uL2NsaSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciwgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncywgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBqc29uSGVscFVzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1oZWxwJztcblxuY29uc3QgQ09NTUFORFMgPSBbXG4gIFZlcnNpb25Db21tYW5kTW9kdWxlLFxuICBEb2NDb21tYW5kTW9kdWxlLFxuICBBd2Vzb21lQ29tbWFuZE1vZHVsZSxcbiAgQ29uZmlnQ29tbWFuZE1vZHVsZSxcbiAgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSxcbiAgQWRkQ29tbWFuZE1vZHVsZSxcbiAgR2VuZXJhdGVDb21tYW5kTW9kdWxlLFxuICBCdWlsZENvbW1hbmRNb2R1bGUsXG4gIEUyZUNvbW1hbmRNb2R1bGUsXG4gIFRlc3RDb21tYW5kTW9kdWxlLFxuICBTZXJ2ZUNvbW1hbmRNb2R1bGUsXG4gIEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSxcbiAgRGVwbG95Q29tbWFuZE1vZHVsZSxcbiAgTGludENvbW1hbmRNb2R1bGUsXG4gIE5ld0NvbW1hbmRNb2R1bGUsXG4gIFVwZGF0ZUNvbW1hbmRNb2R1bGUsXG4gIFJ1bkNvbW1hbmRNb2R1bGUsXG5dLnNvcnQoKTsgLy8gV2lsbCBiZSBzb3J0ZWQgYnkgY2xhc3MgbmFtZS5cblxuY29uc3QgeWFyZ3NQYXJzZXIgPSBQYXJzZXIgYXMgdW5rbm93biBhcyB0eXBlb2YgUGFyc2VyLmRlZmF1bHQ7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qge1xuICAgICQwLFxuICAgIF86IHBvc2l0aW9uYWwsXG4gICAgaGVscCA9IGZhbHNlLFxuICAgIGpzb25IZWxwID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywgeyBib29sZWFuOiBbJ2hlbHAnLCAnanNvbi1oZWxwJ10sIGFsaWFzOiB7ICdjb2xsZWN0aW9uJzogJ2MnIH0gfSk7XG5cbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgd29ya3NwYWNlLFxuICAgIGxvZ2dlcixcbiAgICBjdXJyZW50RGlyZWN0b3J5OiBwcm9jZXNzLmN3ZCgpLFxuICAgIHJvb3Q6IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKSxcbiAgICBhcmdzOiB7XG4gICAgICBwb3NpdGlvbmFsOiBwb3NpdGlvbmFsLm1hcCgodikgPT4gdi50b1N0cmluZygpKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgaGVscCxcbiAgICAgICAganNvbkhlbHAsXG4gICAgICAgIC4uLnJlc3QsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgbGV0IGxvY2FsWWFyZ3MgPSB5YXJncyhhcmdzKTtcbiAgZm9yIChjb25zdCBDb21tYW5kTW9kdWxlIG9mIENPTU1BTkRTKSB7XG4gICAgaWYgKCFqc29uSGVscCkge1xuICAgICAgLy8gU2tpcCBzY29wZSB2YWxpZGF0aW9uIHdoZW4gcnVubmluZyB3aXRoICctLWpzb24taGVscCcgc2luY2UgaXQncyBlYXNpZXIgdG8gZ2VuZXJhdGUgdGhlIG91dHB1dCBmb3IgYWxsIGNvbW1hbmRzIHRoaXMgd2F5LlxuICAgICAgY29uc3Qgc2NvcGUgPSBDb21tYW5kTW9kdWxlLnNjb3BlO1xuICAgICAgaWYgKChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLkluICYmICF3b3Jrc3BhY2UpIHx8IChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLk91dCAmJiB3b3Jrc3BhY2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxvY2FsWWFyZ3MgPSBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21tYW5kTW9kdWxlLCBjb250ZXh0KTtcbiAgfVxuXG4gIGlmIChqc29uSGVscCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKGxvY2FsWWFyZ3MgYXMgYW55KS5nZXRJbnRlcm5hbE1ldGhvZHMoKS5nZXRVc2FnZUluc3RhbmNlKCkuaGVscCA9ICgpID0+IGpzb25IZWxwVXNhZ2UoKTtcbiAgfVxuXG4gIGF3YWl0IGxvY2FsWWFyZ3NcbiAgICAuc2NyaXB0TmFtZSgnbmcnKVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vZG9jcy9hZHZhbmNlZC5tZCNjdXN0b21pemluZy15YXJncy1wYXJzZXJcbiAgICAucGFyc2VyQ29uZmlndXJhdGlvbih7XG4gICAgICAncG9wdWxhdGUtLSc6IHRydWUsXG4gICAgICAndW5rbm93bi1vcHRpb25zLWFzLWFyZ3MnOiBmYWxzZSxcbiAgICAgICdkb3Qtbm90YXRpb24nOiBmYWxzZSxcbiAgICAgICdib29sZWFuLW5lZ2F0aW9uJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1hbGlhc2VkJzogdHJ1ZSxcbiAgICAgICdzdHJpcC1kYXNoZWQnOiB0cnVlLFxuICAgICAgJ2NhbWVsLWNhc2UtZXhwYW5zaW9uJzogZmFsc2UsXG4gICAgfSlcbiAgICAub3B0aW9uKCdqc29uLWhlbHAnLCB7XG4gICAgICBkZXNjcmliZTogJ1Nob3cgaGVscCBpbiBKU09OIGZvcm1hdC4nLFxuICAgICAgaW1wbGllczogWydoZWxwJ10sXG4gICAgICBoaWRkZW46IHRydWUsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgfSlcbiAgICAuaGVscCgnaGVscCcsICdTaG93cyBhIGhlbHAgbWVzc2FnZSBmb3IgdGhpcyBjb21tYW5kIGluIHRoZSBjb25zb2xlLicpXG4gICAgLy8gQSBjb21wbGV0ZSBsaXN0IG9mIHN0cmluZ3MgY2FuIGJlIGZvdW5kOiBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2xvY2FsZXMvZW4uanNvblxuICAgIC51cGRhdGVTdHJpbmdzKHtcbiAgICAgICdDb21tYW5kczonOiBjb2xvcnMuY3lhbignQ29tbWFuZHM6JyksXG4gICAgICAnT3B0aW9uczonOiBjb2xvcnMuY3lhbignT3B0aW9uczonKSxcbiAgICAgICdQb3NpdGlvbmFsczonOiBjb2xvcnMuY3lhbignQXJndW1lbnRzOicpLFxuICAgICAgJ2RlcHJlY2F0ZWQnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkJyksXG4gICAgICAnZGVwcmVjYXRlZDogJXMnOiBjb2xvcnMueWVsbG93KCdkZXByZWNhdGVkOicpICsgJyAlcycsXG4gICAgICAnRGlkIHlvdSBtZWFuICVzPyc6ICdVbmtub3duIGNvbW1hbmQuIERpZCB5b3UgbWVhbiAlcz8nLFxuICAgIH0pXG4gICAgLmRlbWFuZENvbW1hbmQoMSwgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlKVxuICAgIC5yZWNvbW1lbmRDb21tYW5kcygpXG4gICAgLnZlcnNpb24oZmFsc2UpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5zdHJpY3QoKVxuICAgIC5mYWlsKChtc2csIGVycikgPT4ge1xuICAgICAgdGhyb3cgbXNnXG4gICAgICAgID8gLy8gVmFsaWRhdGlvbiBmYWlsZWQgZXhhbXBsZTogYFVua25vd24gYXJndW1lbnQ6YFxuICAgICAgICAgIG5ldyBDb21tYW5kTW9kdWxlRXJyb3IobXNnKVxuICAgICAgICA6IC8vIFVua25vd24gZXhjZXB0aW9uLCByZS10aHJvdy5cbiAgICAgICAgICBlcnI7XG4gICAgfSlcbiAgICAud3JhcCh5YXJncy50ZXJtaW5hbFdpZHRoKCkpXG4gICAgLnBhcnNlQXN5bmMoKTtcblxuICByZXR1cm4gcHJvY2Vzcy5leGl0Q29kZSA/PyAwO1xufVxuIl19