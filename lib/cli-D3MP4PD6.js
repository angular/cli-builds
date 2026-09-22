import {
  isNodeVersionSupported
} from "./chunk-XFL2J3CJ.js";
import {
  RootCommands
} from "./chunk-ID6R6GYM.js";
import {
  CommandModule
} from "./chunk-YM7ILCS5.js";
import {
  VERSION
} from "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/version/version-info.js
import { createRequire } from "node:module";
var PACKAGE_PATTERNS = [
  /^@angular\/.*/,
  /^@angular-devkit\/.*/,
  /^@ngtools\/.*/,
  /^@schematics\/.*/,
  /^rxjs$/,
  /^typescript$/,
  /^ng-packagr$/,
  /^vitest$/,
  /^webpack$/,
  /^zone\.js$/
];
async function gatherVersionInfo(context) {
  const workspaceRequire = createRequire(context.root + "/");
  let workspacePackage;
  try {
    workspacePackage = workspaceRequire("./package.json");
  } catch {
  }
  const allDependencies = {
    ...workspacePackage?.dependencies,
    ...workspacePackage?.devDependencies
  };
  const packageNames = new Set(Object.keys(allDependencies));
  const packages = {};
  for (const name of packageNames) {
    if (PACKAGE_PATTERNS.some((p) => p.test(name))) {
      packages[name] = {
        requested: allDependencies[name] ?? "error",
        installed: getVersion(name, workspaceRequire)
      };
    }
  }
  const angularCoreVersion = packages["@angular/core"];
  return {
    cli: {
      version: VERSION.full
    },
    framework: {
      version: angularCoreVersion?.installed
    },
    system: {
      node: {
        version: process.versions.node,
        unsupported: !isNodeVersionSupported()
      },
      os: {
        platform: process.platform,
        architecture: process.arch
      },
      packageManager: {
        name: context.packageManager.name,
        version: await context.packageManager.getVersion()
      }
    },
    packages
  };
}
function getVersion(moduleName, workspaceRequire) {
  let packageInfo;
  try {
    packageInfo = workspaceRequire(`${moduleName}/package.json`);
  } catch {
  }
  if (packageInfo) {
    return packageInfo.version;
  }
  return "<error>";
}

// packages/angular/cli/src/commands/version/cli.js
var ASCII_ART = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / \u25B3 \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `.split("\n").map((x) => colors.red(x)).join("\n");
var VersionCommandModule = class extends CommandModule {
  command = "version";
  aliases = RootCommands["version"].aliases;
  describe = "Outputs Angular CLI version.";
  /**
   * Builds the command-line options for the `ng version` command.
   * @param localYargs The `yargs` instance to configure.
   * @returns The configured `yargs` instance.
   */
  builder(localYargs) {
    return localYargs.option("json", {
      describe: "Outputs version information in JSON format.",
      type: "boolean"
    });
  }
  /**
   * The main execution logic for the `ng version` command.
   */
  async run(options) {
    const { logger } = this.context;
    const versionInfo = await gatherVersionInfo(this.context);
    if (options.json) {
      console.log(JSON.stringify(versionInfo, null, 2));
      return;
    }
    const { cli: { version: ngCliVersion }, framework, system: { node: { version: nodeVersion, unsupported: unsupportedNodeVersion }, os: { platform: os, architecture: arch }, packageManager: { name: packageManagerName, version: packageManagerVersion } }, packages } = versionInfo;
    const headerInfo = [{ label: "Angular CLI", value: ngCliVersion }];
    if (framework.version) {
      headerInfo.push({ label: "Angular", value: framework.version });
    }
    headerInfo.push({
      label: "Node.js",
      value: `${nodeVersion}${unsupportedNodeVersion ? colors.yellow(" (Unsupported)") : ""}`
    }, {
      label: "Package Manager",
      value: `${packageManagerName} ${packageManagerVersion ?? "<error>"}`
    }, { label: "Operating System", value: `${os} ${arch}` });
    const maxHeaderLabelLength = Math.max(...headerInfo.map((l) => l.label.length));
    const header = headerInfo.map(({ label, value }) => colors.bold(label.padEnd(maxHeaderLabelLength + 2)) + `: ${colors.cyan(value)}`).join("\n");
    const packageTable = this.formatPackageTable(packages);
    logger.info([ASCII_ART, header, packageTable].join("\n\n"));
    if (unsupportedNodeVersion) {
      logger.warn(`Warning: The current version of Node (${nodeVersion}) is not supported by Angular.`);
    }
  }
  /**
   * Formats the package table section of the version output.
   * @param versions A map of package names to their versions.
   * @returns A string containing the formatted package table.
   */
  formatPackageTable(versions) {
    const versionKeys = Object.keys(versions);
    if (versionKeys.length === 0) {
      return "";
    }
    const headers = {
      name: "Package",
      installed: "Installed Version",
      requested: "Requested Version"
    };
    const maxNameLength = Math.max(headers.name.length, ...versionKeys.map((key) => key.length));
    const maxInstalledLength = Math.max(headers.installed.length, ...versionKeys.map((key) => versions[key].installed.length));
    const maxRequestedLength = Math.max(headers.requested.length, ...versionKeys.map((key) => versions[key].requested.length));
    const tableRows = versionKeys.map((module) => {
      const { requested, installed } = versions[module];
      const name = module.padEnd(maxNameLength);
      const coloredInstalled = installed === "<error>" ? colors.red(installed) : colors.cyan(installed);
      const installedPadding = " ".repeat(maxInstalledLength - installed.length);
      return `\u2502 ${name} \u2502 ${coloredInstalled}${installedPadding} \u2502 ${requested.padEnd(maxRequestedLength)} \u2502`;
    }).sort();
    const top = `\u250C\u2500${"\u2500".repeat(maxNameLength)}\u2500\u252C\u2500${"\u2500".repeat(maxInstalledLength)}\u2500\u252C\u2500${"\u2500".repeat(maxRequestedLength)}\u2500\u2510`;
    const header = `\u2502 ${headers.name.padEnd(maxNameLength)} \u2502 ${headers.installed.padEnd(maxInstalledLength)} \u2502 ${headers.requested.padEnd(maxRequestedLength)} \u2502`;
    const separator = `\u251C\u2500${"\u2500".repeat(maxNameLength)}\u2500\u253C\u2500${"\u2500".repeat(maxInstalledLength)}\u2500\u253C\u2500${"\u2500".repeat(maxRequestedLength)}\u2500\u2524`;
    const bottom = `\u2514\u2500${"\u2500".repeat(maxNameLength)}\u2500\u2534\u2500${"\u2500".repeat(maxInstalledLength)}\u2500\u2534\u2500${"\u2500".repeat(maxRequestedLength)}\u2500\u2518`;
    return [top, header, separator, ...tableRows, bottom].join("\n");
  }
};
export {
  VersionCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
