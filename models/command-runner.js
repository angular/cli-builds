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
const debug = require("debug");
const fs_1 = require("fs");
const path_1 = require("path");
const find_up_1 = require("../utilities/find-up");
const json_schema_1 = require("../utilities/json-schema");
const analytics_1 = require("./analytics");
const command_1 = require("./command");
const parser = require("./parser");
const analyticsDebug = debug('ng:analytics:commands');
async function _createAnalytics() {
    const config = analytics_1.getGlobalAnalytics();
    switch (config) {
        case undefined:
        case false:
            analyticsDebug('Analytics disabled. Ignoring all analytics.');
            return new core_1.analytics.NoopAnalytics();
        case true:
            analyticsDebug('Analytics enabled, anonymous user.');
            return new analytics_1.UniversalAnalytics('UA-8594346-29', '');
        case 'ci':
            analyticsDebug('Logging analytics as CI.');
            return new analytics_1.UniversalAnalytics('UA-8594346-29', 'ci');
        default:
            analyticsDebug('Analytics enabled. User ID: %j', config);
            return new analytics_1.UniversalAnalytics('UA-8594346-29', config);
    }
}
/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param workspace Workspace information.
 * @param commands The map of supported commands.
 * @param options Additional options.
 */
async function runCommand(args, logger, workspace, commands, options = {}) {
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
        const parsedOptions = parser.parseArguments(args, description.options, logger);
        command_1.Command.setCommandMap(commandMap);
        const analytics = options.analytics || await _createAnalytics();
        const context = { workspace, analytics };
        const command = new description.impl(context, description, logger);
        // Flush on an interval (if the event loop is waiting).
        let analyticsFlushPromise = Promise.resolve();
        setInterval(() => {
            analyticsFlushPromise = analyticsFlushPromise.then(() => analytics.flush());
        }, 1000);
        const result = await command.validateAndRun(parsedOptions);
        // Flush one last time.
        await analyticsFlushPromise.then(() => analytics.flush());
        return result;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9jb21tYW5kLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVM4QjtBQUM5QiwrQkFBK0I7QUFDL0IsMkJBQWtDO0FBQ2xDLCtCQUE4QztBQUM5QyxrREFBOEM7QUFDOUMsMERBQStFO0FBQy9FLDJDQUFzRTtBQUN0RSx1Q0FBb0M7QUFNcEMsbUNBQW1DO0FBRW5DLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBUXRELEtBQUssVUFBVSxnQkFBZ0I7SUFDN0IsTUFBTSxNQUFNLEdBQUcsOEJBQWtCLEVBQUUsQ0FBQztJQUVwQyxRQUFRLE1BQU0sRUFBRTtRQUNkLEtBQUssU0FBUyxDQUFDO1FBQ2YsS0FBSyxLQUFLO1lBQ1IsY0FBYyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFFOUQsT0FBTyxJQUFJLGdCQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFdkMsS0FBSyxJQUFJO1lBQ1AsY0FBYyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFFckQsT0FBTyxJQUFJLDhCQUFrQixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVyRCxLQUFLLElBQUk7WUFDUCxjQUFjLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUUzQyxPQUFPLElBQUksOEJBQWtCLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXZEO1lBQ0UsY0FBYyxDQUFDLGdDQUFnQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXpELE9BQU8sSUFBSSw4QkFBa0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDMUQ7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNJLEtBQUssVUFBVSxVQUFVLENBQzlCLElBQWMsRUFDZCxNQUFzQixFQUN0QixTQUEy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QUFPLENBQUMsRUFBRTtRQUNWLElBQUksQ0FBQyxZQUFZLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRTtZQUM5QyxNQUFNLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7WUFDbkUsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUVqRCxPQUFPLENBQUMsQ0FBQztTQUNWO2FBQU07WUFDTCxNQUFNLENBQUMsQ0FBQztTQUNUO0tBQ0Y7QUFDSCxDQUFDO0FBOUtELGdDQThLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEpzb25QYXJzZU1vZGUsXG4gIGFuYWx5dGljcyxcbiAgaXNKc29uT2JqZWN0LFxuICBqc29uLFxuICBsb2dnaW5nLFxuICBzY2hlbWEsXG4gIHN0cmluZ3MsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uL3V0aWxpdGllcy9maW5kLXVwJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFVuaXZlcnNhbEFuYWx5dGljcywgIGdldEdsb2JhbEFuYWx5dGljcyB9IGZyb20gJy4vYW5hbHl0aWNzJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZERlc2NyaXB0aW9uLFxuICBDb21tYW5kRGVzY3JpcHRpb25NYXAsXG4gIENvbW1hbmRXb3Jrc3BhY2UsXG59IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tICcuL3BhcnNlcic7XG5cbmNvbnN0IGFuYWx5dGljc0RlYnVnID0gZGVidWcoJ25nOmFuYWx5dGljczpjb21tYW5kcycpO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE1hcE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gX2NyZWF0ZUFuYWx5dGljcygpOiBQcm9taXNlPGFuYWx5dGljcy5BbmFseXRpY3M+IHtcbiAgY29uc3QgY29uZmlnID0gZ2V0R2xvYmFsQW5hbHl0aWNzKCk7XG5cbiAgc3dpdGNoIChjb25maWcpIHtcbiAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICBjYXNlIGZhbHNlOlxuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBkaXNhYmxlZC4gSWdub3JpbmcgYWxsIGFuYWx5dGljcy4nKTtcblxuICAgICAgcmV0dXJuIG5ldyBhbmFseXRpY3MuTm9vcEFuYWx5dGljcygpO1xuXG4gICAgY2FzZSB0cnVlOlxuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBlbmFibGVkLCBhbm9ueW1vdXMgdXNlci4nKTtcblxuICAgICAgcmV0dXJuIG5ldyBVbml2ZXJzYWxBbmFseXRpY3MoJ1VBLTg1OTQzNDYtMjknLCAnJyk7XG5cbiAgICBjYXNlICdjaSc6XG4gICAgICBhbmFseXRpY3NEZWJ1ZygnTG9nZ2luZyBhbmFseXRpY3MgYXMgQ0kuJyk7XG5cbiAgICAgIHJldHVybiBuZXcgVW5pdmVyc2FsQW5hbHl0aWNzKCdVQS04NTk0MzQ2LTI5JywgJ2NpJyk7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgYW5hbHl0aWNzRGVidWcoJ0FuYWx5dGljcyBlbmFibGVkLiBVc2VyIElEOiAlaicsIGNvbmZpZyk7XG5cbiAgICAgIHJldHVybiBuZXcgVW5pdmVyc2FsQW5hbHl0aWNzKCdVQS04NTk0MzQ2LTI5JywgY29uZmlnKTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1biBhIGNvbW1hbmQuXG4gKiBAcGFyYW0gYXJncyBSYXcgdW5wYXJzZWQgYXJndW1lbnRzLlxuICogQHBhcmFtIGxvZ2dlciBUaGUgbG9nZ2VyIHRvIHVzZS5cbiAqIEBwYXJhbSB3b3Jrc3BhY2UgV29ya3NwYWNlIGluZm9ybWF0aW9uLlxuICogQHBhcmFtIGNvbW1hbmRzIFRoZSBtYXAgb2Ygc3VwcG9ydGVkIGNvbW1hbmRzLlxuICogQHBhcmFtIG9wdGlvbnMgQWRkaXRpb25hbCBvcHRpb25zLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgYXJnczogc3RyaW5nW10sXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogQ29tbWFuZFdvcmtzcGFjZSxcbiAgY29tbWFuZHM/OiBDb21tYW5kTWFwT3B0aW9ucyxcbiAgb3B0aW9uczogeyBhbmFseXRpY3M/OiBhbmFseXRpY3MuQW5hbHl0aWNzIH0gPSB7fSxcbik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICBpZiAoY29tbWFuZHMgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGNvbW1hbmRNYXBQYXRoID0gZmluZFVwKCdjb21tYW5kcy5qc29uJywgX19kaXJuYW1lKTtcbiAgICBpZiAoY29tbWFuZE1hcFBhdGggPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgY29tbWFuZCBtYXAuJyk7XG4gICAgfVxuICAgIGNvbnN0IGNsaURpciA9IGRpcm5hbWUoY29tbWFuZE1hcFBhdGgpO1xuICAgIGNvbnN0IGNvbW1hbmRzVGV4dCA9IHJlYWRGaWxlU3luYyhjb21tYW5kTWFwUGF0aCkudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29tbWFuZEpzb24gPSBqc29uLnBhcnNlSnNvbihcbiAgICAgIGNvbW1hbmRzVGV4dCxcbiAgICAgIEpzb25QYXJzZU1vZGUuTG9vc2UsXG4gICAgICB7IHBhdGg6IGNvbW1hbmRNYXBQYXRoIH0sXG4gICAgKTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChjb21tYW5kSnNvbikpIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQuanNvbicpO1xuICAgIH1cblxuICAgIGNvbW1hbmRzID0ge307XG4gICAgZm9yIChjb25zdCBjb21tYW5kTmFtZSBvZiBPYmplY3Qua2V5cyhjb21tYW5kSnNvbikpIHtcbiAgICAgIGNvbnN0IGNvbW1hbmRWYWx1ZSA9IGNvbW1hbmRKc29uW2NvbW1hbmROYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgY29tbWFuZFZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbW1hbmRzW2NvbW1hbmROYW1lXSA9IHJlc29sdmUoY2xpRGlyLCBjb21tYW5kVmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgcmVnaXN0cnkgaXMgZXhjbHVzaXZlbHkgdXNlZCBmb3IgZmxhdHRlbmluZyBzY2hlbWFzLCBhbmQgbm90IGZvciB2YWxpZGF0aW5nLlxuICBjb25zdCByZWdpc3RyeSA9IG5ldyBzY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KFtdKTtcbiAgcmVnaXN0cnkucmVnaXN0ZXJVcmlIYW5kbGVyKCh1cmk6IHN0cmluZykgPT4ge1xuICAgIGlmICh1cmkuc3RhcnRzV2l0aCgnbmctY2xpOi8vJykpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLicsIHVyaS5zdWJzdHIoJ25nLWNsaTovLycubGVuZ3RoKSksICd1dGYtOCcpO1xuXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEpTT04ucGFyc2UoY29udGVudCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgY29tbWFuZE1hcFxuICBjb25zdCBjb21tYW5kTWFwOiBDb21tYW5kRGVzY3JpcHRpb25NYXAgPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGNvbW1hbmRzKSkge1xuICAgIGNvbnN0IHNjaGVtYVBhdGggPSBjb21tYW5kc1tuYW1lXTtcbiAgICBjb25zdCBzY2hlbWFDb250ZW50ID0gcmVhZEZpbGVTeW5jKHNjaGVtYVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHNjaGVtYSA9IGpzb24ucGFyc2VKc29uKHNjaGVtYUNvbnRlbnQsIEpzb25QYXJzZU1vZGUuTG9vc2UsIHsgcGF0aDogc2NoZW1hUGF0aCB9KTtcbiAgICBpZiAoIWlzSnNvbk9iamVjdChzY2hlbWEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCBKU09OIGxvYWRlZCBmcm9tICcgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFQYXRoKSk7XG4gICAgfVxuXG4gICAgY29tbWFuZE1hcFtuYW1lXSA9XG4gICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBzY2hlbWFQYXRoLCByZWdpc3RyeSwgc2NoZW1hKTtcbiAgfVxuXG4gIGxldCBjb21tYW5kTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKGFyZyBpbiBjb21tYW5kTWFwKSB7XG4gICAgICBjb21tYW5kTmFtZSA9IGFyZztcbiAgICAgIGFyZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIGlmICghYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgY29tbWFuZE5hbWUgPSBhcmc7XG4gICAgICBhcmdzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIG5vIGNvbW1hbmRzIHdlcmUgZm91bmQsIHVzZSBgaGVscGAuXG4gIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIGFyZ3NbMF0gPT09ICctLXZlcnNpb24nKSB7XG4gICAgICBjb21tYW5kTmFtZSA9ICd2ZXJzaW9uJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29tbWFuZE5hbWUgPSAnaGVscCc7XG4gICAgfVxuICB9XG5cbiAgbGV0IGRlc2NyaXB0aW9uOiBDb21tYW5kRGVzY3JpcHRpb24gfCBudWxsID0gbnVsbDtcblxuICBpZiAoY29tbWFuZE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChjb21tYW5kTWFwW2NvbW1hbmROYW1lXSkge1xuICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kTWFwW2NvbW1hbmROYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMoY29tbWFuZE1hcCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3QgY29tbWFuZERlc2NyaXB0aW9uID0gY29tbWFuZE1hcFtuYW1lXTtcbiAgICAgICAgY29uc3QgYWxpYXNlcyA9IGNvbW1hbmREZXNjcmlwdGlvbi5hbGlhc2VzO1xuXG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICAgIGlmIChhbGlhc2VzLnNvbWUoYWxpYXMgPT4gYWxpYXMgPT09IGNvbW1hbmROYW1lKSkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBtdWx0aXBsZSBjb21tYW5kcyB3aXRoIHRoZSBzYW1lIGFsaWFzLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21tYW5kTmFtZSA9IG5hbWU7XG4gICAgICAgICAgZGVzY3JpcHRpb24gPSBjb21tYW5kRGVzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29tbWFuZE5hbWUpIHtcbiAgICBsb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgV2UgY291bGQgbm90IGZpbmQgYSBjb21tYW5kIGZyb20gdGhlIGFyZ3VtZW50cyBhbmQgdGhlIGhlbHAgY29tbWFuZCBzZWVtcyB0byBiZSBkaXNhYmxlZC5cbiAgICAgICAgVGhpcyBpcyBhbiBpc3N1ZSB3aXRoIHRoZSBDTEkgaXRzZWxmLiBJZiB5b3Ugc2VlIHRoaXMgY29tbWVudCwgcGxlYXNlIHJlcG9ydCBpdCBhbmRcbiAgICAgICAgcHJvdmlkZSB5b3VyIHJlcG9zaXRvcnkuXG4gICAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgaWYgKCFkZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGNvbW1hbmRzRGlzdGFuY2UgPSB7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBudW1iZXIgfTtcbiAgICBjb25zdCBuYW1lID0gY29tbWFuZE5hbWU7XG4gICAgY29uc3QgYWxsQ29tbWFuZHMgPSBPYmplY3Qua2V5cyhjb21tYW5kTWFwKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoIShhIGluIGNvbW1hbmRzRGlzdGFuY2UpKSB7XG4gICAgICAgIGNvbW1hbmRzRGlzdGFuY2VbYV0gPSBzdHJpbmdzLmxldmVuc2h0ZWluKGEsIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKCEoYiBpbiBjb21tYW5kc0Rpc3RhbmNlKSkge1xuICAgICAgICBjb21tYW5kc0Rpc3RhbmNlW2JdID0gc3RyaW5ncy5sZXZlbnNodGVpbihiLCBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbW1hbmRzRGlzdGFuY2VbYV0gLSBjb21tYW5kc0Rpc3RhbmNlW2JdO1xuICAgIH0pO1xuXG4gICAgbG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIFRoZSBzcGVjaWZpZWQgY29tbWFuZCAoXCIke2NvbW1hbmROYW1lfVwiKSBpcyBpbnZhbGlkLiBGb3IgYSBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zLFxuICAgICAgICBydW4gXCJuZyBoZWxwXCIuXG5cbiAgICAgICAgRGlkIHlvdSBtZWFuIFwiJHthbGxDb21tYW5kc1swXX1cIj9cbiAgICBgKTtcblxuICAgIHJldHVybiAxO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWRPcHRpb25zID0gcGFyc2VyLnBhcnNlQXJndW1lbnRzKGFyZ3MsIGRlc2NyaXB0aW9uLm9wdGlvbnMsIGxvZ2dlcik7XG4gICAgQ29tbWFuZC5zZXRDb21tYW5kTWFwKGNvbW1hbmRNYXApO1xuXG4gICAgY29uc3QgYW5hbHl0aWNzID0gb3B0aW9ucy5hbmFseXRpY3MgfHwgYXdhaXQgX2NyZWF0ZUFuYWx5dGljcygpO1xuICAgIGNvbnN0IGNvbnRleHQgPSB7IHdvcmtzcGFjZSwgYW5hbHl0aWNzIH07XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBkZXNjcmlwdGlvbi5pbXBsKGNvbnRleHQsIGRlc2NyaXB0aW9uLCBsb2dnZXIpO1xuXG4gICAgLy8gRmx1c2ggb24gYW4gaW50ZXJ2YWwgKGlmIHRoZSBldmVudCBsb29wIGlzIHdhaXRpbmcpLlxuICAgIGxldCBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBhbmFseXRpY3NGbHVzaFByb21pc2UgPSBhbmFseXRpY3NGbHVzaFByb21pc2UudGhlbigoKSA9PiBhbmFseXRpY3MuZmx1c2goKSk7XG4gICAgfSwgMTAwMCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb21tYW5kLnZhbGlkYXRlQW5kUnVuKHBhcnNlZE9wdGlvbnMpO1xuXG4gICAgLy8gRmx1c2ggb25lIGxhc3QgdGltZS5cbiAgICBhd2FpdCBhbmFseXRpY3NGbHVzaFByb21pc2UudGhlbigoKSA9PiBhbmFseXRpY3MuZmx1c2goKSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBwYXJzZXIuUGFyc2VBcmd1bWVudEV4Y2VwdGlvbikge1xuICAgICAgbG9nZ2VyLmZhdGFsKCdDYW5ub3QgcGFyc2UgYXJndW1lbnRzLiBTZWUgYmVsb3cgZm9yIHRoZSByZWFzb25zLicpO1xuICAgICAgbG9nZ2VyLmZhdGFsKCcgICAgJyArIGUuY29tbWVudHMuam9pbignXFxuICAgICcpKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG4iXX0=