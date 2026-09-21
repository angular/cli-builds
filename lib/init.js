import {
  VERSION,
  disableVersionCheck
} from "./chunk-XG3HVNIL.js";

// packages/angular/cli/lib/init.js
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { SemVer, major } from "semver";
var forceExit = false;
(async () => {
  if (process.platform === "win32") {
    const cwd = process.cwd();
    if (/^[a-z]:/.test(cwd)) {
      try {
        process.chdir(cwd[0].toUpperCase() + cwd.slice(1));
      } catch {
      }
    }
    process.env["NoDefaultCurrentDirectoryInExePath"] = "1";
  }
  process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1";
  const rawCommandName = process.argv[2];
  if (disableVersionCheck || rawCommandName === "new") {
    return (await import("./cli/index.js")).default;
  }
  let cli;
  try {
    const cwdRequire = createRequire(process.cwd() + "/");
    const projectLocalCli = cwdRequire.resolve("@angular/cli");
    cli = await import(pathToFileURL(projectLocalCli).href);
    const globalVersion = new SemVer(VERSION.full);
    let localVersion = cli.VERSION?.full;
    if (!localVersion) {
      try {
        const localPackageJson = await readFile(path.join(path.dirname(projectLocalCli), "../../package.json"), "utf-8");
        localVersion = JSON.parse(localPackageJson).version;
      } catch (error) {
        console.error("Version mismatch check skipped. Unable to retrieve local version: " + error);
      }
    }
    const localMajorVersion = major(localVersion);
    if (localMajorVersion > 0 && localMajorVersion < 14) {
      forceExit = true;
      if (rawCommandName === "completion") {
        return null;
      }
    }
    let isGlobalGreater = false;
    try {
      isGlobalGreater = localVersion > 0 && globalVersion.compare(localVersion) > 0;
    } catch (error) {
      console.error("Version mismatch check skipped. Unable to compare local version: " + error);
    }
    if (isGlobalGreater && rawCommandName !== "--get-yargs-completions" && rawCommandName !== "completion") {
      if (rawCommandName === "update" && cli.VERSION && cli.VERSION.major - globalVersion.major <= 1) {
        cli = await import("./cli/index.js");
      } else {
        try {
          const { isWarningEnabled } = await import("./config-QXK7SSVG.js");
          if (await isWarningEnabled("versionMismatch")) {
            const warning = `Your global Angular CLI version (${globalVersion}) is greater than your local version (${localVersion}). The local Angular CLI version is used.

To disable this warning use "ng config -g cli.warnings.versionMismatch false".`;
            const { colors } = await import("./color-SJPGXZVA.js");
            console.error(colors.yellow(warning));
          }
        } catch {
        }
      }
    }
  } catch {
    cli = await import("./cli/index.js");
  }
  let depth = 0;
  while (typeof cli === "object" && cli !== null && "default" in cli && depth++ < 3) {
    cli = cli["default"];
  }
  return cli;
})().then((cli) => cli?.({
  cliArgs: process.argv.slice(2)
})).then((exitCode = 0) => {
  if (forceExit) {
    process.exit(exitCode);
  }
  process.exitCode = exitCode;
}).catch((err) => {
  console.error("Unknown error: " + err.toString());
  process.exit(127);
});
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
