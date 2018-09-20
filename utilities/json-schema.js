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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUNyRCw0REFBbUU7QUFDbkUsMkJBQWtDO0FBQ2xDLCtCQUF3QztBQUN4QyxtREFRNkI7QUFFN0IsU0FBUyxpQkFBaUIsQ0FBc0IsQ0FBaUIsRUFBRSxDQUFJLEVBQUUsQ0FBSTtJQUMzRSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUN6QixPQUFPLENBQUMsQ0FBQztLQUNWO0lBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUN0QyxPQUFPLENBQU0sQ0FBQztLQUNmO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRU0sS0FBSyxVQUFVLHNDQUFzQyxDQUMxRCxJQUFZLEVBQ1osUUFBZ0IsRUFDaEIsUUFBb0MsRUFDcEMsTUFBdUIsRUFDdkIsTUFBc0I7SUFFdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFakUsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBQzdCLElBQUksV0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDckMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDckI7UUFDSCxDQUFDLENBQUMsQ0FBQztLQUNKO0lBQ0QsSUFBSSxXQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM3QixJQUFJLE9BQU8sS0FBSyxJQUFJLFFBQVEsRUFBRTtnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNyQjtRQUNILENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxJQUFJLE9BQU8sTUFBTSxDQUFDLEtBQUssSUFBSSxRQUFRLEVBQUU7UUFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLGVBQWUsR0FBRyxFQUFFLENBQUM7SUFDekIsSUFBSSxPQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLGNBQU8sQ0FBQyxjQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbkUsSUFBSTtZQUNGLGVBQWUsR0FBRyxpQkFBWSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNqRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLE1BQU0sb0RBQW9ELElBQUksR0FBRyxDQUFDLENBQUM7U0FDeEY7S0FDRjtJQUNELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRTtRQUMvRCxNQUFNLE1BQU0sR0FBRyxjQUFPLENBQUMsY0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxJQUFJO1lBQ0YsVUFBVSxHQUFHLGlCQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQzVDO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsTUFBTSxvREFBb0QsSUFBSSxHQUFHLENBQUMsQ0FBQztTQUN4RjtLQUNGO0lBRUQsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXRGLHVCQUNFLElBQUk7UUFDSixXQUFXLElBQ1IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUM1QyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQ3JDLE9BQU87UUFDUCxPQUFPLElBQ1A7QUFDSixDQUFDO0FBekRELHdGQXlEQztBQUVNLEtBQUssVUFBVSxtQ0FBbUMsQ0FDdkQsSUFBWSxFQUNaLFFBQWdCLEVBQ2hCLFFBQW9DLEVBQ3BDLE1BQXVCLEVBQ3ZCLE1BQXNCO0lBRXRCLE1BQU0sVUFBVSxHQUNkLE1BQU0sc0NBQXNDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRXpGLDREQUE0RDtJQUM1RCxJQUFJLE9BQU8sTUFBTSxDQUFDLEtBQUssSUFBSSxRQUFRLEVBQUU7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksaUNBQWlDLENBQUMsQ0FBQztLQUNuRTtJQUNELE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQWUsQ0FBcUIsTUFBTSxDQUFDLEtBQUssRUFBRSxjQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNyRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXJCLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxPQUFPLElBQUksS0FBSyxVQUFVLEVBQUU7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksaUNBQWlDLENBQUMsQ0FBQztLQUNuRTtJQUVELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsd0JBQVksRUFBRSx3QkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25GLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBRWhDLHlCQUNLLFVBQVUsSUFDYixLQUFLO1FBQ0wsTUFBTTtRQUNOLElBQUksSUFDSjtBQUNKLENBQUM7QUE5QkQsa0ZBOEJDO0FBRU0sS0FBSyxVQUFVLHdCQUF3QixDQUM1QyxRQUFvQyxFQUNwQyxNQUF1QjtJQUV2QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFFN0IsU0FBUyxPQUFPLENBQ2QsT0FBeUMsRUFDekMsT0FBZ0MsRUFDaEMsWUFBK0M7UUFFL0MsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNqQixlQUFlO1lBQ2YsT0FBTztTQUNSO2FBQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM1RSx1Q0FBdUM7WUFDdkMsT0FBTztTQUNSO2FBQU0sSUFBSSxXQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BDLE9BQU87U0FDUjtRQUVELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNsQyw4QkFBOEI7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1NBQ3ZFO1FBRUQsTUFBTSxHQUFHLEdBQUcsV0FBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVqQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLFlBQVksRUFBRTtZQUN2QywrQkFBK0I7WUFDL0IsT0FBTztTQUNSO1FBRUQsTUFBTSxPQUFPLEdBQUcsV0FBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0RCxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUNoRDtRQUVELDRGQUE0RjtRQUM1RixNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BDLFFBQVEsQ0FBQyxFQUFFO2dCQUNULEtBQUssU0FBUyxDQUFDO2dCQUNmLEtBQUssUUFBUSxDQUFDO2dCQUNkLEtBQUssUUFBUTtvQkFDWCxPQUFPLElBQUksQ0FBQztnQkFFZCxLQUFLLE9BQU87b0JBQ1YsNERBQTREO29CQUM1RCxJQUFJLFdBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQzsyQkFDN0IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxRQUFROzJCQUNyQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ25FLE9BQU8sSUFBSSxDQUFDO3FCQUNiO29CQUVELE9BQU8sS0FBSyxDQUFDO2dCQUVmO29CQUNFLE9BQU8sS0FBSyxDQUFDO2FBQ2hCO1FBQ0gsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLHNCQUFVLEVBQUUsc0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRWpFLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDckIsa0VBQWtFO1lBQ2xFLE9BQU87U0FDUjtRQUVELG9FQUFvRTtRQUNwRSxNQUFNLFVBQVUsR0FBRyxDQUFDLFdBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ25GLFFBQVEsT0FBTyxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssU0FBUyxDQUFDO2dCQUNmLEtBQUssUUFBUSxDQUFDO2dCQUNkLEtBQUssUUFBUTtvQkFDWCxPQUFPLElBQUksQ0FBQztnQkFFZDtvQkFDRSxPQUFPLEtBQUssQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBWSxDQUFDO1FBRWQsSUFBSSxZQUFZLEdBQTBDLFNBQVMsQ0FBQztRQUNwRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO1lBQ2pDLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNoQixLQUFLLFFBQVE7b0JBQ1gsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFO3dCQUN0QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLFFBQVE7b0JBQ1gsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFO3dCQUN0QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLFNBQVM7b0JBQ1osSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxFQUFFO3dCQUN2QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTthQUNUO1NBQ0Y7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQztZQUNsRixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDbEMsTUFBTSxVQUFVLEdBQXVCLE9BQU8sYUFBYSxJQUFJLFFBQVE7WUFDckUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRTlCLE1BQU0sUUFBUSxHQUFHLFdBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUMvQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNuRCxNQUFNLE9BQU8sR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMxRCxNQUFNLE1BQU0sR0FBRyxPQUFPLE9BQU8sQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDOUUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUM7UUFDMUUsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFNUMsTUFBTSxNQUFNLG1CQUNWLElBQUksRUFDSixXQUFXLEVBQUUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUM3RSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQzlDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQzNELFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFDbEUsUUFBUTtZQUNSLE9BQU8sSUFDSixNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQ3pDLE1BQU0sSUFDSCxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2xELENBQUM7UUFFRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRXRELHNCQUFzQjtJQUN0QixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtnQkFDaEIsT0FBTyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO2FBQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQ3ZCLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDWDthQUFNO1lBQ0wsT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXRKRCw0REFzSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBqc29uLCBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgRXhwb3J0U3RyaW5nUmVmIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZENvbnN0cnVjdG9yLFxuICBDb21tYW5kRGVzY3JpcHRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9uLFxuICBPcHRpb25UeXBlLFxuICBTdWJDb21tYW5kRGVzY3JpcHRpb24sXG4gIFZhbHVlLFxufSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcblxuZnVuY3Rpb24gX2dldEVudW1Gcm9tVmFsdWU8RSwgVCBleHRlbmRzIHN0cmluZz4odjoganNvbi5Kc29uVmFsdWUsIGU6IEUsIGQ6IFQpOiBUIHtcbiAgaWYgKHR5cGVvZiB2ICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkO1xuICB9XG5cbiAgaWYgKE9iamVjdC52YWx1ZXMoZSkuaW5kZXhPZih2KSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdiBhcyBUO1xuICB9XG5cbiAgcmV0dXJuIGQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb1N1YkNvbW1hbmREZXNjcmlwdGlvbihcbiAgbmFtZTogc3RyaW5nLFxuICBqc29uUGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuKTogUHJvbWlzZTxTdWJDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhyZWdpc3RyeSwgc2NoZW1hKTtcblxuICBjb25zdCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoanNvbi5pc0pzb25BcnJheShzY2hlbWEuJGFsaWFzZXMpKSB7XG4gICAgc2NoZW1hLiRhbGlhc2VzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBhbGlhc2VzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmIChqc29uLmlzSnNvbkFycmF5KHNjaGVtYS5hbGlhc2VzKSkge1xuICAgIHNjaGVtYS5hbGlhc2VzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBhbGlhc2VzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmICh0eXBlb2Ygc2NoZW1hLmFsaWFzID09ICdzdHJpbmcnKSB7XG4gICAgYWxpYXNlcy5wdXNoKHNjaGVtYS5hbGlhcyk7XG4gIH1cblxuICBsZXQgbG9uZ0Rlc2NyaXB0aW9uID0gJyc7XG4gIGlmICh0eXBlb2Ygc2NoZW1hLiRsb25nRGVzY3JpcHRpb24gPT0gJ3N0cmluZycgJiYgc2NoZW1hLiRsb25nRGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBsZFBhdGggPSByZXNvbHZlKGRpcm5hbWUoanNvblBhdGgpLCBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbik7XG4gICAgdHJ5IHtcbiAgICAgIGxvbmdEZXNjcmlwdGlvbiA9IHJlYWRGaWxlU3luYyhsZFBhdGgsICd1dGYtOCcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci53YXJuKGBGaWxlICR7bGRQYXRofSB3YXMgbm90IGZvdW5kIHdoaWxlIGNvbnN0cnVjdGluZyB0aGUgc3ViY29tbWFuZCAke25hbWV9LmApO1xuICAgIH1cbiAgfVxuICBsZXQgdXNhZ2VOb3RlcyA9ICcnO1xuICBpZiAodHlwZW9mIHNjaGVtYS4kdXNhZ2VOb3RlcyA9PSAnc3RyaW5nJyAmJiBzY2hlbWEuJHVzYWdlTm90ZXMpIHtcbiAgICBjb25zdCB1blBhdGggPSByZXNvbHZlKGRpcm5hbWUoanNvblBhdGgpLCBzY2hlbWEuJHVzYWdlTm90ZXMpO1xuICAgIHRyeSB7XG4gICAgICB1c2FnZU5vdGVzID0gcmVhZEZpbGVTeW5jKHVuUGF0aCwgJ3V0Zi04Jyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLndhcm4oYEZpbGUgJHt1blBhdGh9IHdhcyBub3QgZm91bmQgd2hpbGUgY29uc3RydWN0aW5nIHRoZSBzdWJjb21tYW5kICR7bmFtZX0uYCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGVzY3JpcHRpb24gPSAnJyArIChzY2hlbWEuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogc2NoZW1hLmRlc2NyaXB0aW9uKTtcblxuICByZXR1cm4ge1xuICAgIG5hbWUsXG4gICAgZGVzY3JpcHRpb24sXG4gICAgLi4uKGxvbmdEZXNjcmlwdGlvbiA/IHsgbG9uZ0Rlc2NyaXB0aW9uIH0gOiB7fSksXG4gICAgLi4uKHVzYWdlTm90ZXMgPyB7IHVzYWdlTm90ZXMgfSA6IHt9KSxcbiAgICBvcHRpb25zLFxuICAgIGFsaWFzZXMsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihcbiAgbmFtZTogc3RyaW5nLFxuICBqc29uUGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLFxuKTogUHJvbWlzZTxDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgY29uc3Qgc3ViY29tbWFuZCA9XG4gICAgYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9TdWJDb21tYW5kRGVzY3JpcHRpb24obmFtZSwganNvblBhdGgsIHJlZ2lzdHJ5LCBzY2hlbWEsIGxvZ2dlcik7XG5cbiAgLy8gQmVmb3JlIGRvaW5nIGFueSB3b3JrLCBsZXQncyB2YWxpZGF0ZSB0aGUgaW1wbGVtZW50YXRpb24uXG4gIGlmICh0eXBlb2Ygc2NoZW1hLiRpbXBsICE9ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21tYW5kICR7bmFtZX0gaGFzIGFuIGludmFsaWQgaW1wbGVtZW50YXRpb24uYCk7XG4gIH1cbiAgY29uc3QgcmVmID0gbmV3IEV4cG9ydFN0cmluZ1JlZjxDb21tYW5kQ29uc3RydWN0b3I+KHNjaGVtYS4kaW1wbCwgZGlybmFtZShqc29uUGF0aCkpO1xuICBjb25zdCBpbXBsID0gcmVmLnJlZjtcblxuICBpZiAoaW1wbCA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21tYW5kICR7bmFtZX0gaGFzIGFuIGludmFsaWQgaW1wbGVtZW50YXRpb24uYCk7XG4gIH1cblxuICBjb25zdCBzY29wZSA9IF9nZXRFbnVtRnJvbVZhbHVlKHNjaGVtYS4kc2NvcGUsIENvbW1hbmRTY29wZSwgQ29tbWFuZFNjb3BlLkRlZmF1bHQpO1xuICBjb25zdCBoaWRkZW4gPSAhIXNjaGVtYS4kaGlkZGVuO1xuXG4gIHJldHVybiB7XG4gICAgLi4uc3ViY29tbWFuZCxcbiAgICBzY29wZSxcbiAgICBoaWRkZW4sXG4gICAgaW1wbCxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgcmVnaXN0cnk6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5LFxuICBzY2hlbWE6IGpzb24uSnNvbk9iamVjdCxcbik6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgY29uc3Qgb3B0aW9uczogT3B0aW9uW10gPSBbXTtcblxuICBmdW5jdGlvbiB2aXNpdG9yKFxuICAgIGN1cnJlbnQ6IGpzb24uSnNvbk9iamVjdCB8IGpzb24uSnNvbkFycmF5LFxuICAgIHBvaW50ZXI6IGpzb24uc2NoZW1hLkpzb25Qb2ludGVyLFxuICAgIHBhcmVudFNjaGVtYT86IGpzb24uSnNvbk9iamVjdCB8IGpzb24uSnNvbkFycmF5LFxuICApIHtcbiAgICBpZiAoIXBhcmVudFNjaGVtYSkge1xuICAgICAgLy8gSWdub3JlIHJvb3QuXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChwb2ludGVyLnNwbGl0KC9cXC8oPzpwcm9wZXJ0aWVzfGl0ZW1zfGRlZmluaXRpb25zKVxcLy9nKS5sZW5ndGggPiAyKSB7XG4gICAgICAvLyBJZ25vcmUgc3ViaXRlbXMgKG9iamVjdHMgb3IgYXJyYXlzKS5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGpzb24uaXNKc29uQXJyYXkoY3VycmVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocG9pbnRlci5pbmRleE9mKCcvbm90LycpICE9IC0xKSB7XG4gICAgICAvLyBXZSBkb24ndCBzdXBwb3J0IGFueU9mL25vdC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIFwibm90XCIga2V5d29yZCBpcyBub3Qgc3VwcG9ydGVkIGluIEpTT04gU2NoZW1hLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHB0ciA9IGpzb24uc2NoZW1hLnBhcnNlSnNvblBvaW50ZXIocG9pbnRlcik7XG4gICAgY29uc3QgbmFtZSA9IHB0cltwdHIubGVuZ3RoIC0gMV07XG5cbiAgICBpZiAocHRyW3B0ci5sZW5ndGggLSAyXSAhPSAncHJvcGVydGllcycpIHtcbiAgICAgIC8vIFNraXAgYW55IG5vbi1wcm9wZXJ0eSBpdGVtcy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlU2V0ID0ganNvbi5zY2hlbWEuZ2V0VHlwZXNPZlNjaGVtYShjdXJyZW50KTtcblxuICAgIGlmICh0eXBlU2V0LnNpemUgPT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZmluZCB0eXBlIG9mIHNjaGVtYS4nKTtcbiAgICB9XG5cbiAgICAvLyBXZSBvbmx5IHN1cHBvcnQgbnVtYmVyLCBzdHJpbmcgb3IgYm9vbGVhbiAob3IgYXJyYXkgb2YgdGhvc2UpLCBzbyByZW1vdmUgZXZlcnl0aGluZyBlbHNlLlxuICAgIGNvbnN0IHR5cGVzID0gWy4uLnR5cGVTZXRdLmZpbHRlcih4ID0+IHtcbiAgICAgIHN3aXRjaCAoeCkge1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgLy8gT25seSBpbmNsdWRlIGFycmF5cyBpZiB0aGV5J3JlIGJvb2xlYW4sIHN0cmluZyBvciBudW1iZXIuXG4gICAgICAgICAgaWYgKGpzb24uaXNKc29uT2JqZWN0KGN1cnJlbnQuaXRlbXMpXG4gICAgICAgICAgICAgICYmIHR5cGVvZiBjdXJyZW50Lml0ZW1zLnR5cGUgPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgJiYgWydib29sZWFuJywgJ251bWJlcicsICdzdHJpbmcnXS5pbmNsdWRlcyhjdXJyZW50Lml0ZW1zLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSkubWFwKHggPT4gX2dldEVudW1Gcm9tVmFsdWUoeCwgT3B0aW9uVHlwZSwgT3B0aW9uVHlwZS5TdHJpbmcpKTtcblxuICAgIGlmICh0eXBlcy5sZW5ndGggPT0gMCkge1xuICAgICAgLy8gVGhpcyBtZWFucyBpdCdzIG5vdCB1c2FibGUgb24gdGhlIGNvbW1hbmQgbGluZS4gZS5nLiBhbiBPYmplY3QuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT25seSBrZWVwIGVudW0gdmFsdWVzIHdlIHN1cHBvcnQgKGJvb2xlYW5zLCBudW1iZXJzIGFuZCBzdHJpbmdzKS5cbiAgICBjb25zdCBlbnVtVmFsdWVzID0gKGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5lbnVtKSAmJiBjdXJyZW50LmVudW0gfHwgW10pLmZpbHRlcih4ID0+IHtcbiAgICAgIHN3aXRjaCAodHlwZW9mIHgpIHtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSkgYXMgVmFsdWVbXTtcblxuICAgIGxldCBkZWZhdWx0VmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGN1cnJlbnQuZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzd2l0Y2ggKHR5cGVzWzBdKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50LmRlZmF1bHQgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IGN1cnJlbnQuZGVmYXVsdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50LmRlZmF1bHQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IGN1cnJlbnQuZGVmYXVsdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudC5kZWZhdWx0ID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gY3VycmVudC5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gdHlwZXNbMF07XG4gICAgY29uc3QgJGRlZmF1bHQgPSBjdXJyZW50LiRkZWZhdWx0O1xuICAgIGNvbnN0ICRkZWZhdWx0SW5kZXggPSAoanNvbi5pc0pzb25PYmplY3QoJGRlZmF1bHQpICYmICRkZWZhdWx0Wyckc291cmNlJ10gPT0gJ2FyZ3YnKVxuICAgICAgPyAkZGVmYXVsdFsnaW5kZXgnXSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBwb3NpdGlvbmFsOiBudW1iZXIgfCB1bmRlZmluZWQgPSB0eXBlb2YgJGRlZmF1bHRJbmRleCA9PSAnbnVtYmVyJ1xuICAgICAgPyAkZGVmYXVsdEluZGV4IDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVxdWlyZWQgPSBqc29uLmlzSnNvbkFycmF5KGN1cnJlbnQucmVxdWlyZWQpXG4gICAgICAgID8gY3VycmVudC5yZXF1aXJlZC5pbmRleE9mKG5hbWUpICE9IC0xIDogZmFsc2U7XG4gICAgY29uc3QgYWxpYXNlcyA9IGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5hbGlhc2VzKSA/IFsuLi5jdXJyZW50LmFsaWFzZXNdLm1hcCh4ID0+ICcnICsgeClcbiAgICAgICAgICAgICAgICAgIDogY3VycmVudC5hbGlhcyA/IFsnJyArIGN1cnJlbnQuYWxpYXNdIDogW107XG4gICAgY29uc3QgZm9ybWF0ID0gdHlwZW9mIGN1cnJlbnQuZm9ybWF0ID09ICdzdHJpbmcnID8gY3VycmVudC5mb3JtYXQgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdmlzaWJsZSA9IGN1cnJlbnQudmlzaWJsZSA9PT0gdW5kZWZpbmVkIHx8IGN1cnJlbnQudmlzaWJsZSA9PT0gdHJ1ZTtcbiAgICBjb25zdCBoaWRkZW4gPSAhIWN1cnJlbnQuaGlkZGVuIHx8ICF2aXNpYmxlO1xuXG4gICAgY29uc3Qgb3B0aW9uOiBPcHRpb24gPSB7XG4gICAgICBuYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICcnICsgKGN1cnJlbnQuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogY3VycmVudC5kZXNjcmlwdGlvbiksXG4gICAgICAuLi50eXBlcy5sZW5ndGggPT0gMSA/IHsgdHlwZSB9IDogeyB0eXBlLCB0eXBlcyB9LFxuICAgICAgLi4uZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQgPyB7IGRlZmF1bHQ6IGRlZmF1bHRWYWx1ZSB9IDoge30sXG4gICAgICAuLi5lbnVtVmFsdWVzICYmIGVudW1WYWx1ZXMubGVuZ3RoID4gMCA/IHsgZW51bTogZW51bVZhbHVlcyB9IDoge30sXG4gICAgICByZXF1aXJlZCxcbiAgICAgIGFsaWFzZXMsXG4gICAgICAuLi5mb3JtYXQgIT09IHVuZGVmaW5lZCA/IHsgZm9ybWF0IH0gOiB7fSxcbiAgICAgIGhpZGRlbixcbiAgICAgIC4uLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCA/IHsgcG9zaXRpb25hbCB9IDoge30sXG4gICAgfTtcblxuICAgIG9wdGlvbnMucHVzaChvcHRpb24pO1xuICB9XG5cbiAgY29uc3QgZmxhdHRlbmVkU2NoZW1hID0gYXdhaXQgcmVnaXN0cnkuZmxhdHRlbihzY2hlbWEpLnRvUHJvbWlzZSgpO1xuICBqc29uLnNjaGVtYS52aXNpdEpzb25TY2hlbWEoZmxhdHRlbmVkU2NoZW1hLCB2aXNpdG9yKTtcblxuICAvLyBTb3J0IGJ5IHBvc2l0aW9uYWwuXG4gIHJldHVybiBvcHRpb25zLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS5wb3NpdGlvbmFsKSB7XG4gICAgICBpZiAoYi5wb3NpdGlvbmFsKSB7XG4gICAgICAgIHJldHVybiBhLnBvc2l0aW9uYWwgLSBiLnBvc2l0aW9uYWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGIucG9zaXRpb25hbCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH0pO1xufVxuIl19