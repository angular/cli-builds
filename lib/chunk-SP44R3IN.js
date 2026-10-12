// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-PDCEX7HQ.js")
  },
  "analytics": {
    factory: () => import("./cli-LYBZEMDR.js")
  },
  "build": {
    factory: () => import("./cli-NDHRIGTU.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-PU5VH7JB.js")
  },
  "completion": {
    factory: () => import("./cli-QUH44NUB.js")
  },
  "config": {
    factory: () => import("./cli-EBTAH6FV.js")
  },
  "deploy": {
    factory: () => import("./cli-4CMZ6KMR.js")
  },
  "e2e": {
    factory: () => import("./cli-F7GJPKXP.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-VVITNTBC.js")
  },
  "generate": {
    factory: () => import("./cli-F67EZ3PG.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-BQRFWIMG.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-CWICUPZW.js")
  },
  "mcp": {
    factory: () => import("./cli-ACLGUIBI.js")
  },
  "new": {
    factory: () => import("./cli-RWK3WR63.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-6AHY7ADW.js")
  },
  "serve": {
    factory: () => import("./cli-LFLBEBJQ.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-6OKUOVZF.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-XM4L4PP4.js")
  },
  "version": {
    factory: () => import("./cli-AYLY2VYK.js"),
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
