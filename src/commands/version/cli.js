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
const SUPPORTED_NODE_MAJORS = [14, 16];
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
        var _a;
        const { packageManager, logger, root } = this.context;
        const localRequire = module_1.default.createRequire((0, path_1.resolve)(__filename, '../../../'));
        // Trailing slash is used to allow the path to be treated as a directory
        const workspaceRequire = module_1.default.createRequire(root + '/');
        const cliPackage = localRequire('./package.json');
        let workspacePackage;
        try {
            workspacePackage = workspaceRequire('./package.json');
        }
        catch (_b) { }
        const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
        const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
        const packageNames = new Set(Object.keys({
            ...cliPackage.dependencies,
            ...cliPackage.devDependencies,
            ...workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.dependencies,
            ...workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.devDependencies,
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
      Package Manager: ${packageManager.name} ${(_a = packageManager.version) !== null && _a !== void 0 ? _a : '<error>'} 
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
        catch (_a) { }
        // If not found, try to find within the CLI
        if (!packageInfo) {
            try {
                packageInfo = localRequire(`${moduleName}/package.json`);
                cliOnly = true;
            }
            catch (_b) { }
        }
        // If found, attempt to get the version
        if (packageInfo) {
            try {
                return packageInfo.version + (cliOnly ? ' (cli-only)' : '');
            }
            catch (_c) { }
        }
        return '<error>';
    }
}
exports.VersionCommandModule = VersionCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILG9EQUFnQztBQUNoQywrQkFBK0I7QUFFL0IseUVBQWtHO0FBQ2xHLGlEQUErQztBQVMvQzs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLGFBQWE7SUFDYixlQUFlO0lBQ2YsbUJBQW1CO0lBQ25CLGtCQUFrQjtJQUNsQixRQUFRO0lBQ1IsY0FBYztJQUNkLGNBQWM7SUFDZCxXQUFXO0NBQ1osQ0FBQztBQUVGLE1BQWEsb0JBQXFCLFNBQVEsOEJBQWE7SUFBdkQ7O1FBQ0UsWUFBTyxHQUFHLFNBQVMsQ0FBQztRQUNwQixZQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixhQUFRLEdBQUcsOEJBQThCLENBQUM7SUFpSjVDLENBQUM7SUE5SUMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRzs7UUFDUCxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3RELE1BQU0sWUFBWSxHQUFHLGdCQUFVLENBQUMsYUFBYSxDQUFDLElBQUEsY0FBTyxFQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLHdFQUF3RTtRQUN4RSxNQUFNLGdCQUFnQixHQUFHLGdCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUU5RCxNQUFNLFVB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QUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2FBQzlFLElBQUksRUFBRTthQUNOLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDZCxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQ3ZCLENBQUM7UUFFRixJQUFJLHNCQUFzQixFQUFFO1lBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQ1QseUNBQXlDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxnQ0FBZ0MsQ0FDL0YsQ0FBQztTQUNIO0lBQ0gsQ0FBQztJQUVPLFVBQVUsQ0FDaEIsVUFBa0IsRUFDbEIsZ0JBQTZCLEVBQzdCLFlBQXlCO1FBRXpCLElBQUksV0FBMkMsQ0FBQztRQUNoRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFFcEIsMkNBQTJDO1FBQzNDLElBQUk7WUFDRixXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxVQUFVLGVBQWUsQ0FBQyxDQUFDO1NBQzlEO1FBQUMsV0FBTSxHQUFFO1FBRVYsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDaEIsSUFBSTtnQkFDRixXQUFXLEdBQUcsWUFBWSxDQUFDLEdBQUcsVUFBVSxlQUFlLENBQUMsQ0FBQztnQkFDekQsT0FBTyxHQUFHLElBQUksQ0FBQzthQUNoQjtZQUFDLFdBQU0sR0FBRTtTQUNYO1FBRUQsdUNBQXVDO1FBQ3ZDLElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSTtnQkFDRixPQUFPLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDN0Q7WUFBQyxXQUFNLEdBQUU7U0FDWDtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQXBKRCxvREFvSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IG5vZGVNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlLCBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcblxuaW50ZXJmYWNlIFBhcnRpYWxQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG4vKipcbiAqIE1ham9yIHZlcnNpb25zIG9mIE5vZGUuanMgdGhhdCBhcmUgb2ZmaWNpYWxseSBzdXBwb3J0ZWQgYnkgQW5ndWxhci5cbiAqL1xuY29uc3QgU1VQUE9SVEVEX05PREVfTUFKT1JTID0gWzE0LCAxNl07XG5cbmNvbnN0IFBBQ0tBR0VfUEFUVEVSTlMgPSBbXG4gIC9eQGFuZ3VsYXJcXC8uKi8sXG4gIC9eQGFuZ3VsYXItZGV2a2l0XFwvLiovLFxuICAvXkBiYXplbFxcLy4qLyxcbiAgL15Abmd0b29sc1xcLy4qLyxcbiAgL15Abmd1bml2ZXJzYWxcXC8uKi8sXG4gIC9eQHNjaGVtYXRpY3NcXC8uKi8sXG4gIC9ecnhqcyQvLFxuICAvXnR5cGVzY3JpcHQkLyxcbiAgL15uZy1wYWNrYWdyJC8sXG4gIC9ed2VicGFjayQvLFxuXTtcblxuZXhwb3J0IGNsYXNzIFZlcnNpb25Db21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAndmVyc2lvbic7XG4gIGFsaWFzZXMgPSBbJ3YnXTtcbiAgZGVzY3JpYmUgPSAnT3V0cHV0cyBBbmd1bGFyIENMSSB2ZXJzaW9uLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBhc3luYyBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBwYWNrYWdlTWFuYWdlciwgbG9nZ2VyLCByb290IH0gPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgbG9jYWxSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJlc29sdmUoX19maWxlbmFtZSwgJy4uLy4uLy4uLycpKTtcbiAgICAvLyBUcmFpbGluZyBzbGFzaCBpcyB1c2VkIHRvIGFsbG93IHRoZSBwYXRoIHRvIGJlIHRyZWF0ZWQgYXMgYSBkaXJlY3RvcnlcbiAgICBjb25zdCB3b3Jrc3BhY2VSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJvb3QgKyAnLycpO1xuXG4gICAgY29uc3QgY2xpUGFja2FnZTogUGFydGlhbFBhY2thZ2VJbmZvID0gbG9jYWxSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIGxldCB3b3Jrc3BhY2VQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHdvcmtzcGFjZVBhY2thZ2UgPSB3b3Jrc3BhY2VSZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGNvbnN0IFtub2RlTWFqb3JdID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KCcuJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydCkpO1xuICAgIGNvbnN0IHVuc3VwcG9ydGVkTm9kZVZlcnNpb24gPSAhU1VQUE9SVEVEX05PREVfTUFKT1JTLmluY2x1ZGVzKG5vZGVNYWpvcik7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZXMgPSBuZXcgU2V0KFxuICAgICAgT2JqZWN0LmtleXMoe1xuICAgICAgICAuLi5jbGlQYWNrYWdlLmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4uY2xpUGFja2FnZS5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC4uLndvcmtzcGFjZVBhY2thZ2U/LmRlcGVuZGVuY2llcyxcbiAgICAgICAgLi4ud29ya3NwYWNlUGFja2FnZT8uZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIGNvbnN0IHZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHBhY2thZ2VOYW1lcykge1xuICAgICAgaWYgKFBBQ0tBR0VfUEFUVEVSTlMuc29tZSgocCkgPT4gcC50ZXN0KG5hbWUpKSkge1xuICAgICAgICB2ZXJzaW9uc1tuYW1lXSA9IHRoaXMuZ2V0VmVyc2lvbihuYW1lLCB3b3Jrc3BhY2VSZXF1aXJlLCBsb2NhbFJlcXVpcmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5nQ2xpVmVyc2lvbiA9IGNsaVBhY2thZ2UudmVyc2lvbjtcbiAgICBsZXQgYW5ndWxhckNvcmVWZXJzaW9uID0gJyc7XG4gICAgY29uc3QgYW5ndWxhclNhbWVBc0NvcmU6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAod29ya3NwYWNlUGFja2FnZSkge1xuICAgICAgLy8gRmlsdGVyIGFsbCBhbmd1bGFyIHZlcnNpb25zIHRoYXQgYXJlIHRoZSBzYW1lIGFzIGNvcmUuXG4gICAgICBhbmd1bGFyQ29yZVZlcnNpb24gPSB2ZXJzaW9uc1snQGFuZ3VsYXIvY29yZSddO1xuICAgICAgaWYgKGFuZ3VsYXJDb3JlVmVyc2lvbikge1xuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh2ZXJzaW9ucykpIHtcbiAgICAgICAgICBpZiAodmVyc2lvbiA9PT0gYW5ndWxhckNvcmVWZXJzaW9uICYmIG5hbWUuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvJykpIHtcbiAgICAgICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnB1c2gobmFtZS5yZXBsYWNlKC9eQGFuZ3VsYXJcXC8vLCAnJykpO1xuICAgICAgICAgICAgZGVsZXRlIHZlcnNpb25zW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBsaXN0IHRoZW0gaW4gYWxwaGFiZXRpY2FsIG9yZGVyLlxuICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5zb3J0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZVBhZCA9ICcgJy5yZXBlYXQoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9ucykuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF0ubGVuZ3RoICsgMyxcbiAgICApO1xuICAgIGNvbnN0IGFzY2lpQXJ0ID0gYFxuICAgICBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgIF9fX18gXyAgICAgX19fXG4gICAgLyBcXFxcICAgXyBfXyAgIF9fIF8gXyAgIF98IHwgX18gXyBfIF9fICAgICAvIF9fX3wgfCAgIHxfIF98XG4gICAvIOKWsyBcXFxcIHwgJ18gXFxcXCAvIF9cXGAgfCB8IHwgfCB8LyBfXFxgIHwgJ19ffCAgIHwgfCAgIHwgfCAgICB8IHxcbiAgLyBfX18gXFxcXHwgfCB8IHwgKF98IHwgfF98IHwgfCAoX3wgfCB8ICAgICAgfCB8X19ffCB8X19fIHwgfFxuIC9fLyAgIFxcXFxfXFxcXF98IHxffFxcXFxfXywgfFxcXFxfXyxffF98XFxcXF9fLF98X3wgICAgICAgXFxcXF9fX198X19fX198X19ffFxuICAgICAgICAgICAgICAgIHxfX18vXG4gICAgYFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgoeCkgPT4gY29sb3JzLnJlZCh4KSlcbiAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgIGxvZ2dlci5pbmZvKGFzY2lpQXJ0KTtcbiAgICBsb2dnZXIuaW5mbyhcbiAgICAgIGBcbiAgICAgIEFuZ3VsYXIgQ0xJOiAke25nQ2xpVmVyc2lvbn1cbiAgICAgIE5vZGU6ICR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSR7dW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA/ICcgKFVuc3VwcG9ydGVkKScgOiAnJ31cbiAgICAgIFBhY2thZ2UgTWFuYWdlcjogJHtwYWNrYWdlTWFuYWdlci5uYW1lfSAke3BhY2thZ2VNYW5hZ2VyLnZlcnNpb24gPz8gJzxlcnJvcj4nfSBcbiAgICAgIE9TOiAke3Byb2Nlc3MucGxhdGZvcm19ICR7cHJvY2Vzcy5hcmNofVxuXG4gICAgICBBbmd1bGFyOiAke2FuZ3VsYXJDb3JlVmVyc2lvbn1cbiAgICAgIC4uLiAke2FuZ3VsYXJTYW1lQXNDb3JlXG4gICAgICAgIC5yZWR1Y2U8c3RyaW5nW10+KChhY2MsIG5hbWUpID0+IHtcbiAgICAgICAgICAvLyBQZXJmb3JtIGEgc2ltcGxlIHdvcmQgd3JhcCBhcm91bmQgNjAuXG4gICAgICAgICAgaWYgKGFjYy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbGluZSA9IGFjY1thY2MubGVuZ3RoIC0gMV0gKyAnLCAnICsgbmFtZTtcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPiA2MCkge1xuICAgICAgICAgICAgYWNjLnB1c2gobmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjY1thY2MubGVuZ3RoIC0gMV0gPSBsaW5lO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIFtdKVxuICAgICAgICAuam9pbignXFxuLi4uICcpfVxuXG4gICAgICBQYWNrYWdlJHtuYW1lUGFkLnNsaWNlKDcpfVZlcnNpb25cbiAgICAgIC0tLS0tLS0ke25hbWVQYWQucmVwbGFjZSgvIC9nLCAnLScpfS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgJHtPYmplY3Qua2V5cyh2ZXJzaW9ucylcbiAgICAgICAgLm1hcCgobW9kdWxlKSA9PiBgJHttb2R1bGV9JHtuYW1lUGFkLnNsaWNlKG1vZHVsZS5sZW5ndGgpfSR7dmVyc2lvbnNbbW9kdWxlXX1gKVxuICAgICAgICAuc29ydCgpXG4gICAgICAgIC5qb2luKCdcXG4nKX1cbiAgICBgLnJlcGxhY2UoL14gezZ9L2dtLCAnJyksXG4gICAgKTtcblxuICAgIGlmICh1bnN1cHBvcnRlZE5vZGVWZXJzaW9uKSB7XG4gICAgICBsb2dnZXIud2FybihcbiAgICAgICAgYFdhcm5pbmc6IFRoZSBjdXJyZW50IHZlcnNpb24gb2YgTm9kZSAoJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9KSBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRWZXJzaW9uKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZyxcbiAgICB3b3Jrc3BhY2VSZXF1aXJlOiBOb2RlUmVxdWlyZSxcbiAgICBsb2NhbFJlcXVpcmU6IE5vZGVSZXF1aXJlLFxuICApOiBzdHJpbmcge1xuICAgIGxldCBwYWNrYWdlSW5mbzogUGFydGlhbFBhY2thZ2VJbmZvIHwgdW5kZWZpbmVkO1xuICAgIGxldCBjbGlPbmx5ID0gZmFsc2U7XG5cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcGFja2FnZSBpbiB0aGUgd29ya3NwYWNlXG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJbmZvID0gd29ya3NwYWNlUmVxdWlyZShgJHttb2R1bGVOYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0byBmaW5kIHdpdGhpbiB0aGUgQ0xJXG4gICAgaWYgKCFwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoYCR7bW9kdWxlTmFtZX0vcGFja2FnZS5qc29uYCk7XG4gICAgICAgIGNsaU9ubHkgPSB0cnVlO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIC8vIElmIGZvdW5kLCBhdHRlbXB0IHRvIGdldCB0aGUgdmVyc2lvblxuICAgIGlmIChwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvLnZlcnNpb24gKyAoY2xpT25seSA/ICcgKGNsaS1vbmx5KScgOiAnJyk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgcmV0dXJuICc8ZXJyb3I+JztcbiAgfVxufVxuIl19