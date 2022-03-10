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
const version_1 = require("../src/utilities/version");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0Qsc0RBQW1EO0FBRW5ELENBQUMsS0FBSyxJQUFJLEVBQUU7O0lBQ1Y7Ozs7O09BS0c7SUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLEdBQUcsQ0FBQztJQUUvQyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUN2RTs7O09BR0c7SUFDSCxNQUFNLG1CQUFtQixHQUN2QixzQkFBc0IsS0FBSyxTQUFTO1FBQ3BDLHNCQUFzQixLQUFLLEdBQUc7UUFDOUIsc0JBQXNCLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDO0lBRW5ELElBQUksbUJBQW1CLEVBQUU7UUFDdkIsT0FBTyxDQUFDLHdEQUFhLE9BQU8sR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0tBQ3hDO0lBRUQsSUFBSSxHQUFHLENBQUM7SUFDUixJQUFJO1FBQ0YsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixHQUFHLEdBQUcsd0RBQWEsZUFBZSxHQUFDLENBQUM7UUFFcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFNLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQyxt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c0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3RcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNlbVZlciB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy92ZXJzaW9uJztcblxuKGFzeW5jICgpID0+IHtcbiAgLyoqXG4gICAqIERpc2FibGUgQnJvd3NlcnNsaXN0IG9sZCBkYXRhIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHdpdGggZXZlcnkgcmVsZWFzZSB3ZSdkIG5lZWQgdG8gdXBkYXRlIHRoaXMgZGVwZW5kZW5jeVxuICAgKiB3aGljaCBpcyBjdW1iZXJzb21lIGNvbnNpZGVyaW5nIHdlIHBpbiB2ZXJzaW9ucyBhbmQgdGhlIHdhcm5pbmcgaXMgbm90IHVzZXIgYWN0aW9uYWJsZS5cbiAgICogYEJyb3dzZXJzbGlzdDogY2FuaXVzZS1saXRlIGlzIG91dGRhdGVkLiBQbGVhc2UgcnVuIG5leHQgY29tbWFuZCBgbnBtIHVwZGF0ZWBcbiAgICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcnNsaXN0L2Jyb3dzZXJzbGlzdC9ibG9iLzgxOWM0MzM3NDU2OTk2ZDE5ZGI2YmE5NTMwMTQ1NzkzMjllOWM2ZTEvbm9kZS5qcyNMMzI0XG4gICAqL1xuICBwcm9jZXNzLmVudi5CUk9XU0VSU0xJU1RfSUdOT1JFX09MRF9EQVRBID0gJzEnO1xuXG4gIGNvbnN0IGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgPSBwcm9jZXNzLmVudlsnTkdfRElTQUJMRV9WRVJTSU9OX0NIRUNLJ107XG4gIC8qKlxuICAgKiBEaXNhYmxlIENMSSB2ZXJzaW9uIG1pc21hdGNoIGNoZWNrcyBhbmQgZm9yY2VzIHVzYWdlIG9mIHRoZSBpbnZva2VkIENMSVxuICAgKiBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBsb2NhbCBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgICovXG4gIGNvbnN0IGRpc2FibGVWZXJzaW9uQ2hlY2sgPVxuICAgIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgIT09IHVuZGVmaW5lZCAmJlxuICAgIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYgIT09ICcwJyAmJlxuICAgIGRpc2FibGVWZXJzaW9uQ2hlY2tFbnYudG9Mb3dlckNhc2UoKSAhPT0gJ2ZhbHNlJztcblxuICBpZiAoZGlzYWJsZVZlcnNpb25DaGVjaykge1xuICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaScpKS5kZWZhdWx0O1xuICB9XG5cbiAgbGV0IGNsaTtcbiAgdHJ5IHtcbiAgICAvLyBObyBlcnJvciBpbXBsaWVzIGEgcHJvamVjdExvY2FsQ2xpLCB3aGljaCB3aWxsIGxvYWQgd2hhdGV2ZXJcbiAgICAvLyB2ZXJzaW9uIG9mIG5nLWNsaSB5b3UgaGF2ZSBpbnN0YWxsZWQgaW4gYSBsb2NhbCBwYWNrYWdlLmpzb25cbiAgICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NsaScsIHsgcGF0aHM6IFtwcm9jZXNzLmN3ZCgpXSB9KTtcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQocHJvamVjdExvY2FsQ2xpKTtcblxuICAgIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKFZFUlNJT04uZnVsbCk7XG5cbiAgICAvLyBPbGRlciB2ZXJzaW9ucyBtaWdodCBub3QgaGF2ZSB0aGUgVkVSU0lPTiBleHBvcnRcbiAgICBsZXQgbG9jYWxWZXJzaW9uID0gY2xpLlZFUlNJT04/LmZ1bGw7XG4gICAgaWYgKCFsb2NhbFZlcnNpb24pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxvY2FsUGFja2FnZUpzb24gPSBhd2FpdCBmcy5yZWFkRmlsZShcbiAgICAgICAgICBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHByb2plY3RMb2NhbENsaSksICcuLi8uLi9wYWNrYWdlLmpzb24nKSxcbiAgICAgICAgICAndXRmLTgnLFxuICAgICAgICApO1xuICAgICAgICBsb2NhbFZlcnNpb24gPSAoSlNPTi5wYXJzZShsb2NhbFBhY2thZ2VKc29uKSBhcyB7IHZlcnNpb246IHN0cmluZyB9KS52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIHJldHJpZXZlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGlzR2xvYmFsR3JlYXRlciA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc0dsb2JhbEdyZWF0ZXIgPSAhIWxvY2FsVmVyc2lvbiAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gY29tcGFyZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgIH1cblxuICAgIGlmIChpc0dsb2JhbEdyZWF0ZXIpIHtcbiAgICAgIC8vIElmIHVzaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBhbmQgdGhlIGdsb2JhbCB2ZXJzaW9uIGlzIGdyZWF0ZXIsIHVzZSB0aGUgbmV3ZXIgdXBkYXRlIGNvbW1hbmRcbiAgICAgIC8vIFRoaXMgYWxsb3dzIGltcHJvdmVtZW50cyBpbiB1cGRhdGUgdG8gYmUgdXNlZCBpbiBvbGRlciB2ZXJzaW9ucyB0aGF0IGRvIG5vdCBoYXZlIGJvb3RzdHJhcHBpbmdcbiAgICAgIGlmIChcbiAgICAgICAgcHJvY2Vzcy5hcmd2WzJdID09PSAndXBkYXRlJyAmJlxuICAgICAgICBjbGkuVkVSU0lPTiAmJlxuICAgICAgICBjbGkuVkVSU0lPTi5tYWpvciAtIGdsb2JhbFZlcnNpb24ubWFqb3IgPD0gMVxuICAgICAgKSB7XG4gICAgICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNXYXJuaW5nRW5hYmxlZCgndmVyc2lvbk1pc21hdGNoJykpIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCB1c2UgbG9jYWwgdmVyc2lvbiBhbmQgd2FybiBpZiBnbG9iYWwgaXMgbmV3ZXIgdGhhbiBsb2NhbFxuICAgICAgICBjb25zdCB3YXJuaW5nID1cbiAgICAgICAgICBgWW91ciBnbG9iYWwgQW5ndWxhciBDTEkgdmVyc2lvbiAoJHtnbG9iYWxWZXJzaW9ufSkgaXMgZ3JlYXRlciB0aGFuIHlvdXIgbG9jYWwgYCArXG4gICAgICAgICAgYHZlcnNpb24gKCR7bG9jYWxWZXJzaW9ufSkuIFRoZSBsb2NhbCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIHVzZWQuXFxuXFxuYCArXG4gICAgICAgICAgJ1RvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHVzZSBcIm5nIGNvbmZpZyAtZyBjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoIGZhbHNlXCIuJztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcihjb2xvcnMueWVsbG93KHdhcm5pbmcpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRoZXJlIGlzIGFuIGVycm9yLCByZXNvbHZlIGNvdWxkIG5vdCBmaW5kIHRoZSBuZy1jbGlcbiAgICAvLyBsaWJyYXJ5IGZyb20gYSBwYWNrYWdlLmpzb24uIEluc3RlYWQsIGluY2x1ZGUgaXQgZnJvbSBhIHJlbGF0aXZlXG4gICAgLy8gcGF0aCB0byB0aGlzIHNjcmlwdCBmaWxlICh3aGljaCBpcyBsaWtlbHkgYSBnbG9iYWxseSBpbnN0YWxsZWRcbiAgICAvLyBucG0gcGFja2FnZSkuIE1vc3QgY29tbW9uIGNhdXNlIGZvciBoaXR0aW5nIHRoaXMgaXMgYG5nIG5ld2BcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gIH1cblxuICBpZiAoJ2RlZmF1bHQnIGluIGNsaSkge1xuICAgIGNsaSA9IGNsaVsnZGVmYXVsdCddO1xuICB9XG5cbiAgcmV0dXJuIGNsaTtcbn0pKClcbiAgLnRoZW4oKGNsaSkgPT4ge1xuICAgIHJldHVybiBjbGkoe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgICAgaW5wdXRTdHJlYW06IHByb2Nlc3Muc3RkaW4sXG4gICAgICBvdXRwdXRTdHJlYW06IHByb2Nlc3Muc3Rkb3V0LFxuICAgIH0pO1xuICB9KVxuICAudGhlbigoZXhpdENvZGU6IG51bWJlcikgPT4ge1xuICAgIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19