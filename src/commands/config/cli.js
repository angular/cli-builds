"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommandModule = void 0;
const path_1 = require("path");
const uuid_1 = require("uuid");
const command_module_1 = require("../../command-builder/command-module");
const config_1 = require("../../utilities/config");
const json_file_1 = require("../../utilities/json-file");
class ConfigCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'config [json-path] [value]';
        this.describe = 'Retrieves or sets Angular configuration values in the angular.json file for the workspace.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('json-path', {
            description: `The configuration key to set or query, in JSON path format. ` +
                `For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
            type: 'string',
        })
            .positional('value', {
            description: 'If provided, a new value for the given configuration key.',
            type: 'string',
        })
            .option('global', {
            description: `Access the global configuration in the caller's home directory.`,
            alias: ['g'],
            type: 'boolean',
            default: false,
        })
            .strict();
    }
    async run(options) {
        const level = options.global ? 'global' : 'local';
        const [config] = (0, config_1.getWorkspaceRaw)(level);
        if (options.value == undefined) {
            if (!config) {
                this.context.logger.error('No config found.');
                return 1;
            }
            return this.get(config, options);
        }
        else {
            return this.set(options);
        }
    }
    get(jsonFile, options) {
        const { logger } = this.context;
        const value = options.jsonPath
            ? jsonFile.get(parseJsonPath(options.jsonPath))
            : jsonFile.content;
        if (value === undefined) {
            logger.error('Value cannot be found.');
            return 1;
        }
        else if (typeof value === 'string') {
            logger.info(value);
        }
        else {
            logger.info(JSON.stringify(value, null, 2));
        }
        return 0;
    }
    async set(options) {
        var _a, _b, _c;
        if (!((_a = options.jsonPath) === null || _a === void 0 ? void 0 : _a.trim())) {
            throw new command_module_1.CommandModuleError('Invalid Path.');
        }
        const validCliPaths = new Map([
            ['cli.warnings.versionMismatch', undefined],
            ['cli.defaultCollection', undefined],
            ['cli.schematicCollections', undefined],
            ['cli.packageManager', undefined],
            ['cli.analytics', undefined],
            ['cli.analyticsSharing.tracking', undefined],
            ['cli.analyticsSharing.uuid', (v) => (v === '' ? (0, uuid_1.v4)() : `${v}`)],
            ['cli.cache.enabled', undefined],
            ['cli.cache.environment', undefined],
            ['cli.cache.path', undefined],
        ]);
        if (options.global &&
            !options.jsonPath.startsWith('schematics.') &&
            !validCliPaths.has(options.jsonPath)) {
            throw new command_module_1.CommandModuleError('Invalid Path.');
        }
        const [config, configPath] = (0, config_1.getWorkspaceRaw)(options.global ? 'global' : 'local');
        const { logger } = this.context;
        if (!config || !configPath) {
            throw new command_module_1.CommandModuleError('Confguration file cannot be found.');
        }
        const value = (_c = (_b = validCliPaths.get(options.jsonPath)) === null || _b === void 0 ? void 0 : _b(options.value)) !== null && _c !== void 0 ? _c : options.value;
        const modified = config.modify(parseJsonPath(options.jsonPath), normalizeValue(value));
        if (!modified) {
            logger.error('Value cannot be found.');
            return 1;
        }
        await (0, config_1.validateWorkspace)((0, json_file_1.parseJson)(config.content));
        config.save();
        return 0;
    }
}
exports.ConfigCommandModule = ConfigCommandModule;
/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {(string|number)[]} The fragments for the string.
 * @private
 */
