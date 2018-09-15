"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const fs_1 = require("fs");
const path_1 = require("path");
const interface_1 = require("../models/interface");
function _getEnumFromValue(v, e, d) {
    if (typeof v !== 'string') {
        return d;
    }
    if (Object.values(e).indexOf(v) !== -1) {
        return v;
    }
    return d;
}
async function parseJsonSchemaToCommandDescription(name, jsonPath, registry, schema) {
    // Before doing any work, let's validate the implementation.
    if (typeof schema.$impl != 'string') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const ref = new tools_1.ExportStringRef(schema.$impl, path_1.dirname(jsonPath));
    const impl = ref.ref;
    if (impl === undefined || typeof impl !== 'function') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const options = await parseJsonSchemaToOptions(registry, schema);
    const aliases = [];
    if (core_1.json.isJsonArray(schema.$aliases)) {
        schema.$aliases.forEach(value => {
            if (typeof value == 'string') {
                aliases.push(value);
            }
        });
    }
    if (core_1.json.isJsonArray(schema.aliases)) {
        schema.aliases.forEach(value => {
            if (typeof value == 'string') {
                aliases.push(value);
            }
        });
    }
    if (typeof schema.alias == 'string') {
        aliases.push(schema.alias);
    }
    let longDescription = '';
    if (typeof schema.$longDescription == 'string' && schema.$longDescription) {
        const ldPath = path_1.resolve(path_1.dirname(jsonPath), schema.$longDescription);
        longDescription = fs_1.readFileSync(ldPath, 'utf-8');
    }
    const scope = _getEnumFromValue(schema.$scope, interface_1.CommandScope, interface_1.CommandScope.Default);
    const type = _getEnumFromValue(schema.$type, interface_1.CommandType, interface_1.CommandType.Default);
    const description = '' + (schema.description === undefined ? '' : schema.description);
    const hidden = !!schema.$hidden;
    return { name, description, longDescription, hidden, type, options, aliases, scope, impl };
}
exports.parseJsonSchemaToCommandDescription = parseJsonSchemaToCommandDescription;
async function parseJsonSchemaToOptions(registry, schema) {
    const options = [];
    function visitor(current, pointer, parentSchema) {
        if (!parentSchema) {
            // Ignore root.
            return;
        }
        else if (pointer.split(/\/(?:properties|items|definitions)\//g).length > 2) {
            // Ignore subitems (objects or arrays).
            return;
        }
        else if (core_1.json.isJsonArray(current)) {
            return;
        }
        if (pointer.indexOf('/not/') != -1) {
            // We don't support anyOf/not.
            throw new Error('The "not" keyword is not supported in JSON Schema.');
        }
        const ptr = core_1.json.schema.parseJsonPointer(pointer);
        const name = ptr[ptr.length - 1];
        if (ptr[ptr.length - 2] != 'properties') {
            // Skip any non-property items.
            return;
        }
        const typeSet = core_1.json.schema.getTypesOfSchema(current);
        if (typeSet.size == 0) {
            throw new Error('Cannot find type of schema.');
        }
        // We only support number, string or boolean (or array of those), so remove everything else.
        const types = [...typeSet].filter(x => {
            switch (x) {
                case 'boolean':
                case 'number':
                case 'string':
                    return true;
                case 'array':
                    // Only include arrays if they're boolean, string or number.
                    if (core_1.json.isJsonObject(current.items)
                        && typeof current.items.type == 'string'
                        && ['boolean', 'number', 'string'].includes(current.items.type)) {
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        }).map(x => _getEnumFromValue(x, interface_1.OptionType, interface_1.OptionType.String));
        if (types.length == 0) {
            // This means it's not usable on the command line. e.g. an Object.
            return;
        }
        let defaultValue = undefined;
        if (current.default !== undefined) {
            switch (types[0]) {
                case 'string':
                    if (typeof current.default == 'string') {
                        defaultValue = current.default;
                    }
                    break;
                case 'number':
                    if (typeof current.default == 'number') {
                        defaultValue = current.default;
                    }
                    break;
                case 'boolean':
                    if (typeof current.default == 'boolean') {
                        defaultValue = current.default;
                    }
                    break;
            }
        }
        const $default = current.$default;
        const $defaultIndex = (core_1.json.isJsonObject($default) && $default['$source'] == 'argv')
            ? $default['index'] : undefined;
        const positional = typeof $defaultIndex == 'number'
            ? $defaultIndex : undefined;
        const required = core_1.json.isJsonArray(current.required)
            ? current.required.indexOf(name) != -1 : false;
        const aliases = core_1.json.isJsonArray(current.aliases) ? [...current.aliases].map(x => '' + x)
            : current.alias ? ['' + current.alias] : [];
        const format = typeof current.format == 'string' ? current.format : undefined;
        const visible = current.visible === undefined || current.visible === true;
        const hidden = !!current.hidden || !visible;
        const option = Object.assign({ name, description: '' + (current.description === undefined ? '' : current.description) }, types.length == 1 ? { type: types[0] } : { type: types[0], types }, defaultValue !== undefined ? { default: defaultValue } : {}, { required,
            aliases }, format !== undefined ? { format } : {}, { hidden }, positional !== undefined ? { positional } : {});
        options.push(option);
    }
    const flattenedSchema = await registry.flatten(schema).toPromise();
    core_1.json.schema.visitJsonSchema(flattenedSchema, visitor);
    // Sort by positional.
    return options.sort((a, b) => {
        if (a.positional) {
            if (b.positional) {
                return a.positional - b.positional;
            }
            else {
                return 1;
            }
        }
        else if (b.positional) {
            return -1;
        }
        else {
            return 0;
        }
    });
}
exports.parseJsonSchemaToOptions = parseJsonSchemaToOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUM1Qyw0REFBbUU7QUFDbkUsMkJBQWtDO0FBQ2xDLCtCQUF3QztBQUN4QyxtREFPNkI7QUFFN0IsU0FBUyxpQkFBaUIsQ0FBc0IsQ0FBaUIsRUFBRSxDQUFJLEVBQUUsQ0FBSTtJQUMzRSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUN6QixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUN0QyxPQUFPLENBQU0sQ0FBQztLQUNmO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRU0sS0FBSyxVQUFVLG1DQUFtQyxDQUN2RCxJQUFZLEVBQ1osUUFBZ0IsRUFDaEIsUUFBb0MsRUFDcEMsTUFBdUI7SUFFdkIsNERBQTREO0lBQzVELElBQUksT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLFFBQVEsRUFBRTtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ25FO0lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBZSxDQUFxQixNQUFNLENBQUMsS0FBSyxFQUFFLGNBQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFckIsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRTtRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ25F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SUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgRXhwb3J0U3RyaW5nUmVmIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZENvbnN0cnVjdG9yLFxuICBDb21tYW5kRGVzY3JpcHRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgQ29tbWFuZFR5cGUsXG4gIE9wdGlvbixcbiAgT3B0aW9uVHlwZSxcbn0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5cbmZ1bmN0aW9uIF9nZXRFbnVtRnJvbVZhbHVlPEUsIFQgZXh0ZW5kcyBzdHJpbmc+KHY6IGpzb24uSnNvblZhbHVlLCBlOiBFLCBkOiBUKTogVCB7XG4gIGlmICh0eXBlb2YgdiAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZDtcbiAgfVxuXG4gIGlmIChPYmplY3QudmFsdWVzKGUpLmluZGV4T2YodikgIT09IC0xKSB7XG4gICAgcmV0dXJuIHYgYXMgVDtcbiAgfVxuXG4gIHJldHVybiBkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2NoZW1hVG9Db21tYW5kRGVzY3JpcHRpb24oXG4gIG5hbWU6IHN0cmluZyxcbiAganNvblBhdGg6IHN0cmluZyxcbiAgcmVnaXN0cnk6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5LFxuICBzY2hlbWE6IGpzb24uSnNvbk9iamVjdCxcbik6IFByb21pc2U8Q29tbWFuZERlc2NyaXB0aW9uPiB7XG4gIC8vIEJlZm9yZSBkb2luZyBhbnkgd29yaywgbGV0J3MgdmFsaWRhdGUgdGhlIGltcGxlbWVudGF0aW9uLlxuICBpZiAodHlwZW9mIHNjaGVtYS4kaW1wbCAhPSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ29tbWFuZCAke25hbWV9IGhhcyBhbiBpbnZhbGlkIGltcGxlbWVudGF0aW9uLmApO1xuICB9XG4gIGNvbnN0IHJlZiA9IG5ldyBFeHBvcnRTdHJpbmdSZWY8Q29tbWFuZENvbnN0cnVjdG9yPihzY2hlbWEuJGltcGwsIGRpcm5hbWUoanNvblBhdGgpKTtcbiAgY29uc3QgaW1wbCA9IHJlZi5yZWY7XG5cbiAgaWYgKGltcGwgPT09IHVuZGVmaW5lZCB8fCB0eXBlb2YgaW1wbCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ29tbWFuZCAke25hbWV9IGhhcyBhbiBpbnZhbGlkIGltcGxlbWVudGF0aW9uLmApO1xuICB9XG5cbiAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhyZWdpc3RyeSwgc2NoZW1hKTtcblxuICBjb25zdCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoanNvbi5pc0pzb25BcnJheShzY2hlbWEuJGFsaWFzZXMpKSB7XG4gICAgc2NoZW1hLiRhbGlhc2VzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBhbGlhc2VzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmIChqc29uLmlzSnNvbkFycmF5KHNjaGVtYS5hbGlhc2VzKSkge1xuICAgIHNjaGVtYS5hbGlhc2VzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBhbGlhc2VzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmICh0eXBlb2Ygc2NoZW1hLmFsaWFzID09ICdzdHJpbmcnKSB7XG4gICAgYWxpYXNlcy5wdXNoKHNjaGVtYS5hbGlhcyk7XG4gIH1cblxuICBsZXQgbG9uZ0Rlc2NyaXB0aW9uID0gJyc7XG4gIGlmICh0eXBlb2Ygc2NoZW1hLiRsb25nRGVzY3JpcHRpb24gPT0gJ3N0cmluZycgJiYgc2NoZW1hLiRsb25nRGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBsZFBhdGggPSByZXNvbHZlKGRpcm5hbWUoanNvblBhdGgpLCBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbik7XG4gICAgbG9uZ0Rlc2NyaXB0aW9uID0gcmVhZEZpbGVTeW5jKGxkUGF0aCwgJ3V0Zi04Jyk7XG4gIH1cblxuICBjb25zdCBzY29wZSA9IF9nZXRFbnVtRnJvbVZhbHVlKHNjaGVtYS4kc2NvcGUsIENvbW1hbmRTY29wZSwgQ29tbWFuZFNjb3BlLkRlZmF1bHQpO1xuICBjb25zdCB0eXBlID0gX2dldEVudW1Gcm9tVmFsdWUoc2NoZW1hLiR0eXBlLCBDb21tYW5kVHlwZSwgQ29tbWFuZFR5cGUuRGVmYXVsdCk7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gJycgKyAoc2NoZW1hLmRlc2NyaXB0aW9uID09PSB1bmRlZmluZWQgPyAnJyA6IHNjaGVtYS5kZXNjcmlwdGlvbik7XG4gIGNvbnN0IGhpZGRlbiA9ICEhc2NoZW1hLiRoaWRkZW47XG5cbiAgcmV0dXJuIHsgbmFtZSwgZGVzY3JpcHRpb24sIGxvbmdEZXNjcmlwdGlvbiwgaGlkZGVuLCB0eXBlLCBvcHRpb25zLCBhbGlhc2VzLCBzY29wZSwgaW1wbCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICBjb25zdCBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHZpc2l0b3IoXG4gICAgY3VycmVudDoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICAgcG9pbnRlcjoganNvbi5zY2hlbWEuSnNvblBvaW50ZXIsXG4gICAgcGFyZW50U2NoZW1hPzoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICkge1xuICAgIGlmICghcGFyZW50U2NoZW1hKSB7XG4gICAgICAvLyBJZ25vcmUgcm9vdC5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHBvaW50ZXIuc3BsaXQoL1xcLyg/OnByb3BlcnRpZXN8aXRlbXN8ZGVmaW5pdGlvbnMpXFwvL2cpLmxlbmd0aCA+IDIpIHtcbiAgICAgIC8vIElnbm9yZSBzdWJpdGVtcyAob2JqZWN0cyBvciBhcnJheXMpLlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoanNvbi5pc0pzb25BcnJheShjdXJyZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwb2ludGVyLmluZGV4T2YoJy9ub3QvJykgIT0gLTEpIHtcbiAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgYW55T2Yvbm90LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJub3RcIiBrZXl3b3JkIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTiBTY2hlbWEuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHRyID0ganNvbi5zY2hlbWEucGFyc2VKc29uUG9pbnRlcihwb2ludGVyKTtcbiAgICBjb25zdCBuYW1lID0gcHRyW3B0ci5sZW5ndGggLSAxXTtcblxuICAgIGlmIChwdHJbcHRyLmxlbmd0aCAtIDJdICE9ICdwcm9wZXJ0aWVzJykge1xuICAgICAgLy8gU2tpcCBhbnkgbm9uLXByb3BlcnR5IGl0ZW1zLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVTZXQgPSBqc29uLnNjaGVtYS5nZXRUeXBlc09mU2NoZW1hKGN1cnJlbnQpO1xuXG4gICAgaWYgKHR5cGVTZXQuc2l6ZSA9PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIHR5cGUgb2Ygc2NoZW1hLicpO1xuICAgIH1cblxuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBudW1iZXIsIHN0cmluZyBvciBib29sZWFuIChvciBhcnJheSBvZiB0aG9zZSksIHNvIHJlbW92ZSBldmVyeXRoaW5nIGVsc2UuXG4gICAgY29uc3QgdHlwZXMgPSBbLi4udHlwZVNldF0uZmlsdGVyKHggPT4ge1xuICAgICAgc3dpdGNoICh4KSB7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgYXJyYXlzIGlmIHRoZXkncmUgYm9vbGVhbiwgc3RyaW5nIG9yIG51bWJlci5cbiAgICAgICAgICBpZiAoanNvbi5pc0pzb25PYmplY3QoY3VycmVudC5pdGVtcylcbiAgICAgICAgICAgICAgJiYgdHlwZW9mIGN1cnJlbnQuaXRlbXMudHlwZSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAmJiBbJ2Jvb2xlYW4nLCAnbnVtYmVyJywgJ3N0cmluZyddLmluY2x1ZGVzKGN1cnJlbnQuaXRlbXMudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KS5tYXAoeCA9PiBfZ2V0RW51bUZyb21WYWx1ZSh4LCBPcHRpb25UeXBlLCBPcHRpb25UeXBlLlN0cmluZykpO1xuXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAvLyBUaGlzIG1lYW5zIGl0J3Mgbm90IHVzYWJsZSBvbiB0aGUgY29tbWFuZCBsaW5lLiBlLmcuIGFuIE9iamVjdC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChjdXJyZW50LmRlZmF1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgc3dpdGNoICh0eXBlc1swXSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudC5kZWZhdWx0ID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBjdXJyZW50LmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudC5kZWZhdWx0ID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBjdXJyZW50LmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnQuZGVmYXVsdCA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IGN1cnJlbnQuZGVmYXVsdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgJGRlZmF1bHQgPSBjdXJyZW50LiRkZWZhdWx0O1xuICAgIGNvbnN0ICRkZWZhdWx0SW5kZXggPSAoanNvbi5pc0pzb25PYmplY3QoJGRlZmF1bHQpICYmICRkZWZhdWx0Wyckc291cmNlJ10gPT0gJ2FyZ3YnKVxuICAgICAgPyAkZGVmYXVsdFsnaW5kZXgnXSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBwb3NpdGlvbmFsOiBudW1iZXIgfCB1bmRlZmluZWQgPSB0eXBlb2YgJGRlZmF1bHRJbmRleCA9PSAnbnVtYmVyJ1xuICAgICAgPyAkZGVmYXVsdEluZGV4IDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVxdWlyZWQgPSBqc29uLmlzSnNvbkFycmF5KGN1cnJlbnQucmVxdWlyZWQpXG4gICAgICAgID8gY3VycmVudC5yZXF1aXJlZC5pbmRleE9mKG5hbWUpICE9IC0xIDogZmFsc2U7XG4gICAgY29uc3QgYWxpYXNlcyA9IGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5hbGlhc2VzKSA/IFsuLi5jdXJyZW50LmFsaWFzZXNdLm1hcCh4ID0+ICcnICsgeClcbiAgICAgICAgICAgICAgICAgIDogY3VycmVudC5hbGlhcyA/IFsnJyArIGN1cnJlbnQuYWxpYXNdIDogW107XG4gICAgY29uc3QgZm9ybWF0ID0gdHlwZW9mIGN1cnJlbnQuZm9ybWF0ID09ICdzdHJpbmcnID8gY3VycmVudC5mb3JtYXQgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdmlzaWJsZSA9IGN1cnJlbnQudmlzaWJsZSA9PT0gdW5kZWZpbmVkIHx8IGN1cnJlbnQudmlzaWJsZSA9PT0gdHJ1ZTtcbiAgICBjb25zdCBoaWRkZW4gPSAhIWN1cnJlbnQuaGlkZGVuIHx8ICF2aXNpYmxlO1xuXG4gICAgY29uc3Qgb3B0aW9uOiBPcHRpb24gPSB7XG4gICAgICBuYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICcnICsgKGN1cnJlbnQuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogY3VycmVudC5kZXNjcmlwdGlvbiksXG4gICAgICAuLi50eXBlcy5sZW5ndGggPT0gMSA/IHsgdHlwZTogdHlwZXNbMF0gfSA6IHsgdHlwZTogdHlwZXNbMF0sIHR5cGVzIH0sXG4gICAgICAuLi5kZWZhdWx0VmFsdWUgIT09IHVuZGVmaW5lZCA/IHsgZGVmYXVsdDogZGVmYXVsdFZhbHVlIH0gOiB7fSxcbiAgICAgIHJlcXVpcmVkLFxuICAgICAgYWxpYXNlcyxcbiAgICAgIC4uLmZvcm1hdCAhPT0gdW5kZWZpbmVkID8geyBmb3JtYXQgfSA6IHt9LFxuICAgICAgaGlkZGVuLFxuICAgICAgLi4ucG9zaXRpb25hbCAhPT0gdW5kZWZpbmVkID8geyBwb3NpdGlvbmFsIH0gOiB7fSxcbiAgICB9O1xuXG4gICAgb3B0aW9ucy5wdXNoKG9wdGlvbik7XG4gIH1cblxuICBjb25zdCBmbGF0dGVuZWRTY2hlbWEgPSBhd2FpdCByZWdpc3RyeS5mbGF0dGVuKHNjaGVtYSkudG9Qcm9taXNlKCk7XG4gIGpzb24uc2NoZW1hLnZpc2l0SnNvblNjaGVtYShmbGF0dGVuZWRTY2hlbWEsIHZpc2l0b3IpO1xuXG4gIC8vIFNvcnQgYnkgcG9zaXRpb25hbC5cbiAgcmV0dXJuIG9wdGlvbnMuc29ydCgoYSwgYikgPT4ge1xuICAgIGlmIChhLnBvc2l0aW9uYWwpIHtcbiAgICAgIGlmIChiLnBvc2l0aW9uYWwpIHtcbiAgICAgICAgcmV0dXJuIGEucG9zaXRpb25hbCAtIGIucG9zaXRpb25hbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYi5wb3NpdGlvbmFsKSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=