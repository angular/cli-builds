"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
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
        try {
            angularPkgJson = require_project_module_1.requireProjectModule(projectRoot, '@angular/core/package.json');
            rxjsPkgJson = require_project_module_1.requireProjectModule(projectRoot, 'rxjs/package.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXBncmFkZS92ZXJzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0RBQXNEO0FBQ3RELCtDQUFzRDtBQUN0RCw2QkFBNkI7QUFDN0IsbUNBQTJDO0FBQzNDLGdEQUF1RDtBQUN2RCxnRkFBMkU7QUFHM0U7SUFFRSxZQUFvQixXQUEwQixJQUFJO1FBQTlCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBRDFDLFlBQU8sR0FBa0IsSUFBSSxDQUFDO1FBRXBDLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLGVBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3hELENBQUM7SUFFRCxPQUFPLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMvQyxNQUFNLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM3QyxrQkFBa0IsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRTVDLE9BQU8sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZGLHNCQUFzQixDQUFDLEtBQWE7UUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJ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QyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGtCQUFTLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRS9GLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLGtCQUFTLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsK0VBQStFO1lBQy9FLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFRLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFBO2dDQUMxQixlQUFlLHlCQUN2QyxZQUFZLENBQUMsVUFBVSxTQUFTLFNBQVM7Ozs7O3NDQUtYLFlBQVksQ0FBQyxVQUFVOzs7T0FHdEQsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUVGO0FBeklELDBCQXlJQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBmaWxlLWhlYWRlclxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyLCBzYXRpc2ZpZXMgfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgaXNXYXJuaW5nRW5hYmxlZCB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5cblxuZXhwb3J0IGNsYXNzIFZlcnNpb24ge1xuICBwcml2YXRlIF9zZW12ZXI6IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF92ZXJzaW9uOiBzdHJpbmcgfCBudWxsID0gbnVsbCkge1xuICAgIHRoaXMuX3NlbXZlciA9IF92ZXJzaW9uID8gbmV3IFNlbVZlcihfdmVyc2lvbikgOiBudWxsO1xuICB9XG5cbiAgaXNBbHBoYSgpIHsgcmV0dXJuIHRoaXMucXVhbGlmaWVyID09ICdhbHBoYSc7IH1cbiAgaXNCZXRhKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ2JldGEnOyB9XG4gIGlzUmVsZWFzZUNhbmRpZGF0ZSgpIHsgcmV0dXJuIHRoaXMucXVhbGlmaWVyID09ICdyYyc7IH1cbiAgaXNLbm93bigpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb24gIT09IG51bGw7IH1cblxuICBpc0xvY2FsKCkgeyByZXR1cm4gdGhpcy5pc0tub3duKCkgJiYgdGhpcy5fdmVyc2lvbiAmJiBwYXRoLmlzQWJzb2x1dGUodGhpcy5fdmVyc2lvbik7IH1cbiAgaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhvdGhlcjogU2VtVmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbXZlciAhPT0gbnVsbCAmJiB0aGlzLl9zZW12ZXIuY29tcGFyZShvdGhlcikgPj0gMDtcbiAgfVxuXG4gIGdldCBtYWpvcigpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5tYWpvciA6IDA7IH1cbiAgZ2V0IG1pbm9yKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLm1pbm9yIDogMDsgfVxuICBnZXQgcGF0Y2goKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIucGF0Y2ggOiAwOyB9XG4gIGdldCBxdWFsaWZpZXIoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIucHJlcmVsZWFzZVswXSA6ICcnOyB9XG4gIGdldCBleHRyYSgpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wcmVyZWxlYXNlWzFdIDogJyc7IH1cblxuICB0b1N0cmluZygpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb247IH1cblxuICBzdGF0aWMgYXNzZXJ0Q29tcGF0aWJsZUFuZ3VsYXJWZXJzaW9uKHByb2plY3RSb290OiBzdHJpbmcpIHtcbiAgICBsZXQgYW5ndWxhclBrZ0pzb247XG4gICAgbGV0IHJ4anNQa2dKc29uO1xuICAgIHRyeSB7XG4gICAgICBhbmd1bGFyUGtnSnNvbiA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKHByb2plY3RSb290LCAnQGFuZ3VsYXIvY29yZS9wYWNrYWdlLmpzb24nKTtcbiAgICAgIHJ4anNQa2dKc29uID0gcmVxdWlyZVByb2plY3RNb2R1bGUocHJvamVjdFJvb3QsICdyeGpzL3BhY2thZ2UuanNvbicpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgWW91IHNlZW0gdG8gbm90IGJlIGRlcGVuZGluZyBvbiBcIkBhbmd1bGFyL2NvcmVcIiBhbmQvb3IgXCJyeGpzXCIuIFRoaXMgaXMgYW4gZXJyb3IuXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuICAgIH1cblxuICAgIGlmICghKGFuZ3VsYXJQa2dKc29uICYmIGFuZ3VsYXJQa2dKc29uWyd2ZXJzaW9uJ10gJiYgcnhqc1BrZ0pzb24gJiYgcnhqc1BrZ0pzb25bJ3ZlcnNpb24nXSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgIENhbm5vdCBkZXRlcm1pbmUgdmVyc2lvbnMgb2YgXCJAYW5ndWxhci9jb3JlXCIgYW5kL29yIFwicnhqc1wiLlxuICAgICAgICBUaGlzIGxpa2VseSBtZWFucyB5b3VyIGxvY2FsIGluc3RhbGxhdGlvbiBpcyBicm9rZW4uIFBsZWFzZSByZWluc3RhbGwgeW91ciBwYWNrYWdlcy5cbiAgICAgIGApKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMik7XG4gICAgfVxuXG4gICAgY29uc3QgYW5ndWxhclZlcnNpb24gPSBuZXcgVmVyc2lvbihhbmd1bGFyUGtnSnNvblsndmVyc2lvbiddKTtcbiAgICBjb25zdCByeGpzVmVyc2lvbiA9IG5ldyBWZXJzaW9uKHJ4anNQa2dKc29uWyd2ZXJzaW9uJ10pO1xuXG4gICAgaWYgKGFuZ3VsYXJWZXJzaW9uLmlzTG9jYWwoKSkge1xuICAgICAgY29uc29sZS53YXJuKHRlcm1pbmFsLnllbGxvdygnVXNpbmcgYSBsb2NhbCB2ZXJzaW9uIG9mIGFuZ3VsYXIuIFByb2NlZWRpbmcgd2l0aCBjYXJlLi4uJykpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhbmd1bGFyVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzUuMC4wJykpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFRoaXMgdmVyc2lvbiBvZiBDTEkgaXMgb25seSBjb21wYXRpYmxlIHdpdGggQW5ndWxhciB2ZXJzaW9uIDUuMC4wIG9yIGhpZ2hlci5cblxuICAgICAgICAgIFBsZWFzZSB2aXNpdCB0aGUgbGluayBiZWxvdyB0byBmaW5kIGluc3RydWN0aW9ucyBvbiBob3cgdG8gdXBkYXRlIEFuZ3VsYXIuXG4gICAgICAgICAgaHR0cHM6Ly9hbmd1bGFyLXVwZGF0ZS1ndWlkZS5maXJlYmFzZWFwcC5jb20vXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc1LjYuMC1mb3J3YXJkLWNvbXBhdC4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgVGhpcyBwcm9qZWN0IHVzZXMgdmVyc2lvbiAke3J4anNWZXJzaW9ufSBvZiBSeEpzLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIgdjYuXG4gICAgICAgICAgVGhlIG9mZmljaWFsIFJ4SnMgdmVyc2lvbiB0aGF0IGlzIHN1cHBvcnRlZCBpcyA1LjYuMC1mb3J3YXJkLWNvbXBhdC4wIGFuZCBncmVhdGVyLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgzKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYW5ndWxhclZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1yYy4wJykpXG4gICAgICAmJiAhcnhqc1ZlcnNpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWxUbyhuZXcgU2VtVmVyKCc2LjAuMC1iZXRhLjAnKSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUud2Fybih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGlzIHByb2plY3QgdXNlcyBhIHRlbXBvcmFyeSBjb21wYXRpYmlsaXR5IHZlcnNpb24gb2YgUnhKcyAoJHtyeGpzVmVyc2lvbn0pLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgUnhKcy5cbiAgICAgICAgICBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzEybmxMdDcxVkxLYi16M1lhU0d6VWZ4Nm1KYmMzNG5zTVh0QnlQVU4zNWNnL2VkaXQjXG4gICAgICAgIGAgKyAnXFxuJykpKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXNzZXJ0VHlwZXNjcmlwdFZlcnNpb24ocHJvamVjdFJvb3Q6IHN0cmluZykge1xuICAgIGlmICghaXNXYXJuaW5nRW5hYmxlZCgndHlwZXNjcmlwdE1pc21hdGNoJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGNvbXBpbGVyVmVyc2lvbjogc3RyaW5nLCB0c1ZlcnNpb246IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgY29tcGlsZXJWZXJzaW9uID0gcmVxdWlyZVByb2plY3RNb2R1bGUocHJvamVjdFJvb3QsICdAYW5ndWxhci9jb21waWxlci1jbGknKS5WRVJTSU9OLmZ1bGw7XG4gICAgICB0c1ZlcnNpb24gPSByZXF1aXJlUHJvamVjdE1vZHVsZShwcm9qZWN0Um9vdCwgJ3R5cGVzY3JpcHQnKS52ZXJzaW9uO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgVmVyc2lvbnMgb2YgQGFuZ3VsYXIvY29tcGlsZXItY2xpIGFuZCB0eXBlc2NyaXB0IGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkLlxuICAgICAgICBUaGUgbW9zdCBjb21tb24gcmVhc29uIGZvciB0aGlzIGlzIGEgYnJva2VuIG5wbSBpbnN0YWxsLlxuXG4gICAgICAgIFBsZWFzZSBtYWtlIHN1cmUgeW91ciBwYWNrYWdlLmpzb24gY29udGFpbnMgYm90aCBAYW5ndWxhci9jb21waWxlci1jbGkgYW5kIHR5cGVzY3JpcHQgaW5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzLCB0aGVuIGRlbGV0ZSBub2RlX21vZHVsZXMgYW5kIHBhY2thZ2UtbG9jay5qc29uIChpZiB5b3UgaGF2ZSBvbmUpIGFuZFxuICAgICAgICBydW4gbnBtIGluc3RhbGwgYWdhaW4uXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmVyc2lvbkNvbWJvcyA9IFtcbiAgICAgIHsgY29tcGlsZXI6ICc+PTIuMy4xIDwzLjAuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuMC4yIDwyLjMuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTQuMC4wLWJldGEuMCA8NS4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjEuMCA8Mi40LjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj01LjAuMC1iZXRhLjAgPDUuMS4wJywgdHlwZXNjcmlwdDogJz49Mi40LjIgPDIuNS4wJyB9LFxuICAgICAgeyBjb21waWxlcjogJz49NS4xLjAtYmV0YS4wIDw1LjIuMCcsIHR5cGVzY3JpcHQ6ICc+PTIuNC4yIDwyLjYuMCcgfSxcbiAgICAgIHsgY29tcGlsZXI6ICc+PTUuMi4wLWJldGEuMCA8Ni4wLjAnLCB0eXBlc2NyaXB0OiAnPj0yLjQuMiA8Mi43LjAnIH0sXG4gICAgICB7IGNvbXBpbGVyOiAnPj02LjAuMC1iZXRhLjAgPDcuMC4wJywgdHlwZXNjcmlwdDogJz49Mi43LjAgPDIuOC4wJyB9LFxuICAgIF07XG5cbiAgICBjb25zdCBjdXJyZW50Q29tYm8gPSB2ZXJzaW9uQ29tYm9zLmZpbmQoKGNvbWJvKSA9PiBzYXRpc2ZpZXMoY29tcGlsZXJWZXJzaW9uLCBjb21iby5jb21waWxlcikpO1xuXG4gICAgaWYgKGN1cnJlbnRDb21ibyAmJiAhc2F0aXNmaWVzKHRzVmVyc2lvbiwgY3VycmVudENvbWJvLnR5cGVzY3JpcHQpKSB7XG4gICAgICAvLyBGaXJzdCBsaW5lIG9mIHdhcm5pbmcgbG9va3Mgd2VpcmQgYmVpbmcgc3BsaXQgaW4gdHdvLCBkaXNhYmxlIHRzbGludCBmb3IgaXQuXG4gICAgICBjb25zb2xlLmxvZygodGVybWluYWwueWVsbG93KCdcXG4nICsgdGFncy5zdHJpcEluZGVudGBcbiAgICAgICAgQGFuZ3VsYXIvY29tcGlsZXItY2xpQCR7Y29tcGlsZXJWZXJzaW9ufSByZXF1aXJlcyB0eXBlc2NyaXB0QCcke1xuICAgICAgICBjdXJyZW50Q29tYm8udHlwZXNjcmlwdH0nIGJ1dCAke3RzVmVyc2lvbn0gd2FzIGZvdW5kIGluc3RlYWQuXG4gICAgICAgIFVzaW5nIHRoaXMgdmVyc2lvbiBjYW4gcmVzdWx0IGluIHVuZGVmaW5lZCBiZWhhdmlvdXIgYW5kIGRpZmZpY3VsdCB0byBkZWJ1ZyBwcm9ibGVtcy5cblxuICAgICAgICBQbGVhc2UgcnVuIHRoZSBmb2xsb3dpbmcgY29tbWFuZCB0byBpbnN0YWxsIGEgY29tcGF0aWJsZSB2ZXJzaW9uIG9mIFR5cGVTY3JpcHQuXG5cbiAgICAgICAgICAgIG5wbSBpbnN0YWxsIHR5cGVzY3JpcHRAJyR7Y3VycmVudENvbWJvLnR5cGVzY3JpcHR9J1xuXG4gICAgICAgIFRvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHJ1biBcIm5nIGNvbmZpZyBjbGkud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoIGZhbHNlXCIuXG4gICAgICBgICsgJ1xcbicpKSk7XG4gICAgfVxuICB9XG5cbn1cbiJdfQ==