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
        const commandModule = new CommandModule(context);
        const describe = jsonHelp ? commandModule.fullDescribe : commandModule.describe;
        localYargs = localYargs.command({
            command: commandModule.command,
            aliases: 'aliases' in commandModule ? commandModule.aliases : undefined,
            describe: 
            // We cannot add custom fields in help, such as long command description which is used in AIO.
            // Therefore, we get around this by adding a complex object as a string which we later parse when generating the help files.
            describe !== undefined && typeof describe === 'object'
                ? JSON.stringify(describe)
                : describe,
            deprecated: 'deprecated' in commandModule ? commandModule.deprecated : undefined,
            builder: (argv) => commandModule.builder(argv),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handler: (args) => commandModule.handler(args),
        });
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
        .demandCommand()
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsZ0RBQTZEO0FBQzdELGdEQUE2RDtBQUM3RCw2Q0FBdUQ7QUFDdkQsNkNBQXVEO0FBQ3ZELHNEQUF3RTtBQUN4RSxrREFBaUU7QUFDakUsK0NBQXlEO0FBQ3pELDREQUF5RTtBQUN6RSw4Q0FBdUQ7QUFDdkQsOENBQXVEO0FBQ3ZELGdEQUEyRDtBQUMzRCwrQ0FBeUQ7QUFDekQsaURBQTZEO0FBQzdELGtEQUErRDtBQUMvRCw4Q0FBNEM7QUFFNUMscURBQW9GO0FBQ3BGLHFEQUFzRDtBQUV0RCxNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDJCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsOEJBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7Q0FDakIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdDQUFnQztBQUUxQyxNQUFNLFdBQVcsR0FBRyxnQkFBMEMsQ0FBQztBQUV4RCxLQUFLLFVBQVUsVUFBVSxDQUM5QixJQUFjLEVBQ2QsTUFBc0IsRUFDdEIsU0FBdUM7O0lBRXZDLE1BQU0sRUFDSixFQUFFLEVBQ0YsQ0FBQyxFQUFFLFVBQVUsRUFDYixJQUFJ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QyxRQUFRLG1DQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBekdELGdDQXlHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgQWRkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FkZC9jbGknO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FuYWx5dGljcy9jbGknO1xuaW1wb3J0IHsgQnVpbGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYnVpbGQvY2xpJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb25maWcvY2xpJztcbmltcG9ydCB7IERlcGxveUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kZXBsb3kvY2xpJztcbmltcG9ydCB7IERvY0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kb2MvY2xpJztcbmltcG9ydCB7IEUyZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9lMmUvY2xpJztcbmltcG9ydCB7IEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi9jbGknO1xuaW1wb3J0IHsgR2VuZXJhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZ2VuZXJhdGUvY2xpJztcbmltcG9ydCB7IExpbnRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbGludC9jbGknO1xuaW1wb3J0IHsgQXdlc29tZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9tYWtlLXRoaXMtYXdlc29tZS9jbGknO1xuaW1wb3J0IHsgTmV3Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL25ldy9jbGknO1xuaW1wb3J0IHsgUnVuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3J1bi9jbGknO1xuaW1wb3J0IHsgU2VydmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvc2VydmUvY2xpJztcbmltcG9ydCB7IFRlc3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdGVzdC9jbGknO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3VwZGF0ZS9jbGknO1xuaW1wb3J0IHsgVmVyc2lvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy92ZXJzaW9uL2NsaSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgQ29tbWFuZENvbnRleHQsIENvbW1hbmRNb2R1bGVFcnJvciwgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBqc29uSGVscFVzYWdlIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1oZWxwJztcblxuY29uc3QgQ09NTUFORFMgPSBbXG4gIFZlcnNpb25Db21tYW5kTW9kdWxlLFxuICBEb2NDb21tYW5kTW9kdWxlLFxuICBBd2Vzb21lQ29tbWFuZE1vZHVsZSxcbiAgQ29uZmlnQ29tbWFuZE1vZHVsZSxcbiAgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSxcbiAgQWRkQ29tbWFuZE1vZHVsZSxcbiAgR2VuZXJhdGVDb21tYW5kTW9kdWxlLFxuICBCdWlsZENvbW1hbmRNb2R1bGUsXG4gIEUyZUNvbW1hbmRNb2R1bGUsXG4gIFRlc3RDb21tYW5kTW9kdWxlLFxuICBTZXJ2ZUNvbW1hbmRNb2R1bGUsXG4gIEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSxcbiAgRGVwbG95Q29tbWFuZE1vZHVsZSxcbiAgTGludENvbW1hbmRNb2R1bGUsXG4gIE5ld0NvbW1hbmRNb2R1bGUsXG4gIFVwZGF0ZUNvbW1hbmRNb2R1bGUsXG4gIFJ1bkNvbW1hbmRNb2R1bGUsXG5dLnNvcnQoKTsgLy8gV2lsbCBiZSBzb3J0ZWQgYnkgY2xhc3MgbmFtZS5cblxuY29uc3QgeWFyZ3NQYXJzZXIgPSBQYXJzZXIgYXMgdW5rbm93biBhcyB0eXBlb2YgUGFyc2VyLmRlZmF1bHQ7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qge1xuICAgICQwLFxuICAgIF86IHBvc2l0aW9uYWwsXG4gICAgaGVscCA9IGZhbHNlLFxuICAgIGpzb25IZWxwID0gZmFsc2UsXG4gICAgLi4ucmVzdFxuICB9ID0geWFyZ3NQYXJzZXIoYXJncywgeyBib29sZWFuOiBbJ2hlbHAnLCAnanNvbi1oZWxwJ10sIGFsaWFzOiB7ICdjb2xsZWN0aW9uJzogJ2MnIH0gfSk7XG5cbiAgY29uc3QgY29udGV4dDogQ29tbWFuZENvbnRleHQgPSB7XG4gICAgd29ya3NwYWNlLFxuICAgIGxvZ2dlcixcbiAgICBjdXJyZW50RGlyZWN0b3J5OiBwcm9jZXNzLmN3ZCgpLFxuICAgIHJvb3Q6IHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKSxcbiAgICBhcmdzOiB7XG4gICAgICBwb3NpdGlvbmFsOiBwb3NpdGlvbmFsLm1hcCgodikgPT4gdi50b1N0cmluZygpKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgaGVscCxcbiAgICAgICAgLi4ucmVzdCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBsZXQgbG9jYWxZYXJncyA9IHlhcmdzKGFyZ3MpO1xuICBmb3IgKGNvbnN0IENvbW1hbmRNb2R1bGUgb2YgQ09NTUFORFMpIHtcbiAgICBpZiAoIWpzb25IZWxwKSB7XG4gICAgICAvLyBTa2lwIHNjb3BlIHZhbGlkYXRpb24gd2hlbiBydW5uaW5nIHdpdGggJy0tanNvbi1oZWxwJyBzaW5jZSBpdCdzIGVhc2llciB0byBnZW5lcmF0ZSB0aGUgb3V0cHV0IGZvciBhbGwgY29tbWFuZHMgdGhpcyB3YXkuXG4gICAgICBjb25zdCBzY29wZSA9IENvbW1hbmRNb2R1bGUuc2NvcGU7XG4gICAgICBpZiAoKHNjb3BlID09PSBDb21tYW5kU2NvcGUuSW4gJiYgIXdvcmtzcGFjZSkgfHwgKHNjb3BlID09PSBDb21tYW5kU2NvcGUuT3V0ICYmIHdvcmtzcGFjZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29tbWFuZE1vZHVsZSA9IG5ldyBDb21tYW5kTW9kdWxlKGNvbnRleHQpO1xuICAgIGNvbnN0IGRlc2NyaWJlID0ganNvbkhlbHAgPyBjb21tYW5kTW9kdWxlLmZ1bGxEZXNjcmliZSA6IGNvbW1hbmRNb2R1bGUuZGVzY3JpYmU7XG5cbiAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6IGNvbW1hbmRNb2R1bGUuY29tbWFuZCxcbiAgICAgIGFsaWFzZXM6ICdhbGlhc2VzJyBpbiBjb21tYW5kTW9kdWxlID8gY29tbWFuZE1vZHVsZS5hbGlhc2VzIDogdW5kZWZpbmVkLFxuICAgICAgZGVzY3JpYmU6XG4gICAgICAgIC8vIFdlIGNhbm5vdCBhZGQgY3VzdG9tIGZpZWxkcyBpbiBoZWxwLCBzdWNoIGFzIGxvbmcgY29tbWFuZCBkZXNjcmlwdGlvbiB3aGljaCBpcyB1c2VkIGluIEFJTy5cbiAgICAgICAgLy8gVGhlcmVmb3JlLCB3ZSBnZXQgYXJvdW5kIHRoaXMgYnkgYWRkaW5nIGEgY29tcGxleCBvYmplY3QgYXMgYSBzdHJpbmcgd2hpY2ggd2UgbGF0ZXIgcGFyc2Ugd2hlbiBnZW5lcmF0aW5nIHRoZSBoZWxwIGZpbGVzLlxuICAgICAgICBkZXNjcmliZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBkZXNjcmliZSA9PT0gJ29iamVjdCdcbiAgICAgICAgICA/IEpTT04uc3RyaW5naWZ5KGRlc2NyaWJlKVxuICAgICAgICAgIDogZGVzY3JpYmUsXG4gICAgICBkZXByZWNhdGVkOiAnZGVwcmVjYXRlZCcgaW4gY29tbWFuZE1vZHVsZSA/IGNvbW1hbmRNb2R1bGUuZGVwcmVjYXRlZCA6IHVuZGVmaW5lZCxcbiAgICAgIGJ1aWxkZXI6IChhcmd2KSA9PiBjb21tYW5kTW9kdWxlLmJ1aWxkZXIoYXJndikgYXMgeWFyZ3MuQXJndixcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICBoYW5kbGVyOiAoYXJnczogYW55KSA9PiBjb21tYW5kTW9kdWxlLmhhbmRsZXIoYXJncyksXG4gICAgfSk7XG4gIH1cblxuICBpZiAoanNvbkhlbHApIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChsb2NhbFlhcmdzIGFzIGFueSkuZ2V0SW50ZXJuYWxNZXRob2RzKCkuZ2V0VXNhZ2VJbnN0YW5jZSgpLmhlbHAgPSAoKSA9PiBqc29uSGVscFVzYWdlKCk7XG4gIH1cblxuICBhd2FpdCBsb2NhbFlhcmdzXG4gICAgLnNjcmlwdE5hbWUoJ25nJylcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2RvY3MvYWR2YW5jZWQubWQjY3VzdG9taXppbmcteWFyZ3MtcGFyc2VyXG4gICAgLnBhcnNlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgJ3BvcHVsYXRlLS0nOiB0cnVlLFxuICAgICAgJ3Vua25vd24tb3B0aW9ucy1hcy1hcmdzJzogZmFsc2UsXG4gICAgICAnZG90LW5vdGF0aW9uJzogZmFsc2UsXG4gICAgICAnYm9vbGVhbi1uZWdhdGlvbic6IHRydWUsXG4gICAgICAnc3RyaXAtYWxpYXNlZCc6IHRydWUsXG4gICAgICAnc3RyaXAtZGFzaGVkJzogdHJ1ZSxcbiAgICAgICdjYW1lbC1jYXNlLWV4cGFuc2lvbic6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbignanNvbi1oZWxwJywge1xuICAgICAgZGVzY3JpYmU6ICdTaG93IGhlbHAgaW4gSlNPTiBmb3JtYXQuJyxcbiAgICAgIGltcGxpZXM6IFsnaGVscCddLFxuICAgICAgaGlkZGVuOiB0cnVlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIH0pXG4gICAgLmhlbHAoJ2hlbHAnLCAnU2hvd3MgYSBoZWxwIG1lc3NhZ2UgZm9yIHRoaXMgY29tbWFuZCBpbiB0aGUgY29uc29sZS4nKVxuICAgIC8vIEEgY29tcGxldGUgbGlzdCBvZiBzdHJpbmdzIGNhbiBiZSBmb3VuZDogaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9sb2NhbGVzL2VuLmpzb25cbiAgICAudXBkYXRlU3RyaW5ncyh7XG4gICAgICAnQ29tbWFuZHM6JzogY29sb3JzLmN5YW4oJ0NvbW1hbmRzOicpLFxuICAgICAgJ09wdGlvbnM6JzogY29sb3JzLmN5YW4oJ09wdGlvbnM6JyksXG4gICAgICAnUG9zaXRpb25hbHM6JzogY29sb3JzLmN5YW4oJ0FyZ3VtZW50czonKSxcbiAgICAgICdkZXByZWNhdGVkJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZCcpLFxuICAgICAgJ2RlcHJlY2F0ZWQ6ICVzJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZDonKSArICcgJXMnLFxuICAgICAgJ0RpZCB5b3UgbWVhbiAlcz8nOiAnVW5rbm93biBjb21tYW5kLiBEaWQgeW91IG1lYW4gJXM/JyxcbiAgICB9KVxuICAgIC5kZW1hbmRDb21tYW5kKClcbiAgICAucmVjb21tZW5kQ29tbWFuZHMoKVxuICAgIC52ZXJzaW9uKGZhbHNlKVxuICAgIC5zaG93SGVscE9uRmFpbChmYWxzZSlcbiAgICAuc3RyaWN0KClcbiAgICAuZmFpbCgobXNnLCBlcnIpID0+IHtcbiAgICAgIHRocm93IG1zZ1xuICAgICAgICA/IC8vIFZhbGlkYXRpb24gZmFpbGVkIGV4YW1wbGU6IGBVbmtub3duIGFyZ3VtZW50OmBcbiAgICAgICAgICBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKG1zZylcbiAgICAgICAgOiAvLyBVbmtub3duIGV4Y2VwdGlvbiwgcmUtdGhyb3cuXG4gICAgICAgICAgZXJyO1xuICAgIH0pXG4gICAgLndyYXAoeWFyZ3MudGVybWluYWxXaWR0aCgpKVxuICAgIC5wYXJzZUFzeW5jKCk7XG5cbiAgcmV0dXJuIHByb2Nlc3MuZXhpdENvZGUgPz8gMDtcbn1cbiJdfQ==