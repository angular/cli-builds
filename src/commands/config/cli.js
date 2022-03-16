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
        this.command = 'config <json-path> [value]';
        this.describe = 'Retrieves or sets Angular configuration values in the angular.json file for the workspace.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('json-path', {
            description: `The configuration key to set or query, in JSON path format. ` +
                `For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
            type: 'string',
            demandOption: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbmZpZy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBQzVCLCtCQUFvQztBQUVwQyx5RUFLOEM7QUFDOUMsbURBQTRFO0FBQzVFLHlEQUFnRTtBQVFoRSxNQUFhLG1CQUNYLFNBQVEsOEJBQWdDO0lBRDFDOztRQUlFLFlBQU8sR0FBRyw0QkFBNEIsQ0FBQztRQUN2QyxhQUFRLEdBQ04sNEZBQTRGLENBQUM7UUFDL0Ysd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFpSC9ELENBQUM7SUEvR0MsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxXQUFXLEVBQUU7WUFDdkIsV0FBVyxFQUNULDhEQUE4RDtnQkFDOUQscUdBQXFHO1lBQ3ZHLElBQUksRUFBRSxRQUFRO1lBQ2QsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQzthQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDbkIsV0FBVyxFQUFFLDJEQUEyRDtZQUN4RSxJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxpRUFBaUU7WUFDOUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQW1DO1FBQzNDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxD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Q0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQzFCLE9BQU8sQ0FBQyxXQUFXLENBQUM7S0FDckI7SUFFRCxJQUFJO1FBQ0YsaUZBQWlGO1FBQ2pGLDZDQUE2QztRQUM3Qyx1REFBdUQ7UUFDdkQsb0ZBQW9GO1FBQ3BGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNoQztJQUFDLFdBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdywgdmFsaWRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IEpTT05GaWxlLCBwYXJzZUpzb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvanNvbi1maWxlJztcblxuaW50ZXJmYWNlIENvbmZpZ0NvbW1hbmRBcmdzIHtcbiAgJ2pzb24tcGF0aCc6IHN0cmluZztcbiAgdmFsdWU/OiBzdHJpbmc7XG4gIGdsb2JhbD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxDb25maWdDb21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248Q29uZmlnQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnY29uZmlnIDxqc29uLXBhdGg+IFt2YWx1ZV0nO1xuICBkZXNjcmliZSA9XG4gICAgJ1JldHJpZXZlcyBvciBzZXRzIEFuZ3VsYXIgY29uZmlndXJhdGlvbiB2YWx1ZXMgaW4gdGhlIGFuZ3VsYXIuanNvbiBmaWxlIGZvciB0aGUgd29ya3NwYWNlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PENvbmZpZ0NvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdqc29uLXBhdGgnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgIGBUaGUgY29uZmlndXJhdGlvbiBrZXkgdG8gc2V0IG9yIHF1ZXJ5LCBpbiBKU09OIHBhdGggZm9ybWF0LiBgICtcbiAgICAgICAgICBgRm9yIGV4YW1wbGU6IFwiYVszXS5mb28uYmFyWzJdXCIuIElmIG5vIG5ldyB2YWx1ZSBpcyBwcm92aWRlZCwgcmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGlzIGtleS5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgZGVtYW5kT3B0aW9uOiB0cnVlLFxuICAgICAgfSlcbiAgICAgIC5wb3NpdGlvbmFsKCd2YWx1ZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdJZiBwcm92aWRlZCwgYSBuZXcgdmFsdWUgZm9yIHRoZSBnaXZlbiBjb25maWd1cmF0aW9uIGtleS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdnbG9iYWwnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQWNjZXNzIHRoZSBnbG9iYWwgY29uZmlndXJhdGlvbiBpbiB0aGUgY2FsbGVyJ3MgaG9tZSBkaXJlY3RvcnkuYCxcbiAgICAgICAgYWxpYXM6IFsnZyddLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IGxldmVsID0gb3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gICAgY29uc3QgW2NvbmZpZ10gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKCdObyBjb25maWcgZm91bmQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldChjb25maWcsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXQob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQoanNvbkZpbGU6IEpTT05GaWxlLCBvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IG51bWJlciB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IHZhbHVlID0gb3B0aW9ucy5qc29uUGF0aFxuICAgICAgPyBqc29uRmlsZS5nZXQocGFyc2VKc29uUGF0aChvcHRpb25zLmpzb25QYXRoKSlcbiAgICAgIDoganNvbkZpbGUuY29udGVudDtcblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuaW5mbyh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5pbmZvKEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNldChvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGlmICghb3B0aW9ucy5qc29uUGF0aD8udHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsaWRDbGlQYXRocyA9IG5ldyBNYXA8XG4gICAgICBzdHJpbmcsXG4gICAgICAoKGFyZzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCkgPT4gc3RyaW5nKSB8IHVuZGVmaW5lZFxuICAgID4oW1xuICAgICAgWydjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoJywgdW5kZWZpbmVkXSxcbiAgICAgIFsnY2xpLmRlZmF1bHRDb2xsZWN0aW9uJywgdW5kZWZpbmVkXSxcbiAgICAgIFsnY2xpLnBhY2thZ2VNYW5hZ2VyJywgdW5kZWZpbmVkXSxcbiAgICAgIFsnY2xpLmFuYWx5dGljcycsIHVuZGVmaW5lZF0sXG5cbiAgICAgIFsnY2xpLmFuYWx5dGljc1NoYXJpbmcudHJhY2tpbmcnLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuYW5hbHl0aWNzU2hhcmluZy51dWlkJywgKHYpID0+ICh2ID09PSAnJyA/IHV1aWRWNCgpIDogYCR7dn1gKV0sXG5cbiAgICAgIFsnY2xpLmNhY2hlLmVuYWJsZWQnLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuY2FjaGUuZW52aXJvbm1lbnQnLCB1bmRlZmluZWRdLFxuICAgICAgWydjbGkuY2FjaGUucGF0aCcsIHVuZGVmaW5lZF0sXG4gICAgXSk7XG5cbiAgICBpZiAoXG4gICAgICBvcHRpb25zLmdsb2JhbCAmJlxuICAgICAgIW9wdGlvbnMuanNvblBhdGguc3RhcnRzV2l0aCgnc2NoZW1hdGljcy4nKSAmJlxuICAgICAgIXZhbGlkQ2xpUGF0aHMuaGFzKG9wdGlvbnMuanNvblBhdGgpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcob3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCcpO1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQ29uZmd1cmF0aW9uIGZpbGUgY2Fubm90IGJlIGZvdW5kLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gdmFsaWRDbGlQYXRocy5nZXQob3B0aW9ucy5qc29uUGF0aCk/LihvcHRpb25zLnZhbHVlKSA/PyBvcHRpb25zLnZhbHVlO1xuICAgIGNvbnN0IG1vZGlmaWVkID0gY29uZmlnLm1vZGlmeShwYXJzZUpzb25QYXRoKG9wdGlvbnMuanNvblBhdGgpLCBub3JtYWxpemVWYWx1ZSh2YWx1ZSkpO1xuXG4gICAgaWYgKCFtb2RpZmllZCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGF3YWl0IHZhbGlkYXRlV29ya3NwYWNlKHBhcnNlSnNvbihjb25maWcuY29udGVudCkpO1xuXG4gICAgY29uZmlnLnNhdmUoKTtcblxuICAgIHJldHVybiAwO1xuICB9XG59XG5cbi8qKlxuICogU3BsaXRzIGEgSlNPTiBwYXRoIHN0cmluZyBpbnRvIGZyYWdtZW50cy4gRnJhZ21lbnRzIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgdmFsdWUgcmVmZXJlbmNlZFxuICogYnkgdGhlIHBhdGguIEZvciBleGFtcGxlLCBhIHBhdGggb2YgXCJhWzNdLmZvby5iYXJbMl1cIiB3b3VsZCBnaXZlIHlvdSBhIGZyYWdtZW50IGFycmF5IG9mXG4gKiBbXCJhXCIsIDMsIFwiZm9vXCIsIFwiYmFyXCIsIDJdLlxuICogQHBhcmFtIHBhdGggVGhlIEpTT04gc3RyaW5nIHRvIHBhcnNlLlxuICogQHJldHVybnMgeyhzdHJpbmd8bnVtYmVyKVtdfSBUaGUgZnJhZ21lbnRzIGZvciB0aGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcGFyc2VKc29uUGF0aChwYXRoOiBzdHJpbmcpOiAoc3RyaW5nIHwgbnVtYmVyKVtdIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gKHBhdGggfHwgJycpLnNwbGl0KC9cXC4vZyk7XG4gIGNvbnN0IHJlc3VsdDogKHN0cmluZyB8IG51bWJlcilbXSA9IFtdO1xuXG4gIHdoaWxlIChmcmFnbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYWdtZW50ID0gZnJhZ21lbnRzLnNoaWZ0KCk7XG4gICAgaWYgKGZyYWdtZW50ID09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2ggPSBmcmFnbWVudC5tYXRjaCgvKFteW10rKSgoXFxbLipcXF0pKikvKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdJbnZhbGlkIEpTT04gcGF0aC4nKTtcbiAgICB9XG5cbiAgICByZXN1bHQucHVzaChtYXRjaFsxXSk7XG4gICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICBjb25zdCBpbmRpY2VzID0gbWF0Y2hbMl1cbiAgICAgICAgLnNsaWNlKDEsIC0xKVxuICAgICAgICAuc3BsaXQoJ11bJylcbiAgICAgICAgLm1hcCgoeCkgPT4gKC9eXFxkJC8udGVzdCh4KSA/ICt4IDogeC5yZXBsYWNlKC9cInwnL2csICcnKSkpO1xuICAgICAgcmVzdWx0LnB1c2goLi4uaW5kaWNlcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoKGZyYWdtZW50KSA9PiBmcmFnbWVudCAhPSBudWxsKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIpOiBKc29uVmFsdWUgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZVN0cmluZyA9IGAke3ZhbHVlfWAudHJpbSgpO1xuICBzd2l0Y2ggKHZhbHVlU3RyaW5nKSB7XG4gICAgY2FzZSAndHJ1ZSc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjYXNlICdmYWxzZSc6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY2FzZSAnbnVsbCc6XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBjYXNlICd1bmRlZmluZWQnOlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmIChpc0Zpbml0ZSgrdmFsdWVTdHJpbmcpKSB7XG4gICAgcmV0dXJuICt2YWx1ZVN0cmluZztcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gV2UgdXNlIGBKU09OLnBhcnNlYCBpbnN0ZWFkIG9mIGBwYXJzZUpzb25gIGJlY2F1c2UgdGhlIGxhdHRlciB3aWxsIHBhcnNlIFVVSURzXG4gICAgLy8gYW5kIGNvbnZlcnQgdGhlbSBpbnRvIGEgbnVtYmVyaWMgZW50aXRpZXMuXG4gICAgLy8gRXhhbXBsZTogNzNiNjE5NzQtMTgyYy00OGU0LWI0YzYtMzBkZGYwOGM1Yzk4IC0+IDczLlxuICAgIC8vIFRoZXNlIHZhbHVlcyBzaG91bGQgbmV2ZXIgY29udGFpbiBjb21tZW50cywgdGhlcmVmb3JlIHVzaW5nIGBKU09OLnBhcnNlYCBpcyBzYWZlLlxuICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlU3RyaW5nKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG4iXX0=