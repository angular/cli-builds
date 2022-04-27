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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7QUFFSCwyREFBb0Y7QUFDcEYsNERBQW1HO0FBQ25HLDJCQUFrQztBQUNsQywrQ0FBa0Q7QUFDbEQsb0RBQWdDO0FBQ2hDLCtCQUF3QztBQUN4QywyQkFBNEI7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLHlCQUF5QixHQUFHLE1BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQywwQ0FBRSxXQUFXLEVBQUUsQ0FBQztBQUV0RixTQUFTLG1CQUFtQixDQUFDLGFBQXFCLEVBQUUsc0JBQStCO0lBQ2pGLHdDQUF3QztJQUN4QyxRQUFRLHlCQUF5QixFQUFFO1FBQ2pDLEtBQUssR0FBRyxDQUFDO1FBQ1QsS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLEtBQUssQ0FBQztRQUNYLEtBQUssTUFBTTtZQUNULE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxLQUFLO1lBQ1IsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEUsa0VBQWtFO0lBQ2xFLHVEQUF1RDtJQUN2RCxtRkFBbUY7SUFDbkYsSUFDRSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7UUFDOUQsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsRUFDNUU7UUFDQSxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsbURBQW1EO0lBQ25ELCtEQUErRDtJQUMvRCxJQUFJLHVEQUF1RCxDQUFDLElBQUks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RCxDQUFDLENBQUMsNkJBQTZCLENBQUM7SUFFbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFNLENBQUMsVUFBVSxHQUFHLGFBQWEsR0FBRyxVQUFVLEVBQUU7UUFDakUsUUFBUSxFQUFFLGFBQWE7UUFDdkIsVUFBVSxFQUFFLENBQUM7S0FDZCxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRztRQUNkLFNBQVMsRUFBRSxrQkFBa0I7UUFDN0IsVUFBVSxFQUFFLGFBQWE7UUFDekIsTUFBTTtRQUNOLE9BQU87UUFDUCxPQUFPO1FBQ1AsSUFBSSxNQUFNO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxFQUFFLGFBQWE7S0FDdkIsQ0FBQztJQUVGLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdkQsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBVTtJQUNuQyxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGVGYWN0b3J5LCBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjLCBOb2RlTW9kdWxlc0VuZ2luZUhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZUpzb24gfSBmcm9tICdqc29uYy1wYXJzZXInO1xuaW1wb3J0IG5vZGVNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNjcmlwdCB9IGZyb20gJ3ZtJztcblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB0byBjb250cm9sIHNjaGVtYXRpYyBwYWNrYWdlIHJlZGlyZWN0aW9uXG4gKi9cbmNvbnN0IHNjaGVtYXRpY1JlZGlyZWN0VmFyaWFibGUgPSBwcm9jZXNzLmVudlsnTkdfU0NIRU1BVElDX1JFRElSRUNUJ10/LnRvTG93ZXJDYXNlKCk7XG5cbmZ1bmN0aW9uIHNob3VsZFdyYXBTY2hlbWF0aWMoc2NoZW1hdGljRmlsZTogc3RyaW5nLCBzY2hlbWF0aWNFbmNhcHN1bGF0aW9uOiBib29sZWFuKTogYm9vbGVhbiB7XG4gIC8vIENoZWNrIGVudmlyb25tZW50IHZhcmlhYmxlIGlmIHByZXNlbnRcbiAgc3dpdGNoIChzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlKSB7XG4gICAgY2FzZSAnMCc6XG4gICAgY2FzZSAnZmFsc2UnOlxuICAgIGNhc2UgJ29mZic6XG4gICAgY2FzZSAnbm9uZSc6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY2FzZSAnYWxsJzpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY29uc3Qgbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUgPSBzY2hlbWF0aWNGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gTmV2ZXIgd3JhcCB0aGUgaW50ZXJuYWwgdXBkYXRlIHNjaGVtYXRpYyB3aGVuIGV4ZWN1dGVkIGRpcmVjdGx5XG4gIC8vIEl0IGNvbW11bmljYXRlcyB3aXRoIHRoZSB1cGRhdGUgY29tbWFuZCB2aWEgYGdsb2JhbGBcbiAgLy8gQnV0IHdlIHN0aWxsIHdhbnQgdG8gcmVkaXJlY3Qgc2NoZW1hdGljcyBsb2NhdGVkIGluIGBAYW5ndWxhci9jbGkvbm9kZV9tb2R1bGVzYC5cbiAgaWYgKFxuICAgIG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpLycpICYmXG4gICAgIW5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpL25vZGVfbW9kdWxlcy8nKVxuICApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgZmlyc3QtcGFydHkgQW5ndWxhciBzY2hlbWF0aWMgcGFja2FnZXNcbiAgLy8gQW5ndWxhciBzY2hlbWF0aWNzIGFyZSBzYWZlIHRvIHVzZSBpbiB0aGUgd3JhcHBlZCBWTSBjb250ZXh0XG4gIGlmICgvXFwvbm9kZV9tb2R1bGVzXFwvQCg/OmFuZ3VsYXJ8c2NoZW1hdGljc3xuZ3VuaXZlcnNhbClcXC8vLnRlc3Qobm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBPdGhlcndpc2UgdXNlIHRoZSB2YWx1ZSBvZiB0aGUgc2NoZW1hdGljIGNvbGxlY3Rpb24ncyBlbmNhcHN1bGF0aW9uIG9wdGlvbiAoY3VycmVudCBkZWZhdWx0IG9mIGZhbHNlKVxuICByZXR1cm4gc2NoZW1hdGljRW5jYXBzdWxhdGlvbjtcbn1cblxuZXhwb3J0IGNsYXNzIFNjaGVtYXRpY0VuZ2luZUhvc3QgZXh0ZW5kcyBOb2RlTW9kdWxlc0VuZ2luZUhvc3Qge1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgX3Jlc29sdmVSZWZlcmVuY2VTdHJpbmcoXG4gICAgcmVmU3RyaW5nOiBzdHJpbmcsXG4gICAgcGFyZW50UGF0aDogc3RyaW5nLFxuICAgIGNvbGxlY3Rpb25EZXNjcmlwdGlvbj86IEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYyxcbiAgKSB7XG4gICAgY29uc3QgW3BhdGgsIG5hbWVdID0gcmVmU3RyaW5nLnNwbGl0KCcjJywgMik7XG4gICAgLy8gTWltaWMgYmVoYXZpb3Igb2YgRXhwb3J0U3RyaW5nUmVmIGNsYXNzIHVzZWQgaW4gZGVmYXVsdCBiZWhhdmlvclxuICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aFswXSA9PT0gJy4nID8gcmVzb2x2ZShwYXJlbnRQYXRoID8/IHByb2Nlc3MuY3dkKCksIHBhdGgpIDogcGF0aDtcblxuICAgIGNvbnN0IHNjaGVtYXRpY0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoZnVsbFBhdGgsIHsgcGF0aHM6IFtwYXJlbnRQYXRoXSB9KTtcblxuICAgIGlmIChzaG91bGRXcmFwU2NoZW1hdGljKHNjaGVtYXRpY0ZpbGUsICEhY29sbGVjdGlvbkRlc2NyaXB0aW9uPy5lbmNhcHN1bGF0aW9uKSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljUGF0aCA9IGRpcm5hbWUoc2NoZW1hdGljRmlsZSk7XG5cbiAgICAgIGNvbnN0IG1vZHVsZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHVua25vd24+KCk7XG4gICAgICBjb25zdCBmYWN0b3J5SW5pdGlhbGl6ZXIgPSB3cmFwKFxuICAgICAgICBzY2hlbWF0aWNGaWxlLFxuICAgICAgICBzY2hlbWF0aWNQYXRoLFxuICAgICAgICBtb2R1bGVDYWNoZSxcbiAgICAgICAgbmFtZSB8fCAnZGVmYXVsdCcsXG4gICAgICApIGFzICgpID0+IFJ1bGVGYWN0b3J5PHt9PjtcblxuICAgICAgY29uc3QgZmFjdG9yeSA9IGZhY3RvcnlJbml0aWFsaXplcigpO1xuICAgICAgaWYgKCFmYWN0b3J5IHx8IHR5cGVvZiBmYWN0b3J5ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyByZWY6IGZhY3RvcnksIHBhdGg6IHNjaGVtYXRpY1BhdGggfTtcbiAgICB9XG5cbiAgICAvLyBBbGwgb3RoZXIgc2NoZW1hdGljcyB1c2UgZGVmYXVsdCBiZWhhdmlvclxuICAgIHJldHVybiBzdXBlci5fcmVzb2x2ZVJlZmVyZW5jZVN0cmluZyhyZWZTdHJpbmcsIHBhcmVudFBhdGgsIGNvbGxlY3Rpb25EZXNjcmlwdGlvbik7XG4gIH1cbn1cblxuLyoqXG4gKiBNaW5pbWFsIHNoaW0gbW9kdWxlcyBmb3IgbGVnYWN5IGRlZXAgaW1wb3J0cyBvZiBgQHNjaGVtYXRpY3MvYW5ndWxhcmBcbiAqL1xuY29uc3QgbGVnYWN5TW9kdWxlczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvY29uZmlnJzoge1xuICAgIGdldFdvcmtzcGFjZShob3N0OiBUcmVlKSB7XG4gICAgICBjb25zdCBwYXRoID0gJy8uYW5ndWxhci5qc29uJztcbiAgICAgIGNvbnN0IGRhdGEgPSBob3N0LnJlYWQocGF0aCk7XG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICgke3BhdGh9KWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyc2VKc29uKGRhdGEudG9TdHJpbmcoKSwgW10sIHsgYWxsb3dUcmFpbGluZ0NvbW1hOiB0cnVlIH0pO1xuICAgIH0sXG4gIH0sXG4gICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvcHJvamVjdCc6IHtcbiAgICBidWlsZERlZmF1bHRQYXRoKHByb2plY3Q6IHsgc291cmNlUm9vdD86IHN0cmluZzsgcm9vdDogc3RyaW5nOyBwcm9qZWN0VHlwZTogc3RyaW5nIH0pOiBzdHJpbmcge1xuICAgICAgY29uc3Qgcm9vdCA9IHByb2plY3Quc291cmNlUm9vdCA/IGAvJHtwcm9qZWN0LnNvdXJjZVJvb3R9L2AgOiBgLyR7cHJvamVjdC5yb290fS9zcmMvYDtcblxuICAgICAgcmV0dXJuIGAke3Jvb3R9JHtwcm9qZWN0LnByb2plY3RUeXBlID09PSAnYXBwbGljYXRpb24nID8gJ2FwcCcgOiAnbGliJ31gO1xuICAgIH0sXG4gIH0sXG59O1xuXG4vKipcbiAqIFdyYXAgYSBKYXZhU2NyaXB0IGZpbGUgaW4gYSBWTSBjb250ZXh0IHRvIGFsbG93IHNwZWNpZmljIEFuZ3VsYXIgZGVwZW5kZW5jaWVzIHRvIGJlIHJlZGlyZWN0ZWQuXG4gKiBUaGlzIFZNIHNldHVwIGlzIE9OTFkgaW50ZW5kZWQgdG8gcmVkaXJlY3QgZGVwZW5kZW5jaWVzLlxuICpcbiAqIEBwYXJhbSBzY2hlbWF0aWNGaWxlIEEgSmF2YVNjcmlwdCBzY2hlbWF0aWMgZmlsZSBwYXRoIHRoYXQgc2hvdWxkIGJlIHdyYXBwZWQuXG4gKiBAcGFyYW0gc2NoZW1hdGljRGlyZWN0b3J5IEEgZGlyZWN0b3J5IHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBsb2NhdGlvbiBvZiB0aGUgSmF2YVNjcmlwdCBmaWxlLlxuICogQHBhcmFtIG1vZHVsZUNhY2hlIEEgbWFwIHRvIHVzZSBmb3IgY2FjaGluZyByZXBlYXQgbW9kdWxlIHVzYWdlIGFuZCBwcm9wZXIgYGluc3RhbmNlb2ZgIHN1cHBvcnQuXG4gKiBAcGFyYW0gZXhwb3J0TmFtZSBBbiBvcHRpb25hbCBuYW1lIG9mIGEgc3BlY2lmaWMgZXhwb3J0IHRvIHJldHVybi4gT3RoZXJ3aXNlLCByZXR1cm4gYWxsIGV4cG9ydHMuXG4gKi9cbmZ1bmN0aW9uIHdyYXAoXG4gIHNjaGVtYXRpY0ZpbGU6IHN0cmluZyxcbiAgc2NoZW1hdGljRGlyZWN0b3J5OiBzdHJpbmcsXG4gIG1vZHVsZUNhY2hlOiBNYXA8c3RyaW5nLCB1bmtub3duPixcbiAgZXhwb3J0TmFtZT86IHN0cmluZyxcbik6ICgpID0+IHVua25vd24ge1xuICBjb25zdCBob3N0UmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZShfX2ZpbGVuYW1lKTtcbiAgY29uc3Qgc2NoZW1hdGljUmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZShzY2hlbWF0aWNGaWxlKTtcblxuICBjb25zdCBjdXN0b21SZXF1aXJlID0gZnVuY3Rpb24gKGlkOiBzdHJpbmcpIHtcbiAgICBpZiAobGVnYWN5TW9kdWxlc1tpZF0pIHtcbiAgICAgIC8vIFByb3ZpZGUgY29tcGF0aWJpbGl0eSBtb2R1bGVzIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBAYW5ndWxhci9jZGtcbiAgICAgIHJldHVybiBsZWdhY3lNb2R1bGVzW2lkXTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJ3NjaGVtYXRpY3M6JykpIHtcbiAgICAgIC8vIFNjaGVtYXRpY3MgYnVpbHQtaW4gbW9kdWxlcyB1c2UgdGhlIGBzY2hlbWF0aWNzYCBzY2hlbWUgKHNpbWlsYXIgdG8gdGhlIE5vZGUuanMgYG5vZGVgIHNjaGVtZSlcbiAgICAgIGNvbnN0IGJ1aWx0aW5JZCA9IGlkLnNsaWNlKDExKTtcbiAgICAgIGNvbnN0IGJ1aWx0aW5Nb2R1bGUgPSBsb2FkQnVpbHRpbk1vZHVsZShidWlsdGluSWQpO1xuICAgICAgaWYgKCFidWlsdGluTW9kdWxlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5rbm93biBzY2hlbWF0aWNzIGJ1aWx0LWluIG1vZHVsZSAnJHtpZH0nIHJlcXVlc3RlZCBmcm9tIHNjaGVtYXRpYyAnJHtzY2hlbWF0aWNGaWxlfSdgLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYnVpbHRpbk1vZHVsZTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLWRldmtpdC8nKSB8fCBpZC5zdGFydHNXaXRoKCdAc2NoZW1hdGljcy8nKSkge1xuICAgICAgLy8gRmlsZXMgc2hvdWxkIG5vdCByZWRpcmVjdCBgQGFuZ3VsYXIvY29yZWAgYW5kIGluc3RlYWQgdXNlIHRoZSBkaXJlY3RcbiAgICAgIC8vIGRlcGVuZGVuY3kgaWYgYXZhaWxhYmxlLiBUaGlzIGFsbG93cyBvbGQgbWFqb3IgdmVyc2lvbiBtaWdyYXRpb25zIHRvIGNvbnRpbnVlIHRvIGZ1bmN0aW9uXG4gICAgICAvLyBldmVuIHRob3VnaCB0aGUgbGF0ZXN0IG1ham9yIHZlcnNpb24gbWF5IGhhdmUgYnJlYWtpbmcgY2hhbmdlcyBpbiBgQGFuZ3VsYXIvY29yZWAuXG4gICAgICBpZiAoaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXItZGV2a2l0L2NvcmUnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBzY2hlbWF0aWNSZXF1aXJlKGlkKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgIT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBmcm9tIGluc2lkZSB0aGUgYEBhbmd1bGFyL2NsaWAgcHJvamVjdFxuICAgICAgcmV0dXJuIGhvc3RSZXF1aXJlKGlkKTtcbiAgICB9IGVsc2UgaWYgKGlkLnN0YXJ0c1dpdGgoJy4nKSB8fCBpZC5zdGFydHNXaXRoKCdAYW5ndWxhci9jZGsnKSkge1xuICAgICAgLy8gV3JhcCByZWxhdGl2ZSBmaWxlcyBpbnNpZGUgdGhlIHNjaGVtYXRpYyBjb2xsZWN0aW9uXG4gICAgICAvLyBBbHNvIHdyYXAgYEBhbmd1bGFyL2Nka2AsIGl0IGNvbnRhaW5zIGhlbHBlciB1dGlsaXRpZXMgdGhhdCBpbXBvcnQgY29yZSBzY2hlbWF0aWMgcGFja2FnZXNcblxuICAgICAgLy8gUmVzb2x2ZSBmcm9tIHRoZSBvcmlnaW5hbCBmaWxlXG4gICAgICBjb25zdCBtb2R1bGVQYXRoID0gc2NoZW1hdGljUmVxdWlyZS5yZXNvbHZlKGlkKTtcblxuICAgICAgLy8gVXNlIGNhY2hlZCBtb2R1bGUgaWYgYXZhaWxhYmxlXG4gICAgICBjb25zdCBjYWNoZWRNb2R1bGUgPSBtb2R1bGVDYWNoZS5nZXQobW9kdWxlUGF0aCk7XG4gICAgICBpZiAoY2FjaGVkTW9kdWxlKSB7XG4gICAgICAgIHJldHVybiBjYWNoZWRNb2R1bGU7XG4gICAgICB9XG5cbiAgICAgIC8vIERvIG5vdCB3cmFwIHZlbmRvcmVkIHRoaXJkLXBhcnR5IHBhY2thZ2VzIG9yIEpTT04gZmlsZXNcbiAgICAgIGlmIChcbiAgICAgICAgIS9bL1xcXFxdbm9kZV9tb2R1bGVzWy9cXFxcXUBzY2hlbWF0aWNzWy9cXFxcXWFuZ3VsYXJbL1xcXFxddGhpcmRfcGFydHlbL1xcXFxdLy50ZXN0KG1vZHVsZVBhdGgpICYmXG4gICAgICAgICFtb2R1bGVQYXRoLmVuZHNXaXRoKCcuanNvbicpXG4gICAgICApIHtcbiAgICAgICAgLy8gV3JhcCBtb2R1bGUgYW5kIHNhdmUgaW4gY2FjaGVcbiAgICAgICAgY29uc3Qgd3JhcHBlZE1vZHVsZSA9IHdyYXAobW9kdWxlUGF0aCwgZGlybmFtZShtb2R1bGVQYXRoKSwgbW9kdWxlQ2FjaGUpKCk7XG4gICAgICAgIG1vZHVsZUNhY2hlLnNldChtb2R1bGVQYXRoLCB3cmFwcGVkTW9kdWxlKTtcblxuICAgICAgICByZXR1cm4gd3JhcHBlZE1vZHVsZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGwgb3RoZXJzIGFyZSByZXF1aXJlZCBkaXJlY3RseSBmcm9tIHRoZSBvcmlnaW5hbCBmaWxlXG4gICAgcmV0dXJuIHNjaGVtYXRpY1JlcXVpcmUoaWQpO1xuICB9O1xuXG4gIC8vIFNldHVwIGEgd3JhcHBlciBmdW5jdGlvbiB0byBjYXB0dXJlIHRoZSBtb2R1bGUncyBleHBvcnRzXG4gIGNvbnN0IHNjaGVtYXRpY0NvZGUgPSByZWFkRmlsZVN5bmMoc2NoZW1hdGljRmlsZSwgJ3V0ZjgnKTtcbiAgLy8gYG1vZHVsZWAgaXMgcmVxdWlyZWQgZHVlIHRvIEBhbmd1bGFyL2xvY2FsaXplIG5nLWFkZCBiZWluZyBpbiBVTUQgZm9ybWF0XG4gIGNvbnN0IGhlYWRlckNvZGUgPSAnKGZ1bmN0aW9uKCkge1xcbnZhciBleHBvcnRzID0ge307XFxudmFyIG1vZHVsZSA9IHsgZXhwb3J0cyB9O1xcbic7XG4gIGNvbnN0IGZvb3RlckNvZGUgPSBleHBvcnROYW1lXG4gICAgPyBgXFxucmV0dXJuIG1vZHVsZS5leHBvcnRzWycke2V4cG9ydE5hbWV9J107fSk7YFxuICAgIDogJ1xcbnJldHVybiBtb2R1bGUuZXhwb3J0czt9KTsnO1xuXG4gIGNvbnN0IHNjcmlwdCA9IG5ldyBTY3JpcHQoaGVhZGVyQ29kZSArIHNjaGVtYXRpY0NvZGUgKyBmb290ZXJDb2RlLCB7XG4gICAgZmlsZW5hbWU6IHNjaGVtYXRpY0ZpbGUsXG4gICAgbGluZU9mZnNldDogMyxcbiAgfSk7XG5cbiAgY29uc3QgY29udGV4dCA9IHtcbiAgICBfX2Rpcm5hbWU6IHNjaGVtYXRpY0RpcmVjdG9yeSxcbiAgICBfX2ZpbGVuYW1lOiBzY2hlbWF0aWNGaWxlLFxuICAgIEJ1ZmZlcixcbiAgICBjb25zb2xlLFxuICAgIHByb2Nlc3MsXG4gICAgZ2V0IGdsb2JhbCgpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcmVxdWlyZTogY3VzdG9tUmVxdWlyZSxcbiAgfTtcblxuICBjb25zdCBleHBvcnRzRmFjdG9yeSA9IHNjcmlwdC5ydW5Jbk5ld0NvbnRleHQoY29udGV4dCk7XG5cbiAgcmV0dXJuIGV4cG9ydHNGYWN0b3J5O1xufVxuXG5mdW5jdGlvbiBsb2FkQnVpbHRpbk1vZHVsZShpZDogc3RyaW5nKTogdW5rbm93biB7XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iXX0=