function parseJsonPath(path) {
    const fragments = (path || '').split(/\./g);
    const result = [];
    while (fragments.length > 0) {
        const fragment = fragments.shift();
        if (fragment == undefined) {
            break;
        }
        const match = fragment.match(/([^[]+)((\[.*\])*)/);
        if (!match) {
            throw new command_module_1.CommandModuleError('Invalid JSON path.');
        }
        result.push(match[1]);
        if (match[2]) {
            const indices = match[2]
                .slice(1, -1)
                .split('][')
                .map((x) => (/^\d$/.test(x) ? +x : x.replace(/"|'/g, '')));
            result.push(...indices);
        }
    }
    return result.filter((fragment) => fragment != null);
}
function normalizeValue(value) {
    const valueString = `${value}`.trim();
    switch (valueString) {
        case 'true':
            return true;
        case 'false':
            return false;
        case 'null':
            return null;
        case 'undefined':
            return undefined;
    }
    if (isFinite(+valueString)) {
        return +valueString;
    }
    try {
        // We use `JSON.parse` instead of `parseJson` because the latter will parse UUIDs
        // and convert them into a numberic entities.
        // Example: 73b61974-182c-48e4-b4c6-30ddf08c5c98 -> 73.
        // These values should never contain comments, therefore using `JSON.parse` is safe.
        return JSON.parse(valueString);
    }
    catch (_a) {
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbmZpZy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBQzVCLCtCQUFvQztBQUVwQyx5RUFLOEM7QUFDOUMsbURBQTRFO0FBQzVFLHlEQUFnRTtBQVFoRSxNQUFhLG1CQUNYLFNBQVEsOEJBQWdDO0lBRDFDOztRQUlFLFlBQU8sR0FBRyw0QkFBNEIsQ0FBQztRQUN2QyxhQUFRLEdBQ04sNEZBQTRGLENBQUM7UUFDL0Ysd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFpSC9ELENBQUM7SUEvR0MsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxXQUFXLEVBQUU7WUFDdkIsV0FBVyxFQUNULDhEQUE4RDtnQkFDOUQscUdBQXFHO1lBQ3ZHLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDbkIsV0FBVyxFQUFFLDJEQUEyRDtZQUN4RSxJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxpRUFBaUU7WUFDOUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQW1DO1FBQzNDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxN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RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQzFCLE9BQU8sQ0FBQyxXQUFXLENBQUM7S0FDckI7SUFFRCxJQUFJO1FBQ0YsaUZBQWlGO1FBQ2pGLDZDQUE2QztRQUM3Qyx1REFBdUQ7UUFDdkQsb0ZBQW9GO1FBQ3BGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNoQztJQUFDLFdBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdywgdmFsaWRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IEpTT05GaWxlLCBwYXJzZUpzb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvanNvbi1maWxlJztcblxuaW50ZXJmYWNlIENvbmZpZ0NvbW1hbmRBcmdzIHtcbiAgJ2pzb24tcGF0aCc/OiBzdHJpbmc7XG4gIHZhbHVlPzogc3RyaW5nO1xuICBnbG9iYWw/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8Q29uZmlnQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPENvbmZpZ0NvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2NvbmZpZyBbanNvbi1wYXRoXSBbdmFsdWVdJztcbiAgZGVzY3JpYmUgPVxuICAgICdSZXRyaWV2ZXMgb3Igc2V0cyBBbmd1bGFyIGNvbmZpZ3VyYXRpb24gdmFsdWVzIGluIHRoZSBhbmd1bGFyLmpzb24gZmlsZSBmb3IgdGhlIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndjxDb25maWdDb21tYW5kQXJncz4ge1xuICAgIHJldHVybiBsb2NhbFlhcmdzXG4gICAgICAucG9zaXRpb25hbCgnanNvbi1wYXRoJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICBgVGhlIGNvbmZpZ3VyYXRpb24ga2V5IHRvIHNldCBvciBxdWVyeSwgaW4gSlNPTiBwYXRoIGZvcm1hdC4gYCArXG4gICAgICAgICAgYEZvciBleGFtcGxlOiBcImFbM10uZm9vLmJhclsyXVwiLiBJZiBubyBuZXcgdmFsdWUgaXMgcHJvdmlkZWQsIHJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhpcyBrZXkuYCxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICB9KVxuICAgICAgLnBvc2l0aW9uYWwoJ3ZhbHVlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ0lmIHByb3ZpZGVkLCBhIG5ldyB2YWx1ZSBmb3IgdGhlIGdpdmVuIGNvbmZpZ3VyYXRpb24ga2V5LicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2dsb2JhbCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246IGBBY2Nlc3MgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uIGluIHRoZSBjYWxsZXIncyBob21lIGRpcmVjdG9yeS5gLFxuICAgICAgICBhbGlhczogWydnJ10sXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8Q29uZmlnQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgbGV2ZWwgPSBvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcbiAgICBjb25zdCBbY29uZmlnXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG5cbiAgICBpZiAob3B0aW9ucy52YWx1ZSA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IoJ05vIGNvbmZpZyBmb3VuZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KGNvbmZpZywgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnNldChvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldChqc29uRmlsZTogSlNPTkZpbGUsIG9wdGlvbnM6IE9wdGlvbnM8Q29uZmlnQ29tbWFuZEFyZ3M+KTogbnVtYmVyIHtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgY29uc3QgdmFsdWUgPSBvcHRpb25zLmpzb25QYXRoXG4gICAgICA/IGpzb25GaWxlLmdldChwYXJzZUpzb25QYXRoKG9wdGlvbnMuanNvblBhdGgpKVxuICAgICAgOiBqc29uRmlsZS5jb250ZW50O1xuXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxvZ2dlci5pbmZvKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oSlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2V0KG9wdGlvbnM6IE9wdGlvbnM8Q29uZmlnQ29tbWFuZEFyZ3M+KTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgaWYgKCFvcHRpb25zLmpzb25QYXRoPy50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWxpZENsaVBhdGhzID0gbmV3IE1hcDxcbiAgICAgIHN0cmluZyxcbiAgICAgICgoYXJnOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkKSA9PiBzdHJpbmcpIHwgdW5kZWZpbmVkXG4gICAgPihbXG4gICAgICBbJ2NsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2gnLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuZGVmYXVsdENvbGxlY3Rpb24nLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuc2NoZW1hdGljQ29sbGVjdGlvbnMnLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkucGFja2FnZU1hbmFnZXInLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuYW5hbHl0aWNzJywgdW5kZWZpbmVkXSxcblxuICAgICAgWydjbGkuYW5hbHl0aWNzU2hhcmluZy50cmFja2luZycsIHVuZGVmaW5lZF0sXG4gICAgICBbJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnV1aWQnLCAodikgPT4gKHYgPT09ICcnID8gdXVpZFY0KCkgOiBgJHt2fWApXSxcblxuICAgICAgWydjbGkuY2FjaGUuZW5hYmxlZCcsIHVuZGVmaW5lZF0sXG4gICAgICBbJ2NsaS5jYWNoZS5lbnZpcm9ubWVudCcsIHVuZGVmaW5lZF0sXG4gICAgICBbJ2NsaS5jYWNoZS5wYXRoJywgdW5kZWZpbmVkXSxcbiAgICBdKTtcblxuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuZ2xvYmFsICYmXG4gICAgICAhb3B0aW9ucy5qc29uUGF0aC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzLicpICYmXG4gICAgICAhdmFsaWRDbGlQYXRocy5oYXMob3B0aW9ucy5qc29uUGF0aClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJyk7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdDb25mZ3VyYXRpb24gZmlsZSBjYW5ub3QgYmUgZm91bmQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB2YWxpZENsaVBhdGhzLmdldChvcHRpb25zLmpzb25QYXRoKT8uKG9wdGlvbnMudmFsdWUpID8/IG9wdGlvbnMudmFsdWU7XG4gICAgY29uc3QgbW9kaWZpZWQgPSBjb25maWcubW9kaWZ5KHBhcnNlSnNvblBhdGgob3B0aW9ucy5qc29uUGF0aCksIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSk7XG5cbiAgICBpZiAoIW1vZGlmaWVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgYXdhaXQgdmFsaWRhdGVXb3Jrc3BhY2UocGFyc2VKc29uKGNvbmZpZy5jb250ZW50KSk7XG5cbiAgICBjb25maWcuc2F2ZSgpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuLyoqXG4gKiBTcGxpdHMgYSBKU09OIHBhdGggc3RyaW5nIGludG8gZnJhZ21lbnRzLiBGcmFnbWVudHMgY2FuIGJlIHVzZWQgdG8gZ2V0IHRoZSB2YWx1ZSByZWZlcmVuY2VkXG4gKiBieSB0aGUgcGF0aC4gRm9yIGV4YW1wbGUsIGEgcGF0aCBvZiBcImFbM10uZm9vLmJhclsyXVwiIHdvdWxkIGdpdmUgeW91IGEgZnJhZ21lbnQgYXJyYXkgb2ZcbiAqIFtcImFcIiwgMywgXCJmb29cIiwgXCJiYXJcIiwgMl0uXG4gKiBAcGFyYW0gcGF0aCBUaGUgSlNPTiBzdHJpbmcgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyB7KHN0cmluZ3xudW1iZXIpW119IFRoZSBmcmFnbWVudHMgZm9yIHRoZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBwYXJzZUpzb25QYXRoKHBhdGg6IHN0cmluZyk6IChzdHJpbmcgfCBudW1iZXIpW10ge1xuICBjb25zdCBmcmFnbWVudHMgPSAocGF0aCB8fCAnJykuc3BsaXQoL1xcLi9nKTtcbiAgY29uc3QgcmVzdWx0OiAoc3RyaW5nIHwgbnVtYmVyKVtdID0gW107XG5cbiAgd2hpbGUgKGZyYWdtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhZ21lbnQgPSBmcmFnbWVudHMuc2hpZnQoKTtcbiAgICBpZiAoZnJhZ21lbnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IGZyYWdtZW50Lm1hdGNoKC8oW15bXSspKChcXFsuKlxcXSkqKS8pO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0ludmFsaWQgSlNPTiBwYXRoLicpO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKG1hdGNoWzFdKTtcbiAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgIGNvbnN0IGluZGljZXMgPSBtYXRjaFsyXVxuICAgICAgICAuc2xpY2UoMSwgLTEpXG4gICAgICAgIC5zcGxpdCgnXVsnKVxuICAgICAgICAubWFwKCh4KSA9PiAoL15cXGQkLy50ZXN0KHgpID8gK3ggOiB4LnJlcGxhY2UoL1wifCcvZywgJycpKSk7XG4gICAgICByZXN1bHQucHVzaCguLi5pbmRpY2VzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0LmZpbHRlcigoZnJhZ21lbnQpID0+IGZyYWdtZW50ICE9IG51bGwpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB8IG51bWJlcik6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlU3RyaW5nID0gYCR7dmFsdWV9YC50cmltKCk7XG4gIHN3aXRjaCAodmFsdWVTdHJpbmcpIHtcbiAgICBjYXNlICd0cnVlJzpcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlICdudWxsJzpcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKGlzRmluaXRlKCt2YWx1ZVN0cmluZykpIHtcbiAgICByZXR1cm4gK3ZhbHVlU3RyaW5nO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBXZSB1c2UgYEpTT04ucGFyc2VgIGluc3RlYWQgb2YgYHBhcnNlSnNvbmAgYmVjYXVzZSB0aGUgbGF0dGVyIHdpbGwgcGFyc2UgVVVJRHNcbiAgICAvLyBhbmQgY29udmVydCB0aGVtIGludG8gYSBudW1iZXJpYyBlbnRpdGllcy5cbiAgICAvLyBFeGFtcGxlOiA3M2I2MTk3NC0xODJjLTQ4ZTQtYjRjNi0zMGRkZjA4YzVjOTggLT4gNzMuXG4gICAgLy8gVGhlc2UgdmFsdWVzIHNob3VsZCBuZXZlciBjb250YWluIGNvbW1lbnRzLCB0aGVyZWZvcmUgdXNpbmcgYEpTT04ucGFyc2VgIGlzIHNhZmUuXG4gICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWVTdHJpbmcpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cbiJdfQ==