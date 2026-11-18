// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-3L6RB4ZY.js")
  },
  "analytics": {
    factory: () => import("./cli-TWY62GWE.js")
  },
  "build": {
    factory: () => import("./cli-KC6Q4UDF.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-RXAFZ6VQ.js")
  },
  "completion": {
    factory: () => import("./cli-FZ3CN5BQ.js")
  },
  "config": {
    factory: () => import("./cli-7Q64XGOD.js")
  },
  "deploy": {
    factory: () => import("./cli-6LIYU7NP.js")
  },
  "e2e": {
    factory: () => import("./cli-MYZA7VTI.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-OK6KSHRH.js")
  },
  "generate": {
    factory: () => import("./cli-4BKR2VP5.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-URUX5XXT.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-V4PTLHTE.js")
  },
  "mcp": {
    factory: () => import("./cli-Y33C2CI3.js")
  },
  "new": {
    factory: () => import("./cli-WOF24ACW.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-VZCEWLOE.js")
  },
  "serve": {
    factory: () => import("./cli-YSLFVJCM.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-UH5S63DC.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-VTLDFX2U.js")
  },
  "version": {
    factory: () => import("./cli-LTISRLX6.js"),
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
