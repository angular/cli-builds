// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-UXPN7VNU.js")
  },
  "analytics": {
    factory: () => import("./cli-N5RMS5TM.js")
  },
  "build": {
    factory: () => import("./cli-KSOW2NRH.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-NSEQKL65.js")
  },
  "completion": {
    factory: () => import("./cli-EYAWCBQV.js")
  },
  "config": {
    factory: () => import("./cli-JDF3IEUS.js")
  },
  "deploy": {
    factory: () => import("./cli-Y2KN5MOT.js")
  },
  "e2e": {
    factory: () => import("./cli-7IK2OABJ.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-XZS6BH5Z.js")
  },
  "generate": {
    factory: () => import("./cli-RZBP6VSW.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-NEBO5QMT.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-O6XHQGRY.js")
  },
  "mcp": {
    factory: () => import("./cli-2NHFBKDY.js")
  },
  "new": {
    factory: () => import("./cli-P3YSNYSU.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-V3SFSMH2.js")
  },
  "serve": {
    factory: () => import("./cli-2DNTOQJF.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-ZX2HSU3F.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-IUZCKRU2.js")
  },
  "version": {
    factory: () => import("./cli-E2FEXQVO.js"),
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
