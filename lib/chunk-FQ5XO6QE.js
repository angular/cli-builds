// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-42CLBYDG.js")
  },
  "analytics": {
    factory: () => import("./cli-TN5H6Q7F.js")
  },
  "build": {
    factory: () => import("./cli-S3MICAOZ.js"),
    aliases: ["b"]
  },
  "cache": {
    factory: () => import("./cli-6KVB4VII.js")
  },
  "completion": {
    factory: () => import("./cli-DYLQV2EP.js")
  },
  "config": {
    factory: () => import("./cli-IMFFJDYX.js")
  },
  "deploy": {
    factory: () => import("./cli-7PKLOFK4.js")
  },
  "e2e": {
    factory: () => import("./cli-R2WHJEQG.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-CGGLTGOM.js")
  },
  "generate": {
    factory: () => import("./cli-QXTGMTFI.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-UVXQ4FP2.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-4KSVABFR.js")
  },
  "mcp": {
    factory: () => import("./cli-RSTP5LYE.js")
  },
  "new": {
    factory: () => import("./cli-FITF7Y2O.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-Y2KESTSG.js")
  },
  "serve": {
    factory: () => import("./cli-CAHCSI4S.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-3MIBKV2Y.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-B7TAT7Q6.js")
  },
  "version": {
    factory: () => import("./cli-TFNZJNMF.js"),
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
