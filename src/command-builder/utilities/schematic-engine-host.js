"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicEngineHost = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const fs_1 = require("fs");
const jsonc_parser_1 = require("jsonc-parser");
const module_1 = require("module");
const path_1 = require("path");
const vm_1 = require("vm");
const error_1 = require("../../utilities/error");
/**
 * Environment variable to control schematic package redirection
 */
const schematicRedirectVariable = (_a = process.env['NG_SCHEMATIC_REDIRECT']) === null || _a === void 0 ? void 0 : _a.toLowerCase();
function shouldWrapSchematic(schematicFile, schematicEncapsulation) {
    // Check environment variable if present
    switch (schematicRedirectVariable) {
        case '0':
        case 'false':
        case 'off':
        case 'none':
            return false;
        case 'all':
            return true;
    }
    const normalizedSchematicFile = schematicFile.replace(/\\/g, '/');
    // Never wrap the internal update schematic when executed directly
    // It communicates with the update command via `global`
    // But we still want to redirect schematics located in `@angular/cli/node_modules`.
    if (normalizedSchematicFile.includes('node_modules/@angular/cli/') &&
        !normalizedSchematicFile.includes('node_modules/@angular/cli/node_modules/')) {
        return false;
    }
    // Check for first-party Angular schematic packages
    // Angular schematics are safe to use in the wrapped VM context
    if (/\/node_modules\/@(?:angular|schematics|nguniversal)\//.test(normalizedSchematicFile)) {
        return true;
    }
    // Otherwise use the value of the schematic collection's encapsulation option (current default of false)
    return schematicEncapsulation;
}
class SchematicEngineHost extends tools_1.NodeModulesEngineHost {
    _resolveReferenceString(refString, parentPath, collectionDescription) {
        const [path, name] = refString.split('#', 2);
        // Mimic behavior of ExportStringRef class used in default behavior
        const fullPath = path[0] === '.' ? (0, path_1.resolve)(parentPath !== null && parentPath !== void 0 ? parentPath : process.cwd(), path) : path;
        const referenceRequire = (0, module_1.createRequire)(__filename);
        const schematicFile = referenceRequire.resolve(fullPath, { paths: [parentPath] });
        if (shouldWrapSchematic(schematicFile, !!(collectionDescription === null || collectionDescription === void 0 ? void 0 : collectionDescription.encapsulation))) {
            const schematicPath = (0, path_1.dirname)(schematicFile);
            const moduleCache = new Map();
            const factoryInitializer = wrap(schematicFile, schematicPath, moduleCache, name || 'default');
            const factory = factoryInitializer();
            if (!factory || typeof factory !== 'function') {
                return null;
            }
            return { ref: factory, path: schematicPath };
        }
        // All other schematics use default behavior
        return super._resolveReferenceString(refString, parentPath, collectionDescription);
    }
}
exports.SchematicEngineHost = SchematicEngineHost;
/**
 * Minimal shim modules for legacy deep imports of `@schematics/angular`
 */
const legacyModules = {
    '@schematics/angular/utility/config': {
        getWorkspace(host) {
            const path = '/.angular.json';
            const data = host.read(path);
            if (!data) {
                throw new schematics_1.SchematicsException(`Could not find (${path})`);
            }
            return (0, jsonc_parser_1.parse)(data.toString(), [], { allowTrailingComma: true });
        },
    },
    '@schematics/angular/utility/project': {
        buildDefaultPath(project) {
            const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;
            return `${root}${project.projectType === 'application' ? 'app' : 'lib'}`;
        },
    },
};
/**
 * Wrap a JavaScript file in a VM context to allow specific Angular dependencies to be redirected.
 * This VM setup is ONLY intended to redirect dependencies.
 *
 * @param schematicFile A JavaScript schematic file path that should be wrapped.
 * @param schematicDirectory A directory that will be used as the location of the JavaScript file.
 * @param moduleCache A map to use for caching repeat module usage and proper `instanceof` support.
 * @param exportName An optional name of a specific export to return. Otherwise, return all exports.
 */
