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
const package_manager_1 = require("../utilities/package-manager");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUdILGtEQUEwQjtBQUMxQiwyQ0FBdUM7QUFDdkMsNkNBQXVEO0FBQ3ZELG1EQUFtRTtBQUNuRSwrQ0FBMkQ7QUFDM0QsZ0RBQTZEO0FBQzdELGdEQUE2RDtBQUM3RCw2Q0FBdUQ7QUFDdkQsNkNBQXVEO0FBQ3ZELHNEQUF3RTtBQUN4RSxrREFBaUU7QUFDakUsK0NBQXlEO0FBQ3pELDREQUF5RTtBQUN6RSw4Q0FBdUQ7QUFDdkQsOENBQXVEO0FBQ3ZELGdEQUEyRDtBQUMzRCwrQ0FBeUQ7QUFDekQsaURBQTZEO0FBQzdELGtEQUErRDtBQUMvRCw4Q0FBNEM7QUFFNUMsa0VBQWlFO0FBQ2pFLHFEQUFvRjtBQUNwRixpREFBMkY7QUFDM0YscURBQXNEO0FBRXRELE1BQU0sUUFBUSxHQUFHO0lBQ2YsMkJBQW9CO0lBQ3BCLHNCQUFnQjtJQUNoQiwyQkFBb0I7SUFDcEIseUJBQW1CO0lBQ25CLDRCQUFzQjtJQUN0QixzQkFBZ0I7SUFDaEIsMkJBQXFCO0lBQ3JCLHdCQUFrQjtJQUNsQixzQkFBZ0I7SUFDaEIsd0JBQWlCO0lBQ2pCLHlCQUFrQjtJQUNsQiw4QkFBd0I7SUFDeEIseUJBQW1CO0lBQ25CLHdCQUFpQjtJQUNqQix1QkFBZ0I7SUFDaEIsMEJBQW1CO0lBQ25CLHVCQUFnQjtDQUNqQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLGdCQUEwQyxDQUFDO0FBRXhELEtBQUssVUFBVSxVQUFVLENBQzlCLElBQWMsRUFDZCxNQUFzQixFQUN0QixTQUF1Qzs7SUFFdkMsTUFBTSxFQUNKLEVBQUUsRUFD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QyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsS0FBSztRQUN0RCxrQkFBa0IsRUFBRSxtQ0FBbUM7S0FDeEQsQ0FBQztTQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUscUNBQTJCLENBQUM7U0FDN0MsaUJBQWlCLEVBQUU7U0FDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUNkLGNBQWMsQ0FBQyxLQUFLLENBQUM7U0FDckIsTUFBTSxFQUFFO1NBQ1IsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pCLE1BQU0sR0FBRztZQUNQLENBQUMsQ0FBQyxpREFBaUQ7Z0JBQ2pELElBQUksbUNBQWtCLENBQUMsR0FBRyxDQUFDO1lBQzdCLENBQUMsQ0FBQywrQkFBK0I7Z0JBQy9CLEdBQUcsQ0FBQztJQUNWLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxlQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDM0IsVUFBVSxFQUFFLENBQUM7SUFFaEIsT0FBTyxNQUFBLE9BQU8sQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBM0ZELGdDQTJGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IFBhcnNlciB9IGZyb20gJ3lhcmdzL2hlbHBlcnMnO1xuaW1wb3J0IHsgQWRkQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FkZC9jbGknO1xuaW1wb3J0IHsgQW5hbHl0aWNzQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2FuYWx5dGljcy9jbGknO1xuaW1wb3J0IHsgQnVpbGRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvYnVpbGQvY2xpJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9jb25maWcvY2xpJztcbmltcG9ydCB7IERlcGxveUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kZXBsb3kvY2xpJztcbmltcG9ydCB7IERvY0NvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9kb2MvY2xpJztcbmltcG9ydCB7IEUyZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9lMmUvY2xpJztcbmltcG9ydCB7IEV4dHJhY3RJMThuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL2V4dHJhY3QtaTE4bi9jbGknO1xuaW1wb3J0IHsgR2VuZXJhdGVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvZ2VuZXJhdGUvY2xpJztcbmltcG9ydCB7IExpbnRDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvbGludC9jbGknO1xuaW1wb3J0IHsgQXdlc29tZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy9tYWtlLXRoaXMtYXdlc29tZS9jbGknO1xuaW1wb3J0IHsgTmV3Q29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL25ldy9jbGknO1xuaW1wb3J0IHsgUnVuQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3J1bi9jbGknO1xuaW1wb3J0IHsgU2VydmVDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvc2VydmUvY2xpJztcbmltcG9ydCB7IFRlc3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vY29tbWFuZHMvdGVzdC9jbGknO1xuaW1wb3J0IHsgVXBkYXRlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uL2NvbW1hbmRzL3VwZGF0ZS9jbGknO1xuaW1wb3J0IHsgVmVyc2lvbkNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi9jb21tYW5kcy92ZXJzaW9uL2NsaSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgQW5ndWxhcldvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IENvbW1hbmRDb250ZXh0LCBDb21tYW5kTW9kdWxlRXJyb3IsIENvbW1hbmRTY29wZSB9IGZyb20gJy4vY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsganNvbkhlbHBVc2FnZSB9IGZyb20gJy4vdXRpbGl0aWVzL2pzb24taGVscCc7XG5cbmNvbnN0IENPTU1BTkRTID0gW1xuICBWZXJzaW9uQ29tbWFuZE1vZHVsZSxcbiAgRG9jQ29tbWFuZE1vZHVsZSxcbiAgQXdlc29tZUNvbW1hbmRNb2R1bGUsXG4gIENvbmZpZ0NvbW1hbmRNb2R1bGUsXG4gIEFuYWx5dGljc0NvbW1hbmRNb2R1bGUsXG4gIEFkZENvbW1hbmRNb2R1bGUsXG4gIEdlbmVyYXRlQ29tbWFuZE1vZHVsZSxcbiAgQnVpbGRDb21tYW5kTW9kdWxlLFxuICBFMmVDb21tYW5kTW9kdWxlLFxuICBUZXN0Q29tbWFuZE1vZHVsZSxcbiAgU2VydmVDb21tYW5kTW9kdWxlLFxuICBFeHRyYWN0STE4bkNvbW1hbmRNb2R1bGUsXG4gIERlcGxveUNvbW1hbmRNb2R1bGUsXG4gIExpbnRDb21tYW5kTW9kdWxlLFxuICBOZXdDb21tYW5kTW9kdWxlLFxuICBVcGRhdGVDb21tYW5kTW9kdWxlLFxuICBSdW5Db21tYW5kTW9kdWxlLFxuXS5zb3J0KCk7IC8vIFdpbGwgYmUgc29ydGVkIGJ5IGNsYXNzIG5hbWUuXG5cbmNvbnN0IHlhcmdzUGFyc2VyID0gUGFyc2VyIGFzIHVua25vd24gYXMgdHlwZW9mIFBhcnNlci5kZWZhdWx0O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgYXJnczogc3RyaW5nW10sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZCxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHtcbiAgICAkMCxcbiAgICBfOiBwb3NpdGlvbmFsLFxuICAgIGhlbHAgPSBmYWxzZSxcbiAgICBqc29uSGVscCA9IGZhbHNlLFxuICAgIC4uLnJlc3RcbiAgfSA9IHlhcmdzUGFyc2VyKGFyZ3MsIHsgYm9vbGVhbjogWydoZWxwJywgJ2pzb24taGVscCddLCBhbGlhczogeyAnY29sbGVjdGlvbic6ICdjJyB9IH0pO1xuXG4gIGNvbnN0IGNvbnRleHQ6IENvbW1hbmRDb250ZXh0ID0ge1xuICAgIHdvcmtzcGFjZSxcbiAgICBsb2dnZXIsXG4gICAgY3VycmVudERpcmVjdG9yeTogcHJvY2Vzcy5jd2QoKSxcbiAgICByb290OiB3b3Jrc3BhY2U/LmJhc2VQYXRoID8/IHByb2Nlc3MuY3dkKCksXG4gICAgcGFja2FnZU1hbmFnZXI6IGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZT8uYmFzZVBhdGggPz8gcHJvY2Vzcy5jd2QoKSksXG4gICAgYXJnczoge1xuICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbC5tYXAoKHYpID0+IHYudG9TdHJpbmcoKSksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGhlbHAsXG4gICAgICAgIGpzb25IZWxwLFxuICAgICAgICAuLi5yZXN0LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGxldCBsb2NhbFlhcmdzID0geWFyZ3MoYXJncyk7XG4gIGZvciAoY29uc3QgQ29tbWFuZE1vZHVsZSBvZiBDT01NQU5EUykge1xuICAgIGlmICghanNvbkhlbHApIHtcbiAgICAgIC8vIFNraXAgc2NvcGUgdmFsaWRhdGlvbiB3aGVuIHJ1bm5pbmcgd2l0aCAnLS1qc29uLWhlbHAnIHNpbmNlIGl0J3MgZWFzaWVyIHRvIGdlbmVyYXRlIHRoZSBvdXRwdXQgZm9yIGFsbCBjb21tYW5kcyB0aGlzIHdheS5cbiAgICAgIGNvbnN0IHNjb3BlID0gQ29tbWFuZE1vZHVsZS5zY29wZTtcbiAgICAgIGlmICgoc2NvcGUgPT09IENvbW1hbmRTY29wZS5JbiAmJiAhd29ya3NwYWNlKSB8fCAoc2NvcGUgPT09IENvbW1hbmRTY29wZS5PdXQgJiYgd29ya3NwYWNlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb2NhbFlhcmdzID0gYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MobG9jYWxZYXJncywgQ29tbWFuZE1vZHVsZSwgY29udGV4dCk7XG4gIH1cblxuICBpZiAoanNvbkhlbHApIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChsb2NhbFlhcmdzIGFzIGFueSkuZ2V0SW50ZXJuYWxNZXRob2RzKCkuZ2V0VXNhZ2VJbnN0YW5jZSgpLmhlbHAgPSAoKSA9PiBqc29uSGVscFVzYWdlKCk7XG4gIH1cblxuICBhd2FpdCBsb2NhbFlhcmdzXG4gICAgLnNjcmlwdE5hbWUoJ25nJylcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi9tYWluL2RvY3MvYWR2YW5jZWQubWQjY3VzdG9taXppbmcteWFyZ3MtcGFyc2VyXG4gICAgLnBhcnNlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgJ3BvcHVsYXRlLS0nOiB0cnVlLFxuICAgICAgJ3Vua25vd24tb3B0aW9ucy1hcy1hcmdzJzogZmFsc2UsXG4gICAgICAnZG90LW5vdGF0aW9uJzogZmFsc2UsXG4gICAgICAnYm9vbGVhbi1uZWdhdGlvbic6IHRydWUsXG4gICAgICAnc3RyaXAtYWxpYXNlZCc6IHRydWUsXG4gICAgICAnc3RyaXAtZGFzaGVkJzogdHJ1ZSxcbiAgICAgICdjYW1lbC1jYXNlLWV4cGFuc2lvbic6IGZhbHNlLFxuICAgIH0pXG4gICAgLm9wdGlvbignanNvbi1oZWxwJywge1xuICAgICAgZGVzY3JpYmU6ICdTaG93IGhlbHAgaW4gSlNPTiBmb3JtYXQuJyxcbiAgICAgIGltcGxpZXM6IFsnaGVscCddLFxuICAgICAgaGlkZGVuOiB0cnVlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgIH0pXG4gICAgLmhlbHAoJ2hlbHAnLCAnU2hvd3MgYSBoZWxwIG1lc3NhZ2UgZm9yIHRoaXMgY29tbWFuZCBpbiB0aGUgY29uc29sZS4nKVxuICAgIC8vIEEgY29tcGxldGUgbGlzdCBvZiBzdHJpbmdzIGNhbiBiZSBmb3VuZDogaHR0cHM6Ly9naXRodWIuY29tL3lhcmdzL3lhcmdzL2Jsb2IvbWFpbi9sb2NhbGVzL2VuLmpzb25cbiAgICAudXBkYXRlU3RyaW5ncyh7XG4gICAgICAnQ29tbWFuZHM6JzogY29sb3JzLmN5YW4oJ0NvbW1hbmRzOicpLFxuICAgICAgJ09wdGlvbnM6JzogY29sb3JzLmN5YW4oJ09wdGlvbnM6JyksXG4gICAgICAnUG9zaXRpb25hbHM6JzogY29sb3JzLmN5YW4oJ0FyZ3VtZW50czonKSxcbiAgICAgICdkZXByZWNhdGVkJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZCcpLFxuICAgICAgJ2RlcHJlY2F0ZWQ6ICVzJzogY29sb3JzLnllbGxvdygnZGVwcmVjYXRlZDonKSArICcgJXMnLFxuICAgICAgJ0RpZCB5b3UgbWVhbiAlcz8nOiAnVW5rbm93biBjb21tYW5kLiBEaWQgeW91IG1lYW4gJXM/JyxcbiAgICB9KVxuICAgIC5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSlcbiAgICAucmVjb21tZW5kQ29tbWFuZHMoKVxuICAgIC52ZXJzaW9uKGZhbHNlKVxuICAgIC5zaG93SGVscE9uRmFpbChmYWxzZSlcbiAgICAuc3RyaWN0KClcbiAgICAuZmFpbCgobXNnLCBlcnIpID0+IHtcbiAgICAgIHRocm93IG1zZ1xuICAgICAgICA/IC8vIFZhbGlkYXRpb24gZmFpbGVkIGV4YW1wbGU6IGBVbmtub3duIGFyZ3VtZW50OmBcbiAgICAgICAgICBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKG1zZylcbiAgICAgICAgOiAvLyBVbmtub3duIGV4Y2VwdGlvbiwgcmUtdGhyb3cuXG4gICAgICAgICAgZXJyO1xuICAgIH0pXG4gICAgLndyYXAoeWFyZ3MudGVybWluYWxXaWR0aCgpKVxuICAgIC5wYXJzZUFzeW5jKCk7XG5cbiAgcmV0dXJuIHByb2Nlc3MuZXhpdENvZGUgPz8gMDtcbn1cbiJdfQ==