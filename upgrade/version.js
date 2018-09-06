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
const node_1 = require("@angular-devkit/core/node");
const path = require("path");
const semver_1 = require("semver");
const config_1 = require("../utilities/config");
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
            const resolveOptions = {
                basedir: projectRoot,
                checkGlobal: false,
                checkLocal: true,
            };
            const angularPackagePath = node_1.resolve('@angular/core/package.json', resolveOptions);
            const rxjsPackagePath = node_1.resolve('rxjs/package.json', resolveOptions);
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
            console.error(core_1.terminal.yellow('Using a local version of angular. Proceeding with care...'));
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
        let compilerVersion;
        let tsVersion;
        let compilerTypeScriptPeerVersion;
        try {
            const resolveOptions = {
                basedir: projectRoot,
                checkGlobal: false,
                checkLocal: true,
            };
            const compilerPackagePath = node_1.resolve('@angular/compiler-cli/package.json', resolveOptions);
            const typescriptProjectPath = node_1.resolve('typescript', resolveOptions);
            const compilerPackageInfo = require(compilerPackagePath);
            compilerVersion = compilerPackageInfo['version'];
            compilerTypeScriptPeerVersion = compilerPackageInfo['peerDependencies']['typescript'];
            tsVersion = require(typescriptProjectPath).version;
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
        // These versions do not have accurate typescript peer dependencies
        const versionCombos = [
            { compiler: '>=2.3.1 <3.0.0', typescript: '>=2.0.2 <2.3.0' },
            { compiler: '>=4.0.0-beta.0 <5.0.0', typescript: '>=2.1.0 <2.4.0' },
            { compiler: '5.0.0-beta.0 - 5.0.0-rc.2', typescript: '>=2.4.2 <2.5.0' },
        ];
        let currentCombo = versionCombos.find((combo) => semver_1.satisfies(compilerVersion, combo.compiler));
        if (!currentCombo && compilerTypeScriptPeerVersion) {
            currentCombo = { compiler: compilerVersion, typescript: compilerTypeScriptPeerVersion };
        }
        if (currentCombo && !semver_1.satisfies(tsVersion, currentCombo.typescript)) {
            // First line of warning looks weird being split in two, disable tslint for it.
            console.error((core_1.terminal.yellow('\n' + core_1.tags.stripIndent `
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXBncmFkZS92ZXJzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXNEO0FBQ3RELG9EQUFvRDtBQUNwRCw2QkFBNkI7QUFDN0IsbUNBQTJDO0FBQzNDLGdEQUF1RDtBQUd2RCxNQUFhLE9BQU87SUFFbEIsWUFBb0IsV0FBMEIsSUFBSTtRQUE5QixhQUFRLEdBQVIsUUFBUSxDQUFzQjtRQUQxQyxZQUFPLEdBQWtCLElBQUksQ0FBQztRQUVwQyxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN4RCxDQUFDO0lBRUQsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM3QyxrQkFBa0IsS0FBSyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFNUMsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLHNCQUFzQixDQUFDLEtBQWE7UUFDbEMsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkUs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QyxNQUFNLENBQUMsSUFBSSxHQUFHLFdBQUksQ0FBQyxXQUFXLENBQUE7Z0NBQzVCLGVBQWUseUJBQ3ZDLFlBQVksQ0FBQyxVQUFVLFNBQVMsU0FBUzs7Ozs7c0NBS1gsWUFBWSxDQUFDLFVBQVU7OztPQUd0RCxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUVGO0FBaExELDBCQWdMQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBzYXRpc2ZpZXMgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuXG5cbmV4cG9ydCBjbGFzcyBWZXJzaW9uIHtcbiAgcHJpdmF0ZSBfc2VtdmVyOiBTZW1WZXIgfCBudWxsID0gbnVsbDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfdmVyc2lvbjogc3RyaW5nIHwgbnVsbCA9IG51bGwpIHtcbiAgICB0aGlzLl9zZW12ZXIgPSBfdmVyc2lvbiA/IG5ldyBTZW1WZXIoX3ZlcnNpb24pIDogbnVsbDtcbiAgfVxuXG4gIGlzQWxwaGEoKSB7IHJldHVybiB0aGlzLnF1YWxpZmllciA9PSAnYWxwaGEnOyB9XG4gIGlzQmV0YSgpIHsgcmV0dXJuIHRoaXMucXVhbGlmaWVyID09ICdiZXRhJzsgfVxuICBpc1JlbGVhc2VDYW5kaWRhdGUoKSB7IHJldHVybiB0aGlzLnF1YWxpZmllciA9PSAncmMnOyB9XG4gIGlzS25vd24oKSB7IHJldHVybiB0aGlzLl92ZXJzaW9uICE9PSBudWxsOyB9XG5cbiAgaXNMb2NhbCgpIHsgcmV0dXJuIHRoaXMuaXNLbm93bigpICYmIHRoaXMuX3ZlcnNpb24gJiYgcGF0aC5pc0Fic29sdXRlKHRoaXMuX3ZlcnNpb24pOyB9XG4gIGlzR3JlYXRlclRoYW5PckVxdWFsVG8ob3RoZXI6IFNlbVZlcikge1xuICAgIHJldHVybiB0aGlzLl9zZW12ZXIgIT09IG51bGwgJiYgdGhpcy5fc2VtdmVyLmNvbXBhcmUob3RoZXIpID49IDA7XG4gIH1cblxuICBnZXQgbWFqb3IoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIubWFqb3IgOiAwOyB9XG4gIGdldCBtaW5vcigpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5taW5vciA6IDA7IH1cbiAgZ2V0IHBhdGNoKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLnBhdGNoIDogMDsgfVxuICBnZXQgcXVhbGlmaWVyKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLnByZXJlbGVhc2VbMF0gOiAnJzsgfVxuICBnZXQgZXh0cmEoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIucHJlcmVsZWFzZVsxXSA6ICcnOyB9XG5cbiAgdG9TdHJpbmcoKSB7IHJldHVybiB0aGlzLl92ZXJzaW9uOyB9XG5cbiAgc3RhdGljIGFzc2VydENvbXBhdGlibGVBbmd1bGFyVmVyc2lvbihwcm9qZWN0Um9vdDogc3RyaW5nKSB7XG4gICAgbGV0IGFuZ3VsYXJQa2dKc29uO1xuICAgIGxldCByeGpzUGtnSnNvbjtcblxuICAgIGNvbnN0IGlzSW5zaWRlID0gKGJhc2U6IHN0cmluZywgcG90ZW50aWFsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHBhdGgucmVzb2x2ZShiYXNlKTtcbiAgICAgIGNvbnN0IGFic29sdXRlUG90ZW50aWFsID0gcGF0aC5yZXNvbHZlKHBvdGVudGlhbCk7XG4gICAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc29sdmVPcHRpb25zID0ge1xuICAgICAgICBiYXNlZGlyOiBwcm9qZWN0Um9vdCxcbiAgICAgICAgY2hlY2tHbG9iYWw6IGZhbHNlLFxuICAgICAgICBjaGVja0xvY2FsOiB0cnVlLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGFuZ3VsYXJQYWNrYWdlUGF0aCA9IHJlc29sdmUoJ0Bhbmd1bGFyL2NvcmUvcGFja2FnZS5qc29uJywgcmVzb2x2ZU9wdGlvbnMpO1xuICAgICAgY29uc3Qgcnhqc1BhY2thZ2VQYXRoID0gcmVzb2x2ZSgncnhqcy9wYWNrYWdlLmpzb24nLCByZXNvbHZlT3B0aW9ucyk7XG5cbiAgICAgIGlmICghaXNJbnNpZGUocHJvamVjdFJvb3QsIGFuZ3VsYXJQYWNrYWdlUGF0aClcbiAgICAgICAgICB8fCAhaXNJbnNpZGUocHJvamVjdFJvb3QsIHJ4anNQYWNrYWdlUGF0aCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICB9XG5cbiAgICAgIGFuZ3VsYXJQa2dKc29uID0gcmVxdWlyZShhbmd1bGFyUGFja2FnZVBhdGgpO1xuICAgICAgcnhqc1BrZ0pzb24gPSByZXF1aXJlKHJ4anNQYWNrYWdlUGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICBZb3Ugc2VlbSB0byBub3QgYmUgZGVwZW5kaW5nIG9uIFwiQGFuZ3VsYXIvY29yZVwiIGFuZC9vciBcInJ4anNcIi4gVGhpcyBpcyBhbiBlcnJvci5cbiAgICAgIGApKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMik7XG4gICAgfVxuXG4gICAgaWYgKCEoYW5ndWxhclBrZ0pzb24gJiYgYW5ndWxhclBrZ0pzb25bJ3ZlcnNpb24nXSAmJiByeGpzUGtnSnNvbiAmJiByeGpzUGtnSnNvblsndmVyc2lvbiddKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgQ2Fubm90IGRldGVybWluZSB2ZXJzaW9ucyBvZiBcIkBhbmd1bGFyL2NvcmVcIiBhbmQvb3IgXCJyeGpzXCIuXG4gICAgICAgIFRoaXMgbGlrZWx5IG1lYW5zIHlvdXIgbG9jYWwgaW5zdGFsbGF0aW9uIGlzIGJyb2tlbi4gUGxlYXNlIHJlaW5zdGFsbCB5b3VyIHBhY2thZ2VzLlxuICAgICAgYCkpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgyKTtcbiAgICB9XG5cbiAgICBjb25zdCBhbmd1bGFyVmVyc2lvbiA9IG5ldyBWZXJzaW9uKGFuZ3VsYXJQa2dKc29uWyd2ZXJzaW9uJ10pO1xuICAgIGNvbnN0IHJ4anNWZXJzaW9uID0gbmV3IFZlcnNpb24ocnhqc1BrZ0pzb25bJ3ZlcnNpb24nXSk7XG5cbiAgICBpZiAoYW5ndWxhclZlcnNpb24uaXNMb2NhbCgpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLnllbGxvdygnVXNpbmcgYSBsb2NhbCB2ZXJzaW9uIG9mIGFuZ3VsYXIuIFByb2NlZWRpbmcgd2l0aCBjYXJlLi4uJykpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhbmd1bGFyVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzUuMC4wJykpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFRoaXMgdmVyc2lvbiBvZiBDTEkgaXMgb25seSBjb21wYXRpYmxlIHdpdGggQW5ndWxhciB2ZXJzaW9uIDUuMC4wIG9yIGhpZ2hlci5cblxuICAgICAgICAgIFBsZWFzZSB2aXNpdCB0aGUgbGluayBiZWxvdyB0byBmaW5kIGluc3RydWN0aW9ucyBvbiBob3cgdG8gdXBkYXRlIEFuZ3VsYXIuXG4gICAgICAgICAgaHR0cHM6Ly9hbmd1bGFyLXVwZGF0ZS1ndWlkZS5maXJlYmFzZWFwcC5jb20vXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc1LjYuMC1mb3J3YXJkLWNvbXBhdC4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgVGhpcyBwcm9qZWN0IHVzZXMgdmVyc2lvbiAke3J4anNWZXJzaW9ufSBvZiBSeEpzLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIgdjYuXG4gICAgICAgICAgVGhlIG9mZmljaWFsIFJ4SnMgdmVyc2lvbiB0aGF0IGlzIHN1cHBvcnRlZCBpcyA1LjYuMC1mb3J3YXJkLWNvbXBhdC4wIGFuZCBncmVhdGVyLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUud2Fybih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGlzIHByb2plY3QgdXNlcyBhIHRlbXBvcmFyeSBjb21wYXRpYmlsaXR5IHZlcnNpb24gb2YgUnhKcyAoJHtyeGpzVmVyc2lvbn0pLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXNzZXJ0VHlwZXNjcmlwdFZlcnNpb24ocHJvamVjdFJvb3Q6IHN0cmluZykge1xuICAgIGlmICghaXNXYXJuaW5nRW5hYmxlZCgndHlwZXNjcmlwdE1pc21hdGNoJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgY29tcGlsZXJWZXJzaW9uOiBzdHJpbmc7XG4gICAgbGV0IHRzVmVyc2lvbjogc3RyaW5nO1xuICAgIGxldCBjb21waWxlclR5cGVTY3JpcHRQZWVyVmVyc2lvbjogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNvbHZlT3B0aW9ucyA9IHtcbiAgICAgICAgYmFzZWRpcjogcHJvamVjdFJvb3QsXG4gICAgICAgIGNoZWNrR2xvYmFsOiBmYWxzZSxcbiAgICAgICAgY2hlY2tMb2NhbDogdHJ1ZSxcbiAgICAgIH07XG4gICAgICBjb25zdCBjb21waWxlclBhY2thZ2VQYXRoID0gcmVzb2x2ZSgnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3BhY2thZ2UuanNvbicsIHJlc29sdmVPcHRpb25zKTtcbiAgICAgIGNvbnN0IHR5cGVzY3JpcHRQcm9qZWN0UGF0aCA9IHJlc29sdmUoJ3R5cGVzY3JpcHQnLCByZXNvbHZlT3B0aW9ucyk7XG4gICAgICBjb25zdCBjb21waWxlclBhY2thZ2VJbmZvID0gcmVxdWlyZShjb21waWxlclBhY2thZ2VQYXRoKTtcblxuICAgICAgY29tcGlsZXJWZXJzaW9uID0gY29tcGlsZXJQYWNrYWdlSW5mb1sndmVyc2lvbiddO1xuICAgICAgY29tcGlsZXJUeXBlU2NyaXB0UGVlclZlcnNpb24gPSBjb21waWxlclBhY2thZ2VJbmZvWydwZWVyRGVwZW5kZW5jaWVzJ11bJ3R5cGVzY3JpcHQnXTtcbiAgICAgIHRzVmVyc2lvbiA9IHJlcXVpcmUodHlwZXNjcmlwdFByb2plY3RQYXRoKS52ZXJzaW9uO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgVmVyc2lvbnMgb2YgQGFuZ3VsYXIvY29tcGlsZXItY2xpIGFuZCB0eXBlc2NyaXB0IGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkLlxuICAgICAgICBUaGUgbW9zdCBjb21tb24gcmVhc29uIGZvciB0aGlzIGlzIGEgYnJva2VuIG5wbSBpbnN0YWxsLlxuXG4gICAgICAgIFBsZWFzZSBtYWtlIHN1cmUgeW91ciBwYWNrYWdlLmpzb24gY29udGFpbnMgYm90aCBAYW5ndWxhci9jb21waWxlci1jbGkgYW5kIHR5cGVzY3JpcHQgaW5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzLCB0aGVuIGRlbGV0ZSBub2RlX21vZHVsZXMgYW5kIHBhY2thZ2UtbG9jay5qc29uIChpZiB5b3UgaGF2ZSBvbmUpIGFuZFxuICAgICAgICBydW4gbnBtIGluc3RhbGwgYWdhaW4uXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgdmVyc2lvbnMgZG8gbm90IGhhdmUgYWNjdXJhdGUgdHlwZXNjcmlwdCBwZWVyIGRlcGVuZGVuY2llc1xuICAgIGNvbnN0IHZlcnNpb25Db21ib3MgPSBbXG4gICAgICB7IGNvbXBpbGVyOiAnPj0yLjMuMSA8My4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjAuMiA8Mi4zLjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj00LjAuMC1iZXRhLjAgPDUuMC4wJywgdHlwZXNjcmlwdDogJz49Mi4xLjAgPDIuNC4wJyB9LFxuICAgICAgeyBjb21waWxlcjogJzUuMC4wLWJldGEuMCAtIDUuMC4wLXJjLjInLCB0eXBlc2NyaXB0OiAnPj0yLjQuMiA8Mi41LjAnIH0sXG4gICAgXTtcblxuICAgIGxldCBjdXJyZW50Q29tYm8gPSB2ZXJzaW9uQ29tYm9zLmZpbmQoKGNvbWJvKSA9PiBzYXRpc2ZpZXMoY29tcGlsZXJWZXJzaW9uLCBjb21iby5jb21waWxlcikpO1xuICAgIGlmICghY3VycmVudENvbWJvICYmIGNvbXBpbGVyVHlwZVNjcmlwdFBlZXJWZXJzaW9uKSB7XG4gICAgICBjdXJyZW50Q29tYm8gPSB7IGNvbXBpbGVyOiBjb21waWxlclZlcnNpb24sIHR5cGVzY3JpcHQ6IGNvbXBpbGVyVHlwZVNjcmlwdFBlZXJWZXJzaW9uIH07XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRDb21ibyAmJiAhc2F0aXNmaWVzKHRzVmVyc2lvbiwgY3VycmVudENvbWJvLnR5cGVzY3JpcHQpKSB7XG4gICAgICAvLyBGaXJzdCBsaW5lIG9mIHdhcm5pbmcgbG9va3Mgd2VpcmQgYmVpbmcgc3BsaXQgaW4gdHdvLCBkaXNhYmxlIHRzbGludCBmb3IgaXQuXG4gICAgICBjb25zb2xlLmVycm9yKCh0ZXJtaW5hbC55ZWxsb3coJ1xcbicgKyB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgICBAYW5ndWxhci9jb21waWxlci1jbGlAJHtjb21waWxlclZlcnNpb259IHJlcXVpcmVzIHR5cGVzY3JpcHRAJyR7XG4gICAgICAgIGN1cnJlbnRDb21iby50eXBlc2NyaXB0fScgYnV0ICR7dHNWZXJzaW9ufSB3YXMgZm91bmQgaW5zdGVhZC5cbiAgICAgICAgVXNpbmcgdGhpcyB2ZXJzaW9uIGNhbiByZXN1bHQgaW4gdW5kZWZpbmVkIGJlaGF2aW91ciBhbmQgZGlmZmljdWx0IHRvIGRlYnVnIHByb2JsZW1zLlxuXG4gICAgICAgIFBsZWFzZSBydW4gdGhlIGZvbGxvd2luZyBjb21tYW5kIHRvIGluc3RhbGwgYSBjb21wYXRpYmxlIHZlcnNpb24gb2YgVHlwZVNjcmlwdC5cblxuICAgICAgICAgICAgbnBtIGluc3RhbGwgdHlwZXNjcmlwdEAnJHtjdXJyZW50Q29tYm8udHlwZXNjcmlwdH0nXG5cbiAgICAgICAgVG8gZGlzYWJsZSB0aGlzIHdhcm5pbmcgcnVuIFwibmcgY29uZmlnIGNsaS53YXJuaW5ncy50eXBlc2NyaXB0TWlzbWF0Y2ggZmFsc2VcIi5cbiAgICAgIGAgKyAnXFxuJykpKTtcbiAgICB9XG4gIH1cblxufVxuIl19