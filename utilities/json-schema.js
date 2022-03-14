"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonSchemaToOptions = exports.parseJsonSchemaToCommandDescription = exports.parseJsonSchemaToSubCommandDescription = exports.CommandJsonPathException = void 0;
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const fs_1 = require("fs");
const path_1 = require("path");
const interface_1 = require("../models/interface");
class CommandJsonPathException extends core_1.BaseException {
    constructor(path, name) {
        super(`File ${path} was not found while constructing the subcommand ${name}.`);
        this.path = path;
        this.name = name;
    }
}
exports.CommandJsonPathException = CommandJsonPathException;
function _getEnumFromValue(value, enumeration, defaultValue) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (Object.values(enumeration).includes(value)) {
        return value;
    }
    return defaultValue;
}
async function parseJsonSchemaToSubCommandDescription(name, jsonPath, registry, schema) {
    const options = await parseJsonSchemaToOptions(registry, schema);
    const aliases = [];
    if (core_1.json.isJsonArray(schema.$aliases)) {
        schema.$aliases.forEach((value) => {
            if (typeof value == 'string') {
                aliases.push(value);
            }
        });
    }
    if (core_1.json.isJsonArray(schema.aliases)) {
        schema.aliases.forEach((value) => {
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
        const ldPath = (0, path_1.resolve)((0, path_1.dirname)(jsonPath), schema.$longDescription);
        try {
            longDescription = (0, fs_1.readFileSync)(ldPath, 'utf-8');
        }
        catch (e) {
            throw new CommandJsonPathException(ldPath, name);
        }
    }
    let usageNotes = '';
    if (typeof schema.$usageNotes == 'string' && schema.$usageNotes) {
        const unPath = (0, path_1.resolve)((0, path_1.dirname)(jsonPath), schema.$usageNotes);
        try {
            usageNotes = (0, fs_1.readFileSync)(unPath, 'utf-8');
        }
        catch (e) {
            throw new CommandJsonPathException(unPath, name);
        }
    }
    const description = '' + (schema.description === undefined ? '' : schema.description);
    return {
        name,
        description,
        ...(longDescription ? { longDescription } : {}),
        ...(usageNotes ? { usageNotes } : {}),
        options,
        aliases,
    };
}
exports.parseJsonSchemaToSubCommandDescription = parseJsonSchemaToSubCommandDescription;
async function parseJsonSchemaToCommandDescription(name, jsonPath, registry, schema) {
    const subcommand = await parseJsonSchemaToSubCommandDescription(name, jsonPath, registry, schema);
    // Before doing any work, let's validate the implementation.
    if (typeof schema.$impl != 'string') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const ref = new tools_1.ExportStringRef(schema.$impl, (0, path_1.dirname)(jsonPath));
    const impl = ref.ref;
    if (impl === undefined || typeof impl !== 'function') {
        throw new Error(`Command ${name} has an invalid implementation.`);
    }
    const scope = _getEnumFromValue(schema.$scope, interface_1.CommandScope, interface_1.CommandScope.Default);
    const hidden = !!schema.$hidden;
    return {
        ...subcommand,
        scope,
        hidden,
        impl,
    };
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
        const types = [...typeSet]
            .filter((x) => {
            switch (x) {
                case 'boolean':
                case 'number':
                case 'string':
                    return true;
                case 'array':
                    // Only include arrays if they're boolean, string or number.
                    if (core_1.json.isJsonObject(current.items) &&
                        typeof current.items.type == 'string' &&
                        ['boolean', 'number', 'string'].includes(current.items.type)) {
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        })
            .map((x) => _getEnumFromValue(x, interface_1.OptionType, interface_1.OptionType.String));
        if (types.length == 0) {
            // This means it's not usable on the command line. e.g. an Object.
            return;
        }
        // Only keep enum values we support (booleans, numbers and strings).
        const enumValues = ((core_1.json.isJsonArray(current.enum) && current.enum) || []).filter((x) => {
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
        const $defaultIndex = core_1.json.isJsonObject($default) && $default['$source'] == 'argv' ? $default['index'] : undefined;
        const positional = typeof $defaultIndex == 'number' ? $defaultIndex : undefined;
        const required = core_1.json.isJsonArray(current.required)
            ? current.required.indexOf(name) != -1
            : false;
        const aliases = core_1.json.isJsonArray(current.aliases)
            ? [...current.aliases].map((x) => '' + x)
            : current.alias
                ? ['' + current.alias]
                : [];
        const format = typeof current.format == 'string' ? current.format : undefined;
        const visible = current.visible === undefined || current.visible === true;
        const hidden = !!current.hidden || !visible;
        const xUserAnalytics = current['x-user-analytics'];
        const userAnalytics = typeof xUserAnalytics == 'number' ? xUserAnalytics : undefined;
        // Deprecated is set only if it's true or a string.
        const xDeprecated = current['x-deprecated'];
        const deprecated = xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : undefined;
        const option = {
            name,
            description: '' + (current.description === undefined ? '' : current.description),
            ...(types.length == 1 ? { type } : { type, types }),
            ...(defaultValue !== undefined ? { default: defaultValue } : {}),
            ...(enumValues && enumValues.length > 0 ? { enum: enumValues } : {}),
            required,
            aliases,
            ...(format !== undefined ? { format } : {}),
            hidden,
            ...(userAnalytics ? { userAnalytics } : {}),
            ...(deprecated !== undefined ? { deprecated } : {}),
            ...(positional !== undefined ? { positional } : {}),
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS91dGlsaXRpZXMvanNvbi1zY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0NBQTJEO0FBQzNELDREQUFtRTtBQUNuRSwyQkFBa0M7QUFDbEMsK0JBQXdDO0FBQ3hDLG1EQVE2QjtBQUU3QixNQUFhLHdCQUF5QixTQUFRLG9CQUFhO0lBQ3pELFlBQTRCLElBQVksRUFBMkIsSUFBWTtRQUM3RSxLQUFLLENBQUMsUUFBUSxJQUFJLG9EQUFvRCxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBRHJELFNBQUksR0FBSixJQUFJLENBQVE7UUFBMkIsU0FBSSxHQUFKLElBQUksQ0FBUTtJQUUvRSxDQUFDO0NBQ0Y7QUFKRCw0REFJQztBQUVELFNBQVMsaUJBQWlCLENBQ3hCLEtBQXFCLEVBQ3JCLFdBQWMsRUFDZCxZQUFlO0lBRWYsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDN0IsT0FBTyxZQUFZLENBQUM7S0FDckI7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzlDLE9BQU8sS0FBcUIsQ0FBQztLQUM5QjtJQUVELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFFTSxLQUFLLFVBQVUsc0NBQXNDLENBQzFELElBQVksRUFDWixRQUFnQixFQUNoQixRQUFvQyxFQUNwQyxNQUF1QjtJQUV2QixNQUFNLE9BQU8sR0FBRyxNQUFNLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUVqRSxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFDN0IsSUFBSSxXQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNyQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2hDLElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO2dCQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3JCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUNELElBQUksV0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMvQixJQUFJLE9BQU8sS0FBSyxJQUFJLFFBQVEsRUFBRTtnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNyQjtRQUNILENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxJQUFJLE9BQU8sTUFBTSxDQUFDLEtBQUssSUFBSSxRQUFRLEVBQUU7UUFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLGVBQWUsR0FBRyxFQUFFLENBQUM7SUFDekIsSUFBSSxPQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLElBQUEsY0FBTyxFQUFDLElBQUEsY0FBTyxFQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQUk7WUFDRixlQUFlLEdBQUcsSUFBQSxpQkFBWSxFQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNqRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxJQUFJLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNsRDtLQUNGO0lBQ0QsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0lBQ3BCLElBQUksT0FBTyxNQUFNLENBQUMsV0FBVyxJQUFJLFFBQVEsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFO1FBQy9ELE1BQU0sTUFBTSxHQUFHLElBQUEsY0FBTyxFQUFDLElBQUEsY0FBTyxFQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxJQUFJO1lBQ0YsVUFBVSxHQUFHLElBQUEsaUJBQVksRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDNUM7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE1BQU0sSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbEQ7S0FDRjtJQUVELE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV0RixPQUFPO1FBQ0wsSUFBSTtRQUNKLFdBQVc7UUFDWCxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDL0MsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE9BQU87UUFDUCxPQUFPO0tBQ1IsQ0FBQztBQUNKLENBQUM7QUF4REQsd0ZBd0RDO0FBRU0sS0FBSyxVQUFVLG1DQUFtQyxDQUN2RCxJQUFZLEVBQ1osUUFBZ0IsRUFDaEIsUUFBb0MsRUFDcEMsTUFBdUI7SUFFdkIsTUFBTSxVQUFVLEdBQUcsTUFBTSxzQ0FBc0MsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUVsRyw0REFBNEQ7SUFDNUQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxLQUFLLElBQUksUUFBUSxFQUFFO1FBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLGlDQUFpQyxDQUFDLENBQUM7S0FDbkU7SUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUFlLENBQXFCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBQSxjQUFPLEVBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNyRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXJCLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxPQUFPLElBQUksS0FBSyxVQUFVLEVBQUU7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksaUNBQWlDLENBQUMsQ0FBQztLQUNuRTtJQUVELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsd0JBQVksRUFBRSx3QkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25GLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBRWhDLE9BQU87UUFDTCxHQUFHLFVBQVU7UUFDYixLQUFLO1FBQ0wsTUFBTTtRQUNOLElBQUk7S0FDTCxDQUFDO0FBQ0osQ0FBQztBQTVCRCxrRkE0QkM7QUFFTSxLQUFLLFVBQVUsd0JBQXdCLENBQzVDLFFBQW9DLEVBQ3BDLE1BQXVCO0lBRXZCLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztJQUU3QixTQUFTLE9BQU8sQ0FDZCxPQUF5QyxFQUN6QyxPQUFnQyxFQUNoQyxZQUErQztRQUUvQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLGVBQWU7WUFDZixPQUFPO1NBQ1I7YUFBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzVFLHVDQUF1QztZQUN2QyxPQUFPO1NBQ1I7YUFBTSxJQUFJLFdBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEMsT0FBTztTQUNSO1FBRUQsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO1lBQ2xDLDhCQUE4QjtZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7U0FDdkU7UUFFRCxNQUFNLEdBQUcsR0FBRyxXQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWpDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksWUFBWSxFQUFFO1lBQ3ZDLCtCQUErQjtZQUMvQixPQUFPO1NBQ1I7UUFFRCxNQUFNLE9BQU8sR0FBRyxXQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO1FBRUQsNEZBQTRGO1FBQzVGLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUM7YUFDdkIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDWixRQUFRLENBQUMsRUFBRTtnQkFDVCxLQUFLLFNBQVMsQ0FBQztnQkFDZixLQUFLLFFBQVEsQ0FBQztnQkFDZCxLQUFLLFFBQVE7b0JBQ1gsT0FBTyxJQUFJLENBQUM7Z0JBRWQsS0FBSyxPQUFPO29CQUNWLDREQUE0RDtvQkFDNUQsSUFDRSxXQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7d0JBQ2hDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksUUFBUTt3QkFDckMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUM1RDt3QkFDQSxPQUFPLElBQUksQ0FBQztxQkFDYjtvQkFFRCxPQUFPLEtBQUssQ0FBQztnQkFFZjtvQkFDRSxPQUFPLEtBQUssQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBQzthQUNELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLHNCQUFVLEVBQUUsc0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRW5FLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDckIsa0VBQWtFO1lBQ2xFLE9BQU87U0FDUjtRQUVELG9FQUFvRTtRQUNwRSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsV0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZGLFFBQVEsT0FBTyxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssU0FBUyxDQUFDO2dCQUNmLEtBQUssUUFBUSxDQUFDO2dCQUNkLEtBQUssUUFBUTtvQkFDWCxPQUFPLElBQUksQ0FBQztnQkFFZDtvQkFDRSxPQUFPLEtBQUssQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBWSxDQUFDO1FBRWQsSUFBSSxZQUFZLEdBQTBDLFNBQVMsQ0FBQztRQUNwRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO1lBQ2pDLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNoQixLQUFLLFFBQVE7b0JBQ1gsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFO3dCQUN0QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLFFBQVE7b0JBQ1gsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFO3dCQUN0QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLFNBQVM7b0JBQ1osSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxFQUFFO3dCQUN2QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztxQkFDaEM7b0JBQ0QsTUFBTTthQUNUO1NBQ0Y7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUNsQyxNQUFNLGFBQWEsR0FDakIsV0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMvRixNQUFNLFVBQVUsR0FDZCxPQUFPLGFBQWEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRS9ELE1BQU0sUUFBUSxHQUFHLFdBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUNqRCxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDVixNQUFNLE9BQU8sR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSztnQkFDZixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNQLE1BQU0sTUFBTSxHQUFHLE9BQU8sT0FBTyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM5RSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQztRQUMxRSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUU1QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNuRCxNQUFNLGFBQWEsR0FBRyxPQUFPLGNBQWMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXJGLG1EQUFtRDtRQUNuRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUMsTUFBTSxVQUFVLEdBQ2QsV0FBVyxLQUFLLElBQUksSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXBGLE1BQU0sTUFBTSxHQUFXO1lBQ3JCLElBQUk7WUFDSixXQUFXLEVBQUUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNoRixHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ25ELEdBQUcsQ0FBQyxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hFLEdBQUcsQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEUsUUFBUTtZQUNSLE9BQU87WUFDUCxHQUFHLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNDLE1BQU07WUFDTixHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0MsR0FBRyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxHQUFHLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1NBQ3BELENBQUM7UUFFRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRXRELHNCQUFzQjtJQUN0QixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtnQkFDaEIsT0FBTyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO2FBQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQ3ZCLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDWDthQUFNO1lBQ0wsT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhLRCw0REF3S0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQmFzZUV4Y2VwdGlvbiwganNvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEV4cG9ydFN0cmluZ1JlZiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIENvbW1hbmRDb25zdHJ1Y3RvcixcbiAgQ29tbWFuZERlc2NyaXB0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbixcbiAgT3B0aW9uVHlwZSxcbiAgU3ViQ29tbWFuZERlc2NyaXB0aW9uLFxuICBWYWx1ZSxcbn0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kSnNvblBhdGhFeGNlcHRpb24gZXh0ZW5kcyBCYXNlRXhjZXB0aW9uIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHBhdGg6IHN0cmluZywgcHVibGljIG92ZXJyaWRlIHJlYWRvbmx5IG5hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKGBGaWxlICR7cGF0aH0gd2FzIG5vdCBmb3VuZCB3aGlsZSBjb25zdHJ1Y3RpbmcgdGhlIHN1YmNvbW1hbmQgJHtuYW1lfS5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfZ2V0RW51bUZyb21WYWx1ZTxFLCBUIGV4dGVuZHMgRVtrZXlvZiBFXT4oXG4gIHZhbHVlOiBqc29uLkpzb25WYWx1ZSxcbiAgZW51bWVyYXRpb246IEUsXG4gIGRlZmF1bHRWYWx1ZTogVCxcbik6IFQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gIH1cblxuICBpZiAoT2JqZWN0LnZhbHVlcyhlbnVtZXJhdGlvbikuaW5jbHVkZXModmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlIGFzIHVua25vd24gYXMgVDtcbiAgfVxuXG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb1N1YkNvbW1hbmREZXNjcmlwdGlvbihcbiAgbmFtZTogc3RyaW5nLFxuICBqc29uUGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxTdWJDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhyZWdpc3RyeSwgc2NoZW1hKTtcblxuICBjb25zdCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoanNvbi5pc0pzb25BcnJheShzY2hlbWEuJGFsaWFzZXMpKSB7XG4gICAgc2NoZW1hLiRhbGlhc2VzLmZvckVhY2goKHZhbHVlKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKGpzb24uaXNKc29uQXJyYXkoc2NoZW1hLmFsaWFzZXMpKSB7XG4gICAgc2NoZW1hLmFsaWFzZXMuZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgYWxpYXNlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBpZiAodHlwZW9mIHNjaGVtYS5hbGlhcyA9PSAnc3RyaW5nJykge1xuICAgIGFsaWFzZXMucHVzaChzY2hlbWEuYWxpYXMpO1xuICB9XG5cbiAgbGV0IGxvbmdEZXNjcmlwdGlvbiA9ICcnO1xuICBpZiAodHlwZW9mIHNjaGVtYS4kbG9uZ0Rlc2NyaXB0aW9uID09ICdzdHJpbmcnICYmIHNjaGVtYS4kbG9uZ0Rlc2NyaXB0aW9uKSB7XG4gICAgY29uc3QgbGRQYXRoID0gcmVzb2x2ZShkaXJuYW1lKGpzb25QYXRoKSwgc2NoZW1hLiRsb25nRGVzY3JpcHRpb24pO1xuICAgIHRyeSB7XG4gICAgICBsb25nRGVzY3JpcHRpb24gPSByZWFkRmlsZVN5bmMobGRQYXRoLCAndXRmLTgnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZEpzb25QYXRoRXhjZXB0aW9uKGxkUGF0aCwgbmFtZSk7XG4gICAgfVxuICB9XG4gIGxldCB1c2FnZU5vdGVzID0gJyc7XG4gIGlmICh0eXBlb2Ygc2NoZW1hLiR1c2FnZU5vdGVzID09ICdzdHJpbmcnICYmIHNjaGVtYS4kdXNhZ2VOb3Rlcykge1xuICAgIGNvbnN0IHVuUGF0aCA9IHJlc29sdmUoZGlybmFtZShqc29uUGF0aCksIHNjaGVtYS4kdXNhZ2VOb3Rlcyk7XG4gICAgdHJ5IHtcbiAgICAgIHVzYWdlTm90ZXMgPSByZWFkRmlsZVN5bmModW5QYXRoLCAndXRmLTgnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZEpzb25QYXRoRXhjZXB0aW9uKHVuUGF0aCwgbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGVzY3JpcHRpb24gPSAnJyArIChzY2hlbWEuZGVzY3JpcHRpb24gPT09IHVuZGVmaW5lZCA/ICcnIDogc2NoZW1hLmRlc2NyaXB0aW9uKTtcblxuICByZXR1cm4ge1xuICAgIG5hbWUsXG4gICAgZGVzY3JpcHRpb24sXG4gICAgLi4uKGxvbmdEZXNjcmlwdGlvbiA/IHsgbG9uZ0Rlc2NyaXB0aW9uIH0gOiB7fSksXG4gICAgLi4uKHVzYWdlTm90ZXMgPyB7IHVzYWdlTm90ZXMgfSA6IHt9KSxcbiAgICBvcHRpb25zLFxuICAgIGFsaWFzZXMsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihcbiAgbmFtZTogc3RyaW5nLFxuICBqc29uUGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgY29uc3Qgc3ViY29tbWFuZCA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvU3ViQ29tbWFuZERlc2NyaXB0aW9uKG5hbWUsIGpzb25QYXRoLCByZWdpc3RyeSwgc2NoZW1hKTtcblxuICAvLyBCZWZvcmUgZG9pbmcgYW55IHdvcmssIGxldCdzIHZhbGlkYXRlIHRoZSBpbXBsZW1lbnRhdGlvbi5cbiAgaWYgKHR5cGVvZiBzY2hlbWEuJGltcGwgIT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuICBjb25zdCByZWYgPSBuZXcgRXhwb3J0U3RyaW5nUmVmPENvbW1hbmRDb25zdHJ1Y3Rvcj4oc2NoZW1hLiRpbXBsLCBkaXJuYW1lKGpzb25QYXRoKSk7XG4gIGNvbnN0IGltcGwgPSByZWYucmVmO1xuXG4gIGlmIChpbXBsID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgJHtuYW1lfSBoYXMgYW4gaW52YWxpZCBpbXBsZW1lbnRhdGlvbi5gKTtcbiAgfVxuXG4gIGNvbnN0IHNjb3BlID0gX2dldEVudW1Gcm9tVmFsdWUoc2NoZW1hLiRzY29wZSwgQ29tbWFuZFNjb3BlLCBDb21tYW5kU2NvcGUuRGVmYXVsdCk7XG4gIGNvbnN0IGhpZGRlbiA9ICEhc2NoZW1hLiRoaWRkZW47XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5zdWJjb21tYW5kLFxuICAgIHNjb3BlLFxuICAgIGhpZGRlbixcbiAgICBpbXBsLFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICBjb25zdCBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHZpc2l0b3IoXG4gICAgY3VycmVudDoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICAgcG9pbnRlcjoganNvbi5zY2hlbWEuSnNvblBvaW50ZXIsXG4gICAgcGFyZW50U2NoZW1hPzoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICkge1xuICAgIGlmICghcGFyZW50U2NoZW1hKSB7XG4gICAgICAvLyBJZ25vcmUgcm9vdC5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHBvaW50ZXIuc3BsaXQoL1xcLyg/OnByb3BlcnRpZXN8aXRlbXN8ZGVmaW5pdGlvbnMpXFwvL2cpLmxlbmd0aCA+IDIpIHtcbiAgICAgIC8vIElnbm9yZSBzdWJpdGVtcyAob2JqZWN0cyBvciBhcnJheXMpLlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoanNvbi5pc0pzb25BcnJheShjdXJyZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwb2ludGVyLmluZGV4T2YoJy9ub3QvJykgIT0gLTEpIHtcbiAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgYW55T2Yvbm90LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJub3RcIiBrZXl3b3JkIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTiBTY2hlbWEuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHRyID0ganNvbi5zY2hlbWEucGFyc2VKc29uUG9pbnRlcihwb2ludGVyKTtcbiAgICBjb25zdCBuYW1lID0gcHRyW3B0ci5sZW5ndGggLSAxXTtcblxuICAgIGlmIChwdHJbcHRyLmxlbmd0aCAtIDJdICE9ICdwcm9wZXJ0aWVzJykge1xuICAgICAgLy8gU2tpcCBhbnkgbm9uLXByb3BlcnR5IGl0ZW1zLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVTZXQgPSBqc29uLnNjaGVtYS5nZXRUeXBlc09mU2NoZW1hKGN1cnJlbnQpO1xuXG4gICAgaWYgKHR5cGVTZXQuc2l6ZSA9PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIHR5cGUgb2Ygc2NoZW1hLicpO1xuICAgIH1cblxuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBudW1iZXIsIHN0cmluZyBvciBib29sZWFuIChvciBhcnJheSBvZiB0aG9zZSksIHNvIHJlbW92ZSBldmVyeXRoaW5nIGVsc2UuXG4gICAgY29uc3QgdHlwZXMgPSBbLi4udHlwZVNldF1cbiAgICAgIC5maWx0ZXIoKHgpID0+IHtcbiAgICAgICAgc3dpdGNoICh4KSB7XG4gICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgYXJyYXlzIGlmIHRoZXkncmUgYm9vbGVhbiwgc3RyaW5nIG9yIG51bWJlci5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAganNvbi5pc0pzb25PYmplY3QoY3VycmVudC5pdGVtcykgJiZcbiAgICAgICAgICAgICAgdHlwZW9mIGN1cnJlbnQuaXRlbXMudHlwZSA9PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgICBbJ2Jvb2xlYW4nLCAnbnVtYmVyJywgJ3N0cmluZyddLmluY2x1ZGVzKGN1cnJlbnQuaXRlbXMudHlwZSlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5tYXAoKHgpID0+IF9nZXRFbnVtRnJvbVZhbHVlKHgsIE9wdGlvblR5cGUsIE9wdGlvblR5cGUuU3RyaW5nKSk7XG5cbiAgICBpZiAodHlwZXMubGVuZ3RoID09IDApIHtcbiAgICAgIC8vIFRoaXMgbWVhbnMgaXQncyBub3QgdXNhYmxlIG9uIHRoZSBjb21tYW5kIGxpbmUuIGUuZy4gYW4gT2JqZWN0LlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE9ubHkga2VlcCBlbnVtIHZhbHVlcyB3ZSBzdXBwb3J0IChib29sZWFucywgbnVtYmVycyBhbmQgc3RyaW5ncykuXG4gICAgY29uc3QgZW51bVZhbHVlcyA9ICgoanNvbi5pc0pzb25BcnJheShjdXJyZW50LmVudW0pICYmIGN1cnJlbnQuZW51bSkgfHwgW10pLmZpbHRlcigoeCkgPT4ge1xuICAgICAgc3dpdGNoICh0eXBlb2YgeCkge1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KSBhcyBWYWx1ZVtdO1xuXG4gICAgbGV0IGRlZmF1bHRWYWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoY3VycmVudC5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHN3aXRjaCAodHlwZXNbMF0pIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnQuZGVmYXVsdCA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gY3VycmVudC5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnQuZGVmYXVsdCA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gY3VycmVudC5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50LmRlZmF1bHQgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBjdXJyZW50LmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSB0eXBlc1swXTtcbiAgICBjb25zdCAkZGVmYXVsdCA9IGN1cnJlbnQuJGRlZmF1bHQ7XG4gICAgY29uc3QgJGRlZmF1bHRJbmRleCA9XG4gICAgICBqc29uLmlzSnNvbk9iamVjdCgkZGVmYXVsdCkgJiYgJGRlZmF1bHRbJyRzb3VyY2UnXSA9PSAnYXJndicgPyAkZGVmYXVsdFsnaW5kZXgnXSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBwb3NpdGlvbmFsOiBudW1iZXIgfCB1bmRlZmluZWQgPVxuICAgICAgdHlwZW9mICRkZWZhdWx0SW5kZXggPT0gJ251bWJlcicgPyAkZGVmYXVsdEluZGV4IDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVxdWlyZWQgPSBqc29uLmlzSnNvbkFycmF5KGN1cnJlbnQucmVxdWlyZWQpXG4gICAgICA/IGN1cnJlbnQucmVxdWlyZWQuaW5kZXhPZihuYW1lKSAhPSAtMVxuICAgICAgOiBmYWxzZTtcbiAgICBjb25zdCBhbGlhc2VzID0ganNvbi5pc0pzb25BcnJheShjdXJyZW50LmFsaWFzZXMpXG4gICAgICA/IFsuLi5jdXJyZW50LmFsaWFzZXNdLm1hcCgoeCkgPT4gJycgKyB4KVxuICAgICAgOiBjdXJyZW50LmFsaWFzXG4gICAgICA/IFsnJyArIGN1cnJlbnQuYWxpYXNdXG4gICAgICA6IFtdO1xuICAgIGNvbnN0IGZvcm1hdCA9IHR5cGVvZiBjdXJyZW50LmZvcm1hdCA9PSAnc3RyaW5nJyA/IGN1cnJlbnQuZm9ybWF0IDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHZpc2libGUgPSBjdXJyZW50LnZpc2libGUgPT09IHVuZGVmaW5lZCB8fCBjdXJyZW50LnZpc2libGUgPT09IHRydWU7XG4gICAgY29uc3QgaGlkZGVuID0gISFjdXJyZW50LmhpZGRlbiB8fCAhdmlzaWJsZTtcblxuICAgIGNvbnN0IHhVc2VyQW5hbHl0aWNzID0gY3VycmVudFsneC11c2VyLWFuYWx5dGljcyddO1xuICAgIGNvbnN0IHVzZXJBbmFseXRpY3MgPSB0eXBlb2YgeFVzZXJBbmFseXRpY3MgPT0gJ251bWJlcicgPyB4VXNlckFuYWx5dGljcyA6IHVuZGVmaW5lZDtcblxuICAgIC8vIERlcHJlY2F0ZWQgaXMgc2V0IG9ubHkgaWYgaXQncyB0cnVlIG9yIGEgc3RyaW5nLlxuICAgIGNvbnN0IHhEZXByZWNhdGVkID0gY3VycmVudFsneC1kZXByZWNhdGVkJ107XG4gICAgY29uc3QgZGVwcmVjYXRlZCA9XG4gICAgICB4RGVwcmVjYXRlZCA9PT0gdHJ1ZSB8fCB0eXBlb2YgeERlcHJlY2F0ZWQgPT09ICdzdHJpbmcnID8geERlcHJlY2F0ZWQgOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBvcHRpb246IE9wdGlvbiA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJycgKyAoY3VycmVudC5kZXNjcmlwdGlvbiA9PT0gdW5kZWZpbmVkID8gJycgOiBjdXJyZW50LmRlc2NyaXB0aW9uKSxcbiAgICAgIC4uLih0eXBlcy5sZW5ndGggPT0gMSA/IHsgdHlwZSB9IDogeyB0eXBlLCB0eXBlcyB9KSxcbiAgICAgIC4uLihkZWZhdWx0VmFsdWUgIT09IHVuZGVmaW5lZCA/IHsgZGVmYXVsdDogZGVmYXVsdFZhbHVlIH0gOiB7fSksXG4gICAgICAuLi4oZW51bVZhbHVlcyAmJiBlbnVtVmFsdWVzLmxlbmd0aCA+IDAgPyB7IGVudW06IGVudW1WYWx1ZXMgfSA6IHt9KSxcbiAgICAgIHJlcXVpcmVkLFxuICAgICAgYWxpYXNlcyxcbiAgICAgIC4uLihmb3JtYXQgIT09IHVuZGVmaW5lZCA/IHsgZm9ybWF0IH0gOiB7fSksXG4gICAgICBoaWRkZW4sXG4gICAgICAuLi4odXNlckFuYWx5dGljcyA/IHsgdXNlckFuYWx5dGljcyB9IDoge30pLFxuICAgICAgLi4uKGRlcHJlY2F0ZWQgIT09IHVuZGVmaW5lZCA/IHsgZGVwcmVjYXRlZCB9IDoge30pLFxuICAgICAgLi4uKHBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZCA/IHsgcG9zaXRpb25hbCB9IDoge30pLFxuICAgIH07XG5cbiAgICBvcHRpb25zLnB1c2gob3B0aW9uKTtcbiAgfVxuXG4gIGNvbnN0IGZsYXR0ZW5lZFNjaGVtYSA9IGF3YWl0IHJlZ2lzdHJ5LmZsYXR0ZW4oc2NoZW1hKS50b1Byb21pc2UoKTtcbiAganNvbi5zY2hlbWEudmlzaXRKc29uU2NoZW1hKGZsYXR0ZW5lZFNjaGVtYSwgdmlzaXRvcik7XG5cbiAgLy8gU29ydCBieSBwb3NpdGlvbmFsLlxuICByZXR1cm4gb3B0aW9ucy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEucG9zaXRpb25hbCkge1xuICAgICAgaWYgKGIucG9zaXRpb25hbCkge1xuICAgICAgICByZXR1cm4gYS5wb3NpdGlvbmFsIC0gYi5wb3NpdGlvbmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChiLnBvc2l0aW9uYWwpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==