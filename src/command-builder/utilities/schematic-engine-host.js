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
function loadBuiltinModule(id) {
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvc2NoZW1hdGljLWVuZ2luZS1ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7QUFFSCwyREFBb0Y7QUFDcEYsNERBQW1HO0FBQ25HLDJCQUFrQztBQUNsQywrQ0FBa0Q7QUFDbEQsb0RBQWdDO0FBQ2hDLCtCQUF3QztBQUN4QywyQkFBNEI7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLHlCQUF5QixHQUFHLE1BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQywwQ0FBRSxXQUFXLEVBQUUsQ0FBQztBQUV0RixTQUFTLG1CQUFtQixDQUFDLGFBQXFCLEVBQUUsc0JBQStCO0lBQ2pGLHdDQUF3QztJQUN4QyxRQUFRLHlCQUF5QixFQUFFO1FBQ2pDLEtBQUssR0FBRyxDQUFDO1FBQ1QsS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLEtBQUssQ0FBQztRQUNYLEtBQUssTUFBTTtZQUNULE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxLQUFLO1lBQ1IsT0FBTyxJQUFJLENBQUM7S0FDZjtJQUVELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEUsa0VBQWtFO0lBQ2xFLHVEQUF1RDtJQUN2RCxtRkFBbUY7SUFDbkYsSUFDRSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7UUFDOUQsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsRUFDNUU7UUFDQSxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsbURBQW1EO0lBQ25ELCtEQUErRDtJQUMvRCxJQUFJLHVEQUF1RCxDQUFDLElBQUks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Q0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBRWpHLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBTSxDQUFDLFVBQVUsR0FBRyxhQUFhLEdBQUcsVUFBVSxFQUFFO1FBQ2pFLFFBQVEsRUFBRSxhQUFhO1FBQ3ZCLFVBQVUsRUFBRSxDQUFDO0tBQ2QsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQUc7UUFDZCxTQUFTLEVBQUUsa0JBQWtCO1FBQzdCLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLE1BQU07UUFDTixPQUFPO1FBQ1AsT0FBTztRQUNQLElBQUksTUFBTTtZQUNSLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sRUFBRSxhQUFhO0tBQ3ZCLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXZELE9BQU8sY0FBYyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEVBQVU7SUFDbkMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlRmFjdG9yeSwgU2NoZW1hdGljc0V4Y2VwdGlvbiwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzYywgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VKc29uIH0gZnJvbSAnanNvbmMtcGFyc2VyJztcbmltcG9ydCBub2RlTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTY3JpcHQgfSBmcm9tICd2bSc7XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdG8gY29udHJvbCBzY2hlbWF0aWMgcGFja2FnZSByZWRpcmVjdGlvblxuICovXG5jb25zdCBzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlID0gcHJvY2Vzcy5lbnZbJ05HX1NDSEVNQVRJQ19SRURJUkVDVCddPy50b0xvd2VyQ2FzZSgpO1xuXG5mdW5jdGlvbiBzaG91bGRXcmFwU2NoZW1hdGljKHNjaGVtYXRpY0ZpbGU6IHN0cmluZywgc2NoZW1hdGljRW5jYXBzdWxhdGlvbjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAvLyBDaGVjayBlbnZpcm9ubWVudCB2YXJpYWJsZSBpZiBwcmVzZW50XG4gIHN3aXRjaCAoc2NoZW1hdGljUmVkaXJlY3RWYXJpYWJsZSkge1xuICAgIGNhc2UgJzAnOlxuICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICBjYXNlICdvZmYnOlxuICAgIGNhc2UgJ25vbmUnOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgJ2FsbCc6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlID0gc2NoZW1hdGljRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vIE5ldmVyIHdyYXAgdGhlIGludGVybmFsIHVwZGF0ZSBzY2hlbWF0aWMgd2hlbiBleGVjdXRlZCBkaXJlY3RseVxuICAvLyBJdCBjb21tdW5pY2F0ZXMgd2l0aCB0aGUgdXBkYXRlIGNvbW1hbmQgdmlhIGBnbG9iYWxgXG4gIC8vIEJ1dCB3ZSBzdGlsbCB3YW50IHRvIHJlZGlyZWN0IHNjaGVtYXRpY3MgbG9jYXRlZCBpbiBgQGFuZ3VsYXIvY2xpL25vZGVfbW9kdWxlc2AuXG4gIGlmIChcbiAgICBub3JtYWxpemVkU2NoZW1hdGljRmlsZS5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS8nKSAmJlxuICAgICFub3JtYWxpemVkU2NoZW1hdGljRmlsZS5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS9ub2RlX21vZHVsZXMvJylcbiAgKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIGZpcnN0LXBhcnR5IEFuZ3VsYXIgc2NoZW1hdGljIHBhY2thZ2VzXG4gIC8vIEFuZ3VsYXIgc2NoZW1hdGljcyBhcmUgc2FmZSB0byB1c2UgaW4gdGhlIHdyYXBwZWQgVk0gY29udGV4dFxuICBpZiAoL1xcL25vZGVfbW9kdWxlc1xcL0AoPzphbmd1bGFyfHNjaGVtYXRpY3N8bmd1bml2ZXJzYWwpXFwvLy50ZXN0KG5vcm1hbGl6ZWRTY2hlbWF0aWNGaWxlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gT3RoZXJ3aXNlIHVzZSB0aGUgdmFsdWUgb2YgdGhlIHNjaGVtYXRpYyBjb2xsZWN0aW9uJ3MgZW5jYXBzdWxhdGlvbiBvcHRpb24gKGN1cnJlbnQgZGVmYXVsdCBvZiBmYWxzZSlcbiAgcmV0dXJuIHNjaGVtYXRpY0VuY2Fwc3VsYXRpb247XG59XG5cbmV4cG9ydCBjbGFzcyBTY2hlbWF0aWNFbmdpbmVIb3N0IGV4dGVuZHMgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IHtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIF9yZXNvbHZlUmVmZXJlbmNlU3RyaW5nKFxuICAgIHJlZlN0cmluZzogc3RyaW5nLFxuICAgIHBhcmVudFBhdGg6IHN0cmluZyxcbiAgICBjb2xsZWN0aW9uRGVzY3JpcHRpb24/OiBGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2MsXG4gICkge1xuICAgIGNvbnN0IFtwYXRoLCBuYW1lXSA9IHJlZlN0cmluZy5zcGxpdCgnIycsIDIpO1xuICAgIC8vIE1pbWljIGJlaGF2aW9yIG9mIEV4cG9ydFN0cmluZ1JlZiBjbGFzcyB1c2VkIGluIGRlZmF1bHQgYmVoYXZpb3JcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGhbMF0gPT09ICcuJyA/IHJlc29sdmUocGFyZW50UGF0aCA/PyBwcm9jZXNzLmN3ZCgpLCBwYXRoKSA6IHBhdGg7XG5cbiAgICBjb25zdCBzY2hlbWF0aWNGaWxlID0gcmVxdWlyZS5yZXNvbHZlKGZ1bGxQYXRoLCB7IHBhdGhzOiBbcGFyZW50UGF0aF0gfSk7XG5cbiAgICBpZiAoc2hvdWxkV3JhcFNjaGVtYXRpYyhzY2hlbWF0aWNGaWxlLCAhIWNvbGxlY3Rpb25EZXNjcmlwdGlvbj8uZW5jYXBzdWxhdGlvbikpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY1BhdGggPSBkaXJuYW1lKHNjaGVtYXRpY0ZpbGUpO1xuXG4gICAgICBjb25zdCBtb2R1bGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpO1xuICAgICAgY29uc3QgZmFjdG9yeUluaXRpYWxpemVyID0gd3JhcChcbiAgICAgICAgc2NoZW1hdGljRmlsZSxcbiAgICAgICAgc2NoZW1hdGljUGF0aCxcbiAgICAgICAgbW9kdWxlQ2FjaGUsXG4gICAgICAgIG5hbWUgfHwgJ2RlZmF1bHQnLFxuICAgICAgKSBhcyAoKSA9PiBSdWxlRmFjdG9yeTx7fT47XG5cbiAgICAgIGNvbnN0IGZhY3RvcnkgPSBmYWN0b3J5SW5pdGlhbGl6ZXIoKTtcbiAgICAgIGlmICghZmFjdG9yeSB8fCB0eXBlb2YgZmFjdG9yeSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgcmVmOiBmYWN0b3J5LCBwYXRoOiBzY2hlbWF0aWNQYXRoIH07XG4gICAgfVxuXG4gICAgLy8gQWxsIG90aGVyIHNjaGVtYXRpY3MgdXNlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICByZXR1cm4gc3VwZXIuX3Jlc29sdmVSZWZlcmVuY2VTdHJpbmcocmVmU3RyaW5nLCBwYXJlbnRQYXRoLCBjb2xsZWN0aW9uRGVzY3JpcHRpb24pO1xuICB9XG59XG5cbi8qKlxuICogTWluaW1hbCBzaGltIG1vZHVsZXMgZm9yIGxlZ2FjeSBkZWVwIGltcG9ydHMgb2YgYEBzY2hlbWF0aWNzL2FuZ3VsYXJgXG4gKi9cbmNvbnN0IGxlZ2FjeU1vZHVsZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2NvbmZpZyc6IHtcbiAgICBnZXRXb3Jrc3BhY2UoaG9zdDogVHJlZSkge1xuICAgICAgY29uc3QgcGF0aCA9ICcvLmFuZ3VsYXIuanNvbic7XG4gICAgICBjb25zdCBkYXRhID0gaG9zdC5yZWFkKHBhdGgpO1xuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCAoJHtwYXRofSlgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcnNlSnNvbihkYXRhLnRvU3RyaW5nKCksIFtdLCB7IGFsbG93VHJhaWxpbmdDb21tYTogdHJ1ZSB9KTtcbiAgICB9LFxuICB9LFxuICAnQHNjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3Byb2plY3QnOiB7XG4gICAgYnVpbGREZWZhdWx0UGF0aChwcm9qZWN0OiB7IHNvdXJjZVJvb3Q/OiBzdHJpbmc7IHJvb3Q6IHN0cmluZzsgcHJvamVjdFR5cGU6IHN0cmluZyB9KTogc3RyaW5nIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBwcm9qZWN0LnNvdXJjZVJvb3QgPyBgLyR7cHJvamVjdC5zb3VyY2VSb290fS9gIDogYC8ke3Byb2plY3Qucm9vdH0vc3JjL2A7XG5cbiAgICAgIHJldHVybiBgJHtyb290fSR7cHJvamVjdC5wcm9qZWN0VHlwZSA9PT0gJ2FwcGxpY2F0aW9uJyA/ICdhcHAnIDogJ2xpYid9YDtcbiAgICB9LFxuICB9LFxufTtcblxuLyoqXG4gKiBXcmFwIGEgSmF2YVNjcmlwdCBmaWxlIGluIGEgVk0gY29udGV4dCB0byBhbGxvdyBzcGVjaWZpYyBBbmd1bGFyIGRlcGVuZGVuY2llcyB0byBiZSByZWRpcmVjdGVkLlxuICogVGhpcyBWTSBzZXR1cCBpcyBPTkxZIGludGVuZGVkIHRvIHJlZGlyZWN0IGRlcGVuZGVuY2llcy5cbiAqXG4gKiBAcGFyYW0gc2NoZW1hdGljRmlsZSBBIEphdmFTY3JpcHQgc2NoZW1hdGljIGZpbGUgcGF0aCB0aGF0IHNob3VsZCBiZSB3cmFwcGVkLlxuICogQHBhcmFtIHNjaGVtYXRpY0RpcmVjdG9yeSBBIGRpcmVjdG9yeSB0aGF0IHdpbGwgYmUgdXNlZCBhcyB0aGUgbG9jYXRpb24gb2YgdGhlIEphdmFTY3JpcHQgZmlsZS5cbiAqIEBwYXJhbSBtb2R1bGVDYWNoZSBBIG1hcCB0byB1c2UgZm9yIGNhY2hpbmcgcmVwZWF0IG1vZHVsZSB1c2FnZSBhbmQgcHJvcGVyIGBpbnN0YW5jZW9mYCBzdXBwb3J0LlxuICogQHBhcmFtIGV4cG9ydE5hbWUgQW4gb3B0aW9uYWwgbmFtZSBvZiBhIHNwZWNpZmljIGV4cG9ydCB0byByZXR1cm4uIE90aGVyd2lzZSwgcmV0dXJuIGFsbCBleHBvcnRzLlxuICovXG5mdW5jdGlvbiB3cmFwKFxuICBzY2hlbWF0aWNGaWxlOiBzdHJpbmcsXG4gIHNjaGVtYXRpY0RpcmVjdG9yeTogc3RyaW5nLFxuICBtb2R1bGVDYWNoZTogTWFwPHN0cmluZywgdW5rbm93bj4sXG4gIGV4cG9ydE5hbWU/OiBzdHJpbmcsXG4pOiAoKSA9PiB1bmtub3duIHtcbiAgY29uc3QgaG9zdFJlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUoX19maWxlbmFtZSk7XG4gIGNvbnN0IHNjaGVtYXRpY1JlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUoc2NoZW1hdGljRmlsZSk7XG5cbiAgY29uc3QgY3VzdG9tUmVxdWlyZSA9IGZ1bmN0aW9uIChpZDogc3RyaW5nKSB7XG4gICAgaWYgKGxlZ2FjeU1vZHVsZXNbaWRdKSB7XG4gICAgICAvLyBQcm92aWRlIGNvbXBhdGliaWxpdHkgbW9kdWxlcyBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQGFuZ3VsYXIvY2RrXG4gICAgICByZXR1cm4gbGVnYWN5TW9kdWxlc1tpZF07XG4gICAgfSBlbHNlIGlmIChpZC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzOicpKSB7XG4gICAgICAvLyBTY2hlbWF0aWNzIGJ1aWx0LWluIG1vZHVsZXMgdXNlIHRoZSBgc2NoZW1hdGljc2Agc2NoZW1lIChzaW1pbGFyIHRvIHRoZSBOb2RlLmpzIGBub2RlYCBzY2hlbWUpXG4gICAgICBjb25zdCBidWlsdGluSWQgPSBpZC5zbGljZSgxMSk7XG4gICAgICBjb25zdCBidWlsdGluTW9kdWxlID0gbG9hZEJ1aWx0aW5Nb2R1bGUoYnVpbHRpbklkKTtcbiAgICAgIGlmICghYnVpbHRpbk1vZHVsZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVua25vd24gc2NoZW1hdGljcyBidWlsdC1pbiBtb2R1bGUgJyR7aWR9JyByZXF1ZXN0ZWQgZnJvbSBzY2hlbWF0aWMgJyR7c2NoZW1hdGljRmlsZX0nYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1aWx0aW5Nb2R1bGU7XG4gICAgfSBlbHNlIGlmIChpZC5zdGFydHNXaXRoKCdAYW5ndWxhci1kZXZraXQvJykgfHwgaWQuc3RhcnRzV2l0aCgnQHNjaGVtYXRpY3MvJykpIHtcbiAgICAgIC8vIEZpbGVzIHNob3VsZCBub3QgcmVkaXJlY3QgYEBhbmd1bGFyL2NvcmVgIGFuZCBpbnN0ZWFkIHVzZSB0aGUgZGlyZWN0XG4gICAgICAvLyBkZXBlbmRlbmN5IGlmIGF2YWlsYWJsZS4gVGhpcyBhbGxvd3Mgb2xkIG1ham9yIHZlcnNpb24gbWlncmF0aW9ucyB0byBjb250aW51ZSB0byBmdW5jdGlvblxuICAgICAgLy8gZXZlbiB0aG91Z2ggdGhlIGxhdGVzdCBtYWpvciB2ZXJzaW9uIG1heSBoYXZlIGJyZWFraW5nIGNoYW5nZXMgaW4gYEBhbmd1bGFyL2NvcmVgLlxuICAgICAgaWYgKGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJykpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gc2NoZW1hdGljUmVxdWlyZShpZCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlICE9PSAnTU9EVUxFX05PVF9GT1VORCcpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc29sdmUgZnJvbSBpbnNpZGUgdGhlIGBAYW5ndWxhci9jbGlgIHByb2plY3RcbiAgICAgIHJldHVybiBob3N0UmVxdWlyZShpZCk7XG4gICAgfSBlbHNlIGlmIChpZC5zdGFydHNXaXRoKCcuJykgfHwgaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvY2RrJykpIHtcbiAgICAgIC8vIFdyYXAgcmVsYXRpdmUgZmlsZXMgaW5zaWRlIHRoZSBzY2hlbWF0aWMgY29sbGVjdGlvblxuICAgICAgLy8gQWxzbyB3cmFwIGBAYW5ndWxhci9jZGtgLCBpdCBjb250YWlucyBoZWxwZXIgdXRpbGl0aWVzIHRoYXQgaW1wb3J0IGNvcmUgc2NoZW1hdGljIHBhY2thZ2VzXG5cbiAgICAgIC8vIFJlc29sdmUgZnJvbSB0aGUgb3JpZ2luYWwgZmlsZVxuICAgICAgY29uc3QgbW9kdWxlUGF0aCA9IHNjaGVtYXRpY1JlcXVpcmUucmVzb2x2ZShpZCk7XG5cbiAgICAgIC8vIFVzZSBjYWNoZWQgbW9kdWxlIGlmIGF2YWlsYWJsZVxuICAgICAgY29uc3QgY2FjaGVkTW9kdWxlID0gbW9kdWxlQ2FjaGUuZ2V0KG1vZHVsZVBhdGgpO1xuICAgICAgaWYgKGNhY2hlZE1vZHVsZSkge1xuICAgICAgICByZXR1cm4gY2FjaGVkTW9kdWxlO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyBub3Qgd3JhcCB2ZW5kb3JlZCB0aGlyZC1wYXJ0eSBwYWNrYWdlcyBvciBKU09OIGZpbGVzXG4gICAgICBpZiAoXG4gICAgICAgICEvWy9cXFxcXW5vZGVfbW9kdWxlc1svXFxcXF1Ac2NoZW1hdGljc1svXFxcXF1hbmd1bGFyWy9cXFxcXXRoaXJkX3BhcnR5Wy9cXFxcXS8udGVzdChtb2R1bGVQYXRoKSAmJlxuICAgICAgICAhbW9kdWxlUGF0aC5lbmRzV2l0aCgnLmpzb24nKVxuICAgICAgKSB7XG4gICAgICAgIC8vIFdyYXAgbW9kdWxlIGFuZCBzYXZlIGluIGNhY2hlXG4gICAgICAgIGNvbnN0IHdyYXBwZWRNb2R1bGUgPSB3cmFwKG1vZHVsZVBhdGgsIGRpcm5hbWUobW9kdWxlUGF0aCksIG1vZHVsZUNhY2hlKSgpO1xuICAgICAgICBtb2R1bGVDYWNoZS5zZXQobW9kdWxlUGF0aCwgd3JhcHBlZE1vZHVsZSk7XG5cbiAgICAgICAgcmV0dXJuIHdyYXBwZWRNb2R1bGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIG90aGVycyBhcmUgcmVxdWlyZWQgZGlyZWN0bHkgZnJvbSB0aGUgb3JpZ2luYWwgZmlsZVxuICAgIHJldHVybiBzY2hlbWF0aWNSZXF1aXJlKGlkKTtcbiAgfTtcblxuICAvLyBTZXR1cCBhIHdyYXBwZXIgZnVuY3Rpb24gdG8gY2FwdHVyZSB0aGUgbW9kdWxlJ3MgZXhwb3J0c1xuICBjb25zdCBzY2hlbWF0aWNDb2RlID0gcmVhZEZpbGVTeW5jKHNjaGVtYXRpY0ZpbGUsICd1dGY4Jyk7XG4gIC8vIGBtb2R1bGVgIGlzIHJlcXVpcmVkIGR1ZSB0byBAYW5ndWxhci9sb2NhbGl6ZSBuZy1hZGQgYmVpbmcgaW4gVU1EIGZvcm1hdFxuICBjb25zdCBoZWFkZXJDb2RlID0gJyhmdW5jdGlvbigpIHtcXG52YXIgZXhwb3J0cyA9IHt9O1xcbnZhciBtb2R1bGUgPSB7IGV4cG9ydHMgfTtcXG4nO1xuICBjb25zdCBmb290ZXJDb2RlID0gZXhwb3J0TmFtZSA/IGBcXG5yZXR1cm4gZXhwb3J0c1snJHtleHBvcnROYW1lfSddO30pO2AgOiAnXFxucmV0dXJuIGV4cG9ydHM7fSk7JztcblxuICBjb25zdCBzY3JpcHQgPSBuZXcgU2NyaXB0KGhlYWRlckNvZGUgKyBzY2hlbWF0aWNDb2RlICsgZm9vdGVyQ29kZSwge1xuICAgIGZpbGVuYW1lOiBzY2hlbWF0aWNGaWxlLFxuICAgIGxpbmVPZmZzZXQ6IDMsXG4gIH0pO1xuXG4gIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgX19kaXJuYW1lOiBzY2hlbWF0aWNEaXJlY3RvcnksXG4gICAgX19maWxlbmFtZTogc2NoZW1hdGljRmlsZSxcbiAgICBCdWZmZXIsXG4gICAgY29uc29sZSxcbiAgICBwcm9jZXNzLFxuICAgIGdldCBnbG9iYWwoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlcXVpcmU6IGN1c3RvbVJlcXVpcmUsXG4gIH07XG5cbiAgY29uc3QgZXhwb3J0c0ZhY3RvcnkgPSBzY3JpcHQucnVuSW5OZXdDb250ZXh0KGNvbnRleHQpO1xuXG4gIHJldHVybiBleHBvcnRzRmFjdG9yeTtcbn1cblxuZnVuY3Rpb24gbG9hZEJ1aWx0aW5Nb2R1bGUoaWQ6IHN0cmluZyk6IHVua25vd24ge1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIl19