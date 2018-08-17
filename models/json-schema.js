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
                if (schema.$default !== null && core_1.isJsonObject(schema.$default)) {
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
    if (parsedSchema === null || !core_1.isJsonObject(parsedSchema)) {
        return null;
    }
    return parsedSchema;
}
exports.parseSchema = parseSchema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1zY2hlbWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9qc29uLXNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQTJFO0FBQzNFLDJEQUEyRDtBQUczRCxnQ0FBNkMsTUFBYzs7UUFDekQsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUFBO0FBSkQsd0RBSUM7QUFFRCxvQkFBb0IsVUFBa0IsRUFBRSxrQkFBa0IsR0FBRyxJQUFJO0lBQy9ELGtFQUFrRTtJQUNsRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixzQkFBc0IsTUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsVUFBa0IsRUFDbEIsaUJBQXlCLEVBQ3pCLGFBQXFCLEVBQ3JCLFlBQW9CLEVBQ3BCLFFBQWdCO1lBQ3BDLElBQUksYUFBYSxLQUFLLFlBQVksRUFBRTtnQkFDbEMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUN6QixJQUFJLGtCQUFrQixJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUN2RCxhQUFhLEdBQUcsS0FBSyxDQUFDO2lCQUN2QjtnQkFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLE1BQU0sSUFBSSxHQUFHLE9BQU8sTUFBTSxD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aWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IEpzb25PYmplY3QsIGlzSnNvbk9iamVjdCwgcGFyc2VKc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMganNvblNjaGVtYVRyYXZlcnNlIGZyb20gJ2pzb24tc2NoZW1hLXRyYXZlcnNlJztcbmltcG9ydCB7IE9wdGlvbiwgT3B0aW9uU21hcnREZWZhdWx0IH0gZnJvbSAnLi9jb21tYW5kJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbnZlcnRTY2hlbWFUb09wdGlvbnMoc2NoZW1hOiBzdHJpbmcpOiBQcm9taXNlPE9wdGlvbltdPiB7XG4gIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBnZXRPcHRpb25zKHNjaGVtYSk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGdldE9wdGlvbnMoc2NoZW1hVGV4dDogc3RyaW5nLCBvbmx5Um9vdFByb3BlcnRpZXMgPSB0cnVlKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAvLyBUT0RPOiByZWZhY3RvciBwcm9taXNlIHRvIGFuIG9ic2VydmFibGUgdGhlbiB1c2UgYC50b1Byb21pc2UoKWBcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBmdWxsU2NoZW1hID0gcGFyc2VKc29uKHNjaGVtYVRleHQpO1xuICAgIGNvbnN0IHRyYXZlcnNlT3B0aW9ucyA9IHt9O1xuICAgIGNvbnN0IG9wdGlvbnM6IE9wdGlvbltdID0gW107XG4gICAgZnVuY3Rpb24gcG9zdENhbGxiYWNrKHNjaGVtYTogSnNvbk9iamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAganNvblBvaW50ZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9vdFNjaGVtYTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRKc29uUG9pbnRlcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRLZXl3b3JkOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFNjaGVtYTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogc3RyaW5nKSB7XG4gICAgICBpZiAocGFyZW50S2V5d29yZCA9PT0gJ3Byb3BlcnRpZXMnKSB7XG4gICAgICAgIGxldCBpbmNsdWRlT3B0aW9uID0gdHJ1ZTtcbiAgICAgICAgaWYgKG9ubHlSb290UHJvcGVydGllcyAmJiBpc1Byb3BlcnR5TmVzdGVkKGpzb25Qb2ludGVyKSkge1xuICAgICAgICAgIGluY2x1ZGVPcHRpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHR5cGVvZiBzY2hlbWEuZGVzY3JpcHRpb24gPT0gJ3N0cmluZycgPyBzY2hlbWEuZGVzY3JpcHRpb24gOiAnJztcbiAgICAgICAgY29uc3QgdHlwZSA9IHR5cGVvZiBzY2hlbWEudHlwZSA9PSAnc3RyaW5nJyA/IHNjaGVtYS50eXBlIDogJyc7XG4gICAgICAgIGxldCBkZWZhdWx0VmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzY2hlbWEuZGVmYXVsdCAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygc2NoZW1hLmRlZmF1bHQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBzY2hlbWEuZGVmYXVsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0ICRkZWZhdWx0OiBPcHRpb25TbWFydERlZmF1bHQgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzY2hlbWEuJGRlZmF1bHQgIT09IG51bGwgJiYgaXNKc29uT2JqZWN0KHNjaGVtYS4kZGVmYXVsdCkpIHtcbiAgICAgICAgICAkZGVmYXVsdCA9IDxPcHRpb25TbWFydERlZmF1bHQ+IHNjaGVtYS4kZGVmYXVsdDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmVxdWlyZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEucmVxdWlyZWQgPT09ICdib29sZWFuJykge1xuICAgICAgICAgIHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuYWxpYXNlcyA9PT0gJ29iamVjdCcgJiYgQXJyYXkuaXNBcnJheShzY2hlbWEuYWxpYXNlcykpIHtcbiAgICAgICAgICBhbGlhc2VzID0gPHN0cmluZ1tdPiBzY2hlbWEuYWxpYXNlcztcbiAgICAgICAgfVxuICAgICAgICBsZXQgZm9ybWF0OiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0eXBlb2Ygc2NoZW1hLmZvcm1hdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBmb3JtYXQgPSBzY2hlbWEuZm9ybWF0O1xuICAgICAgICB9XG4gICAgICAgIGxldCBoaWRkZW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuaGlkZGVuID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICBoaWRkZW4gPSBzY2hlbWEuaGlkZGVuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uOiBPcHRpb24gPSB7XG4gICAgICAgICAgbmFtZTogcHJvcGVydHksXG4gICAgICAgICAgLy8gLi4uc2NoZW1hLFxuXG4gICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsdWUsXG4gICAgICAgICAgJGRlZmF1bHQsXG4gICAgICAgICAgcmVxdWlyZWQsXG4gICAgICAgICAgYWxpYXNlcyxcbiAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgaGlkZGVuLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbmNsdWRlT3B0aW9uKSB7XG4gICAgICAgICAgb3B0aW9ucy5wdXNoKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc2NoZW1hID09PSBmdWxsU2NoZW1hKSB7XG4gICAgICAgIHJlc29sdmUob3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY2FsbGJhY2tzID0geyBwb3N0OiBwb3N0Q2FsbGJhY2sgfTtcblxuICAgIGpzb25TY2hlbWFUcmF2ZXJzZSg8b2JqZWN0PiBmdWxsU2NoZW1hLCB0cmF2ZXJzZU9wdGlvbnMsIGNhbGxiYWNrcyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5TmVzdGVkKGpzb25QYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGpzb25QYXRoLnNwbGl0KCcvJylcbiAgICAuZmlsdGVyKHBhcnQgPT4gcGFydCA9PSAncHJvcGVydGllcycgfHwgcGFydCA9PSAnaXRlbXMnKVxuICAgIC5sZW5ndGggPiAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTY2hlbWEoc2NoZW1hOiBzdHJpbmcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGNvbnN0IHBhcnNlZFNjaGVtYSA9IHBhcnNlSnNvbihzY2hlbWEpO1xuICBpZiAocGFyc2VkU2NoZW1hID09PSBudWxsIHx8ICFpc0pzb25PYmplY3QocGFyc2VkU2NoZW1hKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlZFNjaGVtYTtcbn1cbiJdfQ==