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
        if (schema.default !== undefined) {
            switch (types[0]) {
                case 'string':
                    if (typeof schema.default == 'string') {
                        defaultValue = schema.default;
                    }
                    break;
                case 'number':
                    if (typeof schema.default == 'number') {
                        defaultValue = schema.default;
                    }
                    break;
                case 'boolean':
                    if (typeof schema.default == 'boolean') {
                        defaultValue = schema.default;
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
        const aliases = core_1.json.isJsonArray(current.aliases) ? [...current.aliases].map(x => '' + x) : [];
        const format = typeof current.format == 'string' ? current.format : undefined;
        const hidden = !!current.hidden;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUM1Qyw0REFBbUU7QUFDbkUsMkJBQWtDO0FBQ2xDLCtCQUF3QztBQUN4QyxtREFPNkI7QUFFN0IsU0FBUyxpQkFBaUIsQ0FBc0IsQ0FBaUIsRUFBRSxDQUFJLEVBQUUsQ0FBSTtJQUMzRSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUN6QixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUN0QyxPQUFPLENBQU0sQ0FBQztLQUNmO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRU0sS0FBSyxVQUFVLG1DQUFtQyxDQUN2RCxJQUFZLEVBQ1osUUFBZ0IsRUFDaEIsUUFBb0MsRUFDcEMsTUFBdUI7SUFFdkIsNERBQTREO0lBQzVELElBQUksT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLFFBQVEsRUFBRTtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ25FO0lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBZSxDQUFxQixNQUFNLENBQUMsS0FBSyxFQUFFLGNBQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFckIsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRTtRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxpQ0FBaUMsQ0FBQyxDQUFDO0tBQ25F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QUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUV0RCxzQkFBc0I7SUFDdEIsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzNCLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtZQUNoQixJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUU7Z0JBQ2hCLE9BQU8sQ0FBQyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjthQUFNLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtZQUN2QixPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ1g7YUFBTTtZQUNMLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFySUQsNERBcUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEV4cG9ydFN0cmluZ1JlZiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIENvbW1hbmRDb25zdHJ1Y3RvcixcbiAgQ29tbWFuZERlc2NyaXB0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIENvbW1hbmRUeXBlLFxuICBPcHRpb24sXG4gIE9wdGlvblR5cGUsXG59IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuXG5mdW5jdGlvbiBfZ2V0RW51bUZyb21WYWx1ZTxFLCBUIGV4dGVuZHMgc3RyaW5nPih2OiBqc29uLkpzb25WYWx1ZSwgZTogRSwgZDogVCk6IFQge1xuICBpZiAodHlwZW9mIHYgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGQ7XG4gIH1cblxuICBpZiAoT2JqZWN0LnZhbHVlcyhlKS5pbmRleE9mKHYpICE9PSAtMSkge1xuICAgIHJldHVybiB2IGFzIFQ7XG4gIH1cblxuICByZXR1cm4gZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uKFxuICBuYW1lOiBzdHJpbmcsXG4gIGpzb25QYXRoOiBzdHJpbmcsXG4gIHJlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeSxcbiAgc2NoZW1hOiBqc29uLkpzb25PYmplY3QsXG4pOiBQcm9taXNlPENvbW1hbmREZXNjcmlwdGlvbj4ge1xuICAvLyBCZWZvcmUgZG9pbmcgYW55IHdvcmssIGxldCdzIHZhbGlkYXRlIHRoZSBpbXBsZW1lbnRhdGlvbi5cbiAgaWYgKHR5cGVvZiBzY2hlbWEuJGltcGwgIT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuICBjb25zdCByZWYgPSBuZXcgRXhwb3J0U3RyaW5nUmVmPENvbW1hbmRDb25zdHJ1Y3Rvcj4oc2NoZW1hLiRpbXBsLCBkaXJuYW1lKGpzb25QYXRoKSk7XG4gIGNvbnN0IGltcGwgPSByZWYucmVmO1xuXG4gIGlmIChpbXBsID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuXG4gIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMocmVnaXN0cnksIHNjaGVtYSk7XG5cbiAgY29uc3QgYWxpYXNlczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKGpzb24uaXNKc29uQXJyYXkoc2NoZW1hLiRhbGlhc2VzKSkge1xuICAgIHNjaGVtYS4kYWxpYXNlcy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgYWxpYXNlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGxldCBsb25nRGVzY3JpcHRpb24gPSAnJztcbiAgaWYgKHR5cGVvZiBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbiA9PSAnc3RyaW5nJyAmJiBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGxkUGF0aCA9IHJlc29sdmUoZGlybmFtZShqc29uUGF0aCksIHNjaGVtYS4kbG9uZ0Rlc2NyaXB0aW9uKTtcbiAgICBsb25nRGVzY3JpcHRpb24gPSByZWFkRmlsZVN5bmMobGRQYXRoLCAndXRmLTgnKTtcbiAgfVxuXG4gIGNvbnN0IHNjb3BlID0gX2dldEVudW1Gcm9tVmFsdWUoc2NoZW1hLiRzY29wZSwgQ29tbWFuZFNjb3BlLCBDb21tYW5kU2NvcGUuRGVmYXVsdCk7XG4gIGNvbnN0IHR5cGUgPSBfZ2V0RW51bUZyb21WYWx1ZShzY2hlbWEuJHR5cGUsIENvbW1hbmRUeXBlLCBDb21tYW5kVHlwZS5EZWZhdWx0KTtcbiAgY29uc3QgZGVzY3JpcHRpb24gPSAnJyArIChzY2hlbWEuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogc2NoZW1hLmRlc2NyaXB0aW9uKTtcbiAgY29uc3QgaGlkZGVuID0gISFzY2hlbWEuJGhpZGRlbjtcblxuICByZXR1cm4geyBuYW1lLCBkZXNjcmlwdGlvbiwgbG9uZ0Rlc2NyaXB0aW9uLCBoaWRkZW4sIHR5cGUsIG9wdGlvbnMsIGFsaWFzZXMsIHNjb3BlLCBpbXBsIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gIHJlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeSxcbiAgc2NoZW1hOiBqc29uLkpzb25PYmplY3QsXG4pOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gIGNvbnN0IG9wdGlvbnM6IE9wdGlvbltdID0gW107XG5cbiAgZnVuY3Rpb24gdmlzaXRvcihcbiAgICBjdXJyZW50OiBqc29uLkpzb25PYmplY3QgfCBqc29uLkpzb25BcnJheSxcbiAgICBwb2ludGVyOiBqc29uLnNjaGVtYS5Kc29uUG9pbnRlcixcbiAgICBwYXJlbnRTY2hlbWE/OiBqc29uLkpzb25PYmplY3QgfCBqc29uLkpzb25BcnJheSxcbiAgKSB7XG4gICAgaWYgKCFwYXJlbnRTY2hlbWEpIHtcbiAgICAgIC8vIElnbm9yZSByb290LlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAocG9pbnRlci5zcGxpdCgvXFwvKD86cHJvcGVydGllc3xpdGVtc3xkZWZpbml0aW9ucylcXC8vZykubGVuZ3RoID4gMikge1xuICAgICAgLy8gSWdub3JlIHN1Yml0ZW1zIChvYmplY3RzIG9yIGFycmF5cykuXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChqc29uLmlzSnNvbkFycmF5KGN1cnJlbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHBvaW50ZXIuaW5kZXhPZignL25vdC8nKSAhPSAtMSkge1xuICAgICAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCBhbnlPZi9ub3QuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBcIm5vdFwiIGtleXdvcmQgaXMgbm90IHN1cHBvcnRlZCBpbiBKU09OIFNjaGVtYS4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwdHIgPSBqc29uLnNjaGVtYS5wYXJzZUpzb25Qb2ludGVyKHBvaW50ZXIpO1xuICAgIGNvbnN0IG5hbWUgPSBwdHJbcHRyLmxlbmd0aCAtIDFdO1xuXG4gICAgaWYgKHB0cltwdHIubGVuZ3RoIC0gMl0gIT0gJ3Byb3BlcnRpZXMnKSB7XG4gICAgICAvLyBTa2lwIGFueSBub24tcHJvcGVydHkgaXRlbXMuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZVNldCA9IGpzb24uc2NoZW1hLmdldFR5cGVzT2ZTY2hlbWEoY3VycmVudCk7XG5cbiAgICBpZiAodHlwZVNldC5zaXplID09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGZpbmQgdHlwZSBvZiBzY2hlbWEuJyk7XG4gICAgfVxuXG4gICAgLy8gV2Ugb25seSBzdXBwb3J0IG51bWJlciwgc3RyaW5nIG9yIGJvb2xlYW4gKG9yIGFycmF5IG9mIHRob3NlKSwgc28gcmVtb3ZlIGV2ZXJ5dGhpbmcgZWxzZS5cbiAgICBjb25zdCB0eXBlcyA9IFsuLi50eXBlU2V0XS5maWx0ZXIoeCA9PiB7XG4gICAgICBzd2l0Y2ggKHgpIHtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgIC8vIE9ubHkgaW5jbHVkZSBhcnJheXMgaWYgdGhleSdyZSBib29sZWFuLCBzdHJpbmcgb3IgbnVtYmVyLlxuICAgICAgICAgIGlmIChqc29uLmlzSnNvbk9iamVjdChjdXJyZW50Lml0ZW1zKVxuICAgICAgICAgICAgICAmJiB0eXBlb2YgY3VycmVudC5pdGVtcy50eXBlID09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICYmIFsnYm9vbGVhbicsICdudW1iZXInLCAnc3RyaW5nJ10uaW5jbHVkZXMoY3VycmVudC5pdGVtcy50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pLm1hcCh4ID0+IF9nZXRFbnVtRnJvbVZhbHVlKHgsIE9wdGlvblR5cGUsIE9wdGlvblR5cGUuU3RyaW5nKSk7XG5cbiAgICBpZiAodHlwZXMubGVuZ3RoID09IDApIHtcbiAgICAgIC8vIFRoaXMgbWVhbnMgaXQncyBub3QgdXNhYmxlIG9uIHRoZSBjb21tYW5kIGxpbmUuIGUuZy4gYW4gT2JqZWN0LlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBkZWZhdWx0VmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHNjaGVtYS5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHN3aXRjaCAodHlwZXNbMF0pIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICBpZiAodHlwZW9mIHNjaGVtYS5kZWZhdWx0ID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBzY2hlbWEuZGVmYXVsdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuZGVmYXVsdCA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gc2NoZW1hLmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICBpZiAodHlwZW9mIHNjaGVtYS5kZWZhdWx0ID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gc2NoZW1hLmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0ICRkZWZhdWx0ID0gY3VycmVudC4kZGVmYXVsdDtcbiAgICBjb25zdCAkZGVmYXVsdEluZGV4ID0gKGpzb24uaXNKc29uT2JqZWN0KCRkZWZhdWx0KSAmJiAkZGVmYXVsdFsnJHNvdXJjZSddID09ICdhcmd2JylcbiAgICAgID8gJGRlZmF1bHRbJ2luZGV4J10gOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgcG9zaXRpb25hbDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdHlwZW9mICRkZWZhdWx0SW5kZXggPT0gJ251bWJlcidcbiAgICAgID8gJGRlZmF1bHRJbmRleCA6IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IHJlcXVpcmVkID0ganNvbi5pc0pzb25BcnJheShjdXJyZW50LnJlcXVpcmVkKVxuICAgICAgICA/IGN1cnJlbnQucmVxdWlyZWQuaW5kZXhPZihuYW1lKSAhPSAtMSA6IGZhbHNlO1xuICAgIGNvbnN0IGFsaWFzZXMgPSBqc29uLmlzSnNvbkFycmF5KGN1cnJlbnQuYWxpYXNlcykgPyBbLi4uY3VycmVudC5hbGlhc2VzXS5tYXAoeCA9PiAnJyArIHgpIDogW107XG4gICAgY29uc3QgZm9ybWF0ID0gdHlwZW9mIGN1cnJlbnQuZm9ybWF0ID09ICdzdHJpbmcnID8gY3VycmVudC5mb3JtYXQgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgaGlkZGVuID0gISFjdXJyZW50LmhpZGRlbjtcblxuICAgIGNvbnN0IG9wdGlvbjogT3B0aW9uID0ge1xuICAgICAgbmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnJyArIChjdXJyZW50LmRlc2NyaXB0aW9uID09PSB1bmRlZmluZWQgPyAnJyA6IGN1cnJlbnQuZGVzY3JpcHRpb24pLFxuICAgICAgLi4udHlwZXMubGVuZ3RoID09IDEgPyB7IHR5cGU6IHR5cGVzWzBdIH0gOiB7IHR5cGU6IHR5cGVzWzBdLCB0eXBlcyB9LFxuICAgICAgLi4uZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWx1ZSB9IDoge30sXG4gICAgICByZXF1aXJlZCxcbiAgICAgIGFsaWFzZXMsXG4gICAgICAuLi5mb3JtYXQgIT09IHVuZGVmaW5lZCA/IHsgZm9ybWF0IH0gOiB7fSxcbiAgICAgIGhpZGRlbixcbiAgICAgIC4uLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCA/IHsgcG9zaXRpb25hbCB9IDoge30sXG4gICAgfTtcblxuICAgIG9wdGlvbnMucHVzaChvcHRpb24pO1xuICB9XG5cbiAgY29uc3QgZmxhdHRlbmVkU2NoZW1hID0gYXdhaXQgcmVnaXN0cnkuZmxhdHRlbihzY2hlbWEpLnRvUHJvbWlzZSgpO1xuICBqc29uLnNjaGVtYS52aXNpdEpzb25TY2hlbWEoZmxhdHRlbmVkU2NoZW1hLCB2aXNpdG9yKTtcblxuICAvLyBTb3J0IGJ5IHBvc2l0aW9uYWwuXG4gIHJldHVybiBvcHRpb25zLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS5wb3NpdGlvbmFsKSB7XG4gICAgICBpZiAoYi5wb3NpdGlvbmFsKSB7XG4gICAgICAgIHJldHVybiBhLnBvc2l0aW9uYWwgLSBiLnBvc2l0aW9uYWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGIucG9zaXRpb25hbCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH0pO1xufVxuIl19