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
const isWarningEnabled = require('../utilities/config').isWarningEnabled;
const fs = require('fs');
const packageJson = require('../package.json');
const path = require('path');
const stripIndents = require('@angular-devkit/core').tags.stripIndents;
const yellow = require('@angular-devkit/core').terminal.yellow;
const SemVer = require('semver').SemVer;
function _fromPackageJson(cwd) {
    cwd = cwd || process.cwd();
    do {
        const packageJsonPath = path.join(cwd, 'node_modules/@angular/cli/package.json');
        if (fs.existsSync(packageJsonPath)) {
            const content = fs.readFileSync(packageJsonPath, 'utf-8');
            if (content) {
                const json = JSON.parse(content);
                if (json['version']) {
                    return new SemVer(json['version']);
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
            fs.writeFileSync(path.resolve(process.cwd(), process.env.NG_CLI_PROFILING) + '.cpuprofile', JSON.stringify(cpuProfile));
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
    const projectLocalCli = require.resolve('@angular/cli', { paths: [process.cwd()] });
    // This was run from a global, check local version.
    const globalVersion = new SemVer(packageJson['version']);
    let localVersion;
    let shouldWarn = false;
    try {
        localVersion = _fromPackageJson();
        shouldWarn = localVersion && globalVersion.compare(localVersion) > 0;
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        shouldWarn = true;
    }
    if (shouldWarn && isWarningEnabled('versionMismatch')) {
        const warning = yellow(stripIndents `
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvbGliL2luaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCw2QkFBMkI7QUFDM0IsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUV6RSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDL0MsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7QUFDdkUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztBQUMvRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBRXhDLDBCQUEwQixHQUFZO0lBQ3BDLEdBQUcsR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRTNCLEdBQUcsQ0FBQztRQUNGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7UUFDakYsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDMUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FB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QUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO0lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAnc3ltYm9sLW9ic2VydmFibGUnO1xuY29uc3QgaXNXYXJuaW5nRW5hYmxlZCA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9jb25maWcnKS5pc1dhcm5pbmdFbmFibGVkO1xuXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IHN0cmlwSW5kZW50cyA9IHJlcXVpcmUoJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJykudGFncy5zdHJpcEluZGVudHM7XG5jb25zdCB5ZWxsb3cgPSByZXF1aXJlKCdAYW5ndWxhci1kZXZraXQvY29yZScpLnRlcm1pbmFsLnllbGxvdztcbmNvbnN0IFNlbVZlciA9IHJlcXVpcmUoJ3NlbXZlcicpLlNlbVZlcjtcblxuZnVuY3Rpb24gX2Zyb21QYWNrYWdlSnNvbihjd2Q/OiBzdHJpbmcpIHtcbiAgY3dkID0gY3dkIHx8IHByb2Nlc3MuY3dkKCk7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihjd2QsICdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpL3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBpZiAoanNvblsndmVyc2lvbiddKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBTZW1WZXIoanNvblsndmVyc2lvbiddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHRoZSBwYXJlbnQuXG4gICAgY3dkID0gcGF0aC5kaXJuYW1lKGN3ZCk7XG4gIH0gd2hpbGUgKGN3ZCAhPSBwYXRoLmRpcm5hbWUoY3dkKSk7XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cblxuLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBwcm9maWxlIHRoaXMgQ0xJIHJ1bi5cbmlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX1BST0ZJTElORyddKSB7XG4gIGNvbnN0IHByb2ZpbGVyID0gcmVxdWlyZSgndjgtcHJvZmlsZXInKTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbiAgcHJvZmlsZXIuc3RhcnRQcm9maWxpbmcoKTtcbiAgY29uc3QgZXhpdEhhbmRsZXIgPSAob3B0aW9uczogeyBjbGVhbnVwPzogYm9vbGVhbiwgZXhpdD86IGJvb2xlYW4gfSkgPT4ge1xuICAgIGlmIChvcHRpb25zLmNsZWFudXApIHtcbiAgICAgIGNvbnN0IGNwdVByb2ZpbGUgPSBwcm9maWxlci5zdG9wUHJvZmlsaW5nKCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBwcm9jZXNzLmVudi5OR19DTElfUFJPRklMSU5HKSArICcuY3B1cHJvZmlsZScsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KGNwdVByb2ZpbGUpKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5leGl0KSB7XG4gICAgICBwcm9jZXNzLmV4aXQoKTtcbiAgICB9XG4gIH07XG5cbiAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IGV4aXRIYW5kbGVyKHsgY2xlYW51cDogdHJ1ZSB9KSk7XG4gIHByb2Nlc3Mub24oJ1NJR0lOVCcsICgpID0+IGV4aXRIYW5kbGVyKHsgZXhpdDogdHJ1ZSB9KSk7XG4gIHByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKCkgPT4gZXhpdEhhbmRsZXIoeyBleGl0OiB0cnVlIH0pKTtcbn1cblxubGV0IGNsaTtcbnRyeSB7XG4gIGNvbnN0IHByb2plY3RMb2NhbENsaSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY2xpJywgeyBwYXRoczogWyBwcm9jZXNzLmN3ZCgpIF19KTtcblxuICAvLyBUaGlzIHdhcyBydW4gZnJvbSBhIGdsb2JhbCwgY2hlY2sgbG9jYWwgdmVyc2lvbi5cbiAgY29uc3QgZ2xvYmFsVmVyc2lvbiA9IG5ldyBTZW1WZXIocGFja2FnZUpzb25bJ3ZlcnNpb24nXSk7XG4gIGxldCBsb2NhbFZlcnNpb247XG4gIGxldCBzaG91bGRXYXJuID0gZmFsc2U7XG5cbiAgdHJ5IHtcbiAgICBsb2NhbFZlcnNpb24gPSBfZnJvbVBhY2thZ2VKc29uKCk7XG4gICAgc2hvdWxkV2FybiA9IGxvY2FsVmVyc2lvbiAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgc2hvdWxkV2FybiA9IHRydWU7XG4gIH1cblxuICBpZiAoc2hvdWxkV2FybiAmJiBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgIGNvbnN0IHdhcm5pbmcgPSB5ZWxsb3coc3RyaXBJbmRlbnRzYFxuICAgIFlvdXIgZ2xvYmFsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gKCR7Z2xvYmFsVmVyc2lvbn0pIGlzIGdyZWF0ZXIgdGhhbiB5b3VyIGxvY2FsXG4gICAgdmVyc2lvbiAoJHtsb2NhbFZlcnNpb259KS4gVGhlIGxvY2FsIEFuZ3VsYXIgQ0xJIHZlcnNpb24gaXMgdXNlZC5cblxuICAgIFRvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHVzZSBcIm5nIGNvbmZpZyAtZyBjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoIGZhbHNlXCIuXG4gICAgYCk7XG4gICAgLy8gRG9uJ3Qgc2hvdyB3YXJuaW5nIGNvbG9yaXNlZCBvbiBgbmcgY29tcGxldGlvbmBcbiAgICBpZiAocHJvY2Vzcy5hcmd2WzJdICE9PSAnY29tcGxldGlvbicpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHdhcm5pbmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKHdhcm5pbmcpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vIGVycm9yIGltcGxpZXMgYSBwcm9qZWN0TG9jYWxDbGksIHdoaWNoIHdpbGwgbG9hZCB3aGF0ZXZlclxuICAvLyB2ZXJzaW9uIG9mIG5nLWNsaSB5b3UgaGF2ZSBpbnN0YWxsZWQgaW4gYSBsb2NhbCBwYWNrYWdlLmpzb25cbiAgY2xpID0gcmVxdWlyZShwcm9qZWN0TG9jYWxDbGkpO1xufSBjYXRjaCB7XG4gIC8vIElmIHRoZXJlIGlzIGFuIGVycm9yLCByZXNvbHZlIGNvdWxkIG5vdCBmaW5kIHRoZSBuZy1jbGlcbiAgLy8gbGlicmFyeSBmcm9tIGEgcGFja2FnZS5qc29uLiBJbnN0ZWFkLCBpbmNsdWRlIGl0IGZyb20gYSByZWxhdGl2ZVxuICAvLyBwYXRoIHRvIHRoaXMgc2NyaXB0IGZpbGUgKHdoaWNoIGlzIGxpa2VseSBhIGdsb2JhbGx5IGluc3RhbGxlZFxuICAvLyBucG0gcGFja2FnZSkuIE1vc3QgY29tbW9uIGNhdXNlIGZvciBoaXR0aW5nIHRoaXMgaXMgYG5nIG5ld2BcbiAgY2xpID0gcmVxdWlyZSgnLi9jbGknKTtcbn1cblxuaWYgKCdkZWZhdWx0JyBpbiBjbGkpIHtcbiAgY2xpID0gY2xpWydkZWZhdWx0J107XG59XG5cbmNsaSh7IGNsaUFyZ3M6IHByb2Nlc3MuYXJndi5zbGljZSgyKSB9KVxuICAudGhlbigoZXhpdENvZGU6IG51bWJlcikgPT4ge1xuICAgIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG4gIH0pXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdVbmtub3duIGVycm9yOiAnICsgZXJyLnRvU3RyaW5nKCkpO1xuICAgIHByb2Nlc3MuZXhpdCgxMjcpO1xuICB9KTtcbiJdfQ==