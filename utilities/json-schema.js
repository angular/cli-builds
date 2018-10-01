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
function _getEnumFromValue(value, enumeration, defaultValue) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (Object.values(enumeration).indexOf(value) !== -1) {
        return value;
    }
    return defaultValue;
}
async function parseJsonSchemaToSubCommandDescription(name, jsonPath, registry, schema, logger) {
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
        try {
            longDescription = fs_1.readFileSync(ldPath, 'utf-8');
        }
        catch (e) {
            logger.warn(`File ${ldPath} was not found while constructing the subcommand ${name}.`);
        }
    }
    let usageNotes = '';
    if (typeof schema.$usageNotes == 'string' && schema.$usageNotes) {
        const unPath = path_1.resolve(path_1.dirname(jsonPath), schema.$usageNotes);
        try {
            usageNotes = fs_1.readFileSync(unPath, 'utf-8');
        }
        catch (e) {
            logger.warn(`File ${unPath} was not found while constructing the subcommand ${name}.`);
        }
    }
    const description = '' + (schema.description === undefined ? '' : schema.description);
    return Object.assign({ name,
        description }, (longDescription ? { longDescription } : {}), (usageNotes ? { usageNotes } : {}), { options,
        aliases });
}
exports.parseJsonSchemaToSubCommandDescription = parseJsonSchemaToSubCommandDescription;
async function parseJsonSchemaToCommandDescription(name, jsonPath, registry, schema, logger) {
    const subcommand = await parseJsonSchemaToSubCommandDescription(name, jsonPath, registry, schema, logger);
    // Before doing any work, let's validate the implementation.
    if (typeof schema.$impl != 'string') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const ref = new tools_1.ExportStringRef(schema.$impl, path_1.dirname(jsonPath));
    const impl = ref.ref;
    if (impl === undefined || typeof impl !== 'function') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const scope = _getEnumFromValue(schema.$scope, interface_1.CommandScope, interface_1.CommandScope.Default);
    const hidden = !!schema.$hidden;
    return Object.assign({}, subcommand, { scope,
        hidden,
        impl });
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
        // Only keep enum values we support (booleans, numbers and strings).
        const enumValues = (core_1.json.isJsonArray(current.enum) && current.enum || []).filter(x => {
            switch (typeof x) {
                case 'boolean':
                case 'number':
                case 'string':
                    return true;
                default:
                    return false;
            }
        });
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
        const type = types[0];
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
        const option = Object.assign({ name, description: '' + (current.description === undefined ? '' : current.description) }, types.length == 1 ? { type } : { type, types }, defaultValue !== undefined ? { default: defaultValue } : {}, enumValues && enumValues.length > 0 ? { enum: enumValues } : {}, { required,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUNyRCw0REFBbUU7QUFDbkUsMkJBQWtDO0FBQ2xDLCtCQUF3QztBQUN4QyxtREFRNkI7QUFFN0IsU0FBUyxpQkFBaUIsQ0FDeEIsS0FBcUIsRUFDckIsV0FBYyxFQUNkLFlBQWU7SUFFZixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUM3QixPQUFPLFlBQVksQ0FBQztLQUNyQjtJQUVELElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDcEQsT0FBTyxLQUFxQixDQUFDO0tBQzlCO0lBRUQsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVNLEtBQUssVUFBVSxzQ0FBc0MsQ0FDMUQsSUFBWSxFQUNaLFFBQWdCLEVBQ2hCLFFBQW9DLEVBQ3BDLE1BQXVCLEVBQ3ZCLE1BQXNCO0lBRXRCLE1BQU0sT0FBTyxHQUFHLE1BQU0sd0JBQXdCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRWpFLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztJQUM3QixJQUFJLFdBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzlCLElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO2dCQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3JCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUNELElBQUksV0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFN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RyxDQUFDLENBQUMsVUFBVSxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjthQUFNLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtZQUN2QixPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ1g7YUFBTTtZQUNMLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF0SkQsNERBc0pDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsganNvbiwgbG9nZ2luZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEV4cG9ydFN0cmluZ1JlZiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIENvbW1hbmRDb25zdHJ1Y3RvcixcbiAgQ29tbWFuZERlc2NyaXB0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbixcbiAgT3B0aW9uVHlwZSxcbiAgU3ViQ29tbWFuZERlc2NyaXB0aW9uLFxuICBWYWx1ZSxcbn0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5cbmZ1bmN0aW9uIF9nZXRFbnVtRnJvbVZhbHVlPEUsIFQgZXh0ZW5kcyBFW2tleW9mIEVdPihcbiAgdmFsdWU6IGpzb24uSnNvblZhbHVlLFxuICBlbnVtZXJhdGlvbjogRSxcbiAgZGVmYXVsdFZhbHVlOiBULFxuKTogVCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgfVxuXG4gIGlmIChPYmplY3QudmFsdWVzKGVudW1lcmF0aW9uKS5pbmRleE9mKHZhbHVlKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdmFsdWUgYXMgdW5rbm93biBhcyBUO1xuICB9XG5cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNjaGVtYVRvU3ViQ29tbWFuZERlc2NyaXB0aW9uKFxuICBuYW1lOiBzdHJpbmcsXG4gIGpzb25QYXRoOiBzdHJpbmcsXG4gIHJlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeSxcbiAgc2NoZW1hOiBqc29uLkpzb25PYmplY3QsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4pOiBQcm9taXNlPFN1YkNvbW1hbmREZXNjcmlwdGlvbj4ge1xuICBjb25zdCBvcHRpb25zID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHJlZ2lzdHJ5LCBzY2hlbWEpO1xuXG4gIGNvbnN0IGFsaWFzZXM6IHN0cmluZ1tdID0gW107XG4gIGlmIChqc29uLmlzSnNvbkFycmF5KHNjaGVtYS4kYWxpYXNlcykpIHtcbiAgICBzY2hlbWEuJGFsaWFzZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKGpzb24uaXNKc29uQXJyYXkoc2NoZW1hLmFsaWFzZXMpKSB7XG4gICAgc2NoZW1hLmFsaWFzZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKHR5cGVvZiBzY2hlbWEuYWxpYXMgPT0gJ3N0cmluZycpIHtcbiAgICBhbGlhc2VzLnB1c2goc2NoZW1hLmFsaWFzKTtcbiAgfVxuXG4gIGxldCBsb25nRGVzY3JpcHRpb24gPSAnJztcbiAgaWYgKHR5cGVvZiBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbiA9PSAnc3RyaW5nJyAmJiBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGxkUGF0aCA9IHJlc29sdmUoZGlybmFtZShqc29uUGF0aCksIHNjaGVtYS4kbG9uZ0Rlc2NyaXB0aW9uKTtcbiAgICB0cnkge1xuICAgICAgbG9uZ0Rlc2NyaXB0aW9uID0gcmVhZEZpbGVTeW5jKGxkUGF0aCwgJ3V0Zi04Jyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLndhcm4oYEZpbGUgJHtsZFBhdGh9IHdhcyBub3QgZm91bmQgd2hpbGUgY29uc3RydWN0aW5nIHRoZSBzdWJjb21tYW5kICR7bmFtZX0uYCk7XG4gICAgfVxuICB9XG4gIGxldCB1c2FnZU5vdGVzID0gJyc7XG4gIGlmICh0eXBlb2Ygc2NoZW1hLiR1c2FnZU5vdGVzID09ICdzdHJpbmcnICYmIHNjaGVtYS4kdXNhZ2VOb3Rlcykge1xuICAgIGNvbnN0IHVuUGF0aCA9IHJlc29sdmUoZGlybmFtZShqc29uUGF0aCksIHNjaGVtYS4kdXNhZ2VOb3Rlcyk7XG4gICAgdHJ5IHtcbiAgICAgIHVzYWdlTm90ZXMgPSByZWFkRmlsZVN5bmModW5QYXRoLCAndXRmLTgnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIud2FybihgRmlsZSAke3VuUGF0aH0gd2FzIG5vdCBmb3VuZCB3aGlsZSBjb25zdHJ1Y3RpbmcgdGhlIHN1YmNvbW1hbmQgJHtuYW1lfS5gKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBkZXNjcmlwdGlvbiA9ICcnICsgKHNjaGVtYS5kZXNjcmlwdGlvbiA9PT0gdW5kZWZpbmVkID8gJycgOiBzY2hlbWEuZGVzY3JpcHRpb24pO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZSxcbiAgICBkZXNjcmlwdGlvbixcbiAgICAuLi4obG9uZ0Rlc2NyaXB0aW9uID8geyBsb25nRGVzY3JpcHRpb24gfSA6IHt9KSxcbiAgICAuLi4odXNhZ2VOb3RlcyA/IHsgdXNhZ2VOb3RlcyB9IDoge30pLFxuICAgIG9wdGlvbnMsXG4gICAgYWxpYXNlcyxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNjaGVtYVRvQ29tbWFuZERlc2NyaXB0aW9uKFxuICBuYW1lOiBzdHJpbmcsXG4gIGpzb25QYXRoOiBzdHJpbmcsXG4gIHJlZ2lzdHJ5OiBqc29uLnNjaGVtYS5TY2hlbWFSZWdpc3RyeSxcbiAgc2NoZW1hOiBqc29uLkpzb25PYmplY3QsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4pOiBQcm9taXNlPENvbW1hbmREZXNjcmlwdGlvbj4ge1xuICBjb25zdCBzdWJjb21tYW5kID1cbiAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb1N1YkNvbW1hbmREZXNjcmlwdGlvbihuYW1lLCBqc29uUGF0aCwgcmVnaXN0cnksIHNjaGVtYSwgbG9nZ2VyKTtcblxuICAvLyBCZWZvcmUgZG9pbmcgYW55IHdvcmssIGxldCdzIHZhbGlkYXRlIHRoZSBpbXBsZW1lbnRhdGlvbi5cbiAgaWYgKHR5cGVvZiBzY2hlbWEuJGltcGwgIT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuICBjb25zdCByZWYgPSBuZXcgRXhwb3J0U3RyaW5nUmVmPENvbW1hbmRDb25zdHJ1Y3Rvcj4oc2NoZW1hLiRpbXBsLCBkaXJuYW1lKGpzb25QYXRoKSk7XG4gIGNvbnN0IGltcGwgPSByZWYucmVmO1xuXG4gIGlmIChpbXBsID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuXG4gIGNvbnN0IHNjb3BlID0gX2dldEVudW1Gcm9tVmFsdWUoc2NoZW1hLiRzY29wZSwgQ29tbWFuZFNjb3BlLCBDb21tYW5kU2NvcGUuRGVmYXVsdCk7XG4gIGNvbnN0IGhpZGRlbiA9ICEhc2NoZW1hLiRoaWRkZW47XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5zdWJjb21tYW5kLFxuICAgIHNjb3BlLFxuICAgIGhpZGRlbixcbiAgICBpbXBsLFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICBjb25zdCBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHZpc2l0b3IoXG4gICAgY3VycmVudDoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICAgcG9pbnRlcjoganNvbi5zY2hlbWEuSnNvblBvaW50ZXIsXG4gICAgcGFyZW50U2NoZW1hPzoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICkge1xuICAgIGlmICghcGFyZW50U2NoZW1hKSB7XG4gICAgICAvLyBJZ25vcmUgcm9vdC5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHBvaW50ZXIuc3BsaXQoL1xcLyg/OnByb3BlcnRpZXN8aXRlbXN8ZGVmaW5pdGlvbnMpXFwvL2cpLmxlbmd0aCA+IDIpIHtcbiAgICAgIC8vIElnbm9yZSBzdWJpdGVtcyAob2JqZWN0cyBvciBhcnJheXMpLlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoanNvbi5pc0pzb25BcnJheShjdXJyZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwb2ludGVyLmluZGV4T2YoJy9ub3QvJykgIT0gLTEpIHtcbiAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgYW55T2Yvbm90LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJub3RcIiBrZXl3b3JkIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTiBTY2hlbWEuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHRyID0ganNvbi5zY2hlbWEucGFyc2VKc29uUG9pbnRlcihwb2ludGVyKTtcbiAgICBjb25zdCBuYW1lID0gcHRyW3B0ci5sZW5ndGggLSAxXTtcblxuICAgIGlmIChwdHJbcHRyLmxlbmd0aCAtIDJdICE9ICdwcm9wZXJ0aWVzJykge1xuICAgICAgLy8gU2tpcCBhbnkgbm9uLXByb3BlcnR5IGl0ZW1zLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVTZXQgPSBqc29uLnNjaGVtYS5nZXRUeXBlc09mU2NoZW1hKGN1cnJlbnQpO1xuXG4gICAgaWYgKHR5cGVTZXQuc2l6ZSA9PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIHR5cGUgb2Ygc2NoZW1hLicpO1xuICAgIH1cblxuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBudW1iZXIsIHN0cmluZyBvciBib29sZWFuIChvciBhcnJheSBvZiB0aG9zZSksIHNvIHJlbW92ZSBldmVyeXRoaW5nIGVsc2UuXG4gICAgY29uc3QgdHlwZXMgPSBbLi4udHlwZVNldF0uZmlsdGVyKHggPT4ge1xuICAgICAgc3dpdGNoICh4KSB7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgYXJyYXlzIGlmIHRoZXkncmUgYm9vbGVhbiwgc3RyaW5nIG9yIG51bWJlci5cbiAgICAgICAgICBpZiAoanNvbi5pc0pzb25PYmplY3QoY3VycmVudC5pdGVtcylcbiAgICAgICAgICAgICAgJiYgdHlwZW9mIGN1cnJlbnQuaXRlbXMudHlwZSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAmJiBbJ2Jvb2xlYW4nLCAnbnVtYmVyJywgJ3N0cmluZyddLmluY2x1ZGVzKGN1cnJlbnQuaXRlbXMudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KS5tYXAoeCA9PiBfZ2V0RW51bUZyb21WYWx1ZSh4LCBPcHRpb25UeXBlLCBPcHRpb25UeXBlLlN0cmluZykpO1xuXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAvLyBUaGlzIG1lYW5zIGl0J3Mgbm90IHVzYWJsZSBvbiB0aGUgY29tbWFuZCBsaW5lLiBlLmcuIGFuIE9iamVjdC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGtlZXAgZW51bSB2YWx1ZXMgd2Ugc3VwcG9ydCAoYm9vbGVhbnMsIG51bWJlcnMgYW5kIHN0cmluZ3MpLlxuICAgIGNvbnN0IGVudW1WYWx1ZXMgPSAoanNvbi5pc0pzb25BcnJheShjdXJyZW50LmVudW0pICYmIGN1cnJlbnQuZW51bSB8fCBbXSkuZmlsdGVyKHggPT4ge1xuICAgICAgc3dpdGNoICh0eXBlb2YgeCkge1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSBhcyBWYWx1ZVtdO1xuXG4gICAgbGV0IGRlZmF1bHRWYWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoY3VycmVudC5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHN3aXRjaCAodHlwZXNbMF0pIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnQuZGVmYXVsdCA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gY3VycmVudC5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnQuZGVmYXVsdCA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gY3VycmVudC5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50LmRlZmF1bHQgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBjdXJyZW50LmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSB0eXBlc1swXTtcbiAgICBjb25zdCAkZGVmYXVsdCA9IGN1cnJlbnQuJGRlZmF1bHQ7XG4gICAgY29uc3QgJGRlZmF1bHRJbmRleCA9IChqc29uLmlzSnNvbk9iamVjdCgkZGVmYXVsdCkgJiYgJGRlZmF1bHRbJyRzb3VyY2UnXSA9PSAnYXJndicpXG4gICAgICA/ICRkZWZhdWx0WydpbmRleCddIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHBvc2l0aW9uYWw6IG51bWJlciB8IHVuZGVmaW5lZCA9IHR5cGVvZiAkZGVmYXVsdEluZGV4ID09ICdudW1iZXInXG4gICAgICA/ICRkZWZhdWx0SW5kZXggOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCByZXF1aXJlZCA9IGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5yZXF1aXJlZClcbiAgICAgID8gY3VycmVudC5yZXF1aXJlZC5pbmRleE9mKG5hbWUpICE9IC0xIDogZmFsc2U7XG4gICAgY29uc3QgYWxpYXNlcyA9IGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5hbGlhc2VzKSA/IFsuLi5jdXJyZW50LmFsaWFzZXNdLm1hcCh4ID0+ICcnICsgeClcbiAgICAgIDogY3VycmVudC5hbGlhcyA/IFsnJyArIGN1cnJlbnQuYWxpYXNdIDogW107XG4gICAgY29uc3QgZm9ybWF0ID0gdHlwZW9mIGN1cnJlbnQuZm9ybWF0ID09ICdzdHJpbmcnID8gY3VycmVudC5mb3JtYXQgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdmlzaWJsZSA9IGN1cnJlbnQudmlzaWJsZSA9PT0gdW5kZWZpbmVkIHx8IGN1cnJlbnQudmlzaWJsZSA9PT0gdHJ1ZTtcbiAgICBjb25zdCBoaWRkZW4gPSAhIWN1cnJlbnQuaGlkZGVuIHx8ICF2aXNpYmxlO1xuXG4gICAgY29uc3Qgb3B0aW9uOiBPcHRpb24gPSB7XG4gICAgICBuYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICcnICsgKGN1cnJlbnQuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogY3VycmVudC5kZXNjcmlwdGlvbiksXG4gICAgICAuLi50eXBlcy5sZW5ndGggPT0gMSA/IHsgdHlwZSB9IDogeyB0eXBlLCB0eXBlcyB9LFxuICAgICAgLi4uZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWx1ZSB9IDoge30sXG4gICAgICAuLi5lbnVtVmFsdWVzICYmIGVudW1WYWx1ZXMubGVuZ3RoID4gMCA/IHsgZW51bTogZW51bVZhbHVlcyB9IDoge30sXG4gICAgICByZXF1aXJlZCxcbiAgICAgIGFsaWFzZXMsXG4gICAgICAuLi5mb3JtYXQgIT09IHVuZGVmaW5lZCA/IHsgZm9ybWF0IH0gOiB7fSxcbiAgICAgIGhpZGRlbixcbiAgICAgIC4uLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCA/IHsgcG9zaXRpb25hbCB9IDoge30sXG4gICAgfTtcblxuICAgIG9wdGlvbnMucHVzaChvcHRpb24pO1xuICB9XG5cbiAgY29uc3QgZmxhdHRlbmVkU2NoZW1hID0gYXdhaXQgcmVnaXN0cnkuZmxhdHRlbihzY2hlbWEpLnRvUHJvbWlzZSgpO1xuICBqc29uLnNjaGVtYS52aXNpdEpzb25TY2hlbWEoZmxhdHRlbmVkU2NoZW1hLCB2aXNpdG9yKTtcblxuICAvLyBTb3J0IGJ5IHBvc2l0aW9uYWwuXG4gIHJldHVybiBvcHRpb25zLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS5wb3NpdGlvbmFsKSB7XG4gICAgICBpZiAoYi5wb3NpdGlvbmFsKSB7XG4gICAgICAgIHJldHVybiBhLnBvc2l0aW9uYWwgLSBiLnBvc2l0aW9uYWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGIucG9zaXRpb25hbCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH0pO1xufVxuIl19