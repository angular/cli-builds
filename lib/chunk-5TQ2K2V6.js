// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-TDGIO5EK.js")
  },
  "analytics": {
    factory: () => import("./cli-4ZAVTFUW.js")
  },
  "build": {
    factory: () => import("./cli-VS6CSA3X.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-CFOGODMY.js")
  },
  "completion": {
    factory: () => import("./cli-TNWRBZ2R.js")
  },
  "config": {
    factory: () => import("./cli-NLTCPDX5.js")
  },
  "deploy": {
    factory: () => import("./cli-NTNNGYRT.js")
  },
  "e2e": {
    factory: () => import("./cli-NXMCL7IC.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-KYOC6G65.js")
  },
  "generate": {
    factory: () => import("./cli-QNSB3UIE.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-TAXD2FGV.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-7YTP5NDV.js")
  },
  "mcp": {
    factory: () => import("./cli-5V6CY3GC.js")
  },
  "new": {
    factory: () => import("./cli-WNAZQBNJ.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-O5CFZERQ.js")
  },
  "serve": {
    factory: () => import("./cli-DV7FQJ23.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-LKA4QF4J.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-HI5BXZTR.js")
  },
  "version": {
    factory: () => import("./cli-4BZYMNVB.js"),
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
