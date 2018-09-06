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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUThCO0FBQzlCLDJCQUFrQztBQUNsQywrQkFBOEM7QUFDOUMsK0JBQTBCO0FBQzFCLGtEQUE4QztBQUM5QywwREFBK0U7QUFDL0UsdUNBQW9DO0FBTXBDLG1DQUFtQztBQU9uQzs7Ozs7O0dBTUc7QUFDSCxvQkFDRSxJQUFjLEVBQ2QsTUFBc0IsRUFDdEIsU0FBMkIsRUFDM0IsUUFBNEI7O1FBRTVCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtZQUMxQixNQUFNLGNBQWMsR0FBRyxnQkFBTSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxRCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7Z0JBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUNoRDtZQUNELE1BQU0sTUFBTSxHQUFHLGNBQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN2QyxNQUFNLFlBQVksR0FBRyxpQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwRSxNQUFNLFdBQVcsR0FBRyxXQUFJLENBQUMsU0FBUyxDQUNoQyxZQUFZLEVBQ1osb0JBQWEsQ0FBQyxLQUFLLEVBQ25CLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUN6QixDQUFDO1lBQ0YsSUFBSSxDQUFDLG1CQUFZLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQzlCLE1BQU0sS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7YUFDckM7WUFFRCxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxF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QUM7aUJBQ3BEO2dCQUNELElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFO29CQUM1QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDcEQ7Z0JBRUQsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLFdBQVcsQ0FBQTtrQ0FDQyxXQUFXOzs7d0JBR3JCLFdBQVcsQ0FBQyxDQUFDLENBQUM7S0FDakMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RSxpQkFBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFekUsT0FBTyxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQUFBO0FBbEpELGdDQWtKQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEpzb25QYXJzZU1vZGUsXG4gIGlzSnNvbk9iamVjdCxcbiAganNvbixcbiAgbG9nZ2luZyxcbiAgc2NoZW1hLFxuICBzdHJpbmdzLFxuICB0YWdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2ZpbmQtdXAnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQge1xuICBDb21tYW5kRGVzY3JpcHRpb24sXG4gIENvbW1hbmREZXNjcmlwdGlvbk1hcCxcbiAgQ29tbWFuZFdvcmtzcGFjZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0ICogYXMgcGFyc2VyIGZyb20gJy4vcGFyc2VyJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNYXBPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJ1biBhIGNvbW1hbmQuXG4gKiBAcGFyYW0gYXJncyBSYXcgdW5wYXJzZWQgYXJndW1lbnRzLlxuICogQHBhcmFtIGxvZ2dlciBUaGUgbG9nZ2VyIHRvIHVzZS5cbiAqIEBwYXJhbSB3b3Jrc3BhY2UgV29ya3NwYWNlIGluZm9ybWF0aW9uLlxuICogQHBhcmFtIGNvbW1hbmRzIFRoZSBtYXAgb2Ygc3VwcG9ydGVkIGNvbW1hbmRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgYXJnczogc3RyaW5nW10sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogQ29tbWFuZFdvcmtzcGFjZSxcbiAgY29tbWFuZHM/OiBDb21tYW5kTWFwT3B0aW9ucyxcbik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICBpZiAoY29tbWFuZHMgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGNvbW1hbmRNYXBQYXRoID0gZmluZFVwKCdjb21tYW5kcy5qc29uJywgX19kaXJuYW1lKTtcbiAgICBpZiAoY29tbWFuZE1hcFBhdGggPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgY29tbWFuZCBtYXAuJyk7XG4gICAgfVxuICAgIGNvbnN0IGNsaURpciA9IGRpcm5hbWUoY29tbWFuZE1hcFBhdGgpO1xuICAgIGNvbnN0IGNvbW1hbmRzVGV4dCA9IHJlYWRGaWxlU3luYyhjb21tYW5kTWFwUGF0aCkudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29tbWFuZEpzb24gPSBqc29uLnBhcnNlSnNvbihcbiAgICAgIGNvbW1hbmRzVGV4dCxcbiAgICAgIEpzb25QYXJzZU1vZGUuTG9vc2UsXG4gICAgICB7IHBhdGg6IGNvbW1hbmRNYXBQYXRoIH0sXG4gICAgKTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChjb21tYW5kSnNvbikpIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQuanNvbicpO1xuICAgIH1cblxuICAgIGNvbW1hbmRzID0ge307XG4gICAgZm9yIChjb25zdCBjb21tYW5kTmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kSnNvbikpIHtcbiAgICAgIGNvbnN0IGNvbW1hbmRWYWx1ZSA9IGNvbW1hbmRKc29uW2NvbW1hbmROYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgY29tbWFuZFZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbW1hbmRzW2NvbW1hbmROYW1lXSA9IHJlc29sdmUoY2xpRGlyLCBjb21tYW5kVmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgcmVnaXN0cnkgaXMgZXhjbHVzaXZlbHkgdXNlZCBmb3IgZmxhdHRlbmluZyBzY2hlbWFzLCBhbmQgbm90IGZvciB2YWxpZGF0aW5nLlxuICBjb25zdCByZWdpc3RyeSA9IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KFtdKTtcbiAgcmVnaXN0cnkucmVnaXN0ZXJVcmlIYW5kbGVyKCh1cmk6IHN0cmluZykgPT4ge1xuICAgIGlmICh1cmkuc3RhcnRzV2l0aCgnbmctY2xpOi8vJykpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLicsIHVyaS5zdWJzdHIoJ25nLWNsaTovLycubGVuZ3RoKSksICd1dGYtOCcpO1xuXG4gICAgICByZXR1cm4gb2YoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBOb3JtYWxpemUgdGhlIGNvbW1hbmRNYXBcbiAgY29uc3QgY29tbWFuZE1hcDogQ29tbWFuZERlc2NyaXB0aW9uTWFwID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kcykpIHtcbiAgICBjb25zdCBzY2hlbWFQYXRoID0gY29tbWFuZHNbbmFtZV07XG4gICAgY29uc3Qgc2NoZW1hQ29udGVudCA9IHJlYWRGaWxlU3luYyhzY2hlbWFQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBzY2hlbWEgPSBqc29uLnBhcnNlSnNvbihzY2hlbWFDb250ZW50LCBKc29uUGFyc2VNb2RlLkxvb3NlLCB7IHBhdGg6IHNjaGVtYVBhdGggfSk7XG4gICAgaWYgKCFpc0pzb25PYmplY3Qoc2NoZW1hKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQgSlNPTiBsb2FkZWQgZnJvbSAnICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hUGF0aCkpO1xuICAgIH1cblxuICAgIGNvbW1hbmRNYXBbbmFtZV0gPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihcbiAgICAgIG5hbWUsXG4gICAgICBzY2hlbWFQYXRoLFxuICAgICAgcmVnaXN0cnksXG4gICAgICBzY2hlbWEsXG4gICAgKTtcbiAgfVxuXG4gIGxldCBjb21tYW5kTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKGFyZyBpbiBjb21tYW5kTWFwKSB7XG4gICAgICBjb21tYW5kTmFtZSA9IGFyZztcbiAgICAgIGFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIGlmICghYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIG5vIGNvbW1hbmRzIHdlcmUgZm91bmQsIHVzZSBgaGVscGAuXG4gIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29tbWFuZE5hbWUgPSAnaGVscCc7XG4gIH1cblxuICBsZXQgZGVzY3JpcHRpb246IENvbW1hbmREZXNjcmlwdGlvbiB8IG51bGwgPSBudWxsO1xuXG4gIGlmIChjb21tYW5kTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRNYXBbY29tbWFuZE5hbWVdKSB7XG4gICAgICBkZXNjcmlwdGlvbiA9IGNvbW1hbmRNYXBbY29tbWFuZE5hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3Qua2V5cyhjb21tYW5kTWFwKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBjb25zdCBjb21tYW5kRGVzY3JpcHRpb24gPSBjb21tYW5kTWFwW25hbWVdO1xuICAgICAgICBjb25zdCBhbGlhc2VzID0gY29tbWFuZERlc2NyaXB0aW9uLmFsaWFzZXM7XG5cbiAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGlmIChhbGlhc2VzKSB7XG4gICAgICAgICAgaWYgKGFsaWFzZXMuc29tZShhbGlhcyA9PiBhbGlhcyA9PT0gY29tbWFuZE5hbWUpKSB7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIG11bHRpcGxlIGNvbW1hbmRzIHdpdGggdGhlIHNhbWUgYWxpYXMuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbW1hbmROYW1lID0gbmFtZTtcbiAgICAgICAgICBkZXNjcmlwdGlvbiA9IGNvbW1hbmREZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb21tYW5kTmFtZSkge1xuICAgIGxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBXZSBjb3VsZCBub3QgZmluZCBhIGNvbW1hbmQgZnJvbSB0aGUgYXJndW1lbnRzIGFuZCB0aGUgaGVscCBjb21tYW5kIHNlZW1zIHRvIGJlIGRpc2FibGVkLlxuICAgICAgICBUaGlzIGlzIGFuIGlzc3VlIHdpdGggdGhlIENMSSBpdHNlbGYuIElmIHlvdSBzZWUgdGhpcyBjb21tZW50LCBwbGVhc2UgcmVwb3J0IGl0IGFuZFxuICAgICAgICBwcm92aWRlIHlvdXIgcmVwb3NpdG9yeS5cbiAgICAgIGApO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBpZiAoIWRlc2NyaXB0aW9uKSB7XG4gICAgY29uc3QgY29tbWFuZHNEaXN0YW5jZSA9IHt9IGFzIHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9O1xuICAgIGNvbnN0IG5hbWUgPSBjb21tYW5kTmFtZTtcbiAgICBjb25zdCBhbGxDb21tYW5kcyA9IE9iamVjdC5rZXlzKGNvbW1hbmRNYXApLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGlmICghKGEgaW4gY29tbWFuZHNEaXN0YW5jZSkpIHtcbiAgICAgICAgY29tbWFuZHNEaXN0YW5jZVthXSA9IHN0cmluZ3MubGV2ZW5zaHRlaW4oYSwgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoIShiIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYl0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGIsIG5hbWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29tbWFuZHNEaXN0YW5jZVthXSAtIGNvbW1hbmRzRGlzdGFuY2VbYl07XG4gICAgfSk7XG5cbiAgICBsb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgVGhlIHNwZWNpZmllZCBjb21tYW5kIChcIiR7Y29tbWFuZE5hbWV9XCIpIGlzIGludmFsaWQuIEZvciBhIGxpc3Qgb2YgYXZhaWxhYmxlIG9wdGlvbnMsXG4gICAgICAgIHJ1biBcIm5nIGhlbHBcIi5cblxuICAgICAgICBEaWQgeW91IG1lYW4gXCIke2FsbENvbW1hbmRzWzBdfVwiP1xuICAgIGApO1xuXG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VyLnBhcnNlQXJndW1lbnRzKGFyZ3MsIGRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuICBDb21tYW5kLnNldENvbW1hbmRNYXAoY29tbWFuZE1hcCk7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgZGVzY3JpcHRpb24uaW1wbCh7IHdvcmtzcGFjZSB9LCBkZXNjcmlwdGlvbiwgbG9nZ2VyKTtcblxuICByZXR1cm4gYXdhaXQgY29tbWFuZC52YWxpZGF0ZUFuZFJ1bihwYXJzZWRPcHRpb25zKTtcbn1cbiJdfQ==