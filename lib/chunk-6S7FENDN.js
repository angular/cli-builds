// packages/angular/cli/src/commands/command-config.js
var RootCommands = {
  "add": {
    factory: () => import("./cli-5HQ4LUHP.js")
  },
  "analytics": {
    factory: () => import("./cli-TN5H6Q7F.js")
  },
  "build": {
    factory: () => import("./cli-5BGG7LMU.js"),
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
    factory: () => import("./cli-IL5CA3BR.js")
  },
  "e2e": {
    factory: () => import("./cli-7J6THBYG.js"),
    aliases: ["e"]
  },
  "extract-i18n": {
    factory: () => import("./cli-4YVQEZ5F.js")
  },
  "generate": {
    factory: () => import("./cli-QMT3EEIP.js"),
    aliases: ["g"]
  },
  "lint": {
    factory: () => import("./cli-GKNE2PTT.js")
  },
  "make-this-awesome": {
    factory: () => import("./cli-4KSVABFR.js")
  },
  "mcp": {
    factory: () => import("./cli-RSTP5LYE.js")
  },
  "new": {
    factory: () => import("./cli-KTSVV62I.js"),
    aliases: ["n"]
  },
  "run": {
    factory: () => import("./cli-BODSTEPR.js")
  },
  "serve": {
    factory: () => import("./cli-X3VNL6SY.js"),
    aliases: ["dev", "s"]
  },
  "test": {
    factory: () => import("./cli-PFGO7NAB.js"),
    aliases: ["t"]
  },
  "update": {
    factory: () => import("./cli-MBQVGFVG.js")
  },
  "version": {
    factory: () => import("./cli-6WSW3U37.js"),
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
