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
    try {
        // No error implies a projectLocalCli, which will load whatever
        // version of ng-cli you have installed in a local package.json
        const projectLocalCli = require.resolve('@angular/cli', { paths: [process.cwd()] });
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
        }
        let isGlobalGreater = false;
        try {
            isGlobalGreater = !!localVersion && globalVersion.compare(localVersion) > 0;
        }
        catch (error) {
            // eslint-disable-next-line  no-console
            console.error('Version mismatch check skipped. Unable to compare local version: ' + error);
        }
        const rawCommandName = process.argv[2];
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
    .then((cli) => {
    return cli({
        cliArgs: process.argv.slice(2),
        inputStream: process.stdin,
        outputStream: process.stdout,
    });
})
    .then((exitCode) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQXVDO0FBQ3ZDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0QsOEVBQTJFO0FBQzNFLHNEQUFtRDtBQUVuRDs7Ozs7R0FLRztBQUNILElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUV0QixDQUFDLEtBQUssSUFBSSxFQUFFOztJQUNWOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFFL0M7OztPQUdHO0lBQ0gsSUFBSSx5Q0FBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLElBQUk7UUFDRiwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFtRDtRQUNuRCxJQUFJLFlBQVksR0FBRyxNQUFBLEdBQUcsQ0FBQyxPQUFPLDBDQUFFLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLElBQUk7Z0JBQ0YsTUFB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QkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3RcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNlbVZlciwgbWFqb3IgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBpc1dhcm5pbmdFbmFibGVkIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgZGlzYWJsZVZlcnNpb25DaGVjayB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvZW52aXJvbm1lbnQtb3B0aW9ucyc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuLyoqXG4gKiBBbmd1bGFyIENMSSB2ZXJzaW9ucyBwcmlvciB0byB2MTQgbWF5IG5vdCBleGl0IGNvcnJlY3RseSBpZiBub3QgZm9yY2libHkgZXhpdGVkXG4gKiB2aWEgYHByb2Nlc3MuZXhpdCgpYC4gV2hlbiBib290c3RyYXBwaW5nLCBgZm9yY2VFeGl0YCB3aWxsIGJlIHNldCB0byBgdHJ1ZWBcbiAqIGlmIHRoZSBsb2NhbCBDTEkgdmVyc2lvbiBpcyBsZXNzIHRoYW4gdjE0IHRvIHByZXZlbnQgdGhlIENMSSBmcm9tIGhhbmdpbmcgb25cbiAqIGV4aXQgaW4gdGhvc2UgY2FzZXMuXG4gKi9cbmxldCBmb3JjZUV4aXQgPSBmYWxzZTtcblxuKGFzeW5jICgpID0+IHtcbiAgLyoqXG4gICAqIERpc2FibGUgQnJvd3NlcnNsaXN0IG9sZCBkYXRhIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHdpdGggZXZlcnkgcmVsZWFzZSB3ZSdkIG5lZWQgdG8gdXBkYXRlIHRoaXMgZGVwZW5kZW5jeVxuICAgKiB3aGljaCBpcyBjdW1iZXJzb21lIGNvbnNpZGVyaW5nIHdlIHBpbiB2ZXJzaW9ucyBhbmQgdGhlIHdhcm5pbmcgaXMgbm90IHVzZXIgYWN0aW9uYWJsZS5cbiAgICogYEJyb3dzZXJzbGlzdDogY2FuaXVzZS1saXRlIGlzIG91dGRhdGVkLiBQbGVhc2UgcnVuIG5leHQgY29tbWFuZCBgbnBtIHVwZGF0ZWBcbiAgICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcnNsaXN0L2Jyb3dzZXJzbGlzdC9ibG9iLzgxOWM0MzM3NDU2OTk2ZDE5ZGI2YmE5NTMwMTQ1NzkzMjllOWM2ZTEvbm9kZS5qcyNMMzI0XG4gICAqL1xuICBwcm9jZXNzLmVudi5CUk9XU0VSU0xJU1RfSUdOT1JFX09MRF9EQVRBID0gJzEnO1xuXG4gIC8qKlxuICAgKiBEaXNhYmxlIENMSSB2ZXJzaW9uIG1pc21hdGNoIGNoZWNrcyBhbmQgZm9yY2VzIHVzYWdlIG9mIHRoZSBpbnZva2VkIENMSVxuICAgKiBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBsb2NhbCBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgICovXG4gIGlmIChkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpJykpLmRlZmF1bHQ7XG4gIH1cblxuICBsZXQgY2xpO1xuICB0cnkge1xuICAgIC8vIE5vIGVycm9yIGltcGxpZXMgYSBwcm9qZWN0TG9jYWxDbGksIHdoaWNoIHdpbGwgbG9hZCB3aGF0ZXZlclxuICAgIC8vIHZlcnNpb24gb2YgbmctY2xpIHlvdSBoYXZlIGluc3RhbGxlZCBpbiBhIGxvY2FsIHBhY2thZ2UuanNvblxuICAgIGNvbnN0IHByb2plY3RMb2NhbENsaSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY2xpJywgeyBwYXRoczogW3Byb2Nlc3MuY3dkKCldIH0pO1xuICAgIGNsaSA9IGF3YWl0IGltcG9ydChwcm9qZWN0TG9jYWxDbGkpO1xuXG4gICAgY29uc3QgZ2xvYmFsVmVyc2lvbiA9IG5ldyBTZW1WZXIoVkVSU0lPTi5mdWxsKTtcblxuICAgIC8vIE9sZGVyIHZlcnNpb25zIG1pZ2h0IG5vdCBoYXZlIHRoZSBWRVJTSU9OIGV4cG9ydFxuICAgIGxldCBsb2NhbFZlcnNpb24gPSBjbGkuVkVSU0lPTj8uZnVsbDtcbiAgICBpZiAoIWxvY2FsVmVyc2lvbikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9jYWxQYWNrYWdlSnNvbiA9IGF3YWl0IGZzLnJlYWRGaWxlKFxuICAgICAgICAgIHBhdGguam9pbihwYXRoLmRpcm5hbWUocHJvamVjdExvY2FsQ2xpKSwgJy4uLy4uL3BhY2thZ2UuanNvbicpLFxuICAgICAgICAgICd1dGYtOCcsXG4gICAgICAgICk7XG4gICAgICAgIGxvY2FsVmVyc2lvbiA9IChKU09OLnBhcnNlKGxvY2FsUGFja2FnZUpzb24pIGFzIHsgdmVyc2lvbjogc3RyaW5nIH0pLnZlcnNpb247XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gcmV0cmlldmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgb2xkZXIgdmVyc2lvbnMgb2YgdGhlIENMSSBmdWxseSBleGl0XG4gICAgaWYgKG1ham9yKGxvY2FsVmVyc2lvbikgPCAxNCkge1xuICAgICAgZm9yY2VFeGl0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBsZXQgaXNHbG9iYWxHcmVhdGVyID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzR2xvYmFsR3JlYXRlciA9ICEhbG9jYWxWZXJzaW9uICYmIGdsb2JhbFZlcnNpb24uY29tcGFyZShsb2NhbFZlcnNpb24pID4gMDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byBjb21wYXJlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgfVxuXG4gICAgY29uc3QgcmF3Q29tbWFuZE5hbWUgPSBwcm9jZXNzLmFyZ3ZbMl07XG4gICAgLy8gV2hlbiB1c2luZyB0aGUgY29tcGxldGlvbiBjb21tYW5kLCBkb24ndCBzaG93IHRoZSB3YXJuaW5nIGFzIG90aGVyd2lzZSB0aGlzIHdpbGwgYnJlYWsgY29tcGxldGlvbi5cbiAgICBpZiAoaXNHbG9iYWxHcmVhdGVyICYmIHJhd0NvbW1hbmROYW1lICE9PSAnY29tcGxldGlvbicpIHtcbiAgICAgIC8vIElmIHVzaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBhbmQgdGhlIGdsb2JhbCB2ZXJzaW9uIGlzIGdyZWF0ZXIsIHVzZSB0aGUgbmV3ZXIgdXBkYXRlIGNvbW1hbmRcbiAgICAgIC8vIFRoaXMgYWxsb3dzIGltcHJvdmVtZW50cyBpbiB1cGRhdGUgdG8gYmUgdXNlZCBpbiBvbGRlciB2ZXJzaW9ucyB0aGF0IGRvIG5vdCBoYXZlIGJvb3RzdHJhcHBpbmdcbiAgICAgIGlmIChcbiAgICAgICAgcmF3Q29tbWFuZE5hbWUgPT09ICd1cGRhdGUnICYmXG4gICAgICAgIGNsaS5WRVJTSU9OICYmXG4gICAgICAgIGNsaS5WRVJTSU9OLm1ham9yIC0gZ2xvYmFsVmVyc2lvbi5tYWpvciA8PSAxXG4gICAgICApIHtcbiAgICAgICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgICAgICAvLyBPdGhlcndpc2UsIHVzZSBsb2NhbCB2ZXJzaW9uIGFuZCB3YXJuIGlmIGdsb2JhbCBpcyBuZXdlciB0aGFuIGxvY2FsXG4gICAgICAgIGNvbnN0IHdhcm5pbmcgPVxuICAgICAgICAgIGBZb3VyIGdsb2JhbCBBbmd1bGFyIENMSSB2ZXJzaW9uICgke2dsb2JhbFZlcnNpb259KSBpcyBncmVhdGVyIHRoYW4geW91ciBsb2NhbCBgICtcbiAgICAgICAgICBgdmVyc2lvbiAoJHtsb2NhbFZlcnNpb259KS4gVGhlIGxvY2FsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgdXNlZC5cXG5cXG5gICtcbiAgICAgICAgICAnVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi4nO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKGNvbG9ycy55ZWxsb3cod2FybmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIHJlc29sdmUgY291bGQgbm90IGZpbmQgdGhlIG5nLWNsaVxuICAgIC8vIGxpYnJhcnkgZnJvbSBhIHBhY2thZ2UuanNvbi4gSW5zdGVhZCwgaW5jbHVkZSBpdCBmcm9tIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIHRvIHRoaXMgc2NyaXB0IGZpbGUgKHdoaWNoIGlzIGxpa2VseSBhIGdsb2JhbGx5IGluc3RhbGxlZFxuICAgIC8vIG5wbSBwYWNrYWdlKS4gTW9zdCBjb21tb24gY2F1c2UgZm9yIGhpdHRpbmcgdGhpcyBpcyBgbmcgbmV3YFxuICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgfVxuXG4gIGlmICgnZGVmYXVsdCcgaW4gY2xpKSB7XG4gICAgY2xpID0gY2xpWydkZWZhdWx0J107XG4gIH1cblxuICByZXR1cm4gY2xpO1xufSkoKVxuICAudGhlbigoY2xpKSA9PiB7XG4gICAgcmV0dXJuIGNsaSh7XG4gICAgICBjbGlBcmdzOiBwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksXG4gICAgICBpbnB1dFN0cmVhbTogcHJvY2Vzcy5zdGRpbixcbiAgICAgIG91dHB1dFN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsXG4gICAgfSk7XG4gIH0pXG4gIC50aGVuKChleGl0Q29kZTogbnVtYmVyKSA9PiB7XG4gICAgaWYgKGZvcmNlRXhpdCkge1xuICAgICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICB9KVxuICAuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGVycm9yOiAnICsgZXJyLnRvU3RyaW5nKCkpO1xuICAgIHByb2Nlc3MuZXhpdCgxMjcpO1xuICB9KTtcbiJdfQ==