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
const SUPPORTED_NODE_MAJORS = [18];
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
    /^zone\.js$/,
];
class VersionCommandModule extends command_module_1.CommandModule {
    command = 'version';
    aliases = command_config_1.RootCommands['version'].aliases;
    describe = 'Outputs Angular CLI version.';
    longDescriptionPath;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7O0FBRUgsb0RBQWdDO0FBQ2hDLCtCQUErQjtBQUUvQix5RUFBa0c7QUFDbEcsaURBQStDO0FBQy9DLHNEQUFpRDtBQVNqRDs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVuQyxNQUFNLGdCQUFnQixHQUFHO0lBQ3ZCLGVBQWU7SUFDZixzQkFBc0I7SUFDdEIsYUFBYTtJQUNiLGVBQWU7SUFDZixtQkFBbUI7SUFDbkIsa0JBQWtCO0lBQ2xCLFFBQVE7SUFDUixjQUFjO0lBQ2QsY0FBYztJQUNkLFdBQVc7SUFDWCxZQUFZO0NBQ2IsQ0FBQztBQUVGLE1BQXFCLG9CQUNuQixTQUFRLDhCQUFhO0lBR3JCLE9BQU8sR0FBRyxTQUFTLENBQUM7SUFDcEIsT0FBTyxHQUFHLDZCQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzFDLFFBQVEsR0FBRyw4QkFBOEIsQ0FBQztJQUMxQyxtQkFBbUIsQ0FBc0I7SUFFekMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEQsTUFBTSxZQUFZLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBQSxjQUFPLEVBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsd0VBQXdFO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFH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QUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7YUFDOUUsSUFBSSxFQUFFO2FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNkLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FDdkIsQ0FBQztRQUVGLElBQUksc0JBQXNCLEVBQUU7WUFDMUIsTUFBTSxDQUFDLElBQUksQ0FDVCx5Q0FBeUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLGdDQUFnQyxDQUMvRixDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBRU8sVUFBVSxDQUNoQixVQUFrQixFQUNsQixnQkFBNkIsRUFDN0IsWUFBeUI7UUFFekIsSUFBSSxXQUEyQyxDQUFDO1FBQ2hELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUVwQiwyQ0FBMkM7UUFDM0MsSUFBSTtZQUNGLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLFVBQVUsZUFBZSxDQUFDLENBQUM7U0FDOUQ7UUFBQyxNQUFNLEdBQUU7UUFFViwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixJQUFJO2dCQUNGLFdBQVcsR0FBRyxZQUFZLENBQUMsR0FBRyxVQUFVLGVBQWUsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQUMsTUFBTSxHQUFFO1NBQ1g7UUFFRCx1Q0FBdUM7UUFDdkMsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJO2dCQUNGLE9BQU8sV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM3RDtZQUFDLE1BQU0sR0FBRTtTQUNYO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBdkpELHVDQXVKQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgbm9kZU1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUsIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgUm9vdENvbW1hbmRzIH0gZnJvbSAnLi4vY29tbWFuZC1jb25maWcnO1xuXG5pbnRlcmZhY2UgUGFydGlhbFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogTWFqb3IgdmVyc2lvbnMgb2YgTm9kZS5qcyB0aGF0IGFyZSBvZmZpY2lhbGx5IHN1cHBvcnRlZCBieSBBbmd1bGFyLlxuICovXG5jb25zdCBTVVBQT1JURURfTk9ERV9NQUpPUlMgPSBbMThdO1xuXG5jb25zdCBQQUNLQUdFX1BBVFRFUk5TID0gW1xuICAvXkBhbmd1bGFyXFwvLiovLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy4qLyxcbiAgL15AYmF6ZWxcXC8uKi8sXG4gIC9eQG5ndG9vbHNcXC8uKi8sXG4gIC9eQG5ndW5pdmVyc2FsXFwvLiovLFxuICAvXkBzY2hlbWF0aWNzXFwvLiovLFxuICAvXnJ4anMkLyxcbiAgL150eXBlc2NyaXB0JC8sXG4gIC9ebmctcGFja2FnciQvLFxuICAvXndlYnBhY2skLyxcbiAgL156b25lXFwuanMkLyxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFZlcnNpb25Db21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvblxue1xuICBjb21tYW5kID0gJ3ZlcnNpb24nO1xuICBhbGlhc2VzID0gUm9vdENvbW1hbmRzWyd2ZXJzaW9uJ10uYWxpYXNlcztcbiAgZGVzY3JpYmUgPSAnT3V0cHV0cyBBbmd1bGFyIENMSSB2ZXJzaW9uLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBhc3luYyBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBwYWNrYWdlTWFuYWdlciwgbG9nZ2VyLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgbG9jYWxSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJlc29sdmUoX19maWxlbmFtZSwgJy4uLy4uLy4uLycpKTtcbiAgICAvLyBUcmFpbGluZyBzbGFzaCBpcyB1c2VkIHRvIGFsbG93IHRoZSBwYXRoIHRvIGJlIHRyZWF0ZWQgYXMgYSBkaXJlY3RvcnlcbiAgICBjb25zdCB3b3Jrc3BhY2VSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJvb3QgKyAnLycpO1xuXG4gICAgY29uc3QgY2xpUGFja2FnZTogUGFydGlhbFBhY2thZ2VJbmZvID0gbG9jYWxSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIGxldCB3b3Jrc3BhY2VQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHdvcmtzcGFjZVBhY2thZ2UgPSB3b3Jrc3BhY2VSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGNvbnN0IFtub2RlTWFqb3JdID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KCcuJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydCkpO1xuICAgIGNvbnN0IHVuc3VwcG9ydGVkTm9kZVZlcnNpb24gPSAhU1VQUE9SVEVEX05PREVfTUFKT1JTLmluY2x1ZGVzKG5vZGVNYWpvcik7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZXMgPSBuZXcgU2V0KFxuICAgICAgT2JqZWN0LmtleXMoe1xuICAgICAgICAuLi5jbGlQYWNrYWdlLmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4uY2xpUGFja2FnZS5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC4uLndvcmtzcGFjZVBhY2thZ2U/LmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4ud29ya3NwYWNlUGFja2FnZT8uZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGNvbnN0IHZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHBhY2thZ2VOYW1lcykge1xuICAgICAgaWYgKFBBQ0tBR0VfUEFUVEVSTlMuc29tZSgocCkgPT4gcC50ZXN0KG5hbWUpKSkge1xuICAgICAgICB2ZXJzaW9uc1tuYW1lXSA9IHRoaXMuZ2V0VmVyc2lvbihuYW1lLCB3b3Jrc3BhY2VSZXF1aXJlLCBsb2NhbFJlcXVpcmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5nQ2xpVmVyc2lvbiA9IGNsaVBhY2thZ2UudmVyc2lvbjtcbiAgICBsZXQgYW5ndWxhckNvcmVWZXJzaW9uID0gJyc7XG4gICAgY29uc3QgYW5ndWxhclNhbWVBc0NvcmU6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAod29ya3NwYWNlUGFja2FnZSkge1xuICAgICAgLy8gRmlsdGVyIGFsbCBhbmd1bGFyIHZlcnNpb25zIHRoYXQgYXJlIHRoZSBzYW1lIGFzIGNvcmUuXG4gICAgICBhbmd1bGFyQ29yZVZlcnNpb24gPSB2ZXJzaW9uc1snQGFuZ3VsYXIvY29yZSddO1xuICAgICAgaWYgKGFuZ3VsYXJDb3JlVmVyc2lvbikge1xuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh2ZXJzaW9ucykpIHtcbiAgICAgICAgICBpZiAodmVyc2lvbiA9PT0gYW5ndWxhckNvcmVWZXJzaW9uICYmIG5hbWUuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvJykpIHtcbiAgICAgICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnB1c2gobmFtZS5yZXBsYWNlKC9eQGFuZ3VsYXJcXC8vLCAnJykpO1xuICAgICAgICAgICAgZGVsZXRlIHZlcnNpb25zW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBsaXN0IHRoZW0gaW4gYWxwaGFiZXRpY2FsIG9yZGVyLlxuICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5zb3J0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZVBhZCA9ICcgJy5yZXBlYXQoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9ucykuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF0ubGVuZ3RoICsgMyxcbiAgICApO1xuICAgIGNvbnN0IGFzY2lpQXJ0ID0gYFxuICAgICBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgIF9fX18gXyAgICAgX19fXG4gICAgLyBcXFxcICAgXyBfXyAgIF9fIF8gXyAgIF98IHwgX18gXyBfIF9fICAgICAvIF9fX3wgfCAgIHxfIF98XG4gICAvIOKWsyBcXFxcIHwgJ18gXFxcXCAvIF9cXGAgfCB8IHwgfCB8LyBfXFxgIHwgJ19ffCAgIHwgfCAgIHwgfCAgICB8IHxcbiAgLyBfX18gXFxcXHwgfCB8IHwgKF98IHwgfF98IHwgfCAoX3wgfCB8ICAgICAgfCB8X19ffCB8X19fIHwgfFxuIC9fLyAgIFxcXFxfXFxcXF98IHxffFxcXFxfXywgfFxcXFxfXyxffF98XFxcXF9fLF98X3wgICAgICAgXFxcXF9fX198X19fX198X19ffFxuICAgICAgICAgICAgICAgIHxfX18vXG4gICAgYFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgoeCkgPT4gY29sb3JzLnJlZCh4KSlcbiAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgIGxvZ2dlci5pbmZvKGFzY2lpQXJ0KTtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBcbiAgICAgIEFuZ3VsYXIgQ0xJOiAke25nQ2xpVmVyc2lvbn1cbiAgICAgIE5vZGU6ICR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSR7dW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA/ICcgKFVuc3VwcG9ydGVkKScgOiAnJ31cbiAgICAgIFBhY2thZ2UgTWFuYWdlcjogJHtwYWNrYWdlTWFuYWdlci5uYW1lfSAke3BhY2thZ2VNYW5hZ2VyLnZlcnNpb24gPz8gJzxlcnJvcj4nfVxuICAgICAgT1M6ICR7cHJvY2Vzcy5wbGF0Zm9ybX0gJHtwcm9jZXNzLmFyY2h9XG5cbiAgICAgIEFuZ3VsYXI6ICR7YW5ndWxhckNvcmVWZXJzaW9ufVxuICAgICAgLi4uICR7YW5ndWxhclNhbWVBc0NvcmVcbiAgICAgICAgLnJlZHVjZTxzdHJpbmdbXT4oKGFjYywgbmFtZSkgPT4ge1xuICAgICAgICAgIC8vIFBlcmZvcm0gYSBzaW1wbGUgd29yZCB3cmFwIGFyb3VuZCA2MC5cbiAgICAgICAgICBpZiAoYWNjLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBsaW5lID0gYWNjW2FjYy5sZW5ndGggLSAxXSArICcsICcgKyBuYW1lO1xuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDYwKSB7XG4gICAgICAgICAgICBhY2MucHVzaChuYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2FjYy5sZW5ndGggLSAxXSA9IGxpbmU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwgW10pXG4gICAgICAgIC5qb2luKCdcXG4uLi4gJyl9XG5cbiAgICAgIFBhY2thZ2Uke25hbWVQYWQuc2xpY2UoNyl9VmVyc2lvblxuICAgICAgLS0tLS0tLSR7bmFtZVBhZC5yZXBsYWNlKC8gL2csICctJyl9LS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAke09iamVjdC5rZXlzKHZlcnNpb25zKVxuICAgICAgICAubWFwKChtb2R1bGUpID0+IGAke21vZHVsZX0ke25hbWVQYWQuc2xpY2UobW9kdWxlLmxlbmd0aCl9JHt2ZXJzaW9uc1ttb2R1bGVdfWApXG4gICAgICAgIC5zb3J0KClcbiAgICAgICAgLmpvaW4oJ1xcbicpfVxuICAgIGAucmVwbGFjZSgvXiB7Nn0vZ20sICcnKSxcbiAgICApO1xuXG4gICAgaWYgKHVuc3VwcG9ydGVkTm9kZVZlcnNpb24pIHtcbiAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICBgV2FybmluZzogVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBOb2RlICgke3Byb2Nlc3MudmVyc2lvbnMubm9kZX0pIGlzIG5vdCBzdXBwb3J0ZWQgYnkgQW5ndWxhci5gLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFZlcnNpb24oXG4gICAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICAgIHdvcmtzcGFjZVJlcXVpcmU6IE5vZGVSZXF1aXJlLFxuICAgIGxvY2FsUmVxdWlyZTogTm9kZVJlcXVpcmUsXG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHBhY2thZ2VJbmZvOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgbGV0IGNsaU9ubHkgPSBmYWxzZTtcblxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBwYWNrYWdlIGluIHRoZSB3b3Jrc3BhY2VcbiAgICB0cnkge1xuICAgICAgcGFja2FnZUluZm8gPSB3b3Jrc3BhY2VSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgIH0gY2F0Y2gge31cblxuICAgIC8vIElmIG5vdCBmb3VuZCwgdHJ5IHRvIGZpbmQgd2l0aGluIHRoZSBDTElcbiAgICBpZiAoIXBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlSW5mbyA9IGxvY2FsUmVxdWlyZShgJHttb2R1bGVOYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgICAgICAgY2xpT25seSA9IHRydWU7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgLy8gSWYgZm91bmQsIGF0dGVtcHQgdG8gZ2V0IHRoZSB2ZXJzaW9uXG4gICAgaWYgKHBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFja2FnZUluZm8udmVyc2lvbiArIChjbGlPbmx5ID8gJyAoY2xpLW9ubHkpJyA6ICcnKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICByZXR1cm4gJzxlcnJvcj4nO1xuICB9XG59XG4iXX0=