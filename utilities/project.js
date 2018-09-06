"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
const core_1 = require("@angular-devkit/core");
const fs = require("fs");
const os = require("os");
const path = require("path");
const find_up_1 = require("./find-up");
function insideWorkspace() {
    return getWorkspaceDetails() !== null;
}
exports.insideWorkspace = insideWorkspace;
function getWorkspaceDetails() {
    const currentDir = process.cwd();
    const possibleConfigFiles = [
        'angular.json',
        '.angular.json',
        'angular-cli.json',
        '.angular-cli.json',
    ];
    const configFilePath = find_up_1.findUp(possibleConfigFiles, currentDir);
    if (configFilePath === null) {
        return null;
    }
    const configFileName = path.basename(configFilePath);
    const possibleDir = path.dirname(configFilePath);
    const homedir = os.homedir();
    if (core_1.normalize(possibleDir) === core_1.normalize(homedir)) {
        const packageJsonPath = path.join(possibleDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            // No package.json
            return null;
        }
        const packageJsonBuffer = fs.readFileSync(packageJsonPath);
        const packageJsonText = packageJsonBuffer === null ? '{}' : packageJsonBuffer.toString();
        const packageJson = JSON.parse(packageJsonText);
        if (!containsCliDep(packageJson)) {
            // No CLI dependency
            return null;
        }
    }
    return {
        root: possibleDir,
        configFile: configFileName,
    };
}
exports.getWorkspaceDetails = getWorkspaceDetails;
function containsCliDep(obj) {
    const pkgName = '@angular/cli';
    if (obj) {
        if (obj.dependencies && obj.dependencies[pkgName]) {
            return true;
        }
        if (obj.devDependencies && obj.devDependencies[pkgName]) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3Byb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCxpREFBaUQ7QUFDakQsK0NBQWlEO0FBQ2pELHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBRTdCLHVDQUFtQztBQUVuQztJQUNFLE9BQU8sbUJBQW1CLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFDeEMsQ0FBQztBQUZELDBDQUVDO0FBRUQ7SUFDRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDakMsTUFBTSxtQkFBbUIsR0FBRztRQUMxQixjQUFjO1FBQ2QsZUFBZTtRQUNmLGtCQUFrQjtRQUNsQixtQkFBbUI7S0FDcEIsQ0FBQztJQUNGLE1BQU0sY0FBYyxHQUFHLGdCQUFNLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDL0QsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO1FBQzNCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRXJELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFakQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdCLElBQUksZ0JBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ2pELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ25DLGtCQUFrQjtZQUNsQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sZUFBZSxHQUFHLGlCQUFpQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6RixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDaEMsb0JBQW9CO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUVELE9BQU87UUFDTCxJQUFJLEVBQUUsV0FBVztRQUNqQixVQUFVLEVBQUUsY0FBYztLQUMzQixDQUFDO0FBQ0osQ0FBQztBQXBDRCxrREFvQ0M7QUFFRCx3QkFBd0IsR0FBUTtJQUM5QixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDL0IsSUFBSSxHQUFHLEVBQUU7UUFDUCxJQUFJLEdBQUcsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNqRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBSSxHQUFHLENBQUMsZUFBZSxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdkQsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29tbWFuZFdvcmtzcGFjZSB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi9maW5kLXVwJztcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2lkZVdvcmtzcGFjZSgpOiBib29sZWFuIHtcbiAgcmV0dXJuIGdldFdvcmtzcGFjZURldGFpbHMoKSAhPT0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZURldGFpbHMoKTogQ29tbWFuZFdvcmtzcGFjZSB8IG51bGwge1xuICBjb25zdCBjdXJyZW50RGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcG9zc2libGVDb25maWdGaWxlcyA9IFtcbiAgICAnYW5ndWxhci5qc29uJyxcbiAgICAnLmFuZ3VsYXIuanNvbicsXG4gICAgJ2FuZ3VsYXItY2xpLmpzb24nLFxuICAgICcuYW5ndWxhci1jbGkuanNvbicsXG4gIF07XG4gIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gZmluZFVwKHBvc3NpYmxlQ29uZmlnRmlsZXMsIGN1cnJlbnREaXIpO1xuICBpZiAoY29uZmlnRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBjb25maWdGaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoY29uZmlnRmlsZVBhdGgpO1xuXG4gIGNvbnN0IHBvc3NpYmxlRGlyID0gcGF0aC5kaXJuYW1lKGNvbmZpZ0ZpbGVQYXRoKTtcblxuICBjb25zdCBob21lZGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAobm9ybWFsaXplKHBvc3NpYmxlRGlyKSA9PT0gbm9ybWFsaXplKGhvbWVkaXIpKSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKHBvc3NpYmxlRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIC8vIE5vIHBhY2thZ2UuanNvblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBhY2thZ2VKc29uQnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCk7XG4gICAgY29uc3QgcGFja2FnZUpzb25UZXh0ID0gcGFja2FnZUpzb25CdWZmZXIgPT09IG51bGwgPyAne30nIDogcGFja2FnZUpzb25CdWZmZXIudG9TdHJpbmcoKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25UZXh0KTtcbiAgICBpZiAoIWNvbnRhaW5zQ2xpRGVwKHBhY2thZ2VKc29uKSkge1xuICAgICAgLy8gTm8gQ0xJIGRlcGVuZGVuY3lcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcm9vdDogcG9zc2libGVEaXIsXG4gICAgY29uZmlnRmlsZTogY29uZmlnRmlsZU5hbWUsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zQ2xpRGVwKG9iajogYW55KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBrZ05hbWUgPSAnQGFuZ3VsYXIvY2xpJztcbiAgaWYgKG9iaikge1xuICAgIGlmIChvYmouZGVwZW5kZW5jaWVzICYmIG9iai5kZXBlbmRlbmNpZXNbcGtnTmFtZV0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAob2JqLmRldkRlcGVuZGVuY2llcyAmJiBvYmouZGV2RGVwZW5kZW5jaWVzW3BrZ05hbWVdKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG4iXX0=