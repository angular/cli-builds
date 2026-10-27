// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-JZMYXUA7.js")
  },
  "analytics": {
    factory: () => import("./cli-LVBKMQN3.js")
  },
  "build": {
    factory: () => import("./cli-ESYFR5TT.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-6PYKNXJP.js")
  },
  "completion": {
    factory: () => import("./cli-ID5PER3R.js")
  },
  "config": {
    factory: () => import("./cli-3O4PQEPR.js")
  },
  "deploy": {
    factory: () => import("./cli-MPHQ3WY3.js")
  },
  "e2e": {
    factory: () => import("./cli-JC3ZSAXN.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-ETXSBTOZ.js")
  },
  "generate": {
    factory: () => import("./cli-HLNG2N76.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-DN4LP74T.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-VXQLRFAF.js")
  },
  "mcp": {
    factory: () => import("./cli-5G5NLEI7.js")
  },
  "new": {
    factory: () => import("./cli-QUEFCYBY.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-Y7FDXARH.js")
  },
  "serve": {
    factory: () => import("./cli-5NPADBP7.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-7X46QKT2.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-BFDXNCU6.js")
  },
  "version": {
    factory: () => import("./cli-PNYCKHYS.js"),
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
