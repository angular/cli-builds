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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi1pbXBsLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy92ZXJzaW9uLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBZ0Q7QUFDaEQsK0NBQStDO0FBQy9DLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsK0NBQTRDO0FBQzVDLGtEQUE4QztBQUc5QyxNQUFhLGNBQWUsU0FBUSxpQkFBTztJQUd6QyxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLE9BQU8sQ0FBQztRQUNaLElBQUk7WUFDRixPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztTQUN0RTtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2xCLE9BQU8sR0FBRyxTQUFTLENBQUM7U0FDckI7UUFFRCxNQUFNLFFBQVEsR0FBRztZQUNmLGVBQWU7WUFDZixzQkFBc0I7WUFDdEIsZUFBZTtZQUNmLGtCQUFrQjtZQUNsQixRQUFRO1lBQ1IsY0FBYztZQUNkLGNBQWM7WUFDZCxXQUFXO1NBQ1osQ0FBQztRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZ0JBQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxXQUFXLEdBQUcsT0FBTztZQUN6QixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7WUFDbkQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO1FBRXJCLE1BQU0sWUFBWSxHQUFHO1lBQ25CLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoRCxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNuRCxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEQsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDMUQsQ0FBQztRQUVKLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtZQUN2Qiw2Q0FBNkM7WUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQztpQkFDakQsTUFBTSxDQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUM5QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3hCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FDZixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO3lCQUM1QyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUN4QyxDQUFDO2lCQUNIO3FCQUFNO29CQUNMLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDekI7WUFDSCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFVCxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztTQUN4QztRQUVELE1BQU0sUUFBUSxHQUFHLFlBQVk7YUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDcEIsSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO2dCQUNmLE9BQU8sR0FBRyxDQUFDO2FBQ1o7WUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFFakUsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsRUFBa0MsQ0FBQyxDQUFDO1FBRXpDLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDcEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUk7Z0JBQ0YsTUFBTSxVQUFVLEdBQUcsRUFBRSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsRUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztnQkFDMUYsU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6RDtZQUFDLFdBQU07YUFDUDtZQUVELFlBQVksR0FBRyxXQUFXLEdBQUcsQ0FBQyxPQUFPLGFBQWEsU0FBUyxHQUFHLENBQUM7U0FDaEU7UUFDRCxJQUFJLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztRQUM1QixNQUFNLGlCQUFpQixHQUFhLEVBQUUsQ0FBQztRQUV2QyxJQUFJLE9BQU8sRUFBRTtZQUNYLHlEQUF5RDtZQUN6RCxrQkFBa0IsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0MsSUFBSSxrQkFBa0IsRUFBRTtnQkFDdEIsS0FBSyxNQUFNLGNBQWMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNsRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxrQkFBa0I7MkJBQzNDLGNBQWMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUU7d0JBQzdDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNsRSxPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztxQkFDakM7aUJBQ0Y7Z0JBRUQsZ0RBQWdEO2dCQUNoRCxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUMxQjtTQUNGO1FBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUN4RSxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQUc7Ozs7Ozs7S0FPaEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztxQkFDQSxZQUFZO2NBQ25CLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUN2QixPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxJQUFJO2lCQUMzQixrQkFBa0I7WUFDdkIsaUJBQWlCLENBQUMsTUFBTSxDQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JELHdDQUF3QztZQUN4QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO2dCQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDZjtZQUNELE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pELElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUU7Z0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEI7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2FBQzVCO1lBRUQsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzs7ZUFFWixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztlQUNoQixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7UUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7YUFDbEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7YUFDNUUsSUFBSSxFQUFFO2FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNoQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRU8sVUFBVSxDQUNoQixVQUFrQixFQUNsQixrQkFBaUMsRUFDakMsY0FBNkI7UUFFN0IsSUFBSTtZQUNGLElBQUksa0JBQWtCLEVBQUU7Z0JBQ3RCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUV4RixPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUM7YUFDMUI7U0FDRjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1NBQ1g7UUFFRCxJQUFJO1lBQ0YsSUFBSSxjQUFjLEVBQUU7Z0JBQ2xCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFFcEYsT0FBTyxTQUFTLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzthQUMxQztTQUNGO1FBQUMsV0FBTTtTQUNQO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQzs7QUFoS2Esc0JBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBRGhDLHdDQWtLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5cblxuZXhwb3J0IGNsYXNzIFZlcnNpb25Db21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsndiddO1xuXG4gIGFzeW5jIHJ1bigpIHtcbiAgICBjb25zdCBwa2cgPSByZXF1aXJlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgbGV0IHByb2pQa2c7XG4gICAgdHJ5IHtcbiAgICAgIHByb2pQa2cgPSByZXF1aXJlKHBhdGgucmVzb2x2ZSh0aGlzLndvcmtzcGFjZS5yb290LCAncGFja2FnZS5qc29uJykpO1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgcHJvalBrZyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IFtcbiAgICAgIC9eQGFuZ3VsYXJcXC8uKi8sXG4gICAgICAvXkBhbmd1bGFyLWRldmtpdFxcLy4qLyxcbiAgICAgIC9eQG5ndG9vbHNcXC8uKi8sXG4gICAgICAvXkBzY2hlbWF0aWNzXFwvLiovLFxuICAgICAgL15yeGpzJC8sXG4gICAgICAvXnR5cGVzY3JpcHQkLyxcbiAgICAgIC9ebmctcGFja2FnciQvLFxuICAgICAgL153ZWJwYWNrJC8sXG4gICAgXTtcblxuICAgIGNvbnN0IG1heWJlTm9kZU1vZHVsZXMgPSBmaW5kVXAoJ25vZGVfbW9kdWxlcycsIF9fZGlybmFtZSk7XG4gICAgY29uc3QgcGFja2FnZVJvb3QgPSBwcm9qUGtnXG4gICAgICA/IHBhdGgucmVzb2x2ZSh0aGlzLndvcmtzcGFjZS5yb290LCAnbm9kZV9tb2R1bGVzJylcbiAgICAgIDogbWF5YmVOb2RlTW9kdWxlcztcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtcbiAgICAgIC4uLk9iamVjdC5rZXlzKHBrZyAmJiBwa2dbJ2RlcGVuZGVuY2llcyddIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHBrZyAmJiBwa2dbJ2RldkRlcGVuZGVuY2llcyddIHx8IHt9KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHByb2pQa2cgJiYgcHJvalBrZ1snZGVwZW5kZW5jaWVzJ10gfHwge30pLFxuICAgICAgLi4uT2JqZWN0LmtleXMocHJvalBrZyAmJiBwcm9qUGtnWydkZXZEZXBlbmRlbmNpZXMnXSB8fCB7fSksXG4gICAgICBdO1xuXG4gICAgaWYgKHBhY2thZ2VSb290ICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbGwgbm9kZV9tb2R1bGVzIGFuZCBub2RlX21vZHVsZXMvQCovKlxuICAgICAgY29uc3Qgbm9kZVBhY2thZ2VOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHBhY2thZ2VSb290KVxuICAgICAgICAucmVkdWNlPHN0cmluZ1tdPigoYWNjLCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKG5hbWUuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjLmNvbmNhdChcbiAgICAgICAgICAgICAgZnMucmVhZGRpclN5bmMocGF0aC5yZXNvbHZlKHBhY2thZ2VSb290LCBuYW1lKSlcbiAgICAgICAgICAgICAgICAubWFwKHN1Yk5hbWUgPT4gbmFtZSArICcvJyArIHN1Yk5hbWUpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGFjYy5jb25jYXQobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBbXSk7XG5cbiAgICAgIHBhY2thZ2VOYW1lcy5wdXNoKC4uLm5vZGVQYWNrYWdlTmFtZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IHZlcnNpb25zID0gcGFja2FnZU5hbWVzXG4gICAgICAuZmlsdGVyKHggPT4gcGF0dGVybnMuc29tZShwID0+IHAudGVzdCh4KSkpXG4gICAgICAucmVkdWNlKChhY2MsIG5hbWUpID0+IHtcbiAgICAgICAgaWYgKG5hbWUgaW4gYWNjKSB7XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfVxuXG4gICAgICAgIGFjY1tuYW1lXSA9IHRoaXMuZ2V0VmVyc2lvbihuYW1lLCBwYWNrYWdlUm9vdCwgbWF5YmVOb2RlTW9kdWxlcyk7XG5cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sIHt9IGFzIHsgW21vZHVsZTogc3RyaW5nXTogc3RyaW5nIH0pO1xuXG4gICAgbGV0IG5nQ2xpVmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuICAgIGlmICghX19kaXJuYW1lLm1hdGNoKC9ub2RlX21vZHVsZXMvKSkge1xuICAgICAgbGV0IGdpdEJyYW5jaCA9ICc/Pyc7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBnaXRSZWZOYW1lID0gJycgKyBjaGlsZF9wcm9jZXNzLmV4ZWNTeW5jKCdnaXQgc3ltYm9saWMtcmVmIEhFQUQnLCB7Y3dkOiBfX2Rpcm5hbWV9KTtcbiAgICAgICAgZ2l0QnJhbmNoID0gcGF0aC5iYXNlbmFtZShnaXRSZWZOYW1lLnJlcGxhY2UoJ1xcbicsICcnKSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgIH1cblxuICAgICAgbmdDbGlWZXJzaW9uID0gYGxvY2FsICh2JHtwa2cudmVyc2lvbn0sIGJyYW5jaDogJHtnaXRCcmFuY2h9KWA7XG4gICAgfVxuICAgIGxldCBhbmd1bGFyQ29yZVZlcnNpb24gPSAnJztcbiAgICBjb25zdCBhbmd1bGFyU2FtZUFzQ29yZTogc3RyaW5nW10gPSBbXTtcblxuICAgIGlmIChwcm9qUGtnKSB7XG4gICAgICAvLyBGaWx0ZXIgYWxsIGFuZ3VsYXIgdmVyc2lvbnMgdGhhdCBhcmUgdGhlIHNhbWUgYXMgY29yZS5cbiAgICAgIGFuZ3VsYXJDb3JlVmVyc2lvbiA9IHZlcnNpb25zWydAYW5ndWxhci9jb3JlJ107XG4gICAgICBpZiAoYW5ndWxhckNvcmVWZXJzaW9uKSB7XG4gICAgICAgIGZvciAoY29uc3QgYW5ndWxhclBhY2thZ2Ugb2YgT2JqZWN0LmtleXModmVyc2lvbnMpKSB7XG4gICAgICAgICAgaWYgKHZlcnNpb25zW2FuZ3VsYXJQYWNrYWdlXSA9PSBhbmd1bGFyQ29yZVZlcnNpb25cbiAgICAgICAgICAgICAgJiYgYW5ndWxhclBhY2thZ2Uuc3RhcnRzV2l0aCgnQGFuZ3VsYXIvJykpIHtcbiAgICAgICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnB1c2goYW5ndWxhclBhY2thZ2UucmVwbGFjZSgvXkBhbmd1bGFyXFwvLywgJycpKTtcbiAgICAgICAgICAgIGRlbGV0ZSB2ZXJzaW9uc1thbmd1bGFyUGFja2FnZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGxpc3QgdGhlbSBpbiBhbHBoYWJldGljYWwgb3JkZXIuXG4gICAgICAgIGFuZ3VsYXJTYW1lQXNDb3JlLnNvcnQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBuYW1lUGFkID0gJyAnLnJlcGVhdChcbiAgICAgIE9iamVjdC5rZXlzKHZlcnNpb25zKS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKVswXS5sZW5ndGggKyAzLFxuICAgICk7XG4gICAgY29uc3QgYXNjaWlBcnQgPSBgXG4gICAgIF8gICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgX19fXyBfICAgICBfX19cbiAgICAvIFxcXFwgICBfIF9fICAgX18gXyBfICAgX3wgfCBfXyBfIF8gX18gICAgIC8gX19ffCB8ICAgfF8gX3xcbiAgIC8g4pazIFxcXFwgfCAnXyBcXFxcIC8gX1xcYCB8IHwgfCB8IHwvIF9cXGAgfCAnX198ICAgfCB8ICAgfCB8ICAgIHwgfFxuICAvIF9fXyBcXFxcfCB8IHwgfCAoX3wgfCB8X3wgfCB8IChffCB8IHwgICAgICB8IHxfX198IHxfX18gfCB8XG4gL18vICAgXFxcXF9cXFxcX3wgfF98XFxcXF9fLCB8XFxcXF9fLF98X3xcXFxcX18sX3xffCAgICAgICBcXFxcX19fX3xfX19fX3xfX198XG4gICAgICAgICAgICAgICAgfF9fXy9cbiAgICBgLnNwbGl0KCdcXG4nKS5tYXAoeCA9PiB0ZXJtaW5hbC5yZWQoeCkpLmpvaW4oJ1xcbicpO1xuXG4gICAgdGhpcy5sb2dnZXIuaW5mbyhhc2NpaUFydCk7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgXG4gICAgICBBbmd1bGFyIENMSTogJHtuZ0NsaVZlcnNpb259XG4gICAgICBOb2RlOiAke3Byb2Nlc3MudmVyc2lvbnMubm9kZX1cbiAgICAgIE9TOiAke3Byb2Nlc3MucGxhdGZvcm19ICR7cHJvY2Vzcy5hcmNofVxuICAgICAgQW5ndWxhcjogJHthbmd1bGFyQ29yZVZlcnNpb259XG4gICAgICAuLi4gJHthbmd1bGFyU2FtZUFzQ29yZS5yZWR1Y2U8c3RyaW5nW10+KChhY2MsIG5hbWUpID0+IHtcbiAgICAgICAgLy8gUGVyZm9ybSBhIHNpbXBsZSB3b3JkIHdyYXAgYXJvdW5kIDYwLlxuICAgICAgICBpZiAoYWNjLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIFtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsaW5lID0gKGFjY1thY2MubGVuZ3RoIC0gMV0gKyAnLCAnICsgbmFtZSk7XG4gICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDYwKSB7XG4gICAgICAgICAgYWNjLnB1c2gobmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWNjW2FjYy5sZW5ndGggLSAxXSA9IGxpbmU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSwgW10pLmpvaW4oJ1xcbi4uLiAnKX1cblxuICAgICAgUGFja2FnZSR7bmFtZVBhZC5zbGljZSg3KX1WZXJzaW9uXG4gICAgICAtLS0tLS0tJHtuYW1lUGFkLnJlcGxhY2UoLyAvZywgJy0nKX0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICR7T2JqZWN0LmtleXModmVyc2lvbnMpXG4gICAgICAgICAgLm1hcChtb2R1bGUgPT4gYCR7bW9kdWxlfSR7bmFtZVBhZC5zbGljZShtb2R1bGUubGVuZ3RoKX0ke3ZlcnNpb25zW21vZHVsZV19YClcbiAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgLmpvaW4oJ1xcbicpfVxuICAgIGAucmVwbGFjZSgvXiB7Nn0vZ20sICcnKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFZlcnNpb24oXG4gICAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICAgIHByb2plY3ROb2RlTW9kdWxlczogc3RyaW5nIHwgbnVsbCxcbiAgICBjbGlOb2RlTW9kdWxlczogc3RyaW5nIHwgbnVsbCxcbiAgKTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHByb2plY3ROb2RlTW9kdWxlcykge1xuICAgICAgICBjb25zdCBtb2R1bGVQa2cgPSByZXF1aXJlKHBhdGgucmVzb2x2ZShwcm9qZWN0Tm9kZU1vZHVsZXMsIG1vZHVsZU5hbWUsICdwYWNrYWdlLmpzb24nKSk7XG5cbiAgICAgICAgcmV0dXJuIG1vZHVsZVBrZy52ZXJzaW9uO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNsaU5vZGVNb2R1bGVzKSB7XG4gICAgICAgIGNvbnN0IG1vZHVsZVBrZyA9IHJlcXVpcmUocGF0aC5yZXNvbHZlKGNsaU5vZGVNb2R1bGVzLCBtb2R1bGVOYW1lLCAncGFja2FnZS5qc29uJykpO1xuXG4gICAgICAgIHJldHVybiBtb2R1bGVQa2cudmVyc2lvbiArICcgKGNsaS1vbmx5KSc7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgfVxuXG4gICAgcmV0dXJuICc8ZXJyb3I+JztcbiAgfVxufVxuIl19