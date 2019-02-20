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
            const resolveOptions = {
                basedir: projectRoot,
                checkGlobal: false,
                checkLocal: true,
            };
            const angularPackagePath = node_1.resolve('@angular/core/package.json', resolveOptions);
            const rxjsPackagePath = node_1.resolve('rxjs/package.json', resolveOptions);
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
}
exports.Version = Version;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvdXBncmFkZS92ZXJzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXNEO0FBQ3RELG9EQUFvRDtBQUNwRCw2QkFBNkI7QUFDN0IsbUNBQWdDO0FBR2hDLE1BQWEsT0FBTztJQUVsQixZQUFvQixXQUEwQixJQUFJO1FBQTlCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBRDFDLFlBQU8sR0FBa0IsSUFBSSxDQUFDO1FBRXBDLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLGVBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3hELENBQUM7SUFFRCxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0MsTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdDLGtCQUFrQixLQUFLLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztJQUU1QyxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsc0JBQXNCLENBQUMsS0FBYTtRQUNsQyxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsSUFB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LiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2VtVmVyIH0gZnJvbSAnc2VtdmVyJztcblxuXG5leHBvcnQgY2xhc3MgVmVyc2lvbiB7XG4gIHByaXZhdGUgX3NlbXZlcjogU2VtVmVyIHwgbnVsbCA9IG51bGw7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX3ZlcnNpb246IHN0cmluZyB8IG51bGwgPSBudWxsKSB7XG4gICAgdGhpcy5fc2VtdmVyID0gX3ZlcnNpb24gPyBuZXcgU2VtVmVyKF92ZXJzaW9uKSA6IG51bGw7XG4gIH1cblxuICBpc0FscGhhKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ2FscGhhJzsgfVxuICBpc0JldGEoKSB7IHJldHVybiB0aGlzLnF1YWxpZmllciA9PSAnYmV0YSc7IH1cbiAgaXNSZWxlYXNlQ2FuZGlkYXRlKCkgeyByZXR1cm4gdGhpcy5xdWFsaWZpZXIgPT0gJ3JjJzsgfVxuICBpc0tub3duKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbiAhPT0gbnVsbDsgfVxuXG4gIGlzTG9jYWwoKSB7IHJldHVybiB0aGlzLmlzS25vd24oKSAmJiB0aGlzLl92ZXJzaW9uICYmIHBhdGguaXNBYnNvbHV0ZSh0aGlzLl92ZXJzaW9uKTsgfVxuICBpc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG90aGVyOiBTZW1WZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fc2VtdmVyICE9PSBudWxsICYmIHRoaXMuX3NlbXZlci5jb21wYXJlKG90aGVyKSA+PSAwO1xuICB9XG5cbiAgZ2V0IG1ham9yKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLm1ham9yIDogMDsgfVxuICBnZXQgbWlub3IoKSB7IHJldHVybiB0aGlzLl9zZW12ZXIgPyB0aGlzLl9zZW12ZXIubWlub3IgOiAwOyB9XG4gIGdldCBwYXRjaCgpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wYXRjaCA6IDA7IH1cbiAgZ2V0IHF1YWxpZmllcigpIHsgcmV0dXJuIHRoaXMuX3NlbXZlciA/IHRoaXMuX3NlbXZlci5wcmVyZWxlYXNlWzBdIDogJyc7IH1cbiAgZ2V0IGV4dHJhKCkgeyByZXR1cm4gdGhpcy5fc2VtdmVyID8gdGhpcy5fc2VtdmVyLnByZXJlbGVhc2VbMV0gOiAnJzsgfVxuXG4gIHRvU3RyaW5nKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuXG4gIHN0YXRpYyBhc3NlcnRDb21wYXRpYmxlQW5ndWxhclZlcnNpb24ocHJvamVjdFJvb3Q6IHN0cmluZykge1xuICAgIGxldCBhbmd1bGFyUGtnSnNvbjtcbiAgICBsZXQgcnhqc1BrZ0pzb247XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzb2x2ZU9wdGlvbnMgPSB7XG4gICAgICAgIGJhc2VkaXI6IHByb2plY3RSb290LFxuICAgICAgICBjaGVja0dsb2JhbDogZmFsc2UsXG4gICAgICAgIGNoZWNrTG9jYWw6IHRydWUsXG4gICAgICB9O1xuICAgICAgY29uc3QgYW5ndWxhclBhY2thZ2VQYXRoID0gcmVzb2x2ZSgnQGFuZ3VsYXIvY29yZS9wYWNrYWdlLmpzb24nLCByZXNvbHZlT3B0aW9ucyk7XG4gICAgICBjb25zdCByeGpzUGFja2FnZVBhdGggPSByZXNvbHZlKCdyeGpzL3BhY2thZ2UuanNvbicsIHJlc29sdmVPcHRpb25zKTtcblxuICAgICAgYW5ndWxhclBrZ0pzb24gPSByZXF1aXJlKGFuZ3VsYXJQYWNrYWdlUGF0aCk7XG4gICAgICByeGpzUGtnSnNvbiA9IHJlcXVpcmUocnhqc1BhY2thZ2VQYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgIFlvdSBzZWVtIHRvIG5vdCBiZSBkZXBlbmRpbmcgb24gXCJAYW5ndWxhci9jb3JlXCIgYW5kL29yIFwicnhqc1wiLiBUaGlzIGlzIGFuIGVycm9yLlxuICAgICAgYCkpKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgyKTtcbiAgICB9XG5cbiAgICBpZiAoIShhbmd1bGFyUGtnSnNvbiAmJiBhbmd1bGFyUGtnSnNvblsndmVyc2lvbiddICYmIHJ4anNQa2dKc29uICYmIHJ4anNQa2dKc29uWyd2ZXJzaW9uJ10pKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICBDYW5ub3QgZGV0ZXJtaW5lIHZlcnNpb25zIG9mIFwiQGFuZ3VsYXIvY29yZVwiIGFuZC9vciBcInJ4anNcIi5cbiAgICAgICAgVGhpcyBsaWtlbHkgbWVhbnMgeW91ciBsb2NhbCBpbnN0YWxsYXRpb24gaXMgYnJva2VuLiBQbGVhc2UgcmVpbnN0YWxsIHlvdXIgcGFja2FnZXMuXG4gICAgICBgKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDIpO1xuICAgIH1cblxuICAgIGNvbnN0IGFuZ3VsYXJWZXJzaW9uID0gbmV3IFZlcnNpb24oYW5ndWxhclBrZ0pzb25bJ3ZlcnNpb24nXSk7XG4gICAgY29uc3Qgcnhqc1ZlcnNpb24gPSBuZXcgVmVyc2lvbihyeGpzUGtnSnNvblsndmVyc2lvbiddKTtcblxuICAgIGlmIChhbmd1bGFyVmVyc2lvbi5pc0xvY2FsKCkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwueWVsbG93KCdVc2luZyBhIGxvY2FsIHZlcnNpb24gb2YgYW5ndWxhci4gUHJvY2VlZGluZyB3aXRoIGNhcmUuLi4nKSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWFuZ3VsYXJWZXJzaW9uLmlzR3JlYXRlclRoYW5PckVxdWFsVG8obmV3IFNlbVZlcignNS4wLjAnKSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGVybWluYWwuYm9sZCh0ZXJtaW5hbC5yZWQodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgVGhpcyB2ZXJzaW9uIG9mIENMSSBpcyBvbmx5IGNvbXBhdGlibGUgd2l0aCBBbmd1bGFyIHZlcnNpb24gNS4wLjAgb3IgaGlnaGVyLlxuXG4gICAgICAgICAgUGxlYXNlIHZpc2l0IHRoZSBsaW5rIGJlbG93IHRvIGZpbmQgaW5zdHJ1Y3Rpb25zIG9uIGhvdyB0byB1cGRhdGUgQW5ndWxhci5cbiAgICAgICAgICBodHRwczovL2FuZ3VsYXItdXBkYXRlLWd1aWRlLmZpcmViYXNlYXBwLmNvbS9cbiAgICAgICAgYCArICdcXG4nKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDMpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBhbmd1bGFyVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzYuMC4wLXJjLjAnKSlcbiAgICAgICYmICFyeGpzVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzUuNi4wLWZvcndhcmQtY29tcGF0LjAnKSlcbiAgICAgICYmICFyeGpzVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzYuMC4wLWJldGEuMCcpKVxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcih0ZXJtaW5hbC5ib2xkKHRlcm1pbmFsLnJlZCh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGlzIHByb2plY3QgdXNlcyB2ZXJzaW9uICR7cnhqc1ZlcnNpb259IG9mIFJ4SnMsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgYnkgQW5ndWxhciB2Ni5cbiAgICAgICAgICBUaGUgb2ZmaWNpYWwgUnhKcyB2ZXJzaW9uIHRoYXQgaXMgc3VwcG9ydGVkIGlzIDUuNi4wLWZvcndhcmQtY29tcGF0LjAgYW5kIGdyZWF0ZXIuXG5cbiAgICAgICAgICBQbGVhc2UgdmlzaXQgdGhlIGxpbmsgYmVsb3cgdG8gZmluZCBpbnN0cnVjdGlvbnMgb24gaG93IHRvIHVwZGF0ZSBSeEpzLlxuICAgICAgICAgIGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL2RvY3VtZW50L2QvMTJubEx0NzFWTEtiLXozWWFTR3pVZng2bUpiYzM0bnNNWHRCeVBVTjM1Y2cvZWRpdCNcbiAgICAgICAgYCArICdcXG4nKSkpO1xuICAgICAgcHJvY2Vzcy5leGl0KDMpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBhbmd1bGFyVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzYuMC4wLXJjLjAnKSlcbiAgICAgICYmICFyeGpzVmVyc2lvbi5pc0dyZWF0ZXJUaGFuT3JFcXVhbFRvKG5ldyBTZW1WZXIoJzYuMC4wLWJldGEuMCcpKVxuICAgICkge1xuICAgICAgY29uc29sZS53YXJuKHRlcm1pbmFsLmJvbGQodGVybWluYWwucmVkKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIFRoaXMgcHJvamVjdCB1c2VzIGEgdGVtcG9yYXJ5IGNvbXBhdGliaWxpdHkgdmVyc2lvbiBvZiBSeEpzICgke3J4anNWZXJzaW9ufSkuXG5cbiAgICAgICAgICBQbGVhc2UgdmlzaXQgdGhlIGxpbmsgYmVsb3cgdG8gZmluZCBpbnN0cnVjdGlvbnMgb24gaG93IHRvIHVwZGF0ZSBSeEpzLlxuICAgICAgICAgIGh0dHBzOi8vZG9jcy5nb29nbGUuY29tL2RvY3VtZW50L2QvMTJubEx0NzFWTEtiLXozWWFTR3pVZng2bUpiYzM0bnNNWHRCeVBVTjM1Y2cvZWRpdCNcbiAgICAgICAgYCArICdcXG4nKSkpO1xuICAgIH1cbiAgfVxuXG59XG4iXX0=