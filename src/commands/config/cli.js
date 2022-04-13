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
        var _a;
        if (!((_a = options.jsonPath) === null || _a === void 0 ? void 0 : _a.trim())) {
            throw new command_module_1.CommandModuleError('Invalid Path.');
        }
        const validGlobalCliPaths = new Set([
            'cli.warnings.versionMismatch',
            'cli.defaultCollection',
            'cli.schematicCollections',
            'cli.packageManager',
            'cli.analytics',
            'cli.analyticsSharing.tracking',
            'cli.analyticsSharing.uuid',
        ]);
        if (options.global &&
            !options.jsonPath.startsWith('schematics.') &&
            !validGlobalCliPaths.has(options.jsonPath)) {
            throw new command_module_1.CommandModuleError('Invalid Path.');
        }
        const [config, configPath] = (0, config_1.getWorkspaceRaw)(options.global ? 'global' : 'local');
        const { logger } = this.context;
        if (!config || !configPath) {
            throw new command_module_1.CommandModuleError('Confguration file cannot be found.');
        }
        const normalizeUUIDValue = (v) => (v === '' ? (0, uuid_1.v4)() : `${v}`);
        const value = options.jsonPath === 'cli.analyticsSharing.uuid'
            ? normalizeUUIDValue(options.value)
            : options.value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbmZpZy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBQzVCLCtCQUFvQztBQUVwQyx5RUFLOEM7QUFDOUMsbURBQTRFO0FBQzVFLHlEQUFnRTtBQVFoRSxNQUFhLG1CQUNYLFNBQVEsOEJBQWdDO0lBRDFDOztRQUlFLFlBQU8sR0FBRyw0QkFBNEIsQ0FBQztRQUN2QyxhQUFRLEdBQ04sNEZBQTRGLENBQUM7UUFDL0Ysd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFnSC9ELENBQUM7SUE5R0MsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxXQUFXLEVBQUU7WUFDdkIsV0FBVyxFQUNULDhEQUE4RDtnQkFDOUQscUdBQXFHO1lBQ3ZHLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDbkIsV0FBVyxFQUFFLDJEQUEyRDtZQUN4RSxJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxpRUFBaUU7WUFDOUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQW1DO1FBQzNDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxN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QUNOLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25WYWx1ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IHY0IGFzIHV1aWRWNCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlUmF3LCB2YWxpZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgSlNPTkZpbGUsIHBhcnNlSnNvbiB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9qc29uLWZpbGUnO1xuXG5pbnRlcmZhY2UgQ29uZmlnQ29tbWFuZEFyZ3Mge1xuICAnanNvbi1wYXRoJz86IHN0cmluZztcbiAgdmFsdWU/OiBzdHJpbmc7XG4gIGdsb2JhbD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxDb25maWdDb21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248Q29uZmlnQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnY29uZmlnIFtqc29uLXBhdGhdIFt2YWx1ZV0nO1xuICBkZXNjcmliZSA9XG4gICAgJ1JldHJpZXZlcyBvciBzZXRzIEFuZ3VsYXIgY29uZmlndXJhdGlvbiB2YWx1ZXMgaW4gdGhlIGFuZ3VsYXIuanNvbiBmaWxlIGZvciB0aGUgd29ya3NwYWNlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PENvbmZpZ0NvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdqc29uLXBhdGgnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgIGBUaGUgY29uZmlndXJhdGlvbiBrZXkgdG8gc2V0IG9yIHF1ZXJ5LCBpbiBKU09OIHBhdGggZm9ybWF0LiBgICtcbiAgICAgICAgICBgRm9yIGV4YW1wbGU6IFwiYVszXS5mb28uYmFyWzJdXCIuIElmIG5vIG5ldyB2YWx1ZSBpcyBwcm92aWRlZCwgcmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGlzIGtleS5gLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIH0pXG4gICAgICAucG9zaXRpb25hbCgndmFsdWUnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSWYgcHJvdmlkZWQsIGEgbmV3IHZhbHVlIGZvciB0aGUgZ2l2ZW4gY29uZmlndXJhdGlvbiBrZXkuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignZ2xvYmFsJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogYEFjY2VzcyB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gaW4gdGhlIGNhbGxlcidzIGhvbWUgZGlyZWN0b3J5LmAsXG4gICAgICAgIGFsaWFzOiBbJ2cnXSxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxDb25maWdDb21tYW5kQXJncz4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCBsZXZlbCA9IG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuICAgIGNvbnN0IFtjb25maWddID0gZ2V0V29ya3NwYWNlUmF3KGxldmVsKTtcblxuICAgIGlmIChvcHRpb25zLnZhbHVlID09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcignTm8gY29uZmlnIGZvdW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQoY29uZmlnLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0KGpzb25GaWxlOiBKU09ORmlsZSwgb3B0aW9uczogT3B0aW9uczxDb25maWdDb21tYW5kQXJncz4pOiBudW1iZXIge1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbnMuanNvblBhdGhcbiAgICAgID8ganNvbkZpbGUuZ2V0KHBhcnNlSnNvblBhdGgob3B0aW9ucy5qc29uUGF0aCkpXG4gICAgICA6IGpzb25GaWxlLmNvbnRlbnQ7XG5cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgbG9nZ2VyLmluZm8odmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuaW5mbyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZXQob3B0aW9uczogT3B0aW9uczxDb25maWdDb21tYW5kQXJncz4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBpZiAoIW9wdGlvbnMuanNvblBhdGg/LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbGlkR2xvYmFsQ2xpUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oW1xuICAgICAgJ2NsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2gnLFxuICAgICAgJ2NsaS5kZWZhdWx0Q29sbGVjdGlvbicsXG4gICAgICAnY2xpLnNjaGVtYXRpY0NvbGxlY3Rpb25zJyxcbiAgICAgICdjbGkucGFja2FnZU1hbmFnZXInLFxuXG4gICAgICAnY2xpLmFuYWx5dGljcycsXG4gICAgICAnY2xpLmFuYWx5dGljc1NoYXJpbmcudHJhY2tpbmcnLFxuICAgICAgJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnV1aWQnLFxuICAgIF0pO1xuXG4gICAgaWYgKFxuICAgICAgb3B0aW9ucy5nbG9iYWwgJiZcbiAgICAgICFvcHRpb25zLmpzb25QYXRoLnN0YXJ0c1dpdGgoJ3NjaGVtYXRpY3MuJykgJiZcbiAgICAgICF2YWxpZEdsb2JhbENsaVBhdGhzLmhhcyhvcHRpb25zLmpzb25QYXRoKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnKTtcbiAgICBjb25zdCB7IGxvZ2dlciB9ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0NvbmZndXJhdGlvbiBmaWxlIGNhbm5vdCBiZSBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBub3JtYWxpemVVVUlEVmFsdWUgPSAodjogc3RyaW5nIHwgdW5kZWZpbmVkKSA9PiAodiA9PT0gJycgPyB1dWlkVjQoKSA6IGAke3Z9YCk7XG5cbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBvcHRpb25zLmpzb25QYXRoID09PSAnY2xpLmFuYWx5dGljc1NoYXJpbmcudXVpZCdcbiAgICAgICAgPyBub3JtYWxpemVVVUlEVmFsdWUob3B0aW9ucy52YWx1ZSlcbiAgICAgICAgOiBvcHRpb25zLnZhbHVlO1xuXG4gICAgY29uc3QgbW9kaWZpZWQgPSBjb25maWcubW9kaWZ5KHBhcnNlSnNvblBhdGgob3B0aW9ucy5qc29uUGF0aCksIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSk7XG5cbiAgICBpZiAoIW1vZGlmaWVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgYXdhaXQgdmFsaWRhdGVXb3Jrc3BhY2UocGFyc2VKc29uKGNvbmZpZy5jb250ZW50KSk7XG5cbiAgICBjb25maWcuc2F2ZSgpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuLyoqXG4gKiBTcGxpdHMgYSBKU09OIHBhdGggc3RyaW5nIGludG8gZnJhZ21lbnRzLiBGcmFnbWVudHMgY2FuIGJlIHVzZWQgdG8gZ2V0IHRoZSB2YWx1ZSByZWZlcmVuY2VkXG4gKiBieSB0aGUgcGF0aC4gRm9yIGV4YW1wbGUsIGEgcGF0aCBvZiBcImFbM10uZm9vLmJhclsyXVwiIHdvdWxkIGdpdmUgeW91IGEgZnJhZ21lbnQgYXJyYXkgb2ZcbiAqIFtcImFcIiwgMywgXCJmb29cIiwgXCJiYXJcIiwgMl0uXG4gKiBAcGFyYW0gcGF0aCBUaGUgSlNPTiBzdHJpbmcgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyB7KHN0cmluZ3xudW1iZXIpW119IFRoZSBmcmFnbWVudHMgZm9yIHRoZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBwYXJzZUpzb25QYXRoKHBhdGg6IHN0cmluZyk6IChzdHJpbmcgfCBudW1iZXIpW10ge1xuICBjb25zdCBmcmFnbWVudHMgPSAocGF0aCB8fCAnJykuc3BsaXQoL1xcLi9nKTtcbiAgY29uc3QgcmVzdWx0OiAoc3RyaW5nIHwgbnVtYmVyKVtdID0gW107XG5cbiAgd2hpbGUgKGZyYWdtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhZ21lbnQgPSBmcmFnbWVudHMuc2hpZnQoKTtcbiAgICBpZiAoZnJhZ21lbnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IGZyYWdtZW50Lm1hdGNoKC8oW15bXSspKChcXFsuKlxcXSkqKS8pO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0ludmFsaWQgSlNPTiBwYXRoLicpO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKG1hdGNoWzFdKTtcbiAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgIGNvbnN0IGluZGljZXMgPSBtYXRjaFsyXVxuICAgICAgICAuc2xpY2UoMSwgLTEpXG4gICAgICAgIC5zcGxpdCgnXVsnKVxuICAgICAgICAubWFwKCh4KSA9PiAoL15cXGQkLy50ZXN0KHgpID8gK3ggOiB4LnJlcGxhY2UoL1wifCcvZywgJycpKSk7XG4gICAgICByZXN1bHQucHVzaCguLi5pbmRpY2VzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0LmZpbHRlcigoZnJhZ21lbnQpID0+IGZyYWdtZW50ICE9IG51bGwpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB8IG51bWJlcik6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlU3RyaW5nID0gYCR7dmFsdWV9YC50cmltKCk7XG4gIHN3aXRjaCAodmFsdWVTdHJpbmcpIHtcbiAgICBjYXNlICd0cnVlJzpcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlICdudWxsJzpcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKGlzRmluaXRlKCt2YWx1ZVN0cmluZykpIHtcbiAgICByZXR1cm4gK3ZhbHVlU3RyaW5nO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBXZSB1c2UgYEpTT04ucGFyc2VgIGluc3RlYWQgb2YgYHBhcnNlSnNvbmAgYmVjYXVzZSB0aGUgbGF0dGVyIHdpbGwgcGFyc2UgVVVJRHNcbiAgICAvLyBhbmQgY29udmVydCB0aGVtIGludG8gYSBudW1iZXJpYyBlbnRpdGllcy5cbiAgICAvLyBFeGFtcGxlOiA3M2I2MTk3NC0xODJjLTQ4ZTQtYjRjNi0zMGRkZjA4YzVjOTggLT4gNzMuXG4gICAgLy8gVGhlc2UgdmFsdWVzIHNob3VsZCBuZXZlciBjb250YWluIGNvbW1lbnRzLCB0aGVyZWZvcmUgdXNpbmcgYEpTT04ucGFyc2VgIGlzIHNhZmUuXG4gICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWVTdHJpbmcpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cbiJdfQ==