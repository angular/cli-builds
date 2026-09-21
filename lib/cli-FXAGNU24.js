import {
  getCacheConfig,
  updateCacheConfig
} from "./chunk-6XIGJM7L.js";
import {
  addCommandModuleToYargs,
  demandCommandFailureMessage
} from "./chunk-G7TRU43D.js";
import {
  CommandModule,
  CommandScope
} from "./chunk-YM7ILCS5.js";
import {
  isCI
} from "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/cache/clean/cli.js
import { rm } from "node:fs/promises";
var CacheCleanModule = class extends CommandModule {
  command = "clean";
  describe = "Deletes persistent disk cache from disk.";
  scope = CommandScope.In;
  builder(localYargs) {
    return localYargs.strict();
  }
  run() {
    const { path } = getCacheConfig(this.context.workspace);
    return rm(path, {
      force: true,
      recursive: true,
      maxRetries: 3
    });
  }
};

// packages/angular/cli/src/commands/cache/info/cli.js
import * as fs from "node:fs/promises";
import { join } from "node:path";
var CacheInfoCommandModule = class extends CommandModule {
  command = "info";
  describe = "Prints persistent disk cache configuration and statistics in the console.";
  scope = CommandScope.In;
  builder(localYargs) {
    return localYargs.strict();
  }
  async run() {
    const cacheConfig = getCacheConfig(this.context.workspace);
    const { path, environment, enabled } = cacheConfig;
    const effectiveStatus = this.effectiveEnabledStatus(cacheConfig);
    const sizeOnDisk = await this.getSizeOfDirectory(path);
    const info = [
      {
        label: "Enabled",
        value: enabled ? colors.green("Yes") : colors.red("No")
      },
      {
        label: "Environment",
        value: colors.cyan(environment)
      },
      {
        label: "Path",
        value: colors.cyan(path)
      },
      {
        label: "Size on disk",
        value: colors.cyan(sizeOnDisk)
      },
      {
        label: "Effective Status",
        value: (effectiveStatus ? colors.green("Enabled") : colors.red("Disabled")) + " (current machine)"
      }
    ];
    const maxLabelLength = Math.max(...info.map((l) => l.label.length));
    const output = info.map(({ label, value }) => colors.bold(label.padEnd(maxLabelLength + 2)) + `: ${value}`).join("\n");
    this.context.logger.info(`
${colors.bold("Cache Information")}

${output}
`);
  }
  async getSizeOfDirectory(path) {
    const directoriesStack = [path];
    let size = 0;
    while (directoriesStack.length) {
      const dirPath = directoriesStack.pop();
      let entries = [];
      try {
        entries = await fs.readdir(dirPath);
      } catch {
      }
      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory()) {
          directoriesStack.push(entryPath);
        }
        size += stats.size;
      }
    }
    return this.formatSize(size);
  }
  formatSize(size) {
    if (size <= 0) {
      return "0 bytes";
    }
    const abbreviations = ["bytes", "kB", "MB", "GB"];
    const index = Math.floor(Math.log(size) / Math.log(1024));
    const roundedSize = size / Math.pow(1024, index);
    const fractionDigits = index === 0 ? 0 : 2;
    return `${roundedSize.toFixed(fractionDigits)} ${abbreviations[index]}`;
  }
  effectiveEnabledStatus(cacheConfig) {
    const { enabled, environment } = cacheConfig;
    if (enabled) {
      switch (environment) {
        case "ci":
          return isCI;
        case "local":
          return !isCI;
      }
    }
    return enabled;
  }
};

// packages/angular/cli/src/commands/cache/long-description.md
var long_description_default = 'Angular CLI saves a number of cachable operations on disk by default.\n\nWhen you re-run the same build, the build system restores the state of the previous build and re-uses previously performed operations, which decreases the time taken to build and test your applications and libraries.\n\nTo amend the default cache settings, add the `cli.cache` object to your [Workspace Configuration](reference/configs/workspace-config).\nThe object goes under `cli.cache` at the top level of the file, outside the `projects` sections.\n\n```jsonc\n{\n  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",\n  "version": 1,\n  "cli": {\n    "cache": {\n      // ...\n    },\n  },\n  "projects": {},\n}\n```\n\nFor more information, see [cache options](reference/configs/workspace-config#cache-options).\n\n### Cache environments\n\nBy default, disk cache is only enabled for local environments. The value of environment can be one of the following:\n\n- `all` - allows disk cache on all machines.\n- `local` - allows disk cache only on development machines.\n- `ci` - allows disk cache only on continuous integration (CI) systems.\n\nTo change the environment setting to `all`, run the following command:\n\n```bash\nng config cli.cache.environment all\n```\n\nFor more information, see `environment` in [cache options](reference/configs/workspace-config#cache-options).\n\n<div class="alert is-helpful">\n\nThe Angular CLI checks for the presence and value of the `CI` environment variable to determine in which environment it is running.\n\n</div>\n\n### Cache path\n\nBy default, `.angular/cache` is used as a base directory to store cache results.\n\nTo change this path to `.cache/ng`, run the following command:\n\n```bash\nng config cli.cache.path ".cache/ng"\n```\n';

// packages/angular/cli/src/commands/cache/settings/cli.js
var CacheDisableModule = class extends CommandModule {
  command = "disable";
  aliases = "off";
  describe = "Disables persistent disk cache for all projects in the workspace.";
  scope = CommandScope.In;
  builder(localYargs) {
    return localYargs;
  }
  run() {
    return updateCacheConfig(this.getWorkspaceOrThrow(), "enabled", false);
  }
};
var CacheEnableModule = class extends CommandModule {
  command = "enable";
  aliases = "on";
  describe = "Enables disk cache for all projects in the workspace.";
  scope = CommandScope.In;
  builder(localYargs) {
    return localYargs;
  }
  run() {
    return updateCacheConfig(this.getWorkspaceOrThrow(), "enabled", true);
  }
};

// packages/angular/cli/src/commands/cache/cli.js
var CacheCommandModule = class extends CommandModule {
  command = "cache";
  describe = "Configure persistent disk cache and retrieve cache statistics.";
  longDescription = long_description_default;
  scope = CommandScope.In;
  builder(localYargs) {
    const subcommands = [
      CacheEnableModule,
      CacheDisableModule,
      CacheCleanModule,
      CacheInfoCommandModule
    ].sort();
    for (const module of subcommands) {
      addCommandModuleToYargs(module, this.context);
    }
    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }
  run(_options) {
  }
};
export {
  CacheCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
