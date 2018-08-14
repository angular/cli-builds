"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const fs_1 = require("fs");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const yargsParser = require("yargs-parser");
const command_1 = require("../models/command");
const find_up_1 = require("../utilities/find-up");
const project_1 = require("../utilities/project");
const json_schema_1 = require("./json-schema");
// Based off https://en.wikipedia.org/wiki/Levenshtein_distance
// No optimization, really.
function levenshtein(a, b) {
    /* base case: empty strings */
    if (a.length == 0) {
        return b.length;
    }
    if (b.length == 0) {
        return a.length;
    }
    // Test if last characters of the strings match.
    const cost = a[a.length - 1] == b[b.length - 1] ? 0 : 1;
    /* return minimum of delete char from s, delete char from t, and delete char from both */
    return Math.min(levenshtein(a.slice(0, -1), b) + 1, levenshtein(a, b.slice(0, -1)) + 1, levenshtein(a.slice(0, -1), b.slice(0, -1)) + cost);
}
/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param context Execution context.
 */
function runCommand(args, logger, context, commandMap) {
    return __awaiter(this, void 0, void 0, function* () {
        // if not args supplied, just run the help command.
        if (!args || args.length === 0) {
            args = ['help'];
        }
        const rawOptions = yargsParser(args, { alias: { help: ['h'] }, boolean: ['help'] });
        let commandName = rawOptions._[0] || '';
        // remove the command name
        rawOptions._ = rawOptions._.slice(1);
        const executionScope = project_1.insideProject()
            ? command_1.CommandScope.inProject
            : command_1.CommandScope.outsideProject;
        if (commandMap === undefined) {
            const commandMapPath = find_up_1.findUp('commands.json', __dirname);
            if (commandMapPath === null) {
                logger.fatal('Unable to find command map.');
                return 1;
            }
            const cliDir = core_1.dirname(core_1.normalize(commandMapPath));
            const commandsText = fs_1.readFileSync(commandMapPath).toString('utf-8');
            const commandJson = JSON.parse(commandsText);
            commandMap = {};
            for (const commandName of Object.keys(commandJson)) {
                commandMap[commandName] = core_1.join(cliDir, commandJson[commandName]);
            }
        }
        let commandMetadata = commandName ? findCommand(commandMap, commandName) : null;
        if (!commandMetadata && (rawOptions.v || rawOptions.version)) {
            commandName = 'version';
            commandMetadata = findCommand(commandMap, commandName);
        }
        else if (!commandMetadata && rawOptions.help) {
            commandName = 'help';
            commandMetadata = findCommand(commandMap, commandName);
        }
        if (!commandMetadata) {
            if (!commandName) {
                logger.error(core_1.tags.stripIndent `
        We could not find a command from the arguments and the help command seems to be disabled.
        This is an issue with the CLI itself. If you see this comment, please report it and
        provide your repository.
      `);
                return 1;
            }
            else {
                const commandsDistance = {};
                const allCommands = Object.keys(commandMap).sort((a, b) => {
                    if (!(a in commandsDistance)) {
                        commandsDistance[a] = levenshtein(a, commandName);
                    }
                    if (!(b in commandsDistance)) {
                        commandsDistance[b] = levenshtein(b, commandName);
                    }
                    return commandsDistance[a] - commandsDistance[b];
                });
                logger.error(core_1.tags.stripIndent `
          The specified command ("${commandName}") is invalid. For a list of available options,
          run "ng help".
          Did you mean "${allCommands[0]}"?
      `);
                return 1;
            }
        }
        const command = yield createCommand(commandMetadata, context, logger);
        const metadataOptions = yield json_schema_1.convertSchemaToOptions(commandMetadata.text);
        if (command === null) {
            logger.error(core_1.tags.stripIndent `Command (${commandName}) failed to instantiate.`);
            return 1;
        }
        // Add the options from the metadata to the command object.
        command.addOptions(metadataOptions);
        let options = parseOptions(args, metadataOptions);
        args = yield command.initializeRaw(args);
        const optionsCopy = core_1.deepCopy(options);
        yield processRegistry(optionsCopy, commandMetadata);
        yield command.initialize(optionsCopy);
        // Reparse options after initializing the command.
        options = parseOptions(args, command.options);
        if (commandName === 'help') {
            options.commandInfo = getAllCommandInfo(commandMap);
        }
        if (options.help) {
            command.printHelp(commandName, commandMetadata.rawData.description, options);
            return;
        }
        else {
            const commandScope = mapCommandScope(commandMetadata.rawData.$scope);
            if (commandScope !== undefined && commandScope !== command_1.CommandScope.everywhere) {
                if (commandScope !== executionScope) {
                    let errorMessage;
                    if (commandScope === command_1.CommandScope.inProject) {
                        errorMessage = `This command can only be run inside of a CLI project.`;
                    }
                    else {
                        errorMessage = `This command can not be run inside of a CLI project.`;
                    }
                    logger.fatal(errorMessage);
                    return 1;
                }
                if (commandScope === command_1.CommandScope.inProject) {
                    if (!context.project.configFile) {
                        logger.fatal('Invalid project: missing workspace file.');
                        return 1;
                    }
                    if (['.angular-cli.json', 'angular-cli.json'].includes(context.project.configFile)) {
                        // --------------------------------------------------------------------------------
                        // If changing this message, please update the same message in
                        // `packages/@angular/cli/bin/ng-update-message.js`
                        const message = core_1.tags.stripIndent `
            The Angular CLI configuration format has been changed, and your existing configuration
            can be updated automatically by running the following command:

              ng update @angular/cli
          `;
                        logger.warn(message);
                        return 1;
                    }
                }
            }
        }
        delete options.h;
        delete options.help;
        yield processRegistry(options, commandMetadata);
        const isValid = yield command.validate(options);
        if (!isValid) {
            logger.fatal(`Validation error. Invalid command options.`);
            return 1;
        }
        return command.run(options);
    });
}
exports.runCommand = runCommand;
function processRegistry(options, commandMetadata) {
    return __awaiter(this, void 0, void 0, function* () {
        const rawArgs = options._;
        const registry = new core_1.schema.CoreSchemaRegistry([]);
        registry.addSmartDefaultProvider('argv', (schema) => {
            if ('index' in schema) {
                return rawArgs[Number(schema['index'])];
            }
            else {
                return rawArgs;
            }
        });
        const jsonSchema = json_schema_1.parseSchema(commandMetadata.text);
        if (jsonSchema === null) {
            throw new Error('');
        }
        yield registry.compile(jsonSchema).pipe(operators_1.concatMap(validator => validator(options)), operators_1.concatMap(validatorResult => {
            if (validatorResult.success) {
                return rxjs_1.of(options);
            }
            else {
                return rxjs_1.throwError(new core_1.schema.SchemaValidationException(validatorResult.errors));
            }
        })).toPromise();
    });
}
function parseOptions(args, optionsAndArguments) {
    const parser = yargsParser;
    // filter out arguments
    const options = optionsAndArguments
        .filter(opt => {
        let isOption = true;
        if (opt.$default !== undefined && opt.$default.$source === 'argv') {
            isOption = false;
        }
        return isOption;
    });
    const aliases = options
        .reduce((aliases, opt) => {
        if (!opt || !opt.aliases || opt.aliases.length === 0) {
            return aliases;
        }
        aliases[opt.name] = (opt.aliases || [])
            .filter(a => a.length === 1)[0];
        return aliases;
    }, {});
    const booleans = options
        .filter(o => o.type && o.type === 'boolean')
        .map(o => o.name);
    const defaults = options
        .filter(o => o.default !== undefined || booleans.indexOf(o.name) !== -1)
        .reduce((defaults, opt) => {
        defaults[opt.name] = opt.default;
        return defaults;
    }, {});
    const strings = options
        .filter(o => o.type === 'string')
        .map(o => o.name);
    const numbers = options
        .filter(o => o.type === 'number')
        .map(o => o.name);
    aliases.help = ['h'];
    booleans.push('help');
    const yargsOptions = {
        alias: aliases,
        boolean: booleans,
        default: defaults,
        string: strings,
        number: numbers,
    };
    const parsedOptions = parser(args, yargsOptions);
    // Remove aliases.
    options
        .reduce((allAliases, option) => {
        if (!option || !option.aliases || option.aliases.length === 0) {
            return allAliases;
        }
        return allAliases.concat([...option.aliases]);
    }, [])
        .forEach((alias) => {
        delete parsedOptions[alias];
    });
    // Remove undefined booleans
    booleans
        .filter(b => parsedOptions[b] === undefined)
        .map(b => core_1.strings.camelize(b))
        .forEach(b => delete parsedOptions[b]);
    // remove options with dashes.
    Object.keys(parsedOptions)
        .filter(key => key.indexOf('-') !== -1)
        .forEach(key => delete parsedOptions[key]);
    // remove the command name
    parsedOptions._ = parsedOptions._.slice(1);
    return parsedOptions;
}
exports.parseOptions = parseOptions;
// Find a command.
function findCommand(map, name) {
    // let Cmd: CommandConstructor = map[name];
    let commandName = name;
    if (!map[commandName]) {
        // find command via aliases
        commandName = Object.keys(map)
            .filter(key => {
            // get aliases for the key
            const metadataText = fs_1.readFileSync(map[key]).toString('utf-8');
            const metadata = JSON.parse(metadataText);
            const aliases = metadata['$aliases'];
            if (!aliases) {
                return false;
            }
            const foundAlias = aliases.filter((alias) => alias === name);
            return foundAlias.length > 0;
        })[0];
    }
    const metadataPath = map[commandName];
    if (!metadataPath) {
        return null;
    }
    const metadataText = fs_1.readFileSync(metadataPath).toString('utf-8');
    const metadata = core_1.parseJson(metadataText);
    return {
        path: metadataPath,
        text: metadataText,
        rawData: metadata,
    };
}
// Create an instance of a command.
function createCommand(metadata, context, logger) {
    return __awaiter(this, void 0, void 0, function* () {
        const schema = json_schema_1.parseSchema(metadata.text);
        if (schema === null) {
            return null;
        }
        const implPath = schema.$impl;
        if (typeof implPath !== 'string') {
            throw new Error('Implementation path is incorrect');
        }
        const implRef = new tools_1.ExportStringRef(implPath, core_1.dirname(core_1.normalize(metadata.path)));
        const ctor = implRef.ref;
        return new ctor(context, logger);
    });
}
function mapCommandScope(scope) {
    let commandScope = command_1.CommandScope.everywhere;
    switch (scope) {
        case 'in':
            commandScope = command_1.CommandScope.inProject;
            break;
        case 'out':
            commandScope = command_1.CommandScope.outsideProject;
            break;
    }
    return commandScope;
}
function getAllCommandInfo(map) {
    return Object.keys(map)
        .map(name => {
        return {
            name: name,
            metadata: findCommand(map, name),
        };
    })
        .map(info => {
        if (info.metadata === null) {
            return null;
        }
        return {
            name: info.name,
            description: info.metadata.rawData.description,
            aliases: info.metadata.rawData.$aliases || [],
            hidden: info.metadata.rawData.$hidden || false,
        };
    })
        .filter(info => info !== null);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQVk4QjtBQUM5Qiw0REFBbUU7QUFDbkUsMkJBQWtDO0FBQ2xDLCtCQUFzQztBQUN0Qyw4Q0FBMkM7QUFDM0MsNENBQTRDO0FBQzVDLCtDQU0yQjtBQUMzQixrREFBOEM7QUFDOUMsa0RBQXFEO0FBQ3JELCtDQUFvRTtBQXNCcEUsK0RBQStEO0FBQy9ELDJCQUEyQjtBQUMzQixxQkFBcUIsQ0FBUyxFQUFFLENBQVM7SUFDdkMsOEJBQThCO0lBQzlCLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7UUFDakIsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO0tBQ2pCO0lBQ0QsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUNqQixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7S0FDakI7SUFFRCxnREFBZ0Q7SUFDaEQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXhELHlGQUF5RjtJQUN6RixPQUFPLElBQUksQ0FBQyxHQUFHLENBQ2IsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUNsQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxD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RTtRQUNWLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDMUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVztZQUM5QyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLEVBQUU7WUFDN0MsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxLQUFLO1NBQy9DLENBQUM7SUFDSixDQUFDLENBQUM7U0FDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFrQixDQUFDO0FBQ3BELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7XG4gIEpzb25PYmplY3QsXG4gIFBhdGgsXG4gIGRlZXBDb3B5LFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBsb2dnaW5nLFxuICBub3JtYWxpemUsXG4gIHBhcnNlSnNvbixcbiAgc2NoZW1hLFxuICBzdHJpbmdzIGFzIGNvcmVTdHJpbmdzLFxuICB0YWdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBFeHBvcnRTdHJpbmdSZWYgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgeWFyZ3NQYXJzZXIgZnJvbSAneWFyZ3MtcGFyc2VyJztcbmltcG9ydCB7XG4gIENvbW1hbmQsXG4gIENvbW1hbmRDb25zdHJ1Y3RvcixcbiAgQ29tbWFuZENvbnRleHQsXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9uLFxufSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBpbnNpZGVQcm9qZWN0IH0gZnJvbSAnLi4vdXRpbGl0aWVzL3Byb2plY3QnO1xuaW1wb3J0IHsgY29udmVydFNjaGVtYVRvT3B0aW9ucywgcGFyc2VTY2hlbWEgfSBmcm9tICcuL2pzb24tc2NoZW1hJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNYXAge1xuICBba2V5OiBzdHJpbmddOiBQYXRoO1xufVxuXG5pbnRlcmZhY2UgQ29tbWFuZE1ldGFkYXRhIHtcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgJGFsaWFzZXM/OiBzdHJpbmdbXTtcbiAgJGltcGw6IHN0cmluZztcbiAgJHNjb3BlPzogJ2luJyB8ICdvdXQnO1xuICAkdHlwZT86ICdhcmNoaXRlY3QnIHwgJ3NjaGVtYXRpYyc7XG4gICRoaWRkZW4/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgQ29tbWFuZExvY2F0aW9uIHtcbiAgcGF0aDogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIHJhd0RhdGE6IENvbW1hbmRNZXRhZGF0YTtcbn1cblxuLy8gQmFzZWQgb2ZmIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xldmVuc2h0ZWluX2Rpc3RhbmNlXG4vLyBObyBvcHRpbWl6YXRpb24sIHJlYWxseS5cbmZ1bmN0aW9uIGxldmVuc2h0ZWluKGE6IHN0cmluZywgYjogc3RyaW5nKTogbnVtYmVyIHtcbiAgLyogYmFzZSBjYXNlOiBlbXB0eSBzdHJpbmdzICovXG4gIGlmIChhLmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuIGIubGVuZ3RoO1xuICB9XG4gIGlmIChiLmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuIGEubGVuZ3RoO1xuICB9XG5cbiAgLy8gVGVzdCBpZiBsYXN0IGNoYXJhY3RlcnMgb2YgdGhlIHN0cmluZ3MgbWF0Y2guXG4gIGNvbnN0IGNvc3QgPSBhW2EubGVuZ3RoIC0gMV0gPT0gYltiLmxlbmd0aCAtIDFdID8gMCA6IDE7XG5cbiAgLyogcmV0dXJuIG1pbmltdW0gb2YgZGVsZXRlIGNoYXIgZnJvbSBzLCBkZWxldGUgY2hhciBmcm9tIHQsIGFuZCBkZWxldGUgY2hhciBmcm9tIGJvdGggKi9cbiAgcmV0dXJuIE1hdGgubWluKFxuICAgIGxldmVuc2h0ZWluKGEuc2xpY2UoMCwgLTEpLCBiKSArIDEsXG4gICAgbGV2ZW5zaHRlaW4oYSwgYi5zbGljZSgwLCAtMSkpICsgMSxcbiAgICBsZXZlbnNodGVpbihhLnNsaWNlKDAsIC0xKSwgYi5zbGljZSgwLCAtMSkpICsgY29zdCxcbiAgKTtcbn1cblxuLyoqXG4gKiBSdW4gYSBjb21tYW5kLlxuICogQHBhcmFtIGFyZ3MgUmF3IHVucGFyc2VkIGFyZ3VtZW50cy5cbiAqIEBwYXJhbSBsb2dnZXIgVGhlIGxvZ2dlciB0byB1c2UuXG4gKiBAcGFyYW0gY29udGV4dCBFeGVjdXRpb24gY29udGV4dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNvbW1hbmQoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICBjb250ZXh0OiBDb21tYW5kQ29udGV4dCxcbiAgY29tbWFuZE1hcD86IENvbW1hbmRNYXAsXG4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcblxuICAvLyBpZiBub3QgYXJncyBzdXBwbGllZCwganVzdCBydW4gdGhlIGhlbHAgY29tbWFuZC5cbiAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgYXJncyA9IFsnaGVscCddO1xuICB9XG4gIGNvbnN0IHJhd09wdGlvbnMgPSB5YXJnc1BhcnNlcihhcmdzLCB7IGFsaWFzOiB7IGhlbHA6IFsnaCddIH0sIGJvb2xlYW46IFsgJ2hlbHAnIF0gfSk7XG4gIGxldCBjb21tYW5kTmFtZSA9IHJhd09wdGlvbnMuX1swXSB8fCAnJztcblxuICAvLyByZW1vdmUgdGhlIGNvbW1hbmQgbmFtZVxuICByYXdPcHRpb25zLl8gPSByYXdPcHRpb25zLl8uc2xpY2UoMSk7XG4gIGNvbnN0IGV4ZWN1dGlvblNjb3BlID0gaW5zaWRlUHJvamVjdCgpXG4gICAgPyBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0XG4gICAgOiBDb21tYW5kU2NvcGUub3V0c2lkZVByb2plY3Q7XG5cbiAgaWYgKGNvbW1hbmRNYXAgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGNvbW1hbmRNYXBQYXRoID0gZmluZFVwKCdjb21tYW5kcy5qc29uJywgX19kaXJuYW1lKTtcbiAgICBpZiAoY29tbWFuZE1hcFBhdGggPT09IG51bGwpIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnVW5hYmxlIHRvIGZpbmQgY29tbWFuZCBtYXAuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICBjb25zdCBjbGlEaXIgPSBkaXJuYW1lKG5vcm1hbGl6ZShjb21tYW5kTWFwUGF0aCkpO1xuICAgIGNvbnN0IGNvbW1hbmRzVGV4dCA9IHJlYWRGaWxlU3luYyhjb21tYW5kTWFwUGF0aCkudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29tbWFuZEpzb24gPSBKU09OLnBhcnNlKGNvbW1hbmRzVGV4dCkgYXMgeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG5cbiAgICBjb21tYW5kTWFwID0ge307XG4gICAgZm9yIChjb25zdCBjb21tYW5kTmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kSnNvbikpIHtcbiAgICAgIGNvbW1hbmRNYXBbY29tbWFuZE5hbWVdID0gam9pbihjbGlEaXIsIGNvbW1hbmRKc29uW2NvbW1hbmROYW1lXSk7XG4gICAgfVxuICB9XG5cbiAgbGV0IGNvbW1hbmRNZXRhZGF0YSA9IGNvbW1hbmROYW1lID8gZmluZENvbW1hbmQoY29tbWFuZE1hcCwgY29tbWFuZE5hbWUpIDogbnVsbDtcblxuICBpZiAoIWNvbW1hbmRNZXRhZGF0YSAmJiAocmF3T3B0aW9ucy52IHx8IHJhd09wdGlvbnMudmVyc2lvbikpIHtcbiAgICBjb21tYW5kTmFtZSA9ICd2ZXJzaW9uJztcbiAgICBjb21tYW5kTWV0YWRhdGEgPSBmaW5kQ29tbWFuZChjb21tYW5kTWFwLCBjb21tYW5kTmFtZSk7XG4gIH0gZWxzZSBpZiAoIWNvbW1hbmRNZXRhZGF0YSAmJiByYXdPcHRpb25zLmhlbHApIHtcbiAgICBjb21tYW5kTmFtZSA9ICdoZWxwJztcbiAgICBjb21tYW5kTWV0YWRhdGEgPSBmaW5kQ29tbWFuZChjb21tYW5kTWFwLCBjb21tYW5kTmFtZSk7XG4gIH1cblxuICBpZiAoIWNvbW1hbmRNZXRhZGF0YSkge1xuICAgIGlmICghY29tbWFuZE5hbWUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBXZSBjb3VsZCBub3QgZmluZCBhIGNvbW1hbmQgZnJvbSB0aGUgYXJndW1lbnRzIGFuZCB0aGUgaGVscCBjb21tYW5kIHNlZW1zIHRvIGJlIGRpc2FibGVkLlxuICAgICAgICBUaGlzIGlzIGFuIGlzc3VlIHdpdGggdGhlIENMSSBpdHNlbGYuIElmIHlvdSBzZWUgdGhpcyBjb21tZW50LCBwbGVhc2UgcmVwb3J0IGl0IGFuZFxuICAgICAgICBwcm92aWRlIHlvdXIgcmVwb3NpdG9yeS5cbiAgICAgIGApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tbWFuZHNEaXN0YW5jZSA9IHt9IGFzIHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9O1xuICAgICAgY29uc3QgYWxsQ29tbWFuZHMgPSBPYmplY3Qua2V5cyhjb21tYW5kTWFwKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGlmICghKGEgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2FdID0gbGV2ZW5zaHRlaW4oYSwgY29tbWFuZE5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKGIgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2JdID0gbGV2ZW5zaHRlaW4oYiwgY29tbWFuZE5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbW1hbmRzRGlzdGFuY2VbYV0gLSBjb21tYW5kc0Rpc3RhbmNlW2JdO1xuICAgICAgfSk7XG5cbiAgICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICAgIFRoZSBzcGVjaWZpZWQgY29tbWFuZCAoXCIke2NvbW1hbmROYW1lfVwiKSBpcyBpbnZhbGlkLiBGb3IgYSBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zLFxuICAgICAgICAgIHJ1biBcIm5nIGhlbHBcIi5cbiAgICAgICAgICBEaWQgeW91IG1lYW4gXCIke2FsbENvbW1hbmRzWzBdfVwiP1xuICAgICAgYCk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNvbW1hbmQgPSBhd2FpdCBjcmVhdGVDb21tYW5kKGNvbW1hbmRNZXRhZGF0YSwgY29udGV4dCwgbG9nZ2VyKTtcbiAgY29uc3QgbWV0YWRhdGFPcHRpb25zID0gYXdhaXQgY29udmVydFNjaGVtYVRvT3B0aW9ucyhjb21tYW5kTWV0YWRhdGEudGV4dCk7XG4gIGlmIChjb21tYW5kID09PSBudWxsKSB7XG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgQ29tbWFuZCAoJHtjb21tYW5kTmFtZX0pIGZhaWxlZCB0byBpbnN0YW50aWF0ZS5gKTtcblxuICAgIHJldHVybiAxO1xuICB9XG4gIC8vIEFkZCB0aGUgb3B0aW9ucyBmcm9tIHRoZSBtZXRhZGF0YSB0byB0aGUgY29tbWFuZCBvYmplY3QuXG4gIGNvbW1hbmQuYWRkT3B0aW9ucyhtZXRhZGF0YU9wdGlvbnMpO1xuICBsZXQgb3B0aW9ucyA9IHBhcnNlT3B0aW9ucyhhcmdzLCBtZXRhZGF0YU9wdGlvbnMpO1xuICBhcmdzID0gYXdhaXQgY29tbWFuZC5pbml0aWFsaXplUmF3KGFyZ3MpO1xuXG4gIGNvbnN0IG9wdGlvbnNDb3B5ID0gZGVlcENvcHkob3B0aW9ucyk7XG4gIGF3YWl0IHByb2Nlc3NSZWdpc3RyeShvcHRpb25zQ29weSwgY29tbWFuZE1ldGFkYXRhKTtcbiAgYXdhaXQgY29tbWFuZC5pbml0aWFsaXplKG9wdGlvbnNDb3B5KTtcblxuICAvLyBSZXBhcnNlIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6aW5nIHRoZSBjb21tYW5kLlxuICBvcHRpb25zID0gcGFyc2VPcHRpb25zKGFyZ3MsIGNvbW1hbmQub3B0aW9ucyk7XG5cbiAgaWYgKGNvbW1hbmROYW1lID09PSAnaGVscCcpIHtcbiAgICBvcHRpb25zLmNvbW1hbmRJbmZvID0gZ2V0QWxsQ29tbWFuZEluZm8oY29tbWFuZE1hcCk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5oZWxwKSB7XG4gICAgY29tbWFuZC5wcmludEhlbHAoY29tbWFuZE5hbWUsIGNvbW1hbmRNZXRhZGF0YS5yYXdEYXRhLmRlc2NyaXB0aW9uLCBvcHRpb25zKTtcblxuICAgIHJldHVybjtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjb21tYW5kU2NvcGUgPSBtYXBDb21tYW5kU2NvcGUoY29tbWFuZE1ldGFkYXRhLnJhd0RhdGEuJHNjb3BlKTtcbiAgICBpZiAoY29tbWFuZFNjb3BlICE9PSB1bmRlZmluZWQgJiYgY29tbWFuZFNjb3BlICE9PSBDb21tYW5kU2NvcGUuZXZlcnl3aGVyZSkge1xuICAgICAgaWYgKGNvbW1hbmRTY29wZSAhPT0gZXhlY3V0aW9uU2NvcGUpIHtcbiAgICAgICAgbGV0IGVycm9yTWVzc2FnZTtcbiAgICAgICAgaWYgKGNvbW1hbmRTY29wZSA9PT0gQ29tbWFuZFNjb3BlLmluUHJvamVjdCkge1xuICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGBUaGlzIGNvbW1hbmQgY2FuIG9ubHkgYmUgcnVuIGluc2lkZSBvZiBhIENMSSBwcm9qZWN0LmA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXJyb3JNZXNzYWdlID0gYFRoaXMgY29tbWFuZCBjYW4gbm90IGJlIHJ1biBpbnNpZGUgb2YgYSBDTEkgcHJvamVjdC5gO1xuICAgICAgICB9XG4gICAgICAgIGxvZ2dlci5mYXRhbChlcnJvck1lc3NhZ2UpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1hbmRTY29wZSA9PT0gQ29tbWFuZFNjb3BlLmluUHJvamVjdCkge1xuICAgICAgICBpZiAoIWNvbnRleHQucHJvamVjdC5jb25maWdGaWxlKSB7XG4gICAgICAgICAgbG9nZ2VyLmZhdGFsKCdJbnZhbGlkIHByb2plY3Q6IG1pc3Npbmcgd29ya3NwYWNlIGZpbGUuJyk7XG5cbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChbJy5hbmd1bGFyLWNsaS5qc29uJywgJ2FuZ3VsYXItY2xpLmpzb24nXS5pbmNsdWRlcyhjb250ZXh0LnByb2plY3QuY29uZmlnRmlsZSkpIHtcbiAgICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgIC8vIElmIGNoYW5naW5nIHRoaXMgbWVzc2FnZSwgcGxlYXNlIHVwZGF0ZSB0aGUgc2FtZSBtZXNzYWdlIGluXG4gICAgICAgICAgLy8gYHBhY2thZ2VzL0Bhbmd1bGFyL2NsaS9iaW4vbmctdXBkYXRlLW1lc3NhZ2UuanNgXG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgICAgICBUaGUgQW5ndWxhciBDTEkgY29uZmlndXJhdGlvbiBmb3JtYXQgaGFzIGJlZW4gY2hhbmdlZCwgYW5kIHlvdXIgZXhpc3RpbmcgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgY2FuIGJlIHVwZGF0ZWQgYXV0b21hdGljYWxseSBieSBydW5uaW5nIHRoZSBmb2xsb3dpbmcgY29tbWFuZDpcblxuICAgICAgICAgICAgICBuZyB1cGRhdGUgQGFuZ3VsYXIvY2xpXG4gICAgICAgICAgYDtcblxuICAgICAgICAgIGxvZ2dlci53YXJuKG1lc3NhZ2UpO1xuXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZGVsZXRlIG9wdGlvbnMuaDtcbiAgZGVsZXRlIG9wdGlvbnMuaGVscDtcbiAgYXdhaXQgcHJvY2Vzc1JlZ2lzdHJ5KG9wdGlvbnMsIGNvbW1hbmRNZXRhZGF0YSk7XG5cbiAgY29uc3QgaXNWYWxpZCA9IGF3YWl0IGNvbW1hbmQudmFsaWRhdGUob3B0aW9ucyk7XG4gIGlmICghaXNWYWxpZCkge1xuICAgIGxvZ2dlci5mYXRhbChgVmFsaWRhdGlvbiBlcnJvci4gSW52YWxpZCBjb21tYW5kIG9wdGlvbnMuYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIHJldHVybiBjb21tYW5kLnJ1bihvcHRpb25zKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc1JlZ2lzdHJ5KFxuICBvcHRpb25zOiB7XzogKHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXIpW119LCBjb21tYW5kTWV0YWRhdGE6IENvbW1hbmRMb2NhdGlvbikge1xuICBjb25zdCByYXdBcmdzID0gb3B0aW9ucy5fO1xuICBjb25zdCByZWdpc3RyeSA9IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KFtdKTtcbiAgcmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ2FyZ3YnLCAoc2NoZW1hOiBKc29uT2JqZWN0KSA9PiB7XG4gICAgaWYgKCdpbmRleCcgaW4gc2NoZW1hKSB7XG4gICAgICByZXR1cm4gcmF3QXJnc1tOdW1iZXIoc2NoZW1hWydpbmRleCddKV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByYXdBcmdzO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QganNvblNjaGVtYSA9IHBhcnNlU2NoZW1hKGNvbW1hbmRNZXRhZGF0YS50ZXh0KTtcbiAgaWYgKGpzb25TY2hlbWEgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJycpO1xuICB9XG4gIGF3YWl0IHJlZ2lzdHJ5LmNvbXBpbGUoanNvblNjaGVtYSkucGlwZShcbiAgICBjb25jYXRNYXAodmFsaWRhdG9yID0+IHZhbGlkYXRvcihvcHRpb25zKSksIGNvbmNhdE1hcCh2YWxpZGF0b3JSZXN1bHQgPT4ge1xuICAgICAgaWYgKHZhbGlkYXRvclJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiBvZihvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKG5ldyBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbih2YWxpZGF0b3JSZXN1bHQuZXJyb3JzKSk7XG4gICAgICB9XG4gICAgfSkpLnRvUHJvbWlzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VPcHRpb25zKGFyZ3M6IHN0cmluZ1tdLCBvcHRpb25zQW5kQXJndW1lbnRzOiBPcHRpb25bXSkge1xuICBjb25zdCBwYXJzZXIgPSB5YXJnc1BhcnNlcjtcblxuICAvLyBmaWx0ZXIgb3V0IGFyZ3VtZW50c1xuICBjb25zdCBvcHRpb25zID0gb3B0aW9uc0FuZEFyZ3VtZW50c1xuICAgIC5maWx0ZXIob3B0ID0+IHtcbiAgICAgIGxldCBpc09wdGlvbiA9IHRydWU7XG4gICAgICBpZiAob3B0LiRkZWZhdWx0ICE9PSB1bmRlZmluZWQgJiYgb3B0LiRkZWZhdWx0LiRzb3VyY2UgPT09ICdhcmd2Jykge1xuICAgICAgICBpc09wdGlvbiA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaXNPcHRpb247XG4gICAgfSk7XG5cbiAgY29uc3QgYWxpYXNlczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmdbXTsgfSA9IG9wdGlvbnNcbiAgICAucmVkdWNlKChhbGlhc2VzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZzsgfSwgb3B0KSA9PiB7XG4gICAgICBpZiAoIW9wdCB8fCAhb3B0LmFsaWFzZXMgfHwgb3B0LmFsaWFzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBhbGlhc2VzO1xuICAgICAgfVxuXG4gICAgICBhbGlhc2VzW29wdC5uYW1lXSA9IChvcHQuYWxpYXNlcyB8fCBbXSlcbiAgICAgICAgLmZpbHRlcihhID0+IGEubGVuZ3RoID09PSAxKVswXTtcblxuICAgICAgcmV0dXJuIGFsaWFzZXM7XG4gICAgfSwge30pO1xuXG4gIGNvbnN0IGJvb2xlYW5zID0gb3B0aW9uc1xuICAgIC5maWx0ZXIobyA9PiBvLnR5cGUgJiYgby50eXBlID09PSAnYm9vbGVhbicpXG4gICAgLm1hcChvID0+IG8ubmFtZSk7XG5cbiAgY29uc3QgZGVmYXVsdHMgPSBvcHRpb25zXG4gICAgLmZpbHRlcihvID0+IG8uZGVmYXVsdCAhPT0gdW5kZWZpbmVkIHx8IGJvb2xlYW5zLmluZGV4T2Yoby5uYW1lKSAhPT0gLTEpXG4gICAgLnJlZHVjZSgoZGVmYXVsdHM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkIH0sIG9wdDogT3B0aW9uKSA9PiB7XG4gICAgICBkZWZhdWx0c1tvcHQubmFtZV0gPSBvcHQuZGVmYXVsdDtcblxuICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBzdHJpbmdzID0gb3B0aW9uc1xuICAgIC5maWx0ZXIobyA9PiBvLnR5cGUgPT09ICdzdHJpbmcnKVxuICAgIC5tYXAobyA9PiBvLm5hbWUpO1xuXG4gIGNvbnN0IG51bWJlcnMgPSBvcHRpb25zXG4gICAgLmZpbHRlcihvID0+IG8udHlwZSA9PT0gJ251bWJlcicpXG4gICAgLm1hcChvID0+IG8ubmFtZSk7XG5cblxuICBhbGlhc2VzLmhlbHAgPSBbJ2gnXTtcbiAgYm9vbGVhbnMucHVzaCgnaGVscCcpO1xuXG4gIGNvbnN0IHlhcmdzT3B0aW9ucyA9IHtcbiAgICBhbGlhczogYWxpYXNlcyxcbiAgICBib29sZWFuOiBib29sZWFucyxcbiAgICBkZWZhdWx0OiBkZWZhdWx0cyxcbiAgICBzdHJpbmc6IHN0cmluZ3MsXG4gICAgbnVtYmVyOiBudW1iZXJzLFxuICB9O1xuXG4gIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZXIoYXJncywgeWFyZ3NPcHRpb25zKTtcblxuICAvLyBSZW1vdmUgYWxpYXNlcy5cbiAgb3B0aW9uc1xuICAgIC5yZWR1Y2UoKGFsbEFsaWFzZXMsIG9wdGlvbikgPT4ge1xuICAgICAgaWYgKCFvcHRpb24gfHwgIW9wdGlvbi5hbGlhc2VzIHx8IG9wdGlvbi5hbGlhc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gYWxsQWxpYXNlcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFsbEFsaWFzZXMuY29uY2F0KFsuLi5vcHRpb24uYWxpYXNlc10pO1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5mb3JFYWNoKChhbGlhczogc3RyaW5nKSA9PiB7XG4gICAgICBkZWxldGUgcGFyc2VkT3B0aW9uc1thbGlhc107XG4gICAgfSk7XG5cbiAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBib29sZWFuc1xuICBib29sZWFuc1xuICAgIC5maWx0ZXIoYiA9PiBwYXJzZWRPcHRpb25zW2JdID09PSB1bmRlZmluZWQpXG4gICAgLm1hcChiID0+IGNvcmVTdHJpbmdzLmNhbWVsaXplKGIpKVxuICAgIC5mb3JFYWNoKGIgPT4gZGVsZXRlIHBhcnNlZE9wdGlvbnNbYl0pO1xuXG4gIC8vIHJlbW92ZSBvcHRpb25zIHdpdGggZGFzaGVzLlxuICBPYmplY3Qua2V5cyhwYXJzZWRPcHRpb25zKVxuICAgIC5maWx0ZXIoa2V5ID0+IGtleS5pbmRleE9mKCctJykgIT09IC0xKVxuICAgIC5mb3JFYWNoKGtleSA9PiBkZWxldGUgcGFyc2VkT3B0aW9uc1trZXldKTtcblxuICAvLyByZW1vdmUgdGhlIGNvbW1hbmQgbmFtZVxuICBwYXJzZWRPcHRpb25zLl8gPSBwYXJzZWRPcHRpb25zLl8uc2xpY2UoMSk7XG5cbiAgcmV0dXJuIHBhcnNlZE9wdGlvbnM7XG59XG5cbi8vIEZpbmQgYSBjb21tYW5kLlxuZnVuY3Rpb24gZmluZENvbW1hbmQobWFwOiBDb21tYW5kTWFwLCBuYW1lOiBzdHJpbmcpOiBDb21tYW5kTG9jYXRpb24gfCBudWxsIHtcbiAgLy8gbGV0IENtZDogQ29tbWFuZENvbnN0cnVjdG9yID0gbWFwW25hbWVdO1xuICBsZXQgY29tbWFuZE5hbWUgPSBuYW1lO1xuXG4gIGlmICghbWFwW2NvbW1hbmROYW1lXSkge1xuICAgIC8vIGZpbmQgY29tbWFuZCB2aWEgYWxpYXNlc1xuICAgIGNvbW1hbmROYW1lID0gT2JqZWN0LmtleXMobWFwKVxuICAgICAgLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICAvLyBnZXQgYWxpYXNlcyBmb3IgdGhlIGtleVxuICAgICAgICBjb25zdCBtZXRhZGF0YVRleHQgPSByZWFkRmlsZVN5bmMobWFwW2tleV0pLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IEpTT04ucGFyc2UobWV0YWRhdGFUZXh0KTtcbiAgICAgICAgY29uc3QgYWxpYXNlcyA9IG1ldGFkYXRhWyckYWxpYXNlcyddO1xuICAgICAgICBpZiAoIWFsaWFzZXMpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm91bmRBbGlhcyA9IGFsaWFzZXMuZmlsdGVyKChhbGlhczogc3RyaW5nKSA9PiBhbGlhcyA9PT0gbmFtZSk7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kQWxpYXMubGVuZ3RoID4gMDtcbiAgICAgIH0pWzBdO1xuICB9XG5cbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gbWFwW2NvbW1hbmROYW1lXTtcblxuICBpZiAoIW1ldGFkYXRhUGF0aCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG1ldGFkYXRhVGV4dCA9IHJlYWRGaWxlU3luYyhtZXRhZGF0YVBhdGgpLnRvU3RyaW5nKCd1dGYtOCcpO1xuXG4gIGNvbnN0IG1ldGFkYXRhID0gcGFyc2VKc29uKG1ldGFkYXRhVGV4dCkgYXMgYW55O1xuXG4gIHJldHVybiB7XG4gICAgcGF0aDogbWV0YWRhdGFQYXRoLFxuICAgIHRleHQ6IG1ldGFkYXRhVGV4dCxcbiAgICByYXdEYXRhOiBtZXRhZGF0YSxcbiAgfTtcbn1cblxuLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIGEgY29tbWFuZC5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbW1hbmQobWV0YWRhdGE6IENvbW1hbmRMb2NhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dDogQ29tbWFuZENvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIpOiBQcm9taXNlPENvbW1hbmQgfCBudWxsPiB7XG4gIGNvbnN0IHNjaGVtYSA9IHBhcnNlU2NoZW1hKG1ldGFkYXRhLnRleHQpO1xuICBpZiAoc2NoZW1hID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgaW1wbFBhdGggPSBzY2hlbWEuJGltcGw7XG4gIGlmICh0eXBlb2YgaW1wbFBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbXBsZW1lbnRhdGlvbiBwYXRoIGlzIGluY29ycmVjdCcpO1xuICB9XG5cbiAgY29uc3QgaW1wbFJlZiA9IG5ldyBFeHBvcnRTdHJpbmdSZWYoaW1wbFBhdGgsIGRpcm5hbWUobm9ybWFsaXplKG1ldGFkYXRhLnBhdGgpKSk7XG5cbiAgY29uc3QgY3RvciA9IGltcGxSZWYucmVmIGFzIENvbW1hbmRDb25zdHJ1Y3RvcjtcblxuICByZXR1cm4gbmV3IGN0b3IoY29udGV4dCwgbG9nZ2VyKTtcbn1cblxuZnVuY3Rpb24gbWFwQ29tbWFuZFNjb3BlKHNjb3BlOiAnaW4nIHwgJ291dCcgfCB1bmRlZmluZWQpOiBDb21tYW5kU2NvcGUge1xuICBsZXQgY29tbWFuZFNjb3BlID0gQ29tbWFuZFNjb3BlLmV2ZXJ5d2hlcmU7XG4gIHN3aXRjaCAoc2NvcGUpIHtcbiAgICBjYXNlICdpbic6XG4gICAgICBjb21tYW5kU2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnb3V0JzpcbiAgICAgIGNvbW1hbmRTY29wZSA9IENvbW1hbmRTY29wZS5vdXRzaWRlUHJvamVjdDtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGNvbW1hbmRTY29wZTtcbn1cblxuaW50ZXJmYWNlIENvbW1hbmRJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBhbGlhc2VzOiBzdHJpbmdbXTtcbiAgaGlkZGVuOiBib29sZWFuO1xufVxuZnVuY3Rpb24gZ2V0QWxsQ29tbWFuZEluZm8obWFwOiBDb21tYW5kTWFwKTogQ29tbWFuZEluZm9bXSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhtYXApXG4gICAgLm1hcChuYW1lID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIG1ldGFkYXRhOiBmaW5kQ29tbWFuZChtYXAsIG5hbWUpLFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5tYXAoaW5mbyA9PiB7XG4gICAgICBpZiAoaW5mby5tZXRhZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogaW5mby5uYW1lLFxuICAgICAgICBkZXNjcmlwdGlvbjogaW5mby5tZXRhZGF0YS5yYXdEYXRhLmRlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhc2VzOiBpbmZvLm1ldGFkYXRhLnJhd0RhdGEuJGFsaWFzZXMgfHwgW10sXG4gICAgICAgIGhpZGRlbjogaW5mby5tZXRhZGF0YS5yYXdEYXRhLiRoaWRkZW4gfHwgZmFsc2UsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihpbmZvID0+IGluZm8gIT09IG51bGwpIGFzIENvbW1hbmRJbmZvW107XG59XG4iXX0=