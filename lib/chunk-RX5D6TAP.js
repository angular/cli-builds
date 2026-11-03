// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-LDNKAPA7.js")
  },
  "analytics": {
    factory: () => import("./cli-52AS3SXJ.js")
  },
  "build": {
    factory: () => import("./cli-CSZKRBKH.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-4VBMJRA6.js")
  },
  "completion": {
    factory: () => import("./cli-HGR64KEK.js")
  },
  "config": {
    factory: () => import("./cli-BG5PTLPC.js")
  },
  "deploy": {
    factory: () => import("./cli-3RBA5EOF.js")
  },
  "e2e": {
    factory: () => import("./cli-VCSXQSPY.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-ERXGN6F4.js")
  },
  "generate": {
    factory: () => import("./cli-KO42ANOQ.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-DTBGKT53.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-JIGJLE56.js")
  },
  "mcp": {
    factory: () => import("./cli-JAYSPZ3K.js")
  },
  "new": {
    factory: () => import("./cli-OIJIIGNK.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-QJFM7JGC.js")
  },
  "serve": {
    factory: () => import("./cli-QWGIZ4PU.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-HLAM3WJK.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-Y5ZA25VK.js")
  },
  "version": {
    factory: () => import("./cli-5MUUFIHO.js"),
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
