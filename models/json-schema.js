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
const jsonSchemaTraverse = require("json-schema-traverse");
function convertSchemaToOptions(schema) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = yield getOptions(schema);
        return options;
    });
}
exports.convertSchemaToOptions = convertSchemaToOptions;
function getOptions(schemaText, onlyRootProperties = true) {
    // TODO: refactor promise to an observable then use `.toPromise()`
    return new Promise((resolve, reject) => {
        const fullSchema = core_1.parseJson(schemaText);
        const traverseOptions = {};
        const options = [];
        function postCallback(schema, jsonPointer, rootSchema, parentJsonPointer, parentKeyword, parentSchema, property) {
            if (parentKeyword === 'properties') {
                let includeOption = true;
                if (onlyRootProperties && isPropertyNested(jsonPointer)) {
                    includeOption = false;
                }
                const description = typeof schema.description == 'string' ? schema.description : '';
                const type = typeof schema.type == 'string' ? schema.type : '';
                let defaultValue = undefined;
                if (schema.default !== null) {
                    if (typeof schema.default !== 'object') {
                        defaultValue = schema.default;
                    }
                }
                let $default = undefined;
                if (schema.$default !== null && core_1.JsonValue.isJsonObject(schema.$default)) {
                    $default = schema.$default;
                }
                let required = false;
                if (typeof schema.required === 'boolean') {
                    required = schema.required;
                }
                let aliases = undefined;
                if (typeof schema.aliases === 'object' && Array.isArray(schema.aliases)) {
                    aliases = schema.aliases;
                }
                let format = undefined;
                if (typeof schema.format === 'string') {
                    format = schema.format;
                }
                let hidden = false;
                if (typeof schema.hidden === 'boolean') {
                    hidden = schema.hidden;
                }
                const option = {
                    name: property,
                    // ...schema,
                    description,
                    type,
                    default: defaultValue,
                    $default,
                    required,
                    aliases,
                    format,
                    hidden,
                };
                if (includeOption) {
                    options.push(option);
                }
            }
            else if (schema === fullSchema) {
                resolve(options);
            }
        }
        const callbacks = { post: postCallback };
        jsonSchemaTraverse(fullSchema, traverseOptions, callbacks);
    });
}
function isPropertyNested(jsonPath) {
    return jsonPath.split('/')
        .filter(part => part == 'properties' || part == 'items')
        .length > 1;
}
function parseSchema(schema) {
    const parsedSchema = core_1.parseJson(schema);
    if (parsedSchema === null || !core_1.JsonValue.isJsonObject(parsedSchema)) {
        return null;
    }
    return parsedSchema;
}
exports.parseSchema = parseSchema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXdFO0FBQ3hFLDJEQUEyRDtBQUczRCxnQ0FBNkMsTUFBYzs7UUFDekQsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBSkQsd0RBSUM7QUFFRCxvQkFBb0IsVUFBa0IsRUFBRSxrQkFBa0IsR0FBRyxJQUFJO0lBQy9ELGtFQUFrRTtJQUNsRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixzQkFBc0IsTUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsVUFBa0IsRUFDbEIsaUJBQXlCLEVBQ3pCLGFBQXFCLEVBQ3JCLFlBQW9CLEVBQ3BCLFFBQWdCO1lBQ3BDLElBQUksYUFBYSxLQUFLLFlBQVksRUFBRTtnQkFDbEMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUN6QixJQUFJLGtCQUFrQixJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUN2RCxhQUFhLEdBQUcsS0FBSyxDQUFDO2lCQUN2QjtnQkFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLE1BQU0sSUFBSSxHQUFHLE9BQU8sTUFBTSxD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KiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgSnNvblZhbHVlLCBwYXJzZUpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBqc29uU2NoZW1hVHJhdmVyc2UgZnJvbSAnanNvbi1zY2hlbWEtdHJhdmVyc2UnO1xuaW1wb3J0IHsgT3B0aW9uLCBPcHRpb25TbWFydERlZmF1bHQgfSBmcm9tICcuL2NvbW1hbmQnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29udmVydFNjaGVtYVRvT3B0aW9ucyhzY2hlbWE6IHN0cmluZyk6IFByb21pc2U8T3B0aW9uW10+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IGdldE9wdGlvbnMoc2NoZW1hKTtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gZ2V0T3B0aW9ucyhzY2hlbWFUZXh0OiBzdHJpbmcsIG9ubHlSb290UHJvcGVydGllcyA9IHRydWUpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gIC8vIFRPRE86IHJlZmFjdG9yIHByb21pc2UgdG8gYW4gb2JzZXJ2YWJsZSB0aGVuIHVzZSBgLnRvUHJvbWlzZSgpYFxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGZ1bGxTY2hlbWEgPSBwYXJzZUpzb24oc2NoZW1hVGV4dCk7XG4gICAgY29uc3QgdHJhdmVyc2VPcHRpb25zID0ge307XG4gICAgY29uc3Qgb3B0aW9uczogT3B0aW9uW10gPSBbXTtcbiAgICBmdW5jdGlvbiBwb3N0Q2FsbGJhY2soc2NoZW1hOiBKc29uT2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uUG9pbnRlcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb290U2NoZW1hOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEpzb25Qb2ludGVyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEtleXdvcmQ6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50U2NoZW1hOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBzdHJpbmcpIHtcbiAgICAgIGlmIChwYXJlbnRLZXl3b3JkID09PSAncHJvcGVydGllcycpIHtcbiAgICAgICAgbGV0IGluY2x1ZGVPcHRpb24gPSB0cnVlO1xuICAgICAgICBpZiAob25seVJvb3RQcm9wZXJ0aWVzICYmIGlzUHJvcGVydHlOZXN0ZWQoanNvblBvaW50ZXIpKSB7XG4gICAgICAgICAgaW5jbHVkZU9wdGlvbiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gdHlwZW9mIHNjaGVtYS5kZXNjcmlwdGlvbiA9PSAnc3RyaW5nJyA/IHNjaGVtYS5kZXNjcmlwdGlvbiA6ICcnO1xuICAgICAgICBjb25zdCB0eXBlID0gdHlwZW9mIHNjaGVtYS50eXBlID09ICdzdHJpbmcnID8gc2NoZW1hLnR5cGUgOiAnJztcbiAgICAgICAgbGV0IGRlZmF1bHRWYWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHNjaGVtYS5kZWZhdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuZGVmYXVsdCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZSA9IHNjaGVtYS5kZWZhdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgJGRlZmF1bHQ6IE9wdGlvblNtYXJ0RGVmYXVsdCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHNjaGVtYS4kZGVmYXVsdCAhPT0gbnVsbCAmJiBKc29uVmFsdWUuaXNKc29uT2JqZWN0KHNjaGVtYS4kZGVmYXVsdCkpIHtcbiAgICAgICAgICAkZGVmYXVsdCA9IDxPcHRpb25TbWFydERlZmF1bHQ+IHNjaGVtYS4kZGVmYXVsdDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmVxdWlyZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEucmVxdWlyZWQgPT09ICdib29sZWFuJykge1xuICAgICAgICAgIHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuYWxpYXNlcyA9PT0gJ29iamVjdCcgJiYgQXJyYXkuaXNBcnJheShzY2hlbWEuYWxpYXNlcykpIHtcbiAgICAgICAgICBhbGlhc2VzID0gPHN0cmluZ1tdPiBzY2hlbWEuYWxpYXNlcztcbiAgICAgICAgfVxuICAgICAgICBsZXQgZm9ybWF0OiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0eXBlb2Ygc2NoZW1hLmZvcm1hdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBmb3JtYXQgPSBzY2hlbWEuZm9ybWF0O1xuICAgICAgICB9XG4gICAgICAgIGxldCBoaWRkZW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuaGlkZGVuID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICBoaWRkZW4gPSBzY2hlbWEuaGlkZGVuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uOiBPcHRpb24gPSB7XG4gICAgICAgICAgbmFtZTogcHJvcGVydHksXG4gICAgICAgICAgLy8gLi4uc2NoZW1hLFxuXG4gICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsdWUsXG4gICAgICAgICAgJGRlZmF1bHQsXG4gICAgICAgICAgcmVxdWlyZWQsXG4gICAgICAgICAgYWxpYXNlcyxcbiAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgaGlkZGVuLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbmNsdWRlT3B0aW9uKSB7XG4gICAgICAgICAgb3B0aW9ucy5wdXNoKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc2NoZW1hID09PSBmdWxsU2NoZW1hKSB7XG4gICAgICAgIHJlc29sdmUob3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY2FsbGJhY2tzID0geyBwb3N0OiBwb3N0Q2FsbGJhY2sgfTtcblxuICAgIGpzb25TY2hlbWFUcmF2ZXJzZSg8b2JqZWN0PiBmdWxsU2NoZW1hLCB0cmF2ZXJzZU9wdGlvbnMsIGNhbGxiYWNrcyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5TmVzdGVkKGpzb25QYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGpzb25QYXRoLnNwbGl0KCcvJylcbiAgICAuZmlsdGVyKHBhcnQgPT4gcGFydCA9PSAncHJvcGVydGllcycgfHwgcGFydCA9PSAnaXRlbXMnKVxuICAgIC5sZW5ndGggPiAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTY2hlbWEoc2NoZW1hOiBzdHJpbmcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGNvbnN0IHBhcnNlZFNjaGVtYSA9IHBhcnNlSnNvbihzY2hlbWEpO1xuICBpZiAocGFyc2VkU2NoZW1hID09PSBudWxsIHx8ICFKc29uVmFsdWUuaXNKc29uT2JqZWN0KHBhcnNlZFNjaGVtYSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBwYXJzZWRTY2hlbWE7XG59XG4iXX0=