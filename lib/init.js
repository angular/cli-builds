"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("symbol-observable");
// symbol polyfill must go first
const fs_1 = require("fs");
const module_1 = require("module");
const path = __importStar(require("path"));
const semver_1 = require("semver");
const color_1 = require("../src/utilities/color");
const config_1 = require("../src/utilities/config");
const environment_options_1 = require("../src/utilities/environment-options");
const version_1 = require("../src/utilities/version");
/**
 * Angular CLI versions prior to v14 may not exit correctly if not forcibly exited
 * via `process.exit()`. When bootstrapping, `forceExit` will be set to `true`
 * if the local CLI version is less than v14 to prevent the CLI from hanging on
 * exit in those cases.
 */
let forceExit = false;
(async () => {
    var _a;
    /**
     * Disable Browserslist old data warning as otherwise with every release we'd need to update this dependency
     * which is cumbersome considering we pin versions and the warning is not user actionable.
     * `Browserslist: caniuse-lite is outdated. Please run next command `npm update`
     * See: https://github.com/browserslist/browserslist/blob/819c4337456996d19db6ba953014579329e9c6e1/node.js#L324
     */
    process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';
    /**
     * Disable CLI version mismatch checks and forces usage of the invoked CLI
     * instead of invoking the local installed version.
     */
    if (environment_options_1.disableVersionCheck) {
        return (await Promise.resolve().then(() => __importStar(require('./cli')))).default;
    }
    let cli;
    const rawCommandName = process.argv[2];
    try {
        // No error implies a projectLocalCli, which will load whatever
        // version of ng-cli you have installed in a local package.json
        const cwdRequire = (0, module_1.createRequire)(process.cwd() + '/');
        const projectLocalCli = cwdRequire.resolve('@angular/cli');
        cli = await Promise.resolve().then(() => __importStar(require(projectLocalCli)));
        const globalVersion = new semver_1.SemVer(version_1.VERSION.full);
        // Older versions might not have the VERSION export
        let localVersion = (_a = cli.VERSION) === null || _a === void 0 ? void 0 : _a.full;
        if (!localVersion) {
            try {
                const localPackageJson = await fs_1.promises.readFile(path.join(path.dirname(projectLocalCli), '../../package.json'), 'utf-8');
                localVersion = JSON.parse(localPackageJson).version;
            }
            catch (error) {
                // eslint-disable-next-line  no-console
                console.error('Version mismatch check skipped. Unable to retrieve local version: ' + error);
            }
        }
        // Ensure older versions of the CLI fully exit
        if ((0, semver_1.major)(localVersion) < 14) {
            forceExit = true;
            // Versions prior to 14 didn't implement completion command.
            if (rawCommandName === 'completion') {
                return null;
            }
        }
        let isGlobalGreater = false;
        try {
            isGlobalGreater = !!localVersion && globalVersion.compare(localVersion) > 0;
        }
        catch (error) {
            // eslint-disable-next-line  no-console
            console.error('Version mismatch check skipped. Unable to compare local version: ' + error);
        }
        // When using the completion command, don't show the warning as otherwise this will break completion.
        if (isGlobalGreater && rawCommandName !== 'completion') {
            // If using the update command and the global version is greater, use the newer update command
            // This allows improvements in update to be used in older versions that do not have bootstrapping
            if (rawCommandName === 'update' &&
                cli.VERSION &&
                cli.VERSION.major - globalVersion.major <= 1) {
                cli = await Promise.resolve().then(() => __importStar(require('./cli')));
            }
            else if (await (0, config_1.isWarningEnabled)('versionMismatch')) {
                // Otherwise, use local version and warn if global is newer than local
                const warning = `Your global Angular CLI version (${globalVersion}) is greater than your local ` +
                    `version (${localVersion}). The local Angular CLI version is used.\n\n` +
                    'To disable this warning use "ng config -g cli.warnings.versionMismatch false".';
                // eslint-disable-next-line  no-console
                console.error(color_1.colors.yellow(warning));
            }
        }
    }
    catch (_b) {
        // If there is an error, resolve could not find the ng-cli
        // library from a package.json. Instead, include it from a relative
        // path to this script file (which is likely a globally installed
        // npm package). Most common cause for hitting this is `ng new`
        cli = await Promise.resolve().then(() => __importStar(require('./cli')));
    }
    if ('default' in cli) {
        cli = cli['default'];
    }
    return cli;
})()
    .then((cli) => cli === null || cli === void 0 ? void 0 : cli({
    cliArgs: process.argv.slice(2),
}))
    .then((exitCode = 0) => {
    if (forceExit) {
        process.exit(exitCode);
    }
    process.exitCode = exitCode;
})
    .catch((err) => {
    // eslint-disable-next-line  no-console
    console.error('Unknown error: ' + err.toString());
    process.exit(127);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQyxtQ0FBdUM7QUFDdkMsMkNBQTZCO0FBQzdCLG1DQUF1QztBQUN2QyxrREFBZ0Q7QUFDaEQsb0RBQTJEO0FBQzNELDhFQUEyRTtBQUMzRSxzREFBbUQ7QUFFbkQ7Ozs7O0dBS0c7QUFDSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFFdEIsQ0FBQyxLQUFLLElBQW9ELEVBQUU7O0lBQzFEOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFFL0M7OztPQUdHO0lBQ0gsSUFBSSx5Q0FBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdkMsSUFBSTtRQUNGLCtEQUErRDtRQUMvRCwrREFBK0Q7UUFDL0QsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQkFBYSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN0RCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNELEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFtRDtRQUNuRCxJQUFJ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R0FBVSxFQUFFLEVBQUU7SUFDcEIsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgJ3N5bWJvbC1vYnNlcnZhYmxlJztcbi8vIHN5bWJvbCBwb2x5ZmlsbCBtdXN0IGdvIGZpcnN0XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNlbVZlciwgbWFqb3IgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBpc1dhcm5pbmdFbmFibGVkIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuLyoqXG4gKiBBbmd1bGFyIENMSSB2ZXJzaW9ucyBwcmlvciB0byB2MTQgbWF5IG5vdCBleGl0IGNvcnJlY3RseSBpZiBub3QgZm9yY2libHkgZXhpdGVkXG4gKiB2aWEgYHByb2Nlc3MuZXhpdCgpYC4gV2hlbiBib290c3RyYXBwaW5nLCBgZm9yY2VFeGl0YCB3aWxsIGJlIHNldCB0byBgdHJ1ZWBcbiAqIGlmIHRoZSBsb2NhbCBDTEkgdmVyc2lvbiBpcyBsZXNzIHRoYW4gdjE0IHRvIHByZXZlbnQgdGhlIENMSSBmcm9tIGhhbmdpbmcgb25cbiAqIGV4aXQgaW4gdGhvc2UgY2FzZXMuXG4gKi9cbmxldCBmb3JjZUV4aXQgPSBmYWxzZTtcblxuKGFzeW5jICgpOiBQcm9taXNlPHR5cGVvZiBpbXBvcnQoJy4vY2xpJykuZGVmYXVsdCB8IG51bGw+ID0+IHtcbiAgLyoqXG4gICAqIERpc2FibGUgQnJvd3NlcnNsaXN0IG9sZCBkYXRhIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHdpdGggZXZlcnkgcmVsZWFzZSB3ZSdkIG5lZWQgdG8gdXBkYXRlIHRoaXMgZGVwZW5kZW5jeVxuICAgKiB3aGljaCBpcyBjdW1iZXJzb21lIGNvbnNpZGVyaW5nIHdlIHBpbiB2ZXJzaW9ucyBhbmQgdGhlIHdhcm5pbmcgaXMgbm90IHVzZXIgYWN0aW9uYWJsZS5cbiAgICogYEJyb3dzZXJzbGlzdDogY2FuaXVzZS1saXRlIGlzIG91dGRhdGVkLiBQbGVhc2UgcnVuIG5leHQgY29tbWFuZCBgbnBtIHVwZGF0ZWBcbiAgICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcnNsaXN0L2Jyb3dzZXJzbGlzdC9ibG9iLzgxOWM0MzM3NDU2OTk2ZDE5ZGI2YmE5NTMwMTQ1NzkzMjllOWM2ZTEvbm9kZS5qcyNMMzI0XG4gICAqL1xuICBwcm9jZXNzLmVudi5CUk9XU0VSU0xJU1RfSUdOT1JFX09MRF9EQVRBID0gJzEnO1xuXG4gIC8qKlxuICAgKiBEaXNhYmxlIENMSSB2ZXJzaW9uIG1pc21hdGNoIGNoZWNrcyBhbmQgZm9yY2VzIHVzYWdlIG9mIHRoZSBpbnZva2VkIENMSVxuICAgKiBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBsb2NhbCBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgICovXG4gIGlmIChkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpJykpLmRlZmF1bHQ7XG4gIH1cblxuICBsZXQgY2xpO1xuICBjb25zdCByYXdDb21tYW5kTmFtZSA9IHByb2Nlc3MuYXJndlsyXTtcblxuICB0cnkge1xuICAgIC8vIE5vIGVycm9yIGltcGxpZXMgYSBwcm9qZWN0TG9jYWxDbGksIHdoaWNoIHdpbGwgbG9hZCB3aGF0ZXZlclxuICAgIC8vIHZlcnNpb24gb2YgbmctY2xpIHlvdSBoYXZlIGluc3RhbGxlZCBpbiBhIGxvY2FsIHBhY2thZ2UuanNvblxuICAgIGNvbnN0IGN3ZFJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHByb2Nlc3MuY3dkKCkgKyAnLycpO1xuICAgIGNvbnN0IHByb2plY3RMb2NhbENsaSA9IGN3ZFJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY2xpJyk7XG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KHByb2plY3RMb2NhbENsaSk7XG5cbiAgICBjb25zdCBnbG9iYWxWZXJzaW9uID0gbmV3IFNlbVZlcihWRVJTSU9OLmZ1bGwpO1xuXG4gICAgLy8gT2xkZXIgdmVyc2lvbnMgbWlnaHQgbm90IGhhdmUgdGhlIFZFUlNJT04gZXhwb3J0XG4gICAgbGV0IGxvY2FsVmVyc2lvbiA9IGNsaS5WRVJTSU9OPy5mdWxsO1xuICAgIGlmICghbG9jYWxWZXJzaW9uKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2NhbFBhY2thZ2VKc29uID0gYXdhaXQgZnMucmVhZEZpbGUoXG4gICAgICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShwcm9qZWN0TG9jYWxDbGkpLCAnLi4vLi4vcGFja2FnZS5qc29uJyksXG4gICAgICAgICAgJ3V0Zi04JyxcbiAgICAgICAgKTtcbiAgICAgICAgbG9jYWxWZXJzaW9uID0gKEpTT04ucGFyc2UobG9jYWxQYWNrYWdlSnNvbikgYXMgeyB2ZXJzaW9uOiBzdHJpbmcgfSkudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byByZXRyaWV2ZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVuc3VyZSBvbGRlciB2ZXJzaW9ucyBvZiB0aGUgQ0xJIGZ1bGx5IGV4aXRcbiAgICBpZiAobWFqb3IobG9jYWxWZXJzaW9uKSA8IDE0KSB7XG4gICAgICBmb3JjZUV4aXQgPSB0cnVlO1xuXG4gICAgICAvLyBWZXJzaW9ucyBwcmlvciB0byAxNCBkaWRuJ3QgaW1wbGVtZW50IGNvbXBsZXRpb24gY29tbWFuZC5cbiAgICAgIGlmIChyYXdDb21tYW5kTmFtZSA9PT0gJ2NvbXBsZXRpb24nKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpc0dsb2JhbEdyZWF0ZXIgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNHbG9iYWxHcmVhdGVyID0gISFsb2NhbFZlcnNpb24gJiYgZ2xvYmFsVmVyc2lvbi5jb21wYXJlKGxvY2FsVmVyc2lvbikgPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIGNvbXBhcmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBXaGVuIHVzaW5nIHRoZSBjb21wbGV0aW9uIGNvbW1hbmQsIGRvbid0IHNob3cgdGhlIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHRoaXMgd2lsbCBicmVhayBjb21wbGV0aW9uLlxuICAgIGlmIChpc0dsb2JhbEdyZWF0ZXIgJiYgcmF3Q29tbWFuZE5hbWUgIT09ICdjb21wbGV0aW9uJykge1xuICAgICAgLy8gSWYgdXNpbmcgdGhlIHVwZGF0ZSBjb21tYW5kIGFuZCB0aGUgZ2xvYmFsIHZlcnNpb24gaXMgZ3JlYXRlciwgdXNlIHRoZSBuZXdlciB1cGRhdGUgY29tbWFuZFxuICAgICAgLy8gVGhpcyBhbGxvd3MgaW1wcm92ZW1lbnRzIGluIHVwZGF0ZSB0byBiZSB1c2VkIGluIG9sZGVyIHZlcnNpb25zIHRoYXQgZG8gbm90IGhhdmUgYm9vdHN0cmFwcGluZ1xuICAgICAgaWYgKFxuICAgICAgICByYXdDb21tYW5kTmFtZSA9PT0gJ3VwZGF0ZScgJiZcbiAgICAgICAgY2xpLlZFUlNJT04gJiZcbiAgICAgICAgY2xpLlZFUlNJT04ubWFqb3IgLSBnbG9iYWxWZXJzaW9uLm1ham9yIDw9IDFcbiAgICAgICkge1xuICAgICAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGlzV2FybmluZ0VuYWJsZWQoJ3ZlcnNpb25NaXNtYXRjaCcpKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgdXNlIGxvY2FsIHZlcnNpb24gYW5kIHdhcm4gaWYgZ2xvYmFsIGlzIG5ld2VyIHRoYW4gbG9jYWxcbiAgICAgICAgY29uc3Qgd2FybmluZyA9XG4gICAgICAgICAgYFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsIGAgK1xuICAgICAgICAgIGB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxcblxcbmAgK1xuICAgICAgICAgICdUbyBkaXNhYmxlIHRoaXMgd2FybmluZyB1c2UgXCJuZyBjb25maWcgLWcgY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCBmYWxzZVwiLic7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29sb3JzLnllbGxvdyh3YXJuaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gICAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gICAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICB9XG5cbiAgaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbiAgfVxuXG4gIHJldHVybiBjbGk7XG59KSgpXG4gIC50aGVuKChjbGkpID0+XG4gICAgY2xpPy4oe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgIH0pLFxuICApXG4gIC50aGVuKChleGl0Q29kZSA9IDApID0+IHtcbiAgICBpZiAoZm9yY2VFeGl0KSB7XG4gICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19