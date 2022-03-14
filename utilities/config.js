"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWarningEnabled = exports.getSchematicDefaults = exports.migrateLegacyGlobalConfig = exports.getConfiguredPackageManager = exports.getProjectByCwd = exports.validateWorkspace = exports.getWorkspaceRaw = exports.createGlobalSettings = exports.getWorkspace = exports.AngularWorkspace = exports.workspaceSchemaPath = void 0;
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const find_up_1 = require("./find-up");
const json_file_1 = require("./json-file");
function isJsonObject(value) {
    return value !== undefined && core_1.json.isJsonObject(value);
}
function createWorkspaceHost() {
    return {
        async readFile(path) {
            return (0, fs_1.readFileSync)(path, 'utf-8');
        },
        async writeFile(path, data) {
            (0, fs_1.writeFileSync)(path, data);
        },
        async isDirectory(path) {
            try {
                return (0, fs_1.statSync)(path).isDirectory();
            }
            catch (_a) {
                return false;
            }
        },
        async isFile(path) {
            try {
                return (0, fs_1.statSync)(path).isFile();
            }
            catch (_a) {
                return false;
            }
        },
    };
}
function getSchemaLocation() {
    return path.join(__dirname, '../lib/config/schema.json');
}
exports.workspaceSchemaPath = getSchemaLocation();
const configNames = ['angular.json', '.angular.json'];
const globalFileName = '.angular-config.json';
function xdgConfigHome(home, configFile) {
    // https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
    const xdgConfigHome = process.env['XDG_CONFIG_HOME'] || path.join(home, '.config');
    const xdgAngularHome = path.join(xdgConfigHome, 'angular');
    return configFile ? path.join(xdgAngularHome, configFile) : xdgAngularHome;
}
function xdgConfigHomeOld(home) {
    // Check the configuration files in the old location that should be:
    // - $XDG_CONFIG_HOME/.angular-config.json (if XDG_CONFIG_HOME is set)
    // - $HOME/.config/angular/.angular-config.json (otherwise)
    const p = process.env['XDG_CONFIG_HOME'] || path.join(home, '.config', 'angular');
    return path.join(p, '.angular-config.json');
}
function projectFilePath(projectPath) {
    // Find the configuration, either where specified, in the Angular CLI project
    // (if it's in node_modules) or from the current process.
    return ((projectPath && (0, find_up_1.findUp)(configNames, projectPath)) ||
        (0, find_up_1.findUp)(configNames, process.cwd()) ||
        (0, find_up_1.findUp)(configNames, __dirname));
}
function globalFilePath() {
    const home = os.homedir();
    if (!home) {
        return null;
    }
    // follow XDG Base Directory spec
    // note that createGlobalSettings() will continue creating
    // global file in home directory, with this user will have
    // choice to move change its location to meet XDG convention
    const xdgConfig = xdgConfigHome(home, 'config.json');
    if ((0, fs_1.existsSync)(xdgConfig)) {
        return xdgConfig;
    }
    // NOTE: This check is for the old configuration location, for more
    // information see https://github.com/angular/angular-cli/pull/20556
    const xdgConfigOld = xdgConfigHomeOld(home);
    if ((0, fs_1.existsSync)(xdgConfigOld)) {
        /* eslint-disable no-console */
        console.warn(`Old configuration location detected: ${xdgConfigOld}\n` +
            `Please move the file to the new location ~/.config/angular/config.json`);
        return xdgConfigOld;
    }
    const p = path.join(home, globalFileName);
    if ((0, fs_1.existsSync)(p)) {
        return p;
    }
    return null;
}
class AngularWorkspace {
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
        return this.workspace.extensions['cli'] || {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProjectCli(projectName) {
        const project = this.workspace.projects.get(projectName);
        return (project === null || project === void 0 ? void 0 : project.extensions['cli']) || {};
    }
    static async load(workspaceFilePath) {
        const oldConfigFileNames = ['.angular-cli.json', 'angular-cli.json'];
        if (oldConfigFileNames.includes(path.basename(workspaceFilePath))) {
            // 1.x file format
            // Create an empty workspace to allow update to be used
            return new AngularWorkspace({ extensions: {}, projects: new core_1.workspaces.ProjectDefinitionCollection() }, workspaceFilePath);
        }
        const result = await core_1.workspaces.readWorkspace(workspaceFilePath, createWorkspaceHost(), core_1.workspaces.WorkspaceFormat.JSON);
        return new AngularWorkspace(result.workspace, workspaceFilePath);
    }
}
exports.AngularWorkspace = AngularWorkspace;
const cachedWorkspaces = new Map();
async function getWorkspace(level = 'local') {
    const cached = cachedWorkspaces.get(level);
    if (cached !== undefined) {
        return cached;
    }
    const configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        cachedWorkspaces.set(level, null);
        return null;
    }
    try {
        const workspace = await AngularWorkspace.load(configPath);
        cachedWorkspaces.set(level, workspace);
        return workspace;
    }
    catch (error) {
        throw new Error(`Workspace config file cannot be loaded: ${configPath}` +
            `\n${error instanceof Error ? error.message : error}`);
    }
}
exports.getWorkspace = getWorkspace;
function createGlobalSettings() {
    const home = os.homedir();
    if (!home) {
        throw new Error('No home directory found.');
    }
    const globalPath = path.join(home, globalFileName);
    (0, fs_1.writeFileSync)(globalPath, JSON.stringify({ version: 1 }));
    return globalPath;
}
exports.createGlobalSettings = createGlobalSettings;
function getWorkspaceRaw(level = 'local') {
    let configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        if (level === 'global') {
            configPath = createGlobalSettings();
        }
        else {
            return [null, null];
        }
    }
    return [new json_file_1.JSONFile(configPath), configPath];
}
exports.getWorkspaceRaw = getWorkspaceRaw;
async function validateWorkspace(data) {
    const schema = (0, json_file_1.readAndParseJson)(path.join(__dirname, '../lib/config/schema.json'));
    const { formats } = await Promise.resolve().then(() => __importStar(require('@angular-devkit/schematics')));
    const registry = new core_1.json.schema.CoreSchemaRegistry(formats.standardFormats);
    const validator = await registry.compile(schema).toPromise();
    const { success, errors } = await validator(data).toPromise();
    if (!success) {
        throw new core_1.json.schema.SchemaValidationException(errors);
    }
}
exports.validateWorkspace = validateWorkspace;
function findProjectByPath(workspace, location) {
    const isInside = (base, potential) => {
        const absoluteBase = path.resolve(workspace.basePath, base);
        const absolutePotential = path.resolve(workspace.basePath, potential);
        const relativePotential = path.relative(absoluteBase, absolutePotential);
        if (!relativePotential.startsWith('..') && !path.isAbsolute(relativePotential)) {
            return true;
        }
        return false;
    };
    const projects = Array.from(workspace.projects)
        .map(([name, project]) => [project.root, name])
        .filter((tuple) => isInside(tuple[0], location))
        // Sort tuples by depth, with the deeper ones first. Since the first member is a path and
        // we filtered all invalid paths, the longest will be the deepest (and in case of equality
        // the sort is stable and the first declared project will win).
        .sort((a, b) => b[0].length - a[0].length);
    if (projects.length === 0) {
        return null;
    }
    else if (projects.length > 1) {
        const found = new Set();
        const sameRoots = projects.filter((v) => {
            if (!found.has(v[0])) {
                found.add(v[0]);
                return false;
            }
            return true;
        });
        if (sameRoots.length > 0) {
            // Ambiguous location - cannot determine a project
            return null;
        }
    }
    return projects[0][1];
}
function getProjectByCwd(workspace) {
    if (workspace.projects.size === 1) {
        // If there is only one project, return that one.
        return Array.from(workspace.projects.keys())[0];
    }
    const project = findProjectByPath(workspace, process.cwd());
    if (project) {
        return project;
    }
    const defaultProject = workspace.extensions['defaultProject'];
    if (defaultProject && typeof defaultProject === 'string') {
        // If there is a default project name, return it.
        return defaultProject;
    }
    return null;
}
exports.getProjectByCwd = getProjectByCwd;
async function getConfiguredPackageManager() {
    var _a;
    const getPackageManager = (source) => {
        if (isJsonObject(source)) {
            const value = source['packageManager'];
            if (value && typeof value === 'string') {
                return value;
            }
        }
    };
    let result;
    const workspace = await getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project) {
            result = getPackageManager((_a = workspace.projects.get(project)) === null || _a === void 0 ? void 0 : _a.extensions['cli']);
        }
        result = result !== null && result !== void 0 ? result : getPackageManager(workspace.extensions['cli']);
    }
    if (result === undefined) {
        const globalOptions = await getWorkspace('global');
        result = getPackageManager(globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.extensions['cli']);
        if (!workspace && !globalOptions) {
            // Only check legacy if updated workspace is not found
            result = getLegacyPackageManager();
        }
    }
    // Default to null
    return result !== null && result !== void 0 ? result : null;
}
exports.getConfiguredPackageManager = getConfiguredPackageManager;
function migrateLegacyGlobalConfig() {
    const homeDir = os.homedir();
    if (homeDir) {
        const legacyGlobalConfigPath = path.join(homeDir, '.angular-cli.json');
        if ((0, fs_1.existsSync)(legacyGlobalConfigPath)) {
            const legacy = (0, json_file_1.readAndParseJson)(legacyGlobalConfigPath);
            if (!isJsonObject(legacy)) {
                return false;
            }
            const cli = {};
            if (legacy.packageManager &&
                typeof legacy.packageManager == 'string' &&
                legacy.packageManager !== 'default') {
                cli['packageManager'] = legacy.packageManager;
            }
            if (isJsonObject(legacy.defaults) &&
                isJsonObject(legacy.defaults.schematics) &&
                typeof legacy.defaults.schematics.collection == 'string') {
                cli['defaultCollection'] = legacy.defaults.schematics.collection;
            }
            if (isJsonObject(legacy.warnings)) {
                const warnings = {};
                if (typeof legacy.warnings.versionMismatch == 'boolean') {
                    warnings['versionMismatch'] = legacy.warnings.versionMismatch;
                }
                if (Object.getOwnPropertyNames(warnings).length > 0) {
                    cli['warnings'] = warnings;
                }
            }
            if (Object.getOwnPropertyNames(cli).length > 0) {
                const globalPath = path.join(homeDir, globalFileName);
                (0, fs_1.writeFileSync)(globalPath, JSON.stringify({ version: 1, cli }, null, 2));
                return true;
            }
        }
    }
    return false;
}
exports.migrateLegacyGlobalConfig = migrateLegacyGlobalConfig;
// Fallback, check for packageManager in config file in v1.* global config.
function getLegacyPackageManager() {
    const homeDir = os.homedir();
    if (homeDir) {
        const legacyGlobalConfigPath = path.join(homeDir, '.angular-cli.json');
        if ((0, fs_1.existsSync)(legacyGlobalConfigPath)) {
            const legacy = (0, json_file_1.readAndParseJson)(legacyGlobalConfigPath);
            if (!isJsonObject(legacy)) {
                return null;
            }
            if (legacy.packageManager &&
                typeof legacy.packageManager === 'string' &&
                legacy.packageManager !== 'default') {
                return legacy.packageManager;
            }
        }
    }
    return null;
}
async function getSchematicDefaults(collection, schematic, project) {
    var _a;
    const result = {};
    const mergeOptions = (source) => {
        if (isJsonObject(source)) {
            // Merge options from the qualified name
            Object.assign(result, source[`${collection}:${schematic}`]);
            // Merge options from nested collection schematics
            const collectionOptions = source[collection];
            if (isJsonObject(collectionOptions)) {
                Object.assign(result, collectionOptions[schematic]);
            }
        }
    };
    // Global level schematic options
    const globalOptions = await getWorkspace('global');
    mergeOptions(globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.extensions['schematics']);
    const workspace = await getWorkspace('local');
    if (workspace) {
        // Workspace level schematic options
        mergeOptions(workspace.extensions['schematics']);
        project = project || getProjectByCwd(workspace);
        if (project) {
            // Project level schematic options
            mergeOptions((_a = workspace.projects.get(project)) === null || _a === void 0 ? void 0 : _a.extensions['schematics']);
        }
    }
    return result;
}
exports.getSchematicDefaults = getSchematicDefaults;
async function isWarningEnabled(warning) {
    var _a;
    const getWarning = (source) => {
        if (isJsonObject(source)) {
            const warnings = source['warnings'];
            if (isJsonObject(warnings)) {
                const value = warnings[warning];
                if (typeof value == 'boolean') {
                    return value;
                }
            }
        }
    };
    let result;
    const workspace = await getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project) {
            result = getWarning((_a = workspace.projects.get(project)) === null || _a === void 0 ? void 0 : _a.extensions['cli']);
        }
        result = result !== null && result !== void 0 ? result : getWarning(workspace.extensions['cli']);
    }
    if (result === undefined) {
        const globalOptions = await getWorkspace('global');
        result = getWarning(globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.extensions['cli']);
    }
    // All warnings are enabled by default
    return result !== null && result !== void 0 ? result : true;
}
exports.isWarningEnabled = isWarningEnabled;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUF3RDtBQUN4RCwyQkFBdUU7QUFDdkUsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3Qix1Q0FBbUM7QUFDbkMsMkNBQXlEO0FBRXpELFNBQVMsWUFBWSxDQUFDLEtBQWlDO0lBQ3JELE9BQU8sS0FBSyxLQUFLLFNBQVMsSUFBSSxXQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFFRCxTQUFTLG1CQUFtQjtJQUMxQixPQUFPO1FBQ0wsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQ2pCLE9BQU8sSUFBQSxpQkFBWSxFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSTtZQUN4QixJQUFBLGtCQUFhLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUk7WUFDcEIsSUFBSTtnQkFDRixPQUFPLElBQUEsYUFBUSxFQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ3JDO1lBQUMsV0FBTTtnQkFDTixPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUNmLElBQUk7Z0JBQ0YsT0FBTyxJQUFBLGFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNoQztZQUFDLFdBQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7S0FDRixDQUFDO0FBQ0os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QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksT0FBTyxLQUFLLElBQUksU0FBUyxFQUFFO29CQUM3QixPQUFPLEtBQUssQ0FBQztpQkFDZDthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUM7SUFFRixJQUFJLE1BQTJCLENBQUM7SUFFaEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsSUFBSSxTQUFTLEVBQUU7UUFDYixNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsSUFBSSxPQUFPLEVBQUU7WUFDWCxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDBDQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3pFO1FBRUQsTUFBTSxHQUFHLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDNUQ7SUFFRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDeEIsTUFBTSxhQUFhLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxHQUFHLFVBQVUsQ0FBQyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDdkQ7SUFFRCxzQ0FBc0M7SUFDdEMsT0FBTyxNQUFNLGFBQU4sTUFBTSxjQUFOLE1BQU0sR0FBSSxJQUFJLENBQUM7QUFDeEIsQ0FBQztBQWhDRCw0Q0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsganNvbiwgd29ya3NwYWNlcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi9maW5kLXVwJztcbmltcG9ydCB7IEpTT05GaWxlLCByZWFkQW5kUGFyc2VKc29uIH0gZnJvbSAnLi9qc29uLWZpbGUnO1xuXG5mdW5jdGlvbiBpc0pzb25PYmplY3QodmFsdWU6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogdmFsdWUgaXMganNvbi5Kc29uT2JqZWN0IHtcbiAgcmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQgJiYganNvbi5pc0pzb25PYmplY3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXb3Jrc3BhY2VIb3N0KCk6IHdvcmtzcGFjZXMuV29ya3NwYWNlSG9zdCB7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgcmVhZEZpbGUocGF0aCkge1xuICAgICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICB9LFxuICAgIGFzeW5jIHdyaXRlRmlsZShwYXRoLCBkYXRhKSB7XG4gICAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGRhdGEpO1xuICAgIH0sXG4gICAgYXN5bmMgaXNEaXJlY3RvcnkocGF0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHN0YXRTeW5jKHBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXN5bmMgaXNGaWxlKHBhdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBzdGF0U3luYyhwYXRoKS5pc0ZpbGUoKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2NoZW1hTG9jYXRpb24oKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9saWIvY29uZmlnL3NjaGVtYS5qc29uJyk7XG59XG5cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTY2hlbWFQYXRoID0gZ2V0U2NoZW1hTG9jYXRpb24oKTtcblxuY29uc3QgY29uZmlnTmFtZXMgPSBbJ2FuZ3VsYXIuanNvbicsICcuYW5ndWxhci5qc29uJ107XG5jb25zdCBnbG9iYWxGaWxlTmFtZSA9ICcuYW5ndWxhci1jb25maWcuanNvbic7XG5cbmZ1bmN0aW9uIHhkZ0NvbmZpZ0hvbWUoaG9tZTogc3RyaW5nLCBjb25maWdGaWxlPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gaHR0cHM6Ly9zcGVjaWZpY2F0aW9ucy5mcmVlZGVza3RvcC5vcmcvYmFzZWRpci1zcGVjL2Jhc2VkaXItc3BlYy1sYXRlc3QuaHRtbFxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddIHx8IHBhdGguam9pbihob21lLCAnLmNvbmZpZycpO1xuICBjb25zdCB4ZGdBbmd1bGFySG9tZSA9IHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBjb25maWdGaWxlID8gcGF0aC5qb2luKHhkZ0FuZ3VsYXJIb21lLCBjb25maWdGaWxlKSA6IHhkZ0FuZ3VsYXJIb21lO1xufVxuXG5mdW5jdGlvbiB4ZGdDb25maWdIb21lT2xkKGhvbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIENoZWNrIHRoZSBjb25maWd1cmF0aW9uIGZpbGVzIGluIHRoZSBvbGQgbG9jYXRpb24gdGhhdCBzaG91bGQgYmU6XG4gIC8vIC0gJFhER19DT05GSUdfSE9NRS8uYW5ndWxhci1jb25maWcuanNvbiAoaWYgWERHX0NPTkZJR19IT01FIGlzIHNldClcbiAgLy8gLSAkSE9NRS8uY29uZmlnL2FuZ3VsYXIvLmFuZ3VsYXItY29uZmlnLmpzb24gKG90aGVyd2lzZSlcbiAgY29uc3QgcCA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBwYXRoLmpvaW4ocCwgJy5hbmd1bGFyLWNvbmZpZy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHByb2plY3RGaWxlUGF0aChwcm9qZWN0UGF0aD86IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAvLyBGaW5kIHRoZSBjb25maWd1cmF0aW9uLCBlaXRoZXIgd2hlcmUgc3BlY2lmaWVkLCBpbiB0aGUgQW5ndWxhciBDTEkgcHJvamVjdFxuICAvLyAoaWYgaXQncyBpbiBub2RlX21vZHVsZXMpIG9yIGZyb20gdGhlIGN1cnJlbnQgcHJvY2Vzcy5cbiAgcmV0dXJuIChcbiAgICAocHJvamVjdFBhdGggJiYgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9qZWN0UGF0aCkpIHx8XG4gICAgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9jZXNzLmN3ZCgpKSB8fFxuICAgIGZpbmRVcChjb25maWdOYW1lcywgX19kaXJuYW1lKVxuICApO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxGaWxlUGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBmb2xsb3cgWERHIEJhc2UgRGlyZWN0b3J5IHNwZWNcbiAgLy8gbm90ZSB0aGF0IGNyZWF0ZUdsb2JhbFNldHRpbmdzKCkgd2lsbCBjb250aW51ZSBjcmVhdGluZ1xuICAvLyBnbG9iYWwgZmlsZSBpbiBob21lIGRpcmVjdG9yeSwgd2l0aCB0aGlzIHVzZXIgd2lsbCBoYXZlXG4gIC8vIGNob2ljZSB0byBtb3ZlIGNoYW5nZSBpdHMgbG9jYXRpb24gdG8gbWVldCBYREcgY29udmVudGlvblxuICBjb25zdCB4ZGdDb25maWcgPSB4ZGdDb25maWdIb21lKGhvbWUsICdjb25maWcuanNvbicpO1xuICBpZiAoZXhpc3RzU3luYyh4ZGdDb25maWcpKSB7XG4gICAgcmV0dXJuIHhkZ0NvbmZpZztcbiAgfVxuICAvLyBOT1RFOiBUaGlzIGNoZWNrIGlzIGZvciB0aGUgb2xkIGNvbmZpZ3VyYXRpb24gbG9jYXRpb24sIGZvciBtb3JlXG4gIC8vIGluZm9ybWF0aW9uIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzIwNTU2XG4gIGNvbnN0IHhkZ0NvbmZpZ09sZCA9IHhkZ0NvbmZpZ0hvbWVPbGQoaG9tZSk7XG4gIGlmIChleGlzdHNTeW5jKHhkZ0NvbmZpZ09sZCkpIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgY29uc29sZS53YXJuKFxuICAgICAgYE9sZCBjb25maWd1cmF0aW9uIGxvY2F0aW9uIGRldGVjdGVkOiAke3hkZ0NvbmZpZ09sZH1cXG5gICtcbiAgICAgICAgYFBsZWFzZSBtb3ZlIHRoZSBmaWxlIHRvIHRoZSBuZXcgbG9jYXRpb24gfi8uY29uZmlnL2FuZ3VsYXIvY29uZmlnLmpzb25gLFxuICAgICk7XG5cbiAgICByZXR1cm4geGRnQ29uZmlnT2xkO1xuICB9XG5cbiAgY29uc3QgcCA9IHBhdGguam9pbihob21lLCBnbG9iYWxGaWxlTmFtZSk7XG4gIGlmIChleGlzdHNTeW5jKHApKSB7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJXb3Jrc3BhY2Uge1xuICByZWFkb25seSBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd29ya3NwYWNlOiB3b3Jrc3BhY2VzLldvcmtzcGFjZURlZmluaXRpb24sIHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmJhc2VQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgfVxuXG4gIGdldCBleHRlbnNpb25zKCk6IFJlY29yZDxzdHJpbmcsIGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnM7XG4gIH1cblxuICBnZXQgcHJvamVjdHMoKTogd29ya3NwYWNlcy5Qcm9qZWN0RGVmaW5pdGlvbkNvbGxlY3Rpb24ge1xuICAgIHJldHVybiB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cztcbiAgfVxuXG4gIC8vIFRlbXBvcmFyeSBoZWxwZXIgZnVuY3Rpb25zIHRvIHN1cHBvcnQgcmVmYWN0b3JpbmdcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRDbGkoKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuICh0aGlzLndvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgfHwge307XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRQcm9qZWN0Q2xpKHByb2plY3ROYW1lOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcblxuICAgIHJldHVybiAocHJvamVjdD8uZXh0ZW5zaW9uc1snY2xpJ10gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHx8IHt9O1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGxvYWQod29ya3NwYWNlRmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVOYW1lcyA9IFsnLmFuZ3VsYXItY2xpLmpzb24nLCAnYW5ndWxhci1jbGkuanNvbiddO1xuICAgIGlmIChvbGRDb25maWdGaWxlTmFtZXMuaW5jbHVkZXMocGF0aC5iYXNlbmFtZSh3b3Jrc3BhY2VGaWxlUGF0aCkpKSB7XG4gICAgICAvLyAxLnggZmlsZSBmb3JtYXRcbiAgICAgIC8vIENyZWF0ZSBhbiBlbXB0eSB3b3Jrc3BhY2UgdG8gYWxsb3cgdXBkYXRlIHRvIGJlIHVzZWRcbiAgICAgIHJldHVybiBuZXcgQW5ndWxhcldvcmtzcGFjZShcbiAgICAgICAgeyBleHRlbnNpb25zOiB7fSwgcHJvamVjdHM6IG5ldyB3b3Jrc3BhY2VzLlByb2plY3REZWZpbml0aW9uQ29sbGVjdGlvbigpIH0sXG4gICAgICAgIHdvcmtzcGFjZUZpbGVQYXRoLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3b3Jrc3BhY2VzLnJlYWRXb3Jrc3BhY2UoXG4gICAgICB3b3Jrc3BhY2VGaWxlUGF0aCxcbiAgICAgIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKSxcbiAgICAgIHdvcmtzcGFjZXMuV29ya3NwYWNlRm9ybWF0LkpTT04sXG4gICAgKTtcblxuICAgIHJldHVybiBuZXcgQW5ndWxhcldvcmtzcGFjZShyZXN1bHQud29ya3NwYWNlLCB3b3Jrc3BhY2VGaWxlUGF0aCk7XG4gIH1cbn1cblxuY29uc3QgY2FjaGVkV29ya3NwYWNlcyA9IG5ldyBNYXA8c3RyaW5nLCBBbmd1bGFyV29ya3NwYWNlIHwgbnVsbD4oKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZShcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBQcm9taXNlPEFuZ3VsYXJXb3Jrc3BhY2UgfCBudWxsPiB7XG4gIGNvbnN0IGNhY2hlZCA9IGNhY2hlZFdvcmtzcGFjZXMuZ2V0KGxldmVsKTtcbiAgaWYgKGNhY2hlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgbnVsbCk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgQW5ndWxhcldvcmtzcGFjZS5sb2FkKGNvbmZpZ1BhdGgpO1xuICAgIGNhY2hlZFdvcmtzcGFjZXMuc2V0KGxldmVsLCB3b3Jrc3BhY2UpO1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgV29ya3NwYWNlIGNvbmZpZyBmaWxlIGNhbm5vdCBiZSBsb2FkZWQ6ICR7Y29uZmlnUGF0aH1gICtcbiAgICAgICAgYFxcbiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBlcnJvcn1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUdsb2JhbFNldHRpbmdzKCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKCk7XG4gIGlmICghaG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gaG9tZSBkaXJlY3RvcnkgZm91bmQuJyk7XG4gIH1cblxuICBjb25zdCBnbG9iYWxQYXRoID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgd3JpdGVGaWxlU3luYyhnbG9iYWxQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDEgfSkpO1xuXG4gIHJldHVybiBnbG9iYWxQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUmF3KFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFtKU09ORmlsZSB8IG51bGwsIHN0cmluZyB8IG51bGxdIHtcbiAgbGV0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBpZiAobGV2ZWwgPT09ICdnbG9iYWwnKSB7XG4gICAgICBjb25maWdQYXRoID0gY3JlYXRlR2xvYmFsU2V0dGluZ3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtudWxsLCBudWxsXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW25ldyBKU09ORmlsZShjb25maWdQYXRoKSwgY29uZmlnUGF0aF07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZVdvcmtzcGFjZShkYXRhOiBqc29uLkpzb25PYmplY3QpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc2NoZW1hID0gcmVhZEFuZFBhcnNlSnNvbihcbiAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGliL2NvbmZpZy9zY2hlbWEuanNvbicpLFxuICApIGFzIGpzb24uc2NoZW1hLkpzb25TY2hlbWE7XG4gIGNvbnN0IHsgZm9ybWF0cyB9ID0gYXdhaXQgaW1wb3J0KCdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcycpO1xuICBjb25zdCByZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpO1xuICBjb25zdCB2YWxpZGF0b3IgPSBhd2FpdCByZWdpc3RyeS5jb21waWxlKHNjaGVtYSkudG9Qcm9taXNlKCk7XG5cbiAgY29uc3QgeyBzdWNjZXNzLCBlcnJvcnMgfSA9IGF3YWl0IHZhbGlkYXRvcihkYXRhKS50b1Byb21pc2UoKTtcbiAgaWYgKCFzdWNjZXNzKSB7XG4gICAgdGhyb3cgbmV3IGpzb24uc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24oZXJyb3JzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kUHJvamVjdEJ5UGF0aCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UsIGxvY2F0aW9uOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UuYmFzZVBhdGgsIGJhc2UpO1xuICAgIGNvbnN0IGFic29sdXRlUG90ZW50aWFsID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cylcbiAgICAubWFwKChbbmFtZSwgcHJvamVjdF0pID0+IFtwcm9qZWN0LnJvb3QsIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBsb2NhdGlvbikpXG4gICAgLy8gU29ydCB0dXBsZXMgYnkgZGVwdGgsIHdpdGggdGhlIGRlZXBlciBvbmVzIGZpcnN0LiBTaW5jZSB0aGUgZmlyc3QgbWVtYmVyIGlzIGEgcGF0aCBhbmRcbiAgICAvLyB3ZSBmaWx0ZXJlZCBhbGwgaW52YWxpZCBwYXRocywgdGhlIGxvbmdlc3Qgd2lsbCBiZSB0aGUgZGVlcGVzdCAoYW5kIGluIGNhc2Ugb2YgZXF1YWxpdHlcbiAgICAvLyB0aGUgc29ydCBpcyBzdGFibGUgYW5kIHRoZSBmaXJzdCBkZWNsYXJlZCBwcm9qZWN0IHdpbGwgd2luKS5cbiAgICAuc29ydCgoYSwgYikgPT4gYlswXS5sZW5ndGggLSBhWzBdLmxlbmd0aCk7XG5cbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHByb2plY3RzLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCBmb3VuZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHNhbWVSb290cyA9IHByb2plY3RzLmZpbHRlcigodikgPT4ge1xuICAgICAgaWYgKCFmb3VuZC5oYXModlswXSkpIHtcbiAgICAgICAgZm91bmQuYWRkKHZbMF0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKHNhbWVSb290cy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBBbWJpZ3VvdXMgbG9jYXRpb24gLSBjYW5ub3QgZGV0ZXJtaW5lIGEgcHJvamVjdFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByb2plY3RzWzBdWzFdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSk6IHN0cmluZyB8IG51bGwge1xuICBpZiAod29ya3NwYWNlLnByb2plY3RzLnNpemUgPT09IDEpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBvbmx5IG9uZSBwcm9qZWN0LCByZXR1cm4gdGhhdCBvbmUuXG4gICAgcmV0dXJuIEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzLmtleXMoKSlbMF07XG4gIH1cblxuICBjb25zdCBwcm9qZWN0ID0gZmluZFByb2plY3RCeVBhdGgod29ya3NwYWNlLCBwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKHByb2plY3QpIHtcbiAgICByZXR1cm4gcHJvamVjdDtcbiAgfVxuXG4gIGNvbnN0IGRlZmF1bHRQcm9qZWN0ID0gd29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gIGlmIChkZWZhdWx0UHJvamVjdCAmJiB0eXBlb2YgZGVmYXVsdFByb2plY3QgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYSBkZWZhdWx0IHByb2plY3QgbmFtZSwgcmV0dXJuIGl0LlxuICAgIHJldHVybiBkZWZhdWx0UHJvamVjdDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q29uZmlndXJlZFBhY2thZ2VNYW5hZ2VyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBnZXRQYWNrYWdlTWFuYWdlciA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkID0+IHtcbiAgICBpZiAoaXNKc29uT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc291cmNlWydwYWNrYWdlTWFuYWdlciddO1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzdWx0OiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgIH1cblxuICAgIHJlc3VsdCA9IHJlc3VsdCA/PyBnZXRQYWNrYWdlTWFuYWdlcih3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuXG4gICAgaWYgKCF3b3Jrc3BhY2UgJiYgIWdsb2JhbE9wdGlvbnMpIHtcbiAgICAgIC8vIE9ubHkgY2hlY2sgbGVnYWN5IGlmIHVwZGF0ZWQgd29ya3NwYWNlIGlzIG5vdCBmb3VuZFxuICAgICAgcmVzdWx0ID0gZ2V0TGVnYWN5UGFja2FnZU1hbmFnZXIoKTtcbiAgICB9XG4gIH1cblxuICAvLyBEZWZhdWx0IHRvIG51bGxcbiAgcmV0dXJuIHJlc3VsdCA/PyBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWlncmF0ZUxlZ2FjeUdsb2JhbENvbmZpZygpOiBib29sZWFuIHtcbiAgY29uc3QgaG9tZURpciA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKGhvbWVEaXIpIHtcbiAgICBjb25zdCBsZWdhY3lHbG9iYWxDb25maWdQYXRoID0gcGF0aC5qb2luKGhvbWVEaXIsICcuYW5ndWxhci1jbGkuanNvbicpO1xuICAgIGlmIChleGlzdHNTeW5jKGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGgpKSB7XG4gICAgICBjb25zdCBsZWdhY3kgPSByZWFkQW5kUGFyc2VKc29uKGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGgpO1xuICAgICAgaWYgKCFpc0pzb25PYmplY3QobGVnYWN5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNsaToganNvbi5Kc29uT2JqZWN0ID0ge307XG5cbiAgICAgIGlmIChcbiAgICAgICAgbGVnYWN5LnBhY2thZ2VNYW5hZ2VyICYmXG4gICAgICAgIHR5cGVvZiBsZWdhY3kucGFja2FnZU1hbmFnZXIgPT0gJ3N0cmluZycgJiZcbiAgICAgICAgbGVnYWN5LnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCdcbiAgICAgICkge1xuICAgICAgICBjbGlbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBsZWdhY3kucGFja2FnZU1hbmFnZXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgaXNKc29uT2JqZWN0KGxlZ2FjeS5kZWZhdWx0cykgJiZcbiAgICAgICAgaXNKc29uT2JqZWN0KGxlZ2FjeS5kZWZhdWx0cy5zY2hlbWF0aWNzKSAmJlxuICAgICAgICB0eXBlb2YgbGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbiA9PSAnc3RyaW5nJ1xuICAgICAgKSB7XG4gICAgICAgIGNsaVsnZGVmYXVsdENvbGxlY3Rpb24nXSA9IGxlZ2FjeS5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb247XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0pzb25PYmplY3QobGVnYWN5Lndhcm5pbmdzKSkge1xuICAgICAgICBjb25zdCB3YXJuaW5nczoganNvbi5Kc29uT2JqZWN0ID0ge307XG4gICAgICAgIGlmICh0eXBlb2YgbGVnYWN5Lndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB3YXJuaW5nc1sndmVyc2lvbk1pc21hdGNoJ10gPSBsZWdhY3kud2FybmluZ3MudmVyc2lvbk1pc21hdGNoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHdhcm5pbmdzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY2xpWyd3YXJuaW5ncyddID0gd2FybmluZ3M7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNsaSkubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBnbG9iYWxQYXRoID0gcGF0aC5qb2luKGhvbWVEaXIsIGdsb2JhbEZpbGVOYW1lKTtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhnbG9iYWxQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDEsIGNsaSB9LCBudWxsLCAyKSk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBGYWxsYmFjaywgY2hlY2sgZm9yIHBhY2thZ2VNYW5hZ2VyIGluIGNvbmZpZyBmaWxlIGluIHYxLiogZ2xvYmFsIGNvbmZpZy5cbmZ1bmN0aW9uIGdldExlZ2FjeVBhY2thZ2VNYW5hZ2VyKCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBob21lRGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAoaG9tZURpcikge1xuICAgIGNvbnN0IGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGggPSBwYXRoLmpvaW4oaG9tZURpciwgJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCkpIHtcbiAgICAgIGNvbnN0IGxlZ2FjeSA9IHJlYWRBbmRQYXJzZUpzb24obGVnYWN5R2xvYmFsQ29uZmlnUGF0aCk7XG4gICAgICBpZiAoIWlzSnNvbk9iamVjdChsZWdhY3kpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIGxlZ2FjeS5wYWNrYWdlTWFuYWdlciAmJlxuICAgICAgICB0eXBlb2YgbGVnYWN5LnBhY2thZ2VNYW5hZ2VyID09PSAnc3RyaW5nJyAmJlxuICAgICAgICBsZWdhY3kucGFja2FnZU1hbmFnZXIgIT09ICdkZWZhdWx0J1xuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBsZWdhY3kucGFja2FnZU1hbmFnZXI7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTY2hlbWF0aWNEZWZhdWx0cyhcbiAgY29sbGVjdGlvbjogc3RyaW5nLFxuICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgcHJvamVjdD86IHN0cmluZyB8IG51bGwsXG4pOiBQcm9taXNlPHt9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBtZXJnZU9wdGlvbnMgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIHRoZSBxdWFsaWZpZWQgbmFtZVxuICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIHNvdXJjZVtgJHtjb2xsZWN0aW9ufToke3NjaGVtYXRpY31gXSk7XG5cbiAgICAgIC8vIE1lcmdlIG9wdGlvbnMgZnJvbSBuZXN0ZWQgY29sbGVjdGlvbiBzY2hlbWF0aWNzXG4gICAgICBjb25zdCBjb2xsZWN0aW9uT3B0aW9ucyA9IHNvdXJjZVtjb2xsZWN0aW9uXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3QoY29sbGVjdGlvbk9wdGlvbnMpKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCBjb2xsZWN0aW9uT3B0aW9uc1tzY2hlbWF0aWNdKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gR2xvYmFsIGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBtZXJnZU9wdGlvbnMoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAvLyBXb3Jrc3BhY2UgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG5cbiAgICBwcm9qZWN0ID0gcHJvamVjdCB8fCBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgLy8gUHJvamVjdCBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgICAgbWVyZ2VPcHRpb25zKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzV2FybmluZ0VuYWJsZWQod2FybmluZzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGdldFdhcm5pbmcgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBzb3VyY2VbJ3dhcm5pbmdzJ107XG4gICAgICBpZiAoaXNKc29uT2JqZWN0KHdhcm5pbmdzKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdhcm5pbmdzW3dhcm5pbmddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdib29sZWFuJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzdWx0OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0V2FybmluZyh3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ID8/IGdldFdhcm5pbmcod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFdhcm5pbmcoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgLy8gQWxsIHdhcm5pbmdzIGFyZSBlbmFibGVkIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHJlc3VsdCA/PyB0cnVlO1xufVxuIl19