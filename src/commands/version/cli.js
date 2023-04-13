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
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = __importDefault(require("module"));
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const color_1 = require("../../utilities/color");
const command_config_1 = require("../command-config");
/**
 * Major versions of Node.js that are officially supported by Angular.
 */
const SUPPORTED_NODE_MAJORS = [16, 18];
const PACKAGE_PATTERNS = [
    /^@angular\/.*/,
    /^@angular-devkit\/.*/,
    /^@bazel\/.*/,
    /^@ngtools\/.*/,
    /^@nguniversal\/.*/,
    /^@schematics\/.*/,
    /^rxjs$/,
    /^typescript$/,
    /^ng-packagr$/,
    /^webpack$/,
];
class VersionCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'version';
        this.aliases = command_config_1.RootCommands['version'].aliases;
        this.describe = 'Outputs Angular CLI version.';
    }
    builder(localYargs) {
        return localYargs;
    }
    async run() {
        const { packageManager, logger, root } = this.context;
        const localRequire = module_1.default.createRequire((0, path_1.resolve)(__filename, '../../../'));
        // Trailing slash is used to allow the path to be treated as a directory
        const workspaceRequire = module_1.default.createRequire(root + '/');
        const cliPackage = localRequire('./package.json');
        let workspacePackage;
        try {
            workspacePackage = workspaceRequire('./package.json');
        }
        catch { }
        const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
        const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
        const packageNames = new Set(Object.keys({
            ...cliPackage.dependencies,
            ...cliPackage.devDependencies,
            ...workspacePackage?.dependencies,
            ...workspacePackage?.devDependencies,
        }));
        const versions = {};
        for (const name of packageNames) {
            if (PACKAGE_PATTERNS.some((p) => p.test(name))) {
                versions[name] = this.getVersion(name, workspaceRequire, localRequire);
            }
        }
        const ngCliVersion = cliPackage.version;
        let angularCoreVersion = '';
        const angularSameAsCore = [];
        if (workspacePackage) {
            // Filter all angular versions that are the same as core.
            angularCoreVersion = versions['@angular/core'];
            if (angularCoreVersion) {
                for (const [name, version] of Object.entries(versions)) {
                    if (version === angularCoreVersion && name.startsWith('@angular/')) {
                        angularSameAsCore.push(name.replace(/^@angular\//, ''));
                        delete versions[name];
                    }
                }
                // Make sure we list them in alphabetical order.
                angularSameAsCore.sort();
            }
        }
        const namePad = ' '.repeat(Object.keys(versions).sort((a, b) => b.length - a.length)[0].length + 3);
        const asciiArt = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `
            .split('\n')
            .map((x) => color_1.colors.red(x))
            .join('\n');
        logger.info(asciiArt);
        logger.info(`
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}${unsupportedNodeVersion ? ' (Unsupported)' : ''}
      Package Manager: ${packageManager.name} ${packageManager.version ?? '<error>'}
      OS: ${process.platform} ${process.arch}

      Angular: ${angularCoreVersion}
      ... ${angularSameAsCore
            .reduce((acc, name) => {
            // Perform a simple word wrap around 60.
            if (acc.length == 0) {
                return [name];
            }
            const line = acc[acc.length - 1] + ', ' + name;
            if (line.length > 60) {
                acc.push(name);
            }
            else {
                acc[acc.length - 1] = line;
            }
            return acc;
        }, [])
            .join('\n... ')}

      Package${namePad.slice(7)}Version
      -------${namePad.replace(/ /g, '-')}------------------
      ${Object.keys(versions)
            .map((module) => `${module}${namePad.slice(module.length)}${versions[module]}`)
            .sort()
            .join('\n')}
    `.replace(/^ {6}/gm, ''));
        if (unsupportedNodeVersion) {
            logger.warn(`Warning: The current version of Node (${process.versions.node}) is not supported by Angular.`);
        }
    }
    getVersion(moduleName, workspaceRequire, localRequire) {
        let packageInfo;
        let cliOnly = false;
        // Try to find the package in the workspace
        try {
            packageInfo = workspaceRequire(`${moduleName}/package.json`);
        }
        catch { }
        // If not found, try to find within the CLI
        if (!packageInfo) {
            try {
                packageInfo = localRequire(`${moduleName}/package.json`);
                cliOnly = true;
            }
            catch { }
        }
        // If found, attempt to get the version
        if (packageInfo) {
            try {
                return packageInfo.version + (cliOnly ? ' (cli-only)' : '');
            }
            catch { }
        }
        return '<error>';
    }
}
exports.default = VersionCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7O0FBRUgsb0RBQWdDO0FBQ2hDLCtCQUErQjtBQUUvQix5RUFBa0c7QUFDbEcsaURBQStDO0FBQy9DLHNEQUFpRDtBQVNqRDs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLGFBQWE7SUFDYixlQUFlO0lBQ2YsbUJBQW1CO0lBQ25CLGtCQUFrQjtJQUNsQixRQUFRO0lBQ1IsY0FBYztJQUNkLGNBQWM7SUFDZCxXQUFXO0NBQ1osQ0FBQztBQUVGLE1BQXFCLG9CQUNuQixTQUFRLDhCQUFhO0lBRHZCOztRQUlFLFlBQU8sR0FBRyxTQUFTLENBQUM7UUFDcEIsWUFBTyxHQUFHLDZCQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzFDLGFBQVEsR0FBRyw4QkFBOEIsQ0FBQztJQWlKNUMsQ0FBQztJQTlJQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHO1FBQ1AsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBRyxnQkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFBLGNBQU8sRUFBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNoRix3RUFBd0U7UUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcs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RyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzthQUM5RSxJQUFJLEVBQUU7YUFDTixJQUFJLENBQUMsSUFBSSxDQUFDO0tBQ2QsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUN2QixDQUFDO1FBRUYsSUFBSSxzQkFBc0IsRUFBRTtZQUMxQixNQUFNLENBQUMsSUFBSSxDQUNULHlDQUF5QyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksZ0NBQWdDLENBQy9GLENBQUM7U0FDSDtJQUNILENBQUM7SUFFTyxVQUFVLENBQ2hCLFVBQWtCLEVBQ2xCLGdCQUE2QixFQUM3QixZQUF5QjtRQUV6QixJQUFJLFdBQTJDLENBQUM7UUFDaEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBRXBCLDJDQUEyQztRQUMzQyxJQUFJO1lBQ0YsV0FBVyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsVUFBVSxlQUFlLENBQUMsQ0FBQztTQUM5RDtRQUFDLE1BQU0sR0FBRTtRQUVWLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLElBQUk7Z0JBQ0YsV0FBVyxHQUFHLFlBQVksQ0FBQyxHQUFHLFVBQVUsZUFBZSxDQUFDLENBQUM7Z0JBQ3pELE9BQU8sR0FBRyxJQUFJLENBQUM7YUFDaEI7WUFBQyxNQUFNLEdBQUU7U0FDWDtRQUVELHVDQUF1QztRQUN2QyxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUk7Z0JBQ0YsT0FBTyxXQUFXLENBQUMsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzdEO1lBQUMsTUFBTSxHQUFFO1NBQ1g7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0NBQ0Y7QUF2SkQsdUNBdUpDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBub2RlTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBSb290Q29tbWFuZHMgfSBmcm9tICcuLi9jb21tYW5kLWNvbmZpZyc7XG5cbmludGVyZmFjZSBQYXJ0aWFsUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgZGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuLyoqXG4gKiBNYWpvciB2ZXJzaW9ucyBvZiBOb2RlLmpzIHRoYXQgYXJlIG9mZmljaWFsbHkgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuXG4gKi9cbmNvbnN0IFNVUFBPUlRFRF9OT0RFX01BSk9SUyA9IFsxNiwgMThdO1xuXG5jb25zdCBQQUNLQUdFX1BBVFRFUk5TID0gW1xuICAvXkBhbmd1bGFyXFwvLiovLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy4qLyxcbiAgL15AYmF6ZWxcXC8uKi8sXG4gIC9eQG5ndG9vbHNcXC8uKi8sXG4gIC9eQG5ndW5pdmVyc2FsXFwvLiovLFxuICAvXkBzY2hlbWF0aWNzXFwvLiovLFxuICAvXnJ4anMkLyxcbiAgL150eXBlc2NyaXB0JC8sXG4gIC9ebmctcGFja2FnciQvLFxuICAvXndlYnBhY2skLyxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFZlcnNpb25Db21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvblxue1xuICBjb21tYW5kID0gJ3ZlcnNpb24nO1xuICBhbGlhc2VzID0gUm9vdENvbW1hbmRzWyd2ZXJzaW9uJ10uYWxpYXNlcztcbiAgZGVzY3JpYmUgPSAnT3V0cHV0cyBBbmd1bGFyIENMSSB2ZXJzaW9uLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBhc3luYyBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBwYWNrYWdlTWFuYWdlciwgbG9nZ2VyLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgbG9jYWxSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJlc29sdmUoX19maWxlbmFtZSwgJy4uLy4uLy4uLycpKTtcbiAgICAvLyBUcmFpbGluZyBzbGFzaCBpcyB1c2VkIHRvIGFsbG93IHRoZSBwYXRoIHRvIGJlIHRyZWF0ZWQgYXMgYSBkaXJlY3RvcnlcbiAgICBjb25zdCB3b3Jrc3BhY2VSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJvb3QgKyAnLycpO1xuXG4gICAgY29uc3QgY2xpUGFja2FnZTogUGFydGlhbFBhY2thZ2VJbmZvID0gbG9jYWxSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIGxldCB3b3Jrc3BhY2VQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHdvcmtzcGFjZVBhY2thZ2UgPSB3b3Jrc3BhY2VSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGNvbnN0IFtub2RlTWFqb3JdID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KCcuJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydCkpO1xuICAgIGNvbnN0IHVuc3VwcG9ydGVkTm9kZVZlcnNpb24gPSAhU1VQUE9SVEVEX05PREVfTUFKT1JTLmluY2x1ZGVzKG5vZGVNYWpvcik7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZXMgPSBuZXcgU2V0KFxuICAgICAgT2JqZWN0LmtleXMoe1xuICAgICAgICAuLi5jbGlQYWNrYWdlLmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4uY2xpUGFja2FnZS5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC4uLndvcmtzcGFjZVBhY2thZ2U/LmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4ud29ya3NwYWNlUGFja2FnZT8uZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGNvbnN0IHZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHBhY2thZ2VOYW1lcykge1xuICAgICAgaWYgKFBBQ0tBR0VfUEFUVEVSTlMuc29tZSgocCkgPT4gcC50ZXN0KG5hbWUpKSkge1xuICAgICAgICB2ZXJzaW9uc1tuYW1lXSA9IHRoaXMuZ2V0VmVyc2lvbihuYW1lLCB3b3Jrc3BhY2VSZXF1aXJlLCBsb2NhbFJlcXVpcmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5nQ2xpVmVyc2lvbiA9IGNsaVBhY2thZ2UudmVyc2lvbjtcbiAgICBsZXQgYW5ndWxhckNvcmVWZXJzaW9uID0gJyc7XG4gICAgY29uc3QgYW5ndWxhclNhbWVBc0NvcmU6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAod29ya3NwYWNlUGFja2FnZSkge1xuICAgICAgLy8gRmlsdGVyIGFsbCBhbmd1bGFyIHZlcnNpb25zIHRoYXQgYXJlIHRoZSBzYW1lIGFzIGNvcmUuXG4gICAgICBhbmd1bGFyQ29yZVZlcnNpb24gPSB2ZXJzaW9uc1snQGFuZ3VsYXIvY29yZSddO1xuICAgICAgaWYgKGFuZ3VsYXJDb3JlVmVyc2lvbikge1xuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh2ZXJzaW9ucykpIHtcbiAgICAgICAgICBpZiAodmVyc2lvbiA9PT0gYW5ndWxhckNvcmVWZXJzaW9uICYmIG5hbWUuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvJykpIHtcbiAgICAgICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnB1c2gobmFtZS5yZXBsYWNlKC9eQGFuZ3VsYXJcXC8vLCAnJykpO1xuICAgICAgICAgICAgZGVsZXRlIHZlcnNpb25zW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBsaXN0IHRoZW0gaW4gYWxwaGFiZXRpY2FsIG9yZGVyLlxuICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5zb3J0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZVBhZCA9ICcgJy5yZXBlYXQoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9ucykuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF0ubGVuZ3RoICsgMyxcbiAgICApO1xuICAgIGNvbnN0IGFzY2lpQXJ0ID0gYFxuICAgICBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgIF9fX18gXyAgICAgX19fXG4gICAgLyBcXFxcICAgXyBfXyAgIF9fIF8gXyAgIF98IHwgX18gXyBfIF9fICAgICAvIF9fX3wgfCAgIHxfIF98XG4gICAvIOKWsyBcXFxcIHwgJ18gXFxcXCAvIF9cXGAgfCB8IHwgfCB8LyBfXFxgIHwgJ19ffCAgIHwgfCAgIHwgfCAgICB8IHxcbiAgLyBfX18gXFxcXHwgfCB8IHwgKF98IHwgfF98IHwgfCAoX3wgfCB8ICAgICAgfCB8X19ffCB8X19fIHwgfFxuIC9fLyAgIFxcXFxfXFxcXF98IHxffFxcXFxfXywgfFxcXFxfXyxffF98XFxcXF9fLF98X3wgICAgICAgXFxcXF9fX198X19fX198X19ffFxuICAgICAgICAgICAgICAgIHxfX18vXG4gICAgYFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgoeCkgPT4gY29sb3JzLnJlZCh4KSlcbiAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgIGxvZ2dlci5pbmZvKGFzY2lpQXJ0KTtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBcbiAgICAgIEFuZ3VsYXIgQ0xJOiAke25nQ2xpVmVyc2lvbn1cbiAgICAgIE5vZGU6ICR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSR7dW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA/ICcgKFVuc3VwcG9ydGVkKScgOiAnJ31cbiAgICAgIFBhY2thZ2UgTWFuYWdlcjogJHtwYWNrYWdlTWFuYWdlci5uYW1lfSAke3BhY2thZ2VNYW5hZ2VyLnZlcnNpb24gPz8gJzxlcnJvcj4nfVxuICAgICAgT1M6ICR7cHJvY2Vzcy5wbGF0Zm9ybX0gJHtwcm9jZXNzLmFyY2h9XG5cbiAgICAgIEFuZ3VsYXI6ICR7YW5ndWxhckNvcmVWZXJzaW9ufVxuICAgICAgLi4uICR7YW5ndWxhclNhbWVBc0NvcmVcbiAgICAgICAgLnJlZHVjZTxzdHJpbmdbXT4oKGFjYywgbmFtZSkgPT4ge1xuICAgICAgICAgIC8vIFBlcmZvcm0gYSBzaW1wbGUgd29yZCB3cmFwIGFyb3VuZCA2MC5cbiAgICAgICAgICBpZiAoYWNjLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBsaW5lID0gYWNjW2FjYy5sZW5ndGggLSAxXSArICcsICcgKyBuYW1lO1xuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDYwKSB7XG4gICAgICAgICAgICBhY2MucHVzaChuYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2FjYy5sZW5ndGggLSAxXSA9IGxpbmU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwgW10pXG4gICAgICAgIC5qb2luKCdcXG4uLi4gJyl9XG5cbiAgICAgIFBhY2thZ2Uke25hbWVQYWQuc2xpY2UoNyl9VmVyc2lvblxuICAgICAgLS0tLS0tLSR7bmFtZVBhZC5yZXBsYWNlKC8gL2csICctJyl9LS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAke09iamVjdC5rZXlzKHZlcnNpb25zKVxuICAgICAgICAubWFwKChtb2R1bGUpID0+IGAke21vZHVsZX0ke25hbWVQYWQuc2xpY2UobW9kdWxlLmxlbmd0aCl9JHt2ZXJzaW9uc1ttb2R1bGVdfWApXG4gICAgICAgIC5zb3J0KClcbiAgICAgICAgLmpvaW4oJ1xcbicpfVxuICAgIGAucmVwbGFjZSgvXiB7Nn0vZ20sICcnKSxcbiAgICApO1xuXG4gICAgaWYgKHVuc3VwcG9ydGVkTm9kZVZlcnNpb24pIHtcbiAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICBgV2FybmluZzogVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBOb2RlICgke3Byb2Nlc3MudmVyc2lvbnMubm9kZX0pIGlzIG5vdCBzdXBwb3J0ZWQgYnkgQW5ndWxhci5gLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFZlcnNpb24oXG4gICAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICAgIHdvcmtzcGFjZVJlcXVpcmU6IE5vZGVSZXF1aXJlLFxuICAgIGxvY2FsUmVxdWlyZTogTm9kZVJlcXVpcmUsXG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHBhY2thZ2VJbmZvOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgbGV0IGNsaU9ubHkgPSBmYWxzZTtcblxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBwYWNrYWdlIGluIHRoZSB3b3Jrc3BhY2VcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUluZm8gPSB3b3Jrc3BhY2VSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgIH0gY2F0Y2gge31cblxuICAgIC8vIElmIG5vdCBmb3VuZCwgdHJ5IHRvIGZpbmQgd2l0aGluIHRoZSBDTElcbiAgICBpZiAoIXBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlSW5mbyA9IGxvY2FsUmVxdWlyZShgJHttb2R1bGVOYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgICAgICAgY2xpT25seSA9IHRydWU7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgLy8gSWYgZm91bmQsIGF0dGVtcHQgdG8gZ2V0IHRoZSB2ZXJzaW9uXG4gICAgaWYgKHBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFja2FnZUluZm8udmVyc2lvbiArIChjbGlPbmx5ID8gJyAoY2xpLW9ubHkpJyA6ICcnKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICByZXR1cm4gJzxlcnJvcj4nO1xuICB9XG59XG4iXX0=