"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const command_1 = require("../models/command");
const find_up_1 = require("../utilities/find-up");
class VersionCommand extends command_1.Command {
    async run() {
        const pkg = require(path.resolve(__dirname, '..', 'package.json'));
        let projPkg;
        try {
            projPkg = require(path.resolve(this.workspace.root, 'package.json'));
        }
        catch (exception) {
            projPkg = undefined;
        }
        const patterns = [
            /^@angular\/.*/,
            /^@angular-devkit\/.*/,
            /^@ngtools\/.*/,
            /^@nguniversal\/.*/,
            /^@schematics\/.*/,
            /^rxjs$/,
            /^typescript$/,
            /^ng-packagr$/,
            /^webpack$/,
        ];
        const maybeNodeModules = find_up_1.findUp('node_modules', __dirname);
        const packageRoot = projPkg
            ? path.resolve(this.workspace.root, 'node_modules')
            : maybeNodeModules;
        const packageNames = [
            ...Object.keys(pkg && pkg['dependencies'] || {}),
            ...Object.keys(pkg && pkg['devDependencies'] || {}),
            ...Object.keys(projPkg && projPkg['dependencies'] || {}),
            ...Object.keys(projPkg && projPkg['devDependencies'] || {}),
        ];
        if (packageRoot != null) {
            // Add all node_modules and node_modules/@*/*
            const nodePackageNames = fs.readdirSync(packageRoot)
                .reduce((acc, name) => {
                if (name.startsWith('@')) {
                    return acc.concat(fs.readdirSync(path.resolve(packageRoot, name))
                        .map(subName => name + '/' + subName));
                }
                else {
                    return acc.concat(name);
                }
            }, []);
            packageNames.push(...nodePackageNames);
        }
        const versions = packageNames
            .filter(x => patterns.some(p => p.test(x)))
            .reduce((acc, name) => {
            if (name in acc) {
                return acc;
            }
            acc[name] = this.getVersion(name, packageRoot, maybeNodeModules);
            return acc;
        }, {});
        let ngCliVersion = pkg.version;
        if (!__dirname.match(/node_modules/)) {
            let gitBranch = '??';
            try {
                const gitRefName = '' + child_process.execSync('git symbolic-ref HEAD', { cwd: __dirname });
                gitBranch = path.basename(gitRefName.replace('\n', ''));
            }
            catch (_a) {
            }
            ngCliVersion = `local (v${pkg.version}, branch: ${gitBranch})`;
        }
        let angularCoreVersion = '';
        const angularSameAsCore = [];
        if (projPkg) {
            // Filter all angular versions that are the same as core.
            angularCoreVersion = versions['@angular/core'];
            if (angularCoreVersion) {
                for (const angularPackage of Object.keys(versions)) {
                    if (versions[angularPackage] == angularCoreVersion
                        && angularPackage.startsWith('@angular/')) {
                        angularSameAsCore.push(angularPackage.replace(/^@angular\//, ''));
                        delete versions[angularPackage];
                    }
                }
                // Make sure we list them in alphabetical order.
                angularSameAsCore.sort();
            }
        }
        const namePad = ' '.repeat(Object.keys(versions).sort((a, b) => b.length - a.length)[0].length + 3);
        const asciiArt = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `.split('\n').map(x => core_1.terminal.red(x)).join('\n');
        this.logger.info(asciiArt);
        this.logger.info(`
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}
      OS: ${process.platform} ${process.arch}
      Angular: ${angularCoreVersion}
      ... ${angularSameAsCore.reduce((acc, name) => {
            // Perform a simple word wrap around 60.
            if (acc.length == 0) {
                return [name];
            }
            const line = (acc[acc.length - 1] + ', ' + name);
            if (line.length > 60) {
                acc.push(name);
            }
            else {
                acc[acc.length - 1] = line;
            }
            return acc;
        }, []).join('\n... ')}

      Package${namePad.slice(7)}Version
      -------${namePad.replace(/ /g, '-')}------------------
      ${Object.keys(versions)
            .map(module => `${module}${namePad.slice(module.length)}${versions[module]}`)
            .sort()
            .join('\n')}
    `.replace(/^ {6}/gm, ''));
    }
    getVersion(moduleName, projectNodeModules, cliNodeModules) {
        try {
            if (projectNodeModules) {
                const modulePkg = require(path.resolve(projectNodeModules, moduleName, 'package.json'));
                return modulePkg.version;
            }
        }
        catch (_) {
        }
        try {
            if (cliNodeModules) {
                const modulePkg = require(path.resolve(cliNodeModules, moduleName, 'package.json'));
                return modulePkg.version + ' (cli-only)';
            }
        }
        catch (_a) {
        }
        return '<error>';
    }
}
VersionCommand.aliases = ['v'];
exports.VersionCommand = VersionCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy92ZXJzaW9uLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBZ0Q7QUFDaEQsK0NBQStDO0FBQy9DLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsK0NBQTRDO0FBQzVDLGtEQUE4QztBQUc5QyxNQUFhLGNBQWUsU0FBUSxpQkFBNkI7SUFHL0QsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxPQUFPLENBQUM7UUFDWixJQUFJO1lBQ0YsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7U0FDdEU7UUFBQyxPQUFPLFNBQVMsRUFBRTtZQUNsQixPQUFPLEdBQUcsU0FBUyxDQUFDO1NBQ3JCO1FBRUQsTUFBTSxRQUFRLEdBQUc7WUFDZixlQUFlO1lBQ2Ysc0JBQXNCO1lBQ3RCLGVBQWU7WUFDZixtQkFBbUI7WUFDbkIsa0JBQWtCO1lBQ2xCLFFBQVE7WUFDUixjQUFjO1lBQ2QsY0FBYztZQUNkLFdBQVc7U0FDWixDQUFDO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLFdBQVcsR0FBRyxPQUFPO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQztZQUNuRCxDQUFDLENBQUMsZ0JBQWdCLENBQUM7UUFFckIsTUFBTSxZQUFZLEdBQUc7WUFDbkIs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QyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBRXhGLE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQzthQUMxQjtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7U0FDWDtRQUVELElBQUk7WUFDRixJQUFJLGNBQWMsRUFBRTtnQkFDbEIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUVwRixPQUFPLFNBQVMsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDO2FBQzFDO1NBQ0Y7UUFBQyxXQUFNO1NBQ1A7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDOztBQWpLYSxzQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFEaEMsd0NBbUtDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uL3V0aWxpdGllcy9maW5kLXVwJztcbmltcG9ydCB7IFNjaGVtYSBhcyBWZXJzaW9uQ29tbWFuZFNjaGVtYSB9IGZyb20gJy4vdmVyc2lvbic7XG5cbmV4cG9ydCBjbGFzcyBWZXJzaW9uQ29tbWFuZCBleHRlbmRzIENvbW1hbmQ8VmVyc2lvbkNvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzID0gWyd2J107XG5cbiAgYXN5bmMgcnVuKCkge1xuICAgIGNvbnN0IHBrZyA9IHJlcXVpcmUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ3BhY2thZ2UuanNvbicpKTtcbiAgICBsZXQgcHJvalBrZztcbiAgICB0cnkge1xuICAgICAgcHJvalBrZyA9IHJlcXVpcmUocGF0aC5yZXNvbHZlKHRoaXMud29ya3NwYWNlLnJvb3QsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICBwcm9qUGtnID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdHRlcm5zID0gW1xuICAgICAgL15AYW5ndWxhclxcLy4qLyxcbiAgICAgIC9eQGFuZ3VsYXItZGV2a2l0XFwvLiovLFxuICAgICAgL15Abmd0b29sc1xcLy4qLyxcbiAgICAgIC9eQG5ndW5pdmVyc2FsXFwvLiovLFxuICAgICAgL15Ac2NoZW1hdGljc1xcLy4qLyxcbiAgICAgIC9ecnhqcyQvLFxuICAgICAgL150eXBlc2NyaXB0JC8sXG4gICAgICAvXm5nLXBhY2thZ3IkLyxcbiAgICAgIC9ed2VicGFjayQvLFxuICAgIF07XG5cbiAgICBjb25zdCBtYXliZU5vZGVNb2R1bGVzID0gZmluZFVwKCdub2RlX21vZHVsZXMnLCBfX2Rpcm5hbWUpO1xuICAgIGNvbnN0IHBhY2thZ2VSb290ID0gcHJvalBrZ1xuICAgICAgPyBwYXRoLnJlc29sdmUodGhpcy53b3Jrc3BhY2Uucm9vdCwgJ25vZGVfbW9kdWxlcycpXG4gICAgICA6IG1heWJlTm9kZU1vZHVsZXM7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZXMgPSBbXG4gICAgICAuLi5PYmplY3Qua2V5cyhwa2cgJiYgcGtnWydkZXBlbmRlbmNpZXMnXSB8fCB7fSksXG4gICAgICAuLi5PYmplY3Qua2V5cyhwa2cgJiYgcGtnWydkZXZEZXBlbmRlbmNpZXMnXSB8fCB7fSksXG4gICAgICAuLi5PYmplY3Qua2V5cyhwcm9qUGtnICYmIHByb2pQa2dbJ2RlcGVuZGVuY2llcyddIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHByb2pQa2cgJiYgcHJvalBrZ1snZGV2RGVwZW5kZW5jaWVzJ10gfHwge30pLFxuICAgICAgXTtcblxuICAgIGlmIChwYWNrYWdlUm9vdCAhPSBudWxsKSB7XG4gICAgICAvLyBBZGQgYWxsIG5vZGVfbW9kdWxlcyBhbmQgbm9kZV9tb2R1bGVzL0AqLypcbiAgICAgIGNvbnN0IG5vZGVQYWNrYWdlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyhwYWNrYWdlUm9vdClcbiAgICAgICAgLnJlZHVjZTxzdHJpbmdbXT4oKGFjYywgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGFjYy5jb25jYXQoXG4gICAgICAgICAgICAgIGZzLnJlYWRkaXJTeW5jKHBhdGgucmVzb2x2ZShwYWNrYWdlUm9vdCwgbmFtZSkpXG4gICAgICAgICAgICAgICAgLm1hcChzdWJOYW1lID0+IG5hbWUgKyAnLycgKyBzdWJOYW1lKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2MuY29uY2F0KG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgW10pO1xuXG4gICAgICBwYWNrYWdlTmFtZXMucHVzaCguLi5ub2RlUGFja2FnZU5hbWVzKTtcbiAgICB9XG5cbiAgICBjb25zdCB2ZXJzaW9ucyA9IHBhY2thZ2VOYW1lc1xuICAgICAgLmZpbHRlcih4ID0+IHBhdHRlcm5zLnNvbWUocCA9PiBwLnRlc3QoeCkpKVxuICAgICAgLnJlZHVjZSgoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgIGlmIChuYW1lIGluIGFjYykge1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH1cblxuICAgICAgICBhY2NbbmFtZV0gPSB0aGlzLmdldFZlcnNpb24obmFtZSwgcGFja2FnZVJvb3QsIG1heWJlTm9kZU1vZHVsZXMpO1xuXG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCB7fSBhcyB7IFttb2R1bGU6IHN0cmluZ106IHN0cmluZyB9KTtcblxuICAgIGxldCBuZ0NsaVZlcnNpb24gPSBwa2cudmVyc2lvbjtcbiAgICBpZiAoIV9fZGlybmFtZS5tYXRjaCgvbm9kZV9tb2R1bGVzLykpIHtcbiAgICAgIGxldCBnaXRCcmFuY2ggPSAnPz8nO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZ2l0UmVmTmFtZSA9ICcnICsgY2hpbGRfcHJvY2Vzcy5leGVjU3luYygnZ2l0IHN5bWJvbGljLXJlZiBIRUFEJywge2N3ZDogX19kaXJuYW1lfSk7XG4gICAgICAgIGdpdEJyYW5jaCA9IHBhdGguYmFzZW5hbWUoZ2l0UmVmTmFtZS5yZXBsYWNlKCdcXG4nLCAnJykpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICB9XG5cbiAgICAgIG5nQ2xpVmVyc2lvbiA9IGBsb2NhbCAodiR7cGtnLnZlcnNpb259LCBicmFuY2g6ICR7Z2l0QnJhbmNofSlgO1xuICAgIH1cbiAgICBsZXQgYW5ndWxhckNvcmVWZXJzaW9uID0gJyc7XG4gICAgY29uc3QgYW5ndWxhclNhbWVBc0NvcmU6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAocHJvalBrZykge1xuICAgICAgLy8gRmlsdGVyIGFsbCBhbmd1bGFyIHZlcnNpb25zIHRoYXQgYXJlIHRoZSBzYW1lIGFzIGNvcmUuXG4gICAgICBhbmd1bGFyQ29yZVZlcnNpb24gPSB2ZXJzaW9uc1snQGFuZ3VsYXIvY29yZSddO1xuICAgICAgaWYgKGFuZ3VsYXJDb3JlVmVyc2lvbikge1xuICAgICAgICBmb3IgKGNvbnN0IGFuZ3VsYXJQYWNrYWdlIG9mIE9iamVjdC5rZXlzKHZlcnNpb25zKSkge1xuICAgICAgICAgIGlmICh2ZXJzaW9uc1thbmd1bGFyUGFja2FnZV0gPT0gYW5ndWxhckNvcmVWZXJzaW9uXG4gICAgICAgICAgICAgICYmIGFuZ3VsYXJQYWNrYWdlLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLycpKSB7XG4gICAgICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5wdXNoKGFuZ3VsYXJQYWNrYWdlLnJlcGxhY2UoL15AYW5ndWxhclxcLy8sICcnKSk7XG4gICAgICAgICAgICBkZWxldGUgdmVyc2lvbnNbYW5ndWxhclBhY2thZ2VdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBsaXN0IHRoZW0gaW4gYWxwaGFiZXRpY2FsIG9yZGVyLlxuICAgICAgICBhbmd1bGFyU2FtZUFzQ29yZS5zb3J0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZVBhZCA9ICcgJy5yZXBlYXQoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9ucykuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF0ubGVuZ3RoICsgMyxcbiAgICApO1xuICAgIGNvbnN0IGFzY2lpQXJ0ID0gYFxuICAgICBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgICAgIF9fX18gXyAgICAgX19fXG4gICAgLyBcXFxcICAgXyBfXyAgIF9fIF8gXyAgIF98IHwgX18gXyBfIF9fICAgICAvIF9fX3wgfCAgIHxfIF98XG4gICAvIOKWsyBcXFxcIHwgJ18gXFxcXCAvIF9cXGAgfCB8IHwgfCB8LyBfXFxgIHwgJ19ffCAgIHwgfCAgIHwgfCAgICB8IHxcbiAgLyBfX18gXFxcXHwgfCB8IHwgKF98IHwgfF98IHwgfCAoX3wgfCB8ICAgICAgfCB8X19ffCB8X19fIHwgfFxuIC9fLyAgIFxcXFxfXFxcXF98IHxffFxcXFxfXywgfFxcXFxfXyxffF98XFxcXF9fLF98X3wgICAgICAgXFxcXF9fX198X19fX198X19ffFxuICAgICAgICAgICAgICAgIHxfX18vXG4gICAgYC5zcGxpdCgnXFxuJykubWFwKHggPT4gdGVybWluYWwucmVkKHgpKS5qb2luKCdcXG4nKTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oYXNjaWlBcnQpO1xuICAgIHRoaXMubG9nZ2VyLmluZm8oYFxuICAgICAgQW5ndWxhciBDTEk6ICR7bmdDbGlWZXJzaW9ufVxuICAgICAgTm9kZTogJHtwcm9jZXNzLnZlcnNpb25zLm5vZGV9XG4gICAgICBPUzogJHtwcm9jZXNzLnBsYXRmb3JtfSAke3Byb2Nlc3MuYXJjaH1cbiAgICAgIEFuZ3VsYXI6ICR7YW5ndWxhckNvcmVWZXJzaW9ufVxuICAgICAgLi4uICR7YW5ndWxhclNhbWVBc0NvcmUucmVkdWNlPHN0cmluZ1tdPigoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgIC8vIFBlcmZvcm0gYSBzaW1wbGUgd29yZCB3cmFwIGFyb3VuZCA2MC5cbiAgICAgICAgaWYgKGFjYy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgIHJldHVybiBbbmFtZV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGluZSA9IChhY2NbYWNjLmxlbmd0aCAtIDFdICsgJywgJyArIG5hbWUpO1xuICAgICAgICBpZiAobGluZS5sZW5ndGggPiA2MCkge1xuICAgICAgICAgIGFjYy5wdXNoKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFjY1thY2MubGVuZ3RoIC0gMV0gPSBsaW5lO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sIFtdKS5qb2luKCdcXG4uLi4gJyl9XG5cbiAgICAgIFBhY2thZ2Uke25hbWVQYWQuc2xpY2UoNyl9VmVyc2lvblxuICAgICAgLS0tLS0tLSR7bmFtZVBhZC5yZXBsYWNlKC8gL2csICctJyl9LS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAke09iamVjdC5rZXlzKHZlcnNpb25zKVxuICAgICAgICAgIC5tYXAobW9kdWxlID0+IGAke21vZHVsZX0ke25hbWVQYWQuc2xpY2UobW9kdWxlLmxlbmd0aCl9JHt2ZXJzaW9uc1ttb2R1bGVdfWApXG4gICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgIC5qb2luKCdcXG4nKX1cbiAgICBgLnJlcGxhY2UoL14gezZ9L2dtLCAnJykpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRWZXJzaW9uKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZyxcbiAgICBwcm9qZWN0Tm9kZU1vZHVsZXM6IHN0cmluZyB8IG51bGwsXG4gICAgY2xpTm9kZU1vZHVsZXM6IHN0cmluZyB8IG51bGwsXG4gICk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChwcm9qZWN0Tm9kZU1vZHVsZXMpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlUGtnID0gcmVxdWlyZShwYXRoLnJlc29sdmUocHJvamVjdE5vZGVNb2R1bGVzLCBtb2R1bGVOYW1lLCAncGFja2FnZS5qc29uJykpO1xuXG4gICAgICAgIHJldHVybiBtb2R1bGVQa2cudmVyc2lvbjtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChfKSB7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChjbGlOb2RlTW9kdWxlcykge1xuICAgICAgICBjb25zdCBtb2R1bGVQa2cgPSByZXF1aXJlKHBhdGgucmVzb2x2ZShjbGlOb2RlTW9kdWxlcywgbW9kdWxlTmFtZSwgJ3BhY2thZ2UuanNvbicpKTtcblxuICAgICAgICByZXR1cm4gbW9kdWxlUGtnLnZlcnNpb24gKyAnIChjbGktb25seSknO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgIH1cblxuICAgIHJldHVybiAnPGVycm9yPic7XG4gIH1cbn1cbiJdfQ==