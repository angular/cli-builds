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
exports.VersionCommand = void 0;
const child_process_1 = require("child_process");
const module_1 = __importDefault(require("module"));
const command_1 = require("../models/command");
const color_1 = require("../utilities/color");
const package_manager_1 = require("../utilities/package-manager");
/**
 * Major versions of Node.js that are officially supported by Angular.
 */
const SUPPORTED_NODE_MAJORS = [12, 14, 16];
class VersionCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.localRequire = module_1.default.createRequire(__filename);
        // Trailing slash is used to allow the path to be treated as a directory
        this.workspaceRequire = module_1.default.createRequire(this.context.root + '/');
    }
    async run() {
        const cliPackage = this.localRequire('../package.json');
        let workspacePackage;
        try {
            workspacePackage = this.workspaceRequire('./package.json');
        }
        catch (_a) { }
        const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
        const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
        const patterns = [
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
        const packageNames = [
            ...Object.keys(cliPackage.dependencies || {}),
            ...Object.keys(cliPackage.devDependencies || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.dependencies) || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.devDependencies) || {}),
        ];
        const versions = packageNames
            .filter((x) => patterns.some((p) => p.test(x)))
            .reduce((acc, name) => {
            if (name in acc) {
                return acc;
            }
            acc[name] = this.getVersion(name);
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
        this.logger.info(asciiArt);
        this.logger.info(`
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}${unsupportedNodeVersion ? ' (Unsupported)' : ''}
      Package Manager: ${await this.getPackageManager()}
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
            this.logger.warn(`Warning: The current version of Node (${process.versions.node}) is not supported by Angular.`);
        }
    }
    getVersion(moduleName) {
        let packageInfo;
        let cliOnly = false;
        // Try to find the package in the workspace
        try {
            packageInfo = this.workspaceRequire(`${moduleName}/package.json`);
        }
        catch (_a) { }
        // If not found, try to find within the CLI
        if (!packageInfo) {
            try {
                packageInfo = this.localRequire(`${moduleName}/package.json`);
                cliOnly = true;
            }
            catch (_b) { }
        }
        let version;
        // If found, attempt to get the version
        if (packageInfo) {
            try {
                version = packageInfo.version + (cliOnly ? ' (cli-only)' : '');
            }
            catch (_c) { }
        }
        return version || '<error>';
    }
    async getPackageManager() {
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
exports.VersionCommand = VersionCommand;
VersionCommand.aliases = ['v'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi1pbXBsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvdmVyc2lvbi1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILGlEQUF5QztBQUN6QyxvREFBZ0M7QUFDaEMsK0NBQTRDO0FBQzVDLDhDQUE0QztBQUM1QyxrRUFBaUU7QUFHakU7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQixHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQVMzQyxNQUFhLGNBQWUsU0FBUSxpQkFBNkI7SUFBakU7O1FBR21CLGlCQUFZLEdBQUcsZ0JBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckUsd0VBQXdFO1FBQ3ZELHFCQUFnQixHQUFHLGdCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBNEt4RixDQUFDO0lBMUtDLEtBQUssQ0FBQyxHQUFHO1FBQ1AsTUFBTSxVQUFVLEdBQXVCLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM1RSxJQUFJLGdCQUFnRCxDQUFDO1FBQ3JELElBQUk7WUFDRixnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUM1RDtRQUFDLFdBQU0sR0FBRTtRQUVWLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLHNCQUFzQixHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUSxD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TUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLG1DQUFpQixFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0QsTUFBTSxPQUFPLEdBQUcsSUFBQSx3QkFBUSxFQUFDLEdBQUcsT0FBTyxZQUFZLEVBQUU7Z0JBQy9DLFFBQVEsRUFBRSxNQUFNO2dCQUNoQixLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQztnQkFDbkMsR0FBRyxFQUFFO29CQUNILEdBQUcsT0FBTyxDQUFDLEdBQUc7b0JBQ2QsdUdBQXVHO29CQUN2RyxrQkFBa0IsRUFBRSxHQUFHO29CQUN2QiwwQkFBMEIsRUFBRSxPQUFPO2lCQUNwQzthQUNGLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVWLE9BQU8sR0FBRyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7U0FDaEM7UUFBQyxXQUFNO1lBQ04sT0FBTyxTQUFTLENBQUM7U0FDbEI7SUFDSCxDQUFDOztBQWhMSCx3Q0FpTEM7QUFoTGUsc0JBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgbm9kZU1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFZlcnNpb25Db21tYW5kU2NoZW1hIH0gZnJvbSAnLi92ZXJzaW9uJztcblxuLyoqXG4gKiBNYWpvciB2ZXJzaW9ucyBvZiBOb2RlLmpzIHRoYXQgYXJlIG9mZmljaWFsbHkgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIuXG4gKi9cbmNvbnN0IFNVUFBPUlRFRF9OT0RFX01BSk9SUyA9IFsxMiwgMTQsIDE2XTtcblxuaW50ZXJmYWNlIFBhcnRpYWxQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgY2xhc3MgVmVyc2lvbkNvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPFZlcnNpb25Db21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsndiddO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYWxSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKF9fZmlsZW5hbWUpO1xuICAvLyBUcmFpbGluZyBzbGFzaCBpcyB1c2VkIHRvIGFsbG93IHRoZSBwYXRoIHRvIGJlIHRyZWF0ZWQgYXMgYSBkaXJlY3RvcnlcbiAgcHJpdmF0ZSByZWFkb25seSB3b3Jrc3BhY2VSZXF1aXJlID0gbm9kZU1vZHVsZS5jcmVhdGVSZXF1aXJlKHRoaXMuY29udGV4dC5yb290ICsgJy8nKTtcblxuICBhc3luYyBydW4oKSB7XG4gICAgY29uc3QgY2xpUGFja2FnZTogUGFydGlhbFBhY2thZ2VJbmZvID0gdGhpcy5sb2NhbFJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuICAgIGxldCB3b3Jrc3BhY2VQYWNrYWdlOiBQYXJ0aWFsUGFja2FnZUluZm8gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHdvcmtzcGFjZVBhY2thZ2UgPSB0aGlzLndvcmtzcGFjZVJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgY29uc3QgW25vZGVNYWpvcl0gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoKHBhcnQpID0+IE51bWJlcihwYXJ0KSk7XG4gICAgY29uc3QgdW5zdXBwb3J0ZWROb2RlVmVyc2lvbiA9ICFTVVBQT1JURURfTk9ERV9NQUpPUlMuaW5jbHVkZXMobm9kZU1ham9yKTtcblxuICAgIGNvbnN0IHBhdHRlcm5zID0gW1xuICAgICAgL15AYW5ndWxhclxcLy4qLyxcbiAgICAgIC9eQGFuZ3VsYXItZGV2a2l0XFwvLiovLFxuICAgICAgL15AYmF6ZWxcXC8uKi8sXG4gICAgICAvXkBuZ3Rvb2xzXFwvLiovLFxuICAgICAgL15Abmd1bml2ZXJzYWxcXC8uKi8sXG4gICAgICAvXkBzY2hlbWF0aWNzXFwvLiovLFxuICAgICAgL15yeGpzJC8sXG4gICAgICAvXnR5cGVzY3JpcHQkLyxcbiAgICAgIC9ebmctcGFja2FnciQvLFxuICAgICAgL153ZWJwYWNrJC8sXG4gICAgXTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtcbiAgICAgIC4uLk9iamVjdC5rZXlzKGNsaVBhY2thZ2UuZGVwZW5kZW5jaWVzIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKGNsaVBhY2thZ2UuZGV2RGVwZW5kZW5jaWVzIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHdvcmtzcGFjZVBhY2thZ2U/LmRlcGVuZGVuY2llcyB8fCB7fSksXG4gICAgICAuLi5PYmplY3Qua2V5cyh3b3Jrc3BhY2VQYWNrYWdlPy5kZXZEZXBlbmRlbmNpZXMgfHwge30pLFxuICAgIF07XG5cbiAgICBjb25zdCB2ZXJzaW9ucyA9IHBhY2thZ2VOYW1lc1xuICAgICAgLmZpbHRlcigoeCkgPT4gcGF0dGVybnMuc29tZSgocCkgPT4gcC50ZXN0KHgpKSlcbiAgICAgIC5yZWR1Y2UoKGFjYywgbmFtZSkgPT4ge1xuICAgICAgICBpZiAobmFtZSBpbiBhY2MpIHtcbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9XG5cbiAgICAgICAgYWNjW25hbWVdID0gdGhpcy5nZXRWZXJzaW9uKG5hbWUpO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSBhcyB7IFttb2R1bGU6IHN0cmluZ106IHN0cmluZyB9KTtcblxuICAgIGNvbnN0IG5nQ2xpVmVyc2lvbiA9IGNsaVBhY2thZ2UudmVyc2lvbjtcbiAgICBsZXQgYW5ndWxhckNvcmVWZXJzaW9uID0gJyc7XG4gICAgY29uc3QgYW5ndWxhclNhbWVBc0NvcmU6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAod29ya3NwYWNlUGFja2FnZSkge1xuICAgICAgLy8gRmlsdGVyIGFsbCBhbmd1bGFyIHZlcnNpb25zIHRoYXQgYXJlIHRoZSBzYW1lIGFzIGNvcmUuXG4gICAgICBhbmd1bGFyQ29yZVZlcnNpb24gPSB2ZXJzaW9uc1snQGFuZ3VsYXIvY29yZSddO1xuICAgICAgaWYgKGFuZ3VsYXJDb3JlVmVyc2lvbikge1xuICAgICAgICBmb3IgKGNvbnN0IGFuZ3VsYXJQYWNrYWdlIG9mIE9iamVjdC5rZXlzKHZlcnNpb25zKSkge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHZlcnNpb25zW2FuZ3VsYXJQYWNrYWdlXSA9PSBhbmd1bGFyQ29yZVZlcnNpb24gJiZcbiAgICAgICAgICAgIGFuZ3VsYXJQYWNrYWdlLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLycpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5wdXNoKGFuZ3VsYXJQYWNrYWdlLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICcnKSk7XG4gICAgICAgICAgICBkZWxldGUgdmVyc2lvbnNbYW5ndWxhclBhY2thZ2VdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBsaXN0IHRoZW0gaW4gYWxwaGFiZXRpY2FsIG9yZGVyLlxuICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5zb3J0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZVBhZCA9ICcgJy5yZXBlYXQoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9ucykuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF0ubGVuZ3RoICsgMyxcbiAgICApO1xuICAgIGNvbnN0IGFzY2lpQXJ0ID0gYFxuICAgICBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgIF9fX18gXyAgICAgX19fXG4gICAgLyBcXFxcICAgXyBfXyAgIF9fIF8gXyAgIF98IHwgX18gXyBfIF9fICAgICAvIF9fX3wgfCAgIHxfIF98XG4gICAvIOKWsyBcXFxcIHwgJ18gXFxcXCAvIF9cXGAgfCB8IHwgfCB8LyBfXFxgIHwgJ19ffCAgIHwgfCAgIHwgfCAgICB8IHxcbiAgLyBfX18gXFxcXHwgfCB8IHwgKF98IHwgfF98IHwgfCAoX3wgfCB8ICAgICAgfCB8X19ffCB8X19fIHwgfFxuIC9fLyAgIFxcXFxfXFxcXF98IHxffFxcXFxfXywgfFxcXFxfXyxffF98XFxcXF9fLF98X3wgICAgICAgXFxcXF9fX198X19fX198X19ffFxuICAgICAgICAgICAgICAgIHxfX18vXG4gICAgYFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgoeCkgPT4gY29sb3JzLnJlZCh4KSlcbiAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oYXNjaWlBcnQpO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICBgXG4gICAgICBBbmd1bGFyIENMSTogJHtuZ0NsaVZlcnNpb259XG4gICAgICBOb2RlOiAke3Byb2Nlc3MudmVyc2lvbnMubm9kZX0ke3Vuc3VwcG9ydGVkTm9kZVZlcnNpb24gPyAnIChVbnN1cHBvcnRlZCknIDogJyd9XG4gICAgICBQYWNrYWdlIE1hbmFnZXI6ICR7YXdhaXQgdGhpcy5nZXRQYWNrYWdlTWFuYWdlcigpfVxuICAgICAgT1M6ICR7cHJvY2Vzcy5wbGF0Zm9ybX0gJHtwcm9jZXNzLmFyY2h9XG5cbiAgICAgIEFuZ3VsYXI6ICR7YW5ndWxhckNvcmVWZXJzaW9ufVxuICAgICAgLi4uICR7YW5ndWxhclNhbWVBc0NvcmVcbiAgICAgICAgLnJlZHVjZTxzdHJpbmdbXT4oKGFjYywgbmFtZSkgPT4ge1xuICAgICAgICAgIC8vIFBlcmZvcm0gYSBzaW1wbGUgd29yZCB3cmFwIGFyb3VuZCA2MC5cbiAgICAgICAgICBpZiAoYWNjLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBsaW5lID0gYWNjW2FjYy5sZW5ndGggLSAxXSArICcsICcgKyBuYW1lO1xuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDYwKSB7XG4gICAgICAgICAgICBhY2MucHVzaChuYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2FjYy5sZW5ndGggLSAxXSA9IGxpbmU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwgW10pXG4gICAgICAgIC5qb2luKCdcXG4uLi4gJyl9XG5cbiAgICAgIFBhY2thZ2Uke25hbWVQYWQuc2xpY2UoNyl9VmVyc2lvblxuICAgICAgLS0tLS0tLSR7bmFtZVBhZC5yZXBsYWNlKC8gL2csICctJyl9LS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAke09iamVjdC5rZXlzKHZlcnNpb25zKVxuICAgICAgICAubWFwKChtb2R1bGUpID0+IGAke21vZHVsZX0ke25hbWVQYWQuc2xpY2UobW9kdWxlLmxlbmd0aCl9JHt2ZXJzaW9uc1ttb2R1bGVdfWApXG4gICAgICAgIC5zb3J0KClcbiAgICAgICAgLmpvaW4oJ1xcbicpfVxuICAgIGAucmVwbGFjZSgvXiB7Nn0vZ20sICcnKSxcbiAgICApO1xuXG4gICAgaWYgKHVuc3VwcG9ydGVkTm9kZVZlcnNpb24pIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBXYXJuaW5nOiBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIE5vZGUgKCR7cHJvY2Vzcy52ZXJzaW9ucy5ub2RlfSkgaXMgbm90IHN1cHBvcnRlZCBieSBBbmd1bGFyLmAsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VmVyc2lvbihtb2R1bGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGxldCBwYWNrYWdlSW5mbzogUGFydGlhbFBhY2thZ2VJbmZvIHwgdW5kZWZpbmVkO1xuICAgIGxldCBjbGlPbmx5ID0gZmFsc2U7XG5cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcGFja2FnZSBpbiB0aGUgd29ya3NwYWNlXG4gICAgdHJ5IHtcbiAgICAgIHBhY2thZ2VJbmZvID0gdGhpcy53b3Jrc3BhY2VSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgIH0gY2F0Y2gge31cblxuICAgIC8vIElmIG5vdCBmb3VuZCwgdHJ5IHRvIGZpbmQgd2l0aGluIHRoZSBDTElcbiAgICBpZiAoIXBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICBwYWNrYWdlSW5mbyA9IHRoaXMubG9jYWxSZXF1aXJlKGAke21vZHVsZU5hbWV9L3BhY2thZ2UuanNvbmApO1xuICAgICAgICBjbGlPbmx5ID0gdHJ1ZTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBsZXQgdmVyc2lvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgLy8gSWYgZm91bmQsIGF0dGVtcHQgdG8gZ2V0IHRoZSB2ZXJzaW9uXG4gICAgaWYgKHBhY2thZ2VJbmZvKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2ZXJzaW9uID0gcGFja2FnZUluZm8udmVyc2lvbiArIChjbGlPbmx5ID8gJyAoY2xpLW9ubHkpJyA6ICcnKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICByZXR1cm4gdmVyc2lvbiB8fCAnPGVycm9yPic7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldFBhY2thZ2VNYW5hZ2VyKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1hbmFnZXIgPSBhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcih0aGlzLmNvbnRleHQucm9vdCk7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gZXhlY1N5bmMoYCR7bWFuYWdlcn0gLS12ZXJzaW9uYCwge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpZ25vcmUnXSxcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgLy8gIE5QTSB1cGRhdGVyIG5vdGlmaWVyIHdpbGwgcHJldmVudHMgdGhlIGNoaWxkIHByb2Nlc3MgZnJvbSBjbG9zaW5nIHVudGlsIGl0IHRpbWVvdXQgYWZ0ZXIgMyBtaW51dGVzLlxuICAgICAgICAgIE5PX1VQREFURV9OT1RJRklFUjogJzEnLFxuICAgICAgICAgIE5QTV9DT05GSUdfVVBEQVRFX05PVElGSUVSOiAnZmFsc2UnLFxuICAgICAgICB9LFxuICAgICAgfSkudHJpbSgpO1xuXG4gICAgICByZXR1cm4gYCR7bWFuYWdlcn0gJHt2ZXJzaW9ufWA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJzxlcnJvcj4nO1xuICAgIH1cbiAgfVxufVxuIl19