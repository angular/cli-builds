// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-2YPLIVKG.js")
  },
  "analytics": {
    factory: () => import("./cli-OIHT3M4D.js")
  },
  "build": {
    factory: () => import("./cli-E7PF4D6L.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-LKAYTBYQ.js")
  },
  "completion": {
    factory: () => import("./cli-HKLRIOW6.js")
  },
  "config": {
    factory: () => import("./cli-ALIL4KAR.js")
  },
  "deploy": {
    factory: () => import("./cli-KLYYQOCE.js")
  },
  "e2e": {
    factory: () => import("./cli-KEBPTP7M.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-ICXKLK6U.js")
  },
  "generate": {
    factory: () => import("./cli-LIFINIUE.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-O56FNSUC.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-VCKDWKQO.js")
  },
  "mcp": {
    factory: () => import("./cli-P6VV7TVJ.js")
  },
  "new": {
    factory: () => import("./cli-TT47NUXV.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-AHDJ65L2.js")
  },
  "serve": {
    factory: () => import("./cli-2LW35SYI.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-I2ABNQOX.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-WIT3LLQQ.js")
  },
  "version": {
    factory: () => import("./cli-VHWD7H4N.js"),
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
