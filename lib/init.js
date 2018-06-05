"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
require("symbol-observable");
// symbol polyfill must go first
// tslint:disable-next-line:ordered-imports import-groups
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const fs = require("fs");
const path = require("path");
const semver_1 = require("semver");
const config_1 = require("../utilities/config");
const packageJson = require('../package.json');
function _fromPackageJson(cwd) {
    cwd = cwd || process.cwd();
    do {
        const packageJsonPath = path.join(cwd, 'node_modules/@angular/cli/package.json');
        if (fs.existsSync(packageJsonPath)) {
            const content = fs.readFileSync(packageJsonPath, 'utf-8');
            if (content) {
                const json = JSON.parse(content);
                if (json['version']) {
                    return new semver_1.SemVer(json['version']);
                }
            }
        }
        // Check the parent.
        cwd = path.dirname(cwd);
    } while (cwd != path.dirname(cwd));
    return null;
}
// Check if we need to profile this CLI run.
if (process.env['NG_CLI_PROFILING']) {
    const profiler = require('v8-profiler'); // tslint:disable-line:no-implicit-dependencies
    profiler.startProfiling();
    const exitHandler = (options) => {
        if (options.cleanup) {
            const cpuProfile = profiler.stopProfiling();
            fs.writeFileSync(path.resolve(process.cwd(), process.env.NG_CLI_PROFILING || '') + '.cpuprofile', JSON.stringify(cpuProfile));
        }
        if (options.exit) {
            process.exit();
        }
    };
    process.on('exit', () => exitHandler({ cleanup: true }));
    process.on('SIGINT', () => exitHandler({ exit: true }));
    process.on('uncaughtException', () => exitHandler({ exit: true }));
}
let cli;
try {
    const projectLocalCli = node_1.resolve('@angular/cli', {
        checkGlobal: false,
        basedir: process.cwd(),
        preserveSymlinks: true,
    });
    // This was run from a global, check local version.
    const globalVersion = new semver_1.SemVer(packageJson['version']);
    let localVersion;
    let shouldWarn = false;
    try {
        localVersion = _fromPackageJson();
        shouldWarn = localVersion != null && globalVersion.compare(localVersion) > 0;
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        shouldWarn = true;
    }
    if (shouldWarn && config_1.isWarningEnabled('versionMismatch')) {
        const warning = core_1.terminal.yellow(core_1.tags.stripIndents `
    Your global Angular CLI version (${globalVersion}) is greater than your local
    version (${localVersion}). The local Angular CLI version is used.

    To disable this warning use "ng config -g cli.warnings.versionMismatch false".
    `);
        // Don't show warning colorised on `ng completion`
        if (process.argv[2] !== 'completion') {
            // eslint-disable-next-line no-console
            console.log(warning);
        }
        else {
            // eslint-disable-next-line no-console
            console.error(warning);
            process.exit(1);
        }
    }
    // No error implies a projectLocalCli, which will load whatever
    // version of ng-cli you have installed in a local package.json
    cli = require(projectLocalCli);
}
catch (_a) {
    // If there is an error, resolve could not find the ng-cli
    // library from a package.json. Instead, include it from a relative
    // path to this script file (which is likely a globally installed
    // npm package). Most common cause for hitting this is `ng new`
    cli = require('./cli');
}
if ('default' in cli) {
    cli = cli['default'];
}
cli({ cliArgs: process.argv.slice(2) })
    .then((exitCode) => {
    process.exit(exitCode);
})
    .catch((err) => {
    console.log('Unknown error: ' + err.toString());
    process.exit(127);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvbGliL2luaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLHlEQUF5RDtBQUN6RCwrQ0FBc0Q7QUFDdEQsb0RBQW9EO0FBQ3BELHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLGdEQUF1RDtBQUV2RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUUvQywwQkFBMEIsR0FBWTtJQUNwQyxHQUFHLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUUzQixHQUFHLENBQUM7UUFDRixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ2pGLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzFELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDakMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEIsTUFBTSxDQUFDLElBQUksZUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxvQkFBb0I7UUFDcEIsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUIs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Ii8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuLy8gc3ltYm9sIHBvbHlmaWxsIG11c3QgZ28gZmlyc3Rcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpvcmRlcmVkLWltcG9ydHMgaW1wb3J0LWdyb3Vwc1xuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcblxuZnVuY3Rpb24gX2Zyb21QYWNrYWdlSnNvbihjd2Q/OiBzdHJpbmcpIHtcbiAgY3dkID0gY3dkIHx8IHByb2Nlc3MuY3dkKCk7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihjd2QsICdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpL3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBpZiAoanNvblsndmVyc2lvbiddKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBTZW1WZXIoanNvblsndmVyc2lvbiddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHRoZSBwYXJlbnQuXG4gICAgY3dkID0gcGF0aC5kaXJuYW1lKGN3ZCk7XG4gIH0gd2hpbGUgKGN3ZCAhPSBwYXRoLmRpcm5hbWUoY3dkKSk7XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cblxuLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBwcm9maWxlIHRoaXMgQ0xJIHJ1bi5cbmlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX1BST0ZJTElORyddKSB7XG4gIGNvbnN0IHByb2ZpbGVyID0gcmVxdWlyZSgndjgtcHJvZmlsZXInKTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbiAgcHJvZmlsZXIuc3RhcnRQcm9maWxpbmcoKTtcbiAgY29uc3QgZXhpdEhhbmRsZXIgPSAob3B0aW9uczogeyBjbGVhbnVwPzogYm9vbGVhbiwgZXhpdD86IGJvb2xlYW4gfSkgPT4ge1xuICAgIGlmIChvcHRpb25zLmNsZWFudXApIHtcbiAgICAgIGNvbnN0IGNwdVByb2ZpbGUgPSBwcm9maWxlci5zdG9wUHJvZmlsaW5nKCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKFxuICAgICAgICBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcHJvY2Vzcy5lbnYuTkdfQ0xJX1BST0ZJTElORyB8fCAnJykgKyAnLmNwdXByb2ZpbGUnLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShjcHVQcm9maWxlKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZXhpdCkge1xuICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfVxuICB9O1xuXG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiBleGl0SGFuZGxlcih7IGNsZWFudXA6IHRydWUgfSkpO1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBleGl0SGFuZGxlcih7IGV4aXQ6IHRydWUgfSkpO1xuICBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsICgpID0+IGV4aXRIYW5kbGVyKHsgZXhpdDogdHJ1ZSB9KSk7XG59XG5cbmxldCBjbGk7XG50cnkge1xuICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSByZXNvbHZlKFxuICAgICdAYW5ndWxhci9jbGknLFxuICAgIHtcbiAgICAgIGNoZWNrR2xvYmFsOiBmYWxzZSxcbiAgICAgIGJhc2VkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlLFxuICAgIH0sXG4gICk7XG5cbiAgLy8gVGhpcyB3YXMgcnVuIGZyb20gYSBnbG9iYWwsIGNoZWNrIGxvY2FsIHZlcnNpb24uXG4gIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKHBhY2thZ2VKc29uWyd2ZXJzaW9uJ10pO1xuICBsZXQgbG9jYWxWZXJzaW9uO1xuICBsZXQgc2hvdWxkV2FybiA9IGZhbHNlO1xuXG4gIHRyeSB7XG4gICAgbG9jYWxWZXJzaW9uID0gX2Zyb21QYWNrYWdlSnNvbigpO1xuICAgIHNob3VsZFdhcm4gPSBsb2NhbFZlcnNpb24gIT0gbnVsbCAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgc2hvdWxkV2FybiA9IHRydWU7XG4gIH1cblxuICBpZiAoc2hvdWxkV2FybiAmJiBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgIGNvbnN0IHdhcm5pbmcgPSB0ZXJtaW5hbC55ZWxsb3codGFncy5zdHJpcEluZGVudHNgXG4gICAgWW91ciBnbG9iYWwgQW5ndWxhciBDTEkgdmVyc2lvbiAoJHtnbG9iYWxWZXJzaW9ufSkgaXMgZ3JlYXRlciB0aGFuIHlvdXIgbG9jYWxcbiAgICB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxuXG4gICAgVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi5cbiAgICBgKTtcbiAgICAvLyBEb24ndCBzaG93IHdhcm5pbmcgY29sb3Jpc2VkIG9uIGBuZyBjb21wbGV0aW9uYFxuICAgIGlmIChwcm9jZXNzLmFyZ3ZbMl0gIT09ICdjb21wbGV0aW9uJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2cod2FybmluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3Iod2FybmluZyk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTm8gZXJyb3IgaW1wbGllcyBhIHByb2plY3RMb2NhbENsaSwgd2hpY2ggd2lsbCBsb2FkIHdoYXRldmVyXG4gIC8vIHZlcnNpb24gb2YgbmctY2xpIHlvdSBoYXZlIGluc3RhbGxlZCBpbiBhIGxvY2FsIHBhY2thZ2UuanNvblxuICBjbGkgPSByZXF1aXJlKHByb2plY3RMb2NhbENsaSk7XG59IGNhdGNoIHtcbiAgLy8gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIHJlc29sdmUgY291bGQgbm90IGZpbmQgdGhlIG5nLWNsaVxuICAvLyBsaWJyYXJ5IGZyb20gYSBwYWNrYWdlLmpzb24uIEluc3RlYWQsIGluY2x1ZGUgaXQgZnJvbSBhIHJlbGF0aXZlXG4gIC8vIHBhdGggdG8gdGhpcyBzY3JpcHQgZmlsZSAod2hpY2ggaXMgbGlrZWx5IGEgZ2xvYmFsbHkgaW5zdGFsbGVkXG4gIC8vIG5wbSBwYWNrYWdlKS4gTW9zdCBjb21tb24gY2F1c2UgZm9yIGhpdHRpbmcgdGhpcyBpcyBgbmcgbmV3YFxuICBjbGkgPSByZXF1aXJlKCcuL2NsaScpO1xufVxuXG5pZiAoJ2RlZmF1bHQnIGluIGNsaSkge1xuICBjbGkgPSBjbGlbJ2RlZmF1bHQnXTtcbn1cblxuY2xpKHsgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpIH0pXG4gIC50aGVuKChleGl0Q29kZTogbnVtYmVyKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgfSlcbiAgLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ1Vua25vd24gZXJyb3I6ICcgKyBlcnIudG9TdHJpbmcoKSk7XG4gICAgcHJvY2Vzcy5leGl0KDEyNyk7XG4gIH0pO1xuIl19