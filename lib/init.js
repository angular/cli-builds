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
    var _b;
    /**
     * Disable Browserslist old data warning as otherwise with every release we'd need to update this dependency
     * which is cumbersome considering we pin versions and the warning is not user actionable.
     * `Browserslist: caniuse-lite is outdated. Please run next command `npm update`
     * See: https://github.com/browserslist/browserslist/blob/819c4337456996d19db6ba953014579329e9c6e1/node.js#L324
     */
    process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';
    const rawCommandName = process.argv[2];
    /**
     * Disable CLI version mismatch checks and forces usage of the invoked CLI
     * instead of invoking the local installed version.
     *
     * When running `ng new` always favor the global version. As in some
     * cases orphan `node_modules` would cause the non global CLI to be used.
     * @see: https://github.com/angular/angular-cli/issues/14603
     */
    if (environment_options_1.disableVersionCheck || rawCommandName === 'new') {
        return (await Promise.resolve().then(() => __importStar(require('./cli')))).default;
    }
    let cli;
    try {
        // No error implies a projectLocalCli, which will load whatever
        // version of ng-cli you have installed in a local package.json
        const cwdRequire = (0, module_1.createRequire)(process.cwd() + '/');
        const projectLocalCli = cwdRequire.resolve('@angular/cli');
        cli = await (_a = projectLocalCli, Promise.resolve().then(() => __importStar(require(_a))));
        const globalVersion = new semver_1.SemVer(version_1.VERSION.full);
        // Older versions might not have the VERSION export
        let localVersion = (_b = cli.VERSION) === null || _b === void 0 ? void 0 : _b.full;
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
        const localMajorVersion = (0, semver_1.major)(localVersion);
        if (localMajorVersion > 0 && localMajorVersion < 14) {
            forceExit = true;
            // Versions prior to 14 didn't implement completion command.
            if (rawCommandName === 'completion') {
                return null;
            }
        }
        let isGlobalGreater = false;
        try {
            isGlobalGreater = localVersion > 0 && globalVersion.compare(localVersion) > 0;
        }
        catch (error) {
            // eslint-disable-next-line  no-console
            console.error('Version mismatch check skipped. Unable to compare local version: ' + error);
        }
        // When using the completion command, don't show the warning as otherwise this will break completion.
        if (isGlobalGreater &&
            rawCommandName !== '--get-yargs-completions' &&
            rawCommandName !== 'completion') {
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
    catch (_c) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQyxtQ0FBdUM7QUFDdkMsMkNBQTZCO0FBQzdCLG1DQUF1QztBQUN2QyxrREFBZ0Q7QUFDaEQsb0RBQTJEO0FBQzNELDhFQUEyRTtBQUMzRSxzREFBbUQ7QUFFbkQ7Ozs7O0dBS0c7QUFDSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFFdEIsQ0FBQyxLQUFLLElBQW9ELEVBQUU7OztJQUMxRDs7Ozs7T0FLRztJQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsR0FBRyxDQUFDO0lBQy9DLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdkM7Ozs7Ozs7T0FPRztJQUNILElBQUkseUNBQW1CLElBQUksY0FBYyxLQUFLLEtBQUssRUFBRTtRQUNuRCxPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUVSLElBQUk7UUFDRiwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUEsc0JBQWEsRUFBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDdEQsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzRCxHQUFHLEdBQUcsWUFBYSxlQUFlLDBEQUFDLENBQUM7UUFFcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFNLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FB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QUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0tBQ0QsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7SUFDcEIsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgJ3N5bWJvbC1vYnNlcnZhYmxlJztcbi8vIHN5bWJvbCBwb2x5ZmlsbCBtdXN0IGdvIGZpcnN0XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNlbVZlciwgbWFqb3IgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBpc1dhcm5pbmdFbmFibGVkIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuLyoqXG4gKiBBbmd1bGFyIENMSSB2ZXJzaW9ucyBwcmlvciB0byB2MTQgbWF5IG5vdCBleGl0IGNvcnJlY3RseSBpZiBub3QgZm9yY2libHkgZXhpdGVkXG4gKiB2aWEgYHByb2Nlc3MuZXhpdCgpYC4gV2hlbiBib290c3RyYXBwaW5nLCBgZm9yY2VFeGl0YCB3aWxsIGJlIHNldCB0byBgdHJ1ZWBcbiAqIGlmIHRoZSBsb2NhbCBDTEkgdmVyc2lvbiBpcyBsZXNzIHRoYW4gdjE0IHRvIHByZXZlbnQgdGhlIENMSSBmcm9tIGhhbmdpbmcgb25cbiAqIGV4aXQgaW4gdGhvc2UgY2FzZXMuXG4gKi9cbmxldCBmb3JjZUV4aXQgPSBmYWxzZTtcblxuKGFzeW5jICgpOiBQcm9taXNlPHR5cGVvZiBpbXBvcnQoJy4vY2xpJykuZGVmYXVsdCB8IG51bGw+ID0+IHtcbiAgLyoqXG4gICAqIERpc2FibGUgQnJvd3NlcnNsaXN0IG9sZCBkYXRhIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHdpdGggZXZlcnkgcmVsZWFzZSB3ZSdkIG5lZWQgdG8gdXBkYXRlIHRoaXMgZGVwZW5kZW5jeVxuICAgKiB3aGljaCBpcyBjdW1iZXJzb21lIGNvbnNpZGVyaW5nIHdlIHBpbiB2ZXJzaW9ucyBhbmQgdGhlIHdhcm5pbmcgaXMgbm90IHVzZXIgYWN0aW9uYWJsZS5cbiAgICogYEJyb3dzZXJzbGlzdDogY2FuaXVzZS1saXRlIGlzIG91dGRhdGVkLiBQbGVhc2UgcnVuIG5leHQgY29tbWFuZCBgbnBtIHVwZGF0ZWBcbiAgICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcnNsaXN0L2Jyb3dzZXJzbGlzdC9ibG9iLzgxOWM0MzM3NDU2OTk2ZDE5ZGI2YmE5NTMwMTQ1NzkzMjllOWM2ZTEvbm9kZS5qcyNMMzI0XG4gICAqL1xuICBwcm9jZXNzLmVudi5CUk9XU0VSU0xJU1RfSUdOT1JFX09MRF9EQVRBID0gJzEnO1xuICBjb25zdCByYXdDb21tYW5kTmFtZSA9IHByb2Nlc3MuYXJndlsyXTtcblxuICAvKipcbiAgICogRGlzYWJsZSBDTEkgdmVyc2lvbiBtaXNtYXRjaCBjaGVja3MgYW5kIGZvcmNlcyB1c2FnZSBvZiB0aGUgaW52b2tlZCBDTElcbiAgICogaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgbG9jYWwgaW5zdGFsbGVkIHZlcnNpb24uXG4gICAqXG4gICAqIFdoZW4gcnVubmluZyBgbmcgbmV3YCBhbHdheXMgZmF2b3IgdGhlIGdsb2JhbCB2ZXJzaW9uLiBBcyBpbiBzb21lXG4gICAqIGNhc2VzIG9ycGhhbiBgbm9kZV9tb2R1bGVzYCB3b3VsZCBjYXVzZSB0aGUgbm9uIGdsb2JhbCBDTEkgdG8gYmUgdXNlZC5cbiAgICogQHNlZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzE0NjAzXG4gICAqL1xuICBpZiAoZGlzYWJsZVZlcnNpb25DaGVjayB8fCByYXdDb21tYW5kTmFtZSA9PT0gJ25ldycpIHtcbiAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGknKSkuZGVmYXVsdDtcbiAgfVxuXG4gIGxldCBjbGk7XG5cbiAgdHJ5IHtcbiAgICAvLyBObyBlcnJvciBpbXBsaWVzIGEgcHJvamVjdExvY2FsQ2xpLCB3aGljaCB3aWxsIGxvYWQgd2hhdGV2ZXJcbiAgICAvLyB2ZXJzaW9uIG9mIG5nLWNsaSB5b3UgaGF2ZSBpbnN0YWxsZWQgaW4gYSBsb2NhbCBwYWNrYWdlLmpzb25cbiAgICBjb25zdCBjd2RSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShwcm9jZXNzLmN3ZCgpICsgJy8nKTtcbiAgICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSBjd2RSZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NsaScpO1xuICAgIGNsaSA9IGF3YWl0IGltcG9ydChwcm9qZWN0TG9jYWxDbGkpO1xuXG4gICAgY29uc3QgZ2xvYmFsVmVyc2lvbiA9IG5ldyBTZW1WZXIoVkVSU0lPTi5mdWxsKTtcblxuICAgIC8vIE9sZGVyIHZlcnNpb25zIG1pZ2h0IG5vdCBoYXZlIHRoZSBWRVJTSU9OIGV4cG9ydFxuICAgIGxldCBsb2NhbFZlcnNpb24gPSBjbGkuVkVSU0lPTj8uZnVsbDtcbiAgICBpZiAoIWxvY2FsVmVyc2lvbikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9jYWxQYWNrYWdlSnNvbiA9IGF3YWl0IGZzLnJlYWRGaWxlKFxuICAgICAgICAgIHBhdGguam9pbihwYXRoLmRpcm5hbWUocHJvamVjdExvY2FsQ2xpKSwgJy4uLy4uL3BhY2thZ2UuanNvbicpLFxuICAgICAgICAgICd1dGYtOCcsXG4gICAgICAgICk7XG4gICAgICAgIGxvY2FsVmVyc2lvbiA9IChKU09OLnBhcnNlKGxvY2FsUGFja2FnZUpzb24pIGFzIHsgdmVyc2lvbjogc3RyaW5nIH0pLnZlcnNpb247XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gcmV0cmlldmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgb2xkZXIgdmVyc2lvbnMgb2YgdGhlIENMSSBmdWxseSBleGl0XG4gICAgY29uc3QgbG9jYWxNYWpvclZlcnNpb24gPSBtYWpvcihsb2NhbFZlcnNpb24pO1xuICAgIGlmIChsb2NhbE1ham9yVmVyc2lvbiA+IDAgJiYgbG9jYWxNYWpvclZlcnNpb24gPCAxNCkge1xuICAgICAgZm9yY2VFeGl0ID0gdHJ1ZTtcblxuICAgICAgLy8gVmVyc2lvbnMgcHJpb3IgdG8gMTQgZGlkbid0IGltcGxlbWVudCBjb21wbGV0aW9uIGNvbW1hbmQuXG4gICAgICBpZiAocmF3Q29tbWFuZE5hbWUgPT09ICdjb21wbGV0aW9uJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgaXNHbG9iYWxHcmVhdGVyID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzR2xvYmFsR3JlYXRlciA9IGxvY2FsVmVyc2lvbiA+IDAgJiYgZ2xvYmFsVmVyc2lvbi5jb21wYXJlKGxvY2FsVmVyc2lvbikgPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIGNvbXBhcmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBXaGVuIHVzaW5nIHRoZSBjb21wbGV0aW9uIGNvbW1hbmQsIGRvbid0IHNob3cgdGhlIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHRoaXMgd2lsbCBicmVhayBjb21wbGV0aW9uLlxuICAgIGlmIChcbiAgICAgIGlzR2xvYmFsR3JlYXRlciAmJlxuICAgICAgcmF3Q29tbWFuZE5hbWUgIT09ICctLWdldC15YXJncy1jb21wbGV0aW9ucycgJiZcbiAgICAgIHJhd0NvbW1hbmROYW1lICE9PSAnY29tcGxldGlvbidcbiAgICApIHtcbiAgICAgIC8vIElmIHVzaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBhbmQgdGhlIGdsb2JhbCB2ZXJzaW9uIGlzIGdyZWF0ZXIsIHVzZSB0aGUgbmV3ZXIgdXBkYXRlIGNvbW1hbmRcbiAgICAgIC8vIFRoaXMgYWxsb3dzIGltcHJvdmVtZW50cyBpbiB1cGRhdGUgdG8gYmUgdXNlZCBpbiBvbGRlciB2ZXJzaW9ucyB0aGF0IGRvIG5vdCBoYXZlIGJvb3RzdHJhcHBpbmdcbiAgICAgIGlmIChcbiAgICAgICAgcmF3Q29tbWFuZE5hbWUgPT09ICd1cGRhdGUnICYmXG4gICAgICAgIGNsaS5WRVJTSU9OICYmXG4gICAgICAgIGNsaS5WRVJTSU9OLm1ham9yIC0gZ2xvYmFsVmVyc2lvbi5tYWpvciA8PSAxXG4gICAgICApIHtcbiAgICAgICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgICAgICAvLyBPdGhlcndpc2UsIHVzZSBsb2NhbCB2ZXJzaW9uIGFuZCB3YXJuIGlmIGdsb2JhbCBpcyBuZXdlciB0aGFuIGxvY2FsXG4gICAgICAgIGNvbnN0IHdhcm5pbmcgPVxuICAgICAgICAgIGBZb3VyIGdsb2JhbCBBbmd1bGFyIENMSSB2ZXJzaW9uICgke2dsb2JhbFZlcnNpb259KSBpcyBncmVhdGVyIHRoYW4geW91ciBsb2NhbCBgICtcbiAgICAgICAgICBgdmVyc2lvbiAoJHtsb2NhbFZlcnNpb259KS4gVGhlIGxvY2FsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgdXNlZC5cXG5cXG5gICtcbiAgICAgICAgICAnVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi4nO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKGNvbG9ycy55ZWxsb3cod2FybmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIHJlc29sdmUgY291bGQgbm90IGZpbmQgdGhlIG5nLWNsaVxuICAgIC8vIGxpYnJhcnkgZnJvbSBhIHBhY2thZ2UuanNvbi4gSW5zdGVhZCwgaW5jbHVkZSBpdCBmcm9tIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIHRvIHRoaXMgc2NyaXB0IGZpbGUgKHdoaWNoIGlzIGxpa2VseSBhIGdsb2JhbGx5IGluc3RhbGxlZFxuICAgIC8vIG5wbSBwYWNrYWdlKS4gTW9zdCBjb21tb24gY2F1c2UgZm9yIGhpdHRpbmcgdGhpcyBpcyBgbmcgbmV3YFxuICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgfVxuXG4gIGlmICgnZGVmYXVsdCcgaW4gY2xpKSB7XG4gICAgY2xpID0gY2xpWydkZWZhdWx0J107XG4gIH1cblxuICByZXR1cm4gY2xpO1xufSkoKVxuICAudGhlbigoY2xpKSA9PlxuICAgIGNsaT8uKHtcbiAgICAgIGNsaUFyZ3M6IHByb2Nlc3MuYXJndi5zbGljZSgyKSxcbiAgICB9KSxcbiAgKVxuICAudGhlbigoZXhpdENvZGUgPSAwKSA9PiB7XG4gICAgaWYgKGZvcmNlRXhpdCkge1xuICAgICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICB9KVxuICAuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGVycm9yOiAnICsgZXJyLnRvU3RyaW5nKCkpO1xuICAgIHByb2Nlc3MuZXhpdCgxMjcpO1xuICB9KTtcbiJdfQ==