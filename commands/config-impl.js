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
const core_1 = require("@angular-devkit/core");
const uuid_1 = require("uuid");
const command_1 = require("../models/command");
const interface_1 = require("../models/interface");
const config_1 = require("../utilities/config");
const json_file_1 = require("../utilities/json-file");
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
        if (!options.global) {
            await this.validateScope(interface_1.CommandScope.InProject);
        }
        let [config] = (0, config_1.getWorkspaceRaw)(level);
        if (options.global && !config) {
            try {
                if ((0, config_1.migrateLegacyGlobalConfig)()) {
                    config = (0, config_1.getWorkspaceRaw)(level)[0];
                    this.logger.info(core_1.tags.oneLine `
            We found a global configuration that was used in Angular CLI 1.
            It has been automatically migrated.`);
                }
            }
            catch (_a) { }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9jb25maWctaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBdUQ7QUFDdkQsK0JBQW9DO0FBQ3BDLCtDQUE0QztBQUM1QyxtREFBOEQ7QUFDOUQsZ0RBQW9HO0FBQ3BHLHNEQUE2RDtBQUc3RCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FHM0I7SUFDQSxDQUFDLDhCQUE4QixFQUFFLFNBQVMsQ0FBQztJQUMzQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQztJQUNwQyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQztJQUNqQyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUM7SUFFNUIsQ0FBQywrQkFBK0IsRUFBRSxTQUFTLENBQUM7SUFDNUMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFBLFNBQU0sR0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFcEUsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUM7SUFDaEMsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUM7SUFDcEMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUM7Q0FDOUIsQ0FBQyxDQUFDO0FBRUg7Ozs7Ozs7R0FPRztBQUNILFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUF3QixFQUFFLENBQUM7SUFFdkMsT0FBTyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixN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LENBQUM7U0FDcEQ7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVqQyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUFqR0Qsc0NBaUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25WYWx1ZSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHY0IGFzIHV1aWRWNCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cywgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2VSYXcsIG1pZ3JhdGVMZWdhY3lHbG9iYWxDb25maWcsIHZhbGlkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBKU09ORmlsZSwgcGFyc2VKc29uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tZmlsZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29uZmlnQ29tbWFuZFNjaGVtYSB9IGZyb20gJy4vY29uZmlnJztcblxuY29uc3QgdmFsaWRDbGlQYXRocyA9IG5ldyBNYXA8XG4gIHN0cmluZyxcbiAgKChhcmc6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQpID0+IHN0cmluZykgfCB1bmRlZmluZWRcbj4oW1xuICBbJ2NsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2gnLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5kZWZhdWx0Q29sbGVjdGlvbicsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLnBhY2thZ2VNYW5hZ2VyJywgdW5kZWZpbmVkXSxcbiAgWydjbGkuYW5hbHl0aWNzJywgdW5kZWZpbmVkXSxcblxuICBbJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnRyYWNraW5nJywgdW5kZWZpbmVkXSxcbiAgWydjbGkuYW5hbHl0aWNzU2hhcmluZy51dWlkJywgKHYpID0+ICh2ID09PSAnJyA/IHV1aWRWNCgpIDogYCR7dn1gKV0sXG5cbiAgWydjbGkuY2FjaGUuZW5hYmxlZCcsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLmNhY2hlLmVudmlyb25tZW50JywgdW5kZWZpbmVkXSxcbiAgWydjbGkuY2FjaGUucGF0aCcsIHVuZGVmaW5lZF0sXG5dKTtcblxuLyoqXG4gKiBTcGxpdHMgYSBKU09OIHBhdGggc3RyaW5nIGludG8gZnJhZ21lbnRzLiBGcmFnbWVudHMgY2FuIGJlIHVzZWQgdG8gZ2V0IHRoZSB2YWx1ZSByZWZlcmVuY2VkXG4gKiBieSB0aGUgcGF0aC4gRm9yIGV4YW1wbGUsIGEgcGF0aCBvZiBcImFbM10uZm9vLmJhclsyXVwiIHdvdWxkIGdpdmUgeW91IGEgZnJhZ21lbnQgYXJyYXkgb2ZcbiAqIFtcImFcIiwgMywgXCJmb29cIiwgXCJiYXJcIiwgMl0uXG4gKiBAcGFyYW0gcGF0aCBUaGUgSlNPTiBzdHJpbmcgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyB7KHN0cmluZ3xudW1iZXIpW119IFRoZSBmcmFnbWVudHMgZm9yIHRoZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBwYXJzZUpzb25QYXRoKHBhdGg6IHN0cmluZyk6IChzdHJpbmcgfCBudW1iZXIpW10ge1xuICBjb25zdCBmcmFnbWVudHMgPSAocGF0aCB8fCAnJykuc3BsaXQoL1xcLi9nKTtcbiAgY29uc3QgcmVzdWx0OiAoc3RyaW5nIHwgbnVtYmVyKVtdID0gW107XG5cbiAgd2hpbGUgKGZyYWdtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhZ21lbnQgPSBmcmFnbWVudHMuc2hpZnQoKTtcbiAgICBpZiAoZnJhZ21lbnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IGZyYWdtZW50Lm1hdGNoKC8oW15bXSspKChcXFsuKlxcXSkqKS8pO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBKU09OIHBhdGguJyk7XG4gICAgfVxuXG4gICAgcmVzdWx0LnB1c2gobWF0Y2hbMV0pO1xuICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgY29uc3QgaW5kaWNlcyA9IG1hdGNoWzJdXG4gICAgICAgIC5zbGljZSgxLCAtMSlcbiAgICAgICAgLnNwbGl0KCddWycpXG4gICAgICAgIC5tYXAoKHgpID0+ICgvXlxcZCQvLnRlc3QoeCkgPyAreCA6IHgucmVwbGFjZSgvXCJ8Jy9nLCAnJykpKTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmluZGljZXMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQuZmlsdGVyKChmcmFnbWVudCkgPT4gZnJhZ21lbnQgIT0gbnVsbCk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyKTogSnNvblZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWVTdHJpbmcgPSBgJHt2YWx1ZX1gLnRyaW0oKTtcbiAgc3dpdGNoICh2YWx1ZVN0cmluZykge1xuICAgIGNhc2UgJ3RydWUnOlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY2FzZSAnZmFsc2UnOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgJ251bGwnOlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoaXNGaW5pdGUoK3ZhbHVlU3RyaW5nKSkge1xuICAgIHJldHVybiArdmFsdWVTdHJpbmc7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFdlIHVzZSBgSlNPTi5wYXJzZWAgaW5zdGVhZCBvZiBgcGFyc2VKc29uYCBiZWNhdXNlIHRoZSBsYXR0ZXIgd2lsbCBwYXJzZSBVVUlEc1xuICAgIC8vIGFuZCBjb252ZXJ0IHRoZW0gaW50byBhIG51bWJlcmljIGVudGl0aWVzLlxuICAgIC8vIEV4YW1wbGU6IDczYjYxOTc0LTE4MmMtNDhlNC1iNGM2LTMwZGRmMDhjNWM5OCAtPiA3My5cbiAgICAvLyBUaGVzZSB2YWx1ZXMgc2hvdWxkIG5ldmVyIGNvbnRhaW4gY29tbWVudHMsIHRoZXJlZm9yZSB1c2luZyBgSlNPTi5wYXJzZWAgaXMgc2FmZS5cbiAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZVN0cmluZyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlnQ29tbWFuZCBleHRlbmRzIENvbW1hbmQ8Q29uZmlnQ29tbWFuZFNjaGVtYT4ge1xuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IENvbmZpZ0NvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICBjb25zdCBsZXZlbCA9IG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuXG4gICAgaWYgKCFvcHRpb25zLmdsb2JhbCkge1xuICAgICAgYXdhaXQgdGhpcy52YWxpZGF0ZVNjb3BlKENvbW1hbmRTY29wZS5JblByb2plY3QpO1xuICAgIH1cblxuICAgIGxldCBbY29uZmlnXSA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbCk7XG5cbiAgICBpZiAob3B0aW9ucy5nbG9iYWwgJiYgIWNvbmZpZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKG1pZ3JhdGVMZWdhY3lHbG9iYWxDb25maWcoKSkge1xuICAgICAgICAgIGNvbmZpZyA9IGdldFdvcmtzcGFjZVJhdyhsZXZlbClbMF07XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBXZSBmb3VuZCBhIGdsb2JhbCBjb25maWd1cmF0aW9uIHRoYXQgd2FzIHVzZWQgaW4gQW5ndWxhciBDTEkgMS5cbiAgICAgICAgICAgIEl0IGhhcyBiZWVuIGF1dG9tYXRpY2FsbHkgbWlncmF0ZWQuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy52YWx1ZSA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdObyBjb25maWcgZm91bmQuJyk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldChjb25maWcsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXQob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQoanNvbkZpbGU6IEpTT05GaWxlLCBvcHRpb25zOiBDb25maWdDb21tYW5kU2NoZW1hKSB7XG4gICAgbGV0IHZhbHVlO1xuICAgIGlmIChvcHRpb25zLmpzb25QYXRoKSB7XG4gICAgICB2YWx1ZSA9IGpzb25GaWxlLmdldChwYXJzZUpzb25QYXRoKG9wdGlvbnMuanNvblBhdGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSBqc29uRmlsZS5jb250ZW50O1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNldChvcHRpb25zOiBDb25maWdDb21tYW5kU2NoZW1hKSB7XG4gICAgaWYgKCFvcHRpb25zLmpzb25QYXRoPy50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIG9wdGlvbnMuZ2xvYmFsICYmXG4gICAgICAhb3B0aW9ucy5qc29uUGF0aC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzLicpICYmXG4gICAgICAhdmFsaWRDbGlQYXRocy5oYXMob3B0aW9ucy5qc29uUGF0aClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGNvbnN0IFtjb25maWcsIGNvbmZpZ1BhdGhdID0gZ2V0V29ya3NwYWNlUmF3KG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnKTtcbiAgICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnUGF0aCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0NvbmZndXJhdGlvbiBmaWxlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgY29uc3QganNvblBhdGggPSBwYXJzZUpzb25QYXRoKG9wdGlvbnMuanNvblBhdGgpO1xuICAgIGNvbnN0IHZhbHVlID0gdmFsaWRDbGlQYXRocy5nZXQob3B0aW9ucy5qc29uUGF0aCk/LihvcHRpb25zLnZhbHVlKSA/PyBvcHRpb25zLnZhbHVlO1xuICAgIGNvbnN0IG1vZGlmaWVkID0gY29uZmlnLm1vZGlmeShqc29uUGF0aCwgbm9ybWFsaXplVmFsdWUodmFsdWUpKTtcblxuICAgIGlmICghbW9kaWZpZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB2YWxpZGF0ZVdvcmtzcGFjZShwYXJzZUpzb24oY29uZmlnLmNvbnRlbnQpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbmZpZy5zYXZlKCk7XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19