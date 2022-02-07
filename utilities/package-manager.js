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
const workspace_schema_1 = require("../lib/config/workspace-schema");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxpREFBeUQ7QUFDekQsMkJBQStDO0FBQy9DLCtCQUE0QjtBQUM1QixtQ0FBMEM7QUFDMUMsK0JBQWlDO0FBQ2pDLHFFQUFnRTtBQUNoRSxxQ0FBdUQ7QUFFdkQsTUFBTSxJQUFJLEdBQUcsSUFBQSxnQkFBUyxFQUFDLG9CQUFNLENBQUMsQ0FBQztBQUMvQixLQUFLLFVBQVUsUUFBUSxDQUFDLElBQW9CO0lBQzFDLElBQUk7UUFDRixNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUM7UUFFaEMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLFdBQU07UUFDTixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxXQUFXLENBQUMsSUFBWSxFQUFFLGNBQThCO0lBQ3JFLElBQUk7UUFDRixJQUFJLFlBQW9CLENBQUM7UUFDekIsUUFBUSxjQUFjLEVBQUU7WUFDdEIsS0FBSyxpQ0FBYyxDQUFDLElBQUk7Z0JBQ3RCLFlBQVksR0FBRyxXQUFXLENBQUM7Z0JBQzNCLE1BQU07WUFDUixLQUFLLGlDQUFjLENBQUMsSUFBSTtnQkFDdEIsWUFBWSxHQUFHLGdCQUFnQixDQUFDO2dCQUNoQyxNQUFNO1lBQ1IsS0FBSyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQztZQUN4QjtnQkFDRSxZQUFZLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ25DLE1BQU07U0FDVDtRQUVELE1BQU0sYUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFBLFdBQUksRUFBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEVBQUUsY0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFELE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFTSxLQUFLLFVBQVUsaUJBQWlCLENBQUMsSUFBWTtJQUNsRCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUEsb0NBQTJCLEdBQUUsQ0FBQztJQUMzRCxJQUFJLGNBQWMsRUFBRTtRQUNsQixPQUFPLGNBQWMsQ0FBQztLQUN2QjtJQUVELE1BQU0sQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUMvRCxXQUFXLENBQUMsSUFBSSxFQUFFLGlDQUFjLENBQUMsSUFBSSxDQUFDO1FBQ3RDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsaUNBQWMsQ0FBQyxHQUFHLENBQUM7UUFDckMsV0FBVyxDQUFDLElBQUksRUFBRSxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUN2QyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxpQ0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BELElBQUksT0FBTyxJQUFJLFdBQVcsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUN6QyxPQUFPLGlDQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCO0lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsaUNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwRCxJQUFJLE9BQU8sSUFBSSxXQUFXLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDekMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLGlDQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEQsSUFBSSxNQUFNLElBQUksVUFBVSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQ3hELE9BQU8saUNBQWMsQ0FBQyxHQUFHLENBQUM7S0FDM0I7SUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNsQyxPQUFPLGlDQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCO0lBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDbEMsT0FBTyxpQ0FBYyxDQUFDLElBQUksQ0FBQztLQUM1QjtJQUVELG1GQUFtRjtJQUNuRiwrRUFBK0U7SUFDL0UsT0FBTyxpQ0FBYyxDQUFDLEdBQUcsQ0FBQztBQUM1QixDQUFDO0FBdENELDhDQXNDQztBQUVEOztHQUVHO0FBQ0ksS0FBSyxVQUFVLG1CQUFtQixDQUFDLElBQVk7SUFDcEQsSUFBSSxDQUFDLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxpQ0FBYyxDQUFDLEdBQUcsRUFBRTtRQUMxRCxPQUFPO0tBQ1I7SUFFRCxJQUFJO1FBQ0YsTUFBTSxXQUFXLEdBQUcsSUFBQSx3QkFBUSxFQUFDLGVBQWUsRUFBRSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUYsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFLLEVBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU87U0FDUjtRQUVELElBQUksSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsRUFBRTtZQUNwQyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLElBQUksQ0FDVixlQUFlLE9BQU8sWUFBWTtnQkFDaEMscUZBQXFGLENBQ3hGLENBQUM7U0FDSDtLQUNGO0lBQUMsV0FBTTtRQUNOLHVCQUF1QjtLQUN4QjtBQUNILENBQUM7QUF0QkQsa0RBc0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGV4ZWMgYXMgZXhlY0NiLCBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgY29uc3RhbnRzLCBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNhdGlzZmllcywgdmFsaWQgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuL2NvbmZpZyc7XG5cbmNvbnN0IGV4ZWMgPSBwcm9taXNpZnkoZXhlY0NiKTtcbmFzeW5jIGZ1bmN0aW9uIHN1cHBvcnRzKG5hbWU6IFBhY2thZ2VNYW5hZ2VyKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlYyhgJHtuYW1lfSAtLXZlcnNpb25gKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFzTG9ja2ZpbGUocm9vdDogc3RyaW5nLCBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBsZXQgbG9ja2ZpbGVOYW1lOiBzdHJpbmc7XG4gICAgc3dpdGNoIChwYWNrYWdlTWFuYWdlcikge1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5ZYXJuOlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAneWFybi5sb2NrJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFBhY2thZ2VNYW5hZ2VyLlBucG06XG4gICAgICAgIGxvY2tmaWxlTmFtZSA9ICdwbnBtLWxvY2sueWFtbCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYWNrYWdlTWFuYWdlci5OcG06XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsb2NrZmlsZU5hbWUgPSAncGFja2FnZS1sb2NrLmpzb24nO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5hY2Nlc3Moam9pbihyb290LCBsb2NrZmlsZU5hbWUpLCBjb25zdGFudHMuRl9PSyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQYWNrYWdlTWFuYWdlcihyb290OiBzdHJpbmcpOiBQcm9taXNlPFBhY2thZ2VNYW5hZ2VyPiB7XG4gIGNvbnN0IHBhY2thZ2VNYW5hZ2VyID0gYXdhaXQgZ2V0Q29uZmlndXJlZFBhY2thZ2VNYW5hZ2VyKCk7XG4gIGlmIChwYWNrYWdlTWFuYWdlcikge1xuICAgIHJldHVybiBwYWNrYWdlTWFuYWdlcjtcbiAgfVxuXG4gIGNvbnN0IFtoYXNZYXJuTG9jaywgaGFzTnBtTG9jaywgaGFzUG5wbUxvY2tdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIGhhc0xvY2tmaWxlKHJvb3QsIFBhY2thZ2VNYW5hZ2VyLllhcm4pLFxuICAgIGhhc0xvY2tmaWxlKHJvb3QsIFBhY2thZ2VNYW5hZ2VyLk5wbSksXG4gICAgaGFzTG9ja2ZpbGUocm9vdCwgUGFja2FnZU1hbmFnZXIuUG5wbSksXG4gIF0pO1xuXG4gIGNvbnN0IGhhc1lhcm4gPSBhd2FpdCBzdXBwb3J0cyhQYWNrYWdlTWFuYWdlci5ZYXJuKTtcbiAgaWYgKGhhc1lhcm4gJiYgaGFzWWFybkxvY2sgJiYgIWhhc05wbUxvY2spIHtcbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgfVxuXG4gIGNvbnN0IGhhc1BucG0gPSBhd2FpdCBzdXBwb3J0cyhQYWNrYWdlTWFuYWdlci5QbnBtKTtcbiAgaWYgKGhhc1BucG0gJiYgaGFzUG5wbUxvY2sgJiYgIWhhc05wbUxvY2spIHtcbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuUG5wbTtcbiAgfVxuXG4gIGNvbnN0IGhhc05wbSA9IGF3YWl0IHN1cHBvcnRzKFBhY2thZ2VNYW5hZ2VyLk5wbSk7XG4gIGlmIChoYXNOcG0gJiYgaGFzTnBtTG9jayAmJiAhaGFzWWFybkxvY2sgJiYgIWhhc1BucG1Mb2NrKSB7XG4gICAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbiAgfVxuXG4gIGlmIChoYXNZYXJuICYmICFoYXNOcG0gJiYgIWhhc1BucG0pIHtcbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuWWFybjtcbiAgfVxuXG4gIGlmIChoYXNQbnBtICYmICFoYXNZYXJuICYmICFoYXNOcG0pIHtcbiAgICByZXR1cm4gUGFja2FnZU1hbmFnZXIuUG5wbTtcbiAgfVxuXG4gIC8vIFRPRE86IFRoaXMgc2hvdWxkIGV2ZW50dWFsbHkgaW5mb3JtIHRoZSB1c2VyIG9mIGFtYmlndW91cyBwYWNrYWdlIG1hbmFnZXIgdXNhZ2UuXG4gIC8vICAgICAgIFBvdGVudGlhbGx5IHdpdGggYSBwcm9tcHQgdG8gY2hvb3NlIGFuZCBvcHRpb25hbGx5IHNldCBhcyB0aGUgZGVmYXVsdC5cbiAgcmV0dXJuIFBhY2thZ2VNYW5hZ2VyLk5wbTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG5wbSB2ZXJzaW9uIGlzIGEgc3VwcG9ydGVkIDcueCB2ZXJzaW9uLiAgSWYgbm90LCBkaXNwbGF5IGEgd2FybmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZUNvbXBhdGlibGVOcG0ocm9vdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICgoYXdhaXQgZ2V0UGFja2FnZU1hbmFnZXIocm9vdCkpICE9PSBQYWNrYWdlTWFuYWdlci5OcG0pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHZlcnNpb25UZXh0ID0gZXhlY1N5bmMoJ25wbSAtLXZlcnNpb24nLCB7IGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiAncGlwZScgfSkudHJpbSgpO1xuICAgIGNvbnN0IHZlcnNpb24gPSB2YWxpZCh2ZXJzaW9uVGV4dCk7XG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCAnPj03IDw3LjUuNicpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgbnBtIHZlcnNpb24gJHt2ZXJzaW9ufSBkZXRlY3RlZC5gICtcbiAgICAgICAgICAnIFdoZW4gdXNpbmcgbnBtIDcgd2l0aCB0aGUgQW5ndWxhciBDTEksIG5wbSB2ZXJzaW9uIDcuNS42IG9yIGhpZ2hlciBpcyByZWNvbW1lbmRlZC4nLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIG5wbSBpcyBub3QgaW5zdGFsbGVkXG4gIH1cbn1cbiJdfQ==