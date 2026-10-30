// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-FXEQQ5RW.js")
  },
  "analytics": {
    factory: () => import("./cli-LVBKMQN3.js")
  },
  "build": {
    factory: () => import("./cli-3LMOQB34.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-6M42LNZN.js")
  },
  "completion": {
    factory: () => import("./cli-ID5PER3R.js")
  },
  "config": {
    factory: () => import("./cli-3O4PQEPR.js")
  },
  "deploy": {
    factory: () => import("./cli-ZDPYY2I6.js")
  },
  "e2e": {
    factory: () => import("./cli-O6K2NVA3.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-3TP6XWXX.js")
  },
  "generate": {
    factory: () => import("./cli-VUMEBHXP.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-BUJPRPKW.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-VXQLRFAF.js")
  },
  "mcp": {
    factory: () => import("./cli-5G5NLEI7.js")
  },
  "new": {
    factory: () => import("./cli-455DIKKK.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-XACVGXRF.js")
  },
  "serve": {
    factory: () => import("./cli-3ETFZIC6.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-JGCN7GQ6.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-37GVNCA7.js")
  },
  "version": {
    factory: () => import("./cli-QQUS42JO.js"),
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
