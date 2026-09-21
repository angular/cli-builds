// packages/angular/cli/src/utilities/config.js
import { json, workspaces } from "@angular-devkit/core";
import { existsSync, promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// packages/angular/cli/src/utilities/find-up.js
import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
async function findUp(names, from) {
  const filenames = Array.isArray(names) ? names : [names];
  let currentDir = resolve(from);
  while (true) {
    for (const name of filenames) {
      const p = join(currentDir, name);
      try {
        await stat(p);
        return p;
      } catch {
      }
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return null;
}

// packages/angular/cli/src/utilities/json-file.js
import { applyEdits, findNodeAtLocation, getNodeValue, modify, parse, parseTree, printParseErrorCode } from "jsonc-parser";
import { readFileSync, writeFileSync } from "node:fs";

// packages/angular/cli/src/utilities/eol.js
import { EOL } from "node:os";
var CRLF = "\r\n";
var LF = "\n";
function getEOL(content) {
  const newlines = content.match(/(?:\r?\n)/g);
  if (newlines?.length) {
    const crlf = newlines.filter((l) => l === CRLF).length;
    const lf = newlines.length - crlf;
    return crlf > lf ? CRLF : LF;
  }
  return EOL;
}

// packages/angular/cli/src/utilities/error.js
import assert from "node:assert";
import { inspect } from "node:util";
function isError(value) {
  return value instanceof Error || typeof value === "object" && value !== null && "name" in value && "message" in value;
}
function assertIsError(value) {
  assert(isError(value), `Expected a value to be an Error-like object, but received: ${inspect(value)}`);
}

// packages/angular/cli/src/utilities/json-file.js
var JSONFile = class {
  /** The raw content of the JSON file. */
  #content;
  /** The end-of-line sequence used in the file. */
  #eol;
  /** Whether the file uses spaces for indentation. */
  #insertSpaces = true;
  /** The number of spaces or tabs used for indentation. */
  #tabSize = 2;
  /** The path to the JSON file. */
  #path;
  /** The parsed JSON abstract syntax tree. */
  #jsonAst;
  /** The raw content of the JSON file. */
  get content() {
    return this.#content;
  }
  /**
   * Creates an instance of JSONFile.
   * @param path The path to the JSON file.
   */
  constructor(path2) {
    this.#path = path2;
    try {
      this.#content = readFileSync(this.#path, "utf-8");
    } catch (e) {
      assertIsError(e);
      if (e.code !== "ENOENT") {
        throw e;
      }
      this.#content = "";
    }
    this.#eol = getEOL(this.#content);
    this.#detectIndentation();
  }
  /**
   * Gets the parsed JSON abstract syntax tree.
   * The AST is lazily parsed and cached.
   */
  get JsonAst() {
    if (this.#jsonAst) {
      return this.#jsonAst;
    }
    const errors = [];
    this.#jsonAst = parseTree(this.#content, errors, { allowTrailingComma: true });
    if (errors.length) {
      formatError(this.#path, errors);
    }
    return this.#jsonAst;
  }
  /**
   * Gets a value from the JSON file at a specific path.
   * @param jsonPath The path to the value.
   * @returns The value at the given path, or `undefined` if not found.
   */
  get(jsonPath) {
    const jsonAstNode = this.JsonAst;
    if (!jsonAstNode) {
      return void 0;
    }
    if (jsonPath.length === 0) {
      return getNodeValue(jsonAstNode);
    }
    const node = findNodeAtLocation(jsonAstNode, jsonPath);
    return node === void 0 ? void 0 : getNodeValue(node);
  }
  /**
   * Modifies a value in the JSON file.
   * @param jsonPath The path to the value to modify.
   * @param value The new value to insert.
   * @param insertInOrder A function to determine the insertion index, or `false` to insert at the end.
   * @returns `true` if the modification was successful, `false` otherwise.
   */
  modify(jsonPath, value, insertInOrder) {
    if (value === void 0 && this.get(jsonPath) === void 0) {
      return false;
    }
    let getInsertionIndex;
    if (insertInOrder === void 0) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = (properties) => [...properties, property].sort().findIndex((p) => p === property);
    } else if (insertInOrder !== false) {
      getInsertionIndex = insertInOrder;
    }
    const edits = modify(this.#content, jsonPath, value, {
      getInsertionIndex,
      formattingOptions: {
        insertSpaces: this.#insertSpaces,
        tabSize: this.#tabSize,
        eol: this.#eol
      }
    });
    if (edits.length === 0) {
      return false;
    }
    this.#content = applyEdits(this.#content, edits);
    this.#jsonAst = void 0;
    return true;
  }
  /**
   * Deletes a value from the JSON file at a specific path.
   * @param jsonPath The path to the value to delete.
   * @returns `true` if the deletion was successful, `false` otherwise.
   */
  delete(jsonPath) {
    return this.modify(jsonPath, void 0);
  }
  /** Saves the modified content back to the file. */
  save() {
    writeFileSync(this.#path, this.#content);
  }
  /** Detects the indentation of the file. */
  #detectIndentation() {
    const match = this.#content.match(/^(?:( )+|\t+)\S/m);
    if (match) {
      this.#insertSpaces = !!match[1];
      this.#tabSize = match[0].length - 1;
    }
  }
};
function readAndParseJson(path2) {
  const errors = [];
  const content = parse(readFileSync(path2, "utf-8"), errors, { allowTrailingComma: true });
  if (errors.length) {
    formatError(path2, errors);
  }
  return content;
}
function formatError(path2, errors) {
  const { error, offset } = errors[0];
  throw new Error(`Failed to parse "${path2}" as JSON AST Object. ${printParseErrorCode(error)} at location: ${offset}.`);
}
function parseJson(content) {
  return parse(content, void 0, { allowTrailingComma: true });
}

// packages/angular/cli/src/utilities/config.js
function isJsonObject(value) {
  return value !== void 0 && json.isJsonObject(value);
}
function createWorkspaceHost() {
  return {
    readFile(path2) {
      return fs.readFile(path2, "utf-8");
    },
    async writeFile(path2, data) {
      await fs.writeFile(path2, data);
    },
    async isDirectory(path2) {
      try {
        const stats = await fs.stat(path2);
        return stats.isDirectory();
      } catch {
        return false;
      }
    },
    async isFile(path2) {
      try {
        const stats = await fs.stat(path2);
        return stats.isFile();
      } catch {
        return false;
      }
    }
  };
}
var currentDirectory = import.meta.dirname;
var bundledSchemaPath = path.join(currentDirectory, "config/schema.json");
var workspaceSchemaPath = existsSync(bundledSchemaPath) ? bundledSchemaPath : path.join(currentDirectory, "../../lib/config/schema.json");
var configNames = ["angular.json", ".angular.json"];
var globalFileName = ".angular-config.json";
var defaultGlobalFilePath = path.join(os.homedir(), globalFileName);
function xdgConfigHome(home, configFile) {
  const xdgConfigHome2 = process.env["XDG_CONFIG_HOME"] || path.join(home, ".config");
  const xdgAngularHome = path.join(xdgConfigHome2, "angular");
  return configFile ? path.join(xdgAngularHome, configFile) : xdgAngularHome;
}
function xdgConfigHomeOld(home) {
  const p = process.env["XDG_CONFIG_HOME"] || path.join(home, ".config", "angular");
  return path.join(p, ".angular-config.json");
}
async function projectFilePath(projectPath) {
  return projectPath && await findUp(configNames, projectPath) || await findUp(configNames, process.cwd()) || await findUp(configNames, currentDirectory);
}
function globalFilePath() {
  const home = os.homedir();
  if (!home) {
    return null;
  }
  const xdgConfig = xdgConfigHome(home, "config.json");
  if (existsSync(xdgConfig)) {
    return xdgConfig;
  }
  const xdgConfigOld = xdgConfigHomeOld(home);
  if (existsSync(xdgConfigOld)) {
    console.warn(`Old configuration location detected: ${xdgConfigOld}
Please move the file to the new location ~/.config/angular/config.json`);
    return xdgConfigOld;
  }
  if (existsSync(defaultGlobalFilePath)) {
    return defaultGlobalFilePath;
  }
  return null;
}
var AngularWorkspace = class _AngularWorkspace {
  workspace;
  filePath;
  basePath;
  constructor(workspace, filePath) {
    this.workspace = workspace;
    this.filePath = filePath;
    this.basePath = path.dirname(filePath);
  }
  get extensions() {
    return this.workspace.extensions;
  }
  get projects() {
    return this.workspace.projects;
  }
  // Temporary helper functions to support refactoring
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCli() {
    return this.workspace.extensions["cli"];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProjectCli(projectName) {
    const project = this.workspace.projects.get(projectName);
    return project?.extensions["cli"];
  }
  save() {
    return workspaces.writeWorkspace(this.workspace, createWorkspaceHost(), this.filePath, workspaces.WorkspaceFormat.JSON);
  }
  static async load(workspaceFilePath) {
    const result = await workspaces.readWorkspace(workspaceFilePath, createWorkspaceHost(), workspaces.WorkspaceFormat.JSON);
    return new _AngularWorkspace(result.workspace, workspaceFilePath);
  }
};
var cachedWorkspaces = /* @__PURE__ */ new Map();
async function getWorkspace(level) {
  if (cachedWorkspaces.has(level)) {
    return cachedWorkspaces.get(level);
  }
  const configPath = level === "local" ? await projectFilePath() : globalFilePath();
  if (!configPath) {
    if (level === "global") {
      const globalWorkspace = new AngularWorkspace({ extensions: {}, projects: new workspaces.ProjectDefinitionCollection() }, defaultGlobalFilePath);
      cachedWorkspaces.set(level, globalWorkspace);
      return globalWorkspace;
    }
    cachedWorkspaces.set(level, void 0);
    return void 0;
  }
  try {
    const workspace = await AngularWorkspace.load(configPath);
    cachedWorkspaces.set(level, workspace);
    return workspace;
  } catch (error) {
    throw new Error(`Workspace config file cannot be loaded: ${configPath}`, { cause: error });
  }
}
async function getWorkspaceRaw(level = "local") {
  let configPath = level === "local" ? await projectFilePath() : globalFilePath();
  if (!configPath) {
    if (level === "global") {
      configPath = defaultGlobalFilePath;
      const globalWorkspace = await getWorkspace("global");
      await globalWorkspace.save();
    } else {
      return [null, null];
    }
  }
  return [new JSONFile(configPath), configPath];
}
async function validateWorkspace(data, isGlobal) {
  const schema = readAndParseJson(workspaceSchemaPath);
  if (!isJsonObject(schema)) {
    throw new Error("Workspace schema is not a JSON object.");
  }
  const schemaToValidate = isGlobal ? {
    "$ref": "#/definitions/global",
    definitions: schema["definitions"]
  } : schema;
  const { formats } = await import("@angular-devkit/schematics");
  const registry = new json.schema.CoreSchemaRegistry(formats.standardFormats);
  const validator = await registry.compile(schemaToValidate);
  const { success, errors } = await validator(data);
  if (!success) {
    throw new json.schema.SchemaValidationException(errors);
  }
}
function findProjectByPath(workspace, location) {
  const isInside = (base, potential) => {
    const absoluteBase = path.resolve(workspace.basePath, base);
    const absolutePotential = path.resolve(workspace.basePath, potential);
    const relativePotential = path.relative(absoluteBase, absolutePotential);
    if (!relativePotential.startsWith("..") && !path.isAbsolute(relativePotential)) {
      return true;
    }
    return false;
  };
  const projects = Array.from(workspace.projects).map(([name, project]) => [project.root, name]).filter((tuple) => isInside(tuple[0], location)).sort((a, b) => b[0].length - a[0].length);
  if (projects.length === 0) {
    return null;
  } else if (projects.length > 1) {
    const found = /* @__PURE__ */ new Set();
    const sameRoots = projects.filter((v) => {
      if (!found.has(v[0])) {
        found.add(v[0]);
        return false;
      }
      return true;
    });
    if (sameRoots.length > 0) {
      return null;
    }
  }
  return projects[0][1];
}
function getProjectByCwd(workspace) {
  if (workspace.projects.size === 1) {
    return Array.from(workspace.projects.keys())[0];
  }
  const project = findProjectByPath(workspace, process.cwd());
  if (project) {
    return project;
  }
  return null;
}
async function getConfiguredPackageManager() {
  const getPackageManager = (source) => {
    if (isJsonObject(source)) {
      const value = source["packageManager"];
      if (value && typeof value === "string") {
        return value;
      }
    }
    return null;
  };
  let result = null;
  const workspace = await getWorkspace("local");
  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project) {
      result = getPackageManager(workspace.projects.get(project)?.extensions["cli"]);
    }
    result ??= getPackageManager(workspace.extensions["cli"]);
  }
  if (!result) {
    const globalOptions = await getWorkspace("global");
    result = getPackageManager(globalOptions?.extensions["cli"]);
  }
  return result;
}
async function getSchematicDefaults(collection, schematic, project) {
  const result = {};
  const mergeOptions = (source) => {
    if (isJsonObject(source)) {
      Object.assign(result, source[`${collection}:${schematic}`]);
      const collectionOptions = source[collection];
      if (isJsonObject(collectionOptions)) {
        Object.assign(result, collectionOptions[schematic]);
      }
    }
  };
  const globalOptions = await getWorkspace("global");
  mergeOptions(globalOptions?.extensions["schematics"]);
  const workspace = await getWorkspace("local");
  if (workspace) {
    mergeOptions(workspace.extensions["schematics"]);
    project = project || getProjectByCwd(workspace);
    if (project) {
      mergeOptions(workspace.projects.get(project)?.extensions["schematics"]);
    }
  }
  return result;
}
async function isWarningEnabled(warning) {
  const getWarning = (source) => {
    if (isJsonObject(source)) {
      const warnings = source["warnings"];
      if (isJsonObject(warnings)) {
        const value = warnings[warning];
        if (typeof value == "boolean") {
          return value;
        }
      }
    }
  };
  let result;
  const workspace = await getWorkspace("local");
  if (workspace) {
    const project = getProjectByCwd(workspace);
    if (project) {
      result = getWarning(workspace.projects.get(project)?.extensions["cli"]);
    }
    result = result ?? getWarning(workspace.extensions["cli"]);
  }
  if (result === void 0) {
    const globalOptions = await getWorkspace("global");
    result = getWarning(globalOptions?.extensions["cli"]);
  }
  return result ?? true;
}

export {
  assertIsError,
  parseJson,
  workspaceSchemaPath,
  AngularWorkspace,
  getWorkspace,
  getWorkspaceRaw,
  validateWorkspace,
  getProjectByCwd,
  getConfiguredPackageManager,
  getSchematicDefaults,
  isWarningEnabled
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
