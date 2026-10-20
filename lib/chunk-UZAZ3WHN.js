// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-6CPFKV3N.js")
  },
  "analytics": {
    factory: () => import("./cli-6XL2JVWF.js")
  },
  "build": {
    factory: () => import("./cli-6FLPRZZZ.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-EKHKUCBL.js")
  },
  "completion": {
    factory: () => import("./cli-Q4EN55JO.js")
  },
  "config": {
    factory: () => import("./cli-MRHOWF73.js")
  },
  "deploy": {
    factory: () => import("./cli-GFXYELH6.js")
  },
  "e2e": {
    factory: () => import("./cli-BIGMADVL.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-TIPVNUQF.js")
  },
  "generate": {
    factory: () => import("./cli-VKR5CEQM.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-XCQQW2BE.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-GDGTVI3Z.js")
  },
  "mcp": {
    factory: () => import("./cli-7R37DZOR.js")
  },
  "new": {
    factory: () => import("./cli-63BQ7PAD.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-SOFPMK25.js")
  },
  "serve": {
    factory: () => import("./cli-KTXFG3DU.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-4ELRKIET.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-PJWBYLWG.js")
  },
  "version": {
    factory: () => import("./cli-EQBXLFCR.js"),
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
