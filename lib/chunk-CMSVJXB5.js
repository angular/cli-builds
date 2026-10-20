// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-6DMRBBSC.js")
  },
  "analytics": {
    factory: () => import("./cli-SUAIFEUB.js")
  },
  "build": {
    factory: () => import("./cli-TZGLYX27.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-I7JXE5Q2.js")
  },
  "completion": {
    factory: () => import("./cli-MUCI5DJN.js")
  },
  "config": {
    factory: () => import("./cli-KHA6DRE3.js")
  },
  "deploy": {
    factory: () => import("./cli-32HDWFMG.js")
  },
  "e2e": {
    factory: () => import("./cli-RHW6JFIH.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-FVBNBMIH.js")
  },
  "generate": {
    factory: () => import("./cli-U56DWBXX.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-NVJGVYMV.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-HLFUEVU6.js")
  },
  "mcp": {
    factory: () => import("./cli-55VVDL32.js")
  },
  "new": {
    factory: () => import("./cli-W3S6B5DA.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-DZ2NRDCW.js")
  },
  "serve": {
    factory: () => import("./cli-IFKXJWYR.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-MIRI6JLK.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-XJUIPDWO.js")
  },
  "version": {
    factory: () => import("./cli-57ZFONQB.js"),
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
