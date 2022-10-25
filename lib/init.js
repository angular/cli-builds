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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQywyQ0FBNkI7QUFDN0IsbUNBQXVDO0FBQ3ZDLGtEQUFnRDtBQUNoRCxvREFBMkQ7QUFDM0QsOEVBQTJFO0FBQzNFLHNEQUFtRDtBQUVuRDs7Ozs7R0FLRztBQUNILElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUV0QixDQUFDLEtBQUssSUFBb0QsRUFBRTs7SUFDMUQ7Ozs7O09BS0c7SUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLEdBQUcsQ0FBQztJQUUvQzs7O09BR0c7SUFDSCxJQUFJLHlDQUFtQixFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyx3REFBYSxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztLQUN4QztJQUVELElBQUksR0FBRyxDQUFDO0lBQ1IsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2QyxJQUFJO1FBQ0YsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixHQUFHLEdBQUcsd0RBQWEsZUFBZSxHQUFDLENBQUM7UUFFcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFNLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQyxtREFBbUQ7UUFDbkQsSUFBSSxZQUFZLEdBQUcsTUFBQSxHQUFHLENBQUMsT0FBTywwQ0FB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QUU7SUFDcEIsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgJ3N5bWJvbC1vYnNlcnZhYmxlJztcbi8vIHN5bWJvbCBwb2x5ZmlsbCBtdXN0IGdvIGZpcnN0XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTZW1WZXIsIG1ham9yIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvY29uZmlnJztcbmltcG9ydCB7IGRpc2FibGVWZXJzaW9uQ2hlY2sgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2Vudmlyb25tZW50LW9wdGlvbnMnO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gJy4uL3NyYy91dGlsaXRpZXMvdmVyc2lvbic7XG5cbi8qKlxuICogQW5ndWxhciBDTEkgdmVyc2lvbnMgcHJpb3IgdG8gdjE0IG1heSBub3QgZXhpdCBjb3JyZWN0bHkgaWYgbm90IGZvcmNpYmx5IGV4aXRlZFxuICogdmlhIGBwcm9jZXNzLmV4aXQoKWAuIFdoZW4gYm9vdHN0cmFwcGluZywgYGZvcmNlRXhpdGAgd2lsbCBiZSBzZXQgdG8gYHRydWVgXG4gKiBpZiB0aGUgbG9jYWwgQ0xJIHZlcnNpb24gaXMgbGVzcyB0aGFuIHYxNCB0byBwcmV2ZW50IHRoZSBDTEkgZnJvbSBoYW5naW5nIG9uXG4gKiBleGl0IGluIHRob3NlIGNhc2VzLlxuICovXG5sZXQgZm9yY2VFeGl0ID0gZmFsc2U7XG5cbihhc3luYyAoKTogUHJvbWlzZTx0eXBlb2YgaW1wb3J0KCcuL2NsaScpLmRlZmF1bHQgfCBudWxsPiA9PiB7XG4gIC8qKlxuICAgKiBEaXNhYmxlIEJyb3dzZXJzbGlzdCBvbGQgZGF0YSB3YXJuaW5nIGFzIG90aGVyd2lzZSB3aXRoIGV2ZXJ5IHJlbGVhc2Ugd2UnZCBuZWVkIHRvIHVwZGF0ZSB0aGlzIGRlcGVuZGVuY3lcbiAgICogd2hpY2ggaXMgY3VtYmVyc29tZSBjb25zaWRlcmluZyB3ZSBwaW4gdmVyc2lvbnMgYW5kIHRoZSB3YXJuaW5nIGlzIG5vdCB1c2VyIGFjdGlvbmFibGUuXG4gICAqIGBCcm93c2Vyc2xpc3Q6IGNhbml1c2UtbGl0ZSBpcyBvdXRkYXRlZC4gUGxlYXNlIHJ1biBuZXh0IGNvbW1hbmQgYG5wbSB1cGRhdGVgXG4gICAqIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJzbGlzdC9icm93c2Vyc2xpc3QvYmxvYi84MTljNDMzNzQ1Njk5NmQxOWRiNmJhOTUzMDE0NTc5MzI5ZTljNmUxL25vZGUuanMjTDMyNFxuICAgKi9cbiAgcHJvY2Vzcy5lbnYuQlJPV1NFUlNMSVNUX0lHTk9SRV9PTERfREFUQSA9ICcxJztcblxuICAvKipcbiAgICogRGlzYWJsZSBDTEkgdmVyc2lvbiBtaXNtYXRjaCBjaGVja3MgYW5kIGZvcmNlcyB1c2FnZSBvZiB0aGUgaW52b2tlZCBDTElcbiAgICogaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgbG9jYWwgaW5zdGFsbGVkIHZlcnNpb24uXG4gICAqL1xuICBpZiAoZGlzYWJsZVZlcnNpb25DaGVjaykge1xuICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaScpKS5kZWZhdWx0O1xuICB9XG5cbiAgbGV0IGNsaTtcbiAgY29uc3QgcmF3Q29tbWFuZE5hbWUgPSBwcm9jZXNzLmFyZ3ZbMl07XG5cbiAgdHJ5IHtcbiAgICAvLyBObyBlcnJvciBpbXBsaWVzIGEgcHJvamVjdExvY2FsQ2xpLCB3aGljaCB3aWxsIGxvYWQgd2hhdGV2ZXJcbiAgICAvLyB2ZXJzaW9uIG9mIG5nLWNsaSB5b3UgaGF2ZSBpbnN0YWxsZWQgaW4gYSBsb2NhbCBwYWNrYWdlLmpzb25cbiAgICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NsaScsIHsgcGF0aHM6IFtwcm9jZXNzLmN3ZCgpXSB9KTtcbiAgICBjbGkgPSBhd2FpdCBpbXBvcnQocHJvamVjdExvY2FsQ2xpKTtcblxuICAgIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKFZFUlNJT04uZnVsbCk7XG5cbiAgICAvLyBPbGRlciB2ZXJzaW9ucyBtaWdodCBub3QgaGF2ZSB0aGUgVkVSU0lPTiBleHBvcnRcbiAgICBsZXQgbG9jYWxWZXJzaW9uID0gY2xpLlZFUlNJT04/LmZ1bGw7XG4gICAgaWYgKCFsb2NhbFZlcnNpb24pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxvY2FsUGFja2FnZUpzb24gPSBhd2FpdCBmcy5yZWFkRmlsZShcbiAgICAgICAgICBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHByb2plY3RMb2NhbENsaSksICcuLi8uLi9wYWNrYWdlLmpzb24nKSxcbiAgICAgICAgICAndXRmLTgnLFxuICAgICAgICApO1xuICAgICAgICBsb2NhbFZlcnNpb24gPSAoSlNPTi5wYXJzZShsb2NhbFBhY2thZ2VKc29uKSBhcyB7IHZlcnNpb246IHN0cmluZyB9KS52ZXJzaW9uO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIHJldHJpZXZlIGxvY2FsIHZlcnNpb246ICcgKyBlcnJvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIG9sZGVyIHZlcnNpb25zIG9mIHRoZSBDTEkgZnVsbHkgZXhpdFxuICAgIGlmIChtYWpvcihsb2NhbFZlcnNpb24pIDwgMTQpIHtcbiAgICAgIGZvcmNlRXhpdCA9IHRydWU7XG5cbiAgICAgIC8vIFZlcnNpb25zIHByaW9yIHRvIDE0IGRpZG4ndCBpbXBsZW1lbnQgY29tcGxldGlvbiBjb21tYW5kLlxuICAgICAgaWYgKHJhd0NvbW1hbmROYW1lID09PSAnY29tcGxldGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGlzR2xvYmFsR3JlYXRlciA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc0dsb2JhbEdyZWF0ZXIgPSAhIWxvY2FsVmVyc2lvbiAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcignVmVyc2lvbiBtaXNtYXRjaCBjaGVjayBza2lwcGVkLiBVbmFibGUgdG8gY29tcGFyZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIFdoZW4gdXNpbmcgdGhlIGNvbXBsZXRpb24gY29tbWFuZCwgZG9uJ3Qgc2hvdyB0aGUgd2FybmluZyBhcyBvdGhlcndpc2UgdGhpcyB3aWxsIGJyZWFrIGNvbXBsZXRpb24uXG4gICAgaWYgKFxuICAgICAgaXNHbG9iYWxHcmVhdGVyICYmXG4gICAgICByYXdDb21tYW5kTmFtZSAhPT0gJy0tZ2V0LXlhcmdzLWNvbXBsZXRpb25zJyAmJlxuICAgICAgcmF3Q29tbWFuZE5hbWUgIT09ICdjb21wbGV0aW9uJ1xuICAgICkge1xuICAgICAgLy8gSWYgdXNpbmcgdGhlIHVwZGF0ZSBjb21tYW5kIGFuZCB0aGUgZ2xvYmFsIHZlcnNpb24gaXMgZ3JlYXRlciwgdXNlIHRoZSBuZXdlciB1cGRhdGUgY29tbWFuZFxuICAgICAgLy8gVGhpcyBhbGxvd3MgaW1wcm92ZW1lbnRzIGluIHVwZGF0ZSB0byBiZSB1c2VkIGluIG9sZGVyIHZlcnNpb25zIHRoYXQgZG8gbm90IGhhdmUgYm9vdHN0cmFwcGluZ1xuICAgICAgaWYgKFxuICAgICAgICByYXdDb21tYW5kTmFtZSA9PT0gJ3VwZGF0ZScgJiZcbiAgICAgICAgY2xpLlZFUlNJT04gJiZcbiAgICAgICAgY2xpLlZFUlNJT04ubWFqb3IgLSBnbG9iYWxWZXJzaW9uLm1ham9yIDw9IDFcbiAgICAgICkge1xuICAgICAgICBjbGkgPSBhd2FpdCBpbXBvcnQoJy4vY2xpJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGlzV2FybmluZ0VuYWJsZWQoJ3ZlcnNpb25NaXNtYXRjaCcpKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSwgdXNlIGxvY2FsIHZlcnNpb24gYW5kIHdhcm4gaWYgZ2xvYmFsIGlzIG5ld2VyIHRoYW4gbG9jYWxcbiAgICAgICAgY29uc3Qgd2FybmluZyA9XG4gICAgICAgICAgYFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsIGAgK1xuICAgICAgICAgIGB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxcblxcbmAgK1xuICAgICAgICAgICdUbyBkaXNhYmxlIHRoaXMgd2FybmluZyB1c2UgXCJuZyBjb25maWcgLWcgY2xpLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCBmYWxzZVwiLic7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29sb3JzLnllbGxvdyh3YXJuaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gICAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gICAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICB9XG5cbiAgaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbiAgfVxuXG4gIHJldHVybiBjbGk7XG59KSgpXG4gIC50aGVuKChjbGkpID0+XG4gICAgY2xpPy4oe1xuICAgICAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICAgIH0pLFxuICApXG4gIC50aGVuKChleGl0Q29kZSA9IDApID0+IHtcbiAgICBpZiAoZm9yY2VFeGl0KSB7XG4gICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19