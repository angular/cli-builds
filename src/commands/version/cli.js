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
const child_process_1 = require("child_process");
const module_1 = __importDefault(require("module"));
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const color_1 = require("../../utilities/color");
const package_manager_1 = require("../../utilities/package-manager");
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
        const logger = this.context.logger;
        const localRequire = module_1.default.createRequire((0, path_1.resolve)(__filename, '../../../'));
        // Trailing slash is used to allow the path to be treated as a directory
        const workspaceRequire = module_1.default.createRequire(this.context.root + '/');
        const cliPackage = localRequire('./package.json');
        let workspacePackage;
        try {
            workspacePackage = workspaceRequire('./package.json');
        }
        catch (_a) { }
        const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
        const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
        const packageNames = [
            ...Object.keys(cliPackage.dependencies || {}),
            ...Object.keys(cliPackage.devDependencies || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.dependencies) || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.devDependencies) || {}),
        ];
        const versions = packageNames
            .filter((x) => PACKAGE_PATTERNS.some((p) => p.test(x)))
            .reduce((acc, name) => {
            if (name in acc) {
                return acc;
            }
            acc[name] = this.getVersion(name, workspaceRequire, localRequire);
            return acc;
        }, {});
        const ngCliVersion = cliPackage.version;
        let angularCoreVersion = '';
        const angularSameAsCore = [];
        if (workspacePackage) {
            // Filter all angular versions that are the same as core.
            angularCoreVersion = versions['@angular/core'];
            if (angularCoreVersion) {
                for (const angularPackage of Object.keys(versions)) {
                    if (versions[angularPackage] == angularCoreVersion &&
                        angularPackage.startsWith('@angular/')) {
                        angularSameAsCore.push(angularPackage.replace(/^@angular\//, ''));
                        delete versions[angularPackage];
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
      Package Manager: ${await this.getPackageManagerVersion()}
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
    async getPackageManagerVersion() {
        try {
            const manager = await (0, package_manager_1.getPackageManager)(this.context.root);
            const version = (0, child_process_1.execSync)(`${manager} --version`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                env: {
                    ...process.env,
                    //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
                    NO_UPDATE_NOTIFIER: '1',
                    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
                },
            }).trim();
            return `${manager} ${version}`;
        }
        catch (_a) {
            return '<error>';
        }
    }
}
exports.VersionCommandModule = VersionCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILGlEQUF5QztBQUN6QyxvREFBZ0M7QUFDaEMsK0JBQStCO0FBRS9CLHlFQUFrRztBQUNsRyxpREFBK0M7QUFDL0MscUVBQW9FO0FBU3BFOztHQUVHO0FBQ0gsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUV2QyxNQUFNLGdCQUFnQixHQUFHO0lBQ3ZCLGVBQWU7SUFDZixzQkFBc0I7SUFDdEIsYUFBYTtJQUNiLGVBQWU7SUFDZixtQkFBbUI7SUFDbkIsa0JBQWtCO0lBQ2xCLFFBQVE7SUFDUixjQUFjO0lBQ2QsY0FBYztJQUNkLFdBQVc7Q0FDWixDQUFDO0FBRUYsTUFBYSxvQkFBcUIsU0FBUSw4QkFBYTtJQUF2RDs7UUFDRSxZQUFPLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLFlBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLGFBQVEsR0FBRyw4QkFBOEIsQ0FBQztJQTJLNUMsQ0FBQztJQXhLQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHO1FBQ1AsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDbkMsTUFBTSxZQUFZLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBQSxjQUFPLEVBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsd0VBQXdFO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsR0FB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RixPQUFPLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDN0Q7WUFBQyxXQUFNLEdBQUU7U0FDWDtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3BDLElBQUk7WUFDRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUEsbUNBQWlCLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFBLHdCQUFRLEVBQUMsR0FBRyxPQUFPLFlBQVksRUFBRTtnQkFDL0MsUUFBUSxFQUFFLE1BQU07Z0JBQ2hCLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDO2dCQUNuQyxHQUFHLEVBQUU7b0JBQ0gsR0FBRyxPQUFPLENBQUMsR0FBRztvQkFDZCx1R0FBdUc7b0JBQ3ZHLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLDBCQUEwQixFQUFFLE9BQU87aUJBQ3BDO2FBQ0YsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRVYsT0FBTyxHQUFHLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQztTQUNoQztRQUFDLFdBQU07WUFDTixPQUFPLFNBQVMsQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQTlLRCxvREE4S0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBub2RlTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuXG5pbnRlcmZhY2UgUGFydGlhbFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogTWFqb3IgdmVyc2lvbnMgb2YgTm9kZS5qcyB0aGF0IGFyZSBvZmZpY2lhbGx5IHN1cHBvcnRlZCBieSBBbmd1bGFyLlxuICovXG5jb25zdCBTVVBQT1JURURfTk9ERV9NQUpPUlMgPSBbMTQsIDE2XTtcblxuY29uc3QgUEFDS0FHRV9QQVRURVJOUyA9IFtcbiAgL15AYW5ndWxhclxcLy4qLyxcbiAgL15AYW5ndWxhci1kZXZraXRcXC8uKi8sXG4gIC9eQGJhemVsXFwvLiovLFxuICAvXkBuZ3Rvb2xzXFwvLiovLFxuICAvXkBuZ3VuaXZlcnNhbFxcLy4qLyxcbiAgL15Ac2NoZW1hdGljc1xcLy4qLyxcbiAgL15yeGpzJC8sXG4gIC9edHlwZXNjcmlwdCQvLFxuICAvXm5nLXBhY2thZ3IkLyxcbiAgL153ZWJwYWNrJC8sXG5dO1xuXG5leHBvcnQgY2xhc3MgVmVyc2lvbkNvbW1hbmRNb2R1bGUgZXh0ZW5kcyBDb21tYW5kTW9kdWxlIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIHtcbiAgY29tbWFuZCA9ICd2ZXJzaW9uJztcbiAgYWxpYXNlcyA9IFsndiddO1xuICBkZXNjcmliZSA9ICdPdXRwdXRzIEFuZ3VsYXIgQ0xJIHZlcnNpb24uJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2IHtcbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBsb2dnZXIgPSB0aGlzLmNvbnRleHQubG9nZ2VyO1xuICAgIGNvbnN0IGxvY2FsUmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZShyZXNvbHZlKF9fZmlsZW5hbWUsICcuLi8uLi8uLi8nKSk7XG4gICAgLy8gVHJhaWxpbmcgc2xhc2ggaXMgdXNlZCB0byBhbGxvdyB0aGUgcGF0aCB0byBiZSB0cmVhdGVkIGFzIGEgZGlyZWN0b3J5XG4gICAgY29uc3Qgd29ya3NwYWNlUmVxdWlyZSA9IG5vZGVNb2R1bGUuY3JlYXRlUmVxdWlyZSh0aGlzLmNvbnRleHQucm9vdCArICcvJyk7XG5cbiAgICBjb25zdCBjbGlQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgbGV0IHdvcmtzcGFjZVBhY2thZ2U6IFBhcnRpYWxQYWNrYWdlSW5mbyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgd29ya3NwYWNlUGFja2FnZSA9IHdvcmtzcGFjZVJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgY29uc3QgW25vZGVNYWpvcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gICAgY29uc3QgdW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA9ICFTVVBQT1JURURfTk9ERV9NQUpPUlMuaW5jbHVkZXMobm9kZU1ham9yKTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtcbiAgICAgIC4uLk9iamVjdC5rZXlzKGNsaVBhY2thZ2UuZGVwZW5kZW5jaWVzIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKGNsaVBhY2thZ2UuZGV2RGVwZW5kZW5jaWVzIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHdvcmtzcGFjZVBhY2thZ2U/LmRlcGVuZGVuY2llcyB8fCB7fSksXG4gICAgICAuLi5PYmplY3Qua2V5cyh3b3Jrc3BhY2VQYWNrYWdlPy5kZXZEZXBlbmRlbmNpZXMgfHwge30pLFxuICAgIF07XG5cbiAgICBjb25zdCB2ZXJzaW9ucyA9IHBhY2thZ2VOYW1lc1xuICAgICAgLmZpbHRlcigoeCkgPT4gUEFDS0FHRV9QQVRURVJOUy5zb21lKChwKSA9PiBwLnRlc3QoeCkpKVxuICAgICAgLnJlZHVjZSgoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgIGlmIChuYW1lIGluIGFjYykge1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH1cblxuICAgICAgICBhY2NbbmFtZV0gPSB0aGlzLmdldFZlcnNpb24obmFtZSwgd29ya3NwYWNlUmVxdWlyZSwgbG9jYWxSZXF1aXJlKTtcblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwge30gYXMgeyBbbW9kdWxlOiBzdHJpbmddOiBzdHJpbmcgfSk7XG5cbiAgICBjb25zdCBuZ0NsaVZlcnNpb24gPSBjbGlQYWNrYWdlLnZlcnNpb247XG4gICAgbGV0IGFuZ3VsYXJDb3JlVmVyc2lvbiA9ICcnO1xuICAgIGNvbnN0IGFuZ3VsYXJTYW1lQXNDb3JlOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgaWYgKHdvcmtzcGFjZVBhY2thZ2UpIHtcbiAgICAgIC8vIEZpbHRlciBhbGwgYW5ndWxhciB2ZXJzaW9ucyB0aGF0IGFyZSB0aGUgc2FtZSBhcyBjb3JlLlxuICAgICAgYW5ndWxhckNvcmVWZXJzaW9uID0gdmVyc2lvbnNbJ0Bhbmd1bGFyL2NvcmUnXTtcbiAgICAgIGlmIChhbmd1bGFyQ29yZVZlcnNpb24pIHtcbiAgICAgICAgZm9yIChjb25zdCBhbmd1bGFyUGFja2FnZSBvZiBPYmplY3Qua2V5cyh2ZXJzaW9ucykpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB2ZXJzaW9uc1thbmd1bGFyUGFja2FnZV0gPT0gYW5ndWxhckNvcmVWZXJzaW9uICYmXG4gICAgICAgICAgICBhbmd1bGFyUGFja2FnZS5zdGFydHNXaXRoKCdAYW5ndWxhci8nKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgYW5ndWxhclNhbWVBc0NvcmUucHVzaChhbmd1bGFyUGFja2FnZS5yZXBsYWNlKC9eQGFuZ3VsYXJcXC8vLCAnJykpO1xuICAgICAgICAgICAgZGVsZXRlIHZlcnNpb25zW2FuZ3VsYXJQYWNrYWdlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIHN1cmUgd2UgbGlzdCB0aGVtIGluIGFscGhhYmV0aWNhbCBvcmRlci5cbiAgICAgICAgYW5ndWxhclNhbWVBc0NvcmUuc29ydCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5hbWVQYWQgPSAnICcucmVwZWF0KFxuICAgICAgT2JqZWN0LmtleXModmVyc2lvbnMpLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpWzBdLmxlbmd0aCArIDMsXG4gICAgKTtcbiAgICBjb25zdCBhc2NpaUFydCA9IGBcbiAgICAgXyAgICAgICAgICAgICAgICAgICAgICBfICAgICAgICAgICAgICAgICBfX19fIF8gICAgIF9fX1xuICAgIC8gXFxcXCAgIF8gX18gICBfXyBfIF8gICBffCB8IF9fIF8gXyBfXyAgICAgLyBfX198IHwgICB8XyBffFxuICAgLyDilrMgXFxcXCB8ICdfIFxcXFwgLyBfXFxgIHwgfCB8IHwgfC8gX1xcYCB8ICdfX3wgICB8IHwgICB8IHwgICAgfCB8XG4gIC8gX19fIFxcXFx8IHwgfCB8IChffCB8IHxffCB8IHwgKF98IHwgfCAgICAgIHwgfF9fX3wgfF9fXyB8IHxcbiAvXy8gICBcXFxcX1xcXFxffCB8X3xcXFxcX18sIHxcXFxcX18sX3xffFxcXFxfXyxffF98ICAgICAgIFxcXFxfX19ffF9fX19ffF9fX3xcbiAgICAgICAgICAgICAgICB8X19fL1xuICAgIGBcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5tYXAoKHgpID0+IGNvbG9ycy5yZWQoeCkpXG4gICAgICAuam9pbignXFxuJyk7XG5cbiAgICBsb2dnZXIuaW5mbyhhc2NpaUFydCk7XG4gICAgbG9nZ2VyLmluZm8oXG4gICAgICBgXG4gICAgICBBbmd1bGFyIENMSTogJHtuZ0NsaVZlcnNpb259XG4gICAgICBOb2RlOiAke3Byb2Nlc3MudmVyc2lvbnMubm9kZX0ke3Vuc3VwcG9ydGVkTm9kZVZlcnNpb24gPyAnIChVbnN1cHBvcnRlZCknIDogJyd9XG4gICAgICBQYWNrYWdlIE1hbmFnZXI6ICR7YXdhaXQgdGhpcy5nZXRQYWNrYWdlTWFuYWdlclZlcnNpb24oKX1cbiAgICAgIE9TOiAke3Byb2Nlc3MucGxhdGZvcm19ICR7cHJvY2Vzcy5hcmNofVxuXG4gICAgICBBbmd1bGFyOiAke2FuZ3VsYXJDb3JlVmVyc2lvbn1cbiAgICAgIC4uLiAke2FuZ3VsYXJTYW1lQXNDb3JlXG4gICAgICAgIC5yZWR1Y2U8c3RyaW5nW10+KChhY2MsIG5hbWUpID0+IHtcbiAgICAgICAgICAvLyBQZXJmb3JtIGEgc2ltcGxlIHdvcmQgd3JhcCBhcm91bmQgNjAuXG4gICAgICAgICAgaWYgKGFjYy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbGluZSA9IGFjY1thY2MubGVuZ3RoIC0gMV0gKyAnLCAnICsgbmFtZTtcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPiA2MCkge1xuICAgICAgICAgICAgYWNjLnB1c2gobmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjY1thY2MubGVuZ3RoIC0gMV0gPSBsaW5lO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIFtdKVxuICAgICAgICAuam9pbignXFxuLi4uICcpfVxuXG4gICAgICBQYWNrYWdlJHtuYW1lUGFkLnNsaWNlKDcpfVZlcnNpb25cbiAgICAgIC0tLS0tLS0ke25hbWVQYWQucmVwbGFjZSgvIC9nLCAnLScpfS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgJHtPYmplY3Qua2V5cyh2ZXJzaW9ucylcbiAgICAgICAgLm1hcCgobW9kdWxlKSA9PiBgJHttb2R1bGV9JHtuYW1lUGFkLnNsaWNlKG1vZHVsZS5sZW5ndGgpfSR7dmVyc2lvbnNbbW9kdWxlXX1gKVxuICAgICAgICAuc29ydCgpXG4gICAgICAgIC5qb2luKCdcXG4nKX1cbiAgICBgLnJlcGxhY2UoL14gezZ9L2dtLCAnJyksXG4gICAgKTtcblxuICAgIGlmICh1bnN1cHBvcnRlZE5vZGVWZXJzaW9uKSB7XG4gICAgICBsb2dnZXIud2FybihcbiAgICAgICAgYFdhcm5pbmc6IFRoZSBjdXJyZW50IHZlcnNpb24gb2YgTm9kZSAoJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9KSBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRWZXJzaW9uKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZyxcbiAgICB3b3Jrc3BhY2VSZXF1aXJlOiBOb2RlUmVxdWlyZSxcbiAgICBsb2NhbFJlcXVpcmU6IE5vZGVSZXF1aXJlLFxuICApOiBzdHJpbmcge1xuICAgIGxldCBwYWNrYWdlSW5mbzogUGFydGlhbFBhY2thZ2VJbmZvIHwgdW5kZWZpbmVkO1xuICAgIGxldCBjbGlPbmx5ID0gZmFsc2U7XG5cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcGFja2FnZSBpbiB0aGUgd29ya3NwYWNlXG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJbmZvID0gd29ya3NwYWNlUmVxdWlyZShgJHttb2R1bGVOYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0byBmaW5kIHdpdGhpbiB0aGUgQ0xJXG4gICAgaWYgKCFwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoYCR7bW9kdWxlTmFtZX0vcGFja2FnZS5qc29uYCk7XG4gICAgICAgIGNsaU9ubHkgPSB0cnVlO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIC8vIElmIGZvdW5kLCBhdHRlbXB0IHRvIGdldCB0aGUgdmVyc2lvblxuICAgIGlmIChwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvLnZlcnNpb24gKyAoY2xpT25seSA/ICcgKGNsaS1vbmx5KScgOiAnJyk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgcmV0dXJuICc8ZXJyb3I+JztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0UGFja2FnZU1hbmFnZXJWZXJzaW9uKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcih0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gZXhlY1N5bmMoYCR7bWFuYWdlcn0gLS12ZXJzaW9uYCwge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpZ25vcmUnXSxcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgLy8gIE5QTSB1cGRhdGVyIG5vdGlmaWVyIHdpbGwgcHJldmVudHMgdGhlIGNoaWxkIHByb2Nlc3MgZnJvbSBjbG9zaW5nIHVudGlsIGl0IHRpbWVvdXQgYWZ0ZXIgMyBtaW51dGVzLlxuICAgICAgICAgIE5PX1VQREFURV9OT1RJRklFUjogJzEnLFxuICAgICAgICAgIE5QTV9DT05GSUdfVVBEQVRFX05PVElGSUVSOiAnZmFsc2UnLFxuICAgICAgICB9LFxuICAgICAgfSkudHJpbSgpO1xuXG4gICAgICByZXR1cm4gYCR7bWFuYWdlcn0gJHt2ZXJzaW9ufWA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJzxlcnJvcj4nO1xuICAgIH1cbiAgfVxufVxuIl19