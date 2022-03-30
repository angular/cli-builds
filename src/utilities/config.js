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
exports.getProjectsByPath = exports.isWarningEnabled = exports.getSchematicDefaults = exports.getConfiguredPackageManager = exports.getProjectByCwd = exports.validateWorkspace = exports.getWorkspaceRaw = exports.createGlobalSettings = exports.getWorkspace = exports.AngularWorkspace = exports.workspaceSchemaPath = void 0;
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
    if (cachedWorkspaces.has(level)) {
        return cachedWorkspaces.get(level);
    }
    const configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        cachedWorkspaces.set(level, undefined);
        return undefined;
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
let defaultProjectDeprecationWarningShown = false;
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
        if (!defaultProjectDeprecationWarningShown) {
            console.warn(`DEPRECATED: The 'defaultProject' workspace option has been deprecated. ` +
                `The project to use will be determined from the current working directory.`);
            defaultProjectDeprecationWarningShown = true;
        }
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
function getProjectsByPath(workspace, cwd, root) {
    if (workspace.projects.size === 1) {
        return Array.from(workspace.projects.keys());
    }
    const isInside = (base, potential) => {
        const absoluteBase = path.resolve(root, base);
        const absolutePotential = path.resolve(root, potential);
        const relativePotential = path.relative(absoluteBase, absolutePotential);
        if (!relativePotential.startsWith('..') && !path.isAbsolute(relativePotential)) {
            return true;
        }
        return false;
    };
    const projects = Array.from(workspace.projects.entries())
        .map(([name, project]) => [path.resolve(root, project.root), name])
        .filter((tuple) => isInside(tuple[0], cwd))
        // Sort tuples by depth, with the deeper ones first. Since the first member is a path and
        // we filtered all invalid paths, the longest will be the deepest (and in case of equality
        // the sort is stable and the first declared project will win).
        .sort((a, b) => b[0].length - a[0].length);
    if (projects.length === 1) {
        return [projects[0][1]];
    }
    else if (projects.length > 1) {
        const firstPath = projects[0][0];
        return projects.filter((v) => v[0] === firstPath).map((v) => v[1]);
    }
    return [];
}
exports.getProjectsByPath = getProjectsByPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBd0Q7QUFDeEQsMkJBQXVFO0FBQ3ZFLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsdUNBQW1DO0FBQ25DLDJDQUF5RDtBQUV6RCxTQUFTLFlBQVksQ0FBQyxLQUFpQztJQUNyRCxPQUFPLEtBQUssS0FBSyxTQUFTLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsT0FBTztRQUNMLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNqQixPQUFPLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUk7WUFDeEIsSUFBQSxrQkFBYSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQ3BCLElBQUk7Z0JBQ0YsT0FBTyxJQUFBLGFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNyQztZQUFDLFdBQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDZixJQUFJO2dCQUNGLE9BQU8sSUFBQSxhQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDaEM7WUFBQyxXQUFNO2dCQUNOLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDO0tBQ0YsQ0FB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bnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIHdvcmtzcGFjZXMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4vZmluZC11cCc7XG5pbXBvcnQgeyBKU09ORmlsZSwgcmVhZEFuZFBhcnNlSnNvbiB9IGZyb20gJy4vanNvbi1maWxlJztcblxuZnVuY3Rpb24gaXNKc29uT2JqZWN0KHZhbHVlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZhbHVlIGlzIGpzb24uSnNvbk9iamVjdCB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIGpzb24uaXNKc29uT2JqZWN0KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV29ya3NwYWNlSG9zdCgpOiB3b3Jrc3BhY2VzLldvcmtzcGFjZUhvc3Qge1xuICByZXR1cm4ge1xuICAgIGFzeW5jIHJlYWRGaWxlKHBhdGgpIHtcbiAgICAgIHJldHVybiByZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04Jyk7XG4gICAgfSxcbiAgICBhc3luYyB3cml0ZUZpbGUocGF0aCwgZGF0YSkge1xuICAgICAgd3JpdGVGaWxlU3luYyhwYXRoLCBkYXRhKTtcbiAgICB9LFxuICAgIGFzeW5jIGlzRGlyZWN0b3J5KHBhdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBzdGF0U3luYyhwYXRoKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFzeW5jIGlzRmlsZShwYXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gc3RhdFN5bmMocGF0aCkuaXNGaWxlKCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTY2hlbWFQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2xpYi9jb25maWcvc2NoZW1hLmpzb24nKTtcblxuY29uc3QgY29uZmlnTmFtZXMgPSBbJ2FuZ3VsYXIuanNvbicsICcuYW5ndWxhci5qc29uJ107XG5jb25zdCBnbG9iYWxGaWxlTmFtZSA9ICcuYW5ndWxhci1jb25maWcuanNvbic7XG5cbmZ1bmN0aW9uIHhkZ0NvbmZpZ0hvbWUoaG9tZTogc3RyaW5nLCBjb25maWdGaWxlPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gaHR0cHM6Ly9zcGVjaWZpY2F0aW9ucy5mcmVlZGVza3RvcC5vcmcvYmFzZWRpci1zcGVjL2Jhc2VkaXItc3BlYy1sYXRlc3QuaHRtbFxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddIHx8IHBhdGguam9pbihob21lLCAnLmNvbmZpZycpO1xuICBjb25zdCB4ZGdBbmd1bGFySG9tZSA9IHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBjb25maWdGaWxlID8gcGF0aC5qb2luKHhkZ0FuZ3VsYXJIb21lLCBjb25maWdGaWxlKSA6IHhkZ0FuZ3VsYXJIb21lO1xufVxuXG5mdW5jdGlvbiB4ZGdDb25maWdIb21lT2xkKGhvbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIENoZWNrIHRoZSBjb25maWd1cmF0aW9uIGZpbGVzIGluIHRoZSBvbGQgbG9jYXRpb24gdGhhdCBzaG91bGQgYmU6XG4gIC8vIC0gJFhER19DT05GSUdfSE9NRS8uYW5ndWxhci1jb25maWcuanNvbiAoaWYgWERHX0NPTkZJR19IT01FIGlzIHNldClcbiAgLy8gLSAkSE9NRS8uY29uZmlnL2FuZ3VsYXIvLmFuZ3VsYXItY29uZmlnLmpzb24gKG90aGVyd2lzZSlcbiAgY29uc3QgcCA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBwYXRoLmpvaW4ocCwgJy5hbmd1bGFyLWNvbmZpZy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHByb2plY3RGaWxlUGF0aChwcm9qZWN0UGF0aD86IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAvLyBGaW5kIHRoZSBjb25maWd1cmF0aW9uLCBlaXRoZXIgd2hlcmUgc3BlY2lmaWVkLCBpbiB0aGUgQW5ndWxhciBDTEkgcHJvamVjdFxuICAvLyAoaWYgaXQncyBpbiBub2RlX21vZHVsZXMpIG9yIGZyb20gdGhlIGN1cnJlbnQgcHJvY2Vzcy5cbiAgcmV0dXJuIChcbiAgICAocHJvamVjdFBhdGggJiYgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9qZWN0UGF0aCkpIHx8XG4gICAgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9jZXNzLmN3ZCgpKSB8fFxuICAgIGZpbmRVcChjb25maWdOYW1lcywgX19kaXJuYW1lKVxuICApO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxGaWxlUGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBmb2xsb3cgWERHIEJhc2UgRGlyZWN0b3J5IHNwZWNcbiAgLy8gbm90ZSB0aGF0IGNyZWF0ZUdsb2JhbFNldHRpbmdzKCkgd2lsbCBjb250aW51ZSBjcmVhdGluZ1xuICAvLyBnbG9iYWwgZmlsZSBpbiBob21lIGRpcmVjdG9yeSwgd2l0aCB0aGlzIHVzZXIgd2lsbCBoYXZlXG4gIC8vIGNob2ljZSB0byBtb3ZlIGNoYW5nZSBpdHMgbG9jYXRpb24gdG8gbWVldCBYREcgY29udmVudGlvblxuICBjb25zdCB4ZGdDb25maWcgPSB4ZGdDb25maWdIb21lKGhvbWUsICdjb25maWcuanNvbicpO1xuICBpZiAoZXhpc3RzU3luYyh4ZGdDb25maWcpKSB7XG4gICAgcmV0dXJuIHhkZ0NvbmZpZztcbiAgfVxuICAvLyBOT1RFOiBUaGlzIGNoZWNrIGlzIGZvciB0aGUgb2xkIGNvbmZpZ3VyYXRpb24gbG9jYXRpb24sIGZvciBtb3JlXG4gIC8vIGluZm9ybWF0aW9uIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzIwNTU2XG4gIGNvbnN0IHhkZ0NvbmZpZ09sZCA9IHhkZ0NvbmZpZ0hvbWVPbGQoaG9tZSk7XG4gIGlmIChleGlzdHNTeW5jKHhkZ0NvbmZpZ09sZCkpIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgY29uc29sZS53YXJuKFxuICAgICAgYE9sZCBjb25maWd1cmF0aW9uIGxvY2F0aW9uIGRldGVjdGVkOiAke3hkZ0NvbmZpZ09sZH1cXG5gICtcbiAgICAgICAgYFBsZWFzZSBtb3ZlIHRoZSBmaWxlIHRvIHRoZSBuZXcgbG9jYXRpb24gfi8uY29uZmlnL2FuZ3VsYXIvY29uZmlnLmpzb25gLFxuICAgICk7XG5cbiAgICByZXR1cm4geGRnQ29uZmlnT2xkO1xuICB9XG5cbiAgY29uc3QgcCA9IHBhdGguam9pbihob21lLCBnbG9iYWxGaWxlTmFtZSk7XG4gIGlmIChleGlzdHNTeW5jKHApKSB7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJXb3Jrc3BhY2Uge1xuICByZWFkb25seSBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd29ya3NwYWNlOiB3b3Jrc3BhY2VzLldvcmtzcGFjZURlZmluaXRpb24sIHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmJhc2VQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgfVxuXG4gIGdldCBleHRlbnNpb25zKCk6IFJlY29yZDxzdHJpbmcsIGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnM7XG4gIH1cblxuICBnZXQgcHJvamVjdHMoKTogd29ya3NwYWNlcy5Qcm9qZWN0RGVmaW5pdGlvbkNvbGxlY3Rpb24ge1xuICAgIHJldHVybiB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cztcbiAgfVxuXG4gIC8vIFRlbXBvcmFyeSBoZWxwZXIgZnVuY3Rpb25zIHRvIHN1cHBvcnQgcmVmYWN0b3JpbmdcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRDbGkoKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuICh0aGlzLndvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgfHwge307XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRQcm9qZWN0Q2xpKHByb2plY3ROYW1lOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcblxuICAgIHJldHVybiAocHJvamVjdD8uZXh0ZW5zaW9uc1snY2xpJ10gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHx8IHt9O1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGxvYWQod29ya3NwYWNlRmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdvcmtzcGFjZXMucmVhZFdvcmtzcGFjZShcbiAgICAgIHdvcmtzcGFjZUZpbGVQYXRoLFxuICAgICAgY3JlYXRlV29ya3NwYWNlSG9zdCgpLFxuICAgICAgd29ya3NwYWNlcy5Xb3Jrc3BhY2VGb3JtYXQuSlNPTixcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBbmd1bGFyV29ya3NwYWNlKHJlc3VsdC53b3Jrc3BhY2UsIHdvcmtzcGFjZUZpbGVQYXRoKTtcbiAgfVxufVxuXG5jb25zdCBjYWNoZWRXb3Jrc3BhY2VzID0gbmV3IE1hcDxzdHJpbmcsIEFuZ3VsYXJXb3Jrc3BhY2UgfCB1bmRlZmluZWQ+KCk7XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V29ya3NwYWNlKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZD4ge1xuICBpZiAoY2FjaGVkV29ya3NwYWNlcy5oYXMobGV2ZWwpKSB7XG4gICAgcmV0dXJuIGNhY2hlZFdvcmtzcGFjZXMuZ2V0KGxldmVsKTtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgdW5kZWZpbmVkKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IEFuZ3VsYXJXb3Jrc3BhY2UubG9hZChjb25maWdQYXRoKTtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgd29ya3NwYWNlKTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFdvcmtzcGFjZSBjb25maWcgZmlsZSBjYW5ub3QgYmUgbG9hZGVkOiAke2NvbmZpZ1BhdGh9YCArXG4gICAgICAgIGBcXG4ke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZXJyb3J9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVHbG9iYWxTZXR0aW5ncygpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpO1xuICBpZiAoIWhvbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGhvbWUgZGlyZWN0b3J5IGZvdW5kLicpO1xuICB9XG5cbiAgY29uc3QgZ2xvYmFsUGF0aCA9IHBhdGguam9pbihob21lLCBnbG9iYWxGaWxlTmFtZSk7XG4gIHdyaXRlRmlsZVN5bmMoZ2xvYmFsUGF0aCwgSlNPTi5zdHJpbmdpZnkoeyB2ZXJzaW9uOiAxIH0pKTtcblxuICByZXR1cm4gZ2xvYmFsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVJhdyhcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBbSlNPTkZpbGUgfCBudWxsLCBzdHJpbmcgfCBudWxsXSB7XG4gIGxldCBjb25maWdQYXRoID0gbGV2ZWwgPT09ICdsb2NhbCcgPyBwcm9qZWN0RmlsZVBhdGgoKSA6IGdsb2JhbEZpbGVQYXRoKCk7XG5cbiAgaWYgKCFjb25maWdQYXRoKSB7XG4gICAgaWYgKGxldmVsID09PSAnZ2xvYmFsJykge1xuICAgICAgY29uZmlnUGF0aCA9IGNyZWF0ZUdsb2JhbFNldHRpbmdzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbbnVsbCwgbnVsbF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFtuZXcgSlNPTkZpbGUoY29uZmlnUGF0aCksIGNvbmZpZ1BhdGhdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVXb3Jrc3BhY2UoZGF0YToganNvbi5Kc29uT2JqZWN0KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHNjaGVtYSA9IHJlYWRBbmRQYXJzZUpzb24od29ya3NwYWNlU2NoZW1hUGF0aCkgYXMganNvbi5zY2hlbWEuSnNvblNjaGVtYTtcbiAgY29uc3QgeyBmb3JtYXRzIH0gPSBhd2FpdCBpbXBvcnQoJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJyk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeShmb3JtYXRzLnN0YW5kYXJkRm9ybWF0cyk7XG4gIGNvbnN0IHZhbGlkYXRvciA9IGF3YWl0IHJlZ2lzdHJ5LmNvbXBpbGUoc2NoZW1hKS50b1Byb21pc2UoKTtcblxuICBjb25zdCB7IHN1Y2Nlc3MsIGVycm9ycyB9ID0gYXdhaXQgdmFsaWRhdG9yKGRhdGEpLnRvUHJvbWlzZSgpO1xuICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICB0aHJvdyBuZXcganNvbi5zY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihlcnJvcnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSwgbG9jYXRpb246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBpc0luc2lkZSA9IChiYXNlOiBzdHJpbmcsIHBvdGVudGlhbDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgYWJzb2x1dGVCYXNlID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUod29ya3NwYWNlLmJhc2VQYXRoLCBwb3RlbnRpYWwpO1xuICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzKVxuICAgIC5tYXAoKFtuYW1lLCBwcm9qZWN0XSkgPT4gW3Byb2plY3Qucm9vdCwgbmFtZV0gYXMgW3N0cmluZywgc3RyaW5nXSlcbiAgICAuZmlsdGVyKCh0dXBsZSkgPT4gaXNJbnNpZGUodHVwbGVbMF0sIGxvY2F0aW9uKSlcbiAgICAvLyBTb3J0IHR1cGxlcyBieSBkZXB0aCwgd2l0aCB0aGUgZGVlcGVyIG9uZXMgZmlyc3QuIFNpbmNlIHRoZSBmaXJzdCBtZW1iZXIgaXMgYSBwYXRoIGFuZFxuICAgIC8vIHdlIGZpbHRlcmVkIGFsbCBpbnZhbGlkIHBhdGhzLCB0aGUgbG9uZ2VzdCB3aWxsIGJlIHRoZSBkZWVwZXN0IChhbmQgaW4gY2FzZSBvZiBlcXVhbGl0eVxuICAgIC8vIHRoZSBzb3J0IGlzIHN0YWJsZSBhbmQgdGhlIGZpcnN0IGRlY2xhcmVkIHByb2plY3Qgd2lsbCB3aW4pLlxuICAgIC5zb3J0KChhLCBiKSA9PiBiWzBdLmxlbmd0aCAtIGFbMF0ubGVuZ3RoKTtcblxuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAocHJvamVjdHMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IGZvdW5kID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3Qgc2FtZVJvb3RzID0gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB7XG4gICAgICBpZiAoIWZvdW5kLmhhcyh2WzBdKSkge1xuICAgICAgICBmb3VuZC5hZGQodlswXSk7XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoc2FtZVJvb3RzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEFtYmlndW91cyBsb2NhdGlvbiAtIGNhbm5vdCBkZXRlcm1pbmUgYSBwcm9qZWN0XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvamVjdHNbMF1bMV07XG59XG5cbmxldCBkZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSk6IHN0cmluZyB8IG51bGwge1xuICBpZiAod29ya3NwYWNlLnByb2plY3RzLnNpemUgPT09IDEpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBvbmx5IG9uZSBwcm9qZWN0LCByZXR1cm4gdGhhdCBvbmUuXG4gICAgcmV0dXJuIEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzLmtleXMoKSlbMF07XG4gIH1cblxuICBjb25zdCBwcm9qZWN0ID0gZmluZFByb2plY3RCeVBhdGgod29ya3NwYWNlLCBwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKHByb2plY3QpIHtcbiAgICByZXR1cm4gcHJvamVjdDtcbiAgfVxuXG4gIGNvbnN0IGRlZmF1bHRQcm9qZWN0ID0gd29ya3NwYWNlLmV4dGVuc2lvbnNbJ2RlZmF1bHRQcm9qZWN0J107XG4gIGlmIChkZWZhdWx0UHJvamVjdCAmJiB0eXBlb2YgZGVmYXVsdFByb2plY3QgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYSBkZWZhdWx0IHByb2plY3QgbmFtZSwgcmV0dXJuIGl0LlxuICAgIGlmICghZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93bikge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgREVQUkVDQVRFRDogVGhlICdkZWZhdWx0UHJvamVjdCcgd29ya3NwYWNlIG9wdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkLiBgICtcbiAgICAgICAgICBgVGhlIHByb2plY3QgdG8gdXNlIHdpbGwgYmUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LmAsXG4gICAgICApO1xuXG4gICAgICBkZWZhdWx0UHJvamVjdERlcHJlY2F0aW9uV2FybmluZ1Nob3duID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmYXVsdFByb2plY3Q7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENvbmZpZ3VyZWRQYWNrYWdlTWFuYWdlcigpOiBQcm9taXNlPFBhY2thZ2VNYW5hZ2VyIHwgbnVsbD4ge1xuICBjb25zdCBnZXRQYWNrYWdlTWFuYWdlciA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogUGFja2FnZU1hbmFnZXIgfCBudWxsID0+IHtcbiAgICBpZiAoaXNKc29uT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc291cmNlWydwYWNrYWdlTWFuYWdlciddO1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIGFzIFBhY2thZ2VNYW5hZ2VyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIGxldCByZXN1bHQ6IFBhY2thZ2VNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICAgIH1cblxuICAgIHJlc3VsdCA/Pz0gZ2V0UGFja2FnZU1hbmFnZXIod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmICghcmVzdWx0KSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0UGFja2FnZU1hbmFnZXIoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNjaGVtYXRpY0RlZmF1bHRzKFxuICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gIHNjaGVtYXRpYzogc3RyaW5nLFxuICBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCxcbik6IFByb21pc2U8e30+IHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIGNvbnN0IG1lcmdlT3B0aW9ucyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICAvLyBNZXJnZSBvcHRpb25zIGZyb20gdGhlIHF1YWxpZmllZCBuYW1lXG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgc291cmNlW2Ake2NvbGxlY3Rpb259OiR7c2NoZW1hdGljfWBdKTtcblxuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIG5lc3RlZCBjb2xsZWN0aW9uIHNjaGVtYXRpY3NcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb25PcHRpb25zID0gc291cmNlW2NvbGxlY3Rpb25dO1xuICAgICAgaWYgKGlzSnNvbk9iamVjdChjb2xsZWN0aW9uT3B0aW9ucykpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIGNvbGxlY3Rpb25PcHRpb25zW3NjaGVtYXRpY10pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBHbG9iYWwgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIG1lcmdlT3B0aW9ucyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydzY2hlbWF0aWNzJ10pO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIC8vIFdvcmtzcGFjZSBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgIG1lcmdlT3B0aW9ucyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICAgIHByb2plY3QgPSBwcm9qZWN0IHx8IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICAvLyBQcm9qZWN0IGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gICAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLnByb2plY3RzLmdldChwcm9qZWN0KT8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNXYXJuaW5nRW5hYmxlZCh3YXJuaW5nOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZ2V0V2FybmluZyA9IChzb3VyY2U6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB3YXJuaW5ncyA9IHNvdXJjZVsnd2FybmluZ3MnXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3Qod2FybmluZ3MpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd2FybmluZ3Nbd2FybmluZ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGxldCByZXN1bHQ6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuICBpZiAod29ya3NwYWNlKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2UpO1xuICAgIGlmIChwcm9qZWN0KSB7XG4gICAgICByZXN1bHQgPSBnZXRXYXJuaW5nKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPSByZXN1bHQgPz8gZ2V0V2FybmluZyh3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgcmVzdWx0ID0gZ2V0V2FybmluZyhnbG9iYWxPcHRpb25zPy5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICAvLyBBbGwgd2FybmluZ3MgYXJlIGVuYWJsZWQgYnkgZGVmYXVsdFxuICByZXR1cm4gcmVzdWx0ID8/IHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0c0J5UGF0aChcbiAgd29ya3NwYWNlOiB3b3Jrc3BhY2VzLldvcmtzcGFjZURlZmluaXRpb24sXG4gIGN3ZDogc3RyaW5nLFxuICByb290OiBzdHJpbmcsXG4pOiBzdHJpbmdbXSB7XG4gIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCkpO1xuICB9XG5cbiAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHBhdGgucmVzb2x2ZShyb290LCBiYXNlKTtcbiAgICBjb25zdCBhYnNvbHV0ZVBvdGVudGlhbCA9IHBhdGgucmVzb2x2ZShyb290LCBwb3RlbnRpYWwpO1xuICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzLmVudHJpZXMoKSlcbiAgICAubWFwKChbbmFtZSwgcHJvamVjdF0pID0+IFtwYXRoLnJlc29sdmUocm9vdCwgcHJvamVjdC5yb290KSwgbmFtZV0gYXMgW3N0cmluZywgc3RyaW5nXSlcbiAgICAuZmlsdGVyKCh0dXBsZSkgPT4gaXNJbnNpZGUodHVwbGVbMF0sIGN3ZCkpXG4gICAgLy8gU29ydCB0dXBsZXMgYnkgZGVwdGgsIHdpdGggdGhlIGRlZXBlciBvbmVzIGZpcnN0LiBTaW5jZSB0aGUgZmlyc3QgbWVtYmVyIGlzIGEgcGF0aCBhbmRcbiAgICAvLyB3ZSBmaWx0ZXJlZCBhbGwgaW52YWxpZCBwYXRocywgdGhlIGxvbmdlc3Qgd2lsbCBiZSB0aGUgZGVlcGVzdCAoYW5kIGluIGNhc2Ugb2YgZXF1YWxpdHlcbiAgICAvLyB0aGUgc29ydCBpcyBzdGFibGUgYW5kIHRoZSBmaXJzdCBkZWNsYXJlZCBwcm9qZWN0IHdpbGwgd2luKS5cbiAgICAuc29ydCgoYSwgYikgPT4gYlswXS5sZW5ndGggLSBhWzBdLmxlbmd0aCk7XG5cbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBbcHJvamVjdHNbMF1bMV1dO1xuICB9IGVsc2UgaWYgKHByb2plY3RzLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCBmaXJzdFBhdGggPSBwcm9qZWN0c1swXVswXTtcblxuICAgIHJldHVybiBwcm9qZWN0cy5maWx0ZXIoKHYpID0+IHZbMF0gPT09IGZpcnN0UGF0aCkubWFwKCh2KSA9PiB2WzFdKTtcbiAgfVxuXG4gIHJldHVybiBbXTtcbn1cbiJdfQ==