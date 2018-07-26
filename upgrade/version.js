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
const path = require("path");
const semver_1 = require("semver");
const config_1 = require("../utilities/config");
const require_project_module_1 = require("../utilities/require-project-module");
class Version {
    constructor(_version = null) {
        this._version = _version;
        this._semver = null;
        this._semver = _version ? new semver_1.SemVer(_version) : null;
    }
    isAlpha() { return this.qualifier == 'alpha'; }
    isBeta() { return this.qualifier == 'beta'; }
    isReleaseCandidate() { return this.qualifier == 'rc'; }
    isKnown() { return this._version !== null; }
    isLocal() { return this.isKnown() && this._version && path.isAbsolute(this._version); }
    isGreaterThanOrEqualTo(other) {
        return this._semver !== null && this._semver.compare(other) >= 0;
    }
    get major() { return this._semver ? this._semver.major : 0; }
    get minor() { return this._semver ? this._semver.minor : 0; }
    get patch() { return this._semver ? this._semver.patch : 0; }
    get qualifier() { return this._semver ? this._semver.prerelease[0] : ''; }
    get extra() { return this._semver ? this._semver.prerelease[1] : ''; }
    toString() { return this._version; }
    static assertCompatibleAngularVersion(projectRoot) {
        let angularPkgJson;
        let rxjsPkgJson;
        const isInside = (base, potential) => {
            const absoluteBase = path.resolve(base);
            const absolutePotential = path.resolve(potential);
            const relativePotential = path.relative(absoluteBase, absolutePotential);
            if (!relativePotential.startsWith('..') && !path.isAbsolute(relativePotential)) {
                return true;
            }
            return false;
        };
        try {
            const resolveOptions = { paths: [path.join(projectRoot, 'node_modules'), projectRoot] };
            const angularPackagePath = require.resolve('@angular/core/package.json', resolveOptions);
            const rxjsPackagePath = require.resolve('rxjs/package.json', resolveOptions);
            if (!isInside(projectRoot, angularPackagePath)
                || !isInside(projectRoot, rxjsPackagePath)) {
                throw new Error();
            }
            angularPkgJson = require(angularPackagePath);
            rxjsPkgJson = require(rxjsPackagePath);
        }
        catch (_a) {
            console.error(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
        You seem to not be depending on "@angular/core" and/or "rxjs". This is an error.
      `)));
            process.exit(2);
        }
        if (!(angularPkgJson && angularPkgJson['version'] && rxjsPkgJson && rxjsPkgJson['version'])) {
            console.error(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
        Cannot determine versions of "@angular/core" and/or "rxjs".
        This likely means your local installation is broken. Please reinstall your packages.
      `)));
            process.exit(2);
        }
        const angularVersion = new Version(angularPkgJson['version']);
        const rxjsVersion = new Version(rxjsPkgJson['version']);
        if (angularVersion.isLocal()) {
            console.warn(core_1.terminal.yellow('Using a local version of angular. Proceeding with care...'));
            return;
        }
        if (!angularVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('5.0.0'))) {
            console.error(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
          This version of CLI is only compatible with Angular version 5.0.0 or higher.

          Please visit the link below to find instructions on how to update Angular.
          https://angular-update-guide.firebaseapp.com/
        ` + '\n')));
            process.exit(3);
        }
        else if (angularVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('6.0.0-rc.0'))
            && !rxjsVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('5.6.0-forward-compat.0'))
            && !rxjsVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('6.0.0-beta.0'))) {
            console.error(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
          This project uses version ${rxjsVersion} of RxJs, which is not supported by Angular v6.
          The official RxJs version that is supported is 5.6.0-forward-compat.0 and greater.

          Please visit the link below to find instructions on how to update RxJs.
          https://docs.google.com/document/d/12nlLt71VLKb-z3YaSGzUfx6mJbc34nsMXtByPUN35cg/edit#
        ` + '\n')));
            process.exit(3);
        }
        else if (angularVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('6.0.0-rc.0'))
            && !rxjsVersion.isGreaterThanOrEqualTo(new semver_1.SemVer('6.0.0-beta.0'))) {
            console.warn(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
          This project uses a temporary compatibility version of RxJs (${rxjsVersion}).

          Please visit the link below to find instructions on how to update RxJs.
          https://docs.google.com/document/d/12nlLt71VLKb-z3YaSGzUfx6mJbc34nsMXtByPUN35cg/edit#
        ` + '\n')));
        }
    }
    static assertTypescriptVersion(projectRoot) {
        if (!config_1.isWarningEnabled('typescriptMismatch')) {
            return;
        }
        let compilerVersion, tsVersion;
        try {
            compilerVersion = require_project_module_1.requireProjectModule(projectRoot, '@angular/compiler-cli').VERSION.full;
            tsVersion = require_project_module_1.requireProjectModule(projectRoot, 'typescript').version;
        }
        catch (_a) {
            console.error(core_1.terminal.bold(core_1.terminal.red(core_1.tags.stripIndents `
        Versions of @angular/compiler-cli and typescript could not be determined.
        The most common reason for this is a broken npm install.

        Please make sure your package.json contains both @angular/compiler-cli and typescript in
        devDependencies, then delete node_modules and package-lock.json (if you have one) and
        run npm install again.
      `)));
            process.exit(2);
            return;
        }
        const versionCombos = [
            { compiler: '>=2.3.1 <3.0.0', typescript: '>=2.0.2 <2.3.0' },
            { compiler: '>=4.0.0-beta.0 <5.0.0', typescript: '>=2.1.0 <2.4.0' },
            { compiler: '>=5.0.0-beta.0 <5.1.0', typescript: '>=2.4.2 <2.5.0' },
            { compiler: '>=5.1.0-beta.0 <5.2.0', typescript: '>=2.4.2 <2.6.0' },
            { compiler: '>=5.2.0-beta.0 <6.0.0', typescript: '>=2.4.2 <2.7.0' },
            { compiler: '>=6.0.0-beta.0 <6.1.0-beta.0', typescript: '>=2.7.0 <2.8.0' },
            { compiler: '>=6.1.0-beta.0 <6.1.0-rc.0', typescript: '>=2.7.2 <2.9.0' },
            { compiler: '>=6.1.0-rc.0 <7.0.0', typescript: '>=2.7.2 <2.10.0' },
        ];
        const currentCombo = versionCombos.find((combo) => semver_1.satisfies(compilerVersion, combo.compiler));
        if (currentCombo && !semver_1.satisfies(tsVersion, currentCombo.typescript)) {
            // First line of warning looks weird being split in two, disable tslint for it.
            console.log((core_1.terminal.yellow('\n' + core_1.tags.stripIndent `
        @angular/compiler-cli@${compilerVersion} requires typescript@'${currentCombo.typescript}' but ${tsVersion} was found instead.
        Using this version can result in undefined behaviour and difficult to debug problems.

        Please run the following command to install a compatible version of TypeScript.

            npm install typescript@'${currentCombo.typescript}'

        To disable this warning run "ng config cli.warnings.typescriptMismatch false".
      ` + '\n')));
        }
    }
}
exports.Version = Version;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXBncmFkZS92ZXJzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXNEO0FBQ3RELDZCQUE2QjtBQUM3QixtQ0FBMkM7QUFDM0MsZ0RBQXVEO0FBQ3ZELGdGQUEyRTtBQUczRTtJQUVFLFlBQW9CLFdBQTBCLElBQUk7UUFBOUIsYUFBUSxHQUFSLFFBQVEsQ0FBc0I7UUFEMUMsWUFBTyxHQUFrQixJQUFJLENBQUM7UUFFcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDeEQsQ0FBQztJQUVELE9BQU8sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdDLGtCQUFrQixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsT0FBTyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFNUMsT0FBTyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsc0JBQXNCLENBQUMsS0FBYTtRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElB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LEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsa0JBQVMsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFL0YsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsa0JBQVMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSwrRUFBK0U7WUFDL0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLFdBQUksQ0FBQyxXQUFXLENBQUE7Z0NBQzFCLGVBQWUseUJBQ3ZDLFlBQVksQ0FBQyxVQUFVLFNBQVMsU0FBUzs7Ozs7c0NBS1gsWUFBWSxDQUFDLFVBQVU7OztPQUd0RCxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0NBRUY7QUFoS0QsMEJBZ0tDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTZW1WZXIsIHNhdGlzZmllcyB9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBpc1dhcm5pbmdFbmFibGVkIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcblxuXG5leHBvcnQgY2xhc3MgVmVyc2lvbiB7XG4gIHByaXZhdGUgX3NlbXZlcjogU2VtVmVyIHwgbnVsbCA9IG51bGw7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX3ZlcnNpb246IHN0cmluZyB8IG51bGwgPSBudWxsKSB7XG4gICAgdGhpcy5fc2VtdmVyID0gX3ZlcnNpb24gPyBuZXcgU2VtVmVyKF92ZXJzaW9uKSA6IG51bGw7XG4gIH1cblxuICBpc0FscGhhKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ2FscGhhJzsgfVxuICBpc0JldGEoKSB7IHJldHVybiB0aGlzLnF1YWxpZmllciA9PSAnYmV0YSc7IH1cbiAgaXNSZWxlYXNlQ2FuZGlkYXRlKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ3JjJzsgfVxuICBpc0tub3duKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbiAhPT0gbnVsbDsgfVxuXG4gIGlzTG9jYWwoKSB7IHJldHVybiB0aGlzLmlzS25vd24oKSAmJiB0aGlzLl92ZXJzaW9uICYmIHBhdGguaXNBYnNvbHV0ZSh0aGlzLl92ZXJzaW9uKTsgfVxuICBpc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG90aGVyOiBTZW1WZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fc2VtdmVyICE9PSBudWxsICYmIHRoaXMuX3NlbXZlci5jb21wYXJlKG90aGVyKSA+PSAwO1xuICB9XG5cbiAgZ2V0IG1ham9yKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLm1ham9yIDogMDsgfVxuICBnZXQgbWlub3IoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIubWlub3IgOiAwOyB9XG4gIGdldCBwYXRjaCgpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wYXRjaCA6IDA7IH1cbiAgZ2V0IHF1YWxpZmllcigpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wcmVyZWxlYXNlWzBdIDogJyc7IH1cbiAgZ2V0IGV4dHJhKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLnByZXJlbGVhc2VbMV0gOiAnJzsgfVxuXG4gIHRvU3RyaW5nKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuXG4gIHN0YXRpYyBhc3NlcnRDb21wYXRpYmxlQW5ndWxhclZlcnNpb24ocHJvamVjdFJvb3Q6IHN0cmluZykge1xuICAgIGxldCBhbmd1bGFyUGtnSnNvbjtcbiAgICBsZXQgcnhqc1BrZ0pzb247XG5cbiAgICBjb25zdCBpc0luc2lkZSA9IChiYXNlOiBzdHJpbmcsIHBvdGVudGlhbDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICBjb25zdCBhYnNvbHV0ZUJhc2UgPSBwYXRoLnJlc29sdmUoYmFzZSk7XG4gICAgICBjb25zdCBhYnNvbHV0ZVBvdGVudGlhbCA9IHBhdGgucmVzb2x2ZShwb3RlbnRpYWwpO1xuICAgICAgY29uc3QgcmVsYXRpdmVQb3RlbnRpYWwgPSBwYXRoLnJlbGF0aXZlKGFic29sdXRlQmFzZSwgYWJzb2x1dGVQb3RlbnRpYWwpO1xuICAgICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNvbHZlT3B0aW9ucyA9IHsgcGF0aHM6IFsgcGF0aC5qb2luKHByb2plY3RSb290LCAnbm9kZV9tb2R1bGVzJyksIHByb2plY3RSb290IF0gfTtcbiAgICAgIGNvbnN0IGFuZ3VsYXJQYWNrYWdlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY29yZS9wYWNrYWdlLmpzb24nLCByZXNvbHZlT3B0aW9ucyk7XG4gICAgICBjb25zdCByeGpzUGFja2FnZVBhdGggPSByZXF1aXJlLnJlc29sdmUoJ3J4anMvcGFja2FnZS5qc29uJywgcmVzb2x2ZU9wdGlvbnMpO1xuXG4gICAgICBpZiAoIWlzSW5zaWRlKHByb2plY3RSb290LCBhbmd1bGFyUGFja2FnZVBhdGgpXG4gICAgICAgICAgfHwgIWlzSW5zaWRlKHByb2plY3RSb290LCByeGpzUGFja2FnZVBhdGgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuXG4gICAgICBhbmd1bGFyUGtnSnNvbiA9IHJlcXVpcmUoYW5ndWxhclBhY2thZ2VQYXRoKTtcbiAgICAgIHJ4anNQa2dKc29uID0gcmVxdWlyZShyeGpzUGFja2FnZVBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgWW91IHNlZW0gdG8gbm90IGJlIGRlcGVuZGluZyBvbiBcIkBhbmd1bGFyL2NvcmVcIiBhbmQvb3IgXCJyeGpzXCIuIFRoaXMgaXMgYW4gZXJyb3IuXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuICAgIH1cblxuICAgIGlmICghKGFuZ3VsYXJQa2dKc29uICYmIGFuZ3VsYXJQa2dKc29uWyd2ZXJzaW9uJ10gJiYgcnhqc1BrZ0pzb24gJiYgcnhqc1BrZ0pzb25bJ3ZlcnNpb24nXSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgIENhbm5vdCBkZXRlcm1pbmUgdmVyc2lvbnMgb2YgXCJAYW5ndWxhci9jb3JlXCIgYW5kL29yIFwicnhqc1wiLlxuICAgICAgICBUaGlzIGxpa2VseSBtZWFucyB5b3VyIGxvY2FsIGluc3RhbGxhdGlvbiBpcyBicm9rZW4uIFBsZWFzZSByZWluc3RhbGwgeW91ciBwYWNrYWdlcy5cbiAgICAgIGApKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMik7XG4gICAgfVxuXG4gICAgY29uc3QgYW5ndWxhclZlcnNpb24gPSBuZXcgVmVyc2lvbihhbmd1bGFyUGtnSnNvblsndmVyc2lvbiddKTtcbiAgICBjb25zdCByeGpzVmVyc2lvbiA9IG5ldyBWZXJzaW9uKHJ4anNQa2dKc29uWyd2ZXJzaW9uJ10pO1xuXG4gICAgaWYgKGFuZ3VsYXJWZXJzaW9uLmlzTG9jYWwoKSkge1xuICAgICAgY29uc29sZS53YXJuKHRlcm1pbmFsLnllbGxvdygnVXNpbmcgYSBsb2NhbCB2ZXJzaW9uIG9mIGFuZ3VsYXIuIFByb2NlZWRpbmcgd2l0aCBjYXJlLi4uJykpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhbmd1bGFyVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzUuMC4wJykpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFRoaXMgdmVyc2lvbiBvZiBDTEkgaXMgb25seSBjb21wYXRpYmxlIHdpdGggQW5ndWxhciB2ZXJzaW9uIDUuMC4wIG9yIGhpZ2hlci5cblxuICAgICAgICAgIFBsZWFzZSB2aXNpdCB0aGUgbGluayBiZWxvdyB0byBmaW5kIGluc3RydWN0aW9ucyBvbiBob3cgdG8gdXBkYXRlIEFuZ3VsYXIuXG4gICAgICAgICAgaHR0cHM6Ly9hbmd1bGFyLXVwZGF0ZS1ndWlkZS5maXJlYmFzZWFwcC5jb20vXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc1LjYuMC1mb3J3YXJkLWNvbXBhdC4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgVGhpcyBwcm9qZWN0IHVzZXMgdmVyc2lvbiAke3J4anNWZXJzaW9ufSBvZiBSeEpzLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIgdjYuXG4gICAgICAgICAgVGhlIG9mZmljaWFsIFJ4SnMgdmVyc2lvbiB0aGF0IGlzIHN1cHBvcnRlZCBpcyA1LjYuMC1mb3J3YXJkLWNvbXBhdC4wIGFuZCBncmVhdGVyLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUud2Fybih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGlzIHByb2plY3QgdXNlcyBhIHRlbXBvcmFyeSBjb21wYXRpYmlsaXR5IHZlcnNpb24gb2YgUnhKcyAoJHtyeGpzVmVyc2lvbn0pLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXNzZXJ0VHlwZXNjcmlwdFZlcnNpb24ocHJvamVjdFJvb3Q6IHN0cmluZykge1xuICAgIGlmICghaXNXYXJuaW5nRW5hYmxlZCgndHlwZXNjcmlwdE1pc21hdGNoJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGNvbXBpbGVyVmVyc2lvbjogc3RyaW5nLCB0c1ZlcnNpb246IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgY29tcGlsZXJWZXJzaW9uID0gcmVxdWlyZVByb2plY3RNb2R1bGUocHJvamVjdFJvb3QsICdAYW5ndWxhci9jb21waWxlci1jbGknKS5WRVJTSU9OLmZ1bGw7XG4gICAgICB0c1ZlcnNpb24gPSByZXF1aXJlUHJvamVjdE1vZHVsZShwcm9qZWN0Um9vdCwgJ3R5cGVzY3JpcHQnKS52ZXJzaW9uO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgVmVyc2lvbnMgb2YgQGFuZ3VsYXIvY29tcGlsZXItY2xpIGFuZCB0eXBlc2NyaXB0IGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkLlxuICAgICAgICBUaGUgbW9zdCBjb21tb24gcmVhc29uIGZvciB0aGlzIGlzIGEgYnJva2VuIG5wbSBpbnN0YWxsLlxuXG4gICAgICAgIFBsZWFzZSBtYWtlIHN1cmUgeW91ciBwYWNrYWdlLmpzb24gY29udGFpbnMgYm90aCBAYW5ndWxhci9jb21waWxlci1jbGkgYW5kIHR5cGVzY3JpcHQgaW5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzLCB0aGVuIGRlbGV0ZSBub2RlX21vZHVsZXMgYW5kIHBhY2thZ2UtbG9jay5qc29uIChpZiB5b3UgaGF2ZSBvbmUpIGFuZFxuICAgICAgICBydW4gbnBtIGluc3RhbGwgYWdhaW4uXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmVyc2lvbkNvbWJvcyA9IFtcbiAgICAgIHsgY29tcGlsZXI6ICc+PTIuMy4xIDwzLjAuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuMC4yIDwyLjMuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTQuMC4wLWJldGEuMCA8NS4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjEuMCA8Mi40LjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj01LjAuMC1iZXRhLjAgPDUuMS4wJywgdHlwZXNjcmlwdDogJz49Mi40LjIgPDIuNS4wJyB9LFxuICAgICAgeyBjb21waWxlcjogJz49NS4xLjAtYmV0YS4wIDw1LjIuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNC4yIDwyLjYuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTUuMi4wLWJldGEuMCA8Ni4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjQuMiA8Mi43LjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj02LjAuMC1iZXRhLjAgPDYuMS4wLWJldGEuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNy4wIDwyLjguMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTYuMS4wLWJldGEuMCA8Ni4xLjAtcmMuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNy4yIDwyLjkuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTYuMS4wLXJjLjAgPDcuMC4wJywgdHlwZXNjcmlwdDogJz49Mi43LjIgPDIuMTAuMCcgfSxcbiAgICBdO1xuXG4gICAgY29uc3QgY3VycmVudENvbWJvID0gdmVyc2lvbkNvbWJvcy5maW5kKChjb21ibykgPT4gc2F0aXNmaWVzKGNvbXBpbGVyVmVyc2lvbiwgY29tYm8uY29tcGlsZXIpKTtcblxuICAgIGlmIChjdXJyZW50Q29tYm8gJiYgIXNhdGlzZmllcyh0c1ZlcnNpb24sIGN1cnJlbnRDb21iby50eXBlc2NyaXB0KSkge1xuICAgICAgLy8gRmlyc3QgbGluZSBvZiB3YXJuaW5nIGxvb2tzIHdlaXJkIGJlaW5nIHNwbGl0IGluIHR3bywgZGlzYWJsZSB0c2xpbnQgZm9yIGl0LlxuICAgICAgY29uc29sZS5sb2coKHRlcm1pbmFsLnllbGxvdygnXFxuJyArIHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAke2NvbXBpbGVyVmVyc2lvbn0gcmVxdWlyZXMgdHlwZXNjcmlwdEAnJHtcbiAgICAgICAgY3VycmVudENvbWJvLnR5cGVzY3JpcHR9JyBidXQgJHt0c1ZlcnNpb259IHdhcyBmb3VuZCBpbnN0ZWFkLlxuICAgICAgICBVc2luZyB0aGlzIHZlcnNpb24gY2FuIHJlc3VsdCBpbiB1bmRlZmluZWQgYmVoYXZpb3VyIGFuZCBkaWZmaWN1bHQgdG8gZGVidWcgcHJvYmxlbXMuXG5cbiAgICAgICAgUGxlYXNlIHJ1biB0aGUgZm9sbG93aW5nIGNvbW1hbmQgdG8gaW5zdGFsbCBhIGNvbXBhdGlibGUgdmVyc2lvbiBvZiBUeXBlU2NyaXB0LlxuXG4gICAgICAgICAgICBucG0gaW5zdGFsbCB0eXBlc2NyaXB0QCcke2N1cnJlbnRDb21iby50eXBlc2NyaXB0fSdcblxuICAgICAgICBUbyBkaXNhYmxlIHRoaXMgd2FybmluZyBydW4gXCJuZyBjb25maWcgY2xpLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCBmYWxzZVwiLlxuICAgICAgYCArICdcXG4nKSkpO1xuICAgIH1cbiAgfVxuXG59XG4iXX0=