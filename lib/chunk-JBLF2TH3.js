import {
  colors
} from "./chunk-GHUUJYOY.js";
import {
  assertIsError
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/command-builder/utilities/schematic-engine-host.js
import { SchematicsException } from "@angular-devkit/schematics";
import { NodeModulesEngineHost } from "@angular-devkit/schematics/tools";
import { parse as parseJson } from "jsonc-parser";
import { readFileSync } from "node:fs";
import { Module, createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { Script } from "node:vm";
var schematicRedirectVariable = process.env["NG_SCHEMATIC_REDIRECT"]?.toLowerCase();
function shouldWrapSchematic(schematicFile, schematicEncapsulation) {
  switch (schematicRedirectVariable) {
    case "0":
    case "false":
    case "off":
    case "none":
      return false;
    case "all":
      return true;
  }
  const normalizedSchematicFile = schematicFile.replace(/\\/g, "/");
  if (normalizedSchematicFile.includes("node_modules/@angular/cli/") && !normalizedSchematicFile.includes("node_modules/@angular/cli/node_modules/")) {
    return false;
  }
  if (normalizedSchematicFile.includes("@angular/pwa")) {
    return false;
  }
  const isFirstParty = /\/node_modules\/@(?:angular|schematics|nguniversal)\//.test(normalizedSchematicFile);
  return schematicEncapsulation ?? isFirstParty;
}
var SchematicEngineHost = class extends NodeModulesEngineHost {
  _resolveReferenceString(refString, parentPath, collectionDescription) {
    const [path, name] = refString.split("#", 2);
    const fullPath = path[0] === "." ? resolve(parentPath ?? process.cwd(), path) : path;
    const referenceRequire = createRequire(import.meta.url);
    const schematicFile = referenceRequire.resolve(fullPath, { paths: [parentPath] });
    if (shouldWrapSchematic(schematicFile, collectionDescription?.encapsulation)) {
      const schematicPath = dirname(schematicFile);
      const moduleCache = /* @__PURE__ */ new Map();
      const factoryInitializer = wrap(schematicFile, schematicPath, moduleCache, name || "default");
      const factory = factoryInitializer();
      if (!factory || typeof factory !== "function") {
        return null;
      }
      return { ref: factory, path: schematicPath };
    }
    return super._resolveReferenceString(refString, parentPath, collectionDescription);
  }
};
var legacyModules = {
  "@schematics/angular/utility/config": {
    getWorkspace(host) {
      const path = "/.angular.json";
      const data = host.read(path);
      if (!data) {
        throw new SchematicsException(`Could not find (${path})`);
      }
      return parseJson(data.toString(), [], { allowTrailingComma: true });
    }
  },
  "@schematics/angular/utility/project": {
    buildDefaultPath(project) {
      const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;
      return `${root}${project.projectType === "application" ? "app" : "lib"}`;
    }
  }
};
function wrap(schematicFile, schematicDirectory, moduleCache, exportName) {
  const hostRequire = createRequire(import.meta.url);
  const schematicRequire = createRequire(schematicFile);
  const customRequire = function(id) {
    if (legacyModules[id]) {
      return legacyModules[id];
    } else if (id.startsWith("schematics:")) {
      const builtinId = id.slice(11);
      const builtinModule = loadBuiltinModule(builtinId);
      if (!builtinModule) {
        throw new Error(`Unknown schematics built-in module '${id}' requested from schematic '${schematicFile}'`);
      }
      return builtinModule;
    } else if (id.startsWith("@angular-devkit/") || id.startsWith("@schematics/")) {
      if (id.startsWith("@angular-devkit/core")) {
        try {
          return schematicRequire(id);
        } catch (e) {
          assertIsError(e);
          if (e.code !== "MODULE_NOT_FOUND") {
            throw e;
          }
        }
      }
      return hostRequire(id);
    } else if (id.startsWith(".") || id.startsWith("@angular/cdk")) {
      const modulePath = schematicRequire.resolve(id);
      const cachedModule = moduleCache.get(modulePath);
      if (cachedModule) {
        return cachedModule;
      }
      if (!/[/\\]node_modules[/\\]@schematics[/\\]angular[/\\]third_party[/\\]/.test(modulePath) && !modulePath.endsWith(".json")) {
        const wrappedModule = wrap(modulePath, dirname(modulePath), moduleCache)();
        moduleCache.set(modulePath, wrappedModule);
        return wrappedModule;
      }
    }
    return schematicRequire(id);
  };
  const schematicCode = readFileSync(schematicFile, "utf8");
  const script = new Script(Module.wrap(schematicCode), {
    filename: schematicFile,
    lineOffset: 1
  });
  const schematicModule = new Module(schematicFile);
  const moduleFactory = script.runInThisContext();
  return () => {
    moduleFactory(schematicModule.exports, customRequire, schematicModule, schematicFile, schematicDirectory);
    return exportName ? schematicModule.exports[exportName] : schematicModule.exports;
  };
}
function loadBuiltinModule(id) {
  return void 0;
}

// packages/angular/cli/src/utilities/prettier.js
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire as createRequire2 } from "node:module";
import { dirname as dirname2, join } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var prettierCliPath;
var MAX_COMMAND_LINE_LENGTH = 32e3;
function batchFilesByArgumentLength(files, baseLength, maxLength) {
  const batches = [];
  let batch = [];
  let length = baseLength;
  for (const file of files) {
    const fileLength = file.length + (file.includes(" ") ? 3 : 1);
    if (batch.length > 0 && length + fileLength > maxLength) {
      batches.push(batch);
      batch = [];
      length = baseLength;
    }
    batch.push(file);
    length += fileLength;
  }
  if (batch.length > 0) {
    batches.push(batch);
  }
  return batches;
}
async function formatFiles(cwd, files) {
  if (!files.size) {
    return;
  }
  if (prettierCliPath === void 0) {
    try {
      const prettierPath = createRequire2(cwd + "/").resolve("prettier/package.json");
      const prettierPackageJson = JSON.parse(await readFile(prettierPath, "utf-8"));
      prettierCliPath = join(dirname2(prettierPath), prettierPackageJson.bin);
    } catch {
      prettierCliPath = null;
    }
  }
  if (!prettierCliPath) {
    return;
  }
  const baseArgs = [
    prettierCliPath,
    "--write",
    "--no-error-on-unmatched-pattern",
    "--ignore-unknown"
  ];
  const baseLength = [process.execPath, ...baseArgs].reduce((total, arg) => total + arg.length + (arg.includes(" ") ? 3 : 1), 0);
  const errors = [];
  for (const batch of batchFilesByArgumentLength(files, baseLength, MAX_COMMAND_LINE_LENGTH)) {
    try {
      await execFileAsync(process.execPath, [...baseArgs, ...batch], {
        cwd,
        shell: false
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

// packages/angular/cli/src/command-builder/utilities/schematic-workflow.js
function removeLeadingSlash(value) {
  return value[0] === "/" ? value.slice(1) : value;
}
function subscribeToWorkflow(workflow, logger) {
  const files = /* @__PURE__ */ new Set();
  let error = false;
  let logs = [];
  const reporterSubscription = workflow.reporter.subscribe((event) => {
    const eventPath = removeLeadingSlash(event.path);
    switch (event.kind) {
      case "error":
        error = true;
        logger.error(`ERROR! ${eventPath} ${event.description == "alreadyExist" ? "already exists" : "does not exist"}.`);
        break;
      case "update":
        logs.push(
          // TODO: `as unknown` was necessary during TS 5.9 update. Figure out a long-term solution.
          `${colors.cyan("UPDATE")} ${eventPath} (${event.content.length} bytes)`
        );
        files.add(eventPath);
        break;
      case "create":
        logs.push(
          // TODO: `as unknown` was necessary during TS 5.9 update. Figure out a long-term solution.
          `${colors.green("CREATE")} ${eventPath} (${event.content.length} bytes)`
        );
        files.add(eventPath);
        break;
      case "delete":
        logs.push(`${colors.yellow("DELETE")} ${eventPath}`);
        files.add(eventPath);
        break;
      case "rename": {
        const newFilename = removeLeadingSlash(event.to);
        logs.push(`${colors.blue("RENAME")} ${eventPath} => ${newFilename}`);
        files.add(newFilename);
        break;
      }
    }
  });
  const lifecycleSubscription = workflow.lifeCycle.subscribe((event) => {
    if (event.kind == "end" || event.kind == "post-tasks-start") {
      if (!error) {
        logs.forEach((log) => logger.info(log));
      }
      logs = [];
      error = false;
    }
  });
  return {
    files,
    error,
    unsubscribe: () => {
      reporterSubscription.unsubscribe();
      lifecycleSubscription.unsubscribe();
    }
  };
}

export {
  formatFiles,
  SchematicEngineHost,
  subscribeToWorkflow
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
