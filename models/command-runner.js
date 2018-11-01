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
            return Promise.resolve(JSON.parse(content));
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
            await json_schema_1.parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVE4QjtBQUM5QiwyQkFBa0M7QUFDbEMsK0JBQThDO0FBQzlDLGtEQUE4QztBQUM5QywwREFBK0U7QUFDL0UsdUNBQW9DO0FBTXBDLG1DQUFtQztBQU9uQzs7Ozs7O0dBTUc7QUFDSSxLQUFLLFVBQVUsVUFBVSxDQUM5QixJQUFjLEVBQ2QsTUFBc0IsRUFDdEIsU0FBMkIsRUFDM0IsUUFBNEI7SUFFNUIsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO1FBQzFCLE1BQU0sY0FBYyxHQUFHLGdCQUFNLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFELElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7U0FDaEQ7UUFDRCxNQUFNLE1BQU0sR0FBRyxjQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsaUJBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEUsTUFBTSxXQUFXLEdBQUcsV0FBSSxDQUFDLFNBQVMsQ0FDaEMsWUFBWSxFQUNaLG9CQUFhLENBQUMsS0FBSyxFQUNuQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FDekIsQ0FBQztRQUNGLElBQUksQ0FBQyxtQkFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzlCLE1BQU0sS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDckM7UUFFRCxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2QsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2xE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QUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFFakQsT0FBTyxDQUFDLENBQUM7U0FDVjthQUFNO1lBQ0wsTUFBTSxDQUFDLENBQUM7U0FDVDtLQUNGO0FBQ0gsQ0FBQztBQS9KRCxnQ0ErSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBKc29uUGFyc2VNb2RlLFxuICBpc0pzb25PYmplY3QsXG4gIGpzb24sXG4gIGxvZ2dpbmcsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2ZpbmQtdXAnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24gfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQge1xuICBDb21tYW5kRGVzY3JpcHRpb24sXG4gIENvbW1hbmREZXNjcmlwdGlvbk1hcCxcbiAgQ29tbWFuZFdvcmtzcGFjZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0ICogYXMgcGFyc2VyIGZyb20gJy4vcGFyc2VyJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRNYXBPcHRpb25zIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJ1biBhIGNvbW1hbmQuXG4gKiBAcGFyYW0gYXJncyBSYXcgdW5wYXJzZWQgYXJndW1lbnRzLlxuICogQHBhcmFtIGxvZ2dlciBUaGUgbG9nZ2VyIHRvIHVzZS5cbiAqIEBwYXJhbSB3b3Jrc3BhY2UgV29ya3NwYWNlIGluZm9ybWF0aW9uLlxuICogQHBhcmFtIGNvbW1hbmRzIFRoZSBtYXAgb2Ygc3VwcG9ydGVkIGNvbW1hbmRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgYXJnczogc3RyaW5nW10sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogQ29tbWFuZFdvcmtzcGFjZSxcbiAgY29tbWFuZHM/OiBDb21tYW5kTWFwT3B0aW9ucyxcbik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICBpZiAoY29tbWFuZHMgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGNvbW1hbmRNYXBQYXRoID0gZmluZFVwKCdjb21tYW5kcy5qc29uJywgX19kaXJuYW1lKTtcbiAgICBpZiAoY29tbWFuZE1hcFBhdGggPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgY29tbWFuZCBtYXAuJyk7XG4gICAgfVxuICAgIGNvbnN0IGNsaURpciA9IGRpcm5hbWUoY29tbWFuZE1hcFBhdGgpO1xuICAgIGNvbnN0IGNvbW1hbmRzVGV4dCA9IHJlYWRGaWxlU3luYyhjb21tYW5kTWFwUGF0aCkudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29tbWFuZEpzb24gPSBqc29uLnBhcnNlSnNvbihcbiAgICAgIGNvbW1hbmRzVGV4dCxcbiAgICAgIEpzb25QYXJzZU1vZGUuTG9vc2UsXG4gICAgICB7IHBhdGg6IGNvbW1hbmRNYXBQYXRoIH0sXG4gICAgKTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChjb21tYW5kSnNvbikpIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQuanNvbicpO1xuICAgIH1cblxuICAgIGNvbW1hbmRzID0ge307XG4gICAgZm9yIChjb25zdCBjb21tYW5kTmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kSnNvbikpIHtcbiAgICAgIGNvbnN0IGNvbW1hbmRWYWx1ZSA9IGNvbW1hbmRKc29uW2NvbW1hbmROYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgY29tbWFuZFZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbW1hbmRzW2NvbW1hbmROYW1lXSA9IHJlc29sdmUoY2xpRGlyLCBjb21tYW5kVmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgcmVnaXN0cnkgaXMgZXhjbHVzaXZlbHkgdXNlZCBmb3IgZmxhdHRlbmluZyBzY2hlbWFzLCBhbmQgbm90IGZvciB2YWxpZGF0aW5nLlxuICBjb25zdCByZWdpc3RyeSA9IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KFtdKTtcbiAgcmVnaXN0cnkucmVnaXN0ZXJVcmlIYW5kbGVyKCh1cmk6IHN0cmluZykgPT4ge1xuICAgIGlmICh1cmkuc3RhcnRzV2l0aCgnbmctY2xpOi8vJykpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLicsIHVyaS5zdWJzdHIoJ25nLWNsaTovLycubGVuZ3RoKSksICd1dGYtOCcpO1xuXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEpTT04ucGFyc2UoY29udGVudCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgY29tbWFuZE1hcFxuICBjb25zdCBjb21tYW5kTWFwOiBDb21tYW5kRGVzY3JpcHRpb25NYXAgPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGNvbW1hbmRzKSkge1xuICAgIGNvbnN0IHNjaGVtYVBhdGggPSBjb21tYW5kc1tuYW1lXTtcbiAgICBjb25zdCBzY2hlbWFDb250ZW50ID0gcmVhZEZpbGVTeW5jKHNjaGVtYVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHNjaGVtYSA9IGpzb24ucGFyc2VKc29uKHNjaGVtYUNvbnRlbnQsIEpzb25QYXJzZU1vZGUuTG9vc2UsIHsgcGF0aDogc2NoZW1hUGF0aCB9KTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChzY2hlbWEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCBKU09OIGxvYWRlZCBmcm9tICcgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFQYXRoKSk7XG4gICAgfVxuXG4gICAgY29tbWFuZE1hcFtuYW1lXSA9XG4gICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBzY2hlbWFQYXRoLCByZWdpc3RyeSwgc2NoZW1hKTtcbiAgfVxuXG4gIGxldCBjb21tYW5kTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKGFyZyBpbiBjb21tYW5kTWFwKSB7XG4gICAgICBjb21tYW5kTmFtZSA9IGFyZztcbiAgICAgIGFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIGlmICghYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIG5vIGNvbW1hbmRzIHdlcmUgZm91bmQsIHVzZSBgaGVscGAuXG4gIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIGFyZ3NbMF0gPT09ICctLXZlcnNpb24nKSB7XG4gICAgICBjb21tYW5kTmFtZSA9ICd2ZXJzaW9uJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29tbWFuZE5hbWUgPSAnaGVscCc7XG4gICAgfVxuICB9XG5cbiAgbGV0IGRlc2NyaXB0aW9uOiBDb21tYW5kRGVzY3JpcHRpb24gfCBudWxsID0gbnVsbDtcblxuICBpZiAoY29tbWFuZE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChjb21tYW5kTWFwW2NvbW1hbmROYW1lXSkge1xuICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kTWFwW2NvbW1hbmROYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMoY29tbWFuZE1hcCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gY29tbWFuZE1hcFtuYW1lXTtcbiAgICAgICAgY29uc3QgYWxpYXNlcyA9IGNvbW1hbmREZXNjcmlwdGlvbi5hbGlhc2VzO1xuXG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICAgIGlmIChhbGlhc2VzLnNvbWUoYWxpYXMgPT4gYWxpYXMgPT09IGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBtdWx0aXBsZSBjb21tYW5kcyB3aXRoIHRoZSBzYW1lIGFsaWFzLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21tYW5kTmFtZSA9IG5hbWU7XG4gICAgICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kRGVzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29tbWFuZE5hbWUpIHtcbiAgICBsb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgV2UgY291bGQgbm90IGZpbmQgYSBjb21tYW5kIGZyb20gdGhlIGFyZ3VtZW50cyBhbmQgdGhlIGhlbHAgY29tbWFuZCBzZWVtcyB0byBiZSBkaXNhYmxlZC5cbiAgICAgICAgVGhpcyBpcyBhbiBpc3N1ZSB3aXRoIHRoZSBDTEkgaXRzZWxmLiBJZiB5b3Ugc2VlIHRoaXMgY29tbWVudCwgcGxlYXNlIHJlcG9ydCBpdCBhbmRcbiAgICAgICAgcHJvdmlkZSB5b3VyIHJlcG9zaXRvcnkuXG4gICAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgaWYgKCFkZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGNvbW1hbmRzRGlzdGFuY2UgPSB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBudW1iZXIgfTtcbiAgICBjb25zdCBuYW1lID0gY29tbWFuZE5hbWU7XG4gICAgY29uc3QgYWxsQ29tbWFuZHMgPSBPYmplY3Qua2V5cyhjb21tYW5kTWFwKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoIShhIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYV0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGEsIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKCEoYiBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2JdID0gc3RyaW5ncy5sZXZlbnNodGVpbihiLCBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbW1hbmRzRGlzdGFuY2VbYV0gLSBjb21tYW5kc0Rpc3RhbmNlW2JdO1xuICAgIH0pO1xuXG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoZSBzcGVjaWZpZWQgY29tbWFuZCAoXCIke2NvbW1hbmROYW1lfVwiKSBpcyBpbnZhbGlkLiBGb3IgYSBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zLFxuICAgICAgICBydW4gXCJuZyBoZWxwXCIuXG5cbiAgICAgICAgRGlkIHlvdSBtZWFuIFwiJHthbGxDb21tYW5kc1swXX1cIj9cbiAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VyLnBhcnNlQXJndW1lbnRzKGFyZ3MsIGRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuICAgIENvbW1hbmQuc2V0Q29tbWFuZE1hcChjb21tYW5kTWFwKTtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IGRlc2NyaXB0aW9uLmltcGwoeyB3b3Jrc3BhY2UgfSwgZGVzY3JpcHRpb24sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gYXdhaXQgY29tbWFuZC52YWxpZGF0ZUFuZFJ1bihwYXJzZWRPcHRpb25zKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgcGFyc2VyLlBhcnNlQXJndW1lbnRFeGNlcHRpb24pIHtcbiAgICAgIGxvZ2dlci5mYXRhbCgnQ2Fubm90IHBhcnNlIGFyZ3VtZW50cy4gU2VlIGJlbG93IGZvciB0aGUgcmVhc29ucy4nKTtcbiAgICAgIGxvZ2dlci5mYXRhbCgnICAgICcgKyBlLmNvbW1lbnRzLmpvaW4oJ1xcbiAgICAnKSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuIl19