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
exports.VersionCommandModule = void 0;
const module_1 = __importDefault(require("module"));
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const color_1 = require("../../utilities/color");
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
        this.aliases = ['v'];
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
exports.VersionCommandModule = VersionCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILG9EQUFnQztBQUNoQywrQkFBK0I7QUFFL0IseUVBQWtHO0FBQ2xHLGlEQUErQztBQVMvQzs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLGFBQWE7SUFDYixlQUFlO0lBQ2YsbUJBQW1CO0lBQ25CLGtCQUFrQjtJQUNsQixRQUFRO0lBQ1IsY0FBYztJQUNkLGNBQWM7SUFDZCxXQUFXO0NBQ1osQ0FBQztBQUVGLE1BQWEsb0JBQXFCLFNBQVEsOEJBQWE7SUFBdkQ7O1FBQ0UsWUFBTyxHQUFHLFNBQVMsQ0FBQztRQUNwQixZQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixhQUFRLEdBQUcsOEJBQThCLENBQUM7SUFpSjVDLENBQUM7SUE5SUMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEQsTUFBTSxZQUFZLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBQSxjQUFPLEVBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsd0VBQXdFO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRTlELE1BQU0sVUFB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QUM7YUFDOUUsSUFBSSxFQUFFO2FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNkLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FDdkIsQ0FBQztRQUVGLElBQUksc0JBQXNCLEVBQUU7WUFDMUIsTUFBTSxDQUFDLElBQUksQ0FDVCx5Q0FBeUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLGdDQUFnQyxDQUMvRixDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBRU8sVUFBVSxDQUNoQixVQUFrQixFQUNsQixnQkFBNkIsRUFDN0IsWUFBeUI7UUFFekIsSUFBSSxXQUEyQyxDQUFDO1FBQ2hELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUVwQiwyQ0FBMkM7UUFDM0MsSUFBSTtZQUNGLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLFVBQVUsZUFBZSxDQUFDLENBQUM7U0FDOUQ7UUFBQyxNQUFNLEdBQUU7UUFFViwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixJQUFJO2dCQUNGLFdBQVcsR0FBRyxZQUFZLENBQUMsR0FBRyxVQUFVLGVBQWUsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQUMsTUFBTSxHQUFFO1NBQ1g7UUFFRCx1Q0FBdUM7UUFDdkMsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFJO2dCQUNGLE9BQU8sV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM3RDtZQUFDLE1BQU0sR0FBRTtTQUNYO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUNGO0FBcEpELG9EQW9KQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgbm9kZU1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUsIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuXG5pbnRlcmZhY2UgUGFydGlhbFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogTWFqb3IgdmVyc2lvbnMgb2YgTm9kZS5qcyB0aGF0IGFyZSBvZmZpY2lhbGx5IHN1cHBvcnRlZCBieSBBbmd1bGFyLlxuICovXG5jb25zdCBTVVBQT1JURURfTk9ERV9NQUpPUlMgPSBbMTYsIDE4XTtcblxuY29uc3QgUEFDS0FHRV9QQVRURVJOUyA9IFtcbiAgL15AYW5ndWxhclxcLy4qLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8uKi8sXG4gIC9eQGJhemVsXFwvLiovLFxuICAvXkBuZ3Rvb2xzXFwvLiovLFxuICAvXkBuZ3VuaXZlcnNhbFxcLy4qLyxcbiAgL15Ac2NoZW1hdGljc1xcLy4qLyxcbiAgL15yeGpzJC8sXG4gIC9edHlwZXNjcmlwdCQvLFxuICAvXm5nLXBhY2thZ3IkLyxcbiAgL153ZWJwYWNrJC8sXG5dO1xuXG5leHBvcnQgY2xhc3MgVmVyc2lvbkNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICd2ZXJzaW9uJztcbiAgYWxpYXNlcyA9IFsndiddO1xuICBkZXNjcmliZSA9ICdPdXRwdXRzIEFuZ3VsYXIgQ0xJIHZlcnNpb24uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHBhY2thZ2VNYW5hZ2VyLCBsb2dnZXIsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBsb2NhbFJlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUocmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4vLi4vLi4vJykpO1xuICAgIC8vIFRyYWlsaW5nIHNsYXNoIGlzIHVzZWQgdG8gYWxsb3cgdGhlIHBhdGggdG8gYmUgdHJlYXRlZCBhcyBhIGRpcmVjdG9yeVxuICAgIGNvbnN0IHdvcmtzcGFjZVJlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUocm9vdCArICcvJyk7XG5cbiAgICBjb25zdCBjbGlQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgbGV0IHdvcmtzcGFjZVBhY2thZ2U6IFBhcnRpYWxQYWNrYWdlSW5mbyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlUGFja2FnZSA9IHdvcmtzcGFjZVJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgY29uc3QgW25vZGVNYWpvcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gICAgY29uc3QgdW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA9ICFTVVBQT1JURURfTk9ERV9NQUpPUlMuaW5jbHVkZXMobm9kZU1ham9yKTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IG5ldyBTZXQoXG4gICAgICBPYmplY3Qua2V5cyh7XG4gICAgICAgIC4uLmNsaVBhY2thZ2UuZGVwZW5kZW5jaWVzLFxuICAgICAgICAuLi5jbGlQYWNrYWdlLmRldkRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4ud29ya3NwYWNlUGFja2FnZT8uZGVwZW5kZW5jaWVzLFxuICAgICAgICAuLi53b3Jrc3BhY2VQYWNrYWdlPy5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgY29uc3QgdmVyc2lvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgcGFja2FnZU5hbWVzKSB7XG4gICAgICBpZiAoUEFDS0FHRV9QQVRURVJOUy5zb21lKChwKSA9PiBwLnRlc3QobmFtZSkpKSB7XG4gICAgICAgIHZlcnNpb25zW25hbWVdID0gdGhpcy5nZXRWZXJzaW9uKG5hbWUsIHdvcmtzcGFjZVJlcXVpcmUsIGxvY2FsUmVxdWlyZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmdDbGlWZXJzaW9uID0gY2xpUGFja2FnZS52ZXJzaW9uO1xuICAgIGxldCBhbmd1bGFyQ29yZVZlcnNpb24gPSAnJztcbiAgICBjb25zdCBhbmd1bGFyU2FtZUFzQ29yZTogc3RyaW5nW10gPSBbXTtcblxuICAgIGlmICh3b3Jrc3BhY2VQYWNrYWdlKSB7XG4gICAgICAvLyBGaWx0ZXIgYWxsIGFuZ3VsYXIgdmVyc2lvbnMgdGhhdCBhcmUgdGhlIHNhbWUgYXMgY29yZS5cbiAgICAgIGFuZ3VsYXJDb3JlVmVyc2lvbiA9IHZlcnNpb25zWydAYW5ndWxhci9jb3JlJ107XG4gICAgICBpZiAoYW5ndWxhckNvcmVWZXJzaW9uKSB7XG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHZlcnNpb25zKSkge1xuICAgICAgICAgIGlmICh2ZXJzaW9uID09PSBhbmd1bGFyQ29yZVZlcnNpb24gJiYgbmFtZS5zdGFydHNXaXRoKCdAYW5ndWxhci8nKSkge1xuICAgICAgICAgICAgYW5ndWxhclNhbWVBc0NvcmUucHVzaChuYW1lLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICcnKSk7XG4gICAgICAgICAgICBkZWxldGUgdmVyc2lvbnNbbmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGxpc3QgdGhlbSBpbiBhbHBoYWJldGljYWwgb3JkZXIuXG4gICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnNvcnQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBuYW1lUGFkID0gJyAnLnJlcGVhdChcbiAgICAgIE9iamVjdC5rZXlzKHZlcnNpb25zKS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKVswXS5sZW5ndGggKyAzLFxuICAgICk7XG4gICAgY29uc3QgYXNjaWlBcnQgPSBgXG4gICAgIF8gICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgX19fXyBfICAgICBfX19cbiAgICAvIFxcXFwgICBfIF9fICAgX18gXyBfICAgX3wgfCBfXyBfIF8gX18gICAgIC8gX19ffCB8ICAgfF8gX3xcbiAgIC8g4pazIFxcXFwgfCAnXyBcXFxcIC8gX1xcYCB8IHwgfCB8IHwvIF9cXGAgfCAnX198ICAgfCB8ICAgfCB8ICAgIHwgfFxuICAvIF9fXyBcXFxcfCB8IHwgfCAoX3wgfCB8X3wgfCB8IChffCB8IHwgICAgICB8IHxfX198IHxfX18gfCB8XG4gL18vICAgXFxcXF9cXFxcX3wgfF98XFxcXF9fLCB8XFxcXF9fLF98X3xcXFxcX18sX3xffCAgICAgICBcXFxcX19fX3xfX19fX3xfX198XG4gICAgICAgICAgICAgICAgfF9fXy9cbiAgICBgXG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKCh4KSA9PiBjb2xvcnMucmVkKHgpKVxuICAgICAgLmpvaW4oJ1xcbicpO1xuXG4gICAgbG9nZ2VyLmluZm8oYXNjaWlBcnQpO1xuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFxuICAgICAgQW5ndWxhciBDTEk6ICR7bmdDbGlWZXJzaW9ufVxuICAgICAgTm9kZTogJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9JHt1bnN1cHBvcnRlZE5vZGVWZXJzaW9uID8gJyAoVW5zdXBwb3J0ZWQpJyA6ICcnfVxuICAgICAgUGFja2FnZSBNYW5hZ2VyOiAke3BhY2thZ2VNYW5hZ2VyLm5hbWV9ICR7cGFja2FnZU1hbmFnZXIudmVyc2lvbiA/PyAnPGVycm9yPid9XG4gICAgICBPUzogJHtwcm9jZXNzLnBsYXRmb3JtfSAke3Byb2Nlc3MuYXJjaH1cblxuICAgICAgQW5ndWxhcjogJHthbmd1bGFyQ29yZVZlcnNpb259XG4gICAgICAuLi4gJHthbmd1bGFyU2FtZUFzQ29yZVxuICAgICAgICAucmVkdWNlPHN0cmluZ1tdPigoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgICAgLy8gUGVyZm9ybSBhIHNpbXBsZSB3b3JkIHdyYXAgYXJvdW5kIDYwLlxuICAgICAgICAgIGlmIChhY2MubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbbmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGxpbmUgPSBhY2NbYWNjLmxlbmd0aCAtIDFdICsgJywgJyArIG5hbWU7XG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID4gNjApIHtcbiAgICAgICAgICAgIGFjYy5wdXNoKG5hbWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY2NbYWNjLmxlbmd0aCAtIDFdID0gbGluZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCBbXSlcbiAgICAgICAgLmpvaW4oJ1xcbi4uLiAnKX1cblxuICAgICAgUGFja2FnZSR7bmFtZVBhZC5zbGljZSg3KX1WZXJzaW9uXG4gICAgICAtLS0tLS0tJHtuYW1lUGFkLnJlcGxhY2UoLyAvZywgJy0nKX0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICR7T2JqZWN0LmtleXModmVyc2lvbnMpXG4gICAgICAgIC5tYXAoKG1vZHVsZSkgPT4gYCR7bW9kdWxlfSR7bmFtZVBhZC5zbGljZShtb2R1bGUubGVuZ3RoKX0ke3ZlcnNpb25zW21vZHVsZV19YClcbiAgICAgICAgLnNvcnQoKVxuICAgICAgICAuam9pbignXFxuJyl9XG4gICAgYC5yZXBsYWNlKC9eIHs2fS9nbSwgJycpLFxuICAgICk7XG5cbiAgICBpZiAodW5zdXBwb3J0ZWROb2RlVmVyc2lvbikge1xuICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgIGBXYXJuaW5nOiBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIE5vZGUgKCR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSkgaXMgbm90IHN1cHBvcnRlZCBieSBBbmd1bGFyLmAsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VmVyc2lvbihcbiAgICBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgd29ya3NwYWNlUmVxdWlyZTogTm9kZVJlcXVpcmUsXG4gICAgbG9jYWxSZXF1aXJlOiBOb2RlUmVxdWlyZSxcbiAgKTogc3RyaW5nIHtcbiAgICBsZXQgcGFja2FnZUluZm86IFBhcnRpYWxQYWNrYWdlSW5mbyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY2xpT25seSA9IGZhbHNlO1xuXG4gICAgLy8gVHJ5IHRvIGZpbmQgdGhlIHBhY2thZ2UgaW4gdGhlIHdvcmtzcGFjZVxuICAgIHRyeSB7XG4gICAgICBwYWNrYWdlSW5mbyA9IHdvcmtzcGFjZVJlcXVpcmUoYCR7bW9kdWxlTmFtZX0vcGFja2FnZS5qc29uYCk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgLy8gSWYgbm90IGZvdW5kLCB0cnkgdG8gZmluZCB3aXRoaW4gdGhlIENMSVxuICAgIGlmICghcGFja2FnZUluZm8pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhY2thZ2VJbmZvID0gbG9jYWxSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgICAgICBjbGlPbmx5ID0gdHJ1ZTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICAvLyBJZiBmb3VuZCwgYXR0ZW1wdCB0byBnZXQgdGhlIHZlcnNpb25cbiAgICBpZiAocGFja2FnZUluZm8pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlSW5mby52ZXJzaW9uICsgKGNsaU9ubHkgPyAnIChjbGktb25seSknIDogJycpO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIHJldHVybiAnPGVycm9yPic7XG4gIH1cbn1cbiJdfQ==