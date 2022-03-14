"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeErrorToLogFile = void 0;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
let logPath;
/**
 * Writes an Error to a temporary log file.
 * If this method is called multiple times from the same process the same log file will be used.
 * @returns The path of the generated log file.
 */
function writeErrorToLogFile(error) {
    if (!logPath) {
        const tempDirectory = (0, fs_1.mkdtempSync)((0, fs_1.realpathSync)((0, os_1.tmpdir)()) + '/ng-');
        logPath = (0, path_1.normalize)(tempDirectory + '/angular-errors.log');
    }
    (0, fs_1.appendFileSync)(logPath, '[error] ' + (error.stack || error) + '\n\n');
    return logPath;
}
exports.writeErrorToLogFile = writeErrorToLogFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS91dGlsaXRpZXMvbG9nLWZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsMkJBQStEO0FBQy9ELDJCQUE0QjtBQUM1QiwrQkFBaUM7QUFFakMsSUFBSSxPQUEyQixDQUFDO0FBRWhDOzs7O0dBSUc7QUFDSCxTQUFnQixtQkFBbUIsQ0FBQyxLQUFZO0lBQzlDLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDWixNQUFNLGFBQWEsR0FBRyxJQUFBLGdCQUFXLEVBQUMsSUFBQSxpQkFBWSxFQUFDLElBQUEsV0FBTSxHQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNuRSxPQUFPLEdBQUcsSUFBQSxnQkFBUyxFQUFDLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO0tBQzVEO0lBRUQsSUFBQSxtQkFBYyxFQUFDLE9BQU8sRUFBRSxVQUFVLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBRXRFLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFURCxrREFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBhcHBlbmRGaWxlU3luYywgbWtkdGVtcFN5bmMsIHJlYWxwYXRoU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gJ29zJztcbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gJ3BhdGgnO1xuXG5sZXQgbG9nUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIFdyaXRlcyBhbiBFcnJvciB0byBhIHRlbXBvcmFyeSBsb2cgZmlsZS5cbiAqIElmIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBmcm9tIHRoZSBzYW1lIHByb2Nlc3MgdGhlIHNhbWUgbG9nIGZpbGUgd2lsbCBiZSB1c2VkLlxuICogQHJldHVybnMgVGhlIHBhdGggb2YgdGhlIGdlbmVyYXRlZCBsb2cgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRXJyb3JUb0xvZ0ZpbGUoZXJyb3I6IEVycm9yKTogc3RyaW5nIHtcbiAgaWYgKCFsb2dQYXRoKSB7XG4gICAgY29uc3QgdGVtcERpcmVjdG9yeSA9IG1rZHRlbXBTeW5jKHJlYWxwYXRoU3luYyh0bXBkaXIoKSkgKyAnL25nLScpO1xuICAgIGxvZ1BhdGggPSBub3JtYWxpemUodGVtcERpcmVjdG9yeSArICcvYW5ndWxhci1lcnJvcnMubG9nJyk7XG4gIH1cblxuICBhcHBlbmRGaWxlU3luYyhsb2dQYXRoLCAnW2Vycm9yXSAnICsgKGVycm9yLnN0YWNrIHx8IGVycm9yKSArICdcXG5cXG4nKTtcblxuICByZXR1cm4gbG9nUGF0aDtcbn1cbiJdfQ==