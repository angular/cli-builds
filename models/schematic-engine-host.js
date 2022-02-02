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
/**
 * Environment variable to control schematic package redirection
 * Default: Angular schematics only
 */
const schematicRedirectVariable = (_a = process.env['NG_SCHEMATIC_REDIRECT']) === null || _a === void 0 ? void 0 : _a.toLowerCase();
function shouldWrapSchematic(schematicFile) {
    // Check environment variable if present
    if (schematicRedirectVariable !== undefined) {
        switch (schematicRedirectVariable) {
            case '0':
            case 'false':
            case 'off':
            case 'none':
                return false;
            case 'all':
                return true;
        }
    }
    const normalizedSchematicFile = schematicFile.replace(/\\/g, '/');
    // Never wrap the internal update schematic when executed directly
    // It communicates with the update command via `global`
    // But we still want to redirect schematics located in `@angular/cli/node_modules`.
    if (normalizedSchematicFile.includes('node_modules/@angular/cli/') &&
        !normalizedSchematicFile.includes('node_modules/@angular/cli/node_modules/')) {
        return false;
    }
    // Default is only first-party Angular schematic packages
    // Angular schematics are safe to use in the wrapped VM context
    return /\/node_modules\/@(?:angular|schematics|nguniversal)\//.test(normalizedSchematicFile);
}
class SchematicEngineHost extends tools_1.NodeModulesEngineHost {
    _resolveReferenceString(refString, parentPath) {
        const [path, name] = refString.split('#', 2);
        // Mimic behavior of ExportStringRef class used in default behavior
        const fullPath = path[0] === '.' ? (0, path_1.resolve)(parentPath !== null && parentPath !== void 0 ? parentPath : process.cwd(), path) : path;
        const schematicFile = require.resolve(fullPath, { paths: [parentPath] });
        if (shouldWrapSchematic(schematicFile)) {
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
        return super._resolveReferenceString(refString, parentPath);
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
        else if (id.startsWith('@angular-devkit/') || id.startsWith('@schematics/')) {
            // Files should not redirect `@angular/core` and instead use the direct
            // dependency if available. This allows old major version migrations to continue to function
            // even though the latest major version may have breaking changes in `@angular/core`.
            if (id.startsWith('@angular-devkit/core')) {
                try {
                    return schematicRequire(id);
                }
                catch (e) {
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
    const footerCode = exportName ? `\nreturn exports['${exportName}'];});` : '\nreturn exports;});';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7O0FBRUgsMkRBQW9GO0FBQ3BGLDREQUF5RTtBQUN6RSwyQkFBa0M7QUFDbEMsK0NBQWtEO0FBQ2xELG9EQUFnQztBQUNoQywrQkFBd0M7QUFDeEMsMkJBQTRCO0FBRTVCOzs7R0FHRztBQUNILE1BQU0seUJBQXlCLEdBQUcsTUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLDBDQUFFLFdBQVcsRUFBRSxDQUFDO0FBRXRGLFNBQVMsbUJBQW1CLENBQUMsYUFBcUI7SUFDaEQsd0NBQXdDO0lBQ3hDLElBQUkseUJBQXlCLEtBQUssU0FBUyxFQUFFO1FBQzNDLFFBQVEseUJBQXlCLEVBQUU7WUFDakMsS0FBSyxHQUFHLENBQUM7WUFDVCxLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNO2dCQUNULE9BQU8sS0FBSyxDQUFDO1lBQ2YsS0FBSyxLQUFLO2dCQUNSLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7S0FDRjtJQUVELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEUsa0VBQWtFO0lBQ2xFLHVEQUF1RDtJQUN2RCxtRkFBbUY7SUFDbkYsSUFDRSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7UUFDOUQsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsRUFDNUU7UUFDQSxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQseURBQXlEO0lBQ3pELCtEQUErRDtJQUMvRCxPQUFPLHVEQUF1RCxDQUFDLElBQUks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Q29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGVGYWN0b3J5LCBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VKc29uIH0gZnJvbSAnanNvbmMtcGFyc2VyJztcbmltcG9ydCBub2RlTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTY3JpcHQgfSBmcm9tICd2bSc7XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdG8gY29udHJvbCBzY2hlbWF0aWMgcGFja2FnZSByZWRpcmVjdGlvblxuICogRGVmYXVsdDogQW5ndWxhciBzY2hlbWF0aWNzIG9ubHlcbiAqL1xuY29uc3Qgc2NoZW1hdGljUmVkaXJlY3RWYXJpYWJsZSA9IHByb2Nlc3MuZW52WydOR19TQ0hFTUFUSUNfUkVESVJFQ1QnXT8udG9Mb3dlckNhc2UoKTtcblxuZnVuY3Rpb24gc2hvdWxkV3JhcFNjaGVtYXRpYyhzY2hlbWF0aWNGaWxlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGUgaWYgcHJlc2VudFxuICBpZiAoc2NoZW1hdGljUmVkaXJlY3RWYXJpYWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgc3dpdGNoIChzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlKSB7XG4gICAgICBjYXNlICcwJzpcbiAgICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgIGNhc2UgJ29mZic6XG4gICAgICBjYXNlICdub25lJzpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUgPSBzY2hlbWF0aWNGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gTmV2ZXIgd3JhcCB0aGUgaW50ZXJuYWwgdXBkYXRlIHNjaGVtYXRpYyB3aGVuIGV4ZWN1dGVkIGRpcmVjdGx5XG4gIC8vIEl0IGNvbW11bmljYXRlcyB3aXRoIHRoZSB1cGRhdGUgY29tbWFuZCB2aWEgYGdsb2JhbGBcbiAgLy8gQnV0IHdlIHN0aWxsIHdhbnQgdG8gcmVkaXJlY3Qgc2NoZW1hdGljcyBsb2NhdGVkIGluIGBAYW5ndWxhci9jbGkvbm9kZV9tb2R1bGVzYC5cbiAgaWYgKFxuICAgIG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpLycpICYmXG4gICAgIW5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpL25vZGVfbW9kdWxlcy8nKVxuICApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBEZWZhdWx0IGlzIG9ubHkgZmlyc3QtcGFydHkgQW5ndWxhciBzY2hlbWF0aWMgcGFja2FnZXNcbiAgLy8gQW5ndWxhciBzY2hlbWF0aWNzIGFyZSBzYWZlIHRvIHVzZSBpbiB0aGUgd3JhcHBlZCBWTSBjb250ZXh0XG4gIHJldHVybiAvXFwvbm9kZV9tb2R1bGVzXFwvQCg/OmFuZ3VsYXJ8c2NoZW1hdGljc3xuZ3VuaXZlcnNhbClcXC8vLnRlc3Qobm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUpO1xufVxuXG5leHBvcnQgY2xhc3MgU2NoZW1hdGljRW5naW5lSG9zdCBleHRlbmRzIE5vZGVNb2R1bGVzRW5naW5lSG9zdCB7XG4gIHByb3RlY3RlZCBvdmVycmlkZSBfcmVzb2x2ZVJlZmVyZW5jZVN0cmluZyhyZWZTdHJpbmc6IHN0cmluZywgcGFyZW50UGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgW3BhdGgsIG5hbWVdID0gcmVmU3RyaW5nLnNwbGl0KCcjJywgMik7XG4gICAgLy8gTWltaWMgYmVoYXZpb3Igb2YgRXhwb3J0U3RyaW5nUmVmIGNsYXNzIHVzZWQgaW4gZGVmYXVsdCBiZWhhdmlvclxuICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aFswXSA9PT0gJy4nID8gcmVzb2x2ZShwYXJlbnRQYXRoID8/IHByb2Nlc3MuY3dkKCksIHBhdGgpIDogcGF0aDtcblxuICAgIGNvbnN0IHNjaGVtYXRpY0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoZnVsbFBhdGgsIHsgcGF0aHM6IFtwYXJlbnRQYXRoXSB9KTtcblxuICAgIGlmIChzaG91bGRXcmFwU2NoZW1hdGljKHNjaGVtYXRpY0ZpbGUpKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWNQYXRoID0gZGlybmFtZShzY2hlbWF0aWNGaWxlKTtcblxuICAgICAgY29uc3QgbW9kdWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgdW5rbm93bj4oKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlJbml0aWFsaXplciA9IHdyYXAoXG4gICAgICAgIHNjaGVtYXRpY0ZpbGUsXG4gICAgICAgIHNjaGVtYXRpY1BhdGgsXG4gICAgICAgIG1vZHVsZUNhY2hlLFxuICAgICAgICBuYW1lIHx8ICdkZWZhdWx0JyxcbiAgICAgICkgYXMgKCkgPT4gUnVsZUZhY3Rvcnk8e30+O1xuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gZmFjdG9yeUluaXRpYWxpemVyKCk7XG4gICAgICBpZiAoIWZhY3RvcnkgfHwgdHlwZW9mIGZhY3RvcnkgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHJlZjogZmFjdG9yeSwgcGF0aDogc2NoZW1hdGljUGF0aCB9O1xuICAgIH1cblxuICAgIC8vIEFsbCBvdGhlciBzY2hlbWF0aWNzIHVzZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAgcmV0dXJuIHN1cGVyLl9yZXNvbHZlUmVmZXJlbmNlU3RyaW5nKHJlZlN0cmluZywgcGFyZW50UGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBNaW5pbWFsIHNoaW0gbW9kdWxlcyBmb3IgbGVnYWN5IGRlZXAgaW1wb3J0cyBvZiBgQHNjaGVtYXRpY3MvYW5ndWxhcmBcbiAqL1xuY29uc3QgbGVnYWN5TW9kdWxlczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvY29uZmlnJzoge1xuICAgIGdldFdvcmtzcGFjZShob3N0OiBUcmVlKSB7XG4gICAgICBjb25zdCBwYXRoID0gJy8uYW5ndWxhci5qc29uJztcbiAgICAgIGNvbnN0IGRhdGEgPSBob3N0LnJlYWQocGF0aCk7XG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICgke3BhdGh9KWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyc2VKc29uKGRhdGEudG9TdHJpbmcoKSwgW10sIHsgYWxsb3dUcmFpbGluZ0NvbW1hOiB0cnVlIH0pO1xuICAgIH0sXG4gIH0sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvcHJvamVjdCc6IHtcbiAgICBidWlsZERlZmF1bHRQYXRoKHByb2plY3Q6IHsgc291cmNlUm9vdD86IHN0cmluZzsgcm9vdDogc3RyaW5nOyBwcm9qZWN0VHlwZTogc3RyaW5nIH0pOiBzdHJpbmcge1xuICAgICAgY29uc3Qgcm9vdCA9IHByb2plY3Quc291cmNlUm9vdCA/IGAvJHtwcm9qZWN0LnNvdXJjZVJvb3R9L2AgOiBgLyR7cHJvamVjdC5yb290fS9zcmMvYDtcblxuICAgICAgcmV0dXJuIGAke3Jvb3R9JHtwcm9qZWN0LnByb2plY3RUeXBlID09PSAnYXBwbGljYXRpb24nID8gJ2FwcCcgOiAnbGliJ31gO1xuICAgIH0sXG4gIH0sXG59O1xuXG4vKipcbiAqIFdyYXAgYSBKYXZhU2NyaXB0IGZpbGUgaW4gYSBWTSBjb250ZXh0IHRvIGFsbG93IHNwZWNpZmljIEFuZ3VsYXIgZGVwZW5kZW5jaWVzIHRvIGJlIHJlZGlyZWN0ZWQuXG4gKiBUaGlzIFZNIHNldHVwIGlzIE9OTFkgaW50ZW5kZWQgdG8gcmVkaXJlY3QgZGVwZW5kZW5jaWVzLlxuICpcbiAqIEBwYXJhbSBzY2hlbWF0aWNGaWxlIEEgSmF2YVNjcmlwdCBzY2hlbWF0aWMgZmlsZSBwYXRoIHRoYXQgc2hvdWxkIGJlIHdyYXBwZWQuXG4gKiBAcGFyYW0gc2NoZW1hdGljRGlyZWN0b3J5IEEgZGlyZWN0b3J5IHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBsb2NhdGlvbiBvZiB0aGUgSmF2YVNjcmlwdCBmaWxlLlxuICogQHBhcmFtIG1vZHVsZUNhY2hlIEEgbWFwIHRvIHVzZSBmb3IgY2FjaGluZyByZXBlYXQgbW9kdWxlIHVzYWdlIGFuZCBwcm9wZXIgYGluc3RhbmNlb2ZgIHN1cHBvcnQuXG4gKiBAcGFyYW0gZXhwb3J0TmFtZSBBbiBvcHRpb25hbCBuYW1lIG9mIGEgc3BlY2lmaWMgZXhwb3J0IHRvIHJldHVybi4gT3RoZXJ3aXNlLCByZXR1cm4gYWxsIGV4cG9ydHMuXG4gKi9cbmZ1bmN0aW9uIHdyYXAoXG4gIHNjaGVtYXRpY0ZpbGU6IHN0cmluZyxcbiAgc2NoZW1hdGljRGlyZWN0b3J5OiBzdHJpbmcsXG4gIG1vZHVsZUNhY2hlOiBNYXA8c3RyaW5nLCB1bmtub3duPixcbiAgZXhwb3J0TmFtZT86IHN0cmluZyxcbik6ICgpID0+IHVua25vd24ge1xuICBjb25zdCBob3N0UmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZShfX2ZpbGVuYW1lKTtcbiAgY29uc3Qgc2NoZW1hdGljUmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZShzY2hlbWF0aWNGaWxlKTtcblxuICBjb25zdCBjdXN0b21SZXF1aXJlID0gZnVuY3Rpb24gKGlkOiBzdHJpbmcpIHtcbiAgICBpZiAobGVnYWN5TW9kdWxlc1tpZF0pIHtcbiAgICAgIC8vIFByb3ZpZGUgY29tcGF0aWJpbGl0eSBtb2R1bGVzIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBAYW5ndWxhci9jZGtcbiAgICAgIHJldHVybiBsZWdhY3lNb2R1bGVzW2lkXTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLWRldmtpdC8nKSB8fCBpZC5zdGFydHNXaXRoKCdAc2NoZW1hdGljcy8nKSkge1xuICAgICAgLy8gRmlsZXMgc2hvdWxkIG5vdCByZWRpcmVjdCBgQGFuZ3VsYXIvY29yZWAgYW5kIGluc3RlYWQgdXNlIHRoZSBkaXJlY3RcbiAgICAgIC8vIGRlcGVuZGVuY3kgaWYgYXZhaWxhYmxlLiBUaGlzIGFsbG93cyBvbGQgbWFqb3IgdmVyc2lvbiBtaWdyYXRpb25zIHRvIGNvbnRpbnVlIHRvIGZ1bmN0aW9uXG4gICAgICAvLyBldmVuIHRob3VnaCB0aGUgbGF0ZXN0IG1ham9yIHZlcnNpb24gbWF5IGhhdmUgYnJlYWtpbmcgY2hhbmdlcyBpbiBgQGFuZ3VsYXIvY29yZWAuXG4gICAgICBpZiAoaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXItZGV2a2l0L2NvcmUnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBzY2hlbWF0aWNSZXF1aXJlKGlkKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBmcm9tIGluc2lkZSB0aGUgYEBhbmd1bGFyL2NsaWAgcHJvamVjdFxuICAgICAgcmV0dXJuIGhvc3RSZXF1aXJlKGlkKTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJy4nKSB8fCBpZC5zdGFydHNXaXRoKCdAYW5ndWxhci9jZGsnKSkge1xuICAgICAgLy8gV3JhcCByZWxhdGl2ZSBmaWxlcyBpbnNpZGUgdGhlIHNjaGVtYXRpYyBjb2xsZWN0aW9uXG4gICAgICAvLyBBbHNvIHdyYXAgYEBhbmd1bGFyL2Nka2AsIGl0IGNvbnRhaW5zIGhlbHBlciB1dGlsaXRpZXMgdGhhdCBpbXBvcnQgY29yZSBzY2hlbWF0aWMgcGFja2FnZXNcblxuICAgICAgLy8gUmVzb2x2ZSBmcm9tIHRoZSBvcmlnaW5hbCBmaWxlXG4gICAgICBjb25zdCBtb2R1bGVQYXRoID0gc2NoZW1hdGljUmVxdWlyZS5yZXNvbHZlKGlkKTtcblxuICAgICAgLy8gVXNlIGNhY2hlZCBtb2R1bGUgaWYgYXZhaWxhYmxlXG4gICAgICBjb25zdCBjYWNoZWRNb2R1bGUgPSBtb2R1bGVDYWNoZS5nZXQobW9kdWxlUGF0aCk7XG4gICAgICBpZiAoY2FjaGVkTW9kdWxlKSB7XG4gICAgICAgIHJldHVybiBjYWNoZWRNb2R1bGU7XG4gICAgICB9XG5cbiAgICAgIC8vIERvIG5vdCB3cmFwIHZlbmRvcmVkIHRoaXJkLXBhcnR5IHBhY2thZ2VzIG9yIEpTT04gZmlsZXNcbiAgICAgIGlmIChcbiAgICAgICAgIS9bL1xcXFxdbm9kZV9tb2R1bGVzWy9cXFxcXUBzY2hlbWF0aWNzWy9cXFxcXWFuZ3VsYXJbL1xcXFxddGhpcmRfcGFydHlbL1xcXFxdLy50ZXN0KG1vZHVsZVBhdGgpICYmXG4gICAgICAgICFtb2R1bGVQYXRoLmVuZHNXaXRoKCcuanNvbicpXG4gICAgICApIHtcbiAgICAgICAgLy8gV3JhcCBtb2R1bGUgYW5kIHNhdmUgaW4gY2FjaGVcbiAgICAgICAgY29uc3Qgd3JhcHBlZE1vZHVsZSA9IHdyYXAobW9kdWxlUGF0aCwgZGlybmFtZShtb2R1bGVQYXRoKSwgbW9kdWxlQ2FjaGUpKCk7XG4gICAgICAgIG1vZHVsZUNhY2hlLnNldChtb2R1bGVQYXRoLCB3cmFwcGVkTW9kdWxlKTtcblxuICAgICAgICByZXR1cm4gd3JhcHBlZE1vZHVsZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGwgb3RoZXJzIGFyZSByZXF1aXJlZCBkaXJlY3RseSBmcm9tIHRoZSBvcmlnaW5hbCBmaWxlXG4gICAgcmV0dXJuIHNjaGVtYXRpY1JlcXVpcmUoaWQpO1xuICB9O1xuXG4gIC8vIFNldHVwIGEgd3JhcHBlciBmdW5jdGlvbiB0byBjYXB0dXJlIHRoZSBtb2R1bGUncyBleHBvcnRzXG4gIGNvbnN0IHNjaGVtYXRpY0NvZGUgPSByZWFkRmlsZVN5bmMoc2NoZW1hdGljRmlsZSwgJ3V0ZjgnKTtcbiAgLy8gYG1vZHVsZWAgaXMgcmVxdWlyZWQgZHVlIHRvIEBhbmd1bGFyL2xvY2FsaXplIG5nLWFkZCBiZWluZyBpbiBVTUQgZm9ybWF0XG4gIGNvbnN0IGhlYWRlckNvZGUgPSAnKGZ1bmN0aW9uKCkge1xcbnZhciBleHBvcnRzID0ge307XFxudmFyIG1vZHVsZSA9IHsgZXhwb3J0cyB9O1xcbic7XG4gIGNvbnN0IGZvb3RlckNvZGUgPSBleHBvcnROYW1lID8gYFxcbnJldHVybiBleHBvcnRzWycke2V4cG9ydE5hbWV9J107fSk7YCA6ICdcXG5yZXR1cm4gZXhwb3J0czt9KTsnO1xuXG4gIGNvbnN0IHNjcmlwdCA9IG5ldyBTY3JpcHQoaGVhZGVyQ29kZSArIHNjaGVtYXRpY0NvZGUgKyBmb290ZXJDb2RlLCB7XG4gICAgZmlsZW5hbWU6IHNjaGVtYXRpY0ZpbGUsXG4gICAgbGluZU9mZnNldDogMyxcbiAgfSk7XG5cbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBfX2Rpcm5hbWU6IHNjaGVtYXRpY0RpcmVjdG9yeSxcbiAgICBfX2ZpbGVuYW1lOiBzY2hlbWF0aWNGaWxlLFxuICAgIEJ1ZmZlcixcbiAgICBjb25zb2xlLFxuICAgIHByb2Nlc3MsXG4gICAgZ2V0IGdsb2JhbCgpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcmVxdWlyZTogY3VzdG9tUmVxdWlyZSxcbiAgfTtcblxuICBjb25zdCBleHBvcnRzRmFjdG9yeSA9IHNjcmlwdC5ydW5Jbk5ld0NvbnRleHQoY29udGV4dCk7XG5cbiAgcmV0dXJuIGV4cG9ydHNGYWN0b3J5O1xufVxuIl19