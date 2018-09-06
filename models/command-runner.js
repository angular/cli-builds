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
function runCommand(args, logger, workspace, commands) {
    return __awaiter(this, void 0, void 0, function* () {
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
            commandMap[name] = yield json_schema_1.parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema);
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
            commandName = 'help';
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
        return yield command.validateAndRun(parsedOptions);
    });
}
exports.runCommand = runCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUThCO0FBQzlCLDJCQUFrQztBQUNsQywrQkFBOEM7QUFDOUMsK0JBQTBCO0FBQzFCLGtEQUE4QztBQUM5QywwREFBK0U7QUFDL0UsdUNBQW9DO0FBTXBDLG1DQUFtQztBQU9uQzs7Ozs7O0dBTUc7QUFDSCxTQUFzQixVQUFVLENBQzlCLElBQWMsRUFDZCxNQUFzQixFQUN0QixTQUEyQixFQUMzQixRQUE0Qjs7UUFFNUIsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQzFCLE1BQU0sY0FBYyxHQUFHLGdCQUFNLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFELElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtnQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLGlCQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sV0FBVyxHQUFHLFdBQUksQ0FBQyxTQUFTLENBQ2hDLFlBQVksRUFDWixvQkFBYSxDQUFDLEtBQUssRUFDbkIsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQ3pCLENBQUM7WUFDRixJQUFJLENBQUMsbUJBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQzthQUNyQztZQUVELFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDZCxLQUFLLE1BQU0sV0FBVyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMs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QUFJLENBQUMsQ0FBQztpQkFDcEQ7Z0JBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEVBQUU7b0JBQzVCLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLGNBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNwRDtnQkFFRCxPQUFPLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFJLENBQUMsV0FBVyxDQUFBO2tDQUNDLFdBQVc7Ozt3QkFHckIsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUNqQyxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZFLGlCQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV6RSxPQUFPLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQUE7QUFsSkQsZ0NBa0pDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgSnNvblBhcnNlTW9kZSxcbiAgaXNKc29uT2JqZWN0LFxuICBqc29uLFxuICBsb2dnaW5nLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7XG4gIENvbW1hbmREZXNjcmlwdGlvbixcbiAgQ29tbWFuZERlc2NyaXB0aW9uTWFwLFxuICBDb21tYW5kV29ya3NwYWNlLFxufSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSAnLi9wYXJzZXInO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE1hcE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG59XG5cbi8qKlxuICogUnVuIGEgY29tbWFuZC5cbiAqIEBwYXJhbSBhcmdzIFJhdyB1bnBhcnNlZCBhcmd1bWVudHMuXG4gKiBAcGFyYW0gbG9nZ2VyIFRoZSBsb2dnZXIgdG8gdXNlLlxuICogQHBhcmFtIHdvcmtzcGFjZSBXb3Jrc3BhY2UgaW5mb3JtYXRpb24uXG4gKiBAcGFyYW0gY29tbWFuZHMgVGhlIG1hcCBvZiBzdXBwb3J0ZWQgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlcixcbiAgd29ya3NwYWNlOiBDb21tYW5kV29ya3NwYWNlLFxuICBjb21tYW5kcz86IENvbW1hbmRNYXBPcHRpb25zLFxuKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gIGlmIChjb21tYW5kcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgY29tbWFuZE1hcFBhdGggPSBmaW5kVXAoJ2NvbW1hbmRzLmpzb24nLCBfX2Rpcm5hbWUpO1xuICAgIGlmIChjb21tYW5kTWFwUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBjb21tYW5kIG1hcC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpRGlyID0gZGlybmFtZShjb21tYW5kTWFwUGF0aCk7XG4gICAgY29uc3QgY29tbWFuZHNUZXh0ID0gcmVhZEZpbGVTeW5jKGNvbW1hbmRNYXBQYXRoKS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBjb21tYW5kSnNvbiA9IGpzb24ucGFyc2VKc29uKFxuICAgICAgY29tbWFuZHNUZXh0LFxuICAgICAgSnNvblBhcnNlTW9kZS5Mb29zZSxcbiAgICAgIHsgcGF0aDogY29tbWFuZE1hcFBhdGggfSxcbiAgICApO1xuICAgIGlmICghaXNKc29uT2JqZWN0KGNvbW1hbmRKc29uKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0ludmFsaWQgY29tbWFuZC5qc29uJyk7XG4gICAgfVxuXG4gICAgY29tbWFuZHMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmROYW1lIG9mIE9iamVjdC5rZXlzKGNvbW1hbmRKc29uKSkge1xuICAgICAgY29uc3QgY29tbWFuZFZhbHVlID0gY29tbWFuZEpzb25bY29tbWFuZE5hbWVdO1xuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kVmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29tbWFuZHNbY29tbWFuZE5hbWVdID0gcmVzb2x2ZShjbGlEaXIsIGNvbW1hbmRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGhpcyByZWdpc3RyeSBpcyBleGNsdXNpdmVseSB1c2VkIGZvciBmbGF0dGVuaW5nIHNjaGVtYXMsIGFuZCBub3QgZm9yIHZhbGlkYXRpbmcuXG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoW10pO1xuICByZWdpc3RyeS5yZWdpc3RlclVyaUhhbmRsZXIoKHVyaTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHVyaS5zdGFydHNXaXRoKCduZy1jbGk6Ly8nKSkge1xuICAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uJywgdXJpLnN1YnN0cignbmctY2xpOi8vJy5sZW5ndGgpKSwgJ3V0Zi04Jyk7XG5cbiAgICAgIHJldHVybiBvZihKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgY29tbWFuZE1hcFxuICBjb25zdCBjb21tYW5kTWFwOiBDb21tYW5kRGVzY3JpcHRpb25NYXAgPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGNvbW1hbmRzKSkge1xuICAgIGNvbnN0IHNjaGVtYVBhdGggPSBjb21tYW5kc1tuYW1lXTtcbiAgICBjb25zdCBzY2hlbWFDb250ZW50ID0gcmVhZEZpbGVTeW5jKHNjaGVtYVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHNjaGVtYSA9IGpzb24ucGFyc2VKc29uKHNjaGVtYUNvbnRlbnQsIEpzb25QYXJzZU1vZGUuTG9vc2UsIHsgcGF0aDogc2NoZW1hUGF0aCB9KTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChzY2hlbWEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCBKU09OIGxvYWRlZCBmcm9tICcgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFQYXRoKSk7XG4gICAgfVxuXG4gICAgY29tbWFuZE1hcFtuYW1lXSA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uKFxuICAgICAgbmFtZSxcbiAgICAgIHNjaGVtYVBhdGgsXG4gICAgICByZWdpc3RyeSxcbiAgICAgIHNjaGVtYSxcbiAgICApO1xuICB9XG5cbiAgbGV0IGNvbW1hbmROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGFyZyA9IGFyZ3NbaV07XG5cbiAgICBpZiAoYXJnIGluIGNvbW1hbmRNYXApIHtcbiAgICAgIGNvbW1hbmROYW1lID0gYXJnO1xuICAgICAgYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9IGVsc2UgaWYgKCFhcmcuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBjb21tYW5kTmFtZSA9IGFyZztcbiAgICAgIGFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgbm8gY29tbWFuZHMgd2VyZSBmb3VuZCwgdXNlIGBoZWxwYC5cbiAgaWYgKGNvbW1hbmROYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICBjb21tYW5kTmFtZSA9ICdoZWxwJztcbiAgfVxuXG4gIGxldCBkZXNjcmlwdGlvbjogQ29tbWFuZERlc2NyaXB0aW9uIHwgbnVsbCA9IG51bGw7XG5cbiAgaWYgKGNvbW1hbmROYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZE1hcFtjb21tYW5kTmFtZV0pIHtcbiAgICAgIGRlc2NyaXB0aW9uID0gY29tbWFuZE1hcFtjb21tYW5kTmFtZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5rZXlzKGNvbW1hbmRNYXApLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGNvbW1hbmRNYXBbbmFtZV07XG4gICAgICAgIGNvbnN0IGFsaWFzZXMgPSBjb21tYW5kRGVzY3JpcHRpb24uYWxpYXNlcztcblxuICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGFsaWFzZXMpIHtcbiAgICAgICAgICBpZiAoYWxpYXNlcy5zb21lKGFsaWFzID0+IGFsaWFzID09PSBjb21tYW5kTmFtZSkpIHtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgbXVsdGlwbGUgY29tbWFuZHMgd2l0aCB0aGUgc2FtZSBhbGlhcy4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWFuZE5hbWUgPSBuYW1lO1xuICAgICAgICAgIGRlc2NyaXB0aW9uID0gY29tbWFuZERlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbW1hbmROYW1lKSB7XG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFdlIGNvdWxkIG5vdCBmaW5kIGEgY29tbWFuZCBmcm9tIHRoZSBhcmd1bWVudHMgYW5kIHRoZSBoZWxwIGNvbW1hbmQgc2VlbXMgdG8gYmUgZGlzYWJsZWQuXG4gICAgICAgIFRoaXMgaXMgYW4gaXNzdWUgd2l0aCB0aGUgQ0xJIGl0c2VsZi4gSWYgeW91IHNlZSB0aGlzIGNvbW1lbnQsIHBsZWFzZSByZXBvcnQgaXQgYW5kXG4gICAgICAgIHByb3ZpZGUgeW91ciByZXBvc2l0b3J5LlxuICAgICAgYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGlmICghZGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBjb21tYW5kc0Rpc3RhbmNlID0ge30gYXMgeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH07XG4gICAgY29uc3QgbmFtZSA9IGNvbW1hbmROYW1lO1xuICAgIGNvbnN0IGFsbENvbW1hbmRzID0gT2JqZWN0LmtleXMoY29tbWFuZE1hcCkuc29ydCgoYSwgYikgPT4ge1xuICAgICAgaWYgKCEoYSBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2FdID0gc3RyaW5ncy5sZXZlbnNodGVpbihhLCBuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmICghKGIgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgY29tbWFuZHNEaXN0YW5jZVtiXSA9IHN0cmluZ3MubGV2ZW5zaHRlaW4oYiwgbmFtZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb21tYW5kc0Rpc3RhbmNlW2FdIC0gY29tbWFuZHNEaXN0YW5jZVtiXTtcbiAgICB9KTtcblxuICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBUaGUgc3BlY2lmaWVkIGNvbW1hbmQgKFwiJHtjb21tYW5kTmFtZX1cIikgaXMgaW52YWxpZC4gRm9yIGEgbGlzdCBvZiBhdmFpbGFibGUgb3B0aW9ucyxcbiAgICAgICAgcnVuIFwibmcgaGVscFwiLlxuXG4gICAgICAgIERpZCB5b3UgbWVhbiBcIiR7YWxsQ29tbWFuZHNbMF19XCI/XG4gICAgYCk7XG5cbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGNvbnN0IHBhcnNlZE9wdGlvbnMgPSBwYXJzZXIucGFyc2VBcmd1bWVudHMoYXJncywgZGVzY3JpcHRpb24ub3B0aW9ucyk7XG4gIENvbW1hbmQuc2V0Q29tbWFuZE1hcChjb21tYW5kTWFwKTtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBkZXNjcmlwdGlvbi5pbXBsKHsgd29ya3NwYWNlIH0sIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuXG4gIHJldHVybiBhd2FpdCBjb21tYW5kLnZhbGlkYXRlQW5kUnVuKHBhcnNlZE9wdGlvbnMpO1xufVxuIl19