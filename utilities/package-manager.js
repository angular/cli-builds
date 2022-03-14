"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCompatibleNpm = exports.getPackageManager = exports.supportsNpm = exports.supportsYarn = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const semver_1 = require("semver");
const workspace_schema_1 = require("../lib/config/workspace-schema");
const config_1 = require("./config");
function supports(name) {
    try {
        (0, child_process_1.execSync)(`${name} --version`, { stdio: 'ignore' });
        return true;
    }
    catch (_a) {
        return false;
    }
}
function supportsYarn() {
    return supports('yarn');
}
exports.supportsYarn = supportsYarn;
function supportsNpm() {
    return supports('npm');
}
exports.supportsNpm = supportsNpm;
async function getPackageManager(root) {
    let packageManager = (await (0, config_1.getConfiguredPackageManager)());
    if (packageManager) {
        return packageManager;
    }
    const hasYarn = supportsYarn();
    const hasYarnLock = (0, fs_1.existsSync)((0, path_1.join)(root, 'yarn.lock'));
    const hasNpm = supportsNpm();
    const hasNpmLock = (0, fs_1.existsSync)((0, path_1.join)(root, 'package-lock.json'));
    if (hasYarn && hasYarnLock && !hasNpmLock) {
        packageManager = workspace_schema_1.PackageManager.Yarn;
    }
    else if (hasNpm && hasNpmLock && !hasYarnLock) {
        packageManager = workspace_schema_1.PackageManager.Npm;
    }
    else if (hasYarn && !hasNpm) {
        packageManager = workspace_schema_1.PackageManager.Yarn;
    }
    else if (hasNpm && !hasYarn) {
        packageManager = workspace_schema_1.PackageManager.Npm;
    }
    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return packageManager || workspace_schema_1.PackageManager.Npm;
}
exports.getPackageManager = getPackageManager;
/**
 * Checks if the npm version is a supported 7.x version.  If not, display a warning.
 */
