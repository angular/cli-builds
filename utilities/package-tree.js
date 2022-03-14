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
exports.getProjectDependencies = exports.findPackageJson = exports.readPackageJson = void 0;
const fs = __importStar(require("fs"));
const path_1 = require("path");
const resolve = __importStar(require("resolve"));
function getAllDependencies(pkg) {
    return new Set([
        ...Object.entries(pkg.dependencies || []),
        ...Object.entries(pkg.devDependencies || []),
        ...Object.entries(pkg.peerDependencies || []),
        ...Object.entries(pkg.optionalDependencies || []),
    ]);
}
async function readPackageJson(packageJsonPath) {
    try {
        return JSON.parse((await fs.promises.readFile(packageJsonPath)).toString());
    }
    catch (_a) {
        return undefined;
    }
}
exports.readPackageJson = readPackageJson;
function findPackageJson(workspaceDir, packageName) {
    try {
        // avoid require.resolve here, see: https://github.com/angular/angular-cli/pull/18610#issuecomment-681980185
        const packageJsonPath = resolve.sync(`${packageName}/package.json`, { basedir: workspaceDir });
        return packageJsonPath;
    }
    catch (_a) {
        return undefined;
    }
}
exports.findPackageJson = findPackageJson;
async function getProjectDependencies(dir) {
    const pkg = await readPackageJson((0, path_1.join)(dir, 'package.json'));
    if (!pkg) {
        throw new Error('Could not find package.json');
    }
    const results = new Map();
    for (const [name, version] of getAllDependencies(pkg)) {
        const packageJsonPath = findPackageJson(dir, name);
        if (!packageJsonPath) {
            continue;
        }
        results.set(name, {
            name,
            version,
            path: (0, path_1.dirname)(packageJsonPath),
            package: await readPackageJson(packageJsonPath),
        });
    }
    return results;
}
exports.getProjectDependencies = getProjectDependencies;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS10cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3BhY2thZ2UtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QiwrQkFBcUM7QUFDckMsaURBQW1DO0FBa0JuQyxTQUFTLGtCQUFrQixDQUFDLEdBQWdCO0lBQzFDLE9BQU8sSUFBSSxHQUFHLENBQUM7UUFDYixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7UUFDekMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO1FBQzVDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDO1FBQzdDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLElBQUksRUFBRSxDQUFDO0tBQ2xELENBQUMsQ0FBQztBQUNMLENBQUM7QUFTTSxLQUFLLFVBQVUsZUFBZSxDQUFDLGVBQXVCO0lBQzNELElBQUk7UUFDRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUM3RTtJQUFDLFdBQU07UUFDTixPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUFORCwwQ0FNQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxZQUFvQixFQUFFLFdBQW1CO0lBQ3ZFLElBQUk7UUFDRiw0R0FBNEc7UUFDNUcsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFL0YsT0FBTyxlQUFlLENBQUM7S0FDeEI7SUFBQyxXQUFNO1FBQ04sT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBVEQsMENBU0M7QUFFTSxLQUFLLFVBQVUsc0JBQXNCLENBQUMsR0FBVztJQUN0RCxNQUFNLEdBQUcsR0FBRyxNQUFNLGVBQWUsQ0FBQyxJQUFBLFdBQUksRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM3RCxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUM7SUFDbkQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3JELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwQixTQUFTO1NBQ1Y7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNoQixJQUFJO1lBQ0osT0FBTztZQUNQLElBQUksRUFBRSxJQUFBLGNBQU8sRUFBQyxlQUFlLENBQUM7WUFDOUIsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDLGVBQWUsQ0FBQztTQUNoRCxDQUFDLENBQUM7S0FDSjtJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUF0QkQsd0RBc0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHJlc29sdmUgZnJvbSAncmVzb2x2ZSc7XG5pbXBvcnQgeyBOZ0FkZFNhdmVEZXBlZGVuY3kgfSBmcm9tICcuL3BhY2thZ2UtbWV0YWRhdGEnO1xuXG5pbnRlcmZhY2UgUGFja2FnZUpzb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgZGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgcGVlckRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIG9wdGlvbmFsRGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgJ25nLXVwZGF0ZSc/OiB7XG4gICAgbWlncmF0aW9ucz86IHN0cmluZztcbiAgfTtcbiAgJ25nLWFkZCc/OiB7XG4gICAgc2F2ZT86IE5nQWRkU2F2ZURlcGVkZW5jeTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0QWxsRGVwZW5kZW5jaWVzKHBrZzogUGFja2FnZUpzb24pOiBTZXQ8W3N0cmluZywgc3RyaW5nXT4ge1xuICByZXR1cm4gbmV3IFNldChbXG4gICAgLi4uT2JqZWN0LmVudHJpZXMocGtnLmRlcGVuZGVuY2llcyB8fCBbXSksXG4gICAgLi4uT2JqZWN0LmVudHJpZXMocGtnLmRldkRlcGVuZGVuY2llcyB8fCBbXSksXG4gICAgLi4uT2JqZWN0LmVudHJpZXMocGtnLnBlZXJEZXBlbmRlbmNpZXMgfHwgW10pLFxuICAgIC4uLk9iamVjdC5lbnRyaWVzKHBrZy5vcHRpb25hbERlcGVuZGVuY2llcyB8fCBbXSksXG4gIF0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VUcmVlTm9kZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBwYXRoOiBzdHJpbmc7XG4gIHBhY2thZ2U6IFBhY2thZ2VKc29uIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uUGF0aDogc3RyaW5nKTogUHJvbWlzZTxQYWNrYWdlSnNvbiB8IHVuZGVmaW5lZD4ge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKChhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKS50b1N0cmluZygpKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFBhY2thZ2VKc29uKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwYWNrYWdlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICAvLyBhdm9pZCByZXF1aXJlLnJlc29sdmUgaGVyZSwgc2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzE4NjEwI2lzc3VlY29tbWVudC02ODE5ODAxODVcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlLnN5bmMoYCR7cGFja2FnZU5hbWV9L3BhY2thZ2UuanNvbmAsIHsgYmFzZWRpcjogd29ya3NwYWNlRGlyIH0pO1xuXG4gICAgcmV0dXJuIHBhY2thZ2VKc29uUGF0aDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHJvamVjdERlcGVuZGVuY2llcyhkaXI6IHN0cmluZyk6IFByb21pc2U8TWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPj4ge1xuICBjb25zdCBwa2cgPSBhd2FpdCByZWFkUGFja2FnZUpzb24oam9pbihkaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gIGlmICghcGtnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHMgPSBuZXcgTWFwPHN0cmluZywgUGFja2FnZVRyZWVOb2RlPigpO1xuICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBnZXRBbGxEZXBlbmRlbmNpZXMocGtnKSkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGZpbmRQYWNrYWdlSnNvbihkaXIsIG5hbWUpO1xuICAgIGlmICghcGFja2FnZUpzb25QYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXN1bHRzLnNldChuYW1lLCB7XG4gICAgICBuYW1lLFxuICAgICAgdmVyc2lvbixcbiAgICAgIHBhdGg6IGRpcm5hbWUocGFja2FnZUpzb25QYXRoKSxcbiAgICAgIHBhY2thZ2U6IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvblBhdGgpLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iXX0=