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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2NvbmZpZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBUzhCO0FBQzlCLDJCQUFtQztBQUNuQywrQ0FBNEM7QUFFNUMsZ0RBSzZCO0FBSTdCLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDO0lBQzVCLENBQUMsOEJBQThCLEVBQUUsU0FBUyxDQUFDO0lBQzNDLENBQUMsaUNBQWlDLEVBQUUsU0FBUyxDQUFDO0lBQzlDLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO0lBQ25DLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDO0NBQ2pDLENBQUMsQ0FBQztBQUVIOzs7Ozs7O0dBT0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxJQUFZO0lBQ2pDLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFFNUIsT0FBTyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkMsSUFBSSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQ3pCLE1BQU07U0FDUDtRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ3ZDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNaLE1B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SSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELGtCQUFhLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWxDLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUVGO0FBaEdELHNDQWdHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgSW52YWxpZEpzb25DaGFyYWN0ZXJFeGNlcHRpb24sXG4gIEpzb25BcnJheSxcbiAgSnNvbk9iamVjdCxcbiAgSnNvblBhcnNlTW9kZSxcbiAgSnNvblZhbHVlLFxuICBleHBlcmltZW50YWwsXG4gIHBhcnNlSnNvbixcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7XG4gIGdldFdvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlUmF3LFxuICBtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnLFxuICB2YWxpZGF0ZVdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29uZmlnQ29tbWFuZFNjaGVtYSwgVmFsdWUgYXMgQ29uZmlnQ29tbWFuZFNjaGVtYVZhbHVlIH0gZnJvbSAnLi9jb25maWcnO1xuXG5cbmNvbnN0IHZhbGlkQ2xpUGF0aHMgPSBuZXcgTWFwKFtcbiAgWydjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoJywgJ2Jvb2xlYW4nXSxcbiAgWydjbGkud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoJywgJ2Jvb2xlYW4nXSxcbiAgWydjbGkuZGVmYXVsdENvbGxlY3Rpb24nLCAnc3RyaW5nJ10sXG4gIFsnY2xpLnBhY2thZ2VNYW5hZ2VyJywgJ3N0cmluZyddLFxuXSk7XG5cbi8qKlxuICogU3BsaXRzIGEgSlNPTiBwYXRoIHN0cmluZyBpbnRvIGZyYWdtZW50cy4gRnJhZ21lbnRzIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgdmFsdWUgcmVmZXJlbmNlZFxuICogYnkgdGhlIHBhdGguIEZvciBleGFtcGxlLCBhIHBhdGggb2YgXCJhWzNdLmZvby5iYXJbMl1cIiB3b3VsZCBnaXZlIHlvdSBhIGZyYWdtZW50IGFycmF5IG9mXG4gKiBbXCJhXCIsIDMsIFwiZm9vXCIsIFwiYmFyXCIsIDJdLlxuICogQHBhcmFtIHBhdGggVGhlIEpTT04gc3RyaW5nIHRvIHBhcnNlLlxuICogQHJldHVybnMge3N0cmluZ1tdfSBUaGUgZnJhZ21lbnRzIGZvciB0aGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcGFyc2VKc29uUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IChwYXRoIHx8ICcnKS5zcGxpdCgvXFwuL2cpO1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW107XG5cbiAgd2hpbGUgKGZyYWdtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhZ21lbnQgPSBmcmFnbWVudHMuc2hpZnQoKTtcbiAgICBpZiAoZnJhZ21lbnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IGZyYWdtZW50Lm1hdGNoKC8oW15cXFtdKykoKFxcWy4qXFxdKSopLyk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04gcGF0aC4nKTtcbiAgICB9XG5cbiAgICByZXN1bHQucHVzaChtYXRjaFsxXSk7XG4gICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICBjb25zdCBpbmRpY2VzID0gbWF0Y2hbMl0uc2xpY2UoMSwgLTEpLnNwbGl0KCddWycpO1xuICAgICAgcmVzdWx0LnB1c2goLi4uaW5kaWNlcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnJhZ21lbnQgPT4gISFmcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlRnJvbVBhdGg8VCBleHRlbmRzIEpzb25BcnJheSB8IEpzb25PYmplY3Q+KFxuICByb290OiBULFxuICBwYXRoOiBzdHJpbmcsXG4pOiBKc29uVmFsdWUgfCB1bmRlZmluZWQge1xuICBjb25zdCBmcmFnbWVudHMgPSBwYXJzZUpzb25QYXRoKHBhdGgpO1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGZyYWdtZW50cy5yZWR1Y2UoKHZhbHVlOiBKc29uVmFsdWUsIGN1cnJlbnQ6IHN0cmluZyB8IG51bWJlcikgPT4ge1xuICAgICAgaWYgKHZhbHVlID09IHVuZGVmaW5lZCB8fCB0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ3N0cmluZycgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlW2N1cnJlbnRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9LCByb290KTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRWYWx1ZUZyb21QYXRoPFQgZXh0ZW5kcyBKc29uQXJyYXkgfCBKc29uT2JqZWN0PihcbiAgcm9vdDogVCxcbiAgcGF0aDogc3RyaW5nLFxuICBuZXdWYWx1ZTogSnNvblZhbHVlLFxuKTogSnNvblZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gcGFyc2VKc29uUGF0aChwYXRoKTtcblxuICB0cnkge1xuICAgIHJldHVybiBmcmFnbWVudHMucmVkdWNlKCh2YWx1ZTogSnNvblZhbHVlLCBjdXJyZW50OiBzdHJpbmcgfCBudW1iZXIsIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSB1bmRlZmluZWQgfHwgdHlwZW9mIHZhbHVlICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50ID09ICdzdHJpbmcnICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBpZiAoaW5kZXggPT09IGZyYWdtZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBuZXdWYWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVtjdXJyZW50XSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IFtdO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSBmcmFnbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0gbmV3VmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVbY3VycmVudF0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBbXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVbY3VycmVudF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0sIHJvb3QpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlOiBDb25maWdDb21tYW5kU2NoZW1hVmFsdWUsIHBhdGg6IHN0cmluZyk6IEpzb25WYWx1ZSB7XG4gIGNvbnN0IGNsaU9wdGlvblR5cGUgPSB2YWxpZENsaVBhdGhzLmdldChwYXRoKTtcbiAgaWYgKGNsaU9wdGlvblR5cGUpIHtcbiAgICBzd2l0Y2ggKGNsaU9wdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBpZiAoKCcnICsgdmFsdWUpLnRyaW0oKSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoKCcnICsgdmFsdWUpLnRyaW0oKSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGNvbnN0IG51bWJlclZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobnVtYmVyVmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bWJlclZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB2YWx1ZSB0eXBlOyBleHBlY3RlZCBhICR7Y2xpT3B0aW9uVHlwZX0uYCk7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcGFyc2VKc29uKHZhbHVlLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIEludmFsaWRKc29uQ2hhcmFjdGVyRXhjZXB0aW9uICYmICF2YWx1ZS5zdGFydHNXaXRoKCd7JykpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxDb25maWdDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGNvbnN0IGxldmVsID0gb3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG5cbiAgICBsZXQgY29uZmlnID1cbiAgICAgIChnZXRXb3Jrc3BhY2UobGV2ZWwpIGFzIHt9IGFzIHsgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWEgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5nbG9iYWwgJiYgIWNvbmZpZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKG1pZ3JhdGVMZWdhY3lHbG9iYWxDb25maWcoKSkge1xuICAgICAgICAgIGNvbmZpZyA9XG4gICAgICAgICAgICAoZ2V0V29ya3NwYWNlKGxldmVsKSBhcyB7fSBhcyB7IF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hIH0pO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgV2UgZm91bmQgYSBnbG9iYWwgY29uZmlndXJhdGlvbiB0aGF0IHdhcyB1c2VkIGluIEFuZ3VsYXIgQ0xJIDEuXG4gICAgICAgICAgICBJdCBoYXMgYmVlbiBhdXRvbWF0aWNhbGx5IG1pZ3JhdGVkLmApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudmFsdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTm8gY29uZmlnIGZvdW5kLicpO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQoY29uZmlnLl93b3Jrc3BhY2UsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXQob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQoY29uZmlnOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYSwgb3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSkge1xuICAgIGxldCB2YWx1ZTtcbiAgICBpZiAob3B0aW9ucy5qc29uUGF0aCkge1xuICAgICAgdmFsdWUgPSBnZXRWYWx1ZUZyb21QYXRoKGNvbmZpZyBhcyB7fSBhcyBKc29uT2JqZWN0LCBvcHRpb25zLmpzb25QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSBjb25maWc7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKEpTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odmFsdWUudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwcml2YXRlIHNldChvcHRpb25zOiBDb25maWdDb21tYW5kU2NoZW1hKSB7XG4gICAgaWYgKCFvcHRpb25zLmpzb25QYXRoIHx8ICFvcHRpb25zLmpzb25QYXRoLnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmdsb2JhbFxuICAgICAgICAmJiAhb3B0aW9ucy5qc29uUGF0aC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzLicpXG4gICAgICAgICYmICF2YWxpZENsaVBhdGhzLmhhcyhvcHRpb25zLmpzb25QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcob3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCcpO1xuICAgIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ29uZmd1cmF0aW9uIGZpbGUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBNb2RpZnkgJiBzYXZlIHdpdGhvdXQgZGVzdHJveWluZyBjb21tZW50c1xuICAgIGNvbnN0IGNvbmZpZ1ZhbHVlID0gY29uZmlnLnZhbHVlO1xuXG4gICAgY29uc3QgdmFsdWUgPSBub3JtYWxpemVWYWx1ZShvcHRpb25zLnZhbHVlIHx8ICcnLCBvcHRpb25zLmpzb25QYXRoKTtcbiAgICBjb25zdCByZXN1bHQgPSBzZXRWYWx1ZUZyb21QYXRoKGNvbmZpZ1ZhbHVlLCBvcHRpb25zLmpzb25QYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0ZVdvcmtzcGFjZShjb25maWdWYWx1ZSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVycm9yLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQgPSBKU09OLnN0cmluZ2lmeShjb25maWdWYWx1ZSwgbnVsbCwgMik7XG4gICAgd3JpdGVGaWxlU3luYyhjb25maWdQYXRoLCBvdXRwdXQpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxufVxuIl19