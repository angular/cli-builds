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
exports.isWarningEnabled = exports.getSchematicDefaults = exports.getConfiguredPackageManager = exports.getProjectByCwd = exports.validateWorkspace = exports.getWorkspaceRaw = exports.createGlobalSettings = exports.getWorkspace = exports.AngularWorkspace = exports.workspaceSchemaPath = void 0;
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
exports.workspaceSchemaPath = path.join(__dirname, '../../lib/config/schema.json');
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
    const schema = (0, json_file_1.readAndParseJson)(exports.workspaceSchemaPath);
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
        return null;
    };
    let result = null;
    const workspace = await getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project) {
            result = getPackageManager((_a = workspace.projects.get(project)) === null || _a === void 0 ? void 0 : _a.extensions['cli']);
        }
        result !== null && result !== void 0 ? result : (result = getPackageManager(workspace.extensions['cli']));
    }
    if (!result) {
        const globalOptions = await getWorkspace('global');
        result = getPackageManager(globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.extensions['cli']);
    }
    return result;
}
exports.getConfiguredPackageManager = getConfiguredPackageManager;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUF3RDtBQUN4RCwyQkFBdUU7QUFDdkUsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3Qix1Q0FBbUM7QUFDbkMsMkNBQXlEO0FBRXpELFNBQVMsWUFBWSxDQUFDLEtBQWlDO0lBQ3JELE9BQU8sS0FBSyxLQUFLLFNBQVMsSUFBSSxXQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFFRCxTQUFTLG1CQUFtQjtJQUMxQixPQUFPO1FBQ0wsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQ2pCLE9BQU8sSUFBQSxpQkFBWSxFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSTtZQUN4QixJQUFBLGtCQUFhLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUk7WUFDcEIsSUFBSTtnQkFDRixPQUFPLElBQUEsYUFBUSxFQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ3JDO1lBQUMsV0FBTTtnQkFDTixPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUNmLElBQUk7Z0JBQ0YsT0FBTyxJQUFBLGFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNoQztZQUFDLFdBQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7S0FDRixDQUFDO0FB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LEdBQUcsVUFBVSxDQUFDLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUN2RDtJQUVELHNDQUFzQztJQUN0QyxPQUFPLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLElBQUksQ0FBQztBQUN4QixDQUFDO0FBaENELDRDQWdDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqc29uLCB3b3Jrc3BhY2VzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuL2ZpbmQtdXAnO1xuaW1wb3J0IHsgSlNPTkZpbGUsIHJlYWRBbmRQYXJzZUpzb24gfSBmcm9tICcuL2pzb24tZmlsZSc7XG5cbmZ1bmN0aW9uIGlzSnNvbk9iamVjdCh2YWx1ZToganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQpOiB2YWx1ZSBpcyBqc29uLkpzb25PYmplY3Qge1xuICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiBqc29uLmlzSnNvbk9iamVjdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VIb3N0IHtcbiAgcmV0dXJuIHtcbiAgICBhc3luYyByZWFkRmlsZShwYXRoKSB7XG4gICAgICByZXR1cm4gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgIH0sXG4gICAgYXN5bmMgd3JpdGVGaWxlKHBhdGgsIGRhdGEpIHtcbiAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZGF0YSk7XG4gICAgfSxcbiAgICBhc3luYyBpc0RpcmVjdG9yeShwYXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gc3RhdFN5bmMocGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgICBhc3luYyBpc0ZpbGUocGF0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHN0YXRTeW5jKHBhdGgpLmlzRmlsZSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgd29ya3NwYWNlU2NoZW1hUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9saWIvY29uZmlnL3NjaGVtYS5qc29uJyk7XG5cbmNvbnN0IGNvbmZpZ05hbWVzID0gWydhbmd1bGFyLmpzb24nLCAnLmFuZ3VsYXIuanNvbiddO1xuY29uc3QgZ2xvYmFsRmlsZU5hbWUgPSAnLmFuZ3VsYXItY29uZmlnLmpzb24nO1xuXG5mdW5jdGlvbiB4ZGdDb25maWdIb21lKGhvbWU6IHN0cmluZywgY29uZmlnRmlsZT86IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIGh0dHBzOi8vc3BlY2lmaWNhdGlvbnMuZnJlZWRlc2t0b3Aub3JnL2Jhc2VkaXItc3BlYy9iYXNlZGlyLXNwZWMtbGF0ZXN0Lmh0bWxcbiAgY29uc3QgeGRnQ29uZmlnSG9tZSA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnKTtcbiAgY29uc3QgeGRnQW5ndWxhckhvbWUgPSBwYXRoLmpvaW4oeGRnQ29uZmlnSG9tZSwgJ2FuZ3VsYXInKTtcblxuICByZXR1cm4gY29uZmlnRmlsZSA/IHBhdGguam9pbih4ZGdBbmd1bGFySG9tZSwgY29uZmlnRmlsZSkgOiB4ZGdBbmd1bGFySG9tZTtcbn1cblxuZnVuY3Rpb24geGRnQ29uZmlnSG9tZU9sZChob21lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBDaGVjayB0aGUgY29uZmlndXJhdGlvbiBmaWxlcyBpbiB0aGUgb2xkIGxvY2F0aW9uIHRoYXQgc2hvdWxkIGJlOlxuICAvLyAtICRYREdfQ09ORklHX0hPTUUvLmFuZ3VsYXItY29uZmlnLmpzb24gKGlmIFhER19DT05GSUdfSE9NRSBpcyBzZXQpXG4gIC8vIC0gJEhPTUUvLmNvbmZpZy9hbmd1bGFyLy5hbmd1bGFyLWNvbmZpZy5qc29uIChvdGhlcndpc2UpXG4gIGNvbnN0IHAgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ10gfHwgcGF0aC5qb2luKGhvbWUsICcuY29uZmlnJywgJ2FuZ3VsYXInKTtcblxuICByZXR1cm4gcGF0aC5qb2luKHAsICcuYW5ndWxhci1jb25maWcuanNvbicpO1xufVxuXG5mdW5jdGlvbiBwcm9qZWN0RmlsZVBhdGgocHJvamVjdFBhdGg/OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgLy8gRmluZCB0aGUgY29uZmlndXJhdGlvbiwgZWl0aGVyIHdoZXJlIHNwZWNpZmllZCwgaW4gdGhlIEFuZ3VsYXIgQ0xJIHByb2plY3RcbiAgLy8gKGlmIGl0J3MgaW4gbm9kZV9tb2R1bGVzKSBvciBmcm9tIHRoZSBjdXJyZW50IHByb2Nlc3MuXG4gIHJldHVybiAoXG4gICAgKHByb2plY3RQYXRoICYmIGZpbmRVcChjb25maWdOYW1lcywgcHJvamVjdFBhdGgpKSB8fFxuICAgIGZpbmRVcChjb25maWdOYW1lcywgcHJvY2Vzcy5jd2QoKSkgfHxcbiAgICBmaW5kVXAoY29uZmlnTmFtZXMsIF9fZGlybmFtZSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2xvYmFsRmlsZVBhdGgoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKCk7XG4gIGlmICghaG9tZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZm9sbG93IFhERyBCYXNlIERpcmVjdG9yeSBzcGVjXG4gIC8vIG5vdGUgdGhhdCBjcmVhdGVHbG9iYWxTZXR0aW5ncygpIHdpbGwgY29udGludWUgY3JlYXRpbmdcbiAgLy8gZ2xvYmFsIGZpbGUgaW4gaG9tZSBkaXJlY3RvcnksIHdpdGggdGhpcyB1c2VyIHdpbGwgaGF2ZVxuICAvLyBjaG9pY2UgdG8gbW92ZSBjaGFuZ2UgaXRzIGxvY2F0aW9uIHRvIG1lZXQgWERHIGNvbnZlbnRpb25cbiAgY29uc3QgeGRnQ29uZmlnID0geGRnQ29uZmlnSG9tZShob21lLCAnY29uZmlnLmpzb24nKTtcbiAgaWYgKGV4aXN0c1N5bmMoeGRnQ29uZmlnKSkge1xuICAgIHJldHVybiB4ZGdDb25maWc7XG4gIH1cbiAgLy8gTk9URTogVGhpcyBjaGVjayBpcyBmb3IgdGhlIG9sZCBjb25maWd1cmF0aW9uIGxvY2F0aW9uLCBmb3IgbW9yZVxuICAvLyBpbmZvcm1hdGlvbiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8yMDU1NlxuICBjb25zdCB4ZGdDb25maWdPbGQgPSB4ZGdDb25maWdIb21lT2xkKGhvbWUpO1xuICBpZiAoZXhpc3RzU3luYyh4ZGdDb25maWdPbGQpKSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgIGNvbnNvbGUud2FybihcbiAgICAgIGBPbGQgY29uZmlndXJhdGlvbiBsb2NhdGlvbiBkZXRlY3RlZDogJHt4ZGdDb25maWdPbGR9XFxuYCArXG4gICAgICAgIGBQbGVhc2UgbW92ZSB0aGUgZmlsZSB0byB0aGUgbmV3IGxvY2F0aW9uIH4vLmNvbmZpZy9hbmd1bGFyL2NvbmZpZy5qc29uYCxcbiAgICApO1xuXG4gICAgcmV0dXJuIHhkZ0NvbmZpZ09sZDtcbiAgfVxuXG4gIGNvbnN0IHAgPSBwYXRoLmpvaW4oaG9tZSwgZ2xvYmFsRmlsZU5hbWUpO1xuICBpZiAoZXhpc3RzU3luYyhwKSkge1xuICAgIHJldHVybiBwO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBBbmd1bGFyV29ya3NwYWNlIHtcbiAgcmVhZG9ubHkgYmFzZVBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHdvcmtzcGFjZTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VEZWZpbml0aW9uLCByZWFkb25seSBmaWxlUGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5iYXNlUGF0aCA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XG4gIH1cblxuICBnZXQgZXh0ZW5zaW9ucygpOiBSZWNvcmQ8c3RyaW5nLCBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZD4ge1xuICAgIHJldHVybiB0aGlzLndvcmtzcGFjZS5leHRlbnNpb25zO1xuICB9XG5cbiAgZ2V0IHByb2plY3RzKCk6IHdvcmtzcGFjZXMuUHJvamVjdERlZmluaXRpb25Db2xsZWN0aW9uIHtcbiAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2UucHJvamVjdHM7XG4gIH1cblxuICAvLyBUZW1wb3JhcnkgaGVscGVyIGZ1bmN0aW9ucyB0byBzdXBwb3J0IHJlZmFjdG9yaW5nXG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgZ2V0Q2xpKCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIHJldHVybiAodGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHx8IHt9O1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgZ2V0UHJvamVjdENsaShwcm9qZWN0TmFtZTogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMud29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0TmFtZSk7XG5cbiAgICByZXR1cm4gKHByb2plY3Q/LmV4dGVuc2lvbnNbJ2NsaSddIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyBsb2FkKHdvcmtzcGFjZUZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFuZ3VsYXJXb3Jrc3BhY2U+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3b3Jrc3BhY2VzLnJlYWRXb3Jrc3BhY2UoXG4gICAgICB3b3Jrc3BhY2VGaWxlUGF0aCxcbiAgICAgIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKSxcbiAgICAgIHdvcmtzcGFjZXMuV29ya3NwYWNlRm9ybWF0LkpTT04sXG4gICAgKTtcblxuICAgIHJldHVybiBuZXcgQW5ndWxhcldvcmtzcGFjZShyZXN1bHQud29ya3NwYWNlLCB3b3Jrc3BhY2VGaWxlUGF0aCk7XG4gIH1cbn1cblxuY29uc3QgY2FjaGVkV29ya3NwYWNlcyA9IG5ldyBNYXA8c3RyaW5nLCBBbmd1bGFyV29ya3NwYWNlIHwgbnVsbD4oKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZShcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBQcm9taXNlPEFuZ3VsYXJXb3Jrc3BhY2UgfCBudWxsPiB7XG4gIGNvbnN0IGNhY2hlZCA9IGNhY2hlZFdvcmtzcGFjZXMuZ2V0KGxldmVsKTtcbiAgaWYgKGNhY2hlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgbnVsbCk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgQW5ndWxhcldvcmtzcGFjZS5sb2FkKGNvbmZpZ1BhdGgpO1xuICAgIGNhY2hlZFdvcmtzcGFjZXMuc2V0KGxldmVsLCB3b3Jrc3BhY2UpO1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgV29ya3NwYWNlIGNvbmZpZyBmaWxlIGNhbm5vdCBiZSBsb2FkZWQ6ICR7Y29uZmlnUGF0aH1gICtcbiAgICAgICAgYFxcbiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBlcnJvcn1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUdsb2JhbFNldHRpbmdzKCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKCk7XG4gIGlmICghaG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gaG9tZSBkaXJlY3RvcnkgZm91bmQuJyk7XG4gIH1cblxuICBjb25zdCBnbG9iYWxQYXRoID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgd3JpdGVGaWxlU3luYyhnbG9iYWxQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDEgfSkpO1xuXG4gIHJldHVybiBnbG9iYWxQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUmF3KFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFtKU09ORmlsZSB8IG51bGwsIHN0cmluZyB8IG51bGxdIHtcbiAgbGV0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBpZiAobGV2ZWwgPT09ICdnbG9iYWwnKSB7XG4gICAgICBjb25maWdQYXRoID0gY3JlYXRlR2xvYmFsU2V0dGluZ3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtudWxsLCBudWxsXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW25ldyBKU09ORmlsZShjb25maWdQYXRoKSwgY29uZmlnUGF0aF07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZVdvcmtzcGFjZShkYXRhOiBqc29uLkpzb25PYmplY3QpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc2NoZW1hID0gcmVhZEFuZFBhcnNlSnNvbih3b3Jrc3BhY2VTY2hlbWFQYXRoKSBhcyBqc29uLnNjaGVtYS5Kc29uU2NoZW1hO1xuICBjb25zdCB7IGZvcm1hdHMgfSA9IGF3YWl0IGltcG9ydCgnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnKTtcbiAgY29uc3QgcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKTtcbiAgY29uc3QgdmFsaWRhdG9yID0gYXdhaXQgcmVnaXN0cnkuY29tcGlsZShzY2hlbWEpLnRvUHJvbWlzZSgpO1xuXG4gIGNvbnN0IHsgc3VjY2VzcywgZXJyb3JzIH0gPSBhd2FpdCB2YWxpZGF0b3IoZGF0YSkudG9Qcm9taXNlKCk7XG4gIGlmICghc3VjY2Vzcykge1xuICAgIHRocm93IG5ldyBqc29uLnNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKGVycm9ycyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFByb2plY3RCeVBhdGgod29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlLCBsb2NhdGlvbjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGlzSW5zaWRlID0gKGJhc2U6IHN0cmluZywgcG90ZW50aWFsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBhYnNvbHV0ZUJhc2UgPSBwYXRoLnJlc29sdmUod29ya3NwYWNlLmJhc2VQYXRoLCBiYXNlKTtcbiAgICBjb25zdCBhYnNvbHV0ZVBvdGVudGlhbCA9IHBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UuYmFzZVBhdGgsIHBvdGVudGlhbCk7XG4gICAgY29uc3QgcmVsYXRpdmVQb3RlbnRpYWwgPSBwYXRoLnJlbGF0aXZlKGFic29sdXRlQmFzZSwgYWJzb2x1dGVQb3RlbnRpYWwpO1xuICAgIGlmICghcmVsYXRpdmVQb3RlbnRpYWwuc3RhcnRzV2l0aCgnLi4nKSAmJiAhcGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlUG90ZW50aWFsKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIGNvbnN0IHByb2plY3RzID0gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMpXG4gICAgLm1hcCgoW25hbWUsIHByb2plY3RdKSA9PiBbcHJvamVjdC5yb290LCBuYW1lXSBhcyBbc3RyaW5nLCBzdHJpbmddKVxuICAgIC5maWx0ZXIoKHR1cGxlKSA9PiBpc0luc2lkZSh0dXBsZVswXSwgbG9jYXRpb24pKVxuICAgIC8vIFNvcnQgdHVwbGVzIGJ5IGRlcHRoLCB3aXRoIHRoZSBkZWVwZXIgb25lcyBmaXJzdC4gU2luY2UgdGhlIGZpcnN0IG1lbWJlciBpcyBhIHBhdGggYW5kXG4gICAgLy8gd2UgZmlsdGVyZWQgYWxsIGludmFsaWQgcGF0aHMsIHRoZSBsb25nZXN0IHdpbGwgYmUgdGhlIGRlZXBlc3QgKGFuZCBpbiBjYXNlIG9mIGVxdWFsaXR5XG4gICAgLy8gdGhlIHNvcnQgaXMgc3RhYmxlIGFuZCB0aGUgZmlyc3QgZGVjbGFyZWQgcHJvamVjdCB3aWxsIHdpbikuXG4gICAgLnNvcnQoKGEsIGIpID0+IGJbMF0ubGVuZ3RoIC0gYVswXS5sZW5ndGgpO1xuXG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChwcm9qZWN0cy5sZW5ndGggPiAxKSB7XG4gICAgY29uc3QgZm91bmQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBzYW1lUm9vdHMgPSBwcm9qZWN0cy5maWx0ZXIoKHYpID0+IHtcbiAgICAgIGlmICghZm91bmQuaGFzKHZbMF0pKSB7XG4gICAgICAgIGZvdW5kLmFkZCh2WzBdKTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChzYW1lUm9vdHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQW1iaWd1b3VzIGxvY2F0aW9uIC0gY2Fubm90IGRldGVybWluZSBhIHByb2plY3RcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9qZWN0c1swXVsxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHdvcmtzcGFjZS5wcm9qZWN0cy5zaXplID09PSAxKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgb25seSBvbmUgcHJvamVjdCwgcmV0dXJuIHRoYXQgb25lLlxuICAgIHJldHVybiBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCkpWzBdO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdCA9IGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZSwgcHJvY2Vzcy5jd2QoKSk7XG4gIGlmIChwcm9qZWN0KSB7XG4gICAgcmV0dXJuIHByb2plY3Q7XG4gIH1cblxuICBjb25zdCBkZWZhdWx0UHJvamVjdCA9IHdvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddO1xuICBpZiAoZGVmYXVsdFByb2plY3QgJiYgdHlwZW9mIGRlZmF1bHRQcm9qZWN0ID09PSAnc3RyaW5nJykge1xuICAgIC8vIElmIHRoZXJlIGlzIGEgZGVmYXVsdCBwcm9qZWN0IG5hbWUsIHJldHVybiBpdC5cbiAgICByZXR1cm4gZGVmYXVsdFByb2plY3Q7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpOiBQcm9taXNlPFBhY2thZ2VNYW5hZ2VyIHwgbnVsbD4ge1xuICBjb25zdCBnZXRQYWNrYWdlTWFuYWdlciA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogUGFja2FnZU1hbmFnZXIgfCBudWxsID0+IHtcbiAgICBpZiAoaXNKc29uT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc291cmNlWydwYWNrYWdlTWFuYWdlciddO1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIGFzIFBhY2thZ2VNYW5hZ2VyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIGxldCByZXN1bHQ6IFBhY2thZ2VNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgIH1cblxuICAgIHJlc3VsdCA/Pz0gZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmICghcmVzdWx0KSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNjaGVtYXRpY0RlZmF1bHRzKFxuICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gIHNjaGVtYXRpYzogc3RyaW5nLFxuICBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCxcbik6IFByb21pc2U8e30+IHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIGNvbnN0IG1lcmdlT3B0aW9ucyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICAvLyBNZXJnZSBvcHRpb25zIGZyb20gdGhlIHF1YWxpZmllZCBuYW1lXG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgc291cmNlW2Ake2NvbGxlY3Rpb259OiR7c2NoZW1hdGljfWBdKTtcblxuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIG5lc3RlZCBjb2xsZWN0aW9uIHNjaGVtYXRpY3NcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb25PcHRpb25zID0gc291cmNlW2NvbGxlY3Rpb25dO1xuICAgICAgaWYgKGlzSnNvbk9iamVjdChjb2xsZWN0aW9uT3B0aW9ucykpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIGNvbGxlY3Rpb25PcHRpb25zW3NjaGVtYXRpY10pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBHbG9iYWwgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIG1lcmdlT3B0aW9ucyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydzY2hlbWF0aWNzJ10pO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIC8vIFdvcmtzcGFjZSBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgIG1lcmdlT3B0aW9ucyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICAgIHByb2plY3QgPSBwcm9qZWN0IHx8IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAvLyBQcm9qZWN0IGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gICAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNXYXJuaW5nRW5hYmxlZCh3YXJuaW5nOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZ2V0V2FybmluZyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB3YXJuaW5ncyA9IHNvdXJjZVsnd2FybmluZ3MnXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3Qod2FybmluZ3MpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd2FybmluZ3Nbd2FybmluZ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGxldCByZXN1bHQ6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICBpZiAod29ya3NwYWNlKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICByZXN1bHQgPSBnZXRXYXJuaW5nKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPSByZXN1bHQgPz8gZ2V0V2FybmluZyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0V2FybmluZyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICAvLyBBbGwgd2FybmluZ3MgYXJlIGVuYWJsZWQgYnkgZGVmYXVsdFxuICByZXR1cm4gcmVzdWx0ID8/IHRydWU7XG59XG4iXX0=