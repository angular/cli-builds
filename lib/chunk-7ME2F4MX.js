// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-GL6YM2IC.js")
  },
  "analytics": {
    factory: () => import("./cli-MOXDJWIT.js")
  },
  "build": {
    factory: () => import("./cli-MCDQ5WYU.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-Y2XFME3O.js")
  },
  "completion": {
    factory: () => import("./cli-GGX2NTKW.js")
  },
  "config": {
    factory: () => import("./cli-QTMNILOI.js")
  },
  "deploy": {
    factory: () => import("./cli-JHMFQNKO.js")
  },
  "e2e": {
    factory: () => import("./cli-A2YUWELU.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-TYUDNPTD.js")
  },
  "generate": {
    factory: () => import("./cli-422SZJQJ.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-EJXHESKP.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-533BJCSP.js")
  },
  "mcp": {
    factory: () => import("./cli-HOPSLGLZ.js")
  },
  "new": {
    factory: () => import("./cli-SR2RTR5W.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-G4MIGOQ3.js")
  },
  "serve": {
    factory: () => import("./cli-JGIIJFXO.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-RMKZE4LO.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-JB6FSNF2.js")
  },
  "version": {
    factory: () => import("./cli-3X4X3G56.js"),
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
