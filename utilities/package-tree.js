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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS10cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3BhY2thZ2UtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsdUNBQXlCO0FBQ3pCLCtCQUFxQztBQUNyQyxpREFBbUM7QUFrQm5DLFNBQVMsa0JBQWtCLENBQUMsR0FBZ0I7SUFDMUMsT0FBTyxJQUFJLEdBQUcsQ0FBQztRQUNiLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUN6QyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUM7UUFDNUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUM7UUFDN0MsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLENBQUM7S0FDbEQsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVNNLEtBQUssVUFBVSxlQUFlLENBQUMsZUFBdUI7SUFDM0QsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzdFO0lBQUMsV0FBTTtRQUNOLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQU5ELDBDQU1DO0FBRUQsU0FBZ0IsZUFBZSxDQUFDLFlBQW9CLEVBQUUsV0FBbUI7SUFDdkUsSUFBSTtRQUNGLDRHQUE0RztRQUM1RyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxlQUFlLEVBQUUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUUvRixPQUFPLGVBQWUsQ0FBQztLQUN4QjtJQUFDLFdBQU07UUFDTixPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUFURCwwQ0FTQztBQUVNLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxHQUFXO0lBQ3RELE1BQU0sR0FBRyxHQUFHLE1BQU0sZUFBZSxDQUFDLElBQUEsV0FBSSxFQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzdELElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDUixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7S0FDaEQ7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztJQUNuRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckQsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ3BCLFNBQVM7U0FDVjtRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ2hCLElBQUk7WUFDSixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUEsY0FBTyxFQUFDLGVBQWUsQ0FBQztZQUM5QixPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUMsZUFBZSxDQUFDO1NBQ2hELENBQUMsQ0FBQztLQUNKO0lBRUQsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQXRCRCx3REFzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcmVzb2x2ZSBmcm9tICdyZXNvbHZlJztcbmltcG9ydCB7IE5nQWRkU2F2ZURlcGVkZW5jeSB9IGZyb20gJy4vcGFja2FnZS1tZXRhZGF0YSc7XG5cbmludGVyZmFjZSBQYWNrYWdlSnNvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBwZWVyRGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgb3B0aW9uYWxEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICAnbmctdXBkYXRlJz86IHtcbiAgICBtaWdyYXRpb25zPzogc3RyaW5nO1xuICB9O1xuICAnbmctYWRkJz86IHtcbiAgICBzYXZlPzogTmdBZGRTYXZlRGVwZWRlbmN5O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRBbGxEZXBlbmRlbmNpZXMocGtnOiBQYWNrYWdlSnNvbik6IFNldDxbc3RyaW5nLCBzdHJpbmddPiB7XG4gIHJldHVybiBuZXcgU2V0KFtcbiAgICAuLi5PYmplY3QuZW50cmllcyhwa2cuZGVwZW5kZW5jaWVzIHx8IFtdKSxcbiAgICAuLi5PYmplY3QuZW50cmllcyhwa2cuZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSxcbiAgICAuLi5PYmplY3QuZW50cmllcyhwa2cucGVlckRlcGVuZGVuY2llcyB8fCBbXSksXG4gICAgLi4uT2JqZWN0LmVudHJpZXMocGtnLm9wdGlvbmFsRGVwZW5kZW5jaWVzIHx8IFtdKSxcbiAgXSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRyZWVOb2RlIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbiAgcGFja2FnZTogUGFja2FnZUpzb24gfCB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkUGFja2FnZUpzb24ocGFja2FnZUpzb25QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFBhY2thZ2VKc29uIHwgdW5kZWZpbmVkPiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpLnRvU3RyaW5nKCkpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGFja2FnZUpzb24od29ya3NwYWNlRGlyOiBzdHJpbmcsIHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICB0cnkge1xuICAgIC8vIGF2b2lkIHJlcXVpcmUucmVzb2x2ZSBoZXJlLCBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMTg2MTAjaXNzdWVjb21tZW50LTY4MTk4MDE4NVxuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUuc3luYyhgJHtwYWNrYWdlTmFtZX0vcGFja2FnZS5qc29uYCwgeyBiYXNlZGlyOiB3b3Jrc3BhY2VEaXIgfSk7XG5cbiAgICByZXR1cm4gcGFja2FnZUpzb25QYXRoO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQcm9qZWN0RGVwZW5kZW5jaWVzKGRpcjogc3RyaW5nKTogUHJvbWlzZTxNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+PiB7XG4gIGNvbnN0IHBrZyA9IGF3YWl0IHJlYWRQYWNrYWdlSnNvbihqb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKTtcbiAgaWYgKCFwa2cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbicpO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0cyA9IG5ldyBNYXA8c3RyaW5nLCBQYWNrYWdlVHJlZU5vZGU+KCk7XG4gIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIGdldEFsbERlcGVuZGVuY2llcyhwa2cpKSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gZmluZFBhY2thZ2VKc29uKGRpciwgbmFtZSk7XG4gICAgaWYgKCFwYWNrYWdlSnNvblBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdHMuc2V0KG5hbWUsIHtcbiAgICAgIG5hbWUsXG4gICAgICB2ZXJzaW9uLFxuICAgICAgcGF0aDogZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLFxuICAgICAgcGFja2FnZTogYXdhaXQgcmVhZFBhY2thZ2VKc29uKHBhY2thZ2VKc29uUGF0aCksXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiJdfQ==