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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBaUQ7QUFDakQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsdUNBQW1DO0FBRW5DLFNBQWdCLGlCQUFpQixDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFDaEUsTUFBTSxtQkFBbUIsR0FBRztRQUMxQixjQUFjO1FBQ2QsZUFBZTtRQUNmLGtCQUFrQjtRQUNsQixtQkFBbUI7S0FDcEIsQ0FBQztJQUNGLE1BQU0sY0FBYyxHQUFHLElBQUEsZ0JBQU0sRUFBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JFLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtRQUMzQixPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVqRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0IsSUFBSSxJQUFBLGdCQUFTLEVBQUMsV0FBVyxDQUFDLEtBQUssSUFBQSxnQkFBUyxFQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ2pELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELElBQUk7WUFDRixNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ2hDLG9CQUFvQjtnQkFDcEIsT0FBTyxJQUFJLENBQUM7YUFDYjtTQUNGO1FBQUMsV0FBTTtZQUNOLDZCQUE2QjtZQUM3QixPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDO0FBaENELDhDQWdDQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBR3ZCOztJQUNDLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztJQUMvQixJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ1IsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxZQUFZLDBDQUFHLE9BQU8sQ0FBQyxNQUFJLE1BQUEsR0FBRyxDQUFDLGVBQWUsMENBQUcsT0FBTyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4vZmluZC11cCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kV29ya3NwYWNlRmlsZShjdXJyZW50RGlyZWN0b3J5ID0gcHJvY2Vzcy5jd2QoKSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBwb3NzaWJsZUNvbmZpZ0ZpbGVzID0gW1xuICAgICdhbmd1bGFyLmpzb24nLFxuICAgICcuYW5ndWxhci5qc29uJyxcbiAgICAnYW5ndWxhci1jbGkuanNvbicsXG4gICAgJy5hbmd1bGFyLWNsaS5qc29uJyxcbiAgXTtcbiAgY29uc3QgY29uZmlnRmlsZVBhdGggPSBmaW5kVXAocG9zc2libGVDb25maWdGaWxlcywgY3VycmVudERpcmVjdG9yeSk7XG4gIGlmIChjb25maWdGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgcG9zc2libGVEaXIgPSBwYXRoLmRpcm5hbWUoY29uZmlnRmlsZVBhdGgpO1xuXG4gIGNvbnN0IGhvbWVkaXIgPSBvcy5ob21lZGlyKCk7XG4gIGlmIChub3JtYWxpemUocG9zc2libGVEaXIpID09PSBub3JtYWxpemUoaG9tZWRpcikpIHtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4ocG9zc2libGVEaXIsICdwYWNrYWdlLmpzb24nKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvblRleHQgPSBmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmLTgnKTtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvblRleHQpO1xuICAgICAgaWYgKCFjb250YWluc0NsaURlcChwYWNrYWdlSnNvbikpIHtcbiAgICAgICAgLy8gTm8gQ0xJIGRlcGVuZGVuY3lcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBObyBvciBpbnZhbGlkIHBhY2thZ2UuanNvblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbmZpZ0ZpbGVQYXRoO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0NsaURlcChvYmo/OiB7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBrZ05hbWUgPSAnQGFuZ3VsYXIvY2xpJztcbiAgaWYgKCFvYmopIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gISEob2JqLmRlcGVuZGVuY2llcz8uW3BrZ05hbWVdIHx8IG9iai5kZXZEZXBlbmRlbmNpZXM/Lltwa2dOYW1lXSk7XG59XG4iXX0=