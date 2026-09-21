// packages/angular/cli/src/commands/cache/utilities.js
import { isJsonObject } from "@angular-devkit/core";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

// packages/angular/cli/lib/config/workspace-schema.js
var Environment;
(function(Environment2) {
  Environment2["All"] = "all";
  Environment2["Ci"] = "ci";
  Environment2["Local"] = "local";
})(Environment || (Environment = {}));
var PackageManager;
(function(PackageManager2) {
  PackageManager2["Bun"] = "bun";
  PackageManager2["Npm"] = "npm";
  PackageManager2["Pnpm"] = "pnpm";
  PackageManager2["Yarn"] = "yarn";
})(PackageManager || (PackageManager = {}));
var FileNameStyleGuide;
(function(FileNameStyleGuide2) {
  FileNameStyleGuide2["The2016"] = "2016";
  FileNameStyleGuide2["The2025"] = "2025";
})(FileNameStyleGuide || (FileNameStyleGuide = {}));
var SchematicsAngularApplicationStyle;
(function(SchematicsAngularApplicationStyle2) {
  SchematicsAngularApplicationStyle2["Css"] = "css";
  SchematicsAngularApplicationStyle2["Less"] = "less";
  SchematicsAngularApplicationStyle2["Sass"] = "sass";
  SchematicsAngularApplicationStyle2["Scss"] = "scss";
  SchematicsAngularApplicationStyle2["Tailwind"] = "tailwind";
})(SchematicsAngularApplicationStyle || (SchematicsAngularApplicationStyle = {}));
var TestRunner;
(function(TestRunner2) {
  TestRunner2["Karma"] = "karma";
  TestRunner2["Vitest"] = "vitest";
})(TestRunner || (TestRunner = {}));
var ViewEncapsulation;
(function(ViewEncapsulation2) {
  ViewEncapsulation2["Emulated"] = "Emulated";
  ViewEncapsulation2["None"] = "None";
  ViewEncapsulation2["ShadowDom"] = "ShadowDom";
})(ViewEncapsulation || (ViewEncapsulation = {}));
var ChangeDetection;
(function(ChangeDetection2) {
  ChangeDetection2["Eager"] = "Eager";
  ChangeDetection2["OnPush"] = "OnPush";
})(ChangeDetection || (ChangeDetection = {}));
var SchematicsAngularComponentStyle;
(function(SchematicsAngularComponentStyle2) {
  SchematicsAngularComponentStyle2["Css"] = "css";
  SchematicsAngularComponentStyle2["Less"] = "less";
  SchematicsAngularComponentStyle2["None"] = "none";
  SchematicsAngularComponentStyle2["Sass"] = "sass";
  SchematicsAngularComponentStyle2["Scss"] = "scss";
})(SchematicsAngularComponentStyle || (SchematicsAngularComponentStyle = {}));
var Implement;
(function(Implement2) {
  Implement2["CanActivate"] = "CanActivate";
  Implement2["CanActivateChild"] = "CanActivateChild";
  Implement2["CanDeactivate"] = "CanDeactivate";
  Implement2["CanMatch"] = "CanMatch";
})(Implement || (Implement = {}));
var TypeSeparator;
(function(TypeSeparator2) {
  TypeSeparator2["Empty"] = "-";
  TypeSeparator2["TypeSeparator"] = ".";
})(TypeSeparator || (TypeSeparator = {}));
var AiConfig;
(function(AiConfig2) {
  AiConfig2["ClaudeCode"] = "claude-code";
  AiConfig2["Cursor"] = "cursor";
  AiConfig2["GeminiCli"] = "gemini-cli";
  AiConfig2["None"] = "none";
  AiConfig2["OpenAiCodex"] = "open-ai-codex";
  AiConfig2["Vscode"] = "vscode";
})(AiConfig || (AiConfig = {}));

// packages/angular/cli/src/commands/cache/utilities.js
function updateCacheConfig(workspace, key, value) {
  const cli = workspace.extensions["cli"] ??= {};
  const cache = cli["cache"] ??= {};
  cache[key] = value;
  return workspace.save();
}
function getCacheBasePath(workspaceRoot, cachePathSetting) {
  if (isAbsolute(cachePathSetting)) {
    return cachePathSetting;
  }
  try {
    let currentDir = workspaceRoot;
    while (true) {
      const gitPath = join(currentDir, ".git");
      if (existsSync(gitPath)) {
        const stat = statSync(gitPath);
        if (stat.isFile()) {
          const content = readFileSync(gitPath, "utf8");
          const match = /^gitdir:\s*(.+)$/m.exec(content);
          if (match) {
            const gitdir = resolve(currentDir, match[1].trim());
            const commondirPath = join(gitdir, "commondir");
            if (existsSync(commondirPath)) {
              const commondir = readFileSync(commondirPath, "utf8").trim();
              const commonGitDir = resolve(gitdir, commondir);
              return resolve(dirname(commonGitDir), cachePathSetting);
            }
          }
        }
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  } catch {
  }
  return resolve(workspaceRoot, cachePathSetting);
}
function getCacheConfig(workspace) {
  if (!workspace) {
    throw new Error(`Cannot retrieve cache configuration as workspace is not defined.`);
  }
  const defaultSettings = {
    path: getCacheBasePath(workspace.basePath, ".angular/cache"),
    environment: Environment.Local,
    enabled: true
  };
  const cliSetting = workspace.extensions["cli"];
  if (!cliSetting || !isJsonObject(cliSetting)) {
    return defaultSettings;
  }
  const cacheSettings = cliSetting["cache"];
  if (!isJsonObject(cacheSettings)) {
    return defaultSettings;
  }
  const {
    path = ".angular/cache",
    environment = defaultSettings.environment,
    enabled = defaultSettings.enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = cacheSettings;
  return {
    path: getCacheBasePath(workspace.basePath, path),
    environment,
    enabled
  };
}

export {
  updateCacheConfig,
  getCacheConfig
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
