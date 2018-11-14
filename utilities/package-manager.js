"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
function supportsYarn() {
    try {
        child_process_1.execSync('yarn --version');
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.supportsYarn = supportsYarn;
function supportsNpm() {
    try {
        child_process_1.execSync('npm --version');
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.supportsNpm = supportsNpm;
function getPackageManager(root) {
    let packageManager = config_1.getConfiguredPackageManager();
    if (packageManager) {
        return packageManager;
    }
    const hasYarn = supportsYarn();
    const hasYarnLock = fs_1.existsSync(path_1.join(root, 'yarn.lock'));
    const hasNpm = supportsNpm();
    const hasNpmLock = fs_1.existsSync(path_1.join(root, 'package-lock.json'));
    if (hasYarn && hasYarnLock && !hasNpmLock) {
        packageManager = 'yarn';
    }
    else if (hasNpm && hasNpmLock && !hasYarnLock) {
        packageManager = 'npm';
    }
    else if (hasYarn && !hasNpm) {
        packageManager = 'yarn';
    }
    else if (hasNpm && !hasYarn) {
        packageManager = 'npm';
    }
    // TODO: This should eventually inform the user of ambiguous package manager usage.
    //       Potentially with a prompt to choose and optionally set as the default.
    return packageManager || 'npm';
}
exports.getPackageManager = getPackageManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsaURBQXlDO0FBQ3pDLDJCQUFnQztBQUNoQywrQkFBNEI7QUFDNUIscUNBQXVEO0FBR3ZELFNBQWdCLFlBQVk7SUFDMUIsSUFBSTtRQUNGLHdCQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUUzQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQUMsV0FBTTtRQUNOLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBUkQsb0NBUUM7QUFFRCxTQUFnQixXQUFXO0lBQ3pCLElBQUk7UUFDRix3QkFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTFCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFBQyxXQUFNO1FBQ04sT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLElBQVk7SUFDNUMsSUFBSSxjQUFjLEdBQUcsb0NBQTJCLEVBQUUsQ0FBQztJQUNuRCxJQUFJLGNBQWMsRUFBRTtRQUNsQixPQUFPLGNBQWMsQ0FBQztLQUN2QjtJQUVELE1BQU0sT0FBTyxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQy9CLE1BQU0sV0FBVyxHQUFHLGVBQVUsQ0FBQyxXQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDeEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDN0IsTUFBTSxVQUFVLEdBQUcsZUFBVSxDQUFDLFdBQUksQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBRS9ELElBQUksT0FBTyxJQUFJLFdBQVcsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUN6QyxjQUFjLEdBQUcsTUFBTSxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxNQUFNLElBQUksVUFBVSxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQy9DLGNBQWMsR0FBRyxLQUFLLENBQUM7S0FDeEI7U0FBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUM3QixjQUFjLEdBQUcsTUFBTSxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDN0IsY0FBYyxHQUFHLEtBQUssQ0FBQztLQUN4QjtJQUVELG1GQUFtRjtJQUNuRiwrRUFBK0U7SUFDL0UsT0FBTyxjQUFjLElBQUksS0FBSyxDQUFDO0FBQ2pDLENBQUM7QUF4QkQsOENBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuL2NvbmZpZyc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHN1cHBvcnRzWWFybigpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBleGVjU3luYygneWFybiAtLXZlcnNpb24nKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN1cHBvcnRzTnBtKCk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGV4ZWNTeW5jKCducG0gLS12ZXJzaW9uJyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYWNrYWdlTWFuYWdlcihyb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcGFja2FnZU1hbmFnZXIgPSBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTtcbiAgaWYgKHBhY2thZ2VNYW5hZ2VyKSB7XG4gICAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyO1xuICB9XG5cbiAgY29uc3QgaGFzWWFybiA9IHN1cHBvcnRzWWFybigpO1xuICBjb25zdCBoYXNZYXJuTG9jayA9IGV4aXN0c1N5bmMoam9pbihyb290LCAneWFybi5sb2NrJykpO1xuICBjb25zdCBoYXNOcG0gPSBzdXBwb3J0c05wbSgpO1xuICBjb25zdCBoYXNOcG1Mb2NrID0gZXhpc3RzU3luYyhqb2luKHJvb3QsICdwYWNrYWdlLWxvY2suanNvbicpKTtcblxuICBpZiAoaGFzWWFybiAmJiBoYXNZYXJuTG9jayAmJiAhaGFzTnBtTG9jaykge1xuICAgIHBhY2thZ2VNYW5hZ2VyID0gJ3lhcm4nO1xuICB9IGVsc2UgaWYgKGhhc05wbSAmJiBoYXNOcG1Mb2NrICYmICFoYXNZYXJuTG9jaykge1xuICAgIHBhY2thZ2VNYW5hZ2VyID0gJ25wbSc7XG4gIH0gZWxzZSBpZiAoaGFzWWFybiAmJiAhaGFzTnBtKSB7XG4gICAgcGFja2FnZU1hbmFnZXIgPSAneWFybic7XG4gIH0gZWxzZSBpZiAoaGFzTnBtICYmICFoYXNZYXJuKSB7XG4gICAgcGFja2FnZU1hbmFnZXIgPSAnbnBtJztcbiAgfVxuXG4gIC8vIFRPRE86IFRoaXMgc2hvdWxkIGV2ZW50dWFsbHkgaW5mb3JtIHRoZSB1c2VyIG9mIGFtYmlndW91cyBwYWNrYWdlIG1hbmFnZXIgdXNhZ2UuXG4gIC8vICAgICAgIFBvdGVudGlhbGx5IHdpdGggYSBwcm9tcHQgdG8gY2hvb3NlIGFuZCBvcHRpb25hbGx5IHNldCBhcyB0aGUgZGVmYXVsdC5cbiAgcmV0dXJuIHBhY2thZ2VNYW5hZ2VyIHx8ICducG0nO1xufVxuIl19