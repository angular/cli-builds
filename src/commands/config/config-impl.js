"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const uuid_1 = require("uuid");
const command_1 = require("../../../models/command");
const config_1 = require("../../utilities/config");
const json_file_1 = require("../../utilities/json-file");
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
            throw new Error('Invalid JSON path.');
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
class ConfigCommand extends command_1.Command {
    async run(options) {
        const level = options.global ? 'global' : 'local';
        const [config] = (0, config_1.getWorkspaceRaw)(level);
        if (options.value == undefined) {
            if (!config) {
                this.logger.error('No config found.');
                return 1;
            }
            return this.get(config, options);
        }
        else {
            return this.set(options);
        }
    }
    get(jsonFile, options) {
        let value;
        if (options.jsonPath) {
            value = jsonFile.get(parseJsonPath(options.jsonPath));
        }
        else {
            value = jsonFile.content;
        }
        if (value === undefined) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        else if (typeof value === 'string') {
            this.logger.info(value);
        }
        else {
            this.logger.info(JSON.stringify(value, null, 2));
        }
        return 0;
    }
    async set(options) {
        var _a, _b, _c;
        if (!((_a = options.jsonPath) === null || _a === void 0 ? void 0 : _a.trim())) {
            throw new Error('Invalid Path.');
        }
        if (options.global &&
            !options.jsonPath.startsWith('schematics.') &&
            !validCliPaths.has(options.jsonPath)) {
            throw new Error('Invalid Path.');
        }
        const [config, configPath] = (0, config_1.getWorkspaceRaw)(options.global ? 'global' : 'local');
        if (!config || !configPath) {
            this.logger.error('Confguration file cannot be found.');
            return 1;
        }
        const jsonPath = parseJsonPath(options.jsonPath);
        const value = (_c = (_b = validCliPaths.get(options.jsonPath)) === null || _b === void 0 ? void 0 : _b(options.value)) !== null && _c !== void 0 ? _c : options.value;
        const modified = config.modify(jsonPath, normalizeValue(value));
        if (!modified) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        try {
            await (0, config_1.validateWorkspace)((0, json_file_1.parseJson)(config.content));
        }
        catch (error) {
            this.logger.fatal(error.message);
            return 1;
        }
        config.save();
        return 0;
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvY29uZmlnL2NvbmZpZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUdILCtCQUFvQztBQUNwQyxxREFBa0Q7QUFFbEQsbURBQTRFO0FBQzVFLHlEQUFnRTtBQUtoRSxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FHM0I7SUFDQSxDQUFDLDhCQUE4QixFQUFFLFNBQVMsQ0FBQztJQUMzQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQztJQUNwQyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQztJQUNqQyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUM7SUFFNUIsQ0FBQywrQkFBK0IsRUFBRSxTQUFTLENBQUM7SUFDNUMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFBLFNBQU0sR0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFcEUsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUM7SUFDaEMsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUM7SUFDcEMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUM7Q0FDOUIsQ0FBQyxDQUFDO0FBRUg7Ozs7Ozs7R0FPRztBQUNILFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUF3QixFQUFFLENBQUM7SUFFdkMsT0FBTyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixNQUFNLFFBQVEs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LENBQUMsVUFBVSxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFFeEQsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBQSxNQUFBLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQywwQ0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDcEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFaEUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFFNUMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUk7WUFDRixNQUFNLElBQUEsMEJBQWlCLEVBQUMsSUFBQSxxQkFBUyxFQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3BEO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFakMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVkLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBbEZELHNDQWtGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyB2NCBhcyB1dWlkVjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBPcHRpb25zIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdywgdmFsaWRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IEpTT05GaWxlLCBwYXJzZUpzb24gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvanNvbi1maWxlJztcbmltcG9ydCB7IENvbmZpZ0NvbW1hbmRBcmdzIH0gZnJvbSAnLi9jbGknO1xuXG50eXBlIENvbmZpZ0NvbW1hbmRPcHRpb25zID0gT3B0aW9uczxDb25maWdDb21tYW5kQXJncz47XG5cbmNvbnN0IHZhbGlkQ2xpUGF0aHMgPSBuZXcgTWFwPFxuICBzdHJpbmcsXG4gICgoYXJnOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkKSA9PiBzdHJpbmcpIHwgdW5kZWZpbmVkXG4+KFtcbiAgWydjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoJywgdW5kZWZpbmVkXSxcbiAgWydjbGkuZGVmYXVsdENvbGxlY3Rpb24nLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5wYWNrYWdlTWFuYWdlcicsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLmFuYWx5dGljcycsIHVuZGVmaW5lZF0sXG5cbiAgWydjbGkuYW5hbHl0aWNzU2hhcmluZy50cmFja2luZycsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLmFuYWx5dGljc1NoYXJpbmcudXVpZCcsICh2KSA9PiAodiA9PT0gJycgPyB1dWlkVjQoKSA6IGAke3Z9YCldLFxuXG4gIFsnY2xpLmNhY2hlLmVuYWJsZWQnLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5jYWNoZS5lbnZpcm9ubWVudCcsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLmNhY2hlLnBhdGgnLCB1bmRlZmluZWRdLFxuXSk7XG5cbi8qKlxuICogU3BsaXRzIGEgSlNPTiBwYXRoIHN0cmluZyBpbnRvIGZyYWdtZW50cy4gRnJhZ21lbnRzIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgdmFsdWUgcmVmZXJlbmNlZFxuICogYnkgdGhlIHBhdGguIEZvciBleGFtcGxlLCBhIHBhdGggb2YgXCJhWzNdLmZvby5iYXJbMl1cIiB3b3VsZCBnaXZlIHlvdSBhIGZyYWdtZW50IGFycmF5IG9mXG4gKiBbXCJhXCIsIDMsIFwiZm9vXCIsIFwiYmFyXCIsIDJdLlxuICogQHBhcmFtIHBhdGggVGhlIEpTT04gc3RyaW5nIHRvIHBhcnNlLlxuICogQHJldHVybnMgeyhzdHJpbmd8bnVtYmVyKVtdfSBUaGUgZnJhZ21lbnRzIGZvciB0aGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcGFyc2VKc29uUGF0aChwYXRoOiBzdHJpbmcpOiAoc3RyaW5nIHwgbnVtYmVyKVtdIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gKHBhdGggfHwgJycpLnNwbGl0KC9cXC4vZyk7XG4gIGNvbnN0IHJlc3VsdDogKHN0cmluZyB8IG51bWJlcilbXSA9IFtdO1xuXG4gIHdoaWxlIChmcmFnbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYWdtZW50ID0gZnJhZ21lbnRzLnNoaWZ0KCk7XG4gICAgaWYgKGZyYWdtZW50ID09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2ggPSBmcmFnbWVudC5tYXRjaCgvKFteW10rKSgoXFxbLipcXF0pKikvKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBwYXRoLicpO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKG1hdGNoWzFdKTtcbiAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgIGNvbnN0IGluZGljZXMgPSBtYXRjaFsyXVxuICAgICAgICAuc2xpY2UoMSwgLTEpXG4gICAgICAgIC5zcGxpdCgnXVsnKVxuICAgICAgICAubWFwKCh4KSA9PiAoL15cXGQkLy50ZXN0KHgpID8gK3ggOiB4LnJlcGxhY2UoL1wifCcvZywgJycpKSk7XG4gICAgICByZXN1bHQucHVzaCguLi5pbmRpY2VzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0LmZpbHRlcigoZnJhZ21lbnQpID0+IGZyYWdtZW50ICE9IG51bGwpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB8IG51bWJlcik6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlU3RyaW5nID0gYCR7dmFsdWV9YC50cmltKCk7XG4gIHN3aXRjaCAodmFsdWVTdHJpbmcpIHtcbiAgICBjYXNlICd0cnVlJzpcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlICdudWxsJzpcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKGlzRmluaXRlKCt2YWx1ZVN0cmluZykpIHtcbiAgICByZXR1cm4gK3ZhbHVlU3RyaW5nO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBXZSB1c2UgYEpTT04ucGFyc2VgIGluc3RlYWQgb2YgYHBhcnNlSnNvbmAgYmVjYXVzZSB0aGUgbGF0dGVyIHdpbGwgcGFyc2UgVVVJRHNcbiAgICAvLyBhbmQgY29udmVydCB0aGVtIGludG8gYSBudW1iZXJpYyBlbnRpdGllcy5cbiAgICAvLyBFeGFtcGxlOiA3M2I2MTk3NC0xODJjLTQ4ZTQtYjRjNi0zMGRkZjA4YzVjOTggLT4gNzMuXG4gICAgLy8gVGhlc2UgdmFsdWVzIHNob3VsZCBuZXZlciBjb250YWluIGNvbW1lbnRzLCB0aGVyZWZvcmUgdXNpbmcgYEpTT04ucGFyc2VgIGlzIHNhZmUuXG4gICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWVTdHJpbmcpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPENvbmZpZ0NvbW1hbmRPcHRpb25zPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQ29uZmlnQ29tbWFuZE9wdGlvbnMpIHtcbiAgICBjb25zdCBsZXZlbCA9IG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuXG4gICAgY29uc3QgW2NvbmZpZ10gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTm8gY29uZmlnIGZvdW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQoY29uZmlnLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0KGpzb25GaWxlOiBKU09ORmlsZSwgb3B0aW9uczogQ29uZmlnQ29tbWFuZE9wdGlvbnMpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgaWYgKG9wdGlvbnMuanNvblBhdGgpIHtcbiAgICAgIHZhbHVlID0ganNvbkZpbGUuZ2V0KHBhcnNlSnNvblBhdGgob3B0aW9ucy5qc29uUGF0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9IGpzb25GaWxlLmNvbnRlbnQ7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oSlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2V0KG9wdGlvbnM6IENvbmZpZ0NvbW1hbmRPcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLmpzb25QYXRoPy50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuZ2xvYmFsICYmXG4gICAgICAhb3B0aW9ucy5qc29uUGF0aC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzLicpICYmXG4gICAgICAhdmFsaWRDbGlQYXRocy5oYXMob3B0aW9ucy5qc29uUGF0aClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnKTtcbiAgICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0NvbmZndXJhdGlvbiBmaWxlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QganNvblBhdGggPSBwYXJzZUpzb25QYXRoKG9wdGlvbnMuanNvblBhdGgpO1xuICAgIGNvbnN0IHZhbHVlID0gdmFsaWRDbGlQYXRocy5nZXQob3B0aW9ucy5qc29uUGF0aCk/LihvcHRpb25zLnZhbHVlKSA/PyBvcHRpb25zLnZhbHVlO1xuICAgIGNvbnN0IG1vZGlmaWVkID0gY29uZmlnLm1vZGlmeShqc29uUGF0aCwgbm9ybWFsaXplVmFsdWUodmFsdWUpKTtcblxuICAgIGlmICghbW9kaWZpZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB2YWxpZGF0ZVdvcmtzcGFjZShwYXJzZUpzb24oY29uZmlnLmNvbnRlbnQpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbmZpZy5zYXZlKCk7XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19