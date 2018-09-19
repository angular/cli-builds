"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const find_up_1 = require("../utilities/find-up");
const json_schema_1 = require("../utilities/json-schema");
const command_1 = require("./command");
const parser = require("./parser");
/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param workspace Workspace information.
 * @param commands The map of supported commands.
 */
async function runCommand(args, logger, workspace, commands) {
    if (commands === undefined) {
        const commandMapPath = find_up_1.findUp('commands.json', __dirname);
        if (commandMapPath === null) {
            throw new Error('Unable to find command map.');
        }
        const cliDir = path_1.dirname(commandMapPath);
        const commandsText = fs_1.readFileSync(commandMapPath).toString('utf-8');
        const commandJson = core_1.json.parseJson(commandsText, core_1.JsonParseMode.Loose, { path: commandMapPath });
        if (!core_1.isJsonObject(commandJson)) {
            throw Error('Invalid command.json');
        }
        commands = {};
        for (const commandName of Object.keys(commandJson)) {
            const commandValue = commandJson[commandName];
            if (typeof commandValue == 'string') {
                commands[commandName] = path_1.resolve(cliDir, commandValue);
            }
        }
    }
    // This registry is exclusively used for flattening schemas, and not for validating.
    const registry = new core_1.schema.CoreSchemaRegistry([]);
    registry.registerUriHandler((uri) => {
        if (uri.startsWith('ng-cli://')) {
            const content = fs_1.readFileSync(path_1.join(__dirname, '..', uri.substr('ng-cli://'.length)), 'utf-8');
            return rxjs_1.of(JSON.parse(content));
        }
    });
    // Normalize the commandMap
    const commandMap = {};
    for (const name of Object.keys(commands)) {
        const schemaPath = commands[name];
        const schemaContent = fs_1.readFileSync(schemaPath, 'utf-8');
        const schema = core_1.json.parseJson(schemaContent, core_1.JsonParseMode.Loose, { path: schemaPath });
        if (!core_1.isJsonObject(schema)) {
            throw new Error('Invalid command JSON loaded from ' + JSON.stringify(schemaPath));
        }
        commandMap[name] = await json_schema_1.parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema);
    }
    let commandName = undefined;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg in commandMap) {
            commandName = arg;
            args.splice(i, 1);
            break;
        }
        else if (!arg.startsWith('-')) {
            commandName = arg;
            args.splice(i, 1);
            break;
        }
    }
    // if no commands were found, use `help`.
    if (commandName === undefined) {
        if (args.length === 1 && args[0] === '--version') {
            commandName = 'version';
        }
        else {
            commandName = 'help';
        }
    }
    let description = null;
    if (commandName !== undefined) {
        if (commandMap[commandName]) {
            description = commandMap[commandName];
        }
        else {
            Object.keys(commandMap).forEach(name => {
                const commandDescription = commandMap[name];
                const aliases = commandDescription.aliases;
                let found = false;
                if (aliases) {
                    if (aliases.some(alias => alias === commandName)) {
                        found = true;
                    }
                }
                if (found) {
                    if (description) {
                        throw new Error('Found multiple commands with the same alias.');
                    }
                    commandName = name;
                    description = commandDescription;
                }
            });
        }
    }
    if (!commandName) {
        logger.error(core_1.tags.stripIndent `
        We could not find a command from the arguments and the help command seems to be disabled.
        This is an issue with the CLI itself. If you see this comment, please report it and
        provide your repository.
      `);
        return 1;
    }
    if (!description) {
        const commandsDistance = {};
        const name = commandName;
        const allCommands = Object.keys(commandMap).sort((a, b) => {
            if (!(a in commandsDistance)) {
                commandsDistance[a] = core_1.strings.levenshtein(a, name);
            }
            if (!(b in commandsDistance)) {
                commandsDistance[b] = core_1.strings.levenshtein(b, name);
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
    const parsedOptions = parser.parseArguments(args, description.options);
    command_1.Command.setCommandMap(commandMap);
    const command = new description.impl({ workspace }, description, logger);
    return await command.validateAndRun(parsedOptions);
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVE4QjtBQUM5QiwyQkFBa0M7QUFDbEMsK0JBQThDO0FBQzlDLCtCQUEwQjtBQUMxQixrREFBOEM7QUFDOUMsMERBQStFO0FBQy9FLHVDQUFvQztBQU1wQyxtQ0FBbUM7QUFPbkM7Ozs7OztHQU1HO0FBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FDOUIsSUFBYyxFQUNkLE1BQXNCLEVBQ3RCLFNBQTJCLEVBQzNCLFFBQTRCO0lBRTVCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtRQUMxQixNQUFNLGNBQWMsR0FBRyxnQkFBTSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO1FBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLGlCQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sV0FBVyxHQUFHLFdBQUksQ0FBQyxTQUFTLENBQ2hDLFlBQVksRUFDWixvQkFBYSxDQUFDLEtBQUssRUFDbkIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQ3pCLENBQUM7UUFDRixJQUFJLENBQUMsbUJBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixNQUFNLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ3JDO1FBRUQsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNkLEtBQUssTUFBTSxXQUFXLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENB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Q0FBQyxJQUFJLGdCQUFnQixDQUFDLEVBQUU7Z0JBQzVCLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLGNBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3BEO1lBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEVBQUU7Z0JBQzVCLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLGNBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3BEO1lBRUQsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLFdBQVcsQ0FBQTtrQ0FDQyxXQUFXOzs7d0JBR3JCLFdBQVcsQ0FBQyxDQUFDLENBQUM7S0FDakMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLENBQUM7S0FDVjtJQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2RSxpQkFBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFekUsT0FBTyxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDckQsQ0FBQztBQXRKRCxnQ0FzSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBKc29uUGFyc2VNb2RlLFxuICBpc0pzb25PYmplY3QsXG4gIGpzb24sXG4gIGxvZ2dpbmcsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uL3V0aWxpdGllcy9maW5kLXVwJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZERlc2NyaXB0aW9uLFxuICBDb21tYW5kRGVzY3JpcHRpb25NYXAsXG4gIENvbW1hbmRXb3Jrc3BhY2UsXG59IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tICcuL3BhcnNlcic7XG5cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kTWFwT3B0aW9ucyB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZztcbn1cblxuLyoqXG4gKiBSdW4gYSBjb21tYW5kLlxuICogQHBhcmFtIGFyZ3MgUmF3IHVucGFyc2VkIGFyZ3VtZW50cy5cbiAqIEBwYXJhbSBsb2dnZXIgVGhlIGxvZ2dlciB0byB1c2UuXG4gKiBAcGFyYW0gd29ya3NwYWNlIFdvcmtzcGFjZSBpbmZvcm1hdGlvbi5cbiAqIEBwYXJhbSBjb21tYW5kcyBUaGUgbWFwIG9mIHN1cHBvcnRlZCBjb21tYW5kcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNvbW1hbmQoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuICB3b3Jrc3BhY2U6IENvbW1hbmRXb3Jrc3BhY2UsXG4gIGNvbW1hbmRzPzogQ29tbWFuZE1hcE9wdGlvbnMsXG4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgaWYgKGNvbW1hbmRzID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBjb21tYW5kTWFwUGF0aCA9IGZpbmRVcCgnY29tbWFuZHMuanNvbicsIF9fZGlybmFtZSk7XG4gICAgaWYgKGNvbW1hbmRNYXBQYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGNvbW1hbmQgbWFwLicpO1xuICAgIH1cbiAgICBjb25zdCBjbGlEaXIgPSBkaXJuYW1lKGNvbW1hbmRNYXBQYXRoKTtcbiAgICBjb25zdCBjb21tYW5kc1RleHQgPSByZWFkRmlsZVN5bmMoY29tbWFuZE1hcFBhdGgpLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGNvbW1hbmRKc29uID0ganNvbi5wYXJzZUpzb24oXG4gICAgICBjb21tYW5kc1RleHQsXG4gICAgICBKc29uUGFyc2VNb2RlLkxvb3NlLFxuICAgICAgeyBwYXRoOiBjb21tYW5kTWFwUGF0aCB9LFxuICAgICk7XG4gICAgaWYgKCFpc0pzb25PYmplY3QoY29tbWFuZEpzb24pKSB7XG4gICAgICB0aHJvdyBFcnJvcignSW52YWxpZCBjb21tYW5kLmpzb24nKTtcbiAgICB9XG5cbiAgICBjb21tYW5kcyA9IHt9O1xuICAgIGZvciAoY29uc3QgY29tbWFuZE5hbWUgb2YgT2JqZWN0LmtleXMoY29tbWFuZEpzb24pKSB7XG4gICAgICBjb25zdCBjb21tYW5kVmFsdWUgPSBjb21tYW5kSnNvbltjb21tYW5kTmFtZV07XG4gICAgICBpZiAodHlwZW9mIGNvbW1hbmRWYWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBjb21tYW5kc1tjb21tYW5kTmFtZV0gPSByZXNvbHZlKGNsaURpciwgY29tbWFuZFZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBUaGlzIHJlZ2lzdHJ5IGlzIGV4Y2x1c2l2ZWx5IHVzZWQgZm9yIGZsYXR0ZW5pbmcgc2NoZW1hcywgYW5kIG5vdCBmb3IgdmFsaWRhdGluZy5cbiAgY29uc3QgcmVnaXN0cnkgPSBuZXcgc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeShbXSk7XG4gIHJlZ2lzdHJ5LnJlZ2lzdGVyVXJpSGFuZGxlcigodXJpOiBzdHJpbmcpID0+IHtcbiAgICBpZiAodXJpLnN0YXJ0c1dpdGgoJ25nLWNsaTovLycpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4nLCB1cmkuc3Vic3RyKCduZy1jbGk6Ly8nLmxlbmd0aCkpLCAndXRmLTgnKTtcblxuICAgICAgcmV0dXJuIG9mKEpTT04ucGFyc2UoY29udGVudCkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBjb21tYW5kTWFwXG4gIGNvbnN0IGNvbW1hbmRNYXA6IENvbW1hbmREZXNjcmlwdGlvbk1hcCA9IHt9O1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoY29tbWFuZHMpKSB7XG4gICAgY29uc3Qgc2NoZW1hUGF0aCA9IGNvbW1hbmRzW25hbWVdO1xuICAgIGNvbnN0IHNjaGVtYUNvbnRlbnQgPSByZWFkRmlsZVN5bmMoc2NoZW1hUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3Qgc2NoZW1hID0ganNvbi5wYXJzZUpzb24oc2NoZW1hQ29udGVudCwgSnNvblBhcnNlTW9kZS5Mb29zZSwgeyBwYXRoOiBzY2hlbWFQYXRoIH0pO1xuICAgIGlmICghaXNKc29uT2JqZWN0KHNjaGVtYSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb21tYW5kIEpTT04gbG9hZGVkIGZyb20gJyArIEpTT04uc3RyaW5naWZ5KHNjaGVtYVBhdGgpKTtcbiAgICB9XG5cbiAgICBjb21tYW5kTWFwW25hbWVdID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24oXG4gICAgICBuYW1lLFxuICAgICAgc2NoZW1hUGF0aCxcbiAgICAgIHJlZ2lzdHJ5LFxuICAgICAgc2NoZW1hLFxuICAgICk7XG4gIH1cblxuICBsZXQgY29tbWFuZE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmIChhcmcgaW4gY29tbWFuZE1hcCkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH0gZWxzZSBpZiAoIWFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGNvbW1hbmROYW1lID0gYXJnO1xuICAgICAgYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvLyBpZiBubyBjb21tYW5kcyB3ZXJlIGZvdW5kLCB1c2UgYGhlbHBgLlxuICBpZiAoY29tbWFuZE5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiBhcmdzWzBdID09PSAnLS12ZXJzaW9uJykge1xuICAgICAgY29tbWFuZE5hbWUgPSAndmVyc2lvbic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmROYW1lID0gJ2hlbHAnO1xuICAgIH1cbiAgfVxuXG4gIGxldCBkZXNjcmlwdGlvbjogQ29tbWFuZERlc2NyaXB0aW9uIHwgbnVsbCA9IG51bGw7XG5cbiAgaWYgKGNvbW1hbmROYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZE1hcFtjb21tYW5kTmFtZV0pIHtcbiAgICAgIGRlc2NyaXB0aW9uID0gY29tbWFuZE1hcFtjb21tYW5kTmFtZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5rZXlzKGNvbW1hbmRNYXApLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGNvbW1hbmRNYXBbbmFtZV07XG4gICAgICAgIGNvbnN0IGFsaWFzZXMgPSBjb21tYW5kRGVzY3JpcHRpb24uYWxpYXNlcztcblxuICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGFsaWFzZXMpIHtcbiAgICAgICAgICBpZiAoYWxpYXNlcy5zb21lKGFsaWFzID0+IGFsaWFzID09PSBjb21tYW5kTmFtZSkpIHtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgbXVsdGlwbGUgY29tbWFuZHMgd2l0aCB0aGUgc2FtZSBhbGlhcy4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWFuZE5hbWUgPSBuYW1lO1xuICAgICAgICAgIGRlc2NyaXB0aW9uID0gY29tbWFuZERlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbW1hbmROYW1lKSB7XG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFdlIGNvdWxkIG5vdCBmaW5kIGEgY29tbWFuZCBmcm9tIHRoZSBhcmd1bWVudHMgYW5kIHRoZSBoZWxwIGNvbW1hbmQgc2VlbXMgdG8gYmUgZGlzYWJsZWQuXG4gICAgICAgIFRoaXMgaXMgYW4gaXNzdWUgd2l0aCB0aGUgQ0xJIGl0c2VsZi4gSWYgeW91IHNlZSB0aGlzIGNvbW1lbnQsIHBsZWFzZSByZXBvcnQgaXQgYW5kXG4gICAgICAgIHByb3ZpZGUgeW91ciByZXBvc2l0b3J5LlxuICAgICAgYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGlmICghZGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBjb21tYW5kc0Rpc3RhbmNlID0ge30gYXMgeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH07XG4gICAgY29uc3QgbmFtZSA9IGNvbW1hbmROYW1lO1xuICAgIGNvbnN0IGFsbENvbW1hbmRzID0gT2JqZWN0LmtleXMoY29tbWFuZE1hcCkuc29ydCgoYSwgYikgPT4ge1xuICAgICAgaWYgKCEoYSBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2FdID0gc3RyaW5ncy5sZXZlbnNodGVpbihhLCBuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmICghKGIgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgY29tbWFuZHNEaXN0YW5jZVtiXSA9IHN0cmluZ3MubGV2ZW5zaHRlaW4oYiwgbmFtZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb21tYW5kc0Rpc3RhbmNlW2FdIC0gY29tbWFuZHNEaXN0YW5jZVtiXTtcbiAgICB9KTtcblxuICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGUgc3BlY2lmaWVkIGNvbW1hbmQgKFwiJHtjb21tYW5kTmFtZX1cIikgaXMgaW52YWxpZC4gRm9yIGEgbGlzdCBvZiBhdmFpbGFibGUgb3B0aW9ucyxcbiAgICAgICAgcnVuIFwibmcgaGVscFwiLlxuXG4gICAgICAgIERpZCB5b3UgbWVhbiBcIiR7YWxsQ29tbWFuZHNbMF19XCI/XG4gICAgYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZXIucGFyc2VBcmd1bWVudHMoYXJncywgZGVzY3JpcHRpb24ub3B0aW9ucyk7XG4gIENvbW1hbmQuc2V0Q29tbWFuZE1hcChjb21tYW5kTWFwKTtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBkZXNjcmlwdGlvbi5pbXBsKHsgd29ya3NwYWNlIH0sIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuXG4gIHJldHVybiBhd2FpdCBjb21tYW5kLnZhbGlkYXRlQW5kUnVuKHBhcnNlZE9wdGlvbnMpO1xufVxuIl19