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
      Package Manager: ${this.getPackageManagerVersion()}
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
    getPackageManagerVersion() {
        try {
            const manager = this.context.packageManager;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3ZlcnNpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILGlEQUF5QztBQUN6QyxvREFBZ0M7QUFDaEMsK0JBQStCO0FBRS9CLHlFQUFrRztBQUNsRyxpREFBK0M7QUFTL0M7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQixHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRXZDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDdkIsZUFBZTtJQUNmLHNCQUFzQjtJQUN0QixhQUFhO0lBQ2IsZUFBZTtJQUNmLG1CQUFtQjtJQUNuQixrQkFBa0I7SUFDbEIsUUFBUTtJQUNSLGNBQWM7SUFDZCxjQUFjO0lBQ2QsV0FBVztDQUNaLENBQUM7QUFFRixNQUFhLG9CQUFxQixTQUFRLDhCQUFhO0lBQXZEOztRQUNFLFlBQU8sR0FBRyxTQUFTLENBQUM7UUFDcEIsWUFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEIsYUFBUSxHQUFHLDhCQUE4QixDQUFDO0lBcUs1QyxDQUFDO0lBbEtDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNuQyxNQUFNLFlBQVksR0FBRyxnQkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFBLGNBQU8sRUFBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNoRix3RUFBd0U7UUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztR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QUMsR0FBRyxPQUFPLFlBQVksRUFBRTtnQkFDL0MsUUFBUSxFQUFFLE1BQU07Z0JBQ2hCLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDO2dCQUNuQyxHQUFHLEVBQUU7b0JBQ0gsR0FBRyxPQUFPLENBQUMsR0FBRztvQkFDZCx1R0FBdUc7b0JBQ3ZHLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLDBCQUEwQixFQUFFLE9BQU87aUJBQ3BDO2FBQ0YsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRVYsT0FBTyxHQUFHLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQztTQUNoQztRQUFDLFdBQU07WUFDTixPQUFPLFNBQVMsQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQXhLRCxvREF3S0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBub2RlTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb2xvcic7XG5cbmludGVyZmFjZSBQYXJ0aWFsUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgZGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuLyoqXG4gKiBNYWpvciB2ZXJzaW9ucyBvZiBOb2RlLmpzIHRoYXQgYXJlIG9mZmljaWFsbHkgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuXG4gKi9cbmNvbnN0IFNVUFBPUlRFRF9OT0RFX01BSk9SUyA9IFsxNCwgMTZdO1xuXG5jb25zdCBQQUNLQUdFX1BBVFRFUk5TID0gW1xuICAvXkBhbmd1bGFyXFwvLiovLFxuICAvXkBhbmd1bGFyLWRldmtpdFxcLy4qLyxcbiAgL15AYmF6ZWxcXC8uKi8sXG4gIC9eQG5ndG9vbHNcXC8uKi8sXG4gIC9eQG5ndW5pdmVyc2FsXFwvLiovLFxuICAvXkBzY2hlbWF0aWNzXFwvLiovLFxuICAvXnJ4anMkLyxcbiAgL150eXBlc2NyaXB0JC8sXG4gIC9ebmctcGFja2FnciQvLFxuICAvXndlYnBhY2skLyxcbl07XG5cbmV4cG9ydCBjbGFzcyBWZXJzaW9uQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ3ZlcnNpb24nO1xuICBhbGlhc2VzID0gWyd2J107XG4gIGRlc2NyaWJlID0gJ091dHB1dHMgQW5ndWxhciBDTEkgdmVyc2lvbi4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgYXN5bmMgcnVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGxvZ2dlciA9IHRoaXMuY29udGV4dC5sb2dnZXI7XG4gICAgY29uc3QgbG9jYWxSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHJlc29sdmUoX19maWxlbmFtZSwgJy4uLy4uLy4uLycpKTtcbiAgICAvLyBUcmFpbGluZyBzbGFzaCBpcyB1c2VkIHRvIGFsbG93IHRoZSBwYXRoIHRvIGJlIHRyZWF0ZWQgYXMgYSBkaXJlY3RvcnlcbiAgICBjb25zdCB3b3Jrc3BhY2VSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHRoaXMuY29udGV4dC5yb290ICsgJy8nKTtcblxuICAgIGNvbnN0IGNsaVBhY2thZ2U6IFBhcnRpYWxQYWNrYWdlSW5mbyA9IGxvY2FsUmVxdWlyZSgnLi9wYWNrYWdlLmpzb24nKTtcbiAgICBsZXQgd29ya3NwYWNlUGFja2FnZTogUGFydGlhbFBhY2thZ2VJbmZvIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICB3b3Jrc3BhY2VQYWNrYWdlID0gd29ya3NwYWNlUmVxdWlyZSgnLi9wYWNrYWdlLmpzb24nKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICBjb25zdCBbbm9kZU1ham9yXSA9IHByb2Nlc3MudmVyc2lvbnMubm9kZS5zcGxpdCgnLicpLm1hcCgocGFydCkgPT4gTnVtYmVyKHBhcnQpKTtcbiAgICBjb25zdCB1bnN1cHBvcnRlZE5vZGVWZXJzaW9uID0gIVNVUFBPUlRFRF9OT0RFX01BSk9SUy5pbmNsdWRlcyhub2RlTWFqb3IpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWVzID0gbmV3IFNldChcbiAgICAgIE9iamVjdC5rZXlzKHtcbiAgICAgICAgLi4uY2xpUGFja2FnZS5kZXBlbmRlbmNpZXMsXG4gICAgICAgIC4uLmNsaVBhY2thZ2UuZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICAuLi53b3Jrc3BhY2VQYWNrYWdlPy5kZXBlbmRlbmNpZXMsXG4gICAgICAgIC4uLndvcmtzcGFjZVBhY2thZ2U/LmRldkRlcGVuZGVuY2llcyxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBjb25zdCB2ZXJzaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBwYWNrYWdlTmFtZXMpIHtcbiAgICAgIGlmIChQQUNLQUdFX1BBVFRFUk5TLnNvbWUoKHApID0+IHAudGVzdChuYW1lKSkpIHtcbiAgICAgICAgdmVyc2lvbnNbbmFtZV0gPSB0aGlzLmdldFZlcnNpb24obmFtZSwgd29ya3NwYWNlUmVxdWlyZSwgbG9jYWxSZXF1aXJlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBuZ0NsaVZlcnNpb24gPSBjbGlQYWNrYWdlLnZlcnNpb247XG4gICAgbGV0IGFuZ3VsYXJDb3JlVmVyc2lvbiA9ICcnO1xuICAgIGNvbnN0IGFuZ3VsYXJTYW1lQXNDb3JlOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgaWYgKHdvcmtzcGFjZVBhY2thZ2UpIHtcbiAgICAgIC8vIEZpbHRlciBhbGwgYW5ndWxhciB2ZXJzaW9ucyB0aGF0IGFyZSB0aGUgc2FtZSBhcyBjb3JlLlxuICAgICAgYW5ndWxhckNvcmVWZXJzaW9uID0gdmVyc2lvbnNbJ0Bhbmd1bGFyL2NvcmUnXTtcbiAgICAgIGlmIChhbmd1bGFyQ29yZVZlcnNpb24pIHtcbiAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXModmVyc2lvbnMpKSB7XG4gICAgICAgICAgaWYgKHZlcnNpb24gPT09IGFuZ3VsYXJDb3JlVmVyc2lvbiAmJiBuYW1lLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLycpKSB7XG4gICAgICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5wdXNoKG5hbWUucmVwbGFjZSgvXkBhbmd1bGFyXFwvLywgJycpKTtcbiAgICAgICAgICAgIGRlbGV0ZSB2ZXJzaW9uc1tuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIHN1cmUgd2UgbGlzdCB0aGVtIGluIGFscGhhYmV0aWNhbCBvcmRlci5cbiAgICAgICAgYW5ndWxhclNhbWVBc0NvcmUuc29ydCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5hbWVQYWQgPSAnICcucmVwZWF0KFxuICAgICAgT2JqZWN0LmtleXModmVyc2lvbnMpLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpWzBdLmxlbmd0aCArIDMsXG4gICAgKTtcbiAgICBjb25zdCBhc2NpaUFydCA9IGBcbiAgICAgXyAgICAgICAgICAgICAgICAgICAgICBfICAgICAgICAgICAgICAgICBfX19fIF8gICAgIF9fX1xuICAgIC8gXFxcXCAgIF8gX18gICBfXyBfIF8gICBffCB8IF9fIF8gXyBfXyAgICAgLyBfX198IHwgICB8XyBffFxuICAgLyDilrMgXFxcXCB8ICdfIFxcXFwgLyBfXFxgIHwgfCB8IHwgfC8gX1xcYCB8ICdfX3wgICB8IHwgICB8IHwgICAgfCB8XG4gIC8gX19fIFxcXFx8IHwgfCB8IChffCB8IHxffCB8IHwgKF98IHwgfCAgICAgIHwgfF9fX3wgfF9fXyB8IHxcbiAvXy8gICBcXFxcX1xcXFxffCB8X3xcXFxcX18sIHxcXFxcX18sX3xffFxcXFxfXyxffF98ICAgICAgIFxcXFxfX19ffF9fX19ffF9fX3xcbiAgICAgICAgICAgICAgICB8X19fL1xuICAgIGBcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5tYXAoKHgpID0+IGNvbG9ycy5yZWQoeCkpXG4gICAgICAuam9pbignXFxuJyk7XG5cbiAgICBsb2dnZXIuaW5mbyhhc2NpaUFydCk7XG4gICAgbG9nZ2VyLmluZm8oXG4gICAgICBgXG4gICAgICBBbmd1bGFyIENMSTogJHtuZ0NsaVZlcnNpb259XG4gICAgICBOb2RlOiAke3Byb2Nlc3MudmVyc2lvbnMubm9kZX0ke3Vuc3VwcG9ydGVkTm9kZVZlcnNpb24gPyAnIChVbnN1cHBvcnRlZCknIDogJyd9XG4gICAgICBQYWNrYWdlIE1hbmFnZXI6ICR7dGhpcy5nZXRQYWNrYWdlTWFuYWdlclZlcnNpb24oKX1cbiAgICAgIE9TOiAke3Byb2Nlc3MucGxhdGZvcm19ICR7cHJvY2Vzcy5hcmNofVxuXG4gICAgICBBbmd1bGFyOiAke2FuZ3VsYXJDb3JlVmVyc2lvbn1cbiAgICAgIC4uLiAke2FuZ3VsYXJTYW1lQXNDb3JlXG4gICAgICAgIC5yZWR1Y2U8c3RyaW5nW10+KChhY2MsIG5hbWUpID0+IHtcbiAgICAgICAgICAvLyBQZXJmb3JtIGEgc2ltcGxlIHdvcmQgd3JhcCBhcm91bmQgNjAuXG4gICAgICAgICAgaWYgKGFjYy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbGluZSA9IGFjY1thY2MubGVuZ3RoIC0gMV0gKyAnLCAnICsgbmFtZTtcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPiA2MCkge1xuICAgICAgICAgICAgYWNjLnB1c2gobmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjY1thY2MubGVuZ3RoIC0gMV0gPSBsaW5lO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIFtdKVxuICAgICAgICAuam9pbignXFxuLi4uICcpfVxuXG4gICAgICBQYWNrYWdlJHtuYW1lUGFkLnNsaWNlKDcpfVZlcnNpb25cbiAgICAgIC0tLS0tLS0ke25hbWVQYWQucmVwbGFjZSgvIC9nLCAnLScpfS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgJHtPYmplY3Qua2V5cyh2ZXJzaW9ucylcbiAgICAgICAgLm1hcCgobW9kdWxlKSA9PiBgJHttb2R1bGV9JHtuYW1lUGFkLnNsaWNlKG1vZHVsZS5sZW5ndGgpfSR7dmVyc2lvbnNbbW9kdWxlXX1gKVxuICAgICAgICAuc29ydCgpXG4gICAgICAgIC5qb2luKCdcXG4nKX1cbiAgICBgLnJlcGxhY2UoL14gezZ9L2dtLCAnJyksXG4gICAgKTtcblxuICAgIGlmICh1bnN1cHBvcnRlZE5vZGVWZXJzaW9uKSB7XG4gICAgICBsb2dnZXIud2FybihcbiAgICAgICAgYFdhcm5pbmc6IFRoZSBjdXJyZW50IHZlcnNpb24gb2YgTm9kZSAoJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9KSBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRWZXJzaW9uKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZyxcbiAgICB3b3Jrc3BhY2VSZXF1aXJlOiBOb2RlUmVxdWlyZSxcbiAgICBsb2NhbFJlcXVpcmU6IE5vZGVSZXF1aXJlLFxuICApOiBzdHJpbmcge1xuICAgIGxldCBwYWNrYWdlSW5mbzogUGFydGlhbFBhY2thZ2VJbmZvIHwgdW5kZWZpbmVkO1xuICAgIGxldCBjbGlPbmx5ID0gZmFsc2U7XG5cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcGFja2FnZSBpbiB0aGUgd29ya3NwYWNlXG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJbmZvID0gd29ya3NwYWNlUmVxdWlyZShgJHttb2R1bGVOYW1lfS9wYWNrYWdlLmpzb25gKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0byBmaW5kIHdpdGhpbiB0aGUgQ0xJXG4gICAgaWYgKCFwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFja2FnZUluZm8gPSBsb2NhbFJlcXVpcmUoYCR7bW9kdWxlTmFtZX0vcGFja2FnZS5qc29uYCk7XG4gICAgICAgIGNsaU9ubHkgPSB0cnVlO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIC8vIElmIGZvdW5kLCBhdHRlbXB0IHRvIGdldCB0aGUgdmVyc2lvblxuICAgIGlmIChwYWNrYWdlSW5mbykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvLnZlcnNpb24gKyAoY2xpT25seSA/ICcgKGNsaS1vbmx5KScgOiAnJyk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuXG4gICAgcmV0dXJuICc8ZXJyb3I+JztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UGFja2FnZU1hbmFnZXJWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1hbmFnZXIgPSB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXI7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gZXhlY1N5bmMoYCR7bWFuYWdlcn0gLS12ZXJzaW9uYCwge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpZ25vcmUnXSxcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgLy8gIE5QTSB1cGRhdGVyIG5vdGlmaWVyIHdpbGwgcHJldmVudHMgdGhlIGNoaWxkIHByb2Nlc3MgZnJvbSBjbG9zaW5nIHVudGlsIGl0IHRpbWVvdXQgYWZ0ZXIgMyBtaW51dGVzLlxuICAgICAgICAgIE5PX1VQREFURV9OT1RJRklFUjogJzEnLFxuICAgICAgICAgIE5QTV9DT05GSUdfVVBEQVRFX05PVElGSUVSOiAnZmFsc2UnLFxuICAgICAgICB9LFxuICAgICAgfSkudHJpbSgpO1xuXG4gICAgICByZXR1cm4gYCR7bWFuYWdlcn0gJHt2ZXJzaW9ufWA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJzxlcnJvcj4nO1xuICAgIH1cbiAgfVxufVxuIl19