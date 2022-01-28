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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const version_1 = require("../models/version");
const color_1 = require("../utilities/color");
const config_1 = require("../utilities/config");
(async () => {
    var _a;
    /**
     * Disable Browserslist old data warning as otherwise with every release we'd need to update this dependency
     * which is cumbersome considering we pin versions and the warning is not user actionable.
     * `Browserslist: caniuse-lite is outdated. Please run next command `npm update`
     * See: https://github.com/browserslist/browserslist/blob/819c4337456996d19db6ba953014579329e9c6e1/node.js#L324
     */
    process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';
    const disableVersionCheckEnv = process.env['NG_DISABLE_VERSION_CHECK'];
    /**
     * Disable CLI version mismatch checks and forces usage of the invoked CLI
     * instead of invoking the local installed version.
     */
    const disableVersionCheck = disableVersionCheckEnv !== undefined &&
        disableVersionCheckEnv !== '0' &&
        disableVersionCheckEnv.toLowerCase() !== 'false';
    if (disableVersionCheck) {
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
        let isGlobalGreater = false;
        try {
            isGlobalGreater = !!localVersion && globalVersion.compare(localVersion) > 0;
        }
        catch (error) {
            // eslint-disable-next-line  no-console
            console.error('Version mismatch check skipped. Unable to compare local version: ' + error);
        }
        if (isGlobalGreater) {
            // If using the update command and the global version is greater, use the newer update command
            // This allows improvements in update to be used in older versions that do not have bootstrapping
            if (process.argv[2] === 'update' &&
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
    process.exit(exitCode);
})
    .catch((err) => {
    // eslint-disable-next-line  no-console
    console.error('Unknown error: ' + err.toString());
    process.exit(127);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILDZCQUEyQjtBQUMzQixnQ0FBZ0M7QUFDaEMsMkJBQW9DO0FBQ3BDLDJDQUE2QjtBQUM3QixtQ0FBZ0M7QUFDaEMsK0NBQTRDO0FBQzVDLDhDQUE0QztBQUM1QyxnREFBdUQ7QUFFdkQsQ0FBQyxLQUFLLElBQUksRUFBRTs7SUFDVjs7Ozs7T0FLRztJQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsR0FBRyxDQUFDO0lBRS9DLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3ZFOzs7T0FHRztJQUNILE1BQU0sbUJBQW1CLEdBQ3ZCLHNCQUFzQixLQUFLLFNBQVM7UUFDcEMsc0JBQXNCLEtBQUssR0FBRztRQUM5QixzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUM7SUFFbkQsSUFBSSxtQkFBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLElBQUk7UUFDRiwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFt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dGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICdzeW1ib2wtb2JzZXJ2YWJsZSc7XG4vLyBzeW1ib2wgcG9seWZpbGwgbXVzdCBnbyBmaXJzdFxuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9tb2RlbHMvdmVyc2lvbic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuXG4oYXN5bmMgKCkgPT4ge1xuICAvKipcbiAgICogRGlzYWJsZSBCcm93c2Vyc2xpc3Qgb2xkIGRhdGEgd2FybmluZyBhcyBvdGhlcndpc2Ugd2l0aCBldmVyeSByZWxlYXNlIHdlJ2QgbmVlZCB0byB1cGRhdGUgdGhpcyBkZXBlbmRlbmN5XG4gICAqIHdoaWNoIGlzIGN1bWJlcnNvbWUgY29uc2lkZXJpbmcgd2UgcGluIHZlcnNpb25zIGFuZCB0aGUgd2FybmluZyBpcyBub3QgdXNlciBhY3Rpb25hYmxlLlxuICAgKiBgQnJvd3NlcnNsaXN0OiBjYW5pdXNlLWxpdGUgaXMgb3V0ZGF0ZWQuIFBsZWFzZSBydW4gbmV4dCBjb21tYW5kIGBucG0gdXBkYXRlYFxuICAgKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc2xpc3QvYnJvd3NlcnNsaXN0L2Jsb2IvODE5YzQzMzc0NTY5OTZkMTlkYjZiYTk1MzAxNDU3OTMyOWU5YzZlMS9ub2RlLmpzI0wzMjRcbiAgICovXG4gIHByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9JR05PUkVfT0xEX0RBVEEgPSAnMSc7XG5cbiAgY29uc3QgZGlzYWJsZVZlcnNpb25DaGVja0VudiA9IHByb2Nlc3MuZW52WydOR19ESVNBQkxFX1ZFUlNJT05fQ0hFQ0snXTtcbiAgLyoqXG4gICAqIERpc2FibGUgQ0xJIHZlcnNpb24gbWlzbWF0Y2ggY2hlY2tzIGFuZCBmb3JjZXMgdXNhZ2Ugb2YgdGhlIGludm9rZWQgQ0xJXG4gICAqIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIGxvY2FsIGluc3RhbGxlZCB2ZXJzaW9uLlxuICAgKi9cbiAgY29uc3QgZGlzYWJsZVZlcnNpb25DaGVjayA9XG4gICAgZGlzYWJsZVZlcnNpb25DaGVja0VudiAhPT0gdW5kZWZpbmVkICYmXG4gICAgZGlzYWJsZVZlcnNpb25DaGVja0VudiAhPT0gJzAnICYmXG4gICAgZGlzYWJsZVZlcnNpb25DaGVja0Vudi50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnO1xuXG4gIGlmIChkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpJykpLmRlZmF1bHQ7XG4gIH1cblxuICBsZXQgY2xpO1xuICB0cnkge1xuICAgIC8vIE5vIGVycm9yIGltcGxpZXMgYSBwcm9qZWN0TG9jYWxDbGksIHdoaWNoIHdpbGwgbG9hZCB3aGF0ZXZlclxuICAgIC8vIHZlcnNpb24gb2YgbmctY2xpIHlvdSBoYXZlIGluc3RhbGxlZCBpbiBhIGxvY2FsIHBhY2thZ2UuanNvblxuICAgIGNvbnN0IHByb2plY3RMb2NhbENsaSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY2xpJywgeyBwYXRoczogW3Byb2Nlc3MuY3dkKCldIH0pO1xuICAgIGNsaSA9IGF3YWl0IGltcG9ydChwcm9qZWN0TG9jYWxDbGkpO1xuXG4gICAgY29uc3QgZ2xvYmFsVmVyc2lvbiA9IG5ldyBTZW1WZXIoVkVSU0lPTi5mdWxsKTtcblxuICAgIC8vIE9sZGVyIHZlcnNpb25zIG1pZ2h0IG5vdCBoYXZlIHRoZSBWRVJTSU9OIGV4cG9ydFxuICAgIGxldCBsb2NhbFZlcnNpb24gPSBjbGkuVkVSU0lPTj8uZnVsbDtcbiAgICBpZiAoIWxvY2FsVmVyc2lvbikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbG9jYWxQYWNrYWdlSnNvbiA9IGF3YWl0IGZzLnJlYWRGaWxlKFxuICAgICAgICAgIHBhdGguam9pbihwYXRoLmRpcm5hbWUocHJvamVjdExvY2FsQ2xpKSwgJy4uLy4uL3BhY2thZ2UuanNvbicpLFxuICAgICAgICAgICd1dGYtOCcsXG4gICAgICAgICk7XG4gICAgICAgIGxvY2FsVmVyc2lvbiA9IChKU09OLnBhcnNlKGxvY2FsUGFja2FnZUpzb24pIGFzIHsgdmVyc2lvbjogc3RyaW5nIH0pLnZlcnNpb247XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gcmV0cmlldmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgaXNHbG9iYWxHcmVhdGVyID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzR2xvYmFsR3JlYXRlciA9ICEhbG9jYWxWZXJzaW9uICYmIGdsb2JhbFZlcnNpb24uY29tcGFyZShsb2NhbFZlcnNpb24pID4gMDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byBjb21wYXJlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgfVxuXG4gICAgaWYgKGlzR2xvYmFsR3JlYXRlcikge1xuICAgICAgLy8gSWYgdXNpbmcgdGhlIHVwZGF0ZSBjb21tYW5kIGFuZCB0aGUgZ2xvYmFsIHZlcnNpb24gaXMgZ3JlYXRlciwgdXNlIHRoZSBuZXdlciB1cGRhdGUgY29tbWFuZFxuICAgICAgLy8gVGhpcyBhbGxvd3MgaW1wcm92ZW1lbnRzIGluIHVwZGF0ZSB0byBiZSB1c2VkIGluIG9sZGVyIHZlcnNpb25zIHRoYXQgZG8gbm90IGhhdmUgYm9vdHN0cmFwcGluZ1xuICAgICAgaWYgKFxuICAgICAgICBwcm9jZXNzLmFyZ3ZbMl0gPT09ICd1cGRhdGUnICYmXG4gICAgICAgIGNsaS5WRVJTSU9OICYmXG4gICAgICAgIGNsaS5WRVJTSU9OLm1ham9yIC0gZ2xvYmFsVmVyc2lvbi5tYWpvciA8PSAxXG4gICAgICApIHtcbiAgICAgICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgICAgICAvLyBPdGhlcndpc2UsIHVzZSBsb2NhbCB2ZXJzaW9uIGFuZCB3YXJuIGlmIGdsb2JhbCBpcyBuZXdlciB0aGFuIGxvY2FsXG4gICAgICAgIGNvbnN0IHdhcm5pbmcgPVxuICAgICAgICAgIGBZb3VyIGdsb2JhbCBBbmd1bGFyIENMSSB2ZXJzaW9uICgke2dsb2JhbFZlcnNpb259KSBpcyBncmVhdGVyIHRoYW4geW91ciBsb2NhbCBgICtcbiAgICAgICAgICBgdmVyc2lvbiAoJHtsb2NhbFZlcnNpb259KS4gVGhlIGxvY2FsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgdXNlZC5cXG5cXG5gICtcbiAgICAgICAgICAnVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi4nO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKGNvbG9ycy55ZWxsb3cod2FybmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIHJlc29sdmUgY291bGQgbm90IGZpbmQgdGhlIG5nLWNsaVxuICAgIC8vIGxpYnJhcnkgZnJvbSBhIHBhY2thZ2UuanNvbi4gSW5zdGVhZCwgaW5jbHVkZSBpdCBmcm9tIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIHRvIHRoaXMgc2NyaXB0IGZpbGUgKHdoaWNoIGlzIGxpa2VseSBhIGdsb2JhbGx5IGluc3RhbGxlZFxuICAgIC8vIG5wbSBwYWNrYWdlKS4gTW9zdCBjb21tb24gY2F1c2UgZm9yIGhpdHRpbmcgdGhpcyBpcyBgbmcgbmV3YFxuICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgfVxuXG4gIGlmICgnZGVmYXVsdCcgaW4gY2xpKSB7XG4gICAgY2xpID0gY2xpWydkZWZhdWx0J107XG4gIH1cblxuICByZXR1cm4gY2xpO1xufSkoKVxuICAudGhlbigoY2xpKSA9PiB7XG4gICAgcmV0dXJuIGNsaSh7XG4gICAgICBjbGlBcmdzOiBwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksXG4gICAgICBpbnB1dFN0cmVhbTogcHJvY2Vzcy5zdGRpbixcbiAgICAgIG91dHB1dFN0cmVhbTogcHJvY2Vzcy5zdGRvdXQsXG4gICAgfSk7XG4gIH0pXG4gIC50aGVuKChleGl0Q29kZTogbnVtYmVyKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgfSlcbiAgLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgY29uc29sZS5lcnJvcignVW5rbm93biBlcnJvcjogJyArIGVyci50b1N0cmluZygpKTtcbiAgICBwcm9jZXNzLmV4aXQoMTI3KTtcbiAgfSk7XG4iXX0=