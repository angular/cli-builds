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
];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsZ0RBQTZEO0FBQzdELGdEQUE2RDtBQUM3RCw2Q0FBdUQ7QUFDdkQsNkNBQXVEO0FBQ3ZELHNEQUF3RTtBQUN4RSxrREFBaUU7QUFDakUsK0NBQXlEO0FBQ3pELDREQUF5RTtBQUN6RSw4Q0FBdUQ7QUFDdkQsOENBQXVEO0FBQ3ZELGdEQUEyRDtBQUMzRCwrQ0FBeUQ7QUFDekQsaURBQTZEO0FBQzdELGtEQUErRDtBQUMvRCw4Q0FBNEM7QUFFNUMscURBQW9GO0FBQ3BGLHFEQUFzRDtBQUV0RCxNQUFNLFFBQVEsR0FBRztJQUNmLDJCQUFvQjtJQUNwQixzQkFBZ0I7SUFDaEIsMkJBQW9CO0lBQ3BCLHlCQUFtQjtJQUNuQiw0QkFBc0I7SUFDdEIsc0JBQWdCO0lBQ2hCLDJCQUFxQjtJQUNyQix3QkFBa0I7SUFDbEIsc0JBQWdCO0lBQ2hCLHdCQUFpQjtJQUNqQix5QkFBa0I7SUFDbEIsOEJBQXdCO0lBQ3hCLHlCQUFtQjtJQUNuQix3QkFBaUI7SUFDakIsdUJBQWdCO0lBQ2hCLDBCQUFtQjtJQUNuQix1QkFBZ0I7Q0FDakIsQ0FBQztBQUVGLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FBRXhELEtBQUssVUFBVSxVQUFVLENBQzlCLElBQWMsRUFDZCxNQUFzQixFQUN0QixTQUF1Qzs7SUFFdkMsTUFBTSxFQUNKLEVBQUUsRUFDRixDQUFDLEVBQUUsVUFBVSxFQUNiLElBQUksR0FBRyxLQUFLLEVBQ1osUUFBUSxHQUFHLEtBQUssRUFDaEIsR0FBRyxJQUFJLEVBQ1IsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFeEYsTUFBTSxPQUFPLEdBQW1CO1FBQzlCLFNBQVM7UUFDVCxNQUFNO1FBQ04sZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUMvQixJQUFJLEVBQUUsTUFBQSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsUUFBUSxtQ0FBSSxPQUFPLENBQUMsR0FBRyxFQUFFO1FBQzFDLElBQUksRUFBRTtZQUNKLFVBQVUsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0MsT0FBTyxFQUFFO2dCQUNQLElBQUk7Z0JBQ0osR0FBRyxJQUFJO2FBQ1I7U0FDRjtLQUNGLENBQUM7SUFFRixJQUFJLFVBQVUsR0FBRyxJQUFBLGVBQUssRUFBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLE1BQU0sYUFBYSxJQUFJLFFBQVEsRUFBRTtRQUNwQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2IsNEhBQTRIO1lBQzVILE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUM7WUFDbEMsSUFBSSxDQUFDLEtBQUssS0FBSyw2QkFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLDZCQUFZLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRixTQUFTO2FBQ1Y7U0FDRjtRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQztRQUVoRixVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUM5QixPQUFPLEVBQUUsYUFBYSxDQUFDLE9BQU87WUFDOUIsT0FBTyxFQUFFLFNBQVMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDdkUsUUFBUTtZQUNOLDhGQUE4RjtZQUM5Riw0SEFBNEg7WUFDNUgsUUFBUSxLQUFLLFNBQVMsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRO2dCQUNwRCxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7Z0JBQzFCLENBQUMsQ0FBQyxRQUFRO1lBQ2QsVUFBVSxFQUFFLFlBQVksSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDaEYsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBZTtZQUM1RCw4REFBOEQ7WUFDOUQsT0FBTyxFQUFFLENBQUMsSUFBUyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNwRCxDQUFDLENBQUM7S0FDSjtJQUVELElBQUksUUFBUSxFQUFFO1FBQ1osOERBQThEO1FBQzdELFVBQWtCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFBLHlCQUFhLEdBQUUsQ0FBQztLQUMxRjtJQUVELE1BQU0sVUFBVTtTQUNiLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDakIscUZBQXFGO1NBQ3BGLG1CQUFtQixDQUFDO1FBQ25CLFlBQVksRUFBRSxJQUFJO1FBQ2xCLHlCQUF5QixFQUFFLEtBQUs7UUFDaEMsY0FBYyxFQUFFLEtBQUs7UUFDckIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixlQUFlLEVBQUUsSUFBSTtRQUNyQixjQUFjLEVBQUUsSUFBSTtRQUNwQixzQkFBc0IsRUFBRSxLQUFLO0tBQzlCLENBQUM7U0FDRCxNQUFNLENBQUMsV0FBVyxFQUFFO1FBQ25CLFFBQVEsRUFBRSwyQkFBMkI7UUFDckMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2pCLE1BQU0sRUFBRSxJQUFJO1FBQ1osSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQztTQUNELElBQUksQ0FBQyxNQUFNLEVBQUUsdURBQXVELENBQUM7UUFDdEUsb0dBQW9HO1NBQ25HLGFBQWEsQ0FBQztRQUNiLFdBQVcsRUFBRSxjQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxVQUFVLEVBQUUsY0FBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDbkMsY0FBYyxFQUFFLGNBQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQ3pDLFlBQVksRUFBRSxjQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUN6QyxnQkFBZ0IsRUFBRSxjQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEtBQUs7UUFDdEQsa0JBQWtCLEVBQUUsbUNBQW1DO0tBQ3hELENBQUM7U0FDRCxhQUFhLEVBQUU7U0FDZixpQkFBaUIsRUFBRTtTQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ2QsY0FBYyxDQUFDLEtBQUssQ0FBQztTQUNyQixNQUFNLEVBQUU7U0FDUixJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakIsTUFBTSxHQUFHO1lBQ1AsQ0FBQyxDQUFDLGlEQUFpRDtnQkFDakQsSUFBSSxtQ0FBa0IsQ0FBQyxHQUFHLENBQUM7WUFDN0IsQ0FBQyxDQUFDLCtCQUErQjtnQkFDL0IsR0FBRyxDQUFDO0lBQ1YsQ0FBQyxDQUFDO1NBQ0QsSUFBSSxDQUFDLGVBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUMzQixVQUFVLEVBQUUsQ0FBQztJQUVoQixPQUFPLE1BQUEsT0FBTyxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUF6R0QsZ0NBeUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgUGFyc2VyIH0gZnJvbSAneWFyZ3MvaGVscGVycyc7XG5pbXBvcnQgeyBBZGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYWRkL2NsaSc7XG5pbXBvcnQgeyBBbmFseXRpY3NDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYW5hbHl0aWNzL2NsaSc7XG5pbXBvcnQgeyBCdWlsZENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9idWlsZC9jbGknO1xuaW1wb3J0IHsgQ29uZmlnQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2NvbmZpZy9jbGknO1xuaW1wb3J0IHsgRGVwbG95Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RlcGxveS9jbGknO1xuaW1wb3J0IHsgRG9jQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2RvYy9jbGknO1xuaW1wb3J0IHsgRTJlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2UyZS9jbGknO1xuaW1wb3J0IHsgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZXh0cmFjdC1pMThuL2NsaSc7XG5pbXBvcnQgeyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9nZW5lcmF0ZS9jbGknO1xuaW1wb3J0IHsgTGludENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9saW50L2NsaSc7XG5pbXBvcnQgeyBBd2Vzb21lQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL21ha2UtdGhpcy1hd2Vzb21lL2NsaSc7XG5pbXBvcnQgeyBOZXdDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbmV3L2NsaSc7XG5pbXBvcnQgeyBSdW5Db21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvcnVuL2NsaSc7XG5pbXBvcnQgeyBTZXJ2ZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9zZXJ2ZS9jbGknO1xuaW1wb3J0IHsgVGVzdENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy90ZXN0L2NsaSc7XG5pbXBvcnQgeyBVcGRhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdXBkYXRlL2NsaSc7XG5pbXBvcnQgeyBWZXJzaW9uQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3ZlcnNpb24vY2xpJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBBbmd1bGFyV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBDb21tYW5kQ29udGV4dCwgQ29tbWFuZE1vZHVsZUVycm9yLCBDb21tYW5kU2NvcGUgfSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGpzb25IZWxwVXNhZ2UgfSBmcm9tICcuL3V0aWxpdGllcy9qc29uLWhlbHAnO1xuXG5jb25zdCBDT01NQU5EUyA9IFtcbiAgVmVyc2lvbkNvbW1hbmRNb2R1bGUsXG4gIERvY0NvbW1hbmRNb2R1bGUsXG4gIEF3ZXNvbWVDb21tYW5kTW9kdWxlLFxuICBDb25maWdDb21tYW5kTW9kdWxlLFxuICBBbmFseXRpY3NDb21tYW5kTW9kdWxlLFxuICBBZGRDb21tYW5kTW9kdWxlLFxuICBHZW5lcmF0ZUNvbW1hbmRNb2R1bGUsXG4gIEJ1aWxkQ29tbWFuZE1vZHVsZSxcbiAgRTJlQ29tbWFuZE1vZHVsZSxcbiAgVGVzdENvbW1hbmRNb2R1bGUsXG4gIFNlcnZlQ29tbWFuZE1vZHVsZSxcbiAgRXh0cmFjdEkxOG5Db21tYW5kTW9kdWxlLFxuICBEZXBsb3lDb21tYW5kTW9kdWxlLFxuICBMaW50Q29tbWFuZE1vZHVsZSxcbiAgTmV3Q29tbWFuZE1vZHVsZSxcbiAgVXBkYXRlQ29tbWFuZE1vZHVsZSxcbiAgUnVuQ29tbWFuZE1vZHVsZSxcbl07XG5cbmNvbnN0IHlhcmdzUGFyc2VyID0gUGFyc2VyIGFzIHVua25vd24gYXMgdHlwZW9mIFBhcnNlci5kZWZhdWx0O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgYXJnczogc3RyaW5nW10sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZCxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHtcbiAgICAkMCxcbiAgICBfOiBwb3NpdGlvbmFsLFxuICAgIGhlbHAgPSBmYWxzZSxcbiAgICBqc29uSGVscCA9IGZhbHNlLFxuICAgIC4uLnJlc3RcbiAgfSA9IHlhcmdzUGFyc2VyKGFyZ3MsIHsgYm9vbGVhbjogWydoZWxwJywgJ2pzb24taGVscCddLCBhbGlhczogeyAnY29sbGVjdGlvbic6ICdjJyB9IH0pO1xuXG4gIGNvbnN0IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0ID0ge1xuICAgIHdvcmtzcGFjZSxcbiAgICBsb2dnZXIsXG4gICAgY3VycmVudERpcmVjdG9yeTogcHJvY2Vzcy5jd2QoKSxcbiAgICByb290OiB3b3Jrc3BhY2U/LmJhc2VQYXRoID8/IHByb2Nlc3MuY3dkKCksXG4gICAgYXJnczoge1xuICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbC5tYXAoKHYpID0+IHYudG9TdHJpbmcoKSksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGhlbHAsXG4gICAgICAgIC4uLnJlc3QsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgbGV0IGxvY2FsWWFyZ3MgPSB5YXJncyhhcmdzKTtcbiAgZm9yIChjb25zdCBDb21tYW5kTW9kdWxlIG9mIENPTU1BTkRTKSB7XG4gICAgaWYgKCFqc29uSGVscCkge1xuICAgICAgLy8gU2tpcCBzY29wZSB2YWxpZGF0aW9uIHdoZW4gcnVubmluZyB3aXRoICctLWpzb24taGVscCcgc2luY2UgaXQncyBlYXNpZXIgdG8gZ2VuZXJhdGUgdGhlIG91dHB1dCBmb3IgYWxsIGNvbW1hbmRzIHRoaXMgd2F5LlxuICAgICAgY29uc3Qgc2NvcGUgPSBDb21tYW5kTW9kdWxlLnNjb3BlO1xuICAgICAgaWYgKChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLkluICYmICF3b3Jrc3BhY2UpIHx8IChzY29wZSA9PT0gQ29tbWFuZFNjb3BlLk91dCAmJiB3b3Jrc3BhY2UpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbW1hbmRNb2R1bGUgPSBuZXcgQ29tbWFuZE1vZHVsZShjb250ZXh0KTtcbiAgICBjb25zdCBkZXNjcmliZSA9IGpzb25IZWxwID8gY29tbWFuZE1vZHVsZS5mdWxsRGVzY3JpYmUgOiBjb21tYW5kTW9kdWxlLmRlc2NyaWJlO1xuXG4gICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MuY29tbWFuZCh7XG4gICAgICBjb21tYW5kOiBjb21tYW5kTW9kdWxlLmNvbW1hbmQsXG4gICAgICBhbGlhc2VzOiAnYWxpYXNlcycgaW4gY29tbWFuZE1vZHVsZSA/IGNvbW1hbmRNb2R1bGUuYWxpYXNlcyA6IHVuZGVmaW5lZCxcbiAgICAgIGRlc2NyaWJlOlxuICAgICAgICAvLyBXZSBjYW5ub3QgYWRkIGN1c3RvbSBmaWVsZHMgaW4gaGVscCwgc3VjaCBhcyBsb25nIGNvbW1hbmQgZGVzY3JpcHRpb24gd2hpY2ggaXMgdXNlZCBpbiBBSU8uXG4gICAgICAgIC8vIFRoZXJlZm9yZSwgd2UgZ2V0IGFyb3VuZCB0aGlzIGJ5IGFkZGluZyBhIGNvbXBsZXggb2JqZWN0IGFzIGEgc3RyaW5nIHdoaWNoIHdlIGxhdGVyIHBhcnNlIHdoZW4gZ2VuZXJhdGluZyB0aGUgaGVscCBmaWxlcy5cbiAgICAgICAgZGVzY3JpYmUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZGVzY3JpYmUgPT09ICdvYmplY3QnXG4gICAgICAgICAgPyBKU09OLnN0cmluZ2lmeShkZXNjcmliZSlcbiAgICAgICAgICA6IGRlc2NyaWJlLFxuICAgICAgZGVwcmVjYXRlZDogJ2RlcHJlY2F0ZWQnIGluIGNvbW1hbmRNb2R1bGUgPyBjb21tYW5kTW9kdWxlLmRlcHJlY2F0ZWQgOiB1bmRlZmluZWQsXG4gICAgICBidWlsZGVyOiAoYXJndikgPT4gY29tbWFuZE1vZHVsZS5idWlsZGVyKGFyZ3YpIGFzIHlhcmdzLkFyZ3YsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgaGFuZGxlcjogKGFyZ3M6IGFueSkgPT4gY29tbWFuZE1vZHVsZS5oYW5kbGVyKGFyZ3MpLFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKGpzb25IZWxwKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAobG9jYWxZYXJncyBhcyBhbnkpLmdldEludGVybmFsTWV0aG9kcygpLmdldFVzYWdlSW5zdGFuY2UoKS5oZWxwID0gKCkgPT4ganNvbkhlbHBVc2FnZSgpO1xuICB9XG5cbiAgYXdhaXQgbG9jYWxZYXJnc1xuICAgIC5zY3JpcHROYW1lKCduZycpXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9kb2NzL2FkdmFuY2VkLm1kI2N1c3RvbWl6aW5nLXlhcmdzLXBhcnNlclxuICAgIC5wYXJzZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICdwb3B1bGF0ZS0tJzogdHJ1ZSxcbiAgICAgICd1bmtub3duLW9wdGlvbnMtYXMtYXJncyc6IGZhbHNlLFxuICAgICAgJ2RvdC1ub3RhdGlvbic6IGZhbHNlLFxuICAgICAgJ2Jvb2xlYW4tbmVnYXRpb24nOiB0cnVlLFxuICAgICAgJ3N0cmlwLWFsaWFzZWQnOiB0cnVlLFxuICAgICAgJ3N0cmlwLWRhc2hlZCc6IHRydWUsXG4gICAgICAnY2FtZWwtY2FzZS1leHBhbnNpb24nOiBmYWxzZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2pzb24taGVscCcsIHtcbiAgICAgIGRlc2NyaWJlOiAnU2hvdyBoZWxwIGluIEpTT04gZm9ybWF0LicsXG4gICAgICBpbXBsaWVzOiBbJ2hlbHAnXSxcbiAgICAgIGhpZGRlbjogdHJ1ZSxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICB9KVxuICAgIC5oZWxwKCdoZWxwJywgJ1Nob3dzIGEgaGVscCBtZXNzYWdlIGZvciB0aGlzIGNvbW1hbmQgaW4gdGhlIGNvbnNvbGUuJylcbiAgICAvLyBBIGNvbXBsZXRlIGxpc3Qgb2Ygc3RyaW5ncyBjYW4gYmUgZm91bmQ6IGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iL21haW4vbG9jYWxlcy9lbi5qc29uXG4gICAgLnVwZGF0ZVN0cmluZ3Moe1xuICAgICAgJ0NvbW1hbmRzOic6IGNvbG9ycy5jeWFuKCdDb21tYW5kczonKSxcbiAgICAgICdPcHRpb25zOic6IGNvbG9ycy5jeWFuKCdPcHRpb25zOicpLFxuICAgICAgJ1Bvc2l0aW9uYWxzOic6IGNvbG9ycy5jeWFuKCdBcmd1bWVudHM6JyksXG4gICAgICAnZGVwcmVjYXRlZCc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQnKSxcbiAgICAgICdkZXByZWNhdGVkOiAlcyc6IGNvbG9ycy55ZWxsb3coJ2RlcHJlY2F0ZWQ6JykgKyAnICVzJyxcbiAgICAgICdEaWQgeW91IG1lYW4gJXM/JzogJ1Vua25vd24gY29tbWFuZC4gRGlkIHlvdSBtZWFuICVzPycsXG4gICAgfSlcbiAgICAuZGVtYW5kQ29tbWFuZCgpXG4gICAgLnJlY29tbWVuZENvbW1hbmRzKClcbiAgICAudmVyc2lvbihmYWxzZSlcbiAgICAuc2hvd0hlbHBPbkZhaWwoZmFsc2UpXG4gICAgLnN0cmljdCgpXG4gICAgLmZhaWwoKG1zZywgZXJyKSA9PiB7XG4gICAgICB0aHJvdyBtc2dcbiAgICAgICAgPyAvLyBWYWxpZGF0aW9uIGZhaWxlZCBleGFtcGxlOiBgVW5rbm93biBhcmd1bWVudDpgXG4gICAgICAgICAgbmV3IENvbW1hbmRNb2R1bGVFcnJvcihtc2cpXG4gICAgICAgIDogLy8gVW5rbm93biBleGNlcHRpb24sIHJlLXRocm93LlxuICAgICAgICAgIGVycjtcbiAgICB9KVxuICAgIC53cmFwKHlhcmdzLnRlcm1pbmFsV2lkdGgoKSlcbiAgICAucGFyc2VBc3luYygpO1xuXG4gIHJldHVybiBwcm9jZXNzLmV4aXRDb2RlID8/IDA7XG59XG4iXX0=