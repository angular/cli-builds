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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS10cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9wYWNrYWdlLXRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCx1Q0FBeUI7QUFDekIsK0JBQXFDO0FBQ3JDLGlEQUFtQztBQWtCbkMsU0FBUyxrQkFBa0IsQ0FBQyxHQUFnQjtJQUMxQyxPQUFPLElBQUksR0FBRyxDQUFDO1FBQ2IsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO1FBQ3pDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLEVBQUUsQ0FBQztRQUM1QyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQztRQUM3QyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQztLQUNsRCxDQUFDLENBQUM7QUFDTCxDQUFDO0FBU00sS0FBSyxVQUFVLGVBQWUsQ0FBQyxlQUF1QjtJQUMzRCxJQUFJO1FBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDN0U7SUFBQyxXQUFNO1FBQ04sT0FBTyxTQUFTLENBQUM7S0FDbEI7QUFDSCxDQUFDO0FBTkQsMENBTUM7QUFFRCxTQUFnQixlQUFlLENBQUMsWUFBb0IsRUFBRSxXQUFtQjtJQUN2RSxJQUFJO1FBQ0YsNEdBQTRHO1FBQzVHLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLGVBQWUsRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRS9GLE9BQU8sZUFBZSxDQUFDO0tBQ3hCO0lBQUMsV0FBTTtRQUNOLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQVRELDBDQVNDO0FBRU0sS0FBSyxVQUFVLHNCQUFzQixDQUFDLEdBQVc7SUFDdEQsTUFBTSxHQUFHLEdBQUcsTUFBTSxlQUFlLENBQUMsSUFBQSxXQUFJLEVBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztLQUNoRDtJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO0lBQ25ELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNyRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDcEIsU0FBUztTQUNWO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDaEIsSUFBSTtZQUNKLE9BQU87WUFDUCxJQUFJLEVBQUUsSUFBQSxjQUFPLEVBQUMsZUFBZSxDQUFDO1lBQzlCLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQyxlQUFlLENBQUM7U0FDaEQsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBdEJELHdEQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyByZXNvbHZlIGZyb20gJ3Jlc29sdmUnO1xuaW1wb3J0IHsgTmdBZGRTYXZlRGVwZWRlbmN5IH0gZnJvbSAnLi9wYWNrYWdlLW1ldGFkYXRhJztcblxuaW50ZXJmYWNlIFBhY2thZ2VKc29uIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBvcHRpb25hbERlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gICduZy11cGRhdGUnPzoge1xuICAgIG1pZ3JhdGlvbnM/OiBzdHJpbmc7XG4gIH07XG4gICduZy1hZGQnPzoge1xuICAgIHNhdmU/OiBOZ0FkZFNhdmVEZXBlZGVuY3k7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEFsbERlcGVuZGVuY2llcyhwa2c6IFBhY2thZ2VKc29uKTogU2V0PFtzdHJpbmcsIHN0cmluZ10+IHtcbiAgcmV0dXJuIG5ldyBTZXQoW1xuICAgIC4uLk9iamVjdC5lbnRyaWVzKHBrZy5kZXBlbmRlbmNpZXMgfHwgW10pLFxuICAgIC4uLk9iamVjdC5lbnRyaWVzKHBrZy5kZXZEZXBlbmRlbmNpZXMgfHwgW10pLFxuICAgIC4uLk9iamVjdC5lbnRyaWVzKHBrZy5wZWVyRGVwZW5kZW5jaWVzIHx8IFtdKSxcbiAgICAuLi5PYmplY3QuZW50cmllcyhwa2cub3B0aW9uYWxEZXBlbmRlbmNpZXMgfHwgW10pLFxuICBdKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlVHJlZU5vZGUge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICBwYWNrYWdlOiBQYWNrYWdlSnNvbiB8IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRQYWNrYWdlSnNvbihwYWNrYWdlSnNvblBhdGg6IHN0cmluZyk6IFByb21pc2U8UGFja2FnZUpzb24gfCB1bmRlZmluZWQ+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZSgoYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSkudG9TdHJpbmcoKSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYWNrYWdlSnNvbih3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGFja2FnZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgLy8gYXZvaWQgcmVxdWlyZS5yZXNvbHZlIGhlcmUsIHNlZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8xODYxMCNpc3N1ZWNvbW1lbnQtNjgxOTgwMTg1XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZS5zeW5jKGAke3BhY2thZ2VOYW1lfS9wYWNrYWdlLmpzb25gLCB7IGJhc2VkaXI6IHdvcmtzcGFjZURpciB9KTtcblxuICAgIHJldHVybiBwYWNrYWdlSnNvblBhdGg7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFByb2plY3REZXBlbmRlbmNpZXMoZGlyOiBzdHJpbmcpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4+IHtcbiAgY29uc3QgcGtnID0gYXdhaXQgcmVhZFBhY2thZ2VKc29uKGpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpO1xuICBpZiAoIXBrZykge1xuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgcGFja2FnZS5qc29uJyk7XG4gIH1cblxuICBjb25zdCByZXN1bHRzID0gbmV3IE1hcDxzdHJpbmcsIFBhY2thZ2VUcmVlTm9kZT4oKTtcbiAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgZ2V0QWxsRGVwZW5kZW5jaWVzKHBrZykpIHtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBmaW5kUGFja2FnZUpzb24oZGlyLCBuYW1lKTtcbiAgICBpZiAoIXBhY2thZ2VKc29uUGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzdWx0cy5zZXQobmFtZSwge1xuICAgICAgbmFtZSxcbiAgICAgIHZlcnNpb24sXG4gICAgICBwYXRoOiBkaXJuYW1lKHBhY2thZ2VKc29uUGF0aCksXG4gICAgICBwYWNrYWdlOiBhd2FpdCByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb25QYXRoKSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIl19