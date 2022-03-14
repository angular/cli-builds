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
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    const possibleConfigFiles = [
        'angular.json',
        '.angular.json',
        'angular-cli.json',
        '.angular-cli.json',
    ];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlEO0FBQ2pELHVDQUF5QjtBQUN6Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLHVDQUFtQztBQUVuQyxTQUFnQixpQkFBaUIsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFO0lBQ2hFLE1BQU0sbUJBQW1CLEdBQUc7UUFDMUIsY0FBYztRQUNkLGVBQWU7UUFDZixrQkFBa0I7UUFDbEIsbUJBQW1CO0tBQ3BCLENBQUM7SUFDRixNQUFNLGNBQWMsR0FBRyxJQUFBLGdCQUFNLEVBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNyRSxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7UUFDM0IsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFakQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLElBQUksSUFBQSxnQkFBUyxFQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUEsZ0JBQVMsRUFBQyxPQUFPLENBQUMsRUFBRTtRQUNqRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUvRCxJQUFJO1lBQ0YsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUNoQyxvQkFBb0I7Z0JBQ3BCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUFDLFdBQU07WUFDTiw2QkFBNkI7WUFDN0IsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQztBQWhDRCw4Q0FnQ0M7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUd2Qjs7SUFDQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDL0IsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNSLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsTUFBQSxHQUFHLENBQUMsWUFBWSwwQ0FBRyxPQUFPLENBQUMsTUFBSSxNQUFBLEdBQUcsQ0FBQyxlQUFlLDBDQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUMzRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuL2ZpbmQtdXAnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZFdvcmtzcGFjZUZpbGUoY3VycmVudERpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCkpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgcG9zc2libGVDb25maWdGaWxlcyA9IFtcbiAgICAnYW5ndWxhci5qc29uJyxcbiAgICAnLmFuZ3VsYXIuanNvbicsXG4gICAgJ2FuZ3VsYXItY2xpLmpzb24nLFxuICAgICcuYW5ndWxhci1jbGkuanNvbicsXG4gIF07XG4gIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gZmluZFVwKHBvc3NpYmxlQ29uZmlnRmlsZXMsIGN1cnJlbnREaXJlY3RvcnkpO1xuICBpZiAoY29uZmlnRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHBvc3NpYmxlRGlyID0gcGF0aC5kaXJuYW1lKGNvbmZpZ0ZpbGVQYXRoKTtcblxuICBjb25zdCBob21lZGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAobm9ybWFsaXplKHBvc3NpYmxlRGlyKSA9PT0gbm9ybWFsaXplKGhvbWVkaXIpKSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKHBvc3NpYmxlRGlyLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFja2FnZUpzb25UZXh0ID0gZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25UZXh0KTtcbiAgICAgIGlmICghY29udGFpbnNDbGlEZXAocGFja2FnZUpzb24pKSB7XG4gICAgICAgIC8vIE5vIENMSSBkZXBlbmRlbmN5XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gTm8gb3IgaW52YWxpZCBwYWNrYWdlLmpzb25cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdGaWxlUGF0aDtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNDbGlEZXAob2JqPzoge1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufSk6IGJvb2xlYW4ge1xuICBjb25zdCBwa2dOYW1lID0gJ0Bhbmd1bGFyL2NsaSc7XG4gIGlmICghb2JqKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuICEhKG9iai5kZXBlbmRlbmNpZXM/Lltwa2dOYW1lXSB8fCBvYmouZGV2RGVwZW5kZW5jaWVzPy5bcGtnTmFtZV0pO1xufVxuIl19