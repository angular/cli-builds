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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9jb25maWctaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCwrQkFBb0M7QUFDcEMsK0NBQTRDO0FBQzVDLG1EQUE4RDtBQUM5RCxnREFBeUU7QUFDekUsc0RBQTZEO0FBRzdELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUczQjtJQUNBLENBQUMsOEJBQThCLEVBQUUsU0FBUyxDQUFDO0lBQzNDLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDO0lBQ3BDLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDO0lBQ2pDLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQztJQUU1QixDQUFDLCtCQUErQixFQUFFLFNBQVMsQ0FBQztJQUM1QyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUEsU0FBTSxHQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVwRSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQztJQUNoQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQztJQUNwQyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQztDQUM5QixDQUFDLENBQUM7QUFFSDs7Ozs7OztHQU9HO0FBQ0gsU0FBUyxhQUFhLENBQUMsSUFBWTtJQUNqQyxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsTUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztJQUV2QyxPQUFPLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLE1BQU0sUUFBUSxHQUFH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QUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBRXhELE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sS0FBSyxHQUFHLE1BQUEsTUFBQSxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsMENBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBSSxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3BGLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBRTVDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxJQUFJO1lBQ0YsTUFBTSxJQUFBLDBCQUFpQixFQUFDLElBQUEscUJBQVMsRUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNwRDtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWpDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFZCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRjtBQXRGRCxzQ0FzRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZFY0IH0gZnJvbSAndXVpZCc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBDb21tYW5kU2NvcGUgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZVJhdywgdmFsaWRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IEpTT05GaWxlLCBwYXJzZUpzb24gfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1maWxlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb25maWdDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9jb25maWcnO1xuXG5jb25zdCB2YWxpZENsaVBhdGhzID0gbmV3IE1hcDxcbiAgc3RyaW5nLFxuICAoKGFyZzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCkgPT4gc3RyaW5nKSB8IHVuZGVmaW5lZFxuPihbXG4gIFsnY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCcsIHVuZGVmaW5lZF0sXG4gIFsnY2xpLmRlZmF1bHRDb2xsZWN0aW9uJywgdW5kZWZpbmVkXSxcbiAgWydjbGkucGFja2FnZU1hbmFnZXInLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5hbmFseXRpY3MnLCB1bmRlZmluZWRdLFxuXG4gIFsnY2xpLmFuYWx5dGljc1NoYXJpbmcudHJhY2tpbmcnLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnV1aWQnLCAodikgPT4gKHYgPT09ICcnID8gdXVpZFY0KCkgOiBgJHt2fWApXSxcblxuICBbJ2NsaS5jYWNoZS5lbmFibGVkJywgdW5kZWZpbmVkXSxcbiAgWydjbGkuY2FjaGUuZW52aXJvbm1lbnQnLCB1bmRlZmluZWRdLFxuICBbJ2NsaS5jYWNoZS5wYXRoJywgdW5kZWZpbmVkXSxcbl0pO1xuXG4vKipcbiAqIFNwbGl0cyBhIEpTT04gcGF0aCBzdHJpbmcgaW50byBmcmFnbWVudHMuIEZyYWdtZW50cyBjYW4gYmUgdXNlZCB0byBnZXQgdGhlIHZhbHVlIHJlZmVyZW5jZWRcbiAqIGJ5IHRoZSBwYXRoLiBGb3IgZXhhbXBsZSwgYSBwYXRoIG9mIFwiYVszXS5mb28uYmFyWzJdXCIgd291bGQgZ2l2ZSB5b3UgYSBmcmFnbWVudCBhcnJheSBvZlxuICogW1wiYVwiLCAzLCBcImZvb1wiLCBcImJhclwiLCAyXS5cbiAqIEBwYXJhbSBwYXRoIFRoZSBKU09OIHN0cmluZyB0byBwYXJzZS5cbiAqIEByZXR1cm5zIHsoc3RyaW5nfG51bWJlcilbXX0gVGhlIGZyYWdtZW50cyBmb3IgdGhlIHN0cmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSnNvblBhdGgocGF0aDogc3RyaW5nKTogKHN0cmluZyB8IG51bWJlcilbXSB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IChwYXRoIHx8ICcnKS5zcGxpdCgvXFwuL2cpO1xuICBjb25zdCByZXN1bHQ6IChzdHJpbmcgfCBudW1iZXIpW10gPSBbXTtcblxuICB3aGlsZSAoZnJhZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFnbWVudCA9IGZyYWdtZW50cy5zaGlmdCgpO1xuICAgIGlmIChmcmFnbWVudCA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoID0gZnJhZ21lbnQubWF0Y2goLyhbXltdKykoKFxcWy4qXFxdKSopLyk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04gcGF0aC4nKTtcbiAgICB9XG5cbiAgICByZXN1bHQucHVzaChtYXRjaFsxXSk7XG4gICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICBjb25zdCBpbmRpY2VzID0gbWF0Y2hbMl1cbiAgICAgICAgLnNsaWNlKDEsIC0xKVxuICAgICAgICAuc3BsaXQoJ11bJylcbiAgICAgICAgLm1hcCgoeCkgPT4gKC9eXFxkJC8udGVzdCh4KSA/ICt4IDogeC5yZXBsYWNlKC9cInwnL2csICcnKSkpO1xuICAgICAgcmVzdWx0LnB1c2goLi4uaW5kaWNlcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoKGZyYWdtZW50KSA9PiBmcmFnbWVudCAhPSBudWxsKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIpOiBKc29uVmFsdWUgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZVN0cmluZyA9IGAke3ZhbHVlfWAudHJpbSgpO1xuICBzd2l0Y2ggKHZhbHVlU3RyaW5nKSB7XG4gICAgY2FzZSAndHJ1ZSc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjYXNlICdmYWxzZSc6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY2FzZSAnbnVsbCc6XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBjYXNlICd1bmRlZmluZWQnOlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmIChpc0Zpbml0ZSgrdmFsdWVTdHJpbmcpKSB7XG4gICAgcmV0dXJuICt2YWx1ZVN0cmluZztcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gV2UgdXNlIGBKU09OLnBhcnNlYCBpbnN0ZWFkIG9mIGBwYXJzZUpzb25gIGJlY2F1c2UgdGhlIGxhdHRlciB3aWxsIHBhcnNlIFVVSURzXG4gICAgLy8gYW5kIGNvbnZlcnQgdGhlbSBpbnRvIGEgbnVtYmVyaWMgZW50aXRpZXMuXG4gICAgLy8gRXhhbXBsZTogNzNiNjE5NzQtMTgyYy00OGU0LWI0YzYtMzBkZGYwOGM1Yzk4IC0+IDczLlxuICAgIC8vIFRoZXNlIHZhbHVlcyBzaG91bGQgbmV2ZXIgY29udGFpbiBjb21tZW50cywgdGhlcmVmb3JlIHVzaW5nIGBKU09OLnBhcnNlYCBpcyBzYWZlLlxuICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlU3RyaW5nKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxDb25maWdDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGNvbnN0IGxldmVsID0gb3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG5cbiAgICBpZiAoIW9wdGlvbnMuZ2xvYmFsKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlU2NvcGUoQ29tbWFuZFNjb3BlLkluUHJvamVjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgW2NvbmZpZ10gPSBnZXRXb3Jrc3BhY2VSYXcobGV2ZWwpO1xuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTm8gY29uZmlnIGZvdW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQoY29uZmlnLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0KGpzb25GaWxlOiBKU09ORmlsZSwgb3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSkge1xuICAgIGxldCB2YWx1ZTtcbiAgICBpZiAob3B0aW9ucy5qc29uUGF0aCkge1xuICAgICAgdmFsdWUgPSBqc29uRmlsZS5nZXQocGFyc2VKc29uUGF0aChvcHRpb25zLmpzb25QYXRoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0ganNvbkZpbGUuY29udGVudDtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZXQob3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSkge1xuICAgIGlmICghb3B0aW9ucy5qc29uUGF0aD8udHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBvcHRpb25zLmdsb2JhbCAmJlxuICAgICAgIW9wdGlvbnMuanNvblBhdGguc3RhcnRzV2l0aCgnc2NoZW1hdGljcy4nKSAmJlxuICAgICAgIXZhbGlkQ2xpUGF0aHMuaGFzKG9wdGlvbnMuanNvblBhdGgpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJyk7XG4gICAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDb25mZ3VyYXRpb24gZmlsZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IGpzb25QYXRoID0gcGFyc2VKc29uUGF0aChvcHRpb25zLmpzb25QYXRoKTtcbiAgICBjb25zdCB2YWx1ZSA9IHZhbGlkQ2xpUGF0aHMuZ2V0KG9wdGlvbnMuanNvblBhdGgpPy4ob3B0aW9ucy52YWx1ZSkgPz8gb3B0aW9ucy52YWx1ZTtcbiAgICBjb25zdCBtb2RpZmllZCA9IGNvbmZpZy5tb2RpZnkoanNvblBhdGgsIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSk7XG5cbiAgICBpZiAoIW1vZGlmaWVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdmFsaWRhdGVXb3Jrc3BhY2UocGFyc2VKc29uKGNvbmZpZy5jb250ZW50KSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVycm9yLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25maWcuc2F2ZSgpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cbiJdfQ==