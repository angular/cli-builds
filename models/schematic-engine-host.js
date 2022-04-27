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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLWVuZ2luZS1ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7O0FBRUgsMkRBQW9GO0FBQ3BGLDREQUF5RTtBQUN6RSwyQkFBa0M7QUFDbEMsK0NBQWtEO0FBQ2xELG9EQUFnQztBQUNoQywrQkFBd0M7QUFDeEMsMkJBQTRCO0FBRTVCOzs7R0FHRztBQUNILE1BQU0seUJBQXlCLEdBQUcsTUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLDBDQUFFLFdBQVcsRUFBRSxDQUFDO0FBRXRGLFNBQVMsbUJBQW1CLENBQUMsYUFBcUI7SUFDaEQsd0NBQXdDO0lBQ3hDLElBQUkseUJBQXlCLEtBQUssU0FBUyxFQUFFO1FBQzNDLFFBQVEseUJBQXlCLEVBQUU7WUFDakMsS0FBSyxHQUFHLENBQUM7WUFDVCxLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNO2dCQUNULE9BQU8sS0FBSyxDQUFDO1lBQ2YsS0FBSyxLQUFLO2dCQUNSLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7S0FDRjtJQUVELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEUsa0VBQWtFO0lBQ2xFLHVEQUF1RDtJQUN2RCxtRkFBbUY7SUFDbkYsSUFDRSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7UUFDOUQsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsRUFDNUU7UUFDQSxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQseURBQXlEO0lBQ3pELCtEQUErRDtJQUMvRCxPQUFPLHVEQUF1RCxDQUFDLElBQUks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KiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZUZhY3RvcnksIFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlTW9kdWxlc0VuZ2luZUhvc3QgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZUpzb24gfSBmcm9tICdqc29uYy1wYXJzZXInO1xuaW1wb3J0IG5vZGVNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNjcmlwdCB9IGZyb20gJ3ZtJztcblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB0byBjb250cm9sIHNjaGVtYXRpYyBwYWNrYWdlIHJlZGlyZWN0aW9uXG4gKiBEZWZhdWx0OiBBbmd1bGFyIHNjaGVtYXRpY3Mgb25seVxuICovXG5jb25zdCBzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlID0gcHJvY2Vzcy5lbnZbJ05HX1NDSEVNQVRJQ19SRURJUkVDVCddPy50b0xvd2VyQ2FzZSgpO1xuXG5mdW5jdGlvbiBzaG91bGRXcmFwU2NoZW1hdGljKHNjaGVtYXRpY0ZpbGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAvLyBDaGVjayBlbnZpcm9ubWVudCB2YXJpYWJsZSBpZiBwcmVzZW50XG4gIGlmIChzY2hlbWF0aWNSZWRpcmVjdFZhcmlhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICBzd2l0Y2ggKHNjaGVtYXRpY1JlZGlyZWN0VmFyaWFibGUpIHtcbiAgICAgIGNhc2UgJzAnOlxuICAgICAgY2FzZSAnZmFsc2UnOlxuICAgICAgY2FzZSAnb2ZmJzpcbiAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBjYXNlICdhbGwnOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkU2NoZW1hdGljRmlsZSA9IHNjaGVtYXRpY0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyBOZXZlciB3cmFwIHRoZSBpbnRlcm5hbCB1cGRhdGUgc2NoZW1hdGljIHdoZW4gZXhlY3V0ZWQgZGlyZWN0bHlcbiAgLy8gSXQgY29tbXVuaWNhdGVzIHdpdGggdGhlIHVwZGF0ZSBjb21tYW5kIHZpYSBgZ2xvYmFsYFxuICAvLyBCdXQgd2Ugc3RpbGwgd2FudCB0byByZWRpcmVjdCBzY2hlbWF0aWNzIGxvY2F0ZWQgaW4gYEBhbmd1bGFyL2NsaS9ub2RlX21vZHVsZXNgLlxuICBpZiAoXG4gICAgbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvJykgJiZcbiAgICAhbm9ybWFsaXplZFNjaGVtYXRpY0ZpbGUuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbm9kZV9tb2R1bGVzLycpXG4gICkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIERlZmF1bHQgaXMgb25seSBmaXJzdC1wYXJ0eSBBbmd1bGFyIHNjaGVtYXRpYyBwYWNrYWdlc1xuICAvLyBBbmd1bGFyIHNjaGVtYXRpY3MgYXJlIHNhZmUgdG8gdXNlIGluIHRoZSB3cmFwcGVkIFZNIGNvbnRleHRcbiAgcmV0dXJuIC9cXC9ub2RlX21vZHVsZXNcXC9AKD86YW5ndWxhcnxzY2hlbWF0aWNzfG5ndW5pdmVyc2FsKVxcLy8udGVzdChub3JtYWxpemVkU2NoZW1hdGljRmlsZSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTY2hlbWF0aWNFbmdpbmVIb3N0IGV4dGVuZHMgTm9kZU1vZHVsZXNFbmdpbmVIb3N0IHtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIF9yZXNvbHZlUmVmZXJlbmNlU3RyaW5nKHJlZlN0cmluZzogc3RyaW5nLCBwYXJlbnRQYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBbcGF0aCwgbmFtZV0gPSByZWZTdHJpbmcuc3BsaXQoJyMnLCAyKTtcbiAgICAvLyBNaW1pYyBiZWhhdmlvciBvZiBFeHBvcnRTdHJpbmdSZWYgY2xhc3MgdXNlZCBpbiBkZWZhdWx0IGJlaGF2aW9yXG4gICAgY29uc3QgZnVsbFBhdGggPSBwYXRoWzBdID09PSAnLicgPyByZXNvbHZlKHBhcmVudFBhdGggPz8gcHJvY2Vzcy5jd2QoKSwgcGF0aCkgOiBwYXRoO1xuXG4gICAgY29uc3Qgc2NoZW1hdGljRmlsZSA9IHJlcXVpcmUucmVzb2x2ZShmdWxsUGF0aCwgeyBwYXRoczogW3BhcmVudFBhdGhdIH0pO1xuXG4gICAgaWYgKHNob3VsZFdyYXBTY2hlbWF0aWMoc2NoZW1hdGljRmlsZSkpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY1BhdGggPSBkaXJuYW1lKHNjaGVtYXRpY0ZpbGUpO1xuXG4gICAgICBjb25zdCBtb2R1bGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpO1xuICAgICAgY29uc3QgZmFjdG9yeUluaXRpYWxpemVyID0gd3JhcChcbiAgICAgICAgc2NoZW1hdGljRmlsZSxcbiAgICAgICAgc2NoZW1hdGljUGF0aCxcbiAgICAgICAgbW9kdWxlQ2FjaGUsXG4gICAgICAgIG5hbWUgfHwgJ2RlZmF1bHQnLFxuICAgICAgKSBhcyAoKSA9PiBSdWxlRmFjdG9yeTx7fT47XG5cbiAgICAgIGNvbnN0IGZhY3RvcnkgPSBmYWN0b3J5SW5pdGlhbGl6ZXIoKTtcbiAgICAgIGlmICghZmFjdG9yeSB8fCB0eXBlb2YgZmFjdG9yeSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgcmVmOiBmYWN0b3J5LCBwYXRoOiBzY2hlbWF0aWNQYXRoIH07XG4gICAgfVxuXG4gICAgLy8gQWxsIG90aGVyIHNjaGVtYXRpY3MgdXNlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICByZXR1cm4gc3VwZXIuX3Jlc29sdmVSZWZlcmVuY2VTdHJpbmcocmVmU3RyaW5nLCBwYXJlbnRQYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIE1pbmltYWwgc2hpbSBtb2R1bGVzIGZvciBsZWdhY3kgZGVlcCBpbXBvcnRzIG9mIGBAc2NoZW1hdGljcy9hbmd1bGFyYFxuICovXG5jb25zdCBsZWdhY3lNb2R1bGVzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9jb25maWcnOiB7XG4gICAgZ2V0V29ya3NwYWNlKGhvc3Q6IFRyZWUpIHtcbiAgICAgIGNvbnN0IHBhdGggPSAnLy5hbmd1bGFyLmpzb24nO1xuICAgICAgY29uc3QgZGF0YSA9IGhvc3QucmVhZChwYXRoKTtcbiAgICAgIGlmICghZGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgKCR7cGF0aH0pYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwYXJzZUpzb24oZGF0YS50b1N0cmluZygpLCBbXSwgeyBhbGxvd1RyYWlsaW5nQ29tbWE6IHRydWUgfSk7XG4gICAgfSxcbiAgfSxcbiAgJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9wcm9qZWN0Jzoge1xuICAgIGJ1aWxkRGVmYXVsdFBhdGgocHJvamVjdDogeyBzb3VyY2VSb290Pzogc3RyaW5nOyByb290OiBzdHJpbmc7IHByb2plY3RUeXBlOiBzdHJpbmcgfSk6IHN0cmluZyB7XG4gICAgICBjb25zdCByb290ID0gcHJvamVjdC5zb3VyY2VSb290ID8gYC8ke3Byb2plY3Quc291cmNlUm9vdH0vYCA6IGAvJHtwcm9qZWN0LnJvb3R9L3NyYy9gO1xuXG4gICAgICByZXR1cm4gYCR7cm9vdH0ke3Byb2plY3QucHJvamVjdFR5cGUgPT09ICdhcHBsaWNhdGlvbicgPyAnYXBwJyA6ICdsaWInfWA7XG4gICAgfSxcbiAgfSxcbn07XG5cbi8qKlxuICogV3JhcCBhIEphdmFTY3JpcHQgZmlsZSBpbiBhIFZNIGNvbnRleHQgdG8gYWxsb3cgc3BlY2lmaWMgQW5ndWxhciBkZXBlbmRlbmNpZXMgdG8gYmUgcmVkaXJlY3RlZC5cbiAqIFRoaXMgVk0gc2V0dXAgaXMgT05MWSBpbnRlbmRlZCB0byByZWRpcmVjdCBkZXBlbmRlbmNpZXMuXG4gKlxuICogQHBhcmFtIHNjaGVtYXRpY0ZpbGUgQSBKYXZhU2NyaXB0IHNjaGVtYXRpYyBmaWxlIHBhdGggdGhhdCBzaG91bGQgYmUgd3JhcHBlZC5cbiAqIEBwYXJhbSBzY2hlbWF0aWNEaXJlY3RvcnkgQSBkaXJlY3RvcnkgdGhhdCB3aWxsIGJlIHVzZWQgYXMgdGhlIGxvY2F0aW9uIG9mIHRoZSBKYXZhU2NyaXB0IGZpbGUuXG4gKiBAcGFyYW0gbW9kdWxlQ2FjaGUgQSBtYXAgdG8gdXNlIGZvciBjYWNoaW5nIHJlcGVhdCBtb2R1bGUgdXNhZ2UgYW5kIHByb3BlciBgaW5zdGFuY2VvZmAgc3VwcG9ydC5cbiAqIEBwYXJhbSBleHBvcnROYW1lIEFuIG9wdGlvbmFsIG5hbWUgb2YgYSBzcGVjaWZpYyBleHBvcnQgdG8gcmV0dXJuLiBPdGhlcndpc2UsIHJldHVybiBhbGwgZXhwb3J0cy5cbiAqL1xuZnVuY3Rpb24gd3JhcChcbiAgc2NoZW1hdGljRmlsZTogc3RyaW5nLFxuICBzY2hlbWF0aWNEaXJlY3Rvcnk6IHN0cmluZyxcbiAgbW9kdWxlQ2FjaGU6IE1hcDxzdHJpbmcsIHVua25vd24+LFxuICBleHBvcnROYW1lPzogc3RyaW5nLFxuKTogKCkgPT4gdW5rbm93biB7XG4gIGNvbnN0IGhvc3RSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKF9fZmlsZW5hbWUpO1xuICBjb25zdCBzY2hlbWF0aWNSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHNjaGVtYXRpY0ZpbGUpO1xuXG4gIGNvbnN0IGN1c3RvbVJlcXVpcmUgPSBmdW5jdGlvbiAoaWQ6IHN0cmluZykge1xuICAgIGlmIChsZWdhY3lNb2R1bGVzW2lkXSkge1xuICAgICAgLy8gUHJvdmlkZSBjb21wYXRpYmlsaXR5IG1vZHVsZXMgZm9yIG9sZGVyIHZlcnNpb25zIG9mIEBhbmd1bGFyL2Nka1xuICAgICAgcmV0dXJuIGxlZ2FjeU1vZHVsZXNbaWRdO1xuICAgIH0gZWxzZSBpZiAoaWQuc3RhcnRzV2l0aCgnQGFuZ3VsYXItZGV2a2l0LycpIHx8IGlkLnN0YXJ0c1dpdGgoJ0BzY2hlbWF0aWNzLycpKSB7XG4gICAgICAvLyBGaWxlcyBzaG91bGQgbm90IHJlZGlyZWN0IGBAYW5ndWxhci9jb3JlYCBhbmQgaW5zdGVhZCB1c2UgdGhlIGRpcmVjdFxuICAgICAgLy8gZGVwZW5kZW5jeSBpZiBhdmFpbGFibGUuIFRoaXMgYWxsb3dzIG9sZCBtYWpvciB2ZXJzaW9uIG1pZ3JhdGlvbnMgdG8gY29udGludWUgdG8gZnVuY3Rpb25cbiAgICAgIC8vIGV2ZW4gdGhvdWdoIHRoZSBsYXRlc3QgbWFqb3IgdmVyc2lvbiBtYXkgaGF2ZSBicmVha2luZyBjaGFuZ2VzIGluIGBAYW5ndWxhci9jb3JlYC5cbiAgICAgIGlmIChpZC5zdGFydHNXaXRoKCdAYW5ndWxhci1kZXZraXQvY29yZScpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHNjaGVtYXRpY1JlcXVpcmUoaWQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUuY29kZSAhPT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIGZyb20gaW5zaWRlIHRoZSBgQGFuZ3VsYXIvY2xpYCBwcm9qZWN0XG4gICAgICByZXR1cm4gaG9zdFJlcXVpcmUoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQuc3RhcnRzV2l0aCgnLicpIHx8IGlkLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyL2NkaycpKSB7XG4gICAgICAvLyBXcmFwIHJlbGF0aXZlIGZpbGVzIGluc2lkZSB0aGUgc2NoZW1hdGljIGNvbGxlY3Rpb25cbiAgICAgIC8vIEFsc28gd3JhcCBgQGFuZ3VsYXIvY2RrYCwgaXQgY29udGFpbnMgaGVscGVyIHV0aWxpdGllcyB0aGF0IGltcG9ydCBjb3JlIHNjaGVtYXRpYyBwYWNrYWdlc1xuXG4gICAgICAvLyBSZXNvbHZlIGZyb20gdGhlIG9yaWdpbmFsIGZpbGVcbiAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBzY2hlbWF0aWNSZXF1aXJlLnJlc29sdmUoaWQpO1xuXG4gICAgICAvLyBVc2UgY2FjaGVkIG1vZHVsZSBpZiBhdmFpbGFibGVcbiAgICAgIGNvbnN0IGNhY2hlZE1vZHVsZSA9IG1vZHVsZUNhY2hlLmdldChtb2R1bGVQYXRoKTtcbiAgICAgIGlmIChjYWNoZWRNb2R1bGUpIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlZE1vZHVsZTtcbiAgICAgIH1cblxuICAgICAgLy8gRG8gbm90IHdyYXAgdmVuZG9yZWQgdGhpcmQtcGFydHkgcGFja2FnZXMgb3IgSlNPTiBmaWxlc1xuICAgICAgaWYgKFxuICAgICAgICAhL1svXFxcXF1ub2RlX21vZHVsZXNbL1xcXFxdQHNjaGVtYXRpY3NbL1xcXFxdYW5ndWxhclsvXFxcXF10aGlyZF9wYXJ0eVsvXFxcXF0vLnRlc3QobW9kdWxlUGF0aCkgJiZcbiAgICAgICAgIW1vZHVsZVBhdGguZW5kc1dpdGgoJy5qc29uJylcbiAgICAgICkge1xuICAgICAgICAvLyBXcmFwIG1vZHVsZSBhbmQgc2F2ZSBpbiBjYWNoZVxuICAgICAgICBjb25zdCB3cmFwcGVkTW9kdWxlID0gd3JhcChtb2R1bGVQYXRoLCBkaXJuYW1lKG1vZHVsZVBhdGgpLCBtb2R1bGVDYWNoZSkoKTtcbiAgICAgICAgbW9kdWxlQ2FjaGUuc2V0KG1vZHVsZVBhdGgsIHdyYXBwZWRNb2R1bGUpO1xuXG4gICAgICAgIHJldHVybiB3cmFwcGVkTW9kdWxlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCBvdGhlcnMgYXJlIHJlcXVpcmVkIGRpcmVjdGx5IGZyb20gdGhlIG9yaWdpbmFsIGZpbGVcbiAgICByZXR1cm4gc2NoZW1hdGljUmVxdWlyZShpZCk7XG4gIH07XG5cbiAgLy8gU2V0dXAgYSB3cmFwcGVyIGZ1bmN0aW9uIHRvIGNhcHR1cmUgdGhlIG1vZHVsZSdzIGV4cG9ydHNcbiAgY29uc3Qgc2NoZW1hdGljQ29kZSA9IHJlYWRGaWxlU3luYyhzY2hlbWF0aWNGaWxlLCAndXRmOCcpO1xuICAvLyBgbW9kdWxlYCBpcyByZXF1aXJlZCBkdWUgdG8gQGFuZ3VsYXIvbG9jYWxpemUgbmctYWRkIGJlaW5nIGluIFVNRCBmb3JtYXRcbiAgY29uc3QgaGVhZGVyQ29kZSA9ICcoZnVuY3Rpb24oKSB7XFxudmFyIGV4cG9ydHMgPSB7fTtcXG52YXIgbW9kdWxlID0geyBleHBvcnRzIH07XFxuJztcbiAgY29uc3QgZm9vdGVyQ29kZSA9IGV4cG9ydE5hbWVcbiAgICA/IGBcXG5yZXR1cm4gbW9kdWxlLmV4cG9ydHNbJyR7ZXhwb3J0TmFtZX0nXTt9KTtgXG4gICAgOiAnXFxucmV0dXJuIG1vZHVsZS5leHBvcnRzO30pOyc7XG5cbiAgY29uc3Qgc2NyaXB0ID0gbmV3IFNjcmlwdChoZWFkZXJDb2RlICsgc2NoZW1hdGljQ29kZSArIGZvb3RlckNvZGUsIHtcbiAgICBmaWxlbmFtZTogc2NoZW1hdGljRmlsZSxcbiAgICBsaW5lT2Zmc2V0OiAzLFxuICB9KTtcblxuICBjb25zdCBjb250ZXh0ID0ge1xuICAgIF9fZGlybmFtZTogc2NoZW1hdGljRGlyZWN0b3J5LFxuICAgIF9fZmlsZW5hbWU6IHNjaGVtYXRpY0ZpbGUsXG4gICAgQnVmZmVyLFxuICAgIGNvbnNvbGUsXG4gICAgcHJvY2VzcyxcbiAgICBnZXQgZ2xvYmFsKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZXF1aXJlOiBjdXN0b21SZXF1aXJlLFxuICB9O1xuXG4gIGNvbnN0IGV4cG9ydHNGYWN0b3J5ID0gc2NyaXB0LnJ1bkluTmV3Q29udGV4dChjb250ZXh0KTtcblxuICByZXR1cm4gZXhwb3J0c0ZhY3Rvcnk7XG59XG4iXX0=