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
        const [config] = await (0, config_1.getWorkspaceRaw)(level);
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
            'cli.completion.prompted',
        ]);
        if (options.global &&
            !options.jsonPath.startsWith('schematics.') &&
            !validGlobalCliPaths.has(options.jsonPath)) {
            throw new command_module_1.CommandModuleError('Invalid Path.');
        }
        const [config, configPath] = await (0, config_1.getWorkspaceRaw)(options.global ? 'global' : 'local');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbmZpZy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBQzVCLCtCQUFvQztBQUVwQyx5RUFLOEM7QUFDOUMsbURBQTRFO0FBQzVFLHlEQUFnRTtBQVFoRSxNQUFhLG1CQUNYLFNBQVEsOEJBQWdDO0lBRDFDOztRQUlFLFlBQU8sR0FBRyw0QkFBNEIsQ0FBQztRQUN2QyxhQUFRLEdBQ04sNEZBQTRGLENBQUM7UUFDL0Ysd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFrSC9ELENBQUM7SUFoSEMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVTthQUNkLFVBQVUsQ0FBQyxXQUFXLEVBQUU7WUFDdkIsV0FBVyxFQUNULDhEQUE4RDtnQkFDOUQscUdBQXFHO1lBQ3ZHLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDbkIsV0FBVyxFQUFFLDJEQUEyRDtZQUN4RSxJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxpRUFBaUU7WUFDOUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQW1DO1FBQzNDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxN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LENBQUM7S0FDaEM7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZSxcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2VSYXcsIHZhbGlkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBKU09ORmlsZSwgcGFyc2VKc29uIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2pzb24tZmlsZSc7XG5cbmludGVyZmFjZSBDb25maWdDb21tYW5kQXJncyB7XG4gICdqc29uLXBhdGgnPzogc3RyaW5nO1xuICB2YWx1ZT86IHN0cmluZztcbiAgZ2xvYmFsPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0NvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlPENvbmZpZ0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxDb25maWdDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdjb25maWcgW2pzb24tcGF0aF0gW3ZhbHVlXSc7XG4gIGRlc2NyaWJlID1cbiAgICAnUmV0cmlldmVzIG9yIHNldHMgQW5ndWxhciBjb25maWd1cmF0aW9uIHZhbHVlcyBpbiB0aGUgYW5ndWxhci5qc29uIGZpbGUgZm9yIHRoZSB3b3Jrc3BhY2UuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Y8Q29uZmlnQ29tbWFuZEFyZ3M+IHtcbiAgICByZXR1cm4gbG9jYWxZYXJnc1xuICAgICAgLnBvc2l0aW9uYWwoJ2pzb24tcGF0aCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgYFRoZSBjb25maWd1cmF0aW9uIGtleSB0byBzZXQgb3IgcXVlcnksIGluIEpTT04gcGF0aCBmb3JtYXQuIGAgK1xuICAgICAgICAgIGBGb3IgZXhhbXBsZTogXCJhWzNdLmZvby5iYXJbMl1cIi4gSWYgbm8gbmV3IHZhbHVlIGlzIHByb3ZpZGVkLCByZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoaXMga2V5LmAsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5wb3NpdGlvbmFsKCd2YWx1ZScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdJZiBwcm92aWRlZCwgYSBuZXcgdmFsdWUgZm9yIHRoZSBnaXZlbiBjb25maWd1cmF0aW9uIGtleS4nLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdnbG9iYWwnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQWNjZXNzIHRoZSBnbG9iYWwgY29uZmlndXJhdGlvbiBpbiB0aGUgY2FsbGVyJ3MgaG9tZSBkaXJlY3RvcnkuYCxcbiAgICAgICAgYWxpYXM6IFsnZyddLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IGxldmVsID0gb3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG4gICAgY29uc3QgW2NvbmZpZ10gPSBhd2FpdCBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKCdObyBjb25maWcgZm91bmQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldChjb25maWcsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXQob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQoanNvbkZpbGU6IEpTT05GaWxlLCBvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IG51bWJlciB7XG4gICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXMuY29udGV4dDtcblxuICAgIGNvbnN0IHZhbHVlID0gb3B0aW9ucy5qc29uUGF0aFxuICAgICAgPyBqc29uRmlsZS5nZXQocGFyc2VKc29uUGF0aChvcHRpb25zLmpzb25QYXRoKSlcbiAgICAgIDoganNvbkZpbGUuY29udGVudDtcblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsb2dnZXIuaW5mbyh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5pbmZvKEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNldChvcHRpb25zOiBPcHRpb25zPENvbmZpZ0NvbW1hbmRBcmdzPik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGlmICghb3B0aW9ucy5qc29uUGF0aD8udHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsaWRHbG9iYWxDbGlQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPihbXG4gICAgICAnY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCcsXG4gICAgICAnY2xpLmRlZmF1bHRDb2xsZWN0aW9uJyxcbiAgICAgICdjbGkuc2NoZW1hdGljQ29sbGVjdGlvbnMnLFxuICAgICAgJ2NsaS5wYWNrYWdlTWFuYWdlcicsXG5cbiAgICAgICdjbGkuYW5hbHl0aWNzJyxcbiAgICAgICdjbGkuYW5hbHl0aWNzU2hhcmluZy50cmFja2luZycsXG4gICAgICAnY2xpLmFuYWx5dGljc1NoYXJpbmcudXVpZCcsXG5cbiAgICAgICdjbGkuY29tcGxldGlvbi5wcm9tcHRlZCcsXG4gICAgXSk7XG5cbiAgICBpZiAoXG4gICAgICBvcHRpb25zLmdsb2JhbCAmJlxuICAgICAgIW9wdGlvbnMuanNvblBhdGguc3RhcnRzV2l0aCgnc2NoZW1hdGljcy4nKSAmJlxuICAgICAgIXZhbGlkR2xvYmFsQ2xpUGF0aHMuaGFzKG9wdGlvbnMuanNvblBhdGgpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBhd2FpdCBnZXRXb3Jrc3BhY2VSYXcob3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCcpO1xuICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQ29uZmd1cmF0aW9uIGZpbGUgY2Fubm90IGJlIGZvdW5kLicpO1xuICAgIH1cblxuICAgIGNvbnN0IG5vcm1hbGl6ZVVVSURWYWx1ZSA9ICh2OiBzdHJpbmcgfCB1bmRlZmluZWQpID0+ICh2ID09PSAnJyA/IHV1aWRWNCgpIDogYCR7dn1gKTtcblxuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIG9wdGlvbnMuanNvblBhdGggPT09ICdjbGkuYW5hbHl0aWNzU2hhcmluZy51dWlkJ1xuICAgICAgICA/IG5vcm1hbGl6ZVVVSURWYWx1ZShvcHRpb25zLnZhbHVlKVxuICAgICAgICA6IG9wdGlvbnMudmFsdWU7XG5cbiAgICBjb25zdCBtb2RpZmllZCA9IGNvbmZpZy5tb2RpZnkocGFyc2VKc29uUGF0aChvcHRpb25zLmpzb25QYXRoKSwgbm9ybWFsaXplVmFsdWUodmFsdWUpKTtcblxuICAgIGlmICghbW9kaWZpZWQpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBhd2FpdCB2YWxpZGF0ZVdvcmtzcGFjZShwYXJzZUpzb24oY29uZmlnLmNvbnRlbnQpKTtcblxuICAgIGNvbmZpZy5zYXZlKCk7XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG4vKipcbiAqIFNwbGl0cyBhIEpTT04gcGF0aCBzdHJpbmcgaW50byBmcmFnbWVudHMuIEZyYWdtZW50cyBjYW4gYmUgdXNlZCB0byBnZXQgdGhlIHZhbHVlIHJlZmVyZW5jZWRcbiAqIGJ5IHRoZSBwYXRoLiBGb3IgZXhhbXBsZSwgYSBwYXRoIG9mIFwiYVszXS5mb28uYmFyWzJdXCIgd291bGQgZ2l2ZSB5b3UgYSBmcmFnbWVudCBhcnJheSBvZlxuICogW1wiYVwiLCAzLCBcImZvb1wiLCBcImJhclwiLCAyXS5cbiAqIEBwYXJhbSBwYXRoIFRoZSBKU09OIHN0cmluZyB0byBwYXJzZS5cbiAqIEByZXR1cm5zIHsoc3RyaW5nfG51bWJlcilbXX0gVGhlIGZyYWdtZW50cyBmb3IgdGhlIHN0cmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSnNvblBhdGgocGF0aDogc3RyaW5nKTogKHN0cmluZyB8IG51bWJlcilbXSB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IChwYXRoIHx8ICcnKS5zcGxpdCgvXFwuL2cpO1xuICBjb25zdCByZXN1bHQ6IChzdHJpbmcgfCBudW1iZXIpW10gPSBbXTtcblxuICB3aGlsZSAoZnJhZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFnbWVudCA9IGZyYWdtZW50cy5zaGlmdCgpO1xuICAgIGlmIChmcmFnbWVudCA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoID0gZnJhZ21lbnQubWF0Y2goLyhbXltdKykoKFxcWy4qXFxdKSopLyk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignSW52YWxpZCBKU09OIHBhdGguJyk7XG4gICAgfVxuXG4gICAgcmVzdWx0LnB1c2gobWF0Y2hbMV0pO1xuICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgY29uc3QgaW5kaWNlcyA9IG1hdGNoWzJdXG4gICAgICAgIC5zbGljZSgxLCAtMSlcbiAgICAgICAgLnNwbGl0KCddWycpXG4gICAgICAgIC5tYXAoKHgpID0+ICgvXlxcZCQvLnRlc3QoeCkgPyAreCA6IHgucmVwbGFjZSgvXCJ8Jy9nLCAnJykpKTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmluZGljZXMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQuZmlsdGVyKChmcmFnbWVudCkgPT4gZnJhZ21lbnQgIT0gbnVsbCk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyKTogSnNvblZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWVTdHJpbmcgPSBgJHt2YWx1ZX1gLnRyaW0oKTtcbiAgc3dpdGNoICh2YWx1ZVN0cmluZykge1xuICAgIGNhc2UgJ3RydWUnOlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY2FzZSAnZmFsc2UnOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgJ251bGwnOlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoaXNGaW5pdGUoK3ZhbHVlU3RyaW5nKSkge1xuICAgIHJldHVybiArdmFsdWVTdHJpbmc7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFdlIHVzZSBgSlNPTi5wYXJzZWAgaW5zdGVhZCBvZiBgcGFyc2VKc29uYCBiZWNhdXNlIHRoZSBsYXR0ZXIgd2lsbCBwYXJzZSBVVUlEc1xuICAgIC8vIGFuZCBjb252ZXJ0IHRoZW0gaW50byBhIG51bWJlcmljIGVudGl0aWVzLlxuICAgIC8vIEV4YW1wbGU6IDczYjYxOTc0LTE4MmMtNDhlNC1iNGM2LTMwZGRmMDhjNWM5OCAtPiA3My5cbiAgICAvLyBUaGVzZSB2YWx1ZXMgc2hvdWxkIG5ldmVyIGNvbnRhaW4gY29tbWVudHMsIHRoZXJlZm9yZSB1c2luZyBgSlNPTi5wYXJzZWAgaXMgc2FmZS5cbiAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZVN0cmluZyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuIl19