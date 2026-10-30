// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-LFMAHNMZ.js")
  },
  "analytics": {
    factory: () => import("./cli-FUVA6IAK.js")
  },
  "build": {
    factory: () => import("./cli-QM7XMANJ.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-QC3FVRP5.js")
  },
  "completion": {
    factory: () => import("./cli-UXBYUAQI.js")
  },
  "config": {
    factory: () => import("./cli-CFOWNOYX.js")
  },
  "deploy": {
    factory: () => import("./cli-KMQBWNYE.js")
  },
  "e2e": {
    factory: () => import("./cli-ERIJX3AP.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-J6MBEEQT.js")
  },
  "generate": {
    factory: () => import("./cli-AZQHLQLN.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-HKLZWVAW.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-Y323ID2A.js")
  },
  "mcp": {
    factory: () => import("./cli-S5FS7MBY.js")
  },
  "new": {
    factory: () => import("./cli-BVO7IHXI.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-LMKQKH3H.js")
  },
  "serve": {
    factory: () => import("./cli-23GXDMLB.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-J7WXMVJD.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-TH7GJDH5.js")
  },
  "version": {
    factory: () => import("./cli-K4IWQ3YN.js"),
    aliases: ["v"]
  }
};
var RootCommandsAliases = Object.values(RootCommands).reduce((prev, current) => {
  current.aliases?.forEach((alias) => {
    prev[alias] = current;
  });
  return prev;
}, {});

export {
  RootCommands,
  RootCommandsAliases
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
