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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQXdEO0FBQ3hELDJCQUF1RTtBQUN2RSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLHVDQUFtQztBQUNuQywyQ0FBeUQ7QUFFekQsU0FBUyxZQUFZLENBQUMsS0FBaUM7SUFDckQsT0FBTyxLQUFLLEtBQUssU0FBUyxJQUFJLFdBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUVELFNBQVMsbUJBQW1CO0lBQzFCLE9BQU87UUFDTCxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDakIsT0FBTyxJQUFBLGlCQUFZLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFDRCxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJO1lBQ3hCLElBQUEsa0JBQWEsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSTtZQUNwQixJQUFJO2dCQUNGLE9BQU8sSUFBQSxhQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDckM7WUFBQyxXQUFNO2dCQUNOLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJO1lBQ2YsSUFBSTtnQkFDRixPQUFPLElBQUEsYUFBUSxFQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ2hDO1lBQUMsV0FBTTtnQkFDTixPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFD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QU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxPQUFPLEtBQUssSUFBSSxTQUFTLEVBQUU7b0JBQzdCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7U0FDRjtJQUNILENBQUMsQ0FBQztJQUVGLElBQUksTUFBMkIsQ0FBQztJQUVoQyxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxJQUFJLFNBQVMsRUFBRTtRQUNiLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsMENBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDekU7UUFFRCxNQUFNLEdBQUcsTUFBTSxhQUFOLE1BQU0sY0FBTixNQUFNLEdBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUM1RDtJQUVELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtRQUN4QixNQUFNLGFBQWEsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLEdBQUcsVUFBVSxDQUFDLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUN2RDtJQUVELHNDQUFzQztJQUN0QyxPQUFPLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLElBQUksQ0FBQztBQUN4QixDQUFDO0FBaENELDRDQWdDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqc29uLCB3b3Jrc3BhY2VzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuL2ZpbmQtdXAnO1xuaW1wb3J0IHsgSlNPTkZpbGUsIHJlYWRBbmRQYXJzZUpzb24gfSBmcm9tICcuL2pzb24tZmlsZSc7XG5cbmZ1bmN0aW9uIGlzSnNvbk9iamVjdCh2YWx1ZToganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQpOiB2YWx1ZSBpcyBqc29uLkpzb25PYmplY3Qge1xuICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiBqc29uLmlzSnNvbk9iamVjdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VIb3N0IHtcbiAgcmV0dXJuIHtcbiAgICBhc3luYyByZWFkRmlsZShwYXRoKSB7XG4gICAgICByZXR1cm4gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgIH0sXG4gICAgYXN5bmMgd3JpdGVGaWxlKHBhdGgsIGRhdGEpIHtcbiAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZGF0YSk7XG4gICAgfSxcbiAgICBhc3luYyBpc0RpcmVjdG9yeShwYXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gc3RhdFN5bmMocGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgICBhc3luYyBpc0ZpbGUocGF0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHN0YXRTeW5jKHBhdGgpLmlzRmlsZSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTY2hlbWFMb2NhdGlvbigpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xpYi9jb25maWcvc2NoZW1hLmpzb24nKTtcbn1cblxuZXhwb3J0IGNvbnN0IHdvcmtzcGFjZVNjaGVtYVBhdGggPSBnZXRTY2hlbWFMb2NhdGlvbigpO1xuXG5jb25zdCBjb25maWdOYW1lcyA9IFsnYW5ndWxhci5qc29uJywgJy5hbmd1bGFyLmpzb24nXTtcbmNvbnN0IGdsb2JhbEZpbGVOYW1lID0gJy5hbmd1bGFyLWNvbmZpZy5qc29uJztcblxuZnVuY3Rpb24geGRnQ29uZmlnSG9tZShob21lOiBzdHJpbmcsIGNvbmZpZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBodHRwczovL3NwZWNpZmljYXRpb25zLmZyZWVkZXNrdG9wLm9yZy9iYXNlZGlyLXNwZWMvYmFzZWRpci1zcGVjLWxhdGVzdC5odG1sXG4gIGNvbnN0IHhkZ0NvbmZpZ0hvbWUgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ10gfHwgcGF0aC5qb2luKGhvbWUsICcuY29uZmlnJyk7XG4gIGNvbnN0IHhkZ0FuZ3VsYXJIb21lID0gcGF0aC5qb2luKHhkZ0NvbmZpZ0hvbWUsICdhbmd1bGFyJyk7XG5cbiAgcmV0dXJuIGNvbmZpZ0ZpbGUgPyBwYXRoLmpvaW4oeGRnQW5ndWxhckhvbWUsIGNvbmZpZ0ZpbGUpIDogeGRnQW5ndWxhckhvbWU7XG59XG5cbmZ1bmN0aW9uIHhkZ0NvbmZpZ0hvbWVPbGQoaG9tZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gQ2hlY2sgdGhlIGNvbmZpZ3VyYXRpb24gZmlsZXMgaW4gdGhlIG9sZCBsb2NhdGlvbiB0aGF0IHNob3VsZCBiZTpcbiAgLy8gLSAkWERHX0NPTkZJR19IT01FLy5hbmd1bGFyLWNvbmZpZy5qc29uIChpZiBYREdfQ09ORklHX0hPTUUgaXMgc2V0KVxuICAvLyAtICRIT01FLy5jb25maWcvYW5ndWxhci8uYW5ndWxhci1jb25maWcuanNvbiAob3RoZXJ3aXNlKVxuICBjb25zdCBwID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddIHx8IHBhdGguam9pbihob21lLCAnLmNvbmZpZycsICdhbmd1bGFyJyk7XG5cbiAgcmV0dXJuIHBhdGguam9pbihwLCAnLmFuZ3VsYXItY29uZmlnLmpzb24nKTtcbn1cblxuZnVuY3Rpb24gcHJvamVjdEZpbGVQYXRoKHByb2plY3RQYXRoPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIC8vIEZpbmQgdGhlIGNvbmZpZ3VyYXRpb24sIGVpdGhlciB3aGVyZSBzcGVjaWZpZWQsIGluIHRoZSBBbmd1bGFyIENMSSBwcm9qZWN0XG4gIC8vIChpZiBpdCdzIGluIG5vZGVfbW9kdWxlcykgb3IgZnJvbSB0aGUgY3VycmVudCBwcm9jZXNzLlxuICByZXR1cm4gKFxuICAgIChwcm9qZWN0UGF0aCAmJiBmaW5kVXAoY29uZmlnTmFtZXMsIHByb2plY3RQYXRoKSkgfHxcbiAgICBmaW5kVXAoY29uZmlnTmFtZXMsIHByb2Nlc3MuY3dkKCkpIHx8XG4gICAgZmluZFVwKGNvbmZpZ05hbWVzLCBfX2Rpcm5hbWUpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdsb2JhbEZpbGVQYXRoKCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpO1xuICBpZiAoIWhvbWUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIGZvbGxvdyBYREcgQmFzZSBEaXJlY3Rvcnkgc3BlY1xuICAvLyBub3RlIHRoYXQgY3JlYXRlR2xvYmFsU2V0dGluZ3MoKSB3aWxsIGNvbnRpbnVlIGNyZWF0aW5nXG4gIC8vIGdsb2JhbCBmaWxlIGluIGhvbWUgZGlyZWN0b3J5LCB3aXRoIHRoaXMgdXNlciB3aWxsIGhhdmVcbiAgLy8gY2hvaWNlIHRvIG1vdmUgY2hhbmdlIGl0cyBsb2NhdGlvbiB0byBtZWV0IFhERyBjb252ZW50aW9uXG4gIGNvbnN0IHhkZ0NvbmZpZyA9IHhkZ0NvbmZpZ0hvbWUoaG9tZSwgJ2NvbmZpZy5qc29uJyk7XG4gIGlmIChleGlzdHNTeW5jKHhkZ0NvbmZpZykpIHtcbiAgICByZXR1cm4geGRnQ29uZmlnO1xuICB9XG4gIC8vIE5PVEU6IFRoaXMgY2hlY2sgaXMgZm9yIHRoZSBvbGQgY29uZmlndXJhdGlvbiBsb2NhdGlvbiwgZm9yIG1vcmVcbiAgLy8gaW5mb3JtYXRpb24gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMjA1NTZcbiAgY29uc3QgeGRnQ29uZmlnT2xkID0geGRnQ29uZmlnSG9tZU9sZChob21lKTtcbiAgaWYgKGV4aXN0c1N5bmMoeGRnQ29uZmlnT2xkKSkge1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICBjb25zb2xlLndhcm4oXG4gICAgICBgT2xkIGNvbmZpZ3VyYXRpb24gbG9jYXRpb24gZGV0ZWN0ZWQ6ICR7eGRnQ29uZmlnT2xkfVxcbmAgK1xuICAgICAgICBgUGxlYXNlIG1vdmUgdGhlIGZpbGUgdG8gdGhlIG5ldyBsb2NhdGlvbiB+Ly5jb25maWcvYW5ndWxhci9jb25maWcuanNvbmAsXG4gICAgKTtcblxuICAgIHJldHVybiB4ZGdDb25maWdPbGQ7XG4gIH1cblxuICBjb25zdCBwID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgaWYgKGV4aXN0c1N5bmMocCkpIHtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgY2xhc3MgQW5ndWxhcldvcmtzcGFjZSB7XG4gIHJlYWRvbmx5IGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3b3Jrc3BhY2U6IHdvcmtzcGFjZXMuV29ya3NwYWNlRGVmaW5pdGlvbiwgcmVhZG9ubHkgZmlsZVBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuYmFzZVBhdGggPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGV4dGVuc2lvbnMoKTogUmVjb3JkPHN0cmluZywganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9ucztcbiAgfVxuXG4gIGdldCBwcm9qZWN0cygpOiB3b3Jrc3BhY2VzLlByb2plY3REZWZpbml0aW9uQ29sbGVjdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLnByb2plY3RzO1xuICB9XG5cbiAgLy8gVGVtcG9yYXJ5IGhlbHBlciBmdW5jdGlvbnMgdG8gc3VwcG9ydCByZWZhY3RvcmluZ1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldENsaSgpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICByZXR1cm4gKHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldFByb2plY3RDbGkocHJvamVjdE5hbWU6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuXG4gICAgcmV0dXJuIChwcm9qZWN0Py5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgfHwge307XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgbG9hZCh3b3Jrc3BhY2VGaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxBbmd1bGFyV29ya3NwYWNlPiB7XG4gICAgY29uc3Qgb2xkQ29uZmlnRmlsZU5hbWVzID0gWycuYW5ndWxhci1jbGkuanNvbicsICdhbmd1bGFyLWNsaS5qc29uJ107XG4gICAgaWYgKG9sZENvbmZpZ0ZpbGVOYW1lcy5pbmNsdWRlcyhwYXRoLmJhc2VuYW1lKHdvcmtzcGFjZUZpbGVQYXRoKSkpIHtcbiAgICAgIC8vIDEueCBmaWxlIGZvcm1hdFxuICAgICAgLy8gQ3JlYXRlIGFuIGVtcHR5IHdvcmtzcGFjZSB0byBhbGxvdyB1cGRhdGUgdG8gYmUgdXNlZFxuICAgICAgcmV0dXJuIG5ldyBBbmd1bGFyV29ya3NwYWNlKFxuICAgICAgICB7IGV4dGVuc2lvbnM6IHt9LCBwcm9qZWN0czogbmV3IHdvcmtzcGFjZXMuUHJvamVjdERlZmluaXRpb25Db2xsZWN0aW9uKCkgfSxcbiAgICAgICAgd29ya3NwYWNlRmlsZVBhdGgsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdvcmtzcGFjZXMucmVhZFdvcmtzcGFjZShcbiAgICAgIHdvcmtzcGFjZUZpbGVQYXRoLFxuICAgICAgY3JlYXRlV29ya3NwYWNlSG9zdCgpLFxuICAgICAgd29ya3NwYWNlcy5Xb3Jrc3BhY2VGb3JtYXQuSlNPTixcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBbmd1bGFyV29ya3NwYWNlKHJlc3VsdC53b3Jrc3BhY2UsIHdvcmtzcGFjZUZpbGVQYXRoKTtcbiAgfVxufVxuXG5jb25zdCBjYWNoZWRXb3Jrc3BhY2VzID0gbmV3IE1hcDxzdHJpbmcsIEFuZ3VsYXJXb3Jrc3BhY2UgfCBudWxsPigpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V29ya3NwYWNlKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZSB8IG51bGw+IHtcbiAgY29uc3QgY2FjaGVkID0gY2FjaGVkV29ya3NwYWNlcy5nZXQobGV2ZWwpO1xuICBpZiAoY2FjaGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG5cbiAgY29uc3QgY29uZmlnUGF0aCA9IGxldmVsID09PSAnbG9jYWwnID8gcHJvamVjdEZpbGVQYXRoKCkgOiBnbG9iYWxGaWxlUGF0aCgpO1xuXG4gIGlmICghY29uZmlnUGF0aCkge1xuICAgIGNhY2hlZFdvcmtzcGFjZXMuc2V0KGxldmVsLCBudWxsKTtcblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBBbmd1bGFyV29ya3NwYWNlLmxvYWQoY29uZmlnUGF0aCk7XG4gICAgY2FjaGVkV29ya3NwYWNlcy5zZXQobGV2ZWwsIHdvcmtzcGFjZSk7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBXb3Jrc3BhY2UgY29uZmlnIGZpbGUgY2Fubm90IGJlIGxvYWRlZDogJHtjb25maWdQYXRofWAgK1xuICAgICAgICBgXFxuJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IGVycm9yfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlR2xvYmFsU2V0dGluZ3MoKTogc3RyaW5nIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBob21lIGRpcmVjdG9yeSBmb3VuZC4nKTtcbiAgfVxuXG4gIGNvbnN0IGdsb2JhbFBhdGggPSBwYXRoLmpvaW4oaG9tZSwgZ2xvYmFsRmlsZU5hbWUpO1xuICB3cml0ZUZpbGVTeW5jKGdsb2JhbFBhdGgsIEpTT04uc3RyaW5naWZ5KHsgdmVyc2lvbjogMSB9KSk7XG5cbiAgcmV0dXJuIGdsb2JhbFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VSYXcoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcgPSAnbG9jYWwnLFxuKTogW0pTT05GaWxlIHwgbnVsbCwgc3RyaW5nIHwgbnVsbF0ge1xuICBsZXQgY29uZmlnUGF0aCA9IGxldmVsID09PSAnbG9jYWwnID8gcHJvamVjdEZpbGVQYXRoKCkgOiBnbG9iYWxGaWxlUGF0aCgpO1xuXG4gIGlmICghY29uZmlnUGF0aCkge1xuICAgIGlmIChsZXZlbCA9PT0gJ2dsb2JhbCcpIHtcbiAgICAgIGNvbmZpZ1BhdGggPSBjcmVhdGVHbG9iYWxTZXR0aW5ncygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW251bGwsIG51bGxdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbbmV3IEpTT05GaWxlKGNvbmZpZ1BhdGgpLCBjb25maWdQYXRoXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlV29ya3NwYWNlKGRhdGE6IGpzb24uSnNvbk9iamVjdCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzY2hlbWEgPSByZWFkQW5kUGFyc2VKc29uKFxuICAgIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9saWIvY29uZmlnL3NjaGVtYS5qc29uJyksXG4gICkgYXMganNvbi5zY2hlbWEuSnNvblNjaGVtYTtcbiAgY29uc3QgeyBmb3JtYXRzIH0gPSBhd2FpdCBpbXBvcnQoJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJyk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeShmb3JtYXRzLnN0YW5kYXJkRm9ybWF0cyk7XG4gIGNvbnN0IHZhbGlkYXRvciA9IGF3YWl0IHJlZ2lzdHJ5LmNvbXBpbGUoc2NoZW1hKS50b1Byb21pc2UoKTtcblxuICBjb25zdCB7IHN1Y2Nlc3MsIGVycm9ycyB9ID0gYXdhaXQgdmFsaWRhdG9yKGRhdGEpLnRvUHJvbWlzZSgpO1xuICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICB0aHJvdyBuZXcganNvbi5zY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihlcnJvcnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSwgbG9jYXRpb246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBpc0luc2lkZSA9IChiYXNlOiBzdHJpbmcsIHBvdGVudGlhbDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgYWJzb2x1dGVCYXNlID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUod29ya3NwYWNlLmJhc2VQYXRoLCBwb3RlbnRpYWwpO1xuICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzKVxuICAgIC5tYXAoKFtuYW1lLCBwcm9qZWN0XSkgPT4gW3Byb2plY3Qucm9vdCwgbmFtZV0gYXMgW3N0cmluZywgc3RyaW5nXSlcbiAgICAuZmlsdGVyKCh0dXBsZSkgPT4gaXNJbnNpZGUodHVwbGVbMF0sIGxvY2F0aW9uKSlcbiAgICAvLyBTb3J0IHR1cGxlcyBieSBkZXB0aCwgd2l0aCB0aGUgZGVlcGVyIG9uZXMgZmlyc3QuIFNpbmNlIHRoZSBmaXJzdCBtZW1iZXIgaXMgYSBwYXRoIGFuZFxuICAgIC8vIHdlIGZpbHRlcmVkIGFsbCBpbnZhbGlkIHBhdGhzLCB0aGUgbG9uZ2VzdCB3aWxsIGJlIHRoZSBkZWVwZXN0IChhbmQgaW4gY2FzZSBvZiBlcXVhbGl0eVxuICAgIC8vIHRoZSBzb3J0IGlzIHN0YWJsZSBhbmQgdGhlIGZpcnN0IGRlY2xhcmVkIHByb2plY3Qgd2lsbCB3aW4pLlxuICAgIC5zb3J0KChhLCBiKSA9PiBiWzBdLmxlbmd0aCAtIGFbMF0ubGVuZ3RoKTtcblxuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAocHJvamVjdHMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IGZvdW5kID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3Qgc2FtZVJvb3RzID0gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB7XG4gICAgICBpZiAoIWZvdW5kLmhhcyh2WzBdKSkge1xuICAgICAgICBmb3VuZC5hZGQodlswXSk7XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoc2FtZVJvb3RzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEFtYmlndW91cyBsb2NhdGlvbiAtIGNhbm5vdCBkZXRlcm1pbmUgYSBwcm9qZWN0XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvamVjdHNbMF1bMV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMSkge1xuICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgb25lIHByb2plY3QsIHJldHVybiB0aGF0IG9uZS5cbiAgICByZXR1cm4gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMua2V5cygpKVswXTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3QgPSBmaW5kUHJvamVjdEJ5UGF0aCh3b3Jrc3BhY2UsIHByb2Nlc3MuY3dkKCkpO1xuICBpZiAocHJvamVjdCkge1xuICAgIHJldHVybiBwcm9qZWN0O1xuICB9XG5cbiAgY29uc3QgZGVmYXVsdFByb2plY3QgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgaWYgKGRlZmF1bHRQcm9qZWN0ICYmIHR5cGVvZiBkZWZhdWx0UHJvamVjdCA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhIGRlZmF1bHQgcHJvamVjdCBuYW1lLCByZXR1cm4gaXQuXG4gICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IGdldFBhY2thZ2VNYW5hZ2VyID0gKHNvdXJjZToganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgY29uc3QgdmFsdWUgPSBzb3VyY2VbJ3BhY2thZ2VNYW5hZ2VyJ107XG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGxldCByZXN1bHQ6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGw7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICBpZiAod29ya3NwYWNlKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICByZXN1bHQgPSBnZXRQYWNrYWdlTWFuYWdlcih3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ID8/IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBnbG9iYWxPcHRpb25zID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICByZXN1bHQgPSBnZXRQYWNrYWdlTWFuYWdlcihnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydjbGknXSk7XG5cbiAgICBpZiAoIXdvcmtzcGFjZSAmJiAhZ2xvYmFsT3B0aW9ucykge1xuICAgICAgLy8gT25seSBjaGVjayBsZWdhY3kgaWYgdXBkYXRlZCB3b3Jrc3BhY2UgaXMgbm90IGZvdW5kXG4gICAgICByZXN1bHQgPSBnZXRMZWdhY3lQYWNrYWdlTWFuYWdlcigpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERlZmF1bHQgdG8gbnVsbFxuICByZXR1cm4gcmVzdWx0ID8/IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnKCk6IGJvb2xlYW4ge1xuICBjb25zdCBob21lRGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAoaG9tZURpcikge1xuICAgIGNvbnN0IGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGggPSBwYXRoLmpvaW4oaG9tZURpciwgJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCkpIHtcbiAgICAgIGNvbnN0IGxlZ2FjeSA9IHJlYWRBbmRQYXJzZUpzb24obGVnYWN5R2xvYmFsQ29uZmlnUGF0aCk7XG4gICAgICBpZiAoIWlzSnNvbk9iamVjdChsZWdhY3kpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2xpOiBqc29uLkpzb25PYmplY3QgPSB7fTtcblxuICAgICAgaWYgKFxuICAgICAgICBsZWdhY3kucGFja2FnZU1hbmFnZXIgJiZcbiAgICAgICAgdHlwZW9mIGxlZ2FjeS5wYWNrYWdlTWFuYWdlciA9PSAnc3RyaW5nJyAmJlxuICAgICAgICBsZWdhY3kucGFja2FnZU1hbmFnZXIgIT09ICdkZWZhdWx0J1xuICAgICAgKSB7XG4gICAgICAgIGNsaVsncGFja2FnZU1hbmFnZXInXSA9IGxlZ2FjeS5wYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBpc0pzb25PYmplY3QobGVnYWN5LmRlZmF1bHRzKSAmJlxuICAgICAgICBpc0pzb25PYmplY3QobGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MpICYmXG4gICAgICAgIHR5cGVvZiBsZWdhY3kuZGVmYXVsdHMuc2NoZW1hdGljcy5jb2xsZWN0aW9uID09ICdzdHJpbmcnXG4gICAgICApIHtcbiAgICAgICAgY2xpWydkZWZhdWx0Q29sbGVjdGlvbiddID0gbGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzSnNvbk9iamVjdChsZWdhY3kud2FybmluZ3MpKSB7XG4gICAgICAgIGNvbnN0IHdhcm5pbmdzOiBqc29uLkpzb25PYmplY3QgPSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBsZWdhY3kud2FybmluZ3MudmVyc2lvbk1pc21hdGNoID09ICdib29sZWFuJykge1xuICAgICAgICAgIHdhcm5pbmdzWyd2ZXJzaW9uTWlzbWF0Y2gnXSA9IGxlZ2FjeS53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2g7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMod2FybmluZ3MpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjbGlbJ3dhcm5pbmdzJ10gPSB3YXJuaW5ncztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xpKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IGdsb2JhbFBhdGggPSBwYXRoLmpvaW4oaG9tZURpciwgZ2xvYmFsRmlsZU5hbWUpO1xuICAgICAgICB3cml0ZUZpbGVTeW5jKGdsb2JhbFBhdGgsIEpTT04uc3RyaW5naWZ5KHsgdmVyc2lvbjogMSwgY2xpIH0sIG51bGwsIDIpKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEZhbGxiYWNrLCBjaGVjayBmb3IgcGFja2FnZU1hbmFnZXIgaW4gY29uZmlnIGZpbGUgaW4gdjEuKiBnbG9iYWwgY29uZmlnLlxuZnVuY3Rpb24gZ2V0TGVnYWN5UGFja2FnZU1hbmFnZXIoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGhvbWVEaXIgPSBvcy5ob21lZGlyKCk7XG4gIGlmIChob21lRGlyKSB7XG4gICAgY29uc3QgbGVnYWN5R2xvYmFsQ29uZmlnUGF0aCA9IHBhdGguam9pbihob21lRGlyLCAnLmFuZ3VsYXItY2xpLmpzb24nKTtcbiAgICBpZiAoZXhpc3RzU3luYyhsZWdhY3lHbG9iYWxDb25maWdQYXRoKSkge1xuICAgICAgY29uc3QgbGVnYWN5ID0gcmVhZEFuZFBhcnNlSnNvbihsZWdhY3lHbG9iYWxDb25maWdQYXRoKTtcbiAgICAgIGlmICghaXNKc29uT2JqZWN0KGxlZ2FjeSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgbGVnYWN5LnBhY2thZ2VNYW5hZ2VyICYmXG4gICAgICAgIHR5cGVvZiBsZWdhY3kucGFja2FnZU1hbmFnZXIgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIGxlZ2FjeS5wYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGxlZ2FjeS5wYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNjaGVtYXRpY0RlZmF1bHRzKFxuICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gIHNjaGVtYXRpYzogc3RyaW5nLFxuICBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCxcbik6IFByb21pc2U8e30+IHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIGNvbnN0IG1lcmdlT3B0aW9ucyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICAvLyBNZXJnZSBvcHRpb25zIGZyb20gdGhlIHF1YWxpZmllZCBuYW1lXG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgc291cmNlW2Ake2NvbGxlY3Rpb259OiR7c2NoZW1hdGljfWBdKTtcblxuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIG5lc3RlZCBjb2xsZWN0aW9uIHNjaGVtYXRpY3NcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb25PcHRpb25zID0gc291cmNlW2NvbGxlY3Rpb25dO1xuICAgICAgaWYgKGlzSnNvbk9iamVjdChjb2xsZWN0aW9uT3B0aW9ucykpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIGNvbGxlY3Rpb25PcHRpb25zW3NjaGVtYXRpY10pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBHbG9iYWwgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIG1lcmdlT3B0aW9ucyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydzY2hlbWF0aWNzJ10pO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIC8vIFdvcmtzcGFjZSBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgIG1lcmdlT3B0aW9ucyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICAgIHByb2plY3QgPSBwcm9qZWN0IHx8IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAvLyBQcm9qZWN0IGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gICAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNXYXJuaW5nRW5hYmxlZCh3YXJuaW5nOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZ2V0V2FybmluZyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB3YXJuaW5ncyA9IHNvdXJjZVsnd2FybmluZ3MnXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3Qod2FybmluZ3MpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd2FybmluZ3Nbd2FybmluZ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGxldCByZXN1bHQ6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICBpZiAod29ya3NwYWNlKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICByZXN1bHQgPSBnZXRXYXJuaW5nKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPSByZXN1bHQgPz8gZ2V0V2FybmluZyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0V2FybmluZyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICAvLyBBbGwgd2FybmluZ3MgYXJlIGVuYWJsZWQgYnkgZGVmYXVsdFxuICByZXR1cm4gcmVzdWx0ID8/IHRydWU7XG59XG4iXX0=