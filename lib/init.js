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
    process.exitCode = exitCode;
})
    .catch((err) => {
    // eslint-disable-next-line  no-console
    console.error('Unknown error: ' + err.toString());
    process.exit(127);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0QsOEVBQTJFO0FBQzNFLHNEQUFtRDtBQUVuRCxDQUFDLEtBQUssSUFBSSxFQUFFOztJQUNWOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFFL0M7OztPQUdHO0lBQ0gsSUFBSSx5Q0FBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLElBQUk7UUFDRiwrREFBK0Q7UUFDL0QsK0RBQStEO1FBQy9ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFtRDtRQUNuRCxJQUFJLFlBQVksR0FBRyxNQUFBLEdBQUcsQ0FBQyxPQUFPLDBDQUFFLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLElBQUk7Z0JBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGFBQUUsQ0FBQyxRQUFRLENBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUM5RCxPQUFPLENBQ1IsQ0FBQztnQkFDRixZQUFZLEdBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBeUIsQ0FBQyxPQUFPLENBQUM7YUFDOUU7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZCx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLEdBQUcsS0FBSyxDQUFDLENBQUM7YUFDN0Y7U0FDRjtRQUVELElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztRQUM1QixJQUFJO1lBQ0YsZUFBZSxHQUFHLENBQUMsQ0FBQyxZQUFZLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDN0U7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLG1FQUFtRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQzVGO1FBRUQsSUFBSSxlQUFlLEVBQUU7WUFDbkIsOEZBQThGO1lBQzlGLGlHQUFpRztZQUNqRyxJQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtnQkFDNUIsR0FBRyxDQUFDLE9BQU87Z0JBQ1gsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQzVDO2dCQUNBLEdBQUcsR0FBRyx3REFBYSxPQUFPLEdBQUMsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLE1BQU0sSUFBQSx5QkFBZ0IsRUFBQyxpQkFBaUIsQ0FBQyxFQUFFO2dCQUNwRCxzRUFBc0U7Z0JBQ3RFLE1BQU0sT0FBTyxHQUNYLG9DQUFvQyxhQUFhLCtCQUErQjtvQkFDaEYsWUFBWSxZQUFZLCtDQUErQztvQkFDdkUsZ0ZBQWdGLENBQUM7Z0JBRW5GLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDdkM7U0FDRjtLQUNGO0lBQUMsV0FBTTtRQUNOLDBEQUEwRDtRQUMxRCxtRUFBbUU7UUFDbkUsaUVBQWlFO1FBQ2pFLCtEQUErRDtRQUMvRCxHQUFHLEdBQUcsd0RBQWEsT0FBTyxHQUFDLENBQUM7S0FDN0I7SUFFRCxJQUFJLFNBQVMsSUFBSSxHQUFHLEVBQUU7UUFDcEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN0QjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLEVBQUU7S0FDRCxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtJQUNaLE9BQU8sR0FBRyxDQUFDO1FBQ1QsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM5QixXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDMUIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0tBQzdCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztLQUNELElBQUksQ0FBQyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtJQUN6QixPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUM5QixDQUFDLENBQUM7S0FDRCxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtJQUNwQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3RcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFNlbVZlciB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG4oYXN5bmMgKCkgPT4ge1xuICAvKipcbiAgICogRGlzYWJsZSBCcm93c2Vyc2xpc3Qgb2xkIGRhdGEgd2FybmluZyBhcyBvdGhlcndpc2Ugd2l0aCBldmVyeSByZWxlYXNlIHdlJ2QgbmVlZCB0byB1cGRhdGUgdGhpcyBkZXBlbmRlbmN5XG4gICAqIHdoaWNoIGlzIGN1bWJlcnNvbWUgY29uc2lkZXJpbmcgd2UgcGluIHZlcnNpb25zIGFuZCB0aGUgd2FybmluZyBpcyBub3QgdXNlciBhY3Rpb25hYmxlLlxuICAgKiBgQnJvd3NlcnNsaXN0OiBjYW5pdXNlLWxpdGUgaXMgb3V0ZGF0ZWQuIFBsZWFzZSBydW4gbmV4dCBjb21tYW5kIGBucG0gdXBkYXRlYFxuICAgKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc2xpc3QvYnJvd3NlcnNsaXN0L2Jsb2IvODE5YzQzMzc0NTY5OTZkMTlkYjZiYTk1MzAxNDU3OTMyOWU5YzZlMS9ub2RlLmpzI0wzMjRcbiAgICovXG4gIHByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9JR05PUkVfT0xEX0RBVEEgPSAnMSc7XG5cbiAgLyoqXG4gICAqIERpc2FibGUgQ0xJIHZlcnNpb24gbWlzbWF0Y2ggY2hlY2tzIGFuZCBmb3JjZXMgdXNhZ2Ugb2YgdGhlIGludm9rZWQgQ0xJXG4gICAqIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIGxvY2FsIGluc3RhbGxlZCB2ZXJzaW9uLlxuICAgKi9cbiAgaWYgKGRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGknKSkuZGVmYXVsdDtcbiAgfVxuXG4gIGxldCBjbGk7XG4gIHRyeSB7XG4gICAgLy8gTm8gZXJyb3IgaW1wbGllcyBhIHByb2plY3RMb2NhbENsaSwgd2hpY2ggd2lsbCBsb2FkIHdoYXRldmVyXG4gICAgLy8gdmVyc2lvbiBvZiBuZy1jbGkgeW91IGhhdmUgaW5zdGFsbGVkIGluIGEgbG9jYWwgcGFja2FnZS5qc29uXG4gICAgY29uc3QgcHJvamVjdExvY2FsQ2xpID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci9jbGknLCB7IHBhdGhzOiBbcHJvY2Vzcy5jd2QoKV0gfSk7XG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KHByb2plY3RMb2NhbENsaSk7XG5cbiAgICBjb25zdCBnbG9iYWxWZXJzaW9uID0gbmV3IFNlbVZlcihWRVJTSU9OLmZ1bGwpO1xuXG4gICAgLy8gT2xkZXIgdmVyc2lvbnMgbWlnaHQgbm90IGhhdmUgdGhlIFZFUlNJT04gZXhwb3J0XG4gICAgbGV0IGxvY2FsVmVyc2lvbiA9IGNsaS5WRVJTSU9OPy5mdWxsO1xuICAgIGlmICghbG9jYWxWZXJzaW9uKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2NhbFBhY2thZ2VKc29uID0gYXdhaXQgZnMucmVhZEZpbGUoXG4gICAgICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShwcm9qZWN0TG9jYWxDbGkpLCAnLi4vLi4vcGFja2FnZS5qc29uJyksXG4gICAgICAgICAgJ3V0Zi04JyxcbiAgICAgICAgKTtcbiAgICAgICAgbG9jYWxWZXJzaW9uID0gKEpTT04ucGFyc2UobG9jYWxQYWNrYWdlSnNvbikgYXMgeyB2ZXJzaW9uOiBzdHJpbmcgfSkudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byByZXRyaWV2ZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpc0dsb2JhbEdyZWF0ZXIgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNHbG9iYWxHcmVhdGVyID0gISFsb2NhbFZlcnNpb24gJiYgZ2xvYmFsVmVyc2lvbi5jb21wYXJlKGxvY2FsVmVyc2lvbikgPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIGNvbXBhcmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICB9XG5cbiAgICBpZiAoaXNHbG9iYWxHcmVhdGVyKSB7XG4gICAgICAvLyBJZiB1c2luZyB0aGUgdXBkYXRlIGNvbW1hbmQgYW5kIHRoZSBnbG9iYWwgdmVyc2lvbiBpcyBncmVhdGVyLCB1c2UgdGhlIG5ld2VyIHVwZGF0ZSBjb21tYW5kXG4gICAgICAvLyBUaGlzIGFsbG93cyBpbXByb3ZlbWVudHMgaW4gdXBkYXRlIHRvIGJlIHVzZWQgaW4gb2xkZXIgdmVyc2lvbnMgdGhhdCBkbyBub3QgaGF2ZSBib290c3RyYXBwaW5nXG4gICAgICBpZiAoXG4gICAgICAgIHByb2Nlc3MuYXJndlsyXSA9PT0gJ3VwZGF0ZScgJiZcbiAgICAgICAgY2xpLlZFUlNJT04gJiZcbiAgICAgICAgY2xpLlZFUlNJT04ubWFqb3IgLSBnbG9iYWxWZXJzaW9uLm1ham9yIDw9IDFcbiAgICAgICkge1xuICAgICAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGlzV2FybmluZ0VuYWJsZWQoJ3ZlcnNpb25NaXNtYXRjaCcpKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgdXNlIGxvY2FsIHZlcnNpb24gYW5kIHdhcm4gaWYgZ2xvYmFsIGlzIG5ld2VyIHRoYW4gbG9jYWxcbiAgICAgICAgY29uc3Qgd2FybmluZyA9XG4gICAgICAgICAgYFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsIGAgK1xuICAgICAgICAgIGB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxcblxcbmAgK1xuICAgICAgICAgICdUbyBkaXNhYmxlIHRoaXMgd2FybmluZyB1c2UgXCJuZyBjb25maWcgLWcgY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCBmYWxzZVwiLic7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29sb3JzLnllbGxvdyh3YXJuaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gICAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gICAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICB9XG5cbiAgaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbiAgfVxuXG4gIHJldHVybiBjbGk7XG59KSgpXG4gIC50aGVuKChjbGkpID0+IHtcbiAgICByZXR1cm4gY2xpKHtcbiAgICAgIGNsaUFyZ3M6IHByb2Nlc3MuYXJndi5zbGljZSgyKSxcbiAgICAgIGlucHV0U3RyZWFtOiBwcm9jZXNzLnN0ZGluLFxuICAgICAgb3V0cHV0U3RyZWFtOiBwcm9jZXNzLnN0ZG91dCxcbiAgICB9KTtcbiAgfSlcbiAgLnRoZW4oKGV4aXRDb2RlOiBudW1iZXIpID0+IHtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19