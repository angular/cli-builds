"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicEngineHost = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const tools_1 = require("@angular-devkit/schematics/tools");
const fs_1 = require("fs");
const jsonc_parser_1 = require("jsonc-parser");
const module_1 = __importDefault(require("module"));
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
        const schematicFile = require.resolve(fullPath, { paths: [parentPath] });
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
    const hostRequire = module_1.default.createRequire(__filename);
    const schematicRequire = module_1.default.createRequire(schematicFile);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7QUFFSCwyREFBb0Y7QUFDcEYsNERBQW1HO0FBQ25HLDJCQUFrQztBQUNsQywrQ0FBa0Q7QUFDbEQsb0RBQWdDO0FBQ2hDLCtCQUF3QztBQUN4QywyQkFBNEI7QUFDNUIsaURBQXNEO0FBRXREOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUIsR0FBRyxNQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsMENBQUUsV0FBVyxFQUFFLENBQUM7QUFFdEYsU0FBUyxtQkFBbUIsQ0FBQyxhQUFxQixFQUFFLHNCQUErQjtJQUNqRix3Q0FBd0M7SUFDeEMsUUFBUSx5QkFBeUIsRUFBRTtRQUNqQyxLQUFLLEdBQUcsQ0FBQztRQUNULEtBQUssT0FBTyxDQUFDO1FBQ2IsS0FBSyxLQUFLLENBQUM7UUFDWCxLQUFLLE1BQU07WUFDVCxPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssS0FBSztZQUNSLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFFRCxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2xFLGtFQUFrRTtJQUNsRSx1REFBdUQ7SUFDdkQsbUZBQW1GO0lBQ25GLElBQ0UsdUJBQXVCLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO1FBQzlELENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLEVBQzVFO1FBQ0EsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELG1EQUFtRDtJQUNuRCwrREFBK0Q7SUFDL0QsSUFBSSx1REFB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QUFVLEdBQUcsVUFBVTtRQUMzQixDQUFDLENBQUMsNEJBQTRCLFVBQVUsUUFBUTtRQUNoRCxDQUFDLENBQUMsNkJBQTZCLENBQUM7SUFFbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFNLENBQUMsVUFBVSxHQUFHLGFBQWEsR0FBRyxVQUFVLEVBQUU7UUFDakUsUUFBUSxFQUFFLGFBQWE7UUFDdkIsVUFBVSxFQUFFLENBQUM7S0FDZCxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRztRQUNkLFNBQVMsRUFBRSxrQkFBa0I7UUFDN0IsVUFBVSxFQUFFLGFBQWE7UUFDekIsTUFBTTtRQUNOLE9BQU87UUFDUCxPQUFPO1FBQ1AsSUFBSSxNQUFNO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxFQUFFLGFBQWE7S0FDdkIsQ0FBQztJQUVGLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdkQsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBVTtJQUNuQyxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGVGYWN0b3J5LCBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLCBOb2RlTW9kdWxlc0VuZ2luZUhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZUpzb24gfSBmcm9tICdqc29uYy1wYXJzZXInO1xuaW1wb3J0IG5vZGVNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNjcmlwdCB9IGZyb20gJ3ZtJztcbmltcG9ydCB7IGFzc2VydElzRXJyb3IgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZXJyb3InO1xuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHRvIGNvbnRyb2wgc2NoZW1hdGljIHBhY2thZ2UgcmVkaXJlY3Rpb25cbiAqL1xuY29uc3Qgc2NoZW1hdGljUmVkaXJlY3RWYXJpYWJsZSA9IHByb2Nlc3MuZW52WydOR19TQ0hFTUFUSUNfUkVESVJFQ1QnXT8udG9Mb3dlckNhc2UoKTtcblxuZnVuY3Rpb24gc2hvdWxkV3JhcFNjaGVtYXRpYyhzY2hlbWF0aWNGaWxlOiBzdHJpbmcsIHNjaGVtYXRpY0VuY2Fwc3VsYXRpb246IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGUgaWYgcHJlc2VudFxuICBzd2l0Y2ggKHNjaGVtYXRpY1JlZGlyZWN0VmFyaWFibGUpIHtcbiAgICBjYXNlICcwJzpcbiAgICBjYXNlICdmYWxzZSc6XG4gICAgY2FzZSAnb2ZmJzpcbiAgICBjYXNlICdub25lJzpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjYXNlICdhbGwnOlxuICAgICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkU2NoZW1hdGljRmlsZSA9IHNjaGVtYXRpY0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyBOZXZlciB3cmFwIHRoZSBpbnRlcm5hbCB1cGRhdGUgc2NoZW1hdGljIHdoZW4gZXhlY3V0ZWQgZGlyZWN0bHlcbiAgLy8gSXQgY29tbXVuaWNhdGVzIHdpdGggdGhlIHVwZGF0ZSBjb21tYW5kIHZpYSBgZ2xvYmFsYFxuICAvLyBCdXQgd2Ugc3RpbGwgd2FudCB0byByZWRpcmVjdCBzY2hlbWF0aWNzIGxvY2F0ZWQgaW4gYEBhbmd1bGFyL2NsaS9ub2RlX21vZHVsZXNgLlxuICBpZiAoXG4gICAgbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvJykgJiZcbiAgICAhbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbm9kZV9tb2R1bGVzLycpXG4gICkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGZvciBmaXJzdC1wYXJ0eSBBbmd1bGFyIHNjaGVtYXRpYyBwYWNrYWdlc1xuICAvLyBBbmd1bGFyIHNjaGVtYXRpY3MgYXJlIHNhZmUgdG8gdXNlIGluIHRoZSB3cmFwcGVkIFZNIGNvbnRleHRcbiAgaWYgKC9cXC9ub2RlX21vZHVsZXNcXC9AKD86YW5ndWxhcnxzY2hlbWF0aWNzfG5ndW5pdmVyc2FsKVxcLy8udGVzdChub3JtYWxpemVkU2NoZW1hdGljRmlsZSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIE90aGVyd2lzZSB1c2UgdGhlIHZhbHVlIG9mIHRoZSBzY2hlbWF0aWMgY29sbGVjdGlvbidzIGVuY2Fwc3VsYXRpb24gb3B0aW9uIChjdXJyZW50IGRlZmF1bHQgb2YgZmFsc2UpXG4gIHJldHVybiBzY2hlbWF0aWNFbmNhcHN1bGF0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgU2NoZW1hdGljRW5naW5lSG9zdCBleHRlbmRzIE5vZGVNb2R1bGVzRW5naW5lSG9zdCB7XG4gIHByb3RlY3RlZCBvdmVycmlkZSBfcmVzb2x2ZVJlZmVyZW5jZVN0cmluZyhcbiAgICByZWZTdHJpbmc6IHN0cmluZyxcbiAgICBwYXJlbnRQYXRoOiBzdHJpbmcsXG4gICAgY29sbGVjdGlvbkRlc2NyaXB0aW9uPzogRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLFxuICApIHtcbiAgICBjb25zdCBbcGF0aCwgbmFtZV0gPSByZWZTdHJpbmcuc3BsaXQoJyMnLCAyKTtcbiAgICAvLyBNaW1pYyBiZWhhdmlvciBvZiBFeHBvcnRTdHJpbmdSZWYgY2xhc3MgdXNlZCBpbiBkZWZhdWx0IGJlaGF2aW9yXG4gICAgY29uc3QgZnVsbFBhdGggPSBwYXRoWzBdID09PSAnLicgPyByZXNvbHZlKHBhcmVudFBhdGggPz8gcHJvY2Vzcy5jd2QoKSwgcGF0aCkgOiBwYXRoO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljRmlsZSA9IHJlcXVpcmUucmVzb2x2ZShmdWxsUGF0aCwgeyBwYXRoczogW3BhcmVudFBhdGhdIH0pO1xuXG4gICAgaWYgKHNob3VsZFdyYXBTY2hlbWF0aWMoc2NoZW1hdGljRmlsZSwgISFjb2xsZWN0aW9uRGVzY3JpcHRpb24/LmVuY2Fwc3VsYXRpb24pKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWNQYXRoID0gZGlybmFtZShzY2hlbWF0aWNGaWxlKTtcblxuICAgICAgY29uc3QgbW9kdWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgdW5rbm93bj4oKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlJbml0aWFsaXplciA9IHdyYXAoXG4gICAgICAgIHNjaGVtYXRpY0ZpbGUsXG4gICAgICAgIHNjaGVtYXRpY1BhdGgsXG4gICAgICAgIG1vZHVsZUNhY2hlLFxuICAgICAgICBuYW1lIHx8ICdkZWZhdWx0JyxcbiAgICAgICkgYXMgKCkgPT4gUnVsZUZhY3Rvcnk8e30+O1xuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gZmFjdG9yeUluaXRpYWxpemVyKCk7XG4gICAgICBpZiAoIWZhY3RvcnkgfHwgdHlwZW9mIGZhY3RvcnkgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHJlZjogZmFjdG9yeSwgcGF0aDogc2NoZW1hdGljUGF0aCB9O1xuICAgIH1cblxuICAgIC8vIEFsbCBvdGhlciBzY2hlbWF0aWNzIHVzZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAgcmV0dXJuIHN1cGVyLl9yZXNvbHZlUmVmZXJlbmNlU3RyaW5nKHJlZlN0cmluZywgcGFyZW50UGF0aCwgY29sbGVjdGlvbkRlc2NyaXB0aW9uKTtcbiAgfVxufVxuXG4vKipcbiAqIE1pbmltYWwgc2hpbSBtb2R1bGVzIGZvciBsZWdhY3kgZGVlcCBpbXBvcnRzIG9mIGBAc2NoZW1hdGljcy9hbmd1bGFyYFxuICovXG5jb25zdCBsZWdhY3lNb2R1bGVzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9jb25maWcnOiB7XG4gICAgZ2V0V29ya3NwYWNlKGhvc3Q6IFRyZWUpIHtcbiAgICAgIGNvbnN0IHBhdGggPSAnLy5hbmd1bGFyLmpzb24nO1xuICAgICAgY29uc3QgZGF0YSA9IGhvc3QucmVhZChwYXRoKTtcbiAgICAgIGlmICghZGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgKCR7cGF0aH0pYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwYXJzZUpzb24oZGF0YS50b1N0cmluZygpLCBbXSwgeyBhbGxvd1RyYWlsaW5nQ29tbWE6IHRydWUgfSk7XG4gICAgfSxcbiAgfSxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9wcm9qZWN0Jzoge1xuICAgIGJ1aWxkRGVmYXVsdFBhdGgocHJvamVjdDogeyBzb3VyY2VSb290Pzogc3RyaW5nOyByb290OiBzdHJpbmc7IHByb2plY3RUeXBlOiBzdHJpbmcgfSk6IHN0cmluZyB7XG4gICAgICBjb25zdCByb290ID0gcHJvamVjdC5zb3VyY2VSb290ID8gYC8ke3Byb2plY3Quc291cmNlUm9vdH0vYCA6IGAvJHtwcm9qZWN0LnJvb3R9L3NyYy9gO1xuXG4gICAgICByZXR1cm4gYCR7cm9vdH0ke3Byb2plY3QucHJvamVjdFR5cGUgPT09ICdhcHBsaWNhdGlvbicgPyAnYXBwJyA6ICdsaWInfWA7XG4gICAgfSxcbiAgfSxcbn07XG5cbi8qKlxuICogV3JhcCBhIEphdmFTY3JpcHQgZmlsZSBpbiBhIFZNIGNvbnRleHQgdG8gYWxsb3cgc3BlY2lmaWMgQW5ndWxhciBkZXBlbmRlbmNpZXMgdG8gYmUgcmVkaXJlY3RlZC5cbiAqIFRoaXMgVk0gc2V0dXAgaXMgT05MWSBpbnRlbmRlZCB0byByZWRpcmVjdCBkZXBlbmRlbmNpZXMuXG4gKlxuICogQHBhcmFtIHNjaGVtYXRpY0ZpbGUgQSBKYXZhU2NyaXB0IHNjaGVtYXRpYyBmaWxlIHBhdGggdGhhdCBzaG91bGQgYmUgd3JhcHBlZC5cbiAqIEBwYXJhbSBzY2hlbWF0aWNEaXJlY3RvcnkgQSBkaXJlY3RvcnkgdGhhdCB3aWxsIGJlIHVzZWQgYXMgdGhlIGxvY2F0aW9uIG9mIHRoZSBKYXZhU2NyaXB0IGZpbGUuXG4gKiBAcGFyYW0gbW9kdWxlQ2FjaGUgQSBtYXAgdG8gdXNlIGZvciBjYWNoaW5nIHJlcGVhdCBtb2R1bGUgdXNhZ2UgYW5kIHByb3BlciBgaW5zdGFuY2VvZmAgc3VwcG9ydC5cbiAqIEBwYXJhbSBleHBvcnROYW1lIEFuIG9wdGlvbmFsIG5hbWUgb2YgYSBzcGVjaWZpYyBleHBvcnQgdG8gcmV0dXJuLiBPdGhlcndpc2UsIHJldHVybiBhbGwgZXhwb3J0cy5cbiAqL1xuZnVuY3Rpb24gd3JhcChcbiAgc2NoZW1hdGljRmlsZTogc3RyaW5nLFxuICBzY2hlbWF0aWNEaXJlY3Rvcnk6IHN0cmluZyxcbiAgbW9kdWxlQ2FjaGU6IE1hcDxzdHJpbmcsIHVua25vd24+LFxuICBleHBvcnROYW1lPzogc3RyaW5nLFxuKTogKCkgPT4gdW5rbm93biB7XG4gIGNvbnN0IGhvc3RSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKF9fZmlsZW5hbWUpO1xuICBjb25zdCBzY2hlbWF0aWNSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHNjaGVtYXRpY0ZpbGUpO1xuXG4gIGNvbnN0IGN1c3RvbVJlcXVpcmUgPSBmdW5jdGlvbiAoaWQ6IHN0cmluZykge1xuICAgIGlmIChsZWdhY3lNb2R1bGVzW2lkXSkge1xuICAgICAgLy8gUHJvdmlkZSBjb21wYXRpYmlsaXR5IG1vZHVsZXMgZm9yIG9sZGVyIHZlcnNpb25zIG9mIEBhbmd1bGFyL2Nka1xuICAgICAgcmV0dXJuIGxlZ2FjeU1vZHVsZXNbaWRdO1xuICAgIH0gZWxzZSBpZiAoaWQuc3RhcnRzV2l0aCgnc2NoZW1hdGljczonKSkge1xuICAgICAgLy8gU2NoZW1hdGljcyBidWlsdC1pbiBtb2R1bGVzIHVzZSB0aGUgYHNjaGVtYXRpY3NgIHNjaGVtZSAoc2ltaWxhciB0byB0aGUgTm9kZS5qcyBgbm9kZWAgc2NoZW1lKVxuICAgICAgY29uc3QgYnVpbHRpbklkID0gaWQuc2xpY2UoMTEpO1xuICAgICAgY29uc3QgYnVpbHRpbk1vZHVsZSA9IGxvYWRCdWlsdGluTW9kdWxlKGJ1aWx0aW5JZCk7XG4gICAgICBpZiAoIWJ1aWx0aW5Nb2R1bGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmtub3duIHNjaGVtYXRpY3MgYnVpbHQtaW4gbW9kdWxlICcke2lkfScgcmVxdWVzdGVkIGZyb20gc2NoZW1hdGljICcke3NjaGVtYXRpY0ZpbGV9J2AsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBidWlsdGluTW9kdWxlO1xuICAgIH0gZWxzZSBpZiAoaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXItZGV2a2l0LycpIHx8IGlkLnN0YXJ0c1dpdGgoJ0BzY2hlbWF0aWNzLycpKSB7XG4gICAgICAvLyBGaWxlcyBzaG91bGQgbm90IHJlZGlyZWN0IGBAYW5ndWxhci9jb3JlYCBhbmQgaW5zdGVhZCB1c2UgdGhlIGRpcmVjdFxuICAgICAgLy8gZGVwZW5kZW5jeSBpZiBhdmFpbGFibGUuIFRoaXMgYWxsb3dzIG9sZCBtYWpvciB2ZXJzaW9uIG1pZ3JhdGlvbnMgdG8gY29udGludWUgdG8gZnVuY3Rpb25cbiAgICAgIC8vIGV2ZW4gdGhvdWdoIHRoZSBsYXRlc3QgbWFqb3IgdmVyc2lvbiBtYXkgaGF2ZSBicmVha2luZyBjaGFuZ2VzIGluIGBAYW5ndWxhci9jb3JlYC5cbiAgICAgIGlmIChpZC5zdGFydHNXaXRoKCdAYW5ndWxhci1kZXZraXQvY29yZScpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHNjaGVtYXRpY1JlcXVpcmUoaWQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgYXNzZXJ0SXNFcnJvcihlKTtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc29sdmUgZnJvbSBpbnNpZGUgdGhlIGBAYW5ndWxhci9jbGlgIHByb2plY3RcbiAgICAgIHJldHVybiBob3N0UmVxdWlyZShpZCk7XG4gICAgfSBlbHNlIGlmIChpZC5zdGFydHNXaXRoKCcuJykgfHwgaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvY2RrJykpIHtcbiAgICAgIC8vIFdyYXAgcmVsYXRpdmUgZmlsZXMgaW5zaWRlIHRoZSBzY2hlbWF0aWMgY29sbGVjdGlvblxuICAgICAgLy8gQWxzbyB3cmFwIGBAYW5ndWxhci9jZGtgLCBpdCBjb250YWlucyBoZWxwZXIgdXRpbGl0aWVzIHRoYXQgaW1wb3J0IGNvcmUgc2NoZW1hdGljIHBhY2thZ2VzXG5cbiAgICAgIC8vIFJlc29sdmUgZnJvbSB0aGUgb3JpZ2luYWwgZmlsZVxuICAgICAgY29uc3QgbW9kdWxlUGF0aCA9IHNjaGVtYXRpY1JlcXVpcmUucmVzb2x2ZShpZCk7XG5cbiAgICAgIC8vIFVzZSBjYWNoZWQgbW9kdWxlIGlmIGF2YWlsYWJsZVxuICAgICAgY29uc3QgY2FjaGVkTW9kdWxlID0gbW9kdWxlQ2FjaGUuZ2V0KG1vZHVsZVBhdGgpO1xuICAgICAgaWYgKGNhY2hlZE1vZHVsZSkge1xuICAgICAgICByZXR1cm4gY2FjaGVkTW9kdWxlO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyBub3Qgd3JhcCB2ZW5kb3JlZCB0aGlyZC1wYXJ0eSBwYWNrYWdlcyBvciBKU09OIGZpbGVzXG4gICAgICBpZiAoXG4gICAgICAgICEvWy9cXFxcXW5vZGVfbW9kdWxlc1svXFxcXF1Ac2NoZW1hdGljc1svXFxcXF1hbmd1bGFyWy9cXFxcXXRoaXJkX3BhcnR5Wy9cXFxcXS8udGVzdChtb2R1bGVQYXRoKSAmJlxuICAgICAgICAhbW9kdWxlUGF0aC5lbmRzV2l0aCgnLmpzb24nKVxuICAgICAgKSB7XG4gICAgICAgIC8vIFdyYXAgbW9kdWxlIGFuZCBzYXZlIGluIGNhY2hlXG4gICAgICAgIGNvbnN0IHdyYXBwZWRNb2R1bGUgPSB3cmFwKG1vZHVsZVBhdGgsIGRpcm5hbWUobW9kdWxlUGF0aCksIG1vZHVsZUNhY2hlKSgpO1xuICAgICAgICBtb2R1bGVDYWNoZS5zZXQobW9kdWxlUGF0aCwgd3JhcHBlZE1vZHVsZSk7XG5cbiAgICAgICAgcmV0dXJuIHdyYXBwZWRNb2R1bGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIG90aGVycyBhcmUgcmVxdWlyZWQgZGlyZWN0bHkgZnJvbSB0aGUgb3JpZ2luYWwgZmlsZVxuICAgIHJldHVybiBzY2hlbWF0aWNSZXF1aXJlKGlkKTtcbiAgfTtcblxuICAvLyBTZXR1cCBhIHdyYXBwZXIgZnVuY3Rpb24gdG8gY2FwdHVyZSB0aGUgbW9kdWxlJ3MgZXhwb3J0c1xuICBjb25zdCBzY2hlbWF0aWNDb2RlID0gcmVhZEZpbGVTeW5jKHNjaGVtYXRpY0ZpbGUsICd1dGY4Jyk7XG4gIC8vIGBtb2R1bGVgIGlzIHJlcXVpcmVkIGR1ZSB0byBAYW5ndWxhci9sb2NhbGl6ZSBuZy1hZGQgYmVpbmcgaW4gVU1EIGZvcm1hdFxuICBjb25zdCBoZWFkZXJDb2RlID0gJyhmdW5jdGlvbigpIHtcXG52YXIgZXhwb3J0cyA9IHt9O1xcbnZhciBtb2R1bGUgPSB7IGV4cG9ydHMgfTtcXG4nO1xuICBjb25zdCBmb290ZXJDb2RlID0gZXhwb3J0TmFtZVxuICAgID8gYFxcbnJldHVybiBtb2R1bGUuZXhwb3J0c1snJHtleHBvcnROYW1lfSddO30pO2BcbiAgICA6ICdcXG5yZXR1cm4gbW9kdWxlLmV4cG9ydHM7fSk7JztcblxuICBjb25zdCBzY3JpcHQgPSBuZXcgU2NyaXB0KGhlYWRlckNvZGUgKyBzY2hlbWF0aWNDb2RlICsgZm9vdGVyQ29kZSwge1xuICAgIGZpbGVuYW1lOiBzY2hlbWF0aWNGaWxlLFxuICAgIGxpbmVPZmZzZXQ6IDMsXG4gIH0pO1xuXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgX19kaXJuYW1lOiBzY2hlbWF0aWNEaXJlY3RvcnksXG4gICAgX19maWxlbmFtZTogc2NoZW1hdGljRmlsZSxcbiAgICBCdWZmZXIsXG4gICAgY29uc29sZSxcbiAgICBwcm9jZXNzLFxuICAgIGdldCBnbG9iYWwoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlcXVpcmU6IGN1c3RvbVJlcXVpcmUsXG4gIH07XG5cbiAgY29uc3QgZXhwb3J0c0ZhY3RvcnkgPSBzY3JpcHQucnVuSW5OZXdDb250ZXh0KGNvbnRleHQpO1xuXG4gIHJldHVybiBleHBvcnRzRmFjdG9yeTtcbn1cblxuZnVuY3Rpb24gbG9hZEJ1aWx0aW5Nb2R1bGUoaWQ6IHN0cmluZyk6IHVua25vd24ge1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIl19