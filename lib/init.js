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
const stream_1 = require("stream");
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
            console.error(warning);
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
// This is required to support 1.x local versions with a 6+ global
let standardInput;
try {
    standardInput = process.stdin;
}
catch (e) {
    delete process.stdin;
    process.stdin = new stream_1.Duplex();
    standardInput = process.stdin;
}
cli({
    cliArgs: process.argv.slice(2),
    inputStream: standardInput,
    outputStream: process.stdout,
})
    .then((exitCode) => {
    process.exit(exitCode);
})
    .catch((err) => {
    console.error('Unknown error: ' + err.toString());
    process.exit(127);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvbGliL2luaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCw2QkFBMkI7QUFDM0IsZ0NBQWdDO0FBQ2hDLHlEQUF5RDtBQUN6RCwrQ0FBc0Q7QUFDdEQsb0RBQW9EO0FBQ3BELHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLG1DQUFnQztBQUNoQyxnREFBdUQ7QUFFdkQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFFL0MsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFZO0lBQ3BDLEdBQUcsR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRTNCLEdBQUc7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ2pGLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUNsQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxRCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDbkIsT0FBTyxJQUFJLGVBQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztpQkFDcEM7YUFDRjtTQUNGO1FBRUQsb0JBQW9CO1FBQ3BCLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFFbkMsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBR0QsNENBQTRDO0FBQzVDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO0lBQ25DLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLCtDQUErQztJQUN4RixRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDMUIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUE4QyxFQUFFLEVBQUU7UUFDckUsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ25CLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM1QyxFQUFFLENBQUMsYUFBYSxDQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLEdBQUcsYUFBYSxFQUMvRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUMzQixDQUFDO1NBQ0g7UUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztDQUNwRTtBQUVELElBQUksR0FBRyxDQUFDO0FBQ1IsSUFBSTtJQUNGLE1BQU0sZUFBZSxHQUFHLGNBQU8sQ0FDN0IsY0FBYyxFQUNkO1FBQ0UsV0FBVyxFQUFFLEtBQUs7UUFDbEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtLQUN2QixDQUNGLENBQUM7SUFFRixtREFBbUQ7SUFDbkQsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDekQsSUFBSSxZQUFZLENBQUM7SUFDakIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBRXZCLElBQUk7UUFDRixZQUFZLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyxVQUFVLEdBQUcsWUFBWSxJQUFJLElBQUksSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUM5RTtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1Ysc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsVUFBVSxHQUFHLElBQUksQ0FBQztLQUNuQjtJQUVELElBQUksVUFBVSxJQUFJLHlCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUU7UUFDckQsTUFBTSxPQUFPLEdBQUcsZUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFJLENBQUMsWUFBWSxDQUFBO3VDQUNkLGFBQWE7ZUFDckMsWUFBWTs7O0tBR3RCLENBQUMsQ0FBQztRQUNILGtEQUFrRDtRQUNsRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSxFQUFFO1lBQ2xDLHNDQUFzQztZQUN4QyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3hCO2FBQU07WUFDSCxzQ0FBc0M7WUFDeEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO0tBQ0Y7SUFFRCwrREFBK0Q7SUFDL0QsK0RBQStEO0lBQy9ELEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7Q0FDaEM7QUFBQyxXQUFNO0lBQ04sMERBQTBEO0lBQzFELG1FQUFtRTtJQUNuRSxpRUFBaUU7SUFDakUsK0RBQStEO0lBQy9ELEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDeEI7QUFFRCxJQUFJLFNBQVMsSUFBSSxHQUFHLEVBQUU7SUFDcEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUN0QjtBQUVELGtFQUFrRTtBQUNsRSxJQUFJLGFBQWEsQ0FBQztBQUNsQixJQUFJO0lBQ0YsYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7Q0FDL0I7QUFBQyxPQUFPLENBQUMsRUFBRTtJQUNWLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQztJQUNyQixPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7SUFDN0IsYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7Q0FDL0I7QUFFRCxHQUFHLENBQUM7SUFDRixPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzlCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFlBQVksRUFBRSxPQUFPLENBQUMsTUFBTTtDQUM3QixDQUFDO0tBQ0MsSUFBSSxDQUFDLENBQUMsUUFBZ0IsRUFBRSxFQUFFO0lBQ3pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDO0tBQ0QsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7SUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICdzeW1ib2wtb2JzZXJ2YWJsZSc7XG4vLyBzeW1ib2wgcG9seWZpbGwgbXVzdCBnbyBmaXJzdFxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm9yZGVyZWQtaW1wb3J0cyBpbXBvcnQtZ3JvdXBzXG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTZW1WZXIgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgRHVwbGV4IH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7IGlzV2FybmluZ0VuYWJsZWQgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcblxuZnVuY3Rpb24gX2Zyb21QYWNrYWdlSnNvbihjd2Q/OiBzdHJpbmcpIHtcbiAgY3dkID0gY3dkIHx8IHByb2Nlc3MuY3dkKCk7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihjd2QsICdub2RlX21vZHVsZXMvQGFuZ3VsYXIvY2xpL3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICBpZiAoanNvblsndmVyc2lvbiddKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBTZW1WZXIoanNvblsndmVyc2lvbiddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHRoZSBwYXJlbnQuXG4gICAgY3dkID0gcGF0aC5kaXJuYW1lKGN3ZCk7XG4gIH0gd2hpbGUgKGN3ZCAhPSBwYXRoLmRpcm5hbWUoY3dkKSk7XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cblxuLy8gQ2hlY2sgaWYgd2UgbmVlZCB0byBwcm9maWxlIHRoaXMgQ0xJIHJ1bi5cbmlmIChwcm9jZXNzLmVudlsnTkdfQ0xJX1BST0ZJTElORyddKSB7XG4gIGNvbnN0IHByb2ZpbGVyID0gcmVxdWlyZSgndjgtcHJvZmlsZXInKTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbiAgcHJvZmlsZXIuc3RhcnRQcm9maWxpbmcoKTtcbiAgY29uc3QgZXhpdEhhbmRsZXIgPSAob3B0aW9uczogeyBjbGVhbnVwPzogYm9vbGVhbiwgZXhpdD86IGJvb2xlYW4gfSkgPT4ge1xuICAgIGlmIChvcHRpb25zLmNsZWFudXApIHtcbiAgICAgIGNvbnN0IGNwdVByb2ZpbGUgPSBwcm9maWxlci5zdG9wUHJvZmlsaW5nKCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKFxuICAgICAgICBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcHJvY2Vzcy5lbnYuTkdfQ0xJX1BST0ZJTElORyB8fCAnJykgKyAnLmNwdXByb2ZpbGUnLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShjcHVQcm9maWxlKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZXhpdCkge1xuICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfVxuICB9O1xuXG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiBleGl0SGFuZGxlcih7IGNsZWFudXA6IHRydWUgfSkpO1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBleGl0SGFuZGxlcih7IGV4aXQ6IHRydWUgfSkpO1xuICBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsICgpID0+IGV4aXRIYW5kbGVyKHsgZXhpdDogdHJ1ZSB9KSk7XG59XG5cbmxldCBjbGk7XG50cnkge1xuICBjb25zdCBwcm9qZWN0TG9jYWxDbGkgPSByZXNvbHZlKFxuICAgICdAYW5ndWxhci9jbGknLFxuICAgIHtcbiAgICAgIGNoZWNrR2xvYmFsOiBmYWxzZSxcbiAgICAgIGJhc2VkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlLFxuICAgIH0sXG4gICk7XG5cbiAgLy8gVGhpcyB3YXMgcnVuIGZyb20gYSBnbG9iYWwsIGNoZWNrIGxvY2FsIHZlcnNpb24uXG4gIGNvbnN0IGdsb2JhbFZlcnNpb24gPSBuZXcgU2VtVmVyKHBhY2thZ2VKc29uWyd2ZXJzaW9uJ10pO1xuICBsZXQgbG9jYWxWZXJzaW9uO1xuICBsZXQgc2hvdWxkV2FybiA9IGZhbHNlO1xuXG4gIHRyeSB7XG4gICAgbG9jYWxWZXJzaW9uID0gX2Zyb21QYWNrYWdlSnNvbigpO1xuICAgIHNob3VsZFdhcm4gPSBsb2NhbFZlcnNpb24gIT0gbnVsbCAmJiBnbG9iYWxWZXJzaW9uLmNvbXBhcmUobG9jYWxWZXJzaW9uKSA+IDA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgc2hvdWxkV2FybiA9IHRydWU7XG4gIH1cblxuICBpZiAoc2hvdWxkV2FybiAmJiBpc1dhcm5pbmdFbmFibGVkKCd2ZXJzaW9uTWlzbWF0Y2gnKSkge1xuICAgIGNvbnN0IHdhcm5pbmcgPSB0ZXJtaW5hbC55ZWxsb3codGFncy5zdHJpcEluZGVudHNgXG4gICAgWW91ciBnbG9iYWwgQW5ndWxhciBDTEkgdmVyc2lvbiAoJHtnbG9iYWxWZXJzaW9ufSkgaXMgZ3JlYXRlciB0aGFuIHlvdXIgbG9jYWxcbiAgICB2ZXJzaW9uICgke2xvY2FsVmVyc2lvbn0pLiBUaGUgbG9jYWwgQW5ndWxhciBDTEkgdmVyc2lvbiBpcyB1c2VkLlxuXG4gICAgVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgdXNlIFwibmcgY29uZmlnIC1nIGNsaS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggZmFsc2VcIi5cbiAgICBgKTtcbiAgICAvLyBEb24ndCBzaG93IHdhcm5pbmcgY29sb3Jpc2VkIG9uIGBuZyBjb21wbGV0aW9uYFxuICAgIGlmIChwcm9jZXNzLmFyZ3ZbMl0gIT09ICdjb21wbGV0aW9uJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcih3YXJuaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcih3YXJuaW5nKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9XG4gIH1cblxuICAvLyBObyBlcnJvciBpbXBsaWVzIGEgcHJvamVjdExvY2FsQ2xpLCB3aGljaCB3aWxsIGxvYWQgd2hhdGV2ZXJcbiAgLy8gdmVyc2lvbiBvZiBuZy1jbGkgeW91IGhhdmUgaW5zdGFsbGVkIGluIGEgbG9jYWwgcGFja2FnZS5qc29uXG4gIGNsaSA9IHJlcXVpcmUocHJvamVjdExvY2FsQ2xpKTtcbn0gY2F0Y2gge1xuICAvLyBJZiB0aGVyZSBpcyBhbiBlcnJvciwgcmVzb2x2ZSBjb3VsZCBub3QgZmluZCB0aGUgbmctY2xpXG4gIC8vIGxpYnJhcnkgZnJvbSBhIHBhY2thZ2UuanNvbi4gSW5zdGVhZCwgaW5jbHVkZSBpdCBmcm9tIGEgcmVsYXRpdmVcbiAgLy8gcGF0aCB0byB0aGlzIHNjcmlwdCBmaWxlICh3aGljaCBpcyBsaWtlbHkgYSBnbG9iYWxseSBpbnN0YWxsZWRcbiAgLy8gbnBtIHBhY2thZ2UpLiBNb3N0IGNvbW1vbiBjYXVzZSBmb3IgaGl0dGluZyB0aGlzIGlzIGBuZyBuZXdgXG4gIGNsaSA9IHJlcXVpcmUoJy4vY2xpJyk7XG59XG5cbmlmICgnZGVmYXVsdCcgaW4gY2xpKSB7XG4gIGNsaSA9IGNsaVsnZGVmYXVsdCddO1xufVxuXG4vLyBUaGlzIGlzIHJlcXVpcmVkIHRvIHN1cHBvcnQgMS54IGxvY2FsIHZlcnNpb25zIHdpdGggYSA2KyBnbG9iYWxcbmxldCBzdGFuZGFyZElucHV0O1xudHJ5IHtcbiAgc3RhbmRhcmRJbnB1dCA9IHByb2Nlc3Muc3RkaW47XG59IGNhdGNoIChlKSB7XG4gIGRlbGV0ZSBwcm9jZXNzLnN0ZGluO1xuICBwcm9jZXNzLnN0ZGluID0gbmV3IER1cGxleCgpO1xuICBzdGFuZGFyZElucHV0ID0gcHJvY2Vzcy5zdGRpbjtcbn1cblxuY2xpKHtcbiAgY2xpQXJnczogcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLFxuICBpbnB1dFN0cmVhbTogc3RhbmRhcmRJbnB1dCxcbiAgb3V0cHV0U3RyZWFtOiBwcm9jZXNzLnN0ZG91dCxcbn0pXG4gIC50aGVuKChleGl0Q29kZTogbnVtYmVyKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgfSlcbiAgLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcignVW5rbm93biBlcnJvcjogJyArIGVyci50b1N0cmluZygpKTtcbiAgICBwcm9jZXNzLmV4aXQoMTI3KTtcbiAgfSk7XG4iXX0=