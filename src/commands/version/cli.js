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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7O0FBRUgsb0RBQWdDO0FBQ2hDLCtCQUErQjtBQUUvQix5RUFBa0c7QUFDbEcsaURBQStDO0FBQy9DLHNEQUFpRDtBQVNqRDs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLGFBQWE7SUFDYixlQUFlO0lBQ2YsbUJBQW1CO0lBQ25CLGtCQUFrQjtJQUNsQixRQUFRO0lBQ1IsY0FBYztJQUNkLGNBQWM7SUFDZCxXQUFXO0lBQ1gsWUFBWTtDQUNiLENBQUM7QUFFRixNQUFxQixvQkFDbkIsU0FBUSw4QkFBYTtJQUdyQixPQUFPLEdBQUcsU0FBUyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyw2QkFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMxQyxRQUFRLEdBQUcsOEJBQThCLENBQUM7SUFDMUMsbUJBQW1CLENBQXNCO0lBRXpDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3RELE1BQU0sWUFBWSxHQUFHLGdCQUFVLENBQUMsYUFBYSxDQUFDLElBQUEsY0FBTyxFQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLHdFQUF3RTtRQUN4RSxNQUFNLGdCQUFnQixHQUFHLGdCQUFVLENBQUMsYUFBYSxDQUFD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QU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2FBQzlFLElBQUksRUFBRTthQUNOLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDZCxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQ3ZCLENBQUM7UUFFRixJQUFJLHNCQUFzQixFQUFFO1lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQ1QseUNBQXlDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxnQ0FBZ0MsQ0FDL0YsQ0FBQztTQUNIO0lBQ0gsQ0FBQztJQUVPLFVBQVUsQ0FDaEIsVUFBa0IsRUFDbEIsZ0JBQTZCLEVBQzdCLFlBQXlCO1FBRXpCLElBQUksV0FBMkMsQ0FBQztRQUNoRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFFcEIsMkNBQTJDO1FBQzNDLElBQUk7WUFDRixXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxVQUFVLGVBQWUsQ0FBQyxDQUFDO1NBQzlEO1FBQUMsTUFBTSxHQUFFO1FBRVYsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDaEIsSUFBSTtnQkFDRixXQUFXLEdBQUcsWUFBWSxDQUFDLEdBQUcsVUFBVSxlQUFlLENBQUMsQ0FBQztnQkFDekQsT0FBTyxHQUFHLElBQUksQ0FBQzthQUNoQjtZQUFDLE1BQU0sR0FBRTtTQUNYO1FBRUQsdUNBQXVDO1FBQ3ZDLElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSTtnQkFDRixPQUFPLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDN0Q7WUFBQyxNQUFNLEdBQUU7U0FDWDtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQXZKRCx1Q0F1SkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IG5vZGVNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlLCBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IFJvb3RDb21tYW5kcyB9IGZyb20gJy4uL2NvbW1hbmQtY29uZmlnJztcblxuaW50ZXJmYWNlIFBhcnRpYWxQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG4vKipcbiAqIE1ham9yIHZlcnNpb25zIG9mIE5vZGUuanMgdGhhdCBhcmUgb2ZmaWNpYWxseSBzdXBwb3J0ZWQgYnkgQW5ndWxhci5cbiAqL1xuY29uc3QgU1VQUE9SVEVEX05PREVfTUFKT1JTID0gWzE2LCAxOF07XG5cbmNvbnN0IFBBQ0tBR0VfUEFUVEVSTlMgPSBbXG4gIC9eQGFuZ3VsYXJcXC8uKi8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLiovLFxuICAvXkBiYXplbFxcLy4qLyxcbiAgL15Abmd0b29sc1xcLy4qLyxcbiAgL15Abmd1bml2ZXJzYWxcXC8uKi8sXG4gIC9eQHNjaGVtYXRpY3NcXC8uKi8sXG4gIC9ecnhqcyQvLFxuICAvXnR5cGVzY3JpcHQkLyxcbiAgL15uZy1wYWNrYWdyJC8sXG4gIC9ed2VicGFjayQvLFxuICAvXnpvbmVcXC5qcyQvLFxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVyc2lvbkNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uXG57XG4gIGNvbW1hbmQgPSAndmVyc2lvbic7XG4gIGFsaWFzZXMgPSBSb290Q29tbWFuZHNbJ3ZlcnNpb24nXS5hbGlhc2VzO1xuICBkZXNjcmliZSA9ICdPdXRwdXRzIEFuZ3VsYXIgQ0xJIHZlcnNpb24uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHBhY2thZ2VNYW5hZ2VyLCBsb2dnZXIsIHJvb3QgfSA9IHRoaXMuY29udGV4dDtcbiAgICBjb25zdCBsb2NhbFJlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUocmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4vLi4vLi4vJykpO1xuICAgIC8vIFRyYWlsaW5nIHNsYXNoIGlzIHVzZWQgdG8gYWxsb3cgdGhlIHBhdGggdG8gYmUgdHJlYXRlZCBhcyBhIGRpcmVjdG9yeVxuICAgIGNvbnN0IHdvcmtzcGFjZVJlcXVpcmUgPSBub2RlTW9kdWxlLmNyZWF0ZVJlcXVpcmUocm9vdCArICcvJyk7XG5cbiAgICBjb25zdCBjbGlQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgbGV0IHdvcmtzcGFjZVBhY2thZ2U6IFBhcnRpYWxQYWNrYWdlSW5mbyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlUGFja2FnZSA9IHdvcmtzcGFjZVJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgY29uc3QgW25vZGVNYWpvcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gICAgY29uc3QgdW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA9ICFTVVBQT1JURURfTk9ERV9NQUpPUlMuaW5jbHVkZXMobm9kZU1ham9yKTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IG5ldyBTZXQoXG4gICAgICBPYmplY3Qua2V5cyh7XG4gICAgICAgIC4uLmNsaVBhY2thZ2UuZGVwZW5kZW5jaWVzLFxuICAgICAgICAuLi5jbGlQYWNrYWdlLmRldkRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4ud29ya3NwYWNlUGFja2FnZT8uZGVwZW5kZW5jaWVzLFxuICAgICAgICAuLi53b3Jrc3BhY2VQYWNrYWdlPy5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgY29uc3QgdmVyc2lvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgcGFja2FnZU5hbWVzKSB7XG4gICAgICBpZiAoUEFDS0FHRV9QQVRURVJOUy5zb21lKChwKSA9PiBwLnRlc3QobmFtZSkpKSB7XG4gICAgICAgIHZlcnNpb25zW25hbWVdID0gdGhpcy5nZXRWZXJzaW9uKG5hbWUsIHdvcmtzcGFjZVJlcXVpcmUsIGxvY2FsUmVxdWlyZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmdDbGlWZXJzaW9uID0gY2xpUGFja2FnZS52ZXJzaW9uO1xuICAgIGxldCBhbmd1bGFyQ29yZVZlcnNpb24gPSAnJztcbiAgICBjb25zdCBhbmd1bGFyU2FtZUFzQ29yZTogc3RyaW5nW10gPSBbXTtcblxuICAgIGlmICh3b3Jrc3BhY2VQYWNrYWdlKSB7XG4gICAgICAvLyBGaWx0ZXIgYWxsIGFuZ3VsYXIgdmVyc2lvbnMgdGhhdCBhcmUgdGhlIHNhbWUgYXMgY29yZS5cbiAgICAgIGFuZ3VsYXJDb3JlVmVyc2lvbiA9IHZlcnNpb25zWydAYW5ndWxhci9jb3JlJ107XG4gICAgICBpZiAoYW5ndWxhckNvcmVWZXJzaW9uKSB7XG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHZlcnNpb25zKSkge1xuICAgICAgICAgIGlmICh2ZXJzaW9uID09PSBhbmd1bGFyQ29yZVZlcnNpb24gJiYgbmFtZS5zdGFydHNXaXRoKCdAYW5ndWxhci8nKSkge1xuICAgICAgICAgICAgYW5ndWxhclNhbWVBc0NvcmUucHVzaChuYW1lLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICcnKSk7XG4gICAgICAgICAgICBkZWxldGUgdmVyc2lvbnNbbmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGxpc3QgdGhlbSBpbiBhbHBoYWJldGljYWwgb3JkZXIuXG4gICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnNvcnQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBuYW1lUGFkID0gJyAnLnJlcGVhdChcbiAgICAgIE9iamVjdC5rZXlzKHZlcnNpb25zKS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKVswXS5sZW5ndGggKyAzLFxuICAgICk7XG4gICAgY29uc3QgYXNjaWlBcnQgPSBgXG4gICAgIF8gICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgX19fXyBfICAgICBfX19cbiAgICAvIFxcXFwgICBfIF9fICAgX18gXyBfICAgX3wgfCBfXyBfIF8gX18gICAgIC8gX19ffCB8ICAgfF8gX3xcbiAgIC8g4pazIFxcXFwgfCAnXyBcXFxcIC8gX1xcYCB8IHwgfCB8IHwvIF9cXGAgfCAnX198ICAgfCB8ICAgfCB8ICAgIHwgfFxuICAvIF9fXyBcXFxcfCB8IHwgfCAoX3wgfCB8X3wgfCB8IChffCB8IHwgICAgICB8IHxfX198IHxfX18gfCB8XG4gL18vICAgXFxcXF9cXFxcX3wgfF98XFxcXF9fLCB8XFxcXF9fLF98X3xcXFxcX18sX3xffCAgICAgICBcXFxcX19fX3xfX19fX3xfX198XG4gICAgICAgICAgICAgICAgfF9fXy9cbiAgICBgXG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKCh4KSA9PiBjb2xvcnMucmVkKHgpKVxuICAgICAgLmpvaW4oJ1xcbicpO1xuXG4gICAgbG9nZ2VyLmluZm8oYXNjaWlBcnQpO1xuICAgIGxvZ2dlci5pbmZvKFxuICAgICAgYFxuICAgICAgQW5ndWxhciBDTEk6ICR7bmdDbGlWZXJzaW9ufVxuICAgICAgTm9kZTogJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9JHt1bnN1cHBvcnRlZE5vZGVWZXJzaW9uID8gJyAoVW5zdXBwb3J0ZWQpJyA6ICcnfVxuICAgICAgUGFja2FnZSBNYW5hZ2VyOiAke3BhY2thZ2VNYW5hZ2VyLm5hbWV9ICR7cGFja2FnZU1hbmFnZXIudmVyc2lvbiA/PyAnPGVycm9yPid9XG4gICAgICBPUzogJHtwcm9jZXNzLnBsYXRmb3JtfSAke3Byb2Nlc3MuYXJjaH1cblxuICAgICAgQW5ndWxhcjogJHthbmd1bGFyQ29yZVZlcnNpb259XG4gICAgICAuLi4gJHthbmd1bGFyU2FtZUFzQ29yZVxuICAgICAgICAucmVkdWNlPHN0cmluZ1tdPigoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgICAgLy8gUGVyZm9ybSBhIHNpbXBsZSB3b3JkIHdyYXAgYXJvdW5kIDYwLlxuICAgICAgICAgIGlmIChhY2MubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbbmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGxpbmUgPSBhY2NbYWNjLmxlbmd0aCAtIDFdICsgJywgJyArIG5hbWU7XG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID4gNjApIHtcbiAgICAgICAgICAgIGFjYy5wdXNoKG5hbWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY2NbYWNjLmxlbmd0aCAtIDFdID0gbGluZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCBbXSlcbiAgICAgICAgLmpvaW4oJ1xcbi4uLiAnKX1cblxuICAgICAgUGFja2FnZSR7bmFtZVBhZC5zbGljZSg3KX1WZXJzaW9uXG4gICAgICAtLS0tLS0tJHtuYW1lUGFkLnJlcGxhY2UoLyAvZywgJy0nKX0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICR7T2JqZWN0LmtleXModmVyc2lvbnMpXG4gICAgICAgIC5tYXAoKG1vZHVsZSkgPT4gYCR7bW9kdWxlfSR7bmFtZVBhZC5zbGljZShtb2R1bGUubGVuZ3RoKX0ke3ZlcnNpb25zW21vZHVsZV19YClcbiAgICAgICAgLnNvcnQoKVxuICAgICAgICAuam9pbignXFxuJyl9XG4gICAgYC5yZXBsYWNlKC9eIHs2fS9nbSwgJycpLFxuICAgICk7XG5cbiAgICBpZiAodW5zdXBwb3J0ZWROb2RlVmVyc2lvbikge1xuICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgIGBXYXJuaW5nOiBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIE5vZGUgKCR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSkgaXMgbm90IHN1cHBvcnRlZCBieSBBbmd1bGFyLmAsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VmVyc2lvbihcbiAgICBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgd29ya3NwYWNlUmVxdWlyZTogTm9kZVJlcXVpcmUsXG4gICAgbG9jYWxSZXF1aXJlOiBOb2RlUmVxdWlyZSxcbiAgKTogc3RyaW5nIHtcbiAgICBsZXQgcGFja2FnZUluZm86IFBhcnRpYWxQYWNrYWdlSW5mbyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY2xpT25seSA9IGZhbHNlO1xuXG4gICAgLy8gVHJ5IHRvIGZpbmQgdGhlIHBhY2thZ2UgaW4gdGhlIHdvcmtzcGFjZVxuICAgIHRyeSB7XG4gICAgICBwYWNrYWdlSW5mbyA9IHdvcmtzcGFjZVJlcXVpcmUoYCR7bW9kdWxlTmFtZX0vcGFja2FnZS5qc29uYCk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgLy8gSWYgbm90IGZvdW5kLCB0cnkgdG8gZmluZCB3aXRoaW4gdGhlIENMSVxuICAgIGlmICghcGFja2FnZUluZm8pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhY2thZ2VJbmZvID0gbG9jYWxSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgICAgICBjbGlPbmx5ID0gdHJ1ZTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICAvLyBJZiBmb3VuZCwgYXR0ZW1wdCB0byBnZXQgdGhlIHZlcnNpb25cbiAgICBpZiAocGFja2FnZUluZm8pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlSW5mby52ZXJzaW9uICsgKGNsaU9ubHkgPyAnIChjbGktb25seSknIDogJycpO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIHJldHVybiAnPGVycm9yPic7XG4gIH1cbn1cbiJdfQ==