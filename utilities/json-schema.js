"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function parseJsonSchemaToCommandDescription(name, jsonPath, registry, schema) {
    return __awaiter(this, void 0, void 0, function* () {
        // Before doing any work, let's validate the implementation.
        if (typeof schema.$impl != 'string') {
            throw new Error(`Command ${name} has an invalid implementation.`);
        }
        const ref = new tools_1.ExportStringRef(schema.$impl, path_1.dirname(jsonPath));
        const impl = ref.ref;
        if (impl === undefined || typeof impl !== 'function') {
            throw new Error(`Command ${name} has an invalid implementation.`);
        }
        const options = yield parseJsonSchemaToOptions(registry, schema);
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
    });
}
exports.parseJsonSchemaToCommandDescription = parseJsonSchemaToCommandDescription;
function parseJsonSchemaToOptions(registry, schema) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const flattenedSchema = yield registry.flatten(schema).toPromise();
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
    });
}
exports.parseJsonSchemaToOptions = parseJsonSchemaToOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQTRDO0FBQzVDLDREQUFtRTtBQUNuRSwyQkFBa0M7QUFDbEMsK0JBQXdDO0FBQ3hDLG1EQU82QjtBQUU3QixTQUFTLGlCQUFpQixDQUFzQixDQUFpQixFQUFFLENBQUksRUFBRSxDQUFJO0lBQzNFLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxFQUFFO1FBQ3pCLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ3RDLE9BQU8sQ0FBTSxDQUFDO0tBQ2Y7SUFFRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFFRCxTQUFzQixtQ0FBbUMsQ0FDdkQsSUFBWSxFQUNaLFFBQWdCLEVBQ2hCLFFBQW9DLEVBQ3BDLE1BQXVCOztRQUV2Qiw0REFBNEQ7UUFDNUQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxLQUFLLElBQUksUUFBUSxFQUFFO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLGlDQUFpQyxDQUFDLENBQUM7U0FDbkU7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUFlLENBQXFCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsY0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDckYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUVyQixJQUFJLElBQUksS0FBSyxTQUFTLElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLGlDQUFpQyxDQUFDLENBQUM7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QUFTLEVBQUUsQ0FBQztRQUNuRSxXQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFdEQsc0JBQXNCO1FBQ3RCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQixJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUU7Z0JBQ2hCLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRTtvQkFDaEIsT0FBTyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7aUJBQ3BDO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxDQUFDO2lCQUNWO2FBQ0Y7aUJBQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO2dCQUN2QixPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ1g7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLENBQUM7YUFDVjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBcklELDREQXFJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IGpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBFeHBvcnRTdHJpbmdSZWYgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBDb21tYW5kQ29uc3RydWN0b3IsXG4gIENvbW1hbmREZXNjcmlwdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBDb21tYW5kVHlwZSxcbiAgT3B0aW9uLFxuICBPcHRpb25UeXBlLFxufSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcblxuZnVuY3Rpb24gX2dldEVudW1Gcm9tVmFsdWU8RSwgVCBleHRlbmRzIHN0cmluZz4odjoganNvbi5Kc29uVmFsdWUsIGU6IEUsIGQ6IFQpOiBUIHtcbiAgaWYgKHR5cGVvZiB2ICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkO1xuICB9XG5cbiAgaWYgKE9iamVjdC52YWx1ZXMoZSkuaW5kZXhPZih2KSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdiBhcyBUO1xuICB9XG5cbiAgcmV0dXJuIGQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZUpzb25TY2hlbWFUb0NvbW1hbmREZXNjcmlwdGlvbihcbiAgbmFtZTogc3RyaW5nLFxuICBqc29uUGF0aDogc3RyaW5nLFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxDb21tYW5kRGVzY3JpcHRpb24+IHtcbiAgLy8gQmVmb3JlIGRvaW5nIGFueSB3b3JrLCBsZXQncyB2YWxpZGF0ZSB0aGUgaW1wbGVtZW50YXRpb24uXG4gIGlmICh0eXBlb2Ygc2NoZW1hLiRpbXBsICE9ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21tYW5kICR7bmFtZX0gaGFzIGFuIGludmFsaWQgaW1wbGVtZW50YXRpb24uYCk7XG4gIH1cbiAgY29uc3QgcmVmID0gbmV3IEV4cG9ydFN0cmluZ1JlZjxDb21tYW5kQ29uc3RydWN0b3I+KHNjaGVtYS4kaW1wbCwgZGlybmFtZShqc29uUGF0aCkpO1xuICBjb25zdCBpbXBsID0gcmVmLnJlZjtcblxuICBpZiAoaW1wbCA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb21tYW5kICR7bmFtZX0gaGFzIGFuIGludmFsaWQgaW1wbGVtZW50YXRpb24uYCk7XG4gIH1cblxuICBjb25zdCBvcHRpb25zID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHJlZ2lzdHJ5LCBzY2hlbWEpO1xuXG4gIGNvbnN0IGFsaWFzZXM6IHN0cmluZ1tdID0gW107XG4gIGlmIChqc29uLmlzSnNvbkFycmF5KHNjaGVtYS4kYWxpYXNlcykpIHtcbiAgICBzY2hlbWEuJGFsaWFzZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBsZXQgbG9uZ0Rlc2NyaXB0aW9uID0gJyc7XG4gIGlmICh0eXBlb2Ygc2NoZW1hLiRsb25nRGVzY3JpcHRpb24gPT0gJ3N0cmluZycgJiYgc2NoZW1hLiRsb25nRGVzY3JpcHRpb24pIHtcbiAgICBjb25zdCBsZFBhdGggPSByZXNvbHZlKGRpcm5hbWUoanNvblBhdGgpLCBzY2hlbWEuJGxvbmdEZXNjcmlwdGlvbik7XG4gICAgbG9uZ0Rlc2NyaXB0aW9uID0gcmVhZEZpbGVTeW5jKGxkUGF0aCwgJ3V0Zi04Jyk7XG4gIH1cblxuICBjb25zdCBzY29wZSA9IF9nZXRFbnVtRnJvbVZhbHVlKHNjaGVtYS4kc2NvcGUsIENvbW1hbmRTY29wZSwgQ29tbWFuZFNjb3BlLkRlZmF1bHQpO1xuICBjb25zdCB0eXBlID0gX2dldEVudW1Gcm9tVmFsdWUoc2NoZW1hLiR0eXBlLCBDb21tYW5kVHlwZSwgQ29tbWFuZFR5cGUuRGVmYXVsdCk7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gJycgKyAoc2NoZW1hLmRlc2NyaXB0aW9uID09PSB1bmRlZmluZWQgPyAnJyA6IHNjaGVtYS5kZXNjcmlwdGlvbik7XG4gIGNvbnN0IGhpZGRlbiA9ICEhc2NoZW1hLiRoaWRkZW47XG5cbiAgcmV0dXJuIHsgbmFtZSwgZGVzY3JpcHRpb24sIGxvbmdEZXNjcmlwdGlvbiwgaGlkZGVuLCB0eXBlLCBvcHRpb25zLCBhbGlhc2VzLCBzY29wZSwgaW1wbCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICByZWdpc3RyeToganNvbi5zY2hlbWEuU2NoZW1hUmVnaXN0cnksXG4gIHNjaGVtYToganNvbi5Kc29uT2JqZWN0LFxuKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICBjb25zdCBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHZpc2l0b3IoXG4gICAgY3VycmVudDoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICAgcG9pbnRlcjoganNvbi5zY2hlbWEuSnNvblBvaW50ZXIsXG4gICAgcGFyZW50U2NoZW1hPzoganNvbi5Kc29uT2JqZWN0IHwganNvbi5Kc29uQXJyYXksXG4gICkge1xuICAgIGlmICghcGFyZW50U2NoZW1hKSB7XG4gICAgICAvLyBJZ25vcmUgcm9vdC5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHBvaW50ZXIuc3BsaXQoL1xcLyg/OnByb3BlcnRpZXN8aXRlbXN8ZGVmaW5pdGlvbnMpXFwvL2cpLmxlbmd0aCA+IDIpIHtcbiAgICAgIC8vIElnbm9yZSBzdWJpdGVtcyAob2JqZWN0cyBvciBhcnJheXMpLlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoanNvbi5pc0pzb25BcnJheShjdXJyZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwb2ludGVyLmluZGV4T2YoJy9ub3QvJykgIT0gLTEpIHtcbiAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgYW55T2Yvbm90LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJub3RcIiBrZXl3b3JkIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTiBTY2hlbWEuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcHRyID0ganNvbi5zY2hlbWEucGFyc2VKc29uUG9pbnRlcihwb2ludGVyKTtcbiAgICBjb25zdCBuYW1lID0gcHRyW3B0ci5sZW5ndGggLSAxXTtcblxuICAgIGlmIChwdHJbcHRyLmxlbmd0aCAtIDJdICE9ICdwcm9wZXJ0aWVzJykge1xuICAgICAgLy8gU2tpcCBhbnkgbm9uLXByb3BlcnR5IGl0ZW1zLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVTZXQgPSBqc29uLnNjaGVtYS5nZXRUeXBlc09mU2NoZW1hKGN1cnJlbnQpO1xuXG4gICAgaWYgKHR5cGVTZXQuc2l6ZSA9PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIHR5cGUgb2Ygc2NoZW1hLicpO1xuICAgIH1cblxuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBudW1iZXIsIHN0cmluZyBvciBib29sZWFuIChvciBhcnJheSBvZiB0aG9zZSksIHNvIHJlbW92ZSBldmVyeXRoaW5nIGVsc2UuXG4gICAgY29uc3QgdHlwZXMgPSBbLi4udHlwZVNldF0uZmlsdGVyKHggPT4ge1xuICAgICAgc3dpdGNoICh4KSB7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgYXJyYXlzIGlmIHRoZXkncmUgYm9vbGVhbiwgc3RyaW5nIG9yIG51bWJlci5cbiAgICAgICAgICBpZiAoanNvbi5pc0pzb25PYmplY3QoY3VycmVudC5pdGVtcylcbiAgICAgICAgICAgICAgJiYgdHlwZW9mIGN1cnJlbnQuaXRlbXMudHlwZSA9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAmJiBbJ2Jvb2xlYW4nLCAnbnVtYmVyJywgJ3N0cmluZyddLmluY2x1ZGVzKGN1cnJlbnQuaXRlbXMudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KS5tYXAoeCA9PiBfZ2V0RW51bUZyb21WYWx1ZSh4LCBPcHRpb25UeXBlLCBPcHRpb25UeXBlLlN0cmluZykpO1xuXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAvLyBUaGlzIG1lYW5zIGl0J3Mgbm90IHVzYWJsZSBvbiB0aGUgY29tbWFuZCBsaW5lLiBlLmcuIGFuIE9iamVjdC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZGVmYXVsdFZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChzY2hlbWEuZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzd2l0Y2ggKHR5cGVzWzBdKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuZGVmYXVsdCA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGVmYXVsdFZhbHVlID0gc2NoZW1hLmRlZmF1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIGlmICh0eXBlb2Ygc2NoZW1hLmRlZmF1bHQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHNjaGVtYS5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuZGVmYXVsdCA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHNjaGVtYS5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCAkZGVmYXVsdCA9IGN1cnJlbnQuJGRlZmF1bHQ7XG4gICAgY29uc3QgJGRlZmF1bHRJbmRleCA9IChqc29uLmlzSnNvbk9iamVjdCgkZGVmYXVsdCkgJiYgJGRlZmF1bHRbJyRzb3VyY2UnXSA9PSAnYXJndicpXG4gICAgICA/ICRkZWZhdWx0WydpbmRleCddIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHBvc2l0aW9uYWw6IG51bWJlciB8IHVuZGVmaW5lZCA9IHR5cGVvZiAkZGVmYXVsdEluZGV4ID09ICdudW1iZXInXG4gICAgICA/ICRkZWZhdWx0SW5kZXggOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCByZXF1aXJlZCA9IGpzb24uaXNKc29uQXJyYXkoY3VycmVudC5yZXF1aXJlZClcbiAgICAgICAgPyBjdXJyZW50LnJlcXVpcmVkLmluZGV4T2YobmFtZSkgIT0gLTEgOiBmYWxzZTtcbiAgICBjb25zdCBhbGlhc2VzID0ganNvbi5pc0pzb25BcnJheShjdXJyZW50LmFsaWFzZXMpID8gWy4uLmN1cnJlbnQuYWxpYXNlc10ubWFwKHggPT4gJycgKyB4KSA6IFtdO1xuICAgIGNvbnN0IGZvcm1hdCA9IHR5cGVvZiBjdXJyZW50LmZvcm1hdCA9PSAnc3RyaW5nJyA/IGN1cnJlbnQuZm9ybWF0IDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IGhpZGRlbiA9ICEhY3VycmVudC5oaWRkZW47XG5cbiAgICBjb25zdCBvcHRpb246IE9wdGlvbiA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJycgKyAoY3VycmVudC5kZXNjcmlwdGlvbiA9PT0gdW5kZWZpbmVkID8gJycgOiBjdXJyZW50LmRlc2NyaXB0aW9uKSxcbiAgICAgIC4uLnR5cGVzLmxlbmd0aCA9PSAxID8geyB0eXBlOiB0eXBlc1swXSB9IDogeyB0eXBlOiB0eXBlc1swXSwgdHlwZXMgfSxcbiAgICAgIC4uLmRlZmF1bHRWYWx1ZSAhPT0gdW5kZWZpbmVkID8geyBkZWZhdWx0OiBkZWZhdWx0VmFsdWUgfSA6IHt9LFxuICAgICAgcmVxdWlyZWQsXG4gICAgICBhbGlhc2VzLFxuICAgICAgLi4uZm9ybWF0ICE9PSB1bmRlZmluZWQgPyB7IGZvcm1hdCB9IDoge30sXG4gICAgICBoaWRkZW4sXG4gICAgICAuLi5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQgPyB7IHBvc2l0aW9uYWwgfSA6IHt9LFxuICAgIH07XG5cbiAgICBvcHRpb25zLnB1c2gob3B0aW9uKTtcbiAgfVxuXG4gIGNvbnN0IGZsYXR0ZW5lZFNjaGVtYSA9IGF3YWl0IHJlZ2lzdHJ5LmZsYXR0ZW4oc2NoZW1hKS50b1Byb21pc2UoKTtcbiAganNvbi5zY2hlbWEudmlzaXRKc29uU2NoZW1hKGZsYXR0ZW5lZFNjaGVtYSwgdmlzaXRvcik7XG5cbiAgLy8gU29ydCBieSBwb3NpdGlvbmFsLlxuICByZXR1cm4gb3B0aW9ucy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEucG9zaXRpb25hbCkge1xuICAgICAgaWYgKGIucG9zaXRpb25hbCkge1xuICAgICAgICByZXR1cm4gYS5wb3NpdGlvbmFsIC0gYi5wb3NpdGlvbmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChiLnBvc2l0aW9uYWwpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==