function wrap(schematicFile, schematicDirectory, moduleCache, exportName) {
    const hostRequire = (0, module_1.createRequire)(__filename);
    const schematicRequire = (0, module_1.createRequire)(schematicFile);
    const customRequire = function (id) {
        if (legacyModules[id]) {
            // Provide compatibility modules for older versions of @angular/cdk
            return legacyModules[id];
        }
        else if (id.startsWith('schematics:')) {
            // Schematics built-in modules use the `schematics` scheme (similar to the Node.js `node` scheme)
            const builtinId = id.slice(11);
            const builtinModule = loadBuiltinModule(builtinId);
            if (!builtinModule) {
                throw new Error(`Unknown schematics built-in module '${id}' requested from schematic '${schematicFile}'`);
            }
            return builtinModule;
        }
        else if (id.startsWith('@angular-devkit/') || id.startsWith('@schematics/')) {
            // Files should not redirect `@angular/core` and instead use the direct
            // dependency if available. This allows old major version migrations to continue to function
            // even though the latest major version may have breaking changes in `@angular/core`.
            if (id.startsWith('@angular-devkit/core')) {
                try {
                    return schematicRequire(id);
                }
                catch (e) {
                    (0, error_1.assertIsError)(e);
                    if (e.code !== 'MODULE_NOT_FOUND') {
                        throw e;
                    }
                }
            }
            // Resolve from inside the `@angular/cli` project
            return hostRequire(id);
        }
        else if (id.startsWith('.') || id.startsWith('@angular/cdk')) {
            // Wrap relative files inside the schematic collection
            // Also wrap `@angular/cdk`, it contains helper utilities that import core schematic packages
            // Resolve from the original file
            const modulePath = schematicRequire.resolve(id);
            // Use cached module if available
            const cachedModule = moduleCache.get(modulePath);
            if (cachedModule) {
                return cachedModule;
            }
            // Do not wrap vendored third-party packages or JSON files
            if (!/[/\\]node_modules[/\\]@schematics[/\\]angular[/\\]third_party[/\\]/.test(modulePath) &&
                !modulePath.endsWith('.json')) {
                // Wrap module and save in cache
                const wrappedModule = wrap(modulePath, (0, path_1.dirname)(modulePath), moduleCache)();
                moduleCache.set(modulePath, wrappedModule);
                return wrappedModule;
            }
        }
        // All others are required directly from the original file
        return schematicRequire(id);
    };
    // Setup a wrapper function to capture the module's exports
    const schematicCode = (0, fs_1.readFileSync)(schematicFile, 'utf8');
    // `module` is required due to @angular/localize ng-add being in UMD format
    const headerCode = '(function() {\nvar exports = {};\nvar module = { exports };\n';
    const footerCode = exportName
        ? `\nreturn module.exports['${exportName}'];});`
        : '\nreturn module.exports;});';
    const script = new vm_1.Script(headerCode + schematicCode + footerCode, {
        filename: schematicFile,
        lineOffset: 3,
    });
    const context = {
        __dirname: schematicDirectory,
        __filename: schematicFile,
        Buffer,
        console,
        process,
        get global() {
            return this;
        },
        require: customRequire,
    };
    const exportsFactory = script.runInNewContext(context);
    return exportsFactory;
}
function loadBuiltinModule(id) {
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7QUFFSCwyREFBb0Y7QUFDcEYsNERBQW1HO0FBQ25HLDJCQUFrQztBQUNsQywrQ0FBa0Q7QUFDbEQsbUNBQXVDO0FBQ3ZDLCtCQUF3QztBQUN4QywyQkFBNEI7QUFDNUIsaURBQXNEO0FBRXREOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUIsR0FBRyxNQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsMENBQUUsV0FBVyxFQUFFLENBQUM7QUFFdEYsU0FBUyxtQkFBbUIsQ0FBQyxhQUFxQixFQUFFLHNCQUErQjtJQUNqRix3Q0FBd0M7SUFDeEMsUUFBUSx5QkFBeUIsRUFBRTtRQUNqQyxLQUFLLEdBQUcsQ0FBQztRQUNULEtBQUssT0FBTyxDQUFDO1FBQ2IsS0FBSyxLQUFLLENBQUM7UUFDWCxLQUFLLE1BQU07WUFDVCxPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssS0FBSztZQUNSLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFFRCxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2xFLGtFQUFrRTtJQUNsRSx1REFBdUQ7SUFDdkQsbUZBQW1GO0lBQ25GLElBQ0UsdUJBQXVCLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO1FBQzlELENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLEVBQzVFO1FBQ0EsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELG1EQUFtRDtJQUNuRCwrREFBK0Q7SUFDL0QsSUFBSSx1REFBdUQs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QzNFLE1BQU0sVUFBVSxHQUFHLCtEQUErRCxDQUFDO0lBQ25GLE1BQU0sVUFBVSxHQUFHLFVBQVU7UUFDM0IsQ0FBQyxDQUFDLDRCQUE0QixVQUFVLFFBQVE7UUFDaEQsQ0FBQyxDQUFDLDZCQUE2QixDQUFDO0lBRWxDLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBTSxDQUFDLFVBQVUsR0FBRyxhQUFhLEdBQUcsVUFBVSxFQUFFO1FBQ2pFLFFBQVEsRUFBRSxhQUFhO1FBQ3ZCLFVBQVUsRUFBRSxDQUFDO0tBQ2QsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQUc7UUFDZCxTQUFTLEVBQUUsa0JBQWtCO1FBQzdCLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLE1BQU07UUFDTixPQUFPO1FBQ1AsT0FBTztRQUNQLElBQUksTUFBTTtZQUNSLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sRUFBRSxhQUFhO0tBQ3ZCLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXZELE9BQU8sY0FBYyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEVBQVU7SUFDbkMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlRmFjdG9yeSwgU2NoZW1hdGljc0V4Y2VwdGlvbiwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VKc29uIH0gZnJvbSAnanNvbmMtcGFyc2VyJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2NyaXB0IH0gZnJvbSAndm0nO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9lcnJvcic7XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdG8gY29udHJvbCBzY2hlbWF0aWMgcGFja2FnZSByZWRpcmVjdGlvblxuICovXG5jb25zdCBzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlID0gcHJvY2Vzcy5lbnZbJ05HX1NDSEVNQVRJQ19SRURJUkVDVCddPy50b0xvd2VyQ2FzZSgpO1xuXG5mdW5jdGlvbiBzaG91bGRXcmFwU2NoZW1hdGljKHNjaGVtYXRpY0ZpbGU6IHN0cmluZywgc2NoZW1hdGljRW5jYXBzdWxhdGlvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAvLyBDaGVjayBlbnZpcm9ubWVudCB2YXJpYWJsZSBpZiBwcmVzZW50XG4gIHN3aXRjaCAoc2NoZW1hdGljUmVkaXJlY3RWYXJpYWJsZSkge1xuICAgIGNhc2UgJzAnOlxuICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICBjYXNlICdvZmYnOlxuICAgIGNhc2UgJ25vbmUnOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgJ2FsbCc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlID0gc2NoZW1hdGljRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vIE5ldmVyIHdyYXAgdGhlIGludGVybmFsIHVwZGF0ZSBzY2hlbWF0aWMgd2hlbiBleGVjdXRlZCBkaXJlY3RseVxuICAvLyBJdCBjb21tdW5pY2F0ZXMgd2l0aCB0aGUgdXBkYXRlIGNvbW1hbmQgdmlhIGBnbG9iYWxgXG4gIC8vIEJ1dCB3ZSBzdGlsbCB3YW50IHRvIHJlZGlyZWN0IHNjaGVtYXRpY3MgbG9jYXRlZCBpbiBgQGFuZ3VsYXIvY2xpL25vZGVfbW9kdWxlc2AuXG4gIGlmIChcbiAgICBub3JtYWxpemVkU2NoZW1hdGljRmlsZS5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS8nKSAmJlxuICAgICFub3JtYWxpemVkU2NoZW1hdGljRmlsZS5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS9ub2RlX21vZHVsZXMvJylcbiAgKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIGZpcnN0LXBhcnR5IEFuZ3VsYXIgc2NoZW1hdGljIHBhY2thZ2VzXG4gIC8vIEFuZ3VsYXIgc2NoZW1hdGljcyBhcmUgc2FmZSB0byB1c2UgaW4gdGhlIHdyYXBwZWQgVk0gY29udGV4dFxuICBpZiAoL1xcL25vZGVfbW9kdWxlc1xcL0AoPzphbmd1bGFyfHNjaGVtYXRpY3N8bmd1bml2ZXJzYWwpXFwvLy50ZXN0KG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gT3RoZXJ3aXNlIHVzZSB0aGUgdmFsdWUgb2YgdGhlIHNjaGVtYXRpYyBjb2xsZWN0aW9uJ3MgZW5jYXBzdWxhdGlvbiBvcHRpb24gKGN1cnJlbnQgZGVmYXVsdCBvZiBmYWxzZSlcbiAgcmV0dXJuIHNjaGVtYXRpY0VuY2Fwc3VsYXRpb247XG59XG5cbmV4cG9ydCBjbGFzcyBTY2hlbWF0aWNFbmdpbmVIb3N0IGV4dGVuZHMgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IHtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIF9yZXNvbHZlUmVmZXJlbmNlU3RyaW5nKFxuICAgIHJlZlN0cmluZzogc3RyaW5nLFxuICAgIHBhcmVudFBhdGg6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uRGVzY3JpcHRpb24/OiBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2MsXG4gICkge1xuICAgIGNvbnN0IFtwYXRoLCBuYW1lXSA9IHJlZlN0cmluZy5zcGxpdCgnIycsIDIpO1xuICAgIC8vIE1pbWljIGJlaGF2aW9yIG9mIEV4cG9ydFN0cmluZ1JlZiBjbGFzcyB1c2VkIGluIGRlZmF1bHQgYmVoYXZpb3JcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGhbMF0gPT09ICcuJyA/IHJlc29sdmUocGFyZW50UGF0aCA/PyBwcm9jZXNzLmN3ZCgpLCBwYXRoKSA6IHBhdGg7XG5cbiAgICBjb25zdCByZWZlcmVuY2VSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShfX2ZpbGVuYW1lKTtcbiAgICBjb25zdCBzY2hlbWF0aWNGaWxlID0gcmVmZXJlbmNlUmVxdWlyZS5yZXNvbHZlKGZ1bGxQYXRoLCB7IHBhdGhzOiBbcGFyZW50UGF0aF0gfSk7XG5cbiAgICBpZiAoc2hvdWxkV3JhcFNjaGVtYXRpYyhzY2hlbWF0aWNGaWxlLCAhIWNvbGxlY3Rpb25EZXNjcmlwdGlvbj8uZW5jYXBzdWxhdGlvbikpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY1BhdGggPSBkaXJuYW1lKHNjaGVtYXRpY0ZpbGUpO1xuXG4gICAgICBjb25zdCBtb2R1bGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpO1xuICAgICAgY29uc3QgZmFjdG9yeUluaXRpYWxpemVyID0gd3JhcChcbiAgICAgICAgc2NoZW1hdGljRmlsZSxcbiAgICAgICAgc2NoZW1hdGljUGF0aCxcbiAgICAgICAgbW9kdWxlQ2FjaGUsXG4gICAgICAgIG5hbWUgfHwgJ2RlZmF1bHQnLFxuICAgICAgKSBhcyAoKSA9PiBSdWxlRmFjdG9yeTx7fT47XG5cbiAgICAgIGNvbnN0IGZhY3RvcnkgPSBmYWN0b3J5SW5pdGlhbGl6ZXIoKTtcbiAgICAgIGlmICghZmFjdG9yeSB8fCB0eXBlb2YgZmFjdG9yeSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgcmVmOiBmYWN0b3J5LCBwYXRoOiBzY2hlbWF0aWNQYXRoIH07XG4gICAgfVxuXG4gICAgLy8gQWxsIG90aGVyIHNjaGVtYXRpY3MgdXNlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICByZXR1cm4gc3VwZXIuX3Jlc29sdmVSZWZlcmVuY2VTdHJpbmcocmVmU3RyaW5nLCBwYXJlbnRQYXRoLCBjb2xsZWN0aW9uRGVzY3JpcHRpb24pO1xuICB9XG59XG5cbi8qKlxuICogTWluaW1hbCBzaGltIG1vZHVsZXMgZm9yIGxlZ2FjeSBkZWVwIGltcG9ydHMgb2YgYEBzY2hlbWF0aWNzL2FuZ3VsYXJgXG4gKi9cbmNvbnN0IGxlZ2FjeU1vZHVsZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2NvbmZpZyc6IHtcbiAgICBnZXRXb3Jrc3BhY2UoaG9zdDogVHJlZSkge1xuICAgICAgY29uc3QgcGF0aCA9ICcvLmFuZ3VsYXIuanNvbic7XG4gICAgICBjb25zdCBkYXRhID0gaG9zdC5yZWFkKHBhdGgpO1xuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCAoJHtwYXRofSlgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcnNlSnNvbihkYXRhLnRvU3RyaW5nKCksIFtdLCB7IGFsbG93VHJhaWxpbmdDb21tYTogdHJ1ZSB9KTtcbiAgICB9LFxuICB9LFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3Byb2plY3QnOiB7XG4gICAgYnVpbGREZWZhdWx0UGF0aChwcm9qZWN0OiB7IHNvdXJjZVJvb3Q/OiBzdHJpbmc7IHJvb3Q6IHN0cmluZzsgcHJvamVjdFR5cGU6IHN0cmluZyB9KTogc3RyaW5nIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBwcm9qZWN0LnNvdXJjZVJvb3QgPyBgLyR7cHJvamVjdC5zb3VyY2VSb290fS9gIDogYC8ke3Byb2plY3Qucm9vdH0vc3JjL2A7XG5cbiAgICAgIHJldHVybiBgJHtyb290fSR7cHJvamVjdC5wcm9qZWN0VHlwZSA9PT0gJ2FwcGxpY2F0aW9uJyA/ICdhcHAnIDogJ2xpYid9YDtcbiAgICB9LFxuICB9LFxufTtcblxuLyoqXG4gKiBXcmFwIGEgSmF2YVNjcmlwdCBmaWxlIGluIGEgVk0gY29udGV4dCB0byBhbGxvdyBzcGVjaWZpYyBBbmd1bGFyIGRlcGVuZGVuY2llcyB0byBiZSByZWRpcmVjdGVkLlxuICogVGhpcyBWTSBzZXR1cCBpcyBPTkxZIGludGVuZGVkIHRvIHJlZGlyZWN0IGRlcGVuZGVuY2llcy5cbiAqXG4gKiBAcGFyYW0gc2NoZW1hdGljRmlsZSBBIEphdmFTY3JpcHQgc2NoZW1hdGljIGZpbGUgcGF0aCB0aGF0IHNob3VsZCBiZSB3cmFwcGVkLlxuICogQHBhcmFtIHNjaGVtYXRpY0RpcmVjdG9yeSBBIGRpcmVjdG9yeSB0aGF0IHdpbGwgYmUgdXNlZCBhcyB0aGUgbG9jYXRpb24gb2YgdGhlIEphdmFTY3JpcHQgZmlsZS5cbiAqIEBwYXJhbSBtb2R1bGVDYWNoZSBBIG1hcCB0byB1c2UgZm9yIGNhY2hpbmcgcmVwZWF0IG1vZHVsZSB1c2FnZSBhbmQgcHJvcGVyIGBpbnN0YW5jZW9mYCBzdXBwb3J0LlxuICogQHBhcmFtIGV4cG9ydE5hbWUgQW4gb3B0aW9uYWwgbmFtZSBvZiBhIHNwZWNpZmljIGV4cG9ydCB0byByZXR1cm4uIE90aGVyd2lzZSwgcmV0dXJuIGFsbCBleHBvcnRzLlxuICovXG5mdW5jdGlvbiB3cmFwKFxuICBzY2hlbWF0aWNGaWxlOiBzdHJpbmcsXG4gIHNjaGVtYXRpY0RpcmVjdG9yeTogc3RyaW5nLFxuICBtb2R1bGVDYWNoZTogTWFwPHN0cmluZywgdW5rbm93bj4sXG4gIGV4cG9ydE5hbWU/OiBzdHJpbmcsXG4pOiAoKSA9PiB1bmtub3duIHtcbiAgY29uc3QgaG9zdFJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKF9fZmlsZW5hbWUpO1xuICBjb25zdCBzY2hlbWF0aWNSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShzY2hlbWF0aWNGaWxlKTtcblxuICBjb25zdCBjdXN0b21SZXF1aXJlID0gZnVuY3Rpb24gKGlkOiBzdHJpbmcpIHtcbiAgICBpZiAobGVnYWN5TW9kdWxlc1tpZF0pIHtcbiAgICAgIC8vIFByb3ZpZGUgY29tcGF0aWJpbGl0eSBtb2R1bGVzIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBAYW5ndWxhci9jZGtcbiAgICAgIHJldHVybiBsZWdhY3lNb2R1bGVzW2lkXTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJ3NjaGVtYXRpY3M6JykpIHtcbiAgICAgIC8vIFNjaGVtYXRpY3MgYnVpbHQtaW4gbW9kdWxlcyB1c2UgdGhlIGBzY2hlbWF0aWNzYCBzY2hlbWUgKHNpbWlsYXIgdG8gdGhlIE5vZGUuanMgYG5vZGVgIHNjaGVtZSlcbiAgICAgIGNvbnN0IGJ1aWx0aW5JZCA9IGlkLnNsaWNlKDExKTtcbiAgICAgIGNvbnN0IGJ1aWx0aW5Nb2R1bGUgPSBsb2FkQnVpbHRpbk1vZHVsZShidWlsdGluSWQpO1xuICAgICAgaWYgKCFidWlsdGluTW9kdWxlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5rbm93biBzY2hlbWF0aWNzIGJ1aWx0LWluIG1vZHVsZSAnJHtpZH0nIHJlcXVlc3RlZCBmcm9tIHNjaGVtYXRpYyAnJHtzY2hlbWF0aWNGaWxlfSdgLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYnVpbHRpbk1vZHVsZTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLWRldmtpdC8nKSB8fCBpZC5zdGFydHNXaXRoKCdAc2NoZW1hdGljcy8nKSkge1xuICAgICAgLy8gRmlsZXMgc2hvdWxkIG5vdCByZWRpcmVjdCBgQGFuZ3VsYXIvY29yZWAgYW5kIGluc3RlYWQgdXNlIHRoZSBkaXJlY3RcbiAgICAgIC8vIGRlcGVuZGVuY3kgaWYgYXZhaWxhYmxlLiBUaGlzIGFsbG93cyBvbGQgbWFqb3IgdmVyc2lvbiBtaWdyYXRpb25zIHRvIGNvbnRpbnVlIHRvIGZ1bmN0aW9uXG4gICAgICAvLyBldmVuIHRob3VnaCB0aGUgbGF0ZXN0IG1ham9yIHZlcnNpb24gbWF5IGhhdmUgYnJlYWtpbmcgY2hhbmdlcyBpbiBgQGFuZ3VsYXIvY29yZWAuXG4gICAgICBpZiAoaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXItZGV2a2l0L2NvcmUnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBzY2hlbWF0aWNSZXF1aXJlKGlkKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGFzc2VydElzRXJyb3IoZSk7XG4gICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIGZyb20gaW5zaWRlIHRoZSBgQGFuZ3VsYXIvY2xpYCBwcm9qZWN0XG4gICAgICByZXR1cm4gaG9zdFJlcXVpcmUoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQuc3RhcnRzV2l0aCgnLicpIHx8IGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyL2NkaycpKSB7XG4gICAgICAvLyBXcmFwIHJlbGF0aXZlIGZpbGVzIGluc2lkZSB0aGUgc2NoZW1hdGljIGNvbGxlY3Rpb25cbiAgICAgIC8vIEFsc28gd3JhcCBgQGFuZ3VsYXIvY2RrYCwgaXQgY29udGFpbnMgaGVscGVyIHV0aWxpdGllcyB0aGF0IGltcG9ydCBjb3JlIHNjaGVtYXRpYyBwYWNrYWdlc1xuXG4gICAgICAvLyBSZXNvbHZlIGZyb20gdGhlIG9yaWdpbmFsIGZpbGVcbiAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBzY2hlbWF0aWNSZXF1aXJlLnJlc29sdmUoaWQpO1xuXG4gICAgICAvLyBVc2UgY2FjaGVkIG1vZHVsZSBpZiBhdmFpbGFibGVcbiAgICAgIGNvbnN0IGNhY2hlZE1vZHVsZSA9IG1vZHVsZUNhY2hlLmdldChtb2R1bGVQYXRoKTtcbiAgICAgIGlmIChjYWNoZWRNb2R1bGUpIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlZE1vZHVsZTtcbiAgICAgIH1cblxuICAgICAgLy8gRG8gbm90IHdyYXAgdmVuZG9yZWQgdGhpcmQtcGFydHkgcGFja2FnZXMgb3IgSlNPTiBmaWxlc1xuICAgICAgaWYgKFxuICAgICAgICAhL1svXFxcXF1ub2RlX21vZHVsZXNbL1xcXFxdQHNjaGVtYXRpY3NbL1xcXFxdYW5ndWxhclsvXFxcXF10aGlyZF9wYXJ0eVsvXFxcXF0vLnRlc3QobW9kdWxlUGF0aCkgJiZcbiAgICAgICAgIW1vZHVsZVBhdGguZW5kc1dpdGgoJy5qc29uJylcbiAgICAgICkge1xuICAgICAgICAvLyBXcmFwIG1vZHVsZSBhbmQgc2F2ZSBpbiBjYWNoZVxuICAgICAgICBjb25zdCB3cmFwcGVkTW9kdWxlID0gd3JhcChtb2R1bGVQYXRoLCBkaXJuYW1lKG1vZHVsZVBhdGgpLCBtb2R1bGVDYWNoZSkoKTtcbiAgICAgICAgbW9kdWxlQ2FjaGUuc2V0KG1vZHVsZVBhdGgsIHdyYXBwZWRNb2R1bGUpO1xuXG4gICAgICAgIHJldHVybiB3cmFwcGVkTW9kdWxlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCBvdGhlcnMgYXJlIHJlcXVpcmVkIGRpcmVjdGx5IGZyb20gdGhlIG9yaWdpbmFsIGZpbGVcbiAgICByZXR1cm4gc2NoZW1hdGljUmVxdWlyZShpZCk7XG4gIH07XG5cbiAgLy8gU2V0dXAgYSB3cmFwcGVyIGZ1bmN0aW9uIHRvIGNhcHR1cmUgdGhlIG1vZHVsZSdzIGV4cG9ydHNcbiAgY29uc3Qgc2NoZW1hdGljQ29kZSA9IHJlYWRGaWxlU3luYyhzY2hlbWF0aWNGaWxlLCAndXRmOCcpO1xuICAvLyBgbW9kdWxlYCBpcyByZXF1aXJlZCBkdWUgdG8gQGFuZ3VsYXIvbG9jYWxpemUgbmctYWRkIGJlaW5nIGluIFVNRCBmb3JtYXRcbiAgY29uc3QgaGVhZGVyQ29kZSA9ICcoZnVuY3Rpb24oKSB7XFxudmFyIGV4cG9ydHMgPSB7fTtcXG52YXIgbW9kdWxlID0geyBleHBvcnRzIH07XFxuJztcbiAgY29uc3QgZm9vdGVyQ29kZSA9IGV4cG9ydE5hbWVcbiAgICA/IGBcXG5yZXR1cm4gbW9kdWxlLmV4cG9ydHNbJyR7ZXhwb3J0TmFtZX0nXTt9KTtgXG4gICAgOiAnXFxucmV0dXJuIG1vZHVsZS5leHBvcnRzO30pOyc7XG5cbiAgY29uc3Qgc2NyaXB0ID0gbmV3IFNjcmlwdChoZWFkZXJDb2RlICsgc2NoZW1hdGljQ29kZSArIGZvb3RlckNvZGUsIHtcbiAgICBmaWxlbmFtZTogc2NoZW1hdGljRmlsZSxcbiAgICBsaW5lT2Zmc2V0OiAzLFxuICB9KTtcblxuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIF9fZGlybmFtZTogc2NoZW1hdGljRGlyZWN0b3J5LFxuICAgIF9fZmlsZW5hbWU6IHNjaGVtYXRpY0ZpbGUsXG4gICAgQnVmZmVyLFxuICAgIGNvbnNvbGUsXG4gICAgcHJvY2VzcyxcbiAgICBnZXQgZ2xvYmFsKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZXF1aXJlOiBjdXN0b21SZXF1aXJlLFxuICB9O1xuXG4gIGNvbnN0IGV4cG9ydHNGYWN0b3J5ID0gc2NyaXB0LnJ1bkluTmV3Q29udGV4dChjb250ZXh0KTtcblxuICByZXR1cm4gZXhwb3J0c0ZhY3Rvcnk7XG59XG5cbmZ1bmN0aW9uIGxvYWRCdWlsdGluTW9kdWxlKGlkOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiJdfQ==