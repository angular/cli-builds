"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const command_1 = require("../models/command");
const config_1 = require("../utilities/config");
const validCliPaths = new Map([
    ['cli.warnings.versionMismatch', 'boolean'],
    ['cli.warnings.typescriptMismatch', 'boolean'],
    ['cli.defaultCollection', 'string'],
    ['cli.packageManager', 'string'],
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
                if (value.trim() === 'true') {
                    return true;
                }
                else if (value.trim() === 'false') {
                    return false;
                }
                break;
            case 'number':
                const numberValue = Number(value);
                if (!Number.isNaN(numberValue)) {
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
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const level = options.global ? 'global' : 'local';
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
        });
    }
    get(config, options) {
        let value;
        if (options.jsonPath) {
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
    }
    set(options) {
        if (!options.jsonPath || !options.jsonPath.trim()) {
            throw new Error('Invalid Path.');
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
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2NvbmZpZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCwrQ0FTOEI7QUFDOUIsMkJBQW1DO0FBQ25DLCtDQUFnRTtBQUNoRSxnREFLNkI7QUFTN0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDNUIsQ0FBQyw4QkFBOEIsRUFBRSxTQUFTLENBQUM7SUFDM0MsQ0FBQyxpQ0FBaUMsRUFBRSxTQUFTLENBQUM7SUFDOUMsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLENBQUM7SUFDbkMsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUM7Q0FDakMsQ0FBQyxDQUFDO0FBRUg7Ozs7Ozs7R0FPRztBQUNILFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUU1QixPQUFPLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQyxJQUFJLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDekIsTUFBTTtTQUNQO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFF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O1FBQ3BELGtCQUFhLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FFRjtBQTVGRCxzQ0E0RkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEludmFsaWRKc29uQ2hhcmFjdGVyRXhjZXB0aW9uLFxuICBKc29uQXJyYXksXG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIEpzb25WYWx1ZSxcbiAgZXhwZXJpbWVudGFsLFxuICBwYXJzZUpzb24sXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBCYXNlQ29tbWFuZE9wdGlvbnMsIENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQge1xuICBnZXRXb3Jrc3BhY2UsXG4gIGdldFdvcmtzcGFjZVJhdyxcbiAgbWlncmF0ZUxlZ2FjeUdsb2JhbENvbmZpZyxcbiAgdmFsaWRhdGVXb3Jrc3BhY2UsXG59IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnT3B0aW9ucyBleHRlbmRzIEJhc2VDb21tYW5kT3B0aW9ucyB7XG4gIGpzb25QYXRoOiBzdHJpbmc7XG4gIHZhbHVlPzogc3RyaW5nO1xuICBnbG9iYWw/OiBib29sZWFuO1xufVxuXG5jb25zdCB2YWxpZENsaVBhdGhzID0gbmV3IE1hcChbXG4gIFsnY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCcsICdib29sZWFuJ10sXG4gIFsnY2xpLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCcsICdib29sZWFuJ10sXG4gIFsnY2xpLmRlZmF1bHRDb2xsZWN0aW9uJywgJ3N0cmluZyddLFxuICBbJ2NsaS5wYWNrYWdlTWFuYWdlcicsICdzdHJpbmcnXSxcbl0pO1xuXG4vKipcbiAqIFNwbGl0cyBhIEpTT04gcGF0aCBzdHJpbmcgaW50byBmcmFnbWVudHMuIEZyYWdtZW50cyBjYW4gYmUgdXNlZCB0byBnZXQgdGhlIHZhbHVlIHJlZmVyZW5jZWRcbiAqIGJ5IHRoZSBwYXRoLiBGb3IgZXhhbXBsZSwgYSBwYXRoIG9mIFwiYVszXS5mb28uYmFyWzJdXCIgd291bGQgZ2l2ZSB5b3UgYSBmcmFnbWVudCBhcnJheSBvZlxuICogW1wiYVwiLCAzLCBcImZvb1wiLCBcImJhclwiLCAyXS5cbiAqIEBwYXJhbSBwYXRoIFRoZSBKU09OIHN0cmluZyB0byBwYXJzZS5cbiAqIEByZXR1cm5zIHtzdHJpbmdbXX0gVGhlIGZyYWdtZW50cyBmb3IgdGhlIHN0cmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSnNvblBhdGgocGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBmcmFnbWVudHMgPSAocGF0aCB8fCAnJykuc3BsaXQoL1xcLi9nKTtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuXG4gIHdoaWxlIChmcmFnbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYWdtZW50ID0gZnJhZ21lbnRzLnNoaWZ0KCk7XG4gICAgaWYgKGZyYWdtZW50ID09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2ggPSBmcmFnbWVudC5tYXRjaCgvKFteXFxbXSspKChcXFsuKlxcXSkqKS8pO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBKU09OIHBhdGguJyk7XG4gICAgfVxuXG4gICAgcmVzdWx0LnB1c2gobWF0Y2hbMV0pO1xuICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgY29uc3QgaW5kaWNlcyA9IG1hdGNoWzJdLnNsaWNlKDEsIC0xKS5zcGxpdCgnXVsnKTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmluZGljZXMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQuZmlsdGVyKGZyYWdtZW50ID0+ICEhZnJhZ21lbnQpO1xufVxuXG5mdW5jdGlvbiBnZXRWYWx1ZUZyb21QYXRoPFQgZXh0ZW5kcyBKc29uQXJyYXkgfCBKc29uT2JqZWN0PihcbiAgcm9vdDogVCxcbiAgcGF0aDogc3RyaW5nLFxuKTogSnNvblZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gcGFyc2VKc29uUGF0aChwYXRoKTtcblxuICB0cnkge1xuICAgIHJldHVybiBmcmFnbWVudHMucmVkdWNlKCh2YWx1ZTogSnNvblZhbHVlLCBjdXJyZW50OiBzdHJpbmcgfCBudW1iZXIpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSB1bmRlZmluZWQgfHwgdHlwZW9mIHZhbHVlICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50ID09ICdzdHJpbmcnICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWVbY3VycmVudF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50ID09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSwgcm9vdCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0VmFsdWVGcm9tUGF0aDxUIGV4dGVuZHMgSnNvbkFycmF5IHwgSnNvbk9iamVjdD4oXG4gIHJvb3Q6IFQsXG4gIHBhdGg6IHN0cmluZyxcbiAgbmV3VmFsdWU6IEpzb25WYWx1ZSxcbik6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IHBhcnNlSnNvblBhdGgocGF0aCk7XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZnJhZ21lbnRzLnJlZHVjZSgodmFsdWU6IEpzb25WYWx1ZSwgY3VycmVudDogc3RyaW5nIHwgbnVtYmVyLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodmFsdWUgPT0gdW5kZWZpbmVkIHx8IHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY3VycmVudCA9PSAnc3RyaW5nJyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSBmcmFnbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0gbmV3VmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVbY3VycmVudF0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBbXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVbY3VycmVudF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50ID09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gZnJhZ21lbnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IG5ld1ZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlW2N1cnJlbnRdID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgZnJhZ21lbnRzW2luZGV4ICsgMV0gPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0gW107XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZnJhZ21lbnRzW2luZGV4ICsgMV0gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0ge307XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlW2N1cnJlbnRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9LCByb290KTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBKc29uVmFsdWUge1xuICBjb25zdCBjbGlPcHRpb25UeXBlID0gdmFsaWRDbGlQYXRocy5nZXQocGF0aCk7XG4gIGlmIChjbGlPcHRpb25UeXBlKSB7XG4gICAgc3dpdGNoIChjbGlPcHRpb25UeXBlKSB7XG4gICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgaWYgKHZhbHVlLnRyaW0oKSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUudHJpbSgpID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY29uc3QgbnVtYmVyVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICBpZiAoIU51bWJlci5pc05hTihudW1iZXJWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gbnVtYmVyVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHZhbHVlIHR5cGU7IGV4cGVjdGVkIGEgJHtjbGlPcHRpb25UeXBlfS5gKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwYXJzZUpzb24odmFsdWUsIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgSW52YWxpZEpzb25DaGFyYWN0ZXJFeGNlcHRpb24gJiYgIXZhbHVlLnN0YXJ0c1dpdGgoJ3snKSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIENvbmZpZ0NvbW1hbmQ8VCBleHRlbmRzIENvbmZpZ09wdGlvbnMgPSBDb25maWdPcHRpb25zPiBleHRlbmRzIENvbW1hbmQ8VD4ge1xuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IFQpIHtcbiAgICBjb25zdCBsZXZlbCA9IG9wdGlvbnMuZ2xvYmFsID8gJ2dsb2JhbCcgOiAnbG9jYWwnO1xuXG4gICAgbGV0IGNvbmZpZyA9XG4gICAgICAoZ2V0V29ya3NwYWNlKGxldmVsKSBhcyB7fSBhcyB7IF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuZ2xvYmFsICYmICFjb25maWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnKCkpIHtcbiAgICAgICAgICBjb25maWcgPVxuICAgICAgICAgICAgKGdldFdvcmtzcGFjZShsZXZlbCkgYXMge30gYXMgeyBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYSB9KTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFdlIGZvdW5kIGEgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gdGhhdCB3YXMgdXNlZCBpbiBBbmd1bGFyIENMSSAxLlxuICAgICAgICAgICAgSXQgaGFzIGJlZW4gYXV0b21hdGljYWxseSBtaWdyYXRlZC5gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnZhbHVlID09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ05vIGNvbmZpZyBmb3VuZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KGNvbmZpZy5fd29ya3NwYWNlLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0KGNvbmZpZzogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWEsIG9wdGlvbnM6IFQpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgaWYgKG9wdGlvbnMuanNvblBhdGgpIHtcbiAgICAgIHZhbHVlID0gZ2V0VmFsdWVGcm9tUGF0aChjb25maWcgYXMge30gYXMgSnNvbk9iamVjdCwgb3B0aW9ucy5qc29uUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gY29uZmlnO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2V0KG9wdGlvbnM6IENvbmZpZ09wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuanNvblBhdGggfHwgIW9wdGlvbnMuanNvblBhdGgudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZ2xvYmFsXG4gICAgICAgICYmICFvcHRpb25zLmpzb25QYXRoLnN0YXJ0c1dpdGgoJ3NjaGVtYXRpY3MuJylcbiAgICAgICAgJiYgIXZhbGlkQ2xpUGF0aHMuaGFzKG9wdGlvbnMuanNvblBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUGF0aC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBbY29uZmlnLCBjb25maWdQYXRoXSA9IGdldFdvcmtzcGFjZVJhdyhvcHRpb25zLmdsb2JhbCA/ICdnbG9iYWwnIDogJ2xvY2FsJyk7XG4gICAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1BhdGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDb25mZ3VyYXRpb24gZmlsZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIFRPRE86IE1vZGlmeSAmIHNhdmUgd2l0aG91dCBkZXN0cm95aW5nIGNvbW1lbnRzXG4gICAgY29uc3QgY29uZmlnVmFsdWUgPSBjb25maWcudmFsdWU7XG5cbiAgICBjb25zdCB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKG9wdGlvbnMudmFsdWUgfHwgJycsIG9wdGlvbnMuanNvblBhdGgpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHNldFZhbHVlRnJvbVBhdGgoY29uZmlnVmFsdWUsIG9wdGlvbnMuanNvblBhdGgsIHZhbHVlKTtcblxuICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBmb3VuZC4nKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhbGlkYXRlV29ya3NwYWNlKGNvbmZpZ1ZhbHVlKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dCA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZ1ZhbHVlLCBudWxsLCAyKTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIG91dHB1dCk7XG4gIH1cblxufVxuIl19