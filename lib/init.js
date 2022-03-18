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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0QsOEVBQTJFO0FBQzNFLHNEQUFtRDtBQUVuRCxDQUFDLEtBQUssSUFBSSxFQUFFOztJQUNWOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFFL0M7OztPQUdHO0lBQ0gsSUFBSSx5Q0FBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLElBQUk7UUFDRiwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFtRDtRQUNuRCxJQUFJLFlBQVksR0FBRyxNQUFBLEdBQUcsQ0FBQyxPQUFPLDBDQUFFLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLElBQUk7Z0JBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGFBQUUsQ0FBQyxRQUFRLENBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUM5RCxPQUFPLENBQ1IsQ0FBQztnQkFDRixZQUFZLEdBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBeUIsQ0FBQyxPQUFPLENBQUM7YUFDOUU7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZCx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLEdBQUcsS0FBSyxDQUFDLENBQUM7YUFDN0Y7U0FDRjtRQUVELElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztRQUM1QixJQUFJO1lBQ0YsZUFBZSxHQUFHLENBQUMsQ0FBQyxZQUFZLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDN0U7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLG1FQUFtRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQzVGO1FBRUQsSUFBSSxlQUFlLEVBQUU7WUFDbkIsOEZBQThGO1lBQzlGLGlHQUFpRztZQUNqRyxJQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtnQkFDNUIsR0FBRyxDQUFDLE9BQU87Z0JBQ1gsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQzVDO2dCQUNBLEdBQUcsR0FBRyx3REFBYSxPQUFPLEdBQUMsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLE1BQU0sSUFBQSx5QkFBZ0IsRUFBQyxpQkFBaUIsQ0FBQyxFQUFFO2dCQUNwRCxzRUFBc0U7Z0JBQ3RFLE1BQU0sT0FBTyxHQUNYLG9DQUFvQyxhQUFhLCtCQUErQjtvQkFDaEYsWUFBWSxZQUFZLCtDQUErQztvQkFDdkUsZ0ZBQWdGLENBQUM7Z0JBRW5GLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDdkM7U0FDRjtLQUNGO0lBQUMsV0FBTTtRQUNOLDBEQUEwRDtRQUMxRCxtRUFBbUU7UUFDbkUsaUVBQWlFO1FBQ2pFLCtEQUErRDtRQUMvRCxHQUFHLEdBQUcsd0RBQWEsT0FBTyxHQUFDLENBQUM7S0FDN0I7SUFFRCxJQUFJLFNBQVMsSUFBSSxHQUFHLEVBQUU7UUFDcEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN0QjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLEVBQUU7S0FDRCxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtJQUNaLE9BQU8sR0FBRyxDQUFDO1FBQ1QsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM5QixXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDMUIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0tBQzdCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztLQUNELElBQUksQ0FBQyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtJQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQztLQUNELEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO0lBQ3BCLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICdzeW1ib2wtb2JzZXJ2YWJsZSc7XG4vLyBzeW1ib2wgcG9seWZpbGwgbXVzdCBnbyBmaXJzdFxuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGRpc2FibGVWZXJzaW9uQ2hlY2sgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvdmVyc2lvbic7XG5cbihhc3luYyAoKSA9PiB7XG4gIC8qKlxuICAgKiBEaXNhYmxlIEJyb3dzZXJzbGlzdCBvbGQgZGF0YSB3YXJuaW5nIGFzIG90aGVyd2lzZSB3aXRoIGV2ZXJ5IHJlbGVhc2Ugd2UnZCBuZWVkIHRvIHVwZGF0ZSB0aGlzIGRlcGVuZGVuY3lcbiAgICogd2hpY2ggaXMgY3VtYmVyc29tZSBjb25zaWRlcmluZyB3ZSBwaW4gdmVyc2lvbnMgYW5kIHRoZSB3YXJuaW5nIGlzIG5vdCB1c2VyIGFjdGlvbmFibGUuXG4gICAqIGBCcm93c2Vyc2xpc3Q6IGNhbml1c2UtbGl0ZSBpcyBvdXRkYXRlZC4gUGxlYXNlIHJ1biBuZXh0IGNvbW1hbmQgYG5wbSB1cGRhdGVgXG4gICAqIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJzbGlzdC9icm93c2Vyc2xpc3QvYmxvYi84MTljNDMzNzQ1Njk5NmQxOWRiNmJhOTUzMDE0NTc5MzI5ZTljNmUxL25vZGUuanMjTDMyNFxuICAgKi9cbiAgcHJvY2Vzcy5lbnYuQlJPV1NFUlNMSVNUX0lHTk9SRV9PTERfREFUQSA9ICcxJztcblxuICAvKipcbiAgICogRGlzYWJsZSBDTEkgdmVyc2lvbiBtaXNtYXRjaCBjaGVja3MgYW5kIGZvcmNlcyB1c2FnZSBvZiB0aGUgaW52b2tlZCBDTElcbiAgICogaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgbG9jYWwgaW5zdGFsbGVkIHZlcnNpb24uXG4gICAqL1xuICBpZiAoZGlzYWJsZVZlcnNpb25DaGVjaykge1xuICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaScpKS5kZWZhdWx0O1xuICB9XG5cbiAgbGV0IGNsaTtcbiAgdHJ5IHtcbiAgICAvLyBObyBlcnJvciBpbXBsaWVzIGEgcHJvamVjdExvY2FsQ2xpLCB3aGljaCB3aWxsIGxvYWQgd2hhdGV2ZXJcbiAgICAvLyB2ZXJzaW9uIG9mIG5nLWNsaSB5b3UgaGF2ZSBpbnN0YWxsZWQgaW4gYSBsb2NhbCBwYWNrYWdlLmpzb25cbiAgICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NsaScsIHsgcGF0aHM6IFtwcm9jZXNzLmN3ZCgpXSB9KTtcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQocHJvamVjdExvY2FsQ2xpKTtcblxuICAgIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKFZFUlNJT04uZnVsbCk7XG5cbiAgICAvLyBPbGRlciB2ZXJzaW9ucyBtaWdodCBub3QgaGF2ZSB0aGUgVkVSU0lPTiBleHBvcnRcbiAgICBsZXQgbG9jYWxWZXJzaW9uID0gY2xpLlZFUlNJT04/LmZ1bGw7XG4gICAgaWYgKCFsb2NhbFZlcnNpb24pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxvY2FsUGFja2FnZUpzb24gPSBhd2FpdCBmcy5yZWFkRmlsZShcbiAgICAgICAgICBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHByb2plY3RMb2NhbENsaSksICcuLi8uLi9wYWNrYWdlLmpzb24nKSxcbiAgICAgICAgICAndXRmLTgnLFxuICAgICAgICApO1xuICAgICAgICBsb2NhbFZlcnNpb24gPSAoSlNPTi5wYXJzZShsb2NhbFBhY2thZ2VKc29uKSBhcyB7IHZlcnNpb246IHN0cmluZyB9KS52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIHJldHJpZXZlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGlzR2xvYmFsR3JlYXRlciA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc0dsb2JhbEdyZWF0ZXIgPSAhIWxvY2FsVmVyc2lvbiAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gY29tcGFyZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgIH1cblxuICAgIGlmIChpc0dsb2JhbEdyZWF0ZXIpIHtcbiAgICAgIC8vIElmIHVzaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBhbmQgdGhlIGdsb2JhbCB2ZXJzaW9uIGlzIGdyZWF0ZXIsIHVzZSB0aGUgbmV3ZXIgdXBkYXRlIGNvbW1hbmRcbiAgICAgIC8vIFRoaXMgYWxsb3dzIGltcHJvdmVtZW50cyBpbiB1cGRhdGUgdG8gYmUgdXNlZCBpbiBvbGRlciB2ZXJzaW9ucyB0aGF0IGRvIG5vdCBoYXZlIGJvb3RzdHJhcHBpbmdcbiAgICAgIGlmIChcbiAgICAgICAgcHJvY2Vzcy5hcmd2WzJdID09PSAndXBkYXRlJyAmJlxuICAgICAgICBjbGkuVkVSU0lPTiAmJlxuICAgICAgICBjbGkuVkVSU0lPTi5tYWpvciAtIGdsb2JhbFZlcnNpb24ubWFqb3IgPD0gMVxuICAgICAgKSB7XG4gICAgICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgICAgIH0gZWxzZSBpZiAoYXdhaXQgaXNXYXJuaW5nRW5hYmxlZCgndmVyc2lvbk1pc21hdGNoJykpIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCB1c2UgbG9jYWwgdmVyc2lvbiBhbmQgd2FybiBpZiBnbG9iYWwgaXMgbmV3ZXIgdGhhbiBsb2NhbFxuICAgICAgICBjb25zdCB3YXJuaW5nID1cbiAgICAgICAgICBgWW91ciBnbG9iYWwgQW5ndWxhciBDTEkgdmVyc2lvbiAoJHtnbG9iYWxWZXJzaW9ufSkgaXMgZ3JlYXRlciB0aGFuIHlvdXIgbG9jYWwgYCArXG4gICAgICAgICAgYHZlcnNpb24gKCR7bG9jYWxWZXJzaW9ufSkuIFRoZSBsb2NhbCBBbmd1bGFyIENMSSB2ZXJzaW9uIGlzIHVzZWQuXFxuXFxuYCArXG4gICAgICAgICAgJ1RvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHVzZSBcIm5nIGNvbmZpZyAtZyBjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoIGZhbHNlXCIuJztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcihjb2xvcnMueWVsbG93KHdhcm5pbmcpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRoZXJlIGlzIGFuIGVycm9yLCByZXNvbHZlIGNvdWxkIG5vdCBmaW5kIHRoZSBuZy1jbGlcbiAgICAvLyBsaWJyYXJ5IGZyb20gYSBwYWNrYWdlLmpzb24uIEluc3RlYWQsIGluY2x1ZGUgaXQgZnJvbSBhIHJlbGF0aXZlXG4gICAgLy8gcGF0aCB0byB0aGlzIHNjcmlwdCBmaWxlICh3aGljaCBpcyBsaWtlbHkgYSBnbG9iYWxseSBpbnN0YWxsZWRcbiAgICAvLyBucG0gcGFja2FnZSkuIE1vc3QgY29tbW9uIGNhdXNlIGZvciBoaXR0aW5nIHRoaXMgaXMgYG5nIG5ld2BcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gIH1cblxuICBpZiAoJ2RlZmF1bHQnIGluIGNsaSkge1xuICAgIGNsaSA9IGNsaVsnZGVmYXVsdCddO1xuICB9XG5cbiAgcmV0dXJuIGNsaTtcbn0pKClcbiAgLnRoZW4oKGNsaSkgPT4ge1xuICAgIHJldHVybiBjbGkoe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgICAgaW5wdXRTdHJlYW06IHByb2Nlc3Muc3RkaW4sXG4gICAgICBvdXRwdXRTdHJlYW06IHByb2Nlc3Muc3Rkb3V0LFxuICAgIH0pO1xuICB9KVxuICAudGhlbigoZXhpdENvZGU6IG51bWJlcikgPT4ge1xuICAgIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19