async function ensureCompatibleNpm(root) {
    if ((await getPackageManager(root)) !== workspace_schema_1.PackageManager.Npm) {
        return;
    }
    try {
        const versionText = (0, child_process_1.execSync)('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
        const version = (0, semver_1.valid)(versionText);
        if (!version) {
            return;
        }
        if ((0, semver_1.satisfies)(version, '>=7 <7.5.6')) {
            // eslint-disable-next-line no-console
            console.warn(`npm version ${version} detected.` +
                ' When using npm 7 with the Angular CLI, npm version 7.5.6 or higher is recommended.');
        }
    }
    catch (_a) {
        // npm is not installed
    }
}
exports.ensureCompatibleNpm = ensureCompatibleNpm;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxpREFBeUM7QUFDekMsMkJBQWdDO0FBQ2hDLCtCQUE0QjtBQUM1QixtQ0FBMEM7QUFDMUMscUVBQWdFO0FBQ2hFLHFDQUF1RDtBQUV2RCxTQUFTLFFBQVEsQ0FBQyxJQUFZO0lBQzVCLElBQUk7UUFDRixJQUFBLHdCQUFRLEVBQUMsR0FBRyxJQUFJLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxTQUFnQixZQUFZO0lBQzFCLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFGRCxvQ0FFQztBQUVELFNBQWdCLFdBQVc7SUFDekIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQztBQUZELGtDQUVDO0FBRU0sS0FBSyxVQUFVLGlCQUFpQixDQUFDLElBQVk7SUFDbEQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxNQUFNLElBQUEsb0NBQTJCLEdBQUUsQ0FBMEIsQ0FBQztJQUNwRixJQUFJLGNBQWMsRUFBRTtRQUNsQixPQUFPLGNBQWMsQ0FBQztLQUN2QjtJQUVELE1BQU0sT0FBTyxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUEsZUFBVSxFQUFDLElBQUEsV0FBSSxFQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sTUFBTSxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUEsZUFBVSxFQUFDLElBQUEsV0FBSSxFQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFFL0QsSUFBSSxPQUFPLElBQUksV0FBVyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ3pDLGNBQWMsR0FBRyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUN0QztTQUFNLElBQUksTUFBTSxJQUFJLFVBQVUsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUMvQyxjQUFjLEdBQUcsaUNBQWMsQ0FBQyxHQUFHLENBQUM7S0FDckM7U0FBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUM3QixjQUFjLEdBQUcsaUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDdEM7U0FBTSxJQUFJLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUM3QixjQUFjLEdBQUcsaUNBQWMsQ0FBQyxHQUFHLENBQUM7S0FDckM7SUFFRCxtRkFBbUY7SUFDbkYsK0VBQStFO0lBQy9FLE9BQU8sY0FBYyxJQUFJLGlDQUFjLENBQUMsR0FBRyxDQUFDO0FBQzlDLENBQUM7QUF4QkQsOENBd0JDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsbUJBQW1CLENBQUMsSUFBWTtJQUNwRCxJQUFJLENBQUMsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLGlDQUFjLENBQUMsR0FBRyxFQUFFO1FBQzFELE9BQU87S0FDUjtJQUVELElBQUk7UUFDRixNQUFNLFdBQVcsR0FBRyxJQUFBLHdCQUFRLEVBQUMsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxRixNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQUssRUFBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTztTQUNSO1FBRUQsSUFBSSxJQUFBLGtCQUFTLEVBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxFQUFFO1lBQ3BDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQWUsT0FBTyxZQUFZO2dCQUNoQyxxRkFBcUYsQ0FDeEYsQ0FBQztTQUNIO0tBQ0Y7SUFBQyxXQUFNO1FBQ04sdUJBQXVCO0tBQ3hCO0FBQ0gsQ0FBQztBQXRCRCxrREFzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzYXRpc2ZpZXMsIHZhbGlkIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4vY29uZmlnJztcblxuZnVuY3Rpb24gc3VwcG9ydHMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgZXhlY1N5bmMoYCR7bmFtZX0gLS12ZXJzaW9uYCwgeyBzdGRpbzogJ2lnbm9yZScgfSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdXBwb3J0c1lhcm4oKTogYm9vbGVhbiB7XG4gIHJldHVybiBzdXBwb3J0cygneWFybicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3VwcG9ydHNOcG0oKTogYm9vbGVhbiB7XG4gIHJldHVybiBzdXBwb3J0cygnbnBtJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQYWNrYWdlTWFuYWdlcihyb290OiBzdHJpbmcpOiBQcm9taXNlPFBhY2thZ2VNYW5hZ2VyPiB7XG4gIGxldCBwYWNrYWdlTWFuYWdlciA9IChhd2FpdCBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKSkgYXMgUGFja2FnZU1hbmFnZXIgfCBudWxsO1xuICBpZiAocGFja2FnZU1hbmFnZXIpIHtcbiAgICByZXR1cm4gcGFja2FnZU1hbmFnZXI7XG4gIH1cblxuICBjb25zdCBoYXNZYXJuID0gc3VwcG9ydHNZYXJuKCk7XG4gIGNvbnN0IGhhc1lhcm5Mb2NrID0gZXhpc3RzU3luYyhqb2luKHJvb3QsICd5YXJuLmxvY2snKSk7XG4gIGNvbnN0IGhhc05wbSA9IHN1cHBvcnRzTnBtKCk7XG4gIGNvbnN0IGhhc05wbUxvY2sgPSBleGlzdHNTeW5jKGpvaW4ocm9vdCwgJ3BhY2thZ2UtbG9jay5qc29uJykpO1xuXG4gIGlmIChoYXNZYXJuICYmIGhhc1lhcm5Mb2NrICYmICFoYXNOcG1Mb2NrKSB7XG4gICAgcGFja2FnZU1hbmFnZXIgPSBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICB9IGVsc2UgaWYgKGhhc05wbSAmJiBoYXNOcG1Mb2NrICYmICFoYXNZYXJuTG9jaykge1xuICAgIHBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuTnBtO1xuICB9IGVsc2UgaWYgKGhhc1lhcm4gJiYgIWhhc05wbSkge1xuICAgIHBhY2thZ2VNYW5hZ2VyID0gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgfSBlbHNlIGlmIChoYXNOcG0gJiYgIWhhc1lhcm4pIHtcbiAgICBwYWNrYWdlTWFuYWdlciA9IFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgfVxuXG4gIC8vIFRPRE86IFRoaXMgc2hvdWxkIGV2ZW50dWFsbHkgaW5mb3JtIHRoZSB1c2VyIG9mIGFtYmlndW91cyBwYWNrYWdlIG1hbmFnZXIgdXNhZ2UuXG4gIC8vICAgICAgIFBvdGVudGlhbGx5IHdpdGggYSBwcm9tcHQgdG8gY2hvb3NlIGFuZCBvcHRpb25hbGx5IHNldCBhcyB0aGUgZGVmYXVsdC5cbiAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyIHx8IFBhY2thZ2VNYW5hZ2VyLk5wbTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG5wbSB2ZXJzaW9uIGlzIGEgc3VwcG9ydGVkIDcueCB2ZXJzaW9uLiAgSWYgbm90LCBkaXNwbGF5IGEgd2FybmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZUNvbXBhdGlibGVOcG0ocm9vdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICgoYXdhaXQgZ2V0UGFja2FnZU1hbmFnZXIocm9vdCkpICE9PSBQYWNrYWdlTWFuYWdlci5OcG0pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHZlcnNpb25UZXh0ID0gZXhlY1N5bmMoJ25wbSAtLXZlcnNpb24nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSkudHJpbSgpO1xuICAgIGNvbnN0IHZlcnNpb24gPSB2YWxpZCh2ZXJzaW9uVGV4dCk7XG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCAnPj03IDw3LjUuNicpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgbnBtIHZlcnNpb24gJHt2ZXJzaW9ufSBkZXRlY3RlZC5gICtcbiAgICAgICAgICAnIFdoZW4gdXNpbmcgbnBtIDcgd2l0aCB0aGUgQW5ndWxhciBDTEksIG5wbSB2ZXJzaW9uIDcuNS42IG9yIGhpZ2hlciBpcyByZWNvbW1lbmRlZC4nLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIG5wbSBpcyBub3QgaW5zdGFsbGVkXG4gIH1cbn1cbiJdfQ==