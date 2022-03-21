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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBd0Q7QUFDeEQsMkJBQXVFO0FBQ3ZFLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsdUNBQW1DO0FBQ25DLDJDQUF5RDtBQUV6RCxTQUFTLFlBQVksQ0FBQyxLQUFpQztJQUNyRCxPQUFPLEtBQUssS0FBSyxTQUFTLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsT0FBTztRQUNMLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNqQixPQUFPLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUk7WUFDeEIsSUFBQSxrQkFBYSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQ3BCLElBQUk7Z0JBQ0YsT0FBTyxJQUFBLGFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNyQztZQUFDLFdBQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDZixJQUFJO2dCQUNGLE9BQU8sSUFBQSxhQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDaEM7WUFBQyxXQUFNO2dCQUNOLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDO0tBQ0YsQ0FB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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIHdvcmtzcGFjZXMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vbGliL2NvbmZpZy93b3Jrc3BhY2Utc2NoZW1hJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4vZmluZC11cCc7XG5pbXBvcnQgeyBKU09ORmlsZSwgcmVhZEFuZFBhcnNlSnNvbiB9IGZyb20gJy4vanNvbi1maWxlJztcblxuZnVuY3Rpb24gaXNKc29uT2JqZWN0KHZhbHVlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZhbHVlIGlzIGpzb24uSnNvbk9iamVjdCB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIGpzb24uaXNKc29uT2JqZWN0KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV29ya3NwYWNlSG9zdCgpOiB3b3Jrc3BhY2VzLldvcmtzcGFjZUhvc3Qge1xuICByZXR1cm4ge1xuICAgIGFzeW5jIHJlYWRGaWxlKHBhdGgpIHtcbiAgICAgIHJldHVybiByZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04Jyk7XG4gICAgfSxcbiAgICBhc3luYyB3cml0ZUZpbGUocGF0aCwgZGF0YSkge1xuICAgICAgd3JpdGVGaWxlU3luYyhwYXRoLCBkYXRhKTtcbiAgICB9LFxuICAgIGFzeW5jIGlzRGlyZWN0b3J5KHBhdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBzdGF0U3luYyhwYXRoKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFzeW5jIGlzRmlsZShwYXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gc3RhdFN5bmMocGF0aCkuaXNGaWxlKCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTY2hlbWFQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2xpYi9jb25maWcvc2NoZW1hLmpzb24nKTtcblxuY29uc3QgY29uZmlnTmFtZXMgPSBbJ2FuZ3VsYXIuanNvbicsICcuYW5ndWxhci5qc29uJ107XG5jb25zdCBnbG9iYWxGaWxlTmFtZSA9ICcuYW5ndWxhci1jb25maWcuanNvbic7XG5cbmZ1bmN0aW9uIHhkZ0NvbmZpZ0hvbWUoaG9tZTogc3RyaW5nLCBjb25maWdGaWxlPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gaHR0cHM6Ly9zcGVjaWZpY2F0aW9ucy5mcmVlZGVza3RvcC5vcmcvYmFzZWRpci1zcGVjL2Jhc2VkaXItc3BlYy1sYXRlc3QuaHRtbFxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddIHx8IHBhdGguam9pbihob21lLCAnLmNvbmZpZycpO1xuICBjb25zdCB4ZGdBbmd1bGFySG9tZSA9IHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBjb25maWdGaWxlID8gcGF0aC5qb2luKHhkZ0FuZ3VsYXJIb21lLCBjb25maWdGaWxlKSA6IHhkZ0FuZ3VsYXJIb21lO1xufVxuXG5mdW5jdGlvbiB4ZGdDb25maWdIb21lT2xkKGhvbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIENoZWNrIHRoZSBjb25maWd1cmF0aW9uIGZpbGVzIGluIHRoZSBvbGQgbG9jYXRpb24gdGhhdCBzaG91bGQgYmU6XG4gIC8vIC0gJFhER19DT05GSUdfSE9NRS8uYW5ndWxhci1jb25maWcuanNvbiAoaWYgWERHX0NPTkZJR19IT01FIGlzIHNldClcbiAgLy8gLSAkSE9NRS8uY29uZmlnL2FuZ3VsYXIvLmFuZ3VsYXItY29uZmlnLmpzb24gKG90aGVyd2lzZSlcbiAgY29uc3QgcCA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnYW5ndWxhcicpO1xuXG4gIHJldHVybiBwYXRoLmpvaW4ocCwgJy5hbmd1bGFyLWNvbmZpZy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHByb2plY3RGaWxlUGF0aChwcm9qZWN0UGF0aD86IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAvLyBGaW5kIHRoZSBjb25maWd1cmF0aW9uLCBlaXRoZXIgd2hlcmUgc3BlY2lmaWVkLCBpbiB0aGUgQW5ndWxhciBDTEkgcHJvamVjdFxuICAvLyAoaWYgaXQncyBpbiBub2RlX21vZHVsZXMpIG9yIGZyb20gdGhlIGN1cnJlbnQgcHJvY2Vzcy5cbiAgcmV0dXJuIChcbiAgICAocHJvamVjdFBhdGggJiYgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9qZWN0UGF0aCkpIHx8XG4gICAgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9jZXNzLmN3ZCgpKSB8fFxuICAgIGZpbmRVcChjb25maWdOYW1lcywgX19kaXJuYW1lKVxuICApO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxGaWxlUGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBmb2xsb3cgWERHIEJhc2UgRGlyZWN0b3J5IHNwZWNcbiAgLy8gbm90ZSB0aGF0IGNyZWF0ZUdsb2JhbFNldHRpbmdzKCkgd2lsbCBjb250aW51ZSBjcmVhdGluZ1xuICAvLyBnbG9iYWwgZmlsZSBpbiBob21lIGRpcmVjdG9yeSwgd2l0aCB0aGlzIHVzZXIgd2lsbCBoYXZlXG4gIC8vIGNob2ljZSB0byBtb3ZlIGNoYW5nZSBpdHMgbG9jYXRpb24gdG8gbWVldCBYREcgY29udmVudGlvblxuICBjb25zdCB4ZGdDb25maWcgPSB4ZGdDb25maWdIb21lKGhvbWUsICdjb25maWcuanNvbicpO1xuICBpZiAoZXhpc3RzU3luYyh4ZGdDb25maWcpKSB7XG4gICAgcmV0dXJuIHhkZ0NvbmZpZztcbiAgfVxuICAvLyBOT1RFOiBUaGlzIGNoZWNrIGlzIGZvciB0aGUgb2xkIGNvbmZpZ3VyYXRpb24gbG9jYXRpb24sIGZvciBtb3JlXG4gIC8vIGluZm9ybWF0aW9uIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzIwNTU2XG4gIGNvbnN0IHhkZ0NvbmZpZ09sZCA9IHhkZ0NvbmZpZ0hvbWVPbGQoaG9tZSk7XG4gIGlmIChleGlzdHNTeW5jKHhkZ0NvbmZpZ09sZCkpIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgY29uc29sZS53YXJuKFxuICAgICAgYE9sZCBjb25maWd1cmF0aW9uIGxvY2F0aW9uIGRldGVjdGVkOiAke3hkZ0NvbmZpZ09sZH1cXG5gICtcbiAgICAgICAgYFBsZWFzZSBtb3ZlIHRoZSBmaWxlIHRvIHRoZSBuZXcgbG9jYXRpb24gfi8uY29uZmlnL2FuZ3VsYXIvY29uZmlnLmpzb25gLFxuICAgICk7XG5cbiAgICByZXR1cm4geGRnQ29uZmlnT2xkO1xuICB9XG5cbiAgY29uc3QgcCA9IHBhdGguam9pbihob21lLCBnbG9iYWxGaWxlTmFtZSk7XG4gIGlmIChleGlzdHNTeW5jKHApKSB7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJXb3Jrc3BhY2Uge1xuICByZWFkb25seSBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd29ya3NwYWNlOiB3b3Jrc3BhY2VzLldvcmtzcGFjZURlZmluaXRpb24sIHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmJhc2VQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgfVxuXG4gIGdldCBleHRlbnNpb25zKCk6IFJlY29yZDxzdHJpbmcsIGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnM7XG4gIH1cblxuICBnZXQgcHJvamVjdHMoKTogd29ya3NwYWNlcy5Qcm9qZWN0RGVmaW5pdGlvbkNvbGxlY3Rpb24ge1xuICAgIHJldHVybiB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cztcbiAgfVxuXG4gIC8vIFRlbXBvcmFyeSBoZWxwZXIgZnVuY3Rpb25zIHRvIHN1cHBvcnQgcmVmYWN0b3JpbmdcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRDbGkoKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuICh0aGlzLndvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgfHwge307XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRQcm9qZWN0Q2xpKHByb2plY3ROYW1lOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcblxuICAgIHJldHVybiAocHJvamVjdD8uZXh0ZW5zaW9uc1snY2xpJ10gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHx8IHt9O1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGxvYWQod29ya3NwYWNlRmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdvcmtzcGFjZXMucmVhZFdvcmtzcGFjZShcbiAgICAgIHdvcmtzcGFjZUZpbGVQYXRoLFxuICAgICAgY3JlYXRlV29ya3NwYWNlSG9zdCgpLFxuICAgICAgd29ya3NwYWNlcy5Xb3Jrc3BhY2VGb3JtYXQuSlNPTixcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBbmd1bGFyV29ya3NwYWNlKHJlc3VsdC53b3Jrc3BhY2UsIHdvcmtzcGFjZUZpbGVQYXRoKTtcbiAgfVxufVxuXG5jb25zdCBjYWNoZWRXb3Jrc3BhY2VzID0gbmV3IE1hcDxzdHJpbmcsIEFuZ3VsYXJXb3Jrc3BhY2UgfCBudWxsPigpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V29ya3NwYWNlKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZSB8IG51bGw+IHtcbiAgY29uc3QgY2FjaGVkID0gY2FjaGVkV29ya3NwYWNlcy5nZXQobGV2ZWwpO1xuICBpZiAoY2FjaGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG5cbiAgY29uc3QgY29uZmlnUGF0aCA9IGxldmVsID09PSAnbG9jYWwnID8gcHJvamVjdEZpbGVQYXRoKCkgOiBnbG9iYWxGaWxlUGF0aCgpO1xuXG4gIGlmICghY29uZmlnUGF0aCkge1xuICAgIGNhY2hlZFdvcmtzcGFjZXMuc2V0KGxldmVsLCBudWxsKTtcblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBBbmd1bGFyV29ya3NwYWNlLmxvYWQoY29uZmlnUGF0aCk7XG4gICAgY2FjaGVkV29ya3NwYWNlcy5zZXQobGV2ZWwsIHdvcmtzcGFjZSk7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBXb3Jrc3BhY2UgY29uZmlnIGZpbGUgY2Fubm90IGJlIGxvYWRlZDogJHtjb25maWdQYXRofWAgK1xuICAgICAgICBgXFxuJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IGVycm9yfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlR2xvYmFsU2V0dGluZ3MoKTogc3RyaW5nIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBob21lIGRpcmVjdG9yeSBmb3VuZC4nKTtcbiAgfVxuXG4gIGNvbnN0IGdsb2JhbFBhdGggPSBwYXRoLmpvaW4oaG9tZSwgZ2xvYmFsRmlsZU5hbWUpO1xuICB3cml0ZUZpbGVTeW5jKGdsb2JhbFBhdGgsIEpTT04uc3RyaW5naWZ5KHsgdmVyc2lvbjogMSB9KSk7XG5cbiAgcmV0dXJuIGdsb2JhbFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VSYXcoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcgPSAnbG9jYWwnLFxuKTogW0pTT05GaWxlIHwgbnVsbCwgc3RyaW5nIHwgbnVsbF0ge1xuICBsZXQgY29uZmlnUGF0aCA9IGxldmVsID09PSAnbG9jYWwnID8gcHJvamVjdEZpbGVQYXRoKCkgOiBnbG9iYWxGaWxlUGF0aCgpO1xuXG4gIGlmICghY29uZmlnUGF0aCkge1xuICAgIGlmIChsZXZlbCA9PT0gJ2dsb2JhbCcpIHtcbiAgICAgIGNvbmZpZ1BhdGggPSBjcmVhdGVHbG9iYWxTZXR0aW5ncygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW251bGwsIG51bGxdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbbmV3IEpTT05GaWxlKGNvbmZpZ1BhdGgpLCBjb25maWdQYXRoXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlV29ya3NwYWNlKGRhdGE6IGpzb24uSnNvbk9iamVjdCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzY2hlbWEgPSByZWFkQW5kUGFyc2VKc29uKHdvcmtzcGFjZVNjaGVtYVBhdGgpIGFzIGpzb24uc2NoZW1hLkpzb25TY2hlbWE7XG4gIGNvbnN0IHsgZm9ybWF0cyB9ID0gYXdhaXQgaW1wb3J0KCdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcycpO1xuICBjb25zdCByZWdpc3RyeSA9IG5ldyBqc29uLnNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoZm9ybWF0cy5zdGFuZGFyZEZvcm1hdHMpO1xuICBjb25zdCB2YWxpZGF0b3IgPSBhd2FpdCByZWdpc3RyeS5jb21waWxlKHNjaGVtYSkudG9Qcm9taXNlKCk7XG5cbiAgY29uc3QgeyBzdWNjZXNzLCBlcnJvcnMgfSA9IGF3YWl0IHZhbGlkYXRvcihkYXRhKS50b1Byb21pc2UoKTtcbiAgaWYgKCFzdWNjZXNzKSB7XG4gICAgdGhyb3cgbmV3IGpzb24uc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24oZXJyb3JzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kUHJvamVjdEJ5UGF0aCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UsIGxvY2F0aW9uOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UuYmFzZVBhdGgsIGJhc2UpO1xuICAgIGNvbnN0IGFic29sdXRlUG90ZW50aWFsID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cylcbiAgICAubWFwKChbbmFtZSwgcHJvamVjdF0pID0+IFtwcm9qZWN0LnJvb3QsIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBsb2NhdGlvbikpXG4gICAgLy8gU29ydCB0dXBsZXMgYnkgZGVwdGgsIHdpdGggdGhlIGRlZXBlciBvbmVzIGZpcnN0LiBTaW5jZSB0aGUgZmlyc3QgbWVtYmVyIGlzIGEgcGF0aCBhbmRcbiAgICAvLyB3ZSBmaWx0ZXJlZCBhbGwgaW52YWxpZCBwYXRocywgdGhlIGxvbmdlc3Qgd2lsbCBiZSB0aGUgZGVlcGVzdCAoYW5kIGluIGNhc2Ugb2YgZXF1YWxpdHlcbiAgICAvLyB0aGUgc29ydCBpcyBzdGFibGUgYW5kIHRoZSBmaXJzdCBkZWNsYXJlZCBwcm9qZWN0IHdpbGwgd2luKS5cbiAgICAuc29ydCgoYSwgYikgPT4gYlswXS5sZW5ndGggLSBhWzBdLmxlbmd0aCk7XG5cbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHByb2plY3RzLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCBmb3VuZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHNhbWVSb290cyA9IHByb2plY3RzLmZpbHRlcigodikgPT4ge1xuICAgICAgaWYgKCFmb3VuZC5oYXModlswXSkpIHtcbiAgICAgICAgZm91bmQuYWRkKHZbMF0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKHNhbWVSb290cy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBBbWJpZ3VvdXMgbG9jYXRpb24gLSBjYW5ub3QgZGV0ZXJtaW5lIGEgcHJvamVjdFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByb2plY3RzWzBdWzFdO1xufVxuXG5sZXQgZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHdvcmtzcGFjZS5wcm9qZWN0cy5zaXplID09PSAxKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgb25seSBvbmUgcHJvamVjdCwgcmV0dXJuIHRoYXQgb25lLlxuICAgIHJldHVybiBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCkpWzBdO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdCA9IGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZSwgcHJvY2Vzcy5jd2QoKSk7XG4gIGlmIChwcm9qZWN0KSB7XG4gICAgcmV0dXJuIHByb2plY3Q7XG4gIH1cblxuICBjb25zdCBkZWZhdWx0UHJvamVjdCA9IHdvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddO1xuICBpZiAoZGVmYXVsdFByb2plY3QgJiYgdHlwZW9mIGRlZmF1bHRQcm9qZWN0ID09PSAnc3RyaW5nJykge1xuICAgIC8vIElmIHRoZXJlIGlzIGEgZGVmYXVsdCBwcm9qZWN0IG5hbWUsIHJldHVybiBpdC5cbiAgICBpZiAoIWRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24pIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYERFUFJFQ0FURUQ6IFRoZSAnZGVmYXVsdFByb2plY3QnIHdvcmtzcGFjZSBvcHRpb24gaGFzIGJlZW4gZGVwcmVjYXRlZC4gYCArXG4gICAgICAgICAgYFRoZSBwcm9qZWN0IHRvIHVzZSB3aWxsIGJlIGRldGVybWluZWQgZnJvbSB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5gLFxuICAgICAgKTtcblxuICAgICAgZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogUHJvbWlzZTxQYWNrYWdlTWFuYWdlciB8IG51bGw+IHtcbiAgY29uc3QgZ2V0UGFja2FnZU1hbmFnZXIgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IFBhY2thZ2VNYW5hZ2VyIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHNvdXJjZVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSBhcyBQYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICBsZXQgcmVzdWx0OiBQYWNrYWdlTWFuYWdlciB8IG51bGwgPSBudWxsO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgaWYgKHByb2plY3QpIHtcbiAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPz89IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICBpZiAoIXJlc3VsdCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGdsb2JhbE9wdGlvbnM/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTY2hlbWF0aWNEZWZhdWx0cyhcbiAgY29sbGVjdGlvbjogc3RyaW5nLFxuICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgcHJvamVjdD86IHN0cmluZyB8IG51bGwsXG4pOiBQcm9taXNlPHt9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBtZXJnZU9wdGlvbnMgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIHRoZSBxdWFsaWZpZWQgbmFtZVxuICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIHNvdXJjZVtgJHtjb2xsZWN0aW9ufToke3NjaGVtYXRpY31gXSk7XG5cbiAgICAgIC8vIE1lcmdlIG9wdGlvbnMgZnJvbSBuZXN0ZWQgY29sbGVjdGlvbiBzY2hlbWF0aWNzXG4gICAgICBjb25zdCBjb2xsZWN0aW9uT3B0aW9ucyA9IHNvdXJjZVtjb2xsZWN0aW9uXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3QoY29sbGVjdGlvbk9wdGlvbnMpKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCBjb2xsZWN0aW9uT3B0aW9uc1tzY2hlbWF0aWNdKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gR2xvYmFsIGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBtZXJnZU9wdGlvbnMoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAvLyBXb3Jrc3BhY2UgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG5cbiAgICBwcm9qZWN0ID0gcHJvamVjdCB8fCBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgLy8gUHJvamVjdCBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgICAgbWVyZ2VPcHRpb25zKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzV2FybmluZ0VuYWJsZWQod2FybmluZzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGdldFdhcm5pbmcgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBzb3VyY2VbJ3dhcm5pbmdzJ107XG4gICAgICBpZiAoaXNKc29uT2JqZWN0KHdhcm5pbmdzKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdhcm5pbmdzW3dhcm5pbmddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdib29sZWFuJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzdWx0OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0V2FybmluZyh3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ID8/IGdldFdhcm5pbmcod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFdhcm5pbmcoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgLy8gQWxsIHdhcm5pbmdzIGFyZSBlbmFibGVkIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHJlc3VsdCA/PyB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdHNCeVBhdGgoXG4gIHdvcmtzcGFjZTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VEZWZpbml0aW9uLFxuICBjd2Q6IHN0cmluZyxcbiAgcm9vdDogc3RyaW5nLFxuKTogc3RyaW5nW10ge1xuICBpZiAod29ya3NwYWNlLnByb2plY3RzLnNpemUgPT09IDEpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMua2V5cygpKTtcbiAgfVxuXG4gIGNvbnN0IGlzSW5zaWRlID0gKGJhc2U6IHN0cmluZywgcG90ZW50aWFsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBhYnNvbHV0ZUJhc2UgPSBwYXRoLnJlc29sdmUocm9vdCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUocm9vdCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5lbnRyaWVzKCkpXG4gICAgLm1hcCgoW25hbWUsIHByb2plY3RdKSA9PiBbcGF0aC5yZXNvbHZlKHJvb3QsIHByb2plY3Qucm9vdCksIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBjd2QpKVxuICAgIC8vIFNvcnQgdHVwbGVzIGJ5IGRlcHRoLCB3aXRoIHRoZSBkZWVwZXIgb25lcyBmaXJzdC4gU2luY2UgdGhlIGZpcnN0IG1lbWJlciBpcyBhIHBhdGggYW5kXG4gICAgLy8gd2UgZmlsdGVyZWQgYWxsIGludmFsaWQgcGF0aHMsIHRoZSBsb25nZXN0IHdpbGwgYmUgdGhlIGRlZXBlc3QgKGFuZCBpbiBjYXNlIG9mIGVxdWFsaXR5XG4gICAgLy8gdGhlIHNvcnQgaXMgc3RhYmxlIGFuZCB0aGUgZmlyc3QgZGVjbGFyZWQgcHJvamVjdCB3aWxsIHdpbikuXG4gICAgLnNvcnQoKGEsIGIpID0+IGJbMF0ubGVuZ3RoIC0gYVswXS5sZW5ndGgpO1xuXG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gW3Byb2plY3RzWzBdWzFdXTtcbiAgfSBlbHNlIGlmIChwcm9qZWN0cy5sZW5ndGggPiAxKSB7XG4gICAgY29uc3QgZmlyc3RQYXRoID0gcHJvamVjdHNbMF1bMF07XG5cbiAgICByZXR1cm4gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB2WzBdID09PSBmaXJzdFBhdGgpLm1hcCgodikgPT4gdlsxXSk7XG4gIH1cblxuICByZXR1cm4gW107XG59XG4iXX0=