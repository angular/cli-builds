"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const command_1 = require("../models/command");
const interface_1 = require("../models/interface");
const config_1 = require("../utilities/config");
const validCliPaths = new Map([
    ['cli.warnings.versionMismatch', 'boolean'],
    ['cli.defaultCollection', 'string'],
    ['cli.packageManager', 'string'],
    ['cli.analytics', 'string'],
    ['cli.analyticsSharing.tracking', 'string'],
    ['cli.analyticsSharing.uuid', 'string'],
]);
/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {string[]} The fragments for the string.
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
        const match = fragment.match(/([^\[]+)((\[.*\])*)/);
        if (!match) {
            throw new Error('Invalid JSON path.');
        }
        result.push(match[1]);
        if (match[2]) {
            const indices = match[2].slice(1, -1).split('][');
            result.push(...indices);
        }
    }
    return result.filter(fragment => !!fragment);
}
function getValueFromPath(root, path) {
    const fragments = parseJsonPath(path);
    try {
        return fragments.reduce((value, current) => {
            if (value == undefined || typeof value != 'object') {
                return undefined;
            }
            else if (typeof current == 'string' && !Array.isArray(value)) {
                return value[current];
            }
            else if (typeof current == 'number' && Array.isArray(value)) {
                return value[current];
            }
            else {
                return undefined;
            }
        }, root);
    }
    catch (_a) {
        return undefined;
    }
}
function setValueFromPath(root, path, newValue) {
    const fragments = parseJsonPath(path);
    try {
        return fragments.reduce((value, current, index) => {
            if (value == undefined || typeof value != 'object') {
                return undefined;
            }
            else if (typeof current == 'string' && !Array.isArray(value)) {
                if (index === fragments.length - 1) {
                    value[current] = newValue;
                }
                else if (value[current] == undefined) {
                    if (typeof fragments[index + 1] == 'number') {
                        value[current] = [];
                    }
                    else if (typeof fragments[index + 1] == 'string') {
                        value[current] = {};
                    }
                }
                return value[current];
            }
            else if (typeof current == 'number' && Array.isArray(value)) {
                if (index === fragments.length - 1) {
                    value[current] = newValue;
                }
                else if (value[current] == undefined) {
                    if (typeof fragments[index + 1] == 'number') {
                        value[current] = [];
                    }
                    else if (typeof fragments[index + 1] == 'string') {
                        value[current] = {};
                    }
                }
                return value[current];
            }
            else {
                return undefined;
            }
        }, root);
    }
    catch (_a) {
        return undefined;
    }
}
function normalizeValue(value, path) {
    const cliOptionType = validCliPaths.get(path);
    if (cliOptionType) {
        switch (cliOptionType) {
            case 'boolean':
                if (('' + value).trim() === 'true') {
                    return true;
                }
                else if (('' + value).trim() === 'false') {
                    return false;
                }
                break;
            case 'number':
                const numberValue = Number(value);
                if (!Number.isFinite(numberValue)) {
                    return numberValue;
                }
                break;
            case 'string':
                return value;
        }
        throw new Error(`Invalid value type; expected a ${cliOptionType}.`);
    }
    if (typeof value === 'string') {
        try {
            return core_1.parseJson(value, core_1.JsonParseMode.Loose);
        }
        catch (e) {
            if (e instanceof core_1.InvalidJsonCharacterException && !value.startsWith('{')) {
                return value;
            }
            else {
                throw e;
            }
        }
    }
    return value;
}
class ConfigCommand extends command_1.Command {
    async run(options) {
        const level = options.global ? 'global' : 'local';
        if (!options.global) {
            await this.validateScope(interface_1.CommandScope.InProject);
        }
        let config = config_1.getWorkspace(level);
        if (options.global && !config) {
            try {
                if (config_1.migrateLegacyGlobalConfig()) {
                    config =
                        config_1.getWorkspace(level);
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
            return this.get(config._workspace, options);
        }
        else {
            return this.set(options);
        }
    }
    get(config, options) {
        let value;
        if (options.jsonPath) {
            if (options.jsonPath === 'cli.warnings.typescriptMismatch') {
                // NOTE: Remove this in 9.0.
                this.logger.warn('The "typescriptMismatch" warning has been removed in 8.0.');
                // Since there is no actual warning, this value is always false.
                this.logger.info('false');
                return 0;
            }
            value = getValueFromPath(config, options.jsonPath);
        }
        else {
            value = config;
        }
        if (value === undefined) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        else if (typeof value == 'object') {
            this.logger.info(JSON.stringify(value, null, 2));
        }
        else {
            this.logger.info(value.toString());
        }
        return 0;
    }
    set(options) {
        if (!options.jsonPath || !options.jsonPath.trim()) {
            throw new Error('Invalid Path.');
        }
        if (options.jsonPath === 'cli.warnings.typescriptMismatch') {
            // NOTE: Remove this in 9.0.
            this.logger.warn('The "typescriptMismatch" warning has been removed in 8.0.');
            return 0;
        }
        if (options.global
            && !options.jsonPath.startsWith('schematics.')
            && !validCliPaths.has(options.jsonPath)) {
            throw new Error('Invalid Path.');
        }
        const [config, configPath] = config_1.getWorkspaceRaw(options.global ? 'global' : 'local');
        if (!config || !configPath) {
            this.logger.error('Confguration file cannot be found.');
            return 1;
        }
        // TODO: Modify & save without destroying comments
        const configValue = config.value;
        const value = normalizeValue(options.value || '', options.jsonPath);
        const result = setValueFromPath(configValue, options.jsonPath, value);
        if (result === undefined) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        try {
            config_1.validateWorkspace(configValue);
        }
        catch (error) {
            this.logger.fatal(error.message);
            return 1;
        }
        const output = JSON.stringify(configValue, null, 2);
        fs_1.writeFileSync(configPath, output);
        return 0;
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2NvbmZpZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBUzhCO0FBQzlCLDJCQUFtQztBQUNuQywrQ0FBNEM7QUFDNUMsbURBQThEO0FBQzlELGdEQUs2QjtBQUk3QixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUM1QixDQUFDLDhCQUE4QixFQUFFLFNBQVMsQ0FBQztJQUMzQyxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQztJQUNuQyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQztJQUNoQyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUM7SUFDM0IsQ0FBQywrQkFBK0IsRUFBRSxRQUFRLENBQUM7SUFDM0MsQ0FBQywyQkFBMkIsRUFBRSxRQUFRLENBQUM7Q0FDeEMsQ0FBQyxDQUFDO0FBRUg7Ozs7Ozs7R0FPRztBQUNILFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUU1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQyxJQUFJLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDekIsTUFBTTtTQUNQO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkM7UUFFRCxNQUFNLENBQUMsSUFBSSxD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QUM7U0FDVjtRQUVELGtEQUFrRDtRQUNsRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBRWpDLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEUsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEUsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFFNUMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUk7WUFDRiwwQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNoQztRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWpDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsa0JBQWEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEMsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBRUY7QUFySEQsc0NBcUhDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBJbnZhbGlkSnNvbkNoYXJhY3RlckV4Y2VwdGlvbixcbiAgSnNvbkFycmF5LFxuICBKc29uT2JqZWN0LFxuICBKc29uUGFyc2VNb2RlLFxuICBKc29uVmFsdWUsXG4gIGV4cGVyaW1lbnRhbCxcbiAgcGFyc2VKc29uLFxuICB0YWdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cywgQ29tbWFuZFNjb3BlIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQge1xuICBnZXRXb3Jrc3BhY2UsXG4gIGdldFdvcmtzcGFjZVJhdyxcbiAgbWlncmF0ZUxlZ2FjeUdsb2JhbENvbmZpZyxcbiAgdmFsaWRhdGVXb3Jrc3BhY2UsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbmZpZ0NvbW1hbmRTY2hlbWEsIFZhbHVlIGFzIENvbmZpZ0NvbW1hbmRTY2hlbWFWYWx1ZSB9IGZyb20gJy4vY29uZmlnJztcblxuXG5jb25zdCB2YWxpZENsaVBhdGhzID0gbmV3IE1hcChbXG4gIFsnY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCcsICdib29sZWFuJ10sXG4gIFsnY2xpLmRlZmF1bHRDb2xsZWN0aW9uJywgJ3N0cmluZyddLFxuICBbJ2NsaS5wYWNrYWdlTWFuYWdlcicsICdzdHJpbmcnXSxcbiAgWydjbGkuYW5hbHl0aWNzJywgJ3N0cmluZyddLFxuICBbJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnRyYWNraW5nJywgJ3N0cmluZyddLFxuICBbJ2NsaS5hbmFseXRpY3NTaGFyaW5nLnV1aWQnLCAnc3RyaW5nJ10sXG5dKTtcblxuLyoqXG4gKiBTcGxpdHMgYSBKU09OIHBhdGggc3RyaW5nIGludG8gZnJhZ21lbnRzLiBGcmFnbWVudHMgY2FuIGJlIHVzZWQgdG8gZ2V0IHRoZSB2YWx1ZSByZWZlcmVuY2VkXG4gKiBieSB0aGUgcGF0aC4gRm9yIGV4YW1wbGUsIGEgcGF0aCBvZiBcImFbM10uZm9vLmJhclsyXVwiIHdvdWxkIGdpdmUgeW91IGEgZnJhZ21lbnQgYXJyYXkgb2ZcbiAqIFtcImFcIiwgMywgXCJmb29cIiwgXCJiYXJcIiwgMl0uXG4gKiBAcGFyYW0gcGF0aCBUaGUgSlNPTiBzdHJpbmcgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyB7c3RyaW5nW119IFRoZSBmcmFnbWVudHMgZm9yIHRoZSBzdHJpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBwYXJzZUpzb25QYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gKHBhdGggfHwgJycpLnNwbGl0KC9cXC4vZyk7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcblxuICB3aGlsZSAoZnJhZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFnbWVudCA9IGZyYWdtZW50cy5zaGlmdCgpO1xuICAgIGlmIChmcmFnbWVudCA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoID0gZnJhZ21lbnQubWF0Y2goLyhbXlxcW10rKSgoXFxbLipcXF0pKikvKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBwYXRoLicpO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKG1hdGNoWzFdKTtcbiAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgIGNvbnN0IGluZGljZXMgPSBtYXRjaFsyXS5zbGljZSgxLCAtMSkuc3BsaXQoJ11bJyk7XG4gICAgICByZXN1bHQucHVzaCguLi5pbmRpY2VzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0LmZpbHRlcihmcmFnbWVudCA9PiAhIWZyYWdtZW50KTtcbn1cblxuZnVuY3Rpb24gZ2V0VmFsdWVGcm9tUGF0aDxUIGV4dGVuZHMgSnNvbkFycmF5IHwgSnNvbk9iamVjdD4oXG4gIHJvb3Q6IFQsXG4gIHBhdGg6IHN0cmluZyxcbik6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IHBhcnNlSnNvblBhdGgocGF0aCk7XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZnJhZ21lbnRzLnJlZHVjZSgodmFsdWU6IEpzb25WYWx1ZSwgY3VycmVudDogc3RyaW5nIHwgbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodmFsdWUgPT0gdW5kZWZpbmVkIHx8IHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY3VycmVudCA9PSAnc3RyaW5nJyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlW2N1cnJlbnRdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY3VycmVudCA9PSAnbnVtYmVyJyAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWVbY3VycmVudF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0sIHJvb3QpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFZhbHVlRnJvbVBhdGg8VCBleHRlbmRzIEpzb25BcnJheSB8IEpzb25PYmplY3Q+KFxuICByb290OiBULFxuICBwYXRoOiBzdHJpbmcsXG4gIG5ld1ZhbHVlOiBKc29uVmFsdWUsXG4pOiBKc29uVmFsdWUgfCB1bmRlZmluZWQge1xuICBjb25zdCBmcmFnbWVudHMgPSBwYXJzZUpzb25QYXRoKHBhdGgpO1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGZyYWdtZW50cy5yZWR1Y2UoKHZhbHVlOiBKc29uVmFsdWUsIGN1cnJlbnQ6IHN0cmluZyB8IG51bWJlciwgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKHZhbHVlID09IHVuZGVmaW5lZCB8fCB0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ3N0cmluZycgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gZnJhZ21lbnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IG5ld1ZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlW2N1cnJlbnRdID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgZnJhZ21lbnRzW2luZGV4ICsgMV0gPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0gW107XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZnJhZ21lbnRzW2luZGV4ICsgMV0gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0ge307XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlW2N1cnJlbnRdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY3VycmVudCA9PSAnbnVtYmVyJyAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBpZiAoaW5kZXggPT09IGZyYWdtZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBuZXdWYWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVtjdXJyZW50XSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IFtdO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSwgcm9vdCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWU6IENvbmZpZ0NvbW1hbmRTY2hlbWFWYWx1ZSwgcGF0aDogc3RyaW5nKTogSnNvblZhbHVlIHtcbiAgY29uc3QgY2xpT3B0aW9uVHlwZSA9IHZhbGlkQ2xpUGF0aHMuZ2V0KHBhdGgpO1xuICBpZiAoY2xpT3B0aW9uVHlwZSkge1xuICAgIHN3aXRjaCAoY2xpT3B0aW9uVHlwZSkge1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIGlmICgoJycgKyB2YWx1ZSkudHJpbSgpID09PSAndHJ1ZScpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgoJycgKyB2YWx1ZSkudHJpbSgpID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY29uc3QgbnVtYmVyVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShudW1iZXJWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gbnVtYmVyVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHZhbHVlIHR5cGU7IGV4cGVjdGVkIGEgJHtjbGlPcHRpb25UeXBlfS5gKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwYXJzZUpzb24odmFsdWUsIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgSW52YWxpZEpzb25DaGFyYWN0ZXJFeGNlcHRpb24gJiYgIXZhbHVlLnN0YXJ0c1dpdGgoJ3snKSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPENvbmZpZ0NvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBDb25maWdDb21tYW5kU2NoZW1hICYgQXJndW1lbnRzKSB7XG4gICAgY29uc3QgbGV2ZWwgPSBvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJztcblxuICAgIGlmICghb3B0aW9ucy5nbG9iYWwpIHtcbiAgICAgIGF3YWl0IHRoaXMudmFsaWRhdGVTY29wZShDb21tYW5kU2NvcGUuSW5Qcm9qZWN0KTtcbiAgICB9XG5cbiAgICBsZXQgY29uZmlnID1cbiAgICAgIChnZXRXb3Jrc3BhY2UobGV2ZWwpIGFzIHt9IGFzIHsgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWEgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5nbG9iYWwgJiYgIWNvbmZpZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKG1pZ3JhdGVMZWdhY3lHbG9iYWxDb25maWcoKSkge1xuICAgICAgICAgIGNvbmZpZyA9XG4gICAgICAgICAgICAoZ2V0V29ya3NwYWNlKGxldmVsKSBhcyB7fSBhcyB7IF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hIH0pO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgV2UgZm91bmQgYSBnbG9iYWwgY29uZmlndXJhdGlvbiB0aGF0IHdhcyB1c2VkIGluIEFuZ3VsYXIgQ0xJIDEuXG4gICAgICAgICAgICBJdCBoYXMgYmVlbiBhdXRvbWF0aWNhbGx5IG1pZ3JhdGVkLmApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTm8gY29uZmlnIGZvdW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQoY29uZmlnLl93b3Jrc3BhY2UsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXQob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQoY29uZmlnOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYSwgb3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSkge1xuICAgIGxldCB2YWx1ZTtcbiAgICBpZiAob3B0aW9ucy5qc29uUGF0aCkge1xuICAgICAgaWYgKG9wdGlvbnMuanNvblBhdGggPT09ICdjbGkud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoJykge1xuICAgICAgICAvLyBOT1RFOiBSZW1vdmUgdGhpcyBpbiA5LjAuXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ1RoZSBcInR5cGVzY3JpcHRNaXNtYXRjaFwiIHdhcm5pbmcgaGFzIGJlZW4gcmVtb3ZlZCBpbiA4LjAuJyk7XG4gICAgICAgIC8vIFNpbmNlIHRoZXJlIGlzIG5vIGFjdHVhbCB3YXJuaW5nLCB0aGlzIHZhbHVlIGlzIGFsd2F5cyBmYWxzZS5cbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnZmFsc2UnKTtcblxuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBnZXRWYWx1ZUZyb21QYXRoKGNvbmZpZyBhcyB7fSBhcyBKc29uT2JqZWN0LCBvcHRpb25zLmpzb25QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSBjb25maWc7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odmFsdWUudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIHNldChvcHRpb25zOiBDb25maWdDb21tYW5kU2NoZW1hKSB7XG4gICAgaWYgKCFvcHRpb25zLmpzb25QYXRoIHx8ICFvcHRpb25zLmpzb25QYXRoLnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuanNvblBhdGggPT09ICdjbGkud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoJykge1xuICAgICAgLy8gTk9URTogUmVtb3ZlIHRoaXMgaW4gOS4wLlxuICAgICAgdGhpcy5sb2dnZXIud2FybignVGhlIFwidHlwZXNjcmlwdE1pc21hdGNoXCIgd2FybmluZyBoYXMgYmVlbiByZW1vdmVkIGluIDguMC4nKTtcblxuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZ2xvYmFsXG4gICAgICAgICYmICFvcHRpb25zLmpzb25QYXRoLnN0YXJ0c1dpdGgoJ3NjaGVtYXRpY3MuJylcbiAgICAgICAgJiYgIXZhbGlkQ2xpUGF0aHMuaGFzKG9wdGlvbnMuanNvblBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJyk7XG4gICAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDb25mZ3VyYXRpb24gZmlsZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIFRPRE86IE1vZGlmeSAmIHNhdmUgd2l0aG91dCBkZXN0cm95aW5nIGNvbW1lbnRzXG4gICAgY29uc3QgY29uZmlnVmFsdWUgPSBjb25maWcudmFsdWU7XG5cbiAgICBjb25zdCB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKG9wdGlvbnMudmFsdWUgfHwgJycsIG9wdGlvbnMuanNvblBhdGgpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHNldFZhbHVlRnJvbVBhdGgoY29uZmlnVmFsdWUsIG9wdGlvbnMuanNvblBhdGgsIHZhbHVlKTtcblxuICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhbGlkYXRlV29ya3NwYWNlKGNvbmZpZ1ZhbHVlKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dCA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZ1ZhbHVlLCBudWxsLCAyKTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIG91dHB1dCk7XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG59XG4iXX0=