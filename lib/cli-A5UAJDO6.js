import {
  CommandModule,
  CommandModuleError
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import {
  getWorkspaceRaw,
  parseJson,
  validateWorkspace
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/config/cli.js
import { randomUUID } from "node:crypto";

// packages/angular/cli/src/commands/config/long-description.md
var long_description_default = "A workspace has a single CLI configuration file, `angular.json`, at the top level.\nThe `projects` object contains a configuration object for each project in the workspace.\n\nYou can edit the configuration directly in a code editor,\nor indirectly on the command line using this command.\n\nThe configurable property names match command option names,\nexcept that in the configuration file, all names must use camelCase,\nwhile on the command line options can be given dash-case.\n\nFor further details, see [Workspace Configuration](reference/configs/workspace-config).\n\nFor configuration of CLI usage analytics, see [ng analytics](cli/analytics).\n";

// packages/angular/cli/src/commands/config/cli.js
var ConfigCommandModule = class extends CommandModule {
  command = "config [json-path] [value]";
  describe = "Retrieves or sets Angular configuration values in the angular.json file for the workspace.";
  longDescription = long_description_default;
  builder(localYargs) {
    return localYargs.positional("json-path", {
      description: `The configuration key to set or query, in JSON path format. For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
      type: "string"
    }).positional("value", {
      description: "If provided, a new value for the given configuration key.",
      type: "string"
    }).option("global", {
      description: `Access the global configuration in the caller's home directory.`,
      alias: ["g"],
      type: "boolean",
      default: false
    }).strict();
  }
  async run(options) {
    const level = options.global ? "global" : "local";
    const [config] = await getWorkspaceRaw(level);
    if (options.value == void 0) {
      if (!config) {
        this.context.logger.error("No config found.");
        return 1;
      }
      return this.get(config, options);
    } else {
      return this.set(options);
    }
  }
  get(jsonFile, options) {
    const { logger } = this.context;
    const value = options.jsonPath ? jsonFile.get(parseJsonPath(options.jsonPath)) : jsonFile.content;
    if (value === void 0) {
      logger.error("Value cannot be found.");
      return 1;
    } else if (typeof value === "string") {
      logger.info(value);
    } else {
      logger.info(JSON.stringify(value, null, 2));
    }
    return 0;
  }
  async set(options) {
    if (!options.jsonPath?.trim()) {
      throw new CommandModuleError("Invalid Path.");
    }
    const [config, configPath] = await getWorkspaceRaw(options.global ? "global" : "local");
    const { logger } = this.context;
    if (!config || !configPath) {
      throw new CommandModuleError("Confguration file cannot be found.");
    }
    const normalizeUUIDValue = (v) => v === "" ? randomUUID() : `${v}`;
    const value = options.jsonPath === "cli.analyticsSharing.uuid" ? normalizeUUIDValue(options.value) : options.value;
    const modified = config.modify(parseJsonPath(options.jsonPath), normalizeValue(value));
    if (!modified) {
      logger.error("Value cannot be found.");
      return 1;
    }
    await validateWorkspace(parseJson(config.content), options.global ?? false);
    config.save();
    return 0;
  }
};
function parseJsonPath(path) {
  const fragments = (path || "").split(/\./g);
  const result = [];
  while (fragments.length > 0) {
    const fragment = fragments.shift();
    if (fragment == void 0) {
      break;
    }
    const match = fragment.match(/([^[]+)((\[.*\])*)/);
    if (!match) {
      throw new CommandModuleError("Invalid JSON path.");
    }
    result.push(match[1]);
    if (match[2]) {
      const indices = match[2].slice(1, -1).split("][").map((x) => /^\d$/.test(x) ? +x : x.replace(/"|'/g, ""));
      result.push(...indices);
    }
  }
  return result.filter((fragment) => fragment != null);
}
function normalizeValue(value) {
  const valueString = `${value}`.trim();
  switch (valueString) {
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return null;
    case "undefined":
      return void 0;
  }
  if (isFinite(+valueString)) {
    return +valueString;
  }
  try {
    return JSON.parse(valueString);
  } catch {
    return value;
  }
}
export {
  ConfigCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
