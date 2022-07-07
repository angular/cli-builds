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
    const rawCommandName = process.argv[2];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQXVDO0FBQ3ZDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0QsOEVBQTJFO0FBQzNFLHNEQUFtRDtBQUVuRDs7Ozs7R0FLRztBQUNILElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUV0QixDQUFDLEtBQUssSUFBb0QsRUFBRTs7SUFDMUQ7Ozs7O09BS0c7SUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLEdBQUcsQ0FBQztJQUUvQzs7O09BR0c7SUFDSCxJQUFJLHlDQUFtQixFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyx3REFBYSxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztLQUN4QztJQUVELElBQUksR0FBRyxDQUFDO0lBQ1IsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2QyxJQUFJO1FBQ0YsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixHQUFHLEdBQUcsd0RBQWEsZUFBZSxHQUFDLENBQUM7UUFFcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFNLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQyxtREFBbUQ7UUFDbkQsSUFBSSxZQUFZLEdBQUcsTUFBQSxHQUFHLENBQUMsT0FBTywwQ0FB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QUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICdzeW1ib2wtb2JzZXJ2YWJsZSc7XG4vLyBzeW1ib2wgcG9seWZpbGwgbXVzdCBnbyBmaXJzdFxuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBtYWpvciB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG4vKipcbiAqIEFuZ3VsYXIgQ0xJIHZlcnNpb25zIHByaW9yIHRvIHYxNCBtYXkgbm90IGV4aXQgY29ycmVjdGx5IGlmIG5vdCBmb3JjaWJseSBleGl0ZWRcbiAqIHZpYSBgcHJvY2Vzcy5leGl0KClgLiBXaGVuIGJvb3RzdHJhcHBpbmcsIGBmb3JjZUV4aXRgIHdpbGwgYmUgc2V0IHRvIGB0cnVlYFxuICogaWYgdGhlIGxvY2FsIENMSSB2ZXJzaW9uIGlzIGxlc3MgdGhhbiB2MTQgdG8gcHJldmVudCB0aGUgQ0xJIGZyb20gaGFuZ2luZyBvblxuICogZXhpdCBpbiB0aG9zZSBjYXNlcy5cbiAqL1xubGV0IGZvcmNlRXhpdCA9IGZhbHNlO1xuXG4oYXN5bmMgKCk6IFByb21pc2U8dHlwZW9mIGltcG9ydCgnLi9jbGknKS5kZWZhdWx0IHwgbnVsbD4gPT4ge1xuICAvKipcbiAgICogRGlzYWJsZSBCcm93c2Vyc2xpc3Qgb2xkIGRhdGEgd2FybmluZyBhcyBvdGhlcndpc2Ugd2l0aCBldmVyeSByZWxlYXNlIHdlJ2QgbmVlZCB0byB1cGRhdGUgdGhpcyBkZXBlbmRlbmN5XG4gICAqIHdoaWNoIGlzIGN1bWJlcnNvbWUgY29uc2lkZXJpbmcgd2UgcGluIHZlcnNpb25zIGFuZCB0aGUgd2FybmluZyBpcyBub3QgdXNlciBhY3Rpb25hYmxlLlxuICAgKiBgQnJvd3NlcnNsaXN0OiBjYW5pdXNlLWxpdGUgaXMgb3V0ZGF0ZWQuIFBsZWFzZSBydW4gbmV4dCBjb21tYW5kIGBucG0gdXBkYXRlYFxuICAgKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc2xpc3QvYnJvd3NlcnNsaXN0L2Jsb2IvODE5YzQzMzc0NTY5OTZkMTlkYjZiYTk1MzAxNDU3OTMyOWU5YzZlMS9ub2RlLmpzI0wzMjRcbiAgICovXG4gIHByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9JR05PUkVfT0xEX0RBVEEgPSAnMSc7XG5cbiAgLyoqXG4gICAqIERpc2FibGUgQ0xJIHZlcnNpb24gbWlzbWF0Y2ggY2hlY2tzIGFuZCBmb3JjZXMgdXNhZ2Ugb2YgdGhlIGludm9rZWQgQ0xJXG4gICAqIGluc3RlYWQgb2YgaW52b2tpbmcgdGhlIGxvY2FsIGluc3RhbGxlZCB2ZXJzaW9uLlxuICAgKi9cbiAgaWYgKGRpc2FibGVWZXJzaW9uQ2hlY2spIHtcbiAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGknKSkuZGVmYXVsdDtcbiAgfVxuXG4gIGxldCBjbGk7XG4gIGNvbnN0IHJhd0NvbW1hbmROYW1lID0gcHJvY2Vzcy5hcmd2WzJdO1xuXG4gIHRyeSB7XG4gICAgLy8gTm8gZXJyb3IgaW1wbGllcyBhIHByb2plY3RMb2NhbENsaSwgd2hpY2ggd2lsbCBsb2FkIHdoYXRldmVyXG4gICAgLy8gdmVyc2lvbiBvZiBuZy1jbGkgeW91IGhhdmUgaW5zdGFsbGVkIGluIGEgbG9jYWwgcGFja2FnZS5qc29uXG4gICAgY29uc3QgcHJvamVjdExvY2FsQ2xpID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci9jbGknLCB7IHBhdGhzOiBbcHJvY2Vzcy5jd2QoKV0gfSk7XG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KHByb2plY3RMb2NhbENsaSk7XG5cbiAgICBjb25zdCBnbG9iYWxWZXJzaW9uID0gbmV3IFNlbVZlcihWRVJTSU9OLmZ1bGwpO1xuXG4gICAgLy8gT2xkZXIgdmVyc2lvbnMgbWlnaHQgbm90IGhhdmUgdGhlIFZFUlNJT04gZXhwb3J0XG4gICAgbGV0IGxvY2FsVmVyc2lvbiA9IGNsaS5WRVJTSU9OPy5mdWxsO1xuICAgIGlmICghbG9jYWxWZXJzaW9uKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2NhbFBhY2thZ2VKc29uID0gYXdhaXQgZnMucmVhZEZpbGUoXG4gICAgICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShwcm9qZWN0TG9jYWxDbGkpLCAnLi4vLi4vcGFja2FnZS5qc29uJyksXG4gICAgICAgICAgJ3V0Zi04JyxcbiAgICAgICAgKTtcbiAgICAgICAgbG9jYWxWZXJzaW9uID0gKEpTT04ucGFyc2UobG9jYWxQYWNrYWdlSnNvbikgYXMgeyB2ZXJzaW9uOiBzdHJpbmcgfSkudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byByZXRyaWV2ZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVuc3VyZSBvbGRlciB2ZXJzaW9ucyBvZiB0aGUgQ0xJIGZ1bGx5IGV4aXRcbiAgICBpZiAobWFqb3IobG9jYWxWZXJzaW9uKSA8IDE0KSB7XG4gICAgICBmb3JjZUV4aXQgPSB0cnVlO1xuXG4gICAgICAvLyBWZXJzaW9ucyBwcmlvciB0byAxNCBkaWRuJ3QgaW1wbGVtZW50IGNvbXBsZXRpb24gY29tbWFuZC5cbiAgICAgIGlmIChyYXdDb21tYW5kTmFtZSA9PT0gJ2NvbXBsZXRpb24nKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpc0dsb2JhbEdyZWF0ZXIgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNHbG9iYWxHcmVhdGVyID0gISFsb2NhbFZlcnNpb24gJiYgZ2xvYmFsVmVyc2lvbi5jb21wYXJlKGxvY2FsVmVyc2lvbikgPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIGNvbXBhcmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBXaGVuIHVzaW5nIHRoZSBjb21wbGV0aW9uIGNvbW1hbmQsIGRvbid0IHNob3cgdGhlIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHRoaXMgd2lsbCBicmVhayBjb21wbGV0aW9uLlxuICAgIGlmIChpc0dsb2JhbEdyZWF0ZXIgJiYgcmF3Q29tbWFuZE5hbWUgIT09ICdjb21wbGV0aW9uJykge1xuICAgICAgLy8gSWYgdXNpbmcgdGhlIHVwZGF0ZSBjb21tYW5kIGFuZCB0aGUgZ2xvYmFsIHZlcnNpb24gaXMgZ3JlYXRlciwgdXNlIHRoZSBuZXdlciB1cGRhdGUgY29tbWFuZFxuICAgICAgLy8gVGhpcyBhbGxvd3MgaW1wcm92ZW1lbnRzIGluIHVwZGF0ZSB0byBiZSB1c2VkIGluIG9sZGVyIHZlcnNpb25zIHRoYXQgZG8gbm90IGhhdmUgYm9vdHN0cmFwcGluZ1xuICAgICAgaWYgKFxuICAgICAgICByYXdDb21tYW5kTmFtZSA9PT0gJ3VwZGF0ZScgJiZcbiAgICAgICAgY2xpLlZFUlNJT04gJiZcbiAgICAgICAgY2xpLlZFUlNJT04ubWFqb3IgLSBnbG9iYWxWZXJzaW9uLm1ham9yIDw9IDFcbiAgICAgICkge1xuICAgICAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGlzV2FybmluZ0VuYWJsZWQoJ3ZlcnNpb25NaXNtYXRjaCcpKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgdXNlIGxvY2FsIHZlcnNpb24gYW5kIHdhcm4gaWYgZ2xvYmFsIGlzIG5ld2VyIHRoYW4gbG9jYWxcbiAgICAgICAgY29uc3Qgd2FybmluZyA9XG4gICAgICAgICAgYFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsIGAgK1xuICAgICAgICAgIGB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxcblxcbmAgK1xuICAgICAgICAgICdUbyBkaXNhYmxlIHRoaXMgd2FybmluZyB1c2UgXCJuZyBjb25maWcgLWcgY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCBmYWxzZVwiLic7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29sb3JzLnllbGxvdyh3YXJuaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gICAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gICAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICB9XG5cbiAgaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbiAgfVxuXG4gIHJldHVybiBjbGk7XG59KSgpXG4gIC50aGVuKChjbGkpID0+XG4gICAgY2xpPy4oe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgIH0pLFxuICApXG4gIC50aGVuKChleGl0Q29kZSA9IDApID0+IHtcbiAgICBpZiAoZm9yY2VFeGl0KSB7XG4gICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19