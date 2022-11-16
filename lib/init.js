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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2xpYi9pbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLDJCQUFvQztBQUNwQyxtQ0FBdUM7QUFDdkMsMkNBQTZCO0FBQzdCLG1DQUF1QztBQUN2QyxrREFBZ0Q7QUFDaEQsb0RBQTJEO0FBQzNELDhFQUEyRTtBQUMzRSxzREFBbUQ7QUFFbkQ7Ozs7O0dBS0c7QUFDSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7QUFFdEIsQ0FBQyxLQUFLLElBQW9ELEVBQUU7O0lBQzFEOzs7OztPQUtHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxHQUFHLENBQUM7SUFDL0MsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2Qzs7Ozs7OztPQU9HO0lBQ0gsSUFBSSx5Q0FBbUIsSUFBSSxjQUFjLEtBQUssS0FBSyxFQUFFO1FBQ25ELE9BQU8sQ0FBQyx3REFBYSxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztLQUN4QztJQUVELElBQUksR0FBRyxDQUFDO0lBRVIsSUFBSTtRQUNGLCtEQUErRDtRQUMvRCwrREFBK0Q7UUFDL0QsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQkFBYSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN0RCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNELEdBQUcsR0FBRyx3REFBYSxlQUFlLEdBQUMsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGVBQU0sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFD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LFFBQVEsQ0FBQztBQUM5QixDQUFDLENBQUM7S0FDRCxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtJQUNwQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3RcbmltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBtYWpvciB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBkaXNhYmxlVmVyc2lvbkNoZWNrIH0gZnJvbSAnLi4vc3JjL3V0aWxpdGllcy9lbnZpcm9ubWVudC1vcHRpb25zJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi9zcmMvdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG4vKipcbiAqIEFuZ3VsYXIgQ0xJIHZlcnNpb25zIHByaW9yIHRvIHYxNCBtYXkgbm90IGV4aXQgY29ycmVjdGx5IGlmIG5vdCBmb3JjaWJseSBleGl0ZWRcbiAqIHZpYSBgcHJvY2Vzcy5leGl0KClgLiBXaGVuIGJvb3RzdHJhcHBpbmcsIGBmb3JjZUV4aXRgIHdpbGwgYmUgc2V0IHRvIGB0cnVlYFxuICogaWYgdGhlIGxvY2FsIENMSSB2ZXJzaW9uIGlzIGxlc3MgdGhhbiB2MTQgdG8gcHJldmVudCB0aGUgQ0xJIGZyb20gaGFuZ2luZyBvblxuICogZXhpdCBpbiB0aG9zZSBjYXNlcy5cbiAqL1xubGV0IGZvcmNlRXhpdCA9IGZhbHNlO1xuXG4oYXN5bmMgKCk6IFByb21pc2U8dHlwZW9mIGltcG9ydCgnLi9jbGknKS5kZWZhdWx0IHwgbnVsbD4gPT4ge1xuICAvKipcbiAgICogRGlzYWJsZSBCcm93c2Vyc2xpc3Qgb2xkIGRhdGEgd2FybmluZyBhcyBvdGhlcndpc2Ugd2l0aCBldmVyeSByZWxlYXNlIHdlJ2QgbmVlZCB0byB1cGRhdGUgdGhpcyBkZXBlbmRlbmN5XG4gICAqIHdoaWNoIGlzIGN1bWJlcnNvbWUgY29uc2lkZXJpbmcgd2UgcGluIHZlcnNpb25zIGFuZCB0aGUgd2FybmluZyBpcyBub3QgdXNlciBhY3Rpb25hYmxlLlxuICAgKiBgQnJvd3NlcnNsaXN0OiBjYW5pdXNlLWxpdGUgaXMgb3V0ZGF0ZWQuIFBsZWFzZSBydW4gbmV4dCBjb21tYW5kIGBucG0gdXBkYXRlYFxuICAgKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2Vyc2xpc3QvYnJvd3NlcnNsaXN0L2Jsb2IvODE5YzQzMzc0NTY5OTZkMTlkYjZiYTk1MzAxNDU3OTMyOWU5YzZlMS9ub2RlLmpzI0wzMjRcbiAgICovXG4gIHByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9JR05PUkVfT0xEX0RBVEEgPSAnMSc7XG4gIGNvbnN0IHJhd0NvbW1hbmROYW1lID0gcHJvY2Vzcy5hcmd2WzJdO1xuXG4gIC8qKlxuICAgKiBEaXNhYmxlIENMSSB2ZXJzaW9uIG1pc21hdGNoIGNoZWNrcyBhbmQgZm9yY2VzIHVzYWdlIG9mIHRoZSBpbnZva2VkIENMSVxuICAgKiBpbnN0ZWFkIG9mIGludm9raW5nIHRoZSBsb2NhbCBpbnN0YWxsZWQgdmVyc2lvbi5cbiAgICpcbiAgICogV2hlbiBydW5uaW5nIGBuZyBuZXdgIGFsd2F5cyBmYXZvciB0aGUgZ2xvYmFsIHZlcnNpb24uIEFzIGluIHNvbWVcbiAgICogY2FzZXMgb3JwaGFuIGBub2RlX21vZHVsZXNgIHdvdWxkIGNhdXNlIHRoZSBub24gZ2xvYmFsIENMSSB0byBiZSB1c2VkLlxuICAgKiBAc2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9pc3N1ZXMvMTQ2MDNcbiAgICovXG4gIGlmIChkaXNhYmxlVmVyc2lvbkNoZWNrIHx8IHJhd0NvbW1hbmROYW1lID09PSAnbmV3Jykge1xuICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaScpKS5kZWZhdWx0O1xuICB9XG5cbiAgbGV0IGNsaTtcblxuICB0cnkge1xuICAgIC8vIE5vIGVycm9yIGltcGxpZXMgYSBwcm9qZWN0TG9jYWxDbGksIHdoaWNoIHdpbGwgbG9hZCB3aGF0ZXZlclxuICAgIC8vIHZlcnNpb24gb2YgbmctY2xpIHlvdSBoYXZlIGluc3RhbGxlZCBpbiBhIGxvY2FsIHBhY2thZ2UuanNvblxuICAgIGNvbnN0IGN3ZFJlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKHByb2Nlc3MuY3dkKCkgKyAnLycpO1xuICAgIGNvbnN0IHByb2plY3RMb2NhbENsaSA9IGN3ZFJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY2xpJyk7XG4gICAgY2xpID0gYXdhaXQgaW1wb3J0KHByb2plY3RMb2NhbENsaSk7XG5cbiAgICBjb25zdCBnbG9iYWxWZXJzaW9uID0gbmV3IFNlbVZlcihWRVJTSU9OLmZ1bGwpO1xuXG4gICAgLy8gT2xkZXIgdmVyc2lvbnMgbWlnaHQgbm90IGhhdmUgdGhlIFZFUlNJT04gZXhwb3J0XG4gICAgbGV0IGxvY2FsVmVyc2lvbiA9IGNsaS5WRVJTSU9OPy5mdWxsO1xuICAgIGlmICghbG9jYWxWZXJzaW9uKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBsb2NhbFBhY2thZ2VKc29uID0gYXdhaXQgZnMucmVhZEZpbGUoXG4gICAgICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShwcm9qZWN0TG9jYWxDbGkpLCAnLi4vLi4vcGFja2FnZS5qc29uJyksXG4gICAgICAgICAgJ3V0Zi04JyxcbiAgICAgICAgKTtcbiAgICAgICAgbG9jYWxWZXJzaW9uID0gKEpTT04ucGFyc2UobG9jYWxQYWNrYWdlSnNvbikgYXMgeyB2ZXJzaW9uOiBzdHJpbmcgfSkudmVyc2lvbjtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKCdWZXJzaW9uIG1pc21hdGNoIGNoZWNrIHNraXBwZWQuIFVuYWJsZSB0byByZXRyaWV2ZSBsb2NhbCB2ZXJzaW9uOiAnICsgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVuc3VyZSBvbGRlciB2ZXJzaW9ucyBvZiB0aGUgQ0xJIGZ1bGx5IGV4aXRcbiAgICBpZiAobWFqb3IobG9jYWxWZXJzaW9uKSA8IDE0KSB7XG4gICAgICBmb3JjZUV4aXQgPSB0cnVlO1xuXG4gICAgICAvLyBWZXJzaW9ucyBwcmlvciB0byAxNCBkaWRuJ3QgaW1wbGVtZW50IGNvbXBsZXRpb24gY29tbWFuZC5cbiAgICAgIGlmIChyYXdDb21tYW5kTmFtZSA9PT0gJ2NvbXBsZXRpb24nKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpc0dsb2JhbEdyZWF0ZXIgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNHbG9iYWxHcmVhdGVyID0gISFsb2NhbFZlcnNpb24gJiYgZ2xvYmFsVmVyc2lvbi5jb21wYXJlKGxvY2FsVmVyc2lvbikgPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcnNpb24gbWlzbWF0Y2ggY2hlY2sgc2tpcHBlZC4gVW5hYmxlIHRvIGNvbXBhcmUgbG9jYWwgdmVyc2lvbjogJyArIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBXaGVuIHVzaW5nIHRoZSBjb21wbGV0aW9uIGNvbW1hbmQsIGRvbid0IHNob3cgdGhlIHdhcm5pbmcgYXMgb3RoZXJ3aXNlIHRoaXMgd2lsbCBicmVhayBjb21wbGV0aW9uLlxuICAgIGlmIChcbiAgICAgIGlzR2xvYmFsR3JlYXRlciAmJlxuICAgICAgcmF3Q29tbWFuZE5hbWUgIT09ICctLWdldC15YXJncy1jb21wbGV0aW9ucycgJiZcbiAgICAgIHJhd0NvbW1hbmROYW1lICE9PSAnY29tcGxldGlvbidcbiAgICApIHtcbiAgICAgIC8vIElmIHVzaW5nIHRoZSB1cGRhdGUgY29tbWFuZCBhbmQgdGhlIGdsb2JhbCB2ZXJzaW9uIGlzIGdyZWF0ZXIsIHVzZSB0aGUgbmV3ZXIgdXBkYXRlIGNvbW1hbmRcbiAgICAgIC8vIFRoaXMgYWxsb3dzIGltcHJvdmVtZW50cyBpbiB1cGRhdGUgdG8gYmUgdXNlZCBpbiBvbGRlciB2ZXJzaW9ucyB0aGF0IGRvIG5vdCBoYXZlIGJvb3RzdHJhcHBpbmdcbiAgICAgIGlmIChcbiAgICAgICAgcmF3Q29tbWFuZE5hbWUgPT09ICd1cGRhdGUnICYmXG4gICAgICAgIGNsaS5WRVJTSU9OICYmXG4gICAgICAgIGNsaS5WRVJTSU9OLm1ham9yIC0gZ2xvYmFsVmVyc2lvbi5tYWpvciA8PSAxXG4gICAgICApIHtcbiAgICAgICAgY2xpID0gYXdhaXQgaW1wb3J0KCcuL2NsaScpO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgICAgICAvLyBPdGhlcndpc2UsIHVzZSBsb2NhbCB2ZXJzaW9uIGFuZCB3YXJuIGlmIGdsb2JhbCBpcyBuZXdlciB0aGFuIGxvY2FsXG4gICAgICAgIGNvbnN0IHdhcm5pbmcgPVxuICAgICAgICAgIGBZb3VyIGdsb2JhbCBBbmd1bGFyIENMSSB2ZXJzaW9uICgke2dsb2JhbFZlcnNpb259KSBpcyBncmVhdGVyIHRoYW4geW91ciBsb2NhbCBgICtcbiAgICAgICAgICBgdmVyc2lvbiAoJHtsb2NhbFZlcnNpb259KS4gVGhlIGxvY2FsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgdXNlZC5cXG5cXG5gICtcbiAgICAgICAgICAnVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi4nO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmVycm9yKGNvbG9ycy55ZWxsb3cod2FybmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIHJlc29sdmUgY291bGQgbm90IGZpbmQgdGhlIG5nLWNsaVxuICAgIC8vIGxpYnJhcnkgZnJvbSBhIHBhY2thZ2UuanNvbi4gSW5zdGVhZCwgaW5jbHVkZSBpdCBmcm9tIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIHRvIHRoaXMgc2NyaXB0IGZpbGUgKHdoaWNoIGlzIGxpa2VseSBhIGdsb2JhbGx5IGluc3RhbGxlZFxuICAgIC8vIG5wbSBwYWNrYWdlKS4gTW9zdCBjb21tb24gY2F1c2UgZm9yIGhpdHRpbmcgdGhpcyBpcyBgbmcgbmV3YFxuICAgIGNsaSA9IGF3YWl0IGltcG9ydCgnLi9jbGknKTtcbiAgfVxuXG4gIGlmICgnZGVmYXVsdCcgaW4gY2xpKSB7XG4gICAgY2xpID0gY2xpWydkZWZhdWx0J107XG4gIH1cblxuICByZXR1cm4gY2xpO1xufSkoKVxuICAudGhlbigoY2xpKSA9PlxuICAgIGNsaT8uKHtcbiAgICAgIGNsaUFyZ3M6IHByb2Nlc3MuYXJndi5zbGljZSgyKSxcbiAgICB9KSxcbiAgKVxuICAudGhlbigoZXhpdENvZGUgPSAwKSA9PiB7XG4gICAgaWYgKGZvcmNlRXhpdCkge1xuICAgICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICB9KVxuICAuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIGVycm9yOiAnICsgZXJyLnRvU3RyaW5nKCkpO1xuICAgIHByb2Nlc3MuZXhpdCgxMjcpO1xuICB9KTtcbiJdfQ==