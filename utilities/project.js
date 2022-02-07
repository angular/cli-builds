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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.findWorkspaceFile = void 0;
const core_1 = require("@angular-devkit/core");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const find_up_1 = require("./find-up");
function findWorkspaceFile(currentDirectory = process.cwd()) {
    const possibleConfigFiles = ['angular.json', '.angular.json'];
    const configFilePath = (0, find_up_1.findUp)(possibleConfigFiles, currentDirectory);
    if (configFilePath === null) {
        return null;
    }
    const possibleDir = path.dirname(configFilePath);
    const homedir = os.homedir();
    if ((0, core_1.normalize)(possibleDir) === (0, core_1.normalize)(homedir)) {
        const packageJsonPath = path.join(possibleDir, 'package.json');
        try {
            const packageJsonText = fs.readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonText);
            if (!containsCliDep(packageJson)) {
                // No CLI dependency
                return null;
            }
        }
        catch (_a) {
            // No or invalid package.json
            return null;
        }
    }
    return configFilePath;
}
exports.findWorkspaceFile = findWorkspaceFile;
function containsCliDep(obj) {
    var _a, _b;
    const pkgName = '@angular/cli';
    if (!obj) {
        return false;
    }
    return !!(((_a = obj.dependencies) === null || _a === void 0 ? void 0 : _a[pkgName]) || ((_b = obj.devDependencies) === null || _b === void 0 ? void 0 : _b[pkgName]));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBaUQ7QUFDakQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsdUNBQW1DO0FBRW5DLFNBQWdCLGlCQUFpQixDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFDaEUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUM5RCxNQUFNLGNBQWMsR0FBRyxJQUFBLGdCQUFNLEVBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNyRSxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7UUFDM0IsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFakQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLElBQUksSUFBQSxnQkFBUyxFQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUEsZ0JBQVMsRUFBQyxPQUFPLENBQUMsRUFBRTtRQUNqRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUvRCxJQUFJO1lBQ0YsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUNoQyxvQkFBb0I7Z0JBQ3BCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUFDLFdBQU07WUFDTiw2QkFBNkI7WUFDN0IsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQztBQTNCRCw4Q0EyQkM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUd2Qjs7SUFDQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDL0IsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNSLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsTUFBQSxHQUFHLENBQUMsWUFBWSwwQ0FBRyxPQUFPLENBQUMsTUFBSSxNQUFBLEdBQUcsQ0FBQyxlQUFlLDBDQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUMzRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuL2ZpbmQtdXAnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZFdvcmtzcGFjZUZpbGUoY3VycmVudERpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCkpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgcG9zc2libGVDb25maWdGaWxlcyA9IFsnYW5ndWxhci5qc29uJywgJy5hbmd1bGFyLmpzb24nXTtcbiAgY29uc3QgY29uZmlnRmlsZVBhdGggPSBmaW5kVXAocG9zc2libGVDb25maWdGaWxlcywgY3VycmVudERpcmVjdG9yeSk7XG4gIGlmIChjb25maWdGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgcG9zc2libGVEaXIgPSBwYXRoLmRpcm5hbWUoY29uZmlnRmlsZVBhdGgpO1xuXG4gIGNvbnN0IGhvbWVkaXIgPSBvcy5ob21lZGlyKCk7XG4gIGlmIChub3JtYWxpemUocG9zc2libGVEaXIpID09PSBub3JtYWxpemUoaG9tZWRpcikpIHtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4ocG9zc2libGVEaXIsICdwYWNrYWdlLmpzb24nKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvblRleHQgPSBmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvblRleHQpO1xuICAgICAgaWYgKCFjb250YWluc0NsaURlcChwYWNrYWdlSnNvbikpIHtcbiAgICAgICAgLy8gTm8gQ0xJIGRlcGVuZGVuY3lcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBObyBvciBpbnZhbGlkIHBhY2thZ2UuanNvblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbmZpZ0ZpbGVQYXRoO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0NsaURlcChvYmo/OiB7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBrZ05hbWUgPSAnQGFuZ3VsYXIvY2xpJztcbiAgaWYgKCFvYmopIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gISEob2JqLmRlcGVuZGVuY2llcz8uW3BrZ05hbWVdIHx8IG9iai5kZXZEZXBlbmRlbmNpZXM/Lltwa2dOYW1lXSk7XG59XG4iXX0=