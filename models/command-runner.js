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
        else {
            return null;
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
        commandMap[name] =
            await json_schema_1.parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema, logger);
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
    try {
        const parsedOptions = parser.parseArguments(args, description.options);
        command_1.Command.setCommandMap(commandMap);
        const command = new description.impl({ workspace }, description, logger);
        return await command.validateAndRun(parsedOptions);
    }
    catch (e) {
        if (e instanceof parser.ParseArgumentException) {
            logger.fatal('Cannot parse arguments. See below for the reasons.');
            logger.fatal('    ' + e.comments.join('\n    '));
            return 1;
        }
        else {
            throw e;
        }
    }
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVE4QjtBQUM5QiwyQkFBa0M7QUFDbEMsK0JBQThDO0FBQzlDLCtCQUEwQjtBQUMxQixrREFBOEM7QUFDOUMsMERBQStFO0FBQy9FLHVDQUFvQztBQU1wQyxtQ0FBbUM7QUFPbkM7Ozs7OztHQU1HO0FBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FDOUIsSUFBYyxFQUNkLE1BQXNCLEVBQ3RCLFNBQTJCLEVBQzNCLFFBQTRCO0lBRTVCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtRQUMxQixNQUFNLGNBQWMsR0FBRyxnQkFBTSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO1FBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLGlCQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sV0FBVyxHQUFHLFdBQUksQ0FBQyxTQUFTLENBQ2hDLFlBQVksRUFDWixvQkFBYSxDQUFDLEtBQUssRUFDbkIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQ3pCLENBQUM7UUFDRixJQUFJLENBQUMsbUJBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixNQUFNLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ3JDO1FBRUQsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNkLEtBQUssTUFBTSxXQUFXLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENB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LE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRWpELE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7YUFBTTtZQUNMLE1BQU0sQ0FBQyxDQUFDO1NBQ1Q7S0FDRjtBQUNILENBQUM7QUEvSkQsZ0NBK0pDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgSnNvblBhcnNlTW9kZSxcbiAgaXNKc29uT2JqZWN0LFxuICBqc29uLFxuICBsb2dnaW5nLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7XG4gIENvbW1hbmREZXNjcmlwdGlvbixcbiAgQ29tbWFuZERlc2NyaXB0aW9uTWFwLFxuICBDb21tYW5kV29ya3NwYWNlLFxufSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSAnLi9wYXJzZXInO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE1hcE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG59XG5cbi8qKlxuICogUnVuIGEgY29tbWFuZC5cbiAqIEBwYXJhbSBhcmdzIFJhdyB1bnBhcnNlZCBhcmd1bWVudHMuXG4gKiBAcGFyYW0gbG9nZ2VyIFRoZSBsb2dnZXIgdG8gdXNlLlxuICogQHBhcmFtIHdvcmtzcGFjZSBXb3Jrc3BhY2UgaW5mb3JtYXRpb24uXG4gKiBAcGFyYW0gY29tbWFuZHMgVGhlIG1hcCBvZiBzdXBwb3J0ZWQgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBDb21tYW5kV29ya3NwYWNlLFxuICBjb21tYW5kcz86IENvbW1hbmRNYXBPcHRpb25zLFxuKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gIGlmIChjb21tYW5kcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgY29tbWFuZE1hcFBhdGggPSBmaW5kVXAoJ2NvbW1hbmRzLmpzb24nLCBfX2Rpcm5hbWUpO1xuICAgIGlmIChjb21tYW5kTWFwUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBjb21tYW5kIG1hcC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpRGlyID0gZGlybmFtZShjb21tYW5kTWFwUGF0aCk7XG4gICAgY29uc3QgY29tbWFuZHNUZXh0ID0gcmVhZEZpbGVTeW5jKGNvbW1hbmRNYXBQYXRoKS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBjb21tYW5kSnNvbiA9IGpzb24ucGFyc2VKc29uKFxuICAgICAgY29tbWFuZHNUZXh0LFxuICAgICAgSnNvblBhcnNlTW9kZS5Mb29zZSxcbiAgICAgIHsgcGF0aDogY29tbWFuZE1hcFBhdGggfSxcbiAgICApO1xuICAgIGlmICghaXNKc29uT2JqZWN0KGNvbW1hbmRKc29uKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0ludmFsaWQgY29tbWFuZC5qc29uJyk7XG4gICAgfVxuXG4gICAgY29tbWFuZHMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmROYW1lIG9mIE9iamVjdC5rZXlzKGNvbW1hbmRKc29uKSkge1xuICAgICAgY29uc3QgY29tbWFuZFZhbHVlID0gY29tbWFuZEpzb25bY29tbWFuZE5hbWVdO1xuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kVmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29tbWFuZHNbY29tbWFuZE5hbWVdID0gcmVzb2x2ZShjbGlEaXIsIGNvbW1hbmRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGhpcyByZWdpc3RyeSBpcyBleGNsdXNpdmVseSB1c2VkIGZvciBmbGF0dGVuaW5nIHNjaGVtYXMsIGFuZCBub3QgZm9yIHZhbGlkYXRpbmcuXG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoW10pO1xuICByZWdpc3RyeS5yZWdpc3RlclVyaUhhbmRsZXIoKHVyaTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHVyaS5zdGFydHNXaXRoKCduZy1jbGk6Ly8nKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uJywgdXJpLnN1YnN0cignbmctY2xpOi8vJy5sZW5ndGgpKSwgJ3V0Zi04Jyk7XG5cbiAgICAgIHJldHVybiBvZihKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9KTtcblxuICAvLyBOb3JtYWxpemUgdGhlIGNvbW1hbmRNYXBcbiAgY29uc3QgY29tbWFuZE1hcDogQ29tbWFuZERlc2NyaXB0aW9uTWFwID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kcykpIHtcbiAgICBjb25zdCBzY2hlbWFQYXRoID0gY29tbWFuZHNbbmFtZV07XG4gICAgY29uc3Qgc2NoZW1hQ29udGVudCA9IHJlYWRGaWxlU3luYyhzY2hlbWFQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBzY2hlbWEgPSBqc29uLnBhcnNlSnNvbihzY2hlbWFDb250ZW50LCBKc29uUGFyc2VNb2RlLkxvb3NlLCB7IHBhdGg6IHNjaGVtYVBhdGggfSk7XG4gICAgaWYgKCFpc0pzb25PYmplY3Qoc2NoZW1hKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQgSlNPTiBsb2FkZWQgZnJvbSAnICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hUGF0aCkpO1xuICAgIH1cblxuICAgIGNvbW1hbmRNYXBbbmFtZV0gPVxuICAgICAgYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24obmFtZSwgc2NoZW1hUGF0aCwgcmVnaXN0cnksIHNjaGVtYSwgbG9nZ2VyKTtcbiAgfVxuXG4gIGxldCBjb21tYW5kTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKGFyZyBpbiBjb21tYW5kTWFwKSB7XG4gICAgICBjb21tYW5kTmFtZSA9IGFyZztcbiAgICAgIGFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIGlmICghYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIG5vIGNvbW1hbmRzIHdlcmUgZm91bmQsIHVzZSBgaGVscGAuXG4gIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIGFyZ3NbMF0gPT09ICctLXZlcnNpb24nKSB7XG4gICAgICBjb21tYW5kTmFtZSA9ICd2ZXJzaW9uJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29tbWFuZE5hbWUgPSAnaGVscCc7XG4gICAgfVxuICB9XG5cbiAgbGV0IGRlc2NyaXB0aW9uOiBDb21tYW5kRGVzY3JpcHRpb24gfCBudWxsID0gbnVsbDtcblxuICBpZiAoY29tbWFuZE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChjb21tYW5kTWFwW2NvbW1hbmROYW1lXSkge1xuICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kTWFwW2NvbW1hbmROYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMoY29tbWFuZE1hcCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gY29tbWFuZE1hcFtuYW1lXTtcbiAgICAgICAgY29uc3QgYWxpYXNlcyA9IGNvbW1hbmREZXNjcmlwdGlvbi5hbGlhc2VzO1xuXG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICAgIGlmIChhbGlhc2VzLnNvbWUoYWxpYXMgPT4gYWxpYXMgPT09IGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBtdWx0aXBsZSBjb21tYW5kcyB3aXRoIHRoZSBzYW1lIGFsaWFzLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21tYW5kTmFtZSA9IG5hbWU7XG4gICAgICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kRGVzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29tbWFuZE5hbWUpIHtcbiAgICBsb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgV2UgY291bGQgbm90IGZpbmQgYSBjb21tYW5kIGZyb20gdGhlIGFyZ3VtZW50cyBhbmQgdGhlIGhlbHAgY29tbWFuZCBzZWVtcyB0byBiZSBkaXNhYmxlZC5cbiAgICAgICAgVGhpcyBpcyBhbiBpc3N1ZSB3aXRoIHRoZSBDTEkgaXRzZWxmLiBJZiB5b3Ugc2VlIHRoaXMgY29tbWVudCwgcGxlYXNlIHJlcG9ydCBpdCBhbmRcbiAgICAgICAgcHJvdmlkZSB5b3VyIHJlcG9zaXRvcnkuXG4gICAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgaWYgKCFkZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGNvbW1hbmRzRGlzdGFuY2UgPSB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBudW1iZXIgfTtcbiAgICBjb25zdCBuYW1lID0gY29tbWFuZE5hbWU7XG4gICAgY29uc3QgYWxsQ29tbWFuZHMgPSBPYmplY3Qua2V5cyhjb21tYW5kTWFwKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoIShhIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYV0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGEsIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKCEoYiBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2JdID0gc3RyaW5ncy5sZXZlbnNodGVpbihiLCBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbW1hbmRzRGlzdGFuY2VbYV0gLSBjb21tYW5kc0Rpc3RhbmNlW2JdO1xuICAgIH0pO1xuXG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoZSBzcGVjaWZpZWQgY29tbWFuZCAoXCIke2NvbW1hbmROYW1lfVwiKSBpcyBpbnZhbGlkLiBGb3IgYSBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zLFxuICAgICAgICBydW4gXCJuZyBoZWxwXCIuXG5cbiAgICAgICAgRGlkIHlvdSBtZWFuIFwiJHthbGxDb21tYW5kc1swXX1cIj9cbiAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VyLnBhcnNlQXJndW1lbnRzKGFyZ3MsIGRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuICAgIENvbW1hbmQuc2V0Q29tbWFuZE1hcChjb21tYW5kTWFwKTtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IGRlc2NyaXB0aW9uLmltcGwoeyB3b3Jrc3BhY2UgfSwgZGVzY3JpcHRpb24sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gYXdhaXQgY29tbWFuZC52YWxpZGF0ZUFuZFJ1bihwYXJzZWRPcHRpb25zKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgcGFyc2VyLlBhcnNlQXJndW1lbnRFeGNlcHRpb24pIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQ2Fubm90IHBhcnNlIGFyZ3VtZW50cy4gU2VlIGJlbG93IGZvciB0aGUgcmVhc29ucy4nKTtcbiAgICAgIGxvZ2dlci5mYXRhbCgnICAgICcgKyBlLmNvbW1lbnRzLmpvaW4oJ1xcbiAgICAnKSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuIl19