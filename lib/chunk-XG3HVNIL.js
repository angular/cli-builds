// packages/angular/cli/src/utilities/environment-options.js
var TRUTHY_VALUES = /* @__PURE__ */ new Set(["1", "true"]);
var FALSY_VALUES = /* @__PURE__ */ new Set(["0", "false"]);
function isPresent(variable) {
  return typeof variable === "string" && variable !== "";
}
function parseTristate(variable) {
  if (!isPresent(variable)) {
    return void 0;
  }
  const value = variable.toLowerCase();
  if (TRUTHY_VALUES.has(value)) {
    return true;
  }
  if (FALSY_VALUES.has(value)) {
    return false;
  }
  return void 0;
}
var analyticsDisabled = parseTristate(process.env["NG_CLI_ANALYTICS"]) === false;
var isCI = parseTristate(process.env["CI"]) === true;
var disableVersionCheck = parseTristate(process.env["NG_DISABLE_VERSION_CHECK"]) === true;
var ngDebug = parseTristate(process.env["NG_DEBUG"]) === true;
var forceAutocomplete = parseTristate(process.env["NG_FORCE_AUTOCOMPLETE"]);
var forceTty = parseTristate(process.env["NG_FORCE_TTY"]);

// packages/angular/cli/src/utilities/version.js
import { VERSION as versionString } from "#version";
var Version = class {
  full;
  major;
  minor;
  patch;
  constructor(full) {
    this.full = full;
    const [major, minor, patch] = full.split("-", 1)[0].split(".", 3);
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }
};
var VERSION = new Version(versionString);

export {
  analyticsDisabled,
  isCI,
  disableVersionCheck,
  ngDebug,
  forceAutocomplete,
  forceTty,
  VERSION
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
