"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCompatibleNpm = exports.getPackageManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const semver_1 = require("semver");
const util_1 = require("util");
const workspace_schema_1 = require("../../lib/config/workspace-schema");
const config_1 = require("./config");
const exec = (0, util_1.promisify)(child_process_1.exec);
async function supports(name) {
    try {
        await exec(`${name} --version`);
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function hasLockfile(root, packageManager) {
    try {
        let lockfileName;
        switch (packageManager) {
            case workspace_schema_1.PackageManager.Yarn:
                lockfileName = 'yarn.lock';
                break;
            case workspace_schema_1.PackageManager.Pnpm:
                lockfileName = 'pnpm-lock.yaml';
                break;
            case workspace_schema_1.PackageManager.Npm:
            default:
                lockfileName = 'package-lock.json';
                break;
        }
        await fs_1.promises.access((0, path_1.join)(root, lockfileName), fs_1.constants.F_OK);
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function getPackageManager(root) {
    const packageManager = await (0, config_1.getConfiguredPackageManager)();
    if (packageManager) {
        return packageManager;
    }
    const [hasYarnLock, hasNpmLock, hasPnpmLock, hasYarn, hasPnpm, hasNpm] = await Promise.all([
        hasLockfile(root, workspace_schema_1.PackageManager.Yarn),
        hasLockfile(root, workspace_schema_1.PackageManager.Npm),
        hasLockfile(root, workspace_schema_1.PackageManager.Pnpm),
        supports(workspace_schema_1.PackageManager.Yarn),
        supports(workspace_schema_1.PackageManager.Pnpm),
        supports(workspace_schema_1.PackageManager.Npm),
    ]);
    if (hasYarn && hasYarnLock && !hasNpmLock) {
        return workspace_schema_1.PackageManager.Yarn;
    }
    if (hasPnpm && hasPnpmLock && !hasNpmLock) {
        return workspace_schema_1.PackageManager.Pnpm;
    }
    if (hasNpm && hasNpmLock && !hasYarnLock && !hasPnpmLock) {
        return workspace_schema_1.PackageManager.Npm;
    }
    if (hasYarn && !hasNpm && !hasPnpm) {
        return workspace_schema_1.PackageManager.Yarn;
    }
    if (hasPnpm && !hasYarn && !hasNpm) {
        return workspace_schema_1.PackageManager.Pnpm;
    }
    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return workspace_schema_1.PackageManager.Npm;
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
        const versionText = (0, child_process_1.execSync)('npm --version', {
            encoding: 'utf8',
            stdio: 'pipe',
        }).trim();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsaURBQXlEO0FBQ3pELDJCQUErQztBQUMvQywrQkFBNEI7QUFDNUIsbUNBQTBDO0FBQzFDLCtCQUFpQztBQUNqQyx3RUFBbUU7QUFDbkUscUNBQXVEO0FBRXZELE1BQU0sSUFBSSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxvQkFBTSxDQUFDLENBQUM7QUFDL0IsS0FBSyxVQUFVLFFBQVEsQ0FBQyxJQUFvQjtJQUMxQyxJQUFJO1FBQ0YsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDO1FBRWhDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsV0FBVyxDQUFDLElBQVksRUFBRSxjQUE4QjtJQUNyRSxJQUFJO1FBQ0YsSUFBSSxZQUFvQixDQUFDO1FBQ3pCLFFBQVEsY0FBYyxFQUFFO1lBQ3RCLEtBQUssaUNBQWMsQ0FBQyxJQUFJO2dCQUN0QixZQUFZLEdBQUcsV0FBVyxDQUFDO2dCQUMzQixNQUFNO1lBQ1IsS0FBSyxpQ0FBYyxDQUFDLElBQUk7Z0JBQ3RCLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztnQkFDaEMsTUFBTTtZQUNSLEtBQUssaUNBQWMsQ0FBQyxHQUFHLENBQUM7WUFDeEI7Z0JBQ0UsWUFBWSxHQUFHLG1CQUFtQixDQUFDO2dCQUNuQyxNQUFNO1NBQ1Q7UUFFRCxNQUFNLGFBQUUsQ0FBQyxNQUFNLENBQUMsSUFBQSxXQUFJLEVBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxFQUFFLGNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxPQUFPLElBQUksQ0FBQztLQUNiO0lBQUMsV0FBTTtRQUNOLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLGlCQUFpQixDQUFDLElBQVk7SUFDbEQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFBLG9DQUEyQixHQUFFLENBQUM7SUFDM0QsSUFBSSxjQUFjLEVBQUU7UUFDbEIsT0FBTyxjQUFjLENBQUM7S0FDdkI7SUFFRCxNQUFNLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDekYsV0FBVyxDQUFDLElBQUksRUFBRSxpQ0FBYyxDQUFDLElBQUksQ0FBQztRQUN0QyxXQUFXLENBQUMsSUFBSSxFQUFFLGlDQUFjLENBQUMsR0FBRyxDQUFDO1FBQ3JDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsaUNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDdEMsUUFBUSxDQUFDLGlDQUFjLENBQUMsSUFBSSxDQUFDO1FBQzdCLFFBQVEsQ0FBQyxpQ0FBYyxDQUFDLElBQUksQ0FBQztRQUM3QixRQUFRLENBQUMsaUNBQWMsQ0FBQyxHQUFHLENBQUM7S0FDN0IsQ0FBQyxDQUFDO0lBRUgsSUFBSSxPQUFPLElBQUksV0FBVyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ3pDLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDNUI7SUFFRCxJQUFJLE9BQU8sSUFBSSxXQUFXLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDekMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELElBQUksTUFBTSxJQUFJLFVBQVUsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUN4RCxPQUFPLGlDQUFjLENBQUMsR0FBRyxDQUFDO0tBQzNCO0lBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDbEMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2xDLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDNUI7SUFFRCxtRkFBbUY7SUFDbkYsK0VBQStFO0lBQy9FLE9BQU8saUNBQWMsQ0FBQyxHQUFHLENBQUM7QUFDNUIsQ0FBQztBQXRDRCw4Q0FzQ0M7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxJQUFZO0lBQ3BELElBQUksQ0FBQyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssaUNBQWMsQ0FBQyxHQUFHLEVBQUU7UUFDMUQsT0FBTztLQUNSO0lBRUQsSUFBSTtRQUNGLE1BQU0sV0FBVyxHQUFHLElBQUEsd0JBQVEsRUFBQyxlQUFlLEVBQUU7WUFDNUMsUUFBUSxFQUFFLE1BQU07WUFDaEIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQUssRUFBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTztTQUNSO1FBRUQsSUFBSSxJQUFBLGtCQUFTLEVBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxFQUFFO1lBQ3BDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQWUsT0FBTyxZQUFZO2dCQUNoQyxxRkFBcUYsQ0FDeEYsQ0FBQztTQUNIO0tBQ0Y7SUFBQyxXQUFNO1FBQ04sdUJBQXVCO0tBQ3hCO0FBQ0gsQ0FBQztBQXpCRCxrREF5QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhlYyBhcyBleGVjQ2IsIGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBjb25zdGFudHMsIHByb21pc2VzIGFzIGZzIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgc2F0aXNmaWVzLCB2YWxpZCB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4vY29uZmlnJztcblxuY29uc3QgZXhlYyA9IHByb21pc2lmeShleGVjQ2IpO1xuYXN5bmMgZnVuY3Rpb24gc3VwcG9ydHMobmFtZTogUGFja2FnZU1hbmFnZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjKGAke25hbWV9IC0tdmVyc2lvbmApO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYXNMb2NrZmlsZShyb290OiBzdHJpbmcsIHBhY2thZ2VNYW5hZ2VyOiBQYWNrYWdlTWFuYWdlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGxldCBsb2NrZmlsZU5hbWU6IHN0cmluZztcbiAgICBzd2l0Y2ggKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLllhcm46XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICd5YXJuLmxvY2snO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuUG5wbTpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3BucG0tbG9jay55YW1sJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLk5wbTpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICdwYWNrYWdlLWxvY2suanNvbic7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGF3YWl0IGZzLmFjY2Vzcyhqb2luKHJvb3QsIGxvY2tmaWxlTmFtZSksIGNvbnN0YW50cy5GX09LKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBhY2thZ2VNYW5hZ2VyKHJvb3Q6IHN0cmluZyk6IFByb21pc2U8UGFja2FnZU1hbmFnZXI+IHtcbiAgY29uc3QgcGFja2FnZU1hbmFnZXIgPSBhd2FpdCBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTtcbiAgaWYgKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyO1xuICB9XG5cbiAgY29uc3QgW2hhc1lhcm5Mb2NrLCBoYXNOcG1Mb2NrLCBoYXNQbnBtTG9jaywgaGFzWWFybiwgaGFzUG5wbSwgaGFzTnBtXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICBoYXNMb2NrZmlsZShyb290LCBQYWNrYWdlTWFuYWdlci5ZYXJuKSxcbiAgICBoYXNMb2NrZmlsZShyb290LCBQYWNrYWdlTWFuYWdlci5OcG0pLFxuICAgIGhhc0xvY2tmaWxlKHJvb3QsIFBhY2thZ2VNYW5hZ2VyLlBucG0pLFxuICAgIHN1cHBvcnRzKFBhY2thZ2VNYW5hZ2VyLllhcm4pLFxuICAgIHN1cHBvcnRzKFBhY2thZ2VNYW5hZ2VyLlBucG0pLFxuICAgIHN1cHBvcnRzKFBhY2thZ2VNYW5hZ2VyLk5wbSksXG4gIF0pO1xuXG4gIGlmIChoYXNZYXJuICYmIGhhc1lhcm5Mb2NrICYmICFoYXNOcG1Mb2NrKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gIH1cblxuICBpZiAoaGFzUG5wbSAmJiBoYXNQbnBtTG9jayAmJiAhaGFzTnBtTG9jaykge1xuICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5QbnBtO1xuICB9XG5cbiAgaWYgKGhhc05wbSAmJiBoYXNOcG1Mb2NrICYmICFoYXNZYXJuTG9jayAmJiAhaGFzUG5wbUxvY2spIHtcbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuTnBtO1xuICB9XG5cbiAgaWYgKGhhc1lhcm4gJiYgIWhhc05wbSAmJiAhaGFzUG5wbSkge1xuICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5ZYXJuO1xuICB9XG5cbiAgaWYgKGhhc1BucG0gJiYgIWhhc1lhcm4gJiYgIWhhc05wbSkge1xuICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5QbnBtO1xuICB9XG5cbiAgLy8gVE9ETzogVGhpcyBzaG91bGQgZXZlbnR1YWxseSBpbmZvcm0gdGhlIHVzZXIgb2YgYW1iaWd1b3VzIHBhY2thZ2UgbWFuYWdlciB1c2FnZS5cbiAgLy8gICAgICAgUG90ZW50aWFsbHkgd2l0aCBhIHByb21wdCB0byBjaG9vc2UgYW5kIG9wdGlvbmFsbHkgc2V0IGFzIHRoZSBkZWZhdWx0LlxuICByZXR1cm4gUGFja2FnZU1hbmFnZXIuTnBtO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnBtIHZlcnNpb24gaXMgYSBzdXBwb3J0ZWQgNy54IHZlcnNpb24uICBJZiBub3QsIGRpc3BsYXkgYSB3YXJuaW5nLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlQ29tcGF0aWJsZU5wbShyb290OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKChhd2FpdCBnZXRQYWNrYWdlTWFuYWdlcihyb290KSkgIT09IFBhY2thZ2VNYW5hZ2VyLk5wbSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgdmVyc2lvblRleHQgPSBleGVjU3luYygnbnBtIC0tdmVyc2lvbicsIHtcbiAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICBzdGRpbzogJ3BpcGUnLFxuICAgIH0pLnRyaW0oKTtcbiAgICBjb25zdCB2ZXJzaW9uID0gdmFsaWQodmVyc2lvblRleHQpO1xuICAgIGlmICghdmVyc2lvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgJz49NyA8Ny41LjYnKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYG5wbSB2ZXJzaW9uICR7dmVyc2lvbn0gZGV0ZWN0ZWQuYCArXG4gICAgICAgICAgJyBXaGVuIHVzaW5nIG5wbSA3IHdpdGggdGhlIEFuZ3VsYXIgQ0xJLCBucG0gdmVyc2lvbiA3LjUuNiBvciBoaWdoZXIgaXMgcmVjb21tZW5kZWQuJyxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBucG0gaXMgbm90IGluc3RhbGxlZFxuICB9XG59XG4iXX0=