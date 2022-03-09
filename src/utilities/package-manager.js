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
    const [hasYarnLock, hasNpmLock, hasPnpmLock] = await Promise.all([
        hasLockfile(root, workspace_schema_1.PackageManager.Yarn),
        hasLockfile(root, workspace_schema_1.PackageManager.Npm),
        hasLockfile(root, workspace_schema_1.PackageManager.Pnpm),
    ]);
    const hasYarn = await supports(workspace_schema_1.PackageManager.Yarn);
    if (hasYarn && hasYarnLock && !hasNpmLock) {
        return workspace_schema_1.PackageManager.Yarn;
    }
    const hasPnpm = await supports(workspace_schema_1.PackageManager.Pnpm);
    if (hasPnpm && hasPnpmLock && !hasNpmLock) {
        return workspace_schema_1.PackageManager.Pnpm;
    }
    const hasNpm = await supports(workspace_schema_1.PackageManager.Npm);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsaURBQXlEO0FBQ3pELDJCQUErQztBQUMvQywrQkFBNEI7QUFDNUIsbUNBQTBDO0FBQzFDLCtCQUFpQztBQUNqQyx3RUFBbUU7QUFDbkUscUNBQXVEO0FBRXZELE1BQU0sSUFBSSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxvQkFBTSxDQUFDLENBQUM7QUFDL0IsS0FBSyxVQUFVLFFBQVEsQ0FBQyxJQUFvQjtJQUMxQyxJQUFJO1FBQ0YsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDO1FBRWhDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsV0FBVyxDQUFDLElBQVksRUFBRSxjQUE4QjtJQUNyRSxJQUFJO1FBQ0YsSUFBSSxZQUFvQixDQUFDO1FBQ3pCLFFBQVEsY0FBYyxFQUFFO1lBQ3RCLEtBQUssaUNBQWMsQ0FBQyxJQUFJO2dCQUN0QixZQUFZLEdBQUcsV0FBVyxDQUFDO2dCQUMzQixNQUFNO1lBQ1IsS0FBSyxpQ0FBYyxDQUFDLElBQUk7Z0JBQ3RCLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztnQkFDaEMsTUFBTTtZQUNSLEtBQUssaUNBQWMsQ0FBQyxHQUFHLENBQUM7WUFDeEI7Z0JBQ0UsWUFBWSxHQUFHLG1CQUFtQixDQUFDO2dCQUNuQyxNQUFNO1NBQ1Q7UUFFRCxNQUFNLGFBQUUsQ0FBQyxNQUFNLENBQUMsSUFBQSxXQUFJLEVBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxFQUFFLGNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxPQUFPLElBQUksQ0FBQztLQUNiO0lBQUMsV0FBTTtRQUNOLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLGlCQUFpQixDQUFDLElBQVk7SUFDbEQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFBLG9DQUEyQixHQUFFLENBQUM7SUFDM0QsSUFBSSxjQUFjLEVBQUU7UUFDbEIsT0FBTyxjQUFjLENBQUM7S0FDdkI7SUFFRCxNQUFNLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDL0QsV0FBVyxDQUFDLElBQUksRUFBRSxpQ0FBYyxDQUFDLElBQUksQ0FBQztRQUN0QyxXQUFXLENBQUMsSUFBSSxFQUFFLGlDQUFjLENBQUMsR0FBRyxDQUFDO1FBQ3JDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsaUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDdkMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsaUNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwRCxJQUFJLE9BQU8sSUFBSSxXQUFXLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDekMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLGlDQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEQsSUFBSSxPQUFPLElBQUksV0FBVyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ3pDLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDNUI7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xELElBQUksTUFBTSxJQUFJLFVBQVUsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUN4RCxPQUFPLGlDQUFjLENBQUMsR0FBRyxDQUFDO0tBQzNCO0lBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDbEMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2xDLE9BQU8saUNBQWMsQ0FBQyxJQUFJLENBQUM7S0FDNUI7SUFFRCxtRkFBbUY7SUFDbkYsK0VBQStFO0lBQy9FLE9BQU8saUNBQWMsQ0FBQyxHQUFHLENBQUM7QUFDNUIsQ0FBQztBQXRDRCw4Q0FzQ0M7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxJQUFZO0lBQ3BELElBQUksQ0FBQyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssaUNBQWMsQ0FBQyxHQUFHLEVBQUU7UUFDMUQsT0FBTztLQUNSO0lBRUQsSUFBSTtRQUNGLE1BQU0sV0FBVyxHQUFHLElBQUEsd0JBQVEsRUFBQyxlQUFlLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFGLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBSyxFQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPO1NBQ1I7UUFFRCxJQUFJLElBQUEsa0JBQVMsRUFBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQUU7WUFDcEMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQ1YsZUFBZSxPQUFPLFlBQVk7Z0JBQ2hDLHFGQUFxRixDQUN4RixDQUFDO1NBQ0g7S0FDRjtJQUFDLFdBQU07UUFDTix1QkFBdUI7S0FDeEI7QUFDSCxDQUFDO0FBdEJELGtEQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBleGVjIGFzIGV4ZWNDYiwgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGNvbnN0YW50cywgcHJvbWlzZXMgYXMgZnMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzYXRpc2ZpZXMsIHZhbGlkIH0gZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0Q29uZmlndXJlZFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi9jb25maWcnO1xuXG5jb25zdCBleGVjID0gcHJvbWlzaWZ5KGV4ZWNDYik7XG5hc3luYyBmdW5jdGlvbiBzdXBwb3J0cyhuYW1lOiBQYWNrYWdlTWFuYWdlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGV4ZWMoYCR7bmFtZX0gLS12ZXJzaW9uYCk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhc0xvY2tmaWxlKHJvb3Q6IHN0cmluZywgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgbGV0IGxvY2tmaWxlTmFtZTogc3RyaW5nO1xuICAgIHN3aXRjaCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuWWFybjpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3lhcm4ubG9jayc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5QbnBtOlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAncG5wbS1sb2NrLnlhbWwnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFja2FnZU1hbmFnZXIuTnBtOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbG9ja2ZpbGVOYW1lID0gJ3BhY2thZ2UtbG9jay5qc29uJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgYXdhaXQgZnMuYWNjZXNzKGpvaW4ocm9vdCwgbG9ja2ZpbGVOYW1lKSwgY29uc3RhbnRzLkZfT0spO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UGFja2FnZU1hbmFnZXIocm9vdDogc3RyaW5nKTogUHJvbWlzZTxQYWNrYWdlTWFuYWdlcj4ge1xuICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IGF3YWl0IGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpO1xuICBpZiAocGFja2FnZU1hbmFnZXIpIHtcbiAgICByZXR1cm4gcGFja2FnZU1hbmFnZXI7XG4gIH1cblxuICBjb25zdCBbaGFzWWFybkxvY2ssIGhhc05wbUxvY2ssIGhhc1BucG1Mb2NrXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICBoYXNMb2NrZmlsZShyb290LCBQYWNrYWdlTWFuYWdlci5ZYXJuKSxcbiAgICBoYXNMb2NrZmlsZShyb290LCBQYWNrYWdlTWFuYWdlci5OcG0pLFxuICAgIGhhc0xvY2tmaWxlKHJvb3QsIFBhY2thZ2VNYW5hZ2VyLlBucG0pLFxuICBdKTtcblxuICBjb25zdCBoYXNZYXJuID0gYXdhaXQgc3VwcG9ydHMoUGFja2FnZU1hbmFnZXIuWWFybik7XG4gIGlmIChoYXNZYXJuICYmIGhhc1lhcm5Mb2NrICYmICFoYXNOcG1Mb2NrKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gIH1cblxuICBjb25zdCBoYXNQbnBtID0gYXdhaXQgc3VwcG9ydHMoUGFja2FnZU1hbmFnZXIuUG5wbSk7XG4gIGlmIChoYXNQbnBtICYmIGhhc1BucG1Mb2NrICYmICFoYXNOcG1Mb2NrKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLlBucG07XG4gIH1cblxuICBjb25zdCBoYXNOcG0gPSBhd2FpdCBzdXBwb3J0cyhQYWNrYWdlTWFuYWdlci5OcG0pO1xuICBpZiAoaGFzTnBtICYmIGhhc05wbUxvY2sgJiYgIWhhc1lhcm5Mb2NrICYmICFoYXNQbnBtTG9jaykge1xuICAgIHJldHVybiBQYWNrYWdlTWFuYWdlci5OcG07XG4gIH1cblxuICBpZiAoaGFzWWFybiAmJiAhaGFzTnBtICYmICFoYXNQbnBtKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLllhcm47XG4gIH1cblxuICBpZiAoaGFzUG5wbSAmJiAhaGFzWWFybiAmJiAhaGFzTnBtKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLlBucG07XG4gIH1cblxuICAvLyBUT0RPOiBUaGlzIHNob3VsZCBldmVudHVhbGx5IGluZm9ybSB0aGUgdXNlciBvZiBhbWJpZ3VvdXMgcGFja2FnZSBtYW5hZ2VyIHVzYWdlLlxuICAvLyAgICAgICBQb3RlbnRpYWxseSB3aXRoIGEgcHJvbXB0IHRvIGNob29zZSBhbmQgb3B0aW9uYWxseSBzZXQgYXMgdGhlIGRlZmF1bHQuXG4gIHJldHVybiBQYWNrYWdlTWFuYWdlci5OcG07XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBucG0gdmVyc2lvbiBpcyBhIHN1cHBvcnRlZCA3LnggdmVyc2lvbi4gIElmIG5vdCwgZGlzcGxheSBhIHdhcm5pbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVDb21wYXRpYmxlTnBtKHJvb3Q6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoKGF3YWl0IGdldFBhY2thZ2VNYW5hZ2VyKHJvb3QpKSAhPT0gUGFja2FnZU1hbmFnZXIuTnBtKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB2ZXJzaW9uVGV4dCA9IGV4ZWNTeW5jKCducG0gLS12ZXJzaW9uJywgeyBlbmNvZGluZzogJ3V0ZjgnLCBzdGRpbzogJ3BpcGUnIH0pLnRyaW0oKTtcbiAgICBjb25zdCB2ZXJzaW9uID0gdmFsaWQodmVyc2lvblRleHQpO1xuICAgIGlmICghdmVyc2lvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgJz49NyA8Ny41LjYnKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYG5wbSB2ZXJzaW9uICR7dmVyc2lvbn0gZGV0ZWN0ZWQuYCArXG4gICAgICAgICAgJyBXaGVuIHVzaW5nIG5wbSA3IHdpdGggdGhlIEFuZ3VsYXIgQ0xJLCBucG0gdmVyc2lvbiA3LjUuNiBvciBoaWdoZXIgaXMgcmVjb21tZW5kZWQuJyxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBucG0gaXMgbm90IGluc3RhbGxlZFxuICB9XG59XG4iXX0=