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
            { compiler: '>=6.0.0-beta.0 <7.0.0', typescript: '>=2.7.0 <2.8.0' },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXBncmFkZS92ZXJzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXNEO0FBQ3RELDZCQUE2QjtBQUM3QixtQ0FBMkM7QUFDM0MsZ0RBQXVEO0FBQ3ZELGdGQUEyRTtBQUczRTtJQUVFLFlBQW9CLFdBQTBCLElBQUk7UUFBOUIsYUFBUSxHQUFSLFFBQVEsQ0FBc0I7UUFEMUMsWUFBTyxHQUFrQixJQUFJLENBQUM7UUFFcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDeEQsQ0FBQztJQUVELE9BQU8sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdDLGtCQUFrQixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsT0FBTyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFNUMsT0FBTyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsc0JBQXNCLENBQUMsS0FBYTtRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElB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QUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLGtCQUFTLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsK0VBQStFO1lBQy9FLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFRLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFBO2dDQUMxQixlQUFlLHlCQUN2QyxZQUFZLENBQUMsVUFBVSxTQUFTLFNBQVM7Ozs7O3NDQUtYLFlBQVksQ0FBQyxVQUFVOzs7T0FHdEQsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUVGO0FBOUpELDBCQThKQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBzYXRpc2ZpZXMgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5cblxuZXhwb3J0IGNsYXNzIFZlcnNpb24ge1xuICBwcml2YXRlIF9zZW12ZXI6IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF92ZXJzaW9uOiBzdHJpbmcgfCBudWxsID0gbnVsbCkge1xuICAgIHRoaXMuX3NlbXZlciA9IF92ZXJzaW9uID8gbmV3IFNlbVZlcihfdmVyc2lvbikgOiBudWxsO1xuICB9XG5cbiAgaXNBbHBoYSgpIHsgcmV0dXJuIHRoaXMucXVhbGlmaWVyID09ICdhbHBoYSc7IH1cbiAgaXNCZXRhKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ2JldGEnOyB9XG4gIGlzUmVsZWFzZUNhbmRpZGF0ZSgpIHsgcmV0dXJuIHRoaXMucXVhbGlmaWVyID09ICdyYyc7IH1cbiAgaXNLbm93bigpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb24gIT09IG51bGw7IH1cblxuICBpc0xvY2FsKCkgeyByZXR1cm4gdGhpcy5pc0tub3duKCkgJiYgdGhpcy5fdmVyc2lvbiAmJiBwYXRoLmlzQWJzb2x1dGUodGhpcy5fdmVyc2lvbik7IH1cbiAgaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhvdGhlcjogU2VtVmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbXZlciAhPT0gbnVsbCAmJiB0aGlzLl9zZW12ZXIuY29tcGFyZShvdGhlcikgPj0gMDtcbiAgfVxuXG4gIGdldCBtYWpvcigpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5tYWpvciA6IDA7IH1cbiAgZ2V0IG1pbm9yKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLm1pbm9yIDogMDsgfVxuICBnZXQgcGF0Y2goKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIucGF0Y2ggOiAwOyB9XG4gIGdldCBxdWFsaWZpZXIoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIucHJlcmVsZWFzZVswXSA6ICcnOyB9XG4gIGdldCBleHRyYSgpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wcmVyZWxlYXNlWzFdIDogJyc7IH1cblxuICB0b1N0cmluZygpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb247IH1cblxuICBzdGF0aWMgYXNzZXJ0Q29tcGF0aWJsZUFuZ3VsYXJWZXJzaW9uKHByb2plY3RSb290OiBzdHJpbmcpIHtcbiAgICBsZXQgYW5ndWxhclBrZ0pzb247XG4gICAgbGV0IHJ4anNQa2dKc29uO1xuXG4gICAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgICAgY29uc3QgYWJzb2x1dGVCYXNlID0gcGF0aC5yZXNvbHZlKGJhc2UpO1xuICAgICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUocG90ZW50aWFsKTtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICAgIGlmICghcmVsYXRpdmVQb3RlbnRpYWwuc3RhcnRzV2l0aCgnLi4nKSAmJiAhcGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlUG90ZW50aWFsKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzb2x2ZU9wdGlvbnMgPSB7IHBhdGhzOiBbIHBhdGguam9pbihwcm9qZWN0Um9vdCwgJ25vZGVfbW9kdWxlcycpLCBwcm9qZWN0Um9vdCBdIH07XG4gICAgICBjb25zdCBhbmd1bGFyUGFja2FnZVBhdGggPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NvcmUvcGFja2FnZS5qc29uJywgcmVzb2x2ZU9wdGlvbnMpO1xuICAgICAgY29uc3Qgcnhqc1BhY2thZ2VQYXRoID0gcmVxdWlyZS5yZXNvbHZlKCdyeGpzL3BhY2thZ2UuanNvbicsIHJlc29sdmVPcHRpb25zKTtcblxuICAgICAgaWYgKCFpc0luc2lkZShwcm9qZWN0Um9vdCwgYW5ndWxhclBhY2thZ2VQYXRoKVxuICAgICAgICAgIHx8ICFpc0luc2lkZShwcm9qZWN0Um9vdCwgcnhqc1BhY2thZ2VQYXRoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgIH1cblxuICAgICAgYW5ndWxhclBrZ0pzb24gPSByZXF1aXJlKGFuZ3VsYXJQYWNrYWdlUGF0aCk7XG4gICAgICByeGpzUGtnSnNvbiA9IHJlcXVpcmUocnhqc1BhY2thZ2VQYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgIFlvdSBzZWVtIHRvIG5vdCBiZSBkZXBlbmRpbmcgb24gXCJAYW5ndWxhci9jb3JlXCIgYW5kL29yIFwicnhqc1wiLiBUaGlzIGlzIGFuIGVycm9yLlxuICAgICAgYCkpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgyKTtcbiAgICB9XG5cbiAgICBpZiAoIShhbmd1bGFyUGtnSnNvbiAmJiBhbmd1bGFyUGtnSnNvblsndmVyc2lvbiddICYmIHJ4anNQa2dKc29uICYmIHJ4anNQa2dKc29uWyd2ZXJzaW9uJ10pKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICBDYW5ub3QgZGV0ZXJtaW5lIHZlcnNpb25zIG9mIFwiQGFuZ3VsYXIvY29yZVwiIGFuZC9vciBcInJ4anNcIi5cbiAgICAgICAgVGhpcyBsaWtlbHkgbWVhbnMgeW91ciBsb2NhbCBpbnN0YWxsYXRpb24gaXMgYnJva2VuLiBQbGVhc2UgcmVpbnN0YWxsIHlvdXIgcGFja2FnZXMuXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuICAgIH1cblxuICAgIGNvbnN0IGFuZ3VsYXJWZXJzaW9uID0gbmV3IFZlcnNpb24oYW5ndWxhclBrZ0pzb25bJ3ZlcnNpb24nXSk7XG4gICAgY29uc3Qgcnhqc1ZlcnNpb24gPSBuZXcgVmVyc2lvbihyeGpzUGtnSnNvblsndmVyc2lvbiddKTtcblxuICAgIGlmIChhbmd1bGFyVmVyc2lvbi5pc0xvY2FsKCkpIHtcbiAgICAgIGNvbnNvbGUud2Fybih0ZXJtaW5hbC55ZWxsb3coJ1VzaW5nIGEgbG9jYWwgdmVyc2lvbiBvZiBhbmd1bGFyLiBQcm9jZWVkaW5nIHdpdGggY2FyZS4uLicpKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc1LjAuMCcpKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGlzIHZlcnNpb24gb2YgQ0xJIGlzIG9ubHkgY29tcGF0aWJsZSB3aXRoIEFuZ3VsYXIgdmVyc2lvbiA1LjAuMCBvciBoaWdoZXIuXG5cbiAgICAgICAgICBQbGVhc2UgdmlzaXQgdGhlIGxpbmsgYmVsb3cgdG8gZmluZCBpbnN0cnVjdGlvbnMgb24gaG93IHRvIHVwZGF0ZSBBbmd1bGFyLlxuICAgICAgICAgIGh0dHBzOi8vYW5ndWxhci11cGRhdGUtZ3VpZGUuZmlyZWJhc2VhcHAuY29tL1xuICAgICAgICBgICsgJ1xcbicpKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMyk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGFuZ3VsYXJWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNi4wLjAtcmMuMCcpKVxuICAgICAgJiYgIXJ4anNWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNS42LjAtZm9yd2FyZC1jb21wYXQuMCcpKVxuICAgICAgJiYgIXJ4anNWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNi4wLjAtYmV0YS4wJykpXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFRoaXMgcHJvamVjdCB1c2VzIHZlcnNpb24gJHtyeGpzVmVyc2lvbn0gb2YgUnhKcywgd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBieSBBbmd1bGFyIHY2LlxuICAgICAgICAgIFRoZSBvZmZpY2lhbCBSeEpzIHZlcnNpb24gdGhhdCBpcyBzdXBwb3J0ZWQgaXMgNS42LjAtZm9yd2FyZC1jb21wYXQuMCBhbmQgZ3JlYXRlci5cblxuICAgICAgICAgIFBsZWFzZSB2aXNpdCB0aGUgbGluayBiZWxvdyB0byBmaW5kIGluc3RydWN0aW9ucyBvbiBob3cgdG8gdXBkYXRlIFJ4SnMuXG4gICAgICAgICAgaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xMm5sTHQ3MVZMS2ItejNZYVNHelVmeDZtSmJjMzRuc01YdEJ5UFVOMzVjZy9lZGl0I1xuICAgICAgICBgICsgJ1xcbicpKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMyk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGFuZ3VsYXJWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNi4wLjAtcmMuMCcpKVxuICAgICAgJiYgIXJ4anNWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNi4wLjAtYmV0YS4wJykpXG4gICAgKSB7XG4gICAgICBjb25zb2xlLndhcm4odGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgVGhpcyBwcm9qZWN0IHVzZXMgYSB0ZW1wb3JhcnkgY29tcGF0aWJpbGl0eSB2ZXJzaW9uIG9mIFJ4SnMgKCR7cnhqc1ZlcnNpb259KS5cblxuICAgICAgICAgIFBsZWFzZSB2aXNpdCB0aGUgbGluayBiZWxvdyB0byBmaW5kIGluc3RydWN0aW9ucyBvbiBob3cgdG8gdXBkYXRlIFJ4SnMuXG4gICAgICAgICAgaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xMm5sTHQ3MVZMS2ItejNZYVNHelVmeDZtSmJjMzRuc01YdEJ5UFVOMzVjZy9lZGl0I1xuICAgICAgICBgICsgJ1xcbicpKSk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGFzc2VydFR5cGVzY3JpcHRWZXJzaW9uKHByb2plY3RSb290OiBzdHJpbmcpIHtcbiAgICBpZiAoIWlzV2FybmluZ0VuYWJsZWQoJ3R5cGVzY3JpcHRNaXNtYXRjaCcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBjb21waWxlclZlcnNpb246IHN0cmluZywgdHNWZXJzaW9uOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGNvbXBpbGVyVmVyc2lvbiA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKHByb2plY3RSb290LCAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJykuVkVSU0lPTi5mdWxsO1xuICAgICAgdHNWZXJzaW9uID0gcmVxdWlyZVByb2plY3RNb2R1bGUocHJvamVjdFJvb3QsICd0eXBlc2NyaXB0JykudmVyc2lvbjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgIFZlcnNpb25zIG9mIEBhbmd1bGFyL2NvbXBpbGVyLWNsaSBhbmQgdHlwZXNjcmlwdCBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZC5cbiAgICAgICAgVGhlIG1vc3QgY29tbW9uIHJlYXNvbiBmb3IgdGhpcyBpcyBhIGJyb2tlbiBucG0gaW5zdGFsbC5cblxuICAgICAgICBQbGVhc2UgbWFrZSBzdXJlIHlvdXIgcGFja2FnZS5qc29uIGNvbnRhaW5zIGJvdGggQGFuZ3VsYXIvY29tcGlsZXItY2xpIGFuZCB0eXBlc2NyaXB0IGluXG4gICAgICAgIGRldkRlcGVuZGVuY2llcywgdGhlbiBkZWxldGUgbm9kZV9tb2R1bGVzIGFuZCBwYWNrYWdlLWxvY2suanNvbiAoaWYgeW91IGhhdmUgb25lKSBhbmRcbiAgICAgICAgcnVuIG5wbSBpbnN0YWxsIGFnYWluLlxuICAgICAgYCkpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgyKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZlcnNpb25Db21ib3MgPSBbXG4gICAgICB7IGNvbXBpbGVyOiAnPj0yLjMuMSA8My4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjAuMiA8Mi4zLjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj00LjAuMC1iZXRhLjAgPDUuMC4wJywgdHlwZXNjcmlwdDogJz49Mi4xLjAgPDIuNC4wJyB9LFxuICAgICAgeyBjb21waWxlcjogJz49NS4wLjAtYmV0YS4wIDw1LjEuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNC4yIDwyLjUuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTUuMS4wLWJldGEuMCA8NS4yLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjQuMiA8Mi42LjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj01LjIuMC1iZXRhLjAgPDYuMC4wJywgdHlwZXNjcmlwdDogJz49Mi40LjIgPDIuNy4wJyB9LFxuICAgICAgeyBjb21waWxlcjogJz49Ni4wLjAtYmV0YS4wIDw3LjAuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNy4wIDwyLjguMCcgfSxcbiAgICBdO1xuXG4gICAgY29uc3QgY3VycmVudENvbWJvID0gdmVyc2lvbkNvbWJvcy5maW5kKChjb21ibykgPT4gc2F0aXNmaWVzKGNvbXBpbGVyVmVyc2lvbiwgY29tYm8uY29tcGlsZXIpKTtcblxuICAgIGlmIChjdXJyZW50Q29tYm8gJiYgIXNhdGlzZmllcyh0c1ZlcnNpb24sIGN1cnJlbnRDb21iby50eXBlc2NyaXB0KSkge1xuICAgICAgLy8gRmlyc3QgbGluZSBvZiB3YXJuaW5nIGxvb2tzIHdlaXJkIGJlaW5nIHNwbGl0IGluIHR3bywgZGlzYWJsZSB0c2xpbnQgZm9yIGl0LlxuICAgICAgY29uc29sZS5sb2coKHRlcm1pbmFsLnllbGxvdygnXFxuJyArIHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAgIEBhbmd1bGFyL2NvbXBpbGVyLWNsaUAke2NvbXBpbGVyVmVyc2lvbn0gcmVxdWlyZXMgdHlwZXNjcmlwdEAnJHtcbiAgICAgICAgY3VycmVudENvbWJvLnR5cGVzY3JpcHR9JyBidXQgJHt0c1ZlcnNpb259IHdhcyBmb3VuZCBpbnN0ZWFkLlxuICAgICAgICBVc2luZyB0aGlzIHZlcnNpb24gY2FuIHJlc3VsdCBpbiB1bmRlZmluZWQgYmVoYXZpb3VyIGFuZCBkaWZmaWN1bHQgdG8gZGVidWcgcHJvYmxlbXMuXG5cbiAgICAgICAgUGxlYXNlIHJ1biB0aGUgZm9sbG93aW5nIGNvbW1hbmQgdG8gaW5zdGFsbCBhIGNvbXBhdGlibGUgdmVyc2lvbiBvZiBUeXBlU2NyaXB0LlxuXG4gICAgICAgICAgICBucG0gaW5zdGFsbCB0eXBlc2NyaXB0QCcke2N1cnJlbnRDb21iby50eXBlc2NyaXB0fSdcblxuICAgICAgICBUbyBkaXNhYmxlIHRoaXMgd2FybmluZyBydW4gXCJuZyBjb25maWcgY2xpLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCBmYWxzZVwiLlxuICAgICAgYCArICdcXG4nKSkpO1xuICAgIH1cbiAgfVxuXG59XG4iXX0=