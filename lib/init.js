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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQyxtQ0FBdUM7QUFDdkMsMkNBQTZCO0FBQzdCLG1DQUF1QztBQUN2QyxrREFBZ0Q7QUFDaEQsb0RBQTJEO0FBQzNELDhFQUEyRTtBQUMzRSxzREFBbUQ7QUFFbkQ7Ozs7O0dBS0c7QUFDSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFFdEIsQ0FBQyxLQUFLLElBQW9ELEVBQUU7O0lBQzFEOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFFL0M7OztPQUdHO0lBQ0gsSUFBSSx5Q0FBbUIsRUFBRTtRQUN2QixPQUFPLENBQUMsd0RBQWEsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFFRCxJQUFJLEdBQUcsQ0FBQztJQUNSLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdkMsSUFBSTtRQUNGLCtEQUErRDtRQUMvRCwrREFBK0Q7UUFDL0QsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQkFBYSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN0RCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNELEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLG1EQUFtRDtRQUNuRCxJQUFJLFlBQVksR0FBRyxNQUFBLEdBQUcsQ0FBQyxPQUFPLDBDQUFFLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLElBQUk7Z0JBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGFBQUUsQ0FBQyxRQUFRLENBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUM5RCxPQUFPLENBQ1IsQ0FBQztnQkFDRixZQUFZLEdBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBeUIsQ0FBQyxPQUFPLENBQUM7YUFDOUU7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZCx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLEdBQUcsS0FBSyxDQUFDLENBQUM7YUFDN0Y7U0FDRjtRQUVELDhDQUE4QztRQUM5QyxJQUFJLElBQUEsY0FBSyxFQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUM1QixTQUFTLEdBQUcsSUFBSSxDQUFDO1lBRWpCLDREQUE0RDtZQUM1RCxJQUFJLGNBQWMsS0FBSyxZQUFZLEVBQUU7Z0JBQ25DLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztRQUM1QixJQUFJO1lBQ0YsZUFBZSxHQUFHLENBQUMsQ0FBQyxZQUFZLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDN0U7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLG1FQUFtRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQzVGO1FBRUQscUdBQXFHO1FBQ3JHLElBQ0UsZUFBZTtZQUNmLGNBQWMsS0FBSyx5QkFBeUI7WUFDNUMsY0FBYyxLQUFLLFlBQVksRUFDL0I7WUFDQSw4RkFBOEY7WUFDOUYsaUdBQWlHO1lBQ2pHLElBQ0UsY0FBYyxLQUFLLFFBQVE7Z0JBQzNCLEdBQUcsQ0FBQyxPQUFPO2dCQUNYLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUM1QztnQkFDQSxHQUFHLEdBQUcsd0RBQWEsT0FBTyxHQUFDLENBQUM7YUFDN0I7aUJBQU0sSUFBSSxNQUFNLElBQUEseUJBQWdCLEVBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDcEQsc0VBQXNFO2dCQUN0RSxNQUFNLE9BQU8sR0FDWCxvQ0FBb0MsYUFBYSwrQkFBK0I7b0JBQ2hGLFlBQVksWUFBWSwrQ0FBK0M7b0JBQ3ZFLGdGQUFnRixDQUFDO2dCQUVuRix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ3ZDO1NBQ0Y7S0FDRjtJQUFDLFdBQU07UUFDTiwwREFBMEQ7UUFDMUQsbUVBQW1FO1FBQ25FLGlFQUFpRTtRQUNqRSwrREFBK0Q7UUFDL0QsR0FBRyxHQUFHLHdEQUFhLE9BQU8sR0FBQyxDQUFDO0tBQzdCO0lBRUQsSUFBSSxTQUFTLElBQUksR0FBRyxFQUFFO1FBQ3BCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDdEI7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQyxFQUFFO0tBQ0QsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDWixHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUc7SUFDSixPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQy9CLENBQUMsQ0FDSDtLQUNBLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsRUFBRTtJQUNyQixJQUFJLFNBQVMsRUFBRTtRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDeEI7SUFDRCxPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUM5QixDQUFDLENBQUM7S0FDRCxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtJQUNwQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3RcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBtYWpvciB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG4vKipcbiAqIEFuZ3VsYXIgQ0xJIHZlcnNpb25zIHByaW9yIHRvIHYxNCBtYXkgbm90IGV4aXQgY29ycmVjdGx5IGlmIG5vdCBmb3JjaWJseSBleGl0ZWRcbiAqIHZpYSBgcHJvY2Vzcy5leGl0KClgLiBXaGVuIGJvb3RzdHJhcHBpbmcsIGBmb3JjZUV4aXRgIHdpbGwgYmUgc2V0IHRvIGB0cnVlYFxuICogaWYgdGhlIGxvY2FsIENMSSB2ZXJzaW9uIGlzIGxlc3MgdGhhbiB2MTQgdG8gcHJldmVudCB0aGUgQ0xJIGZyb20gaGFuZ2luZyBvblxuICogZXhpdCBpbiB0aG9zZSBjYXNlcy5cbiAqL1xubGV0IGZvcmNlRXhpdCA9IGZhbHNlO1xuXG4oYXN5bmMgKCk6IFByb21pc2U8dHlwZW9mIGltcG9ydCgnLi9jbGknKS5kZWZhdWx0IHwgbnVsbD4gPT4ge1xuICAvKipcbiAgICogRGlzYWJsZSBCcm93c2Vyc2xpc3Qgb2xkIGRhdGEgd2FybmluZyBhcyBvdGhlcndpc2Ugd2l0aCBldmVyeSByZWxlYXNlIHdlJ2QgbmVlZCB0byB1cGRhdGUgdGhpcyBkZXBlbmRlbmN5XG4gICAqIHdoaWNoIGlzIGN1bWJlcnNvbWUgY29uc2lkZXJpbmcgd2UgcGluIHZlcnNpb25zIGFuZCB0aGUgd2FybmluZyBpcyBub3QgdXNlciBhY3Rpb25hYmxlLlxuICAgKiBgQnJvd3NlcnNsaXN0OiBjYW5pdXNlLWxpdGUgaXMgb3V0ZGF0ZWQuIFBsZWFzZSBydW4gbmV4dCBjb21tYW5kIGBucG0gdXBkYXRlYFxuICAgKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc2xpc3QvYnJvd3NlcnNsaXN0L2Jsb2IvODE5YzQzMzc0NTY5OTZkMTlkYjZiYTk1MzAxNDU3OTMyOWU5YzZlMS9ub2RlLmpzI0wzMjRcbiAgICovXG4gIHByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9JR05PUkVfT0xEX0RBVEEgPSAnMSc7XG5cbiAgLyoqXG4gICAqIERpc2FibGUgQ0xJIHZlcnNpb24gbWlzbWF0Y2ggY2hlY2tzIGFuZCBmb3JjZXMgdXNhZ2Ugb2YgdGhlIGludm9rZWQgQ0xJXG4gICAqIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIGxvY2FsIGluc3RhbGxlZCB2ZXJzaW9uLlxuICAgKi9cbiAgaWYgKGRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGknKSkuZGVmYXVsdDtcbiAgfVxuXG4gIGxldCBjbGk7XG4gIGNvbnN0IHJhd0NvbW1hbmROYW1lID0gcHJvY2Vzcy5hcmd2WzJdO1xuXG4gIHRyeSB7XG4gICAgLy8gTm8gZXJyb3IgaW1wbGllcyBhIHByb2plY3RMb2NhbENsaSwgd2hpY2ggd2lsbCBsb2FkIHdoYXRldmVyXG4gICAgLy8gdmVyc2lvbiBvZiBuZy1jbGkgeW91IGhhdmUgaW5zdGFsbGVkIGluIGEgbG9jYWwgcGFja2FnZS5qc29uXG4gICAgY29uc3QgY3dkUmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUocHJvY2Vzcy5jd2QoKSArICcvJyk7XG4gICAgY29uc3QgcHJvamVjdExvY2FsQ2xpID0gY3dkUmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci9jbGknKTtcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQocHJvamVjdExvY2FsQ2xpKTtcblxuICAgIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKFZFUlNJT04uZnVsbCk7XG5cbiAgICAvLyBPbGRlciB2ZXJzaW9ucyBtaWdodCBub3QgaGF2ZSB0aGUgVkVSU0lPTiBleHBvcnRcbiAgICBsZXQgbG9jYWxWZXJzaW9uID0gY2xpLlZFUlNJT04/LmZ1bGw7XG4gICAgaWYgKCFsb2NhbFZlcnNpb24pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxvY2FsUGFja2FnZUpzb24gPSBhd2FpdCBmcy5yZWFkRmlsZShcbiAgICAgICAgICBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHByb2plY3RMb2NhbENsaSksICcuLi8uLi9wYWNrYWdlLmpzb24nKSxcbiAgICAgICAgICAndXRmLTgnLFxuICAgICAgICApO1xuICAgICAgICBsb2NhbFZlcnNpb24gPSAoSlNPTi5wYXJzZShsb2NhbFBhY2thZ2VKc29uKSBhcyB7IHZlcnNpb246IHN0cmluZyB9KS52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIHJldHJpZXZlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIG9sZGVyIHZlcnNpb25zIG9mIHRoZSBDTEkgZnVsbHkgZXhpdFxuICAgIGlmIChtYWpvcihsb2NhbFZlcnNpb24pIDwgMTQpIHtcbiAgICAgIGZvcmNlRXhpdCA9IHRydWU7XG5cbiAgICAgIC8vIFZlcnNpb25zIHByaW9yIHRvIDE0IGRpZG4ndCBpbXBsZW1lbnQgY29tcGxldGlvbiBjb21tYW5kLlxuICAgICAgaWYgKHJhd0NvbW1hbmROYW1lID09PSAnY29tcGxldGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGlzR2xvYmFsR3JlYXRlciA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc0dsb2JhbEdyZWF0ZXIgPSAhIWxvY2FsVmVyc2lvbiAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gY29tcGFyZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIFdoZW4gdXNpbmcgdGhlIGNvbXBsZXRpb24gY29tbWFuZCwgZG9uJ3Qgc2hvdyB0aGUgd2FybmluZyBhcyBvdGhlcndpc2UgdGhpcyB3aWxsIGJyZWFrIGNvbXBsZXRpb24uXG4gICAgaWYgKFxuICAgICAgaXNHbG9iYWxHcmVhdGVyICYmXG4gICAgICByYXdDb21tYW5kTmFtZSAhPT0gJy0tZ2V0LXlhcmdzLWNvbXBsZXRpb25zJyAmJlxuICAgICAgcmF3Q29tbWFuZE5hbWUgIT09ICdjb21wbGV0aW9uJ1xuICAgICkge1xuICAgICAgLy8gSWYgdXNpbmcgdGhlIHVwZGF0ZSBjb21tYW5kIGFuZCB0aGUgZ2xvYmFsIHZlcnNpb24gaXMgZ3JlYXRlciwgdXNlIHRoZSBuZXdlciB1cGRhdGUgY29tbWFuZFxuICAgICAgLy8gVGhpcyBhbGxvd3MgaW1wcm92ZW1lbnRzIGluIHVwZGF0ZSB0byBiZSB1c2VkIGluIG9sZGVyIHZlcnNpb25zIHRoYXQgZG8gbm90IGhhdmUgYm9vdHN0cmFwcGluZ1xuICAgICAgaWYgKFxuICAgICAgICByYXdDb21tYW5kTmFtZSA9PT0gJ3VwZGF0ZScgJiZcbiAgICAgICAgY2xpLlZFUlNJT04gJiZcbiAgICAgICAgY2xpLlZFUlNJT04ubWFqb3IgLSBnbG9iYWxWZXJzaW9uLm1ham9yIDw9IDFcbiAgICAgICkge1xuICAgICAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGlzV2FybmluZ0VuYWJsZWQoJ3ZlcnNpb25NaXNtYXRjaCcpKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgdXNlIGxvY2FsIHZlcnNpb24gYW5kIHdhcm4gaWYgZ2xvYmFsIGlzIG5ld2VyIHRoYW4gbG9jYWxcbiAgICAgICAgY29uc3Qgd2FybmluZyA9XG4gICAgICAgICAgYFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsIGAgK1xuICAgICAgICAgIGB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxcblxcbmAgK1xuICAgICAgICAgICdUbyBkaXNhYmxlIHRoaXMgd2FybmluZyB1c2UgXCJuZyBjb25maWcgLWcgY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCBmYWxzZVwiLic7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29sb3JzLnllbGxvdyh3YXJuaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gICAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gICAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICB9XG5cbiAgaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbiAgfVxuXG4gIHJldHVybiBjbGk7XG59KSgpXG4gIC50aGVuKChjbGkpID0+XG4gICAgY2xpPy4oe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgIH0pLFxuICApXG4gIC50aGVuKChleGl0Q29kZSA9IDApID0+IHtcbiAgICBpZiAoZm9yY2VFeGl0KSB7XG4gICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19