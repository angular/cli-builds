"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const core_1 = require("@angular-devkit/core");
const strings_1 = require("@angular-devkit/core/src/utils/strings");
const find_up_1 = require("../utilities/find-up");
const yargsParser = require("yargs-parser");
const fs = require("fs");
const path_1 = require("path");
const SilentError = require('silent-error');
/**
 * Run a command.
 * @param commandMap Map of available commands.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param context Execution context.
 */
function runCommand(commandMap, args, logger, context) {
    return __awaiter(this, void 0, void 0, function* () {
        // if not args supplied, just run the help command.
        if (!args || args.length === 0) {
            args = ['help'];
        }
        const rawOptions = yargsParser(args, { alias: { help: ['h'] }, boolean: ['help'] });
        let commandName = rawOptions._[0];
        // remove the command name
        rawOptions._ = rawOptions._.slice(1);
        const executionScope = context.project.isEmberCLIProject()
            ? command_1.CommandScope.inProject
            : command_1.CommandScope.outsideProject;
        let Cmd;
        Cmd = findCommand(commandMap, commandName);
        if (!Cmd && !commandName && (rawOptions.v || rawOptions.version)) {
            commandName = 'version';
            Cmd = findCommand(commandMap, commandName);
        }
        if (!Cmd && rawOptions.help) {
            commandName = 'help';
            Cmd = findCommand(commandMap, commandName);
        }
        if (!Cmd) {
            logger.error(core_1.tags.oneLine `The specified command (${commandName}) is invalid.
    For a list of available options, run \`ng help\`.`);
            throw '';
        }
        const command = new Cmd(context, logger);
        args = yield command.initializeRaw(args);
        let options = parseOptions(args, command.options, command.arguments, command.argStrategy);
        yield command.initialize(options);
        options = parseOptions(args, command.options, command.arguments, command.argStrategy);
        if (commandName === 'help') {
            options.commandMap = commandMap;
        }
        if (options.help) {
            return yield runHelp(command, options);
        }
        else {
            verifyCommandInScope(command, executionScope);
            if (!command.allowMissingWorkspace) {
                verifyWorkspace(command, executionScope, context.project.root);
            }
            delete options.h;
            delete options.help;
            return yield validateAndRunCommand(command, options);
        }
    });
}
exports.runCommand = runCommand;
function parseOptions(args, cmdOpts, commandArguments, argStrategy) {
    const parser = yargsParser;
    const aliases = cmdOpts.concat()
        .filter(o => o.aliases && o.aliases.length > 0)
        .reduce((aliases, opt) => {
        aliases[opt.name] = opt.aliases
            .filter(a => a.length === 1);
        return aliases;
    }, {});
    const booleans = cmdOpts
        .filter(o => o.type && o.type === Boolean)
        .map(o => o.name);
    const defaults = cmdOpts
        .filter(o => o.default !== undefined || booleans.indexOf(o.name) !== -1)
        .reduce((defaults, opt) => {
        defaults[opt.name] = opt.default;
        return defaults;
    }, {});
    aliases.help = ['h'];
    booleans.push('help');
    const yargsOptions = {
        alias: aliases,
        boolean: booleans,
        default: defaults
    };
    const parsedOptions = parser(args, yargsOptions);
    // Remove aliases.
    cmdOpts
        .filter(o => o.aliases && o.aliases.length > 0)
        .map(o => o.aliases)
        .reduce((allAliases, aliases) => {
        return allAliases.concat([...aliases]);
    }, [])
        .forEach((alias) => {
        delete parsedOptions[alias];
    });
    // Remove undefined booleans
    booleans
        .filter(b => parsedOptions[b] === undefined)
        .map(b => strings_1.camelize(b))
        .forEach(b => delete parsedOptions[b]);
    // remove options with dashes.
    Object.keys(parsedOptions)
        .filter(key => key.indexOf('-') !== -1)
        .forEach(key => delete parsedOptions[key]);
    // remove the command name
    parsedOptions._ = parsedOptions._.slice(1);
    switch (argStrategy) {
        case command_1.ArgumentStrategy.MapToOptions:
            parsedOptions._.forEach((value, index) => {
                const arg = commandArguments[index];
                if (arg) {
                    parsedOptions[arg] = value;
                }
            });
            delete parsedOptions._;
            break;
    }
    return parsedOptions;
}
exports.parseOptions = parseOptions;
// Find a command.
function findCommand(map, name) {
    let Cmd = map[name];
    if (!Cmd) {
        // find command via aliases
        Cmd = Object.keys(map)
            .filter(key => {
            if (!map[key].aliases) {
                return false;
            }
            const foundAlias = map[key].aliases
                .filter((alias) => alias === name);
            return foundAlias.length > 0;
        })
            .map((key) => {
            return map[key];
        })[0];
    }
    if (!Cmd) {
        return null;
    }
    return Cmd;
}
function verifyCommandInScope(command, scope = command_1.CommandScope.everywhere) {
    if (!command) {
        return;
    }
    if (command.scope !== command_1.CommandScope.everywhere) {
        if (command.scope !== scope) {
            let errorMessage;
            if (command.scope === command_1.CommandScope.inProject) {
                errorMessage = `This command can only be run inside of a CLI project.`;
            }
            else {
                errorMessage = `This command can not be run inside of a CLI project.`;
            }
            throw new SilentError(errorMessage);
        }
    }
}
function verifyWorkspace(command, executionScope, root) {
    if (command.scope === command_1.CommandScope.everywhere) {
        return;
    }
    if (executionScope === command_1.CommandScope.inProject) {
        if (fs.existsSync(path_1.join(root, 'angular.json'))) {
            return;
        }
        if (fs.existsSync(path_1.join(root, '.angular.json'))) {
            return;
        }
        // Check if there's an old config file meaning that the project has not been updated
        const oldConfigFileNames = [
            core_1.normalize('.angular-cli.json'),
            core_1.normalize('angular-cli.json'),
        ];
        const oldConfigFilePath = (root && find_up_1.findUp(oldConfigFileNames, root, true))
            || find_up_1.findUp(oldConfigFileNames, process.cwd(), true)
            || find_up_1.findUp(oldConfigFileNames, __dirname, true);
        // If an old configuration file is found, throw an exception.
        if (oldConfigFilePath) {
            throw new SilentError(core_1.tags.stripIndent `
        An old project has been detected, which needs to be updated to Angular CLI 6.

        Please run the following commands to update this project.

          ng update @angular/cli --migrate-only --from=1.7.1
          npm i
      `);
        }
        // If no configuration file is found (old or new), throw an exception.
        throw new SilentError('Invalid project: missing workspace file.');
    }
}
// Execute a command's `printHelp`.
function runHelp(command, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield command.printHelp(options);
    });
}
// Validate and run a command.
function validateAndRunCommand(command, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const isValid = yield command.validate(options);
        if (isValid !== undefined && !isValid) {
            throw new SilentError(`Validation error. Invalid command`);
        }
        return yield command.run(options);
    });
}
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/command-runner.js.map