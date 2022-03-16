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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBd0Q7QUFDeEQsMkJBQXVFO0FBQ3ZFLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsdUNBQW1DO0FBQ25DLDJDQUF5RDtBQUV6RCxTQUFTLFlBQVksQ0FBQyxLQUFpQztJQUNyRCxPQUFPLEtBQUssS0FBSyxTQUFTLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsT0FBTztRQUNMLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNqQixPQUFPLElBQUEsaUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUk7WUFDeEIsSUFBQSxrQkFBYSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQ3BCLElBQUk7Z0JBQ0YsT0FBTyxJQUFBLGFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNyQztZQUFDLFdBQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDZixJQUFJO2dCQUNGLE9BQU8sSUFBQSxhQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDaEM7WUFBQyxXQUFNO2dCQUNOLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDO0tBQ0YsQ0FB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QUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQXFCLENBQUM7U0FDdEYsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLHlGQUF5RjtRQUN6RiwwRkFBMEY7UUFDMUYsK0RBQStEO1NBQzlELElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRTdDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM5QixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwRTtJQUVELE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQXJDRCw4Q0FxQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsganNvbiwgd29ya3NwYWNlcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi8uLi9saWIvY29uZmlnL3dvcmtzcGFjZS1zY2hlbWEnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi9maW5kLXVwJztcbmltcG9ydCB7IEpTT05GaWxlLCByZWFkQW5kUGFyc2VKc29uIH0gZnJvbSAnLi9qc29uLWZpbGUnO1xuXG5mdW5jdGlvbiBpc0pzb25PYmplY3QodmFsdWU6IGpzb24uSnNvblZhbHVlIHwgdW5kZWZpbmVkKTogdmFsdWUgaXMganNvbi5Kc29uT2JqZWN0IHtcbiAgcmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQgJiYganNvbi5pc0pzb25PYmplY3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXb3Jrc3BhY2VIb3N0KCk6IHdvcmtzcGFjZXMuV29ya3NwYWNlSG9zdCB7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgcmVhZEZpbGUocGF0aCkge1xuICAgICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICB9LFxuICAgIGFzeW5jIHdyaXRlRmlsZShwYXRoLCBkYXRhKSB7XG4gICAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGRhdGEpO1xuICAgIH0sXG4gICAgYXN5bmMgaXNEaXJlY3RvcnkocGF0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHN0YXRTeW5jKHBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXN5bmMgaXNGaWxlKHBhdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBzdGF0U3luYyhwYXRoKS5pc0ZpbGUoKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHdvcmtzcGFjZVNjaGVtYVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vbGliL2NvbmZpZy9zY2hlbWEuanNvbicpO1xuXG5jb25zdCBjb25maWdOYW1lcyA9IFsnYW5ndWxhci5qc29uJywgJy5hbmd1bGFyLmpzb24nXTtcbmNvbnN0IGdsb2JhbEZpbGVOYW1lID0gJy5hbmd1bGFyLWNvbmZpZy5qc29uJztcblxuZnVuY3Rpb24geGRnQ29uZmlnSG9tZShob21lOiBzdHJpbmcsIGNvbmZpZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBodHRwczovL3NwZWNpZmljYXRpb25zLmZyZWVkZXNrdG9wLm9yZy9iYXNlZGlyLXNwZWMvYmFzZWRpci1zcGVjLWxhdGVzdC5odG1sXG4gIGNvbnN0IHhkZ0NvbmZpZ0hvbWUgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ10gfHwgcGF0aC5qb2luKGhvbWUsICcuY29uZmlnJyk7XG4gIGNvbnN0IHhkZ0FuZ3VsYXJIb21lID0gcGF0aC5qb2luKHhkZ0NvbmZpZ0hvbWUsICdhbmd1bGFyJyk7XG5cbiAgcmV0dXJuIGNvbmZpZ0ZpbGUgPyBwYXRoLmpvaW4oeGRnQW5ndWxhckhvbWUsIGNvbmZpZ0ZpbGUpIDogeGRnQW5ndWxhckhvbWU7XG59XG5cbmZ1bmN0aW9uIHhkZ0NvbmZpZ0hvbWVPbGQoaG9tZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gQ2hlY2sgdGhlIGNvbmZpZ3VyYXRpb24gZmlsZXMgaW4gdGhlIG9sZCBsb2NhdGlvbiB0aGF0IHNob3VsZCBiZTpcbiAgLy8gLSAkWERHX0NPTkZJR19IT01FLy5hbmd1bGFyLWNvbmZpZy5qc29uIChpZiBYREdfQ09ORklHX0hPTUUgaXMgc2V0KVxuICAvLyAtICRIT01FLy5jb25maWcvYW5ndWxhci8uYW5ndWxhci1jb25maWcuanNvbiAob3RoZXJ3aXNlKVxuICBjb25zdCBwID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddIHx8IHBhdGguam9pbihob21lLCAnLmNvbmZpZycsICdhbmd1bGFyJyk7XG5cbiAgcmV0dXJuIHBhdGguam9pbihwLCAnLmFuZ3VsYXItY29uZmlnLmpzb24nKTtcbn1cblxuZnVuY3Rpb24gcHJvamVjdEZpbGVQYXRoKHByb2plY3RQYXRoPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIC8vIEZpbmQgdGhlIGNvbmZpZ3VyYXRpb24sIGVpdGhlciB3aGVyZSBzcGVjaWZpZWQsIGluIHRoZSBBbmd1bGFyIENMSSBwcm9qZWN0XG4gIC8vIChpZiBpdCdzIGluIG5vZGVfbW9kdWxlcykgb3IgZnJvbSB0aGUgY3VycmVudCBwcm9jZXNzLlxuICByZXR1cm4gKFxuICAgIChwcm9qZWN0UGF0aCAmJiBmaW5kVXAoY29uZmlnTmFtZXMsIHByb2plY3RQYXRoKSkgfHxcbiAgICBmaW5kVXAoY29uZmlnTmFtZXMsIHByb2Nlc3MuY3dkKCkpIHx8XG4gICAgZmluZFVwKGNvbmZpZ05hbWVzLCBfX2Rpcm5hbWUpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdsb2JhbEZpbGVQYXRoKCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpO1xuICBpZiAoIWhvbWUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIGZvbGxvdyBYREcgQmFzZSBEaXJlY3Rvcnkgc3BlY1xuICAvLyBub3RlIHRoYXQgY3JlYXRlR2xvYmFsU2V0dGluZ3MoKSB3aWxsIGNvbnRpbnVlIGNyZWF0aW5nXG4gIC8vIGdsb2JhbCBmaWxlIGluIGhvbWUgZGlyZWN0b3J5LCB3aXRoIHRoaXMgdXNlciB3aWxsIGhhdmVcbiAgLy8gY2hvaWNlIHRvIG1vdmUgY2hhbmdlIGl0cyBsb2NhdGlvbiB0byBtZWV0IFhERyBjb252ZW50aW9uXG4gIGNvbnN0IHhkZ0NvbmZpZyA9IHhkZ0NvbmZpZ0hvbWUoaG9tZSwgJ2NvbmZpZy5qc29uJyk7XG4gIGlmIChleGlzdHNTeW5jKHhkZ0NvbmZpZykpIHtcbiAgICByZXR1cm4geGRnQ29uZmlnO1xuICB9XG4gIC8vIE5PVEU6IFRoaXMgY2hlY2sgaXMgZm9yIHRoZSBvbGQgY29uZmlndXJhdGlvbiBsb2NhdGlvbiwgZm9yIG1vcmVcbiAgLy8gaW5mb3JtYXRpb24gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMjA1NTZcbiAgY29uc3QgeGRnQ29uZmlnT2xkID0geGRnQ29uZmlnSG9tZU9sZChob21lKTtcbiAgaWYgKGV4aXN0c1N5bmMoeGRnQ29uZmlnT2xkKSkge1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICBjb25zb2xlLndhcm4oXG4gICAgICBgT2xkIGNvbmZpZ3VyYXRpb24gbG9jYXRpb24gZGV0ZWN0ZWQ6ICR7eGRnQ29uZmlnT2xkfVxcbmAgK1xuICAgICAgICBgUGxlYXNlIG1vdmUgdGhlIGZpbGUgdG8gdGhlIG5ldyBsb2NhdGlvbiB+Ly5jb25maWcvYW5ndWxhci9jb25maWcuanNvbmAsXG4gICAgKTtcblxuICAgIHJldHVybiB4ZGdDb25maWdPbGQ7XG4gIH1cblxuICBjb25zdCBwID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgaWYgKGV4aXN0c1N5bmMocCkpIHtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgY2xhc3MgQW5ndWxhcldvcmtzcGFjZSB7XG4gIHJlYWRvbmx5IGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3b3Jrc3BhY2U6IHdvcmtzcGFjZXMuV29ya3NwYWNlRGVmaW5pdGlvbiwgcmVhZG9ubHkgZmlsZVBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuYmFzZVBhdGggPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGV4dGVuc2lvbnMoKTogUmVjb3JkPHN0cmluZywganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9ucztcbiAgfVxuXG4gIGdldCBwcm9qZWN0cygpOiB3b3Jrc3BhY2VzLlByb2plY3REZWZpbml0aW9uQ29sbGVjdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLnByb2plY3RzO1xuICB9XG5cbiAgLy8gVGVtcG9yYXJ5IGhlbHBlciBmdW5jdGlvbnMgdG8gc3VwcG9ydCByZWZhY3RvcmluZ1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldENsaSgpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICByZXR1cm4gKHRoaXMud29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldFByb2plY3RDbGkocHJvamVjdE5hbWU6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLndvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuXG4gICAgcmV0dXJuIChwcm9qZWN0Py5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgfHwge307XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgbG9hZCh3b3Jrc3BhY2VGaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxBbmd1bGFyV29ya3NwYWNlPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya3NwYWNlcy5yZWFkV29ya3NwYWNlKFxuICAgICAgd29ya3NwYWNlRmlsZVBhdGgsXG4gICAgICBjcmVhdGVXb3Jrc3BhY2VIb3N0KCksXG4gICAgICB3b3Jrc3BhY2VzLldvcmtzcGFjZUZvcm1hdC5KU09OLFxuICAgICk7XG5cbiAgICByZXR1cm4gbmV3IEFuZ3VsYXJXb3Jrc3BhY2UocmVzdWx0LndvcmtzcGFjZSwgd29ya3NwYWNlRmlsZVBhdGgpO1xuICB9XG59XG5cbmNvbnN0IGNhY2hlZFdvcmtzcGFjZXMgPSBuZXcgTWFwPHN0cmluZywgQW5ndWxhcldvcmtzcGFjZSB8IG51bGw+KCk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRXb3Jrc3BhY2UoXG4gIGxldmVsOiAnbG9jYWwnIHwgJ2dsb2JhbCcgPSAnbG9jYWwnLFxuKTogUHJvbWlzZTxBbmd1bGFyV29ya3NwYWNlIHwgbnVsbD4ge1xuICBjb25zdCBjYWNoZWQgPSBjYWNoZWRXb3Jrc3BhY2VzLmdldChsZXZlbCk7XG4gIGlmIChjYWNoZWQgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBjYWNoZWQ7XG4gIH1cblxuICBjb25zdCBjb25maWdQYXRoID0gbGV2ZWwgPT09ICdsb2NhbCcgPyBwcm9qZWN0RmlsZVBhdGgoKSA6IGdsb2JhbEZpbGVQYXRoKCk7XG5cbiAgaWYgKCFjb25maWdQYXRoKSB7XG4gICAgY2FjaGVkV29ya3NwYWNlcy5zZXQobGV2ZWwsIG51bGwpO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IEFuZ3VsYXJXb3Jrc3BhY2UubG9hZChjb25maWdQYXRoKTtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgd29ya3NwYWNlKTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFdvcmtzcGFjZSBjb25maWcgZmlsZSBjYW5ub3QgYmUgbG9hZGVkOiAke2NvbmZpZ1BhdGh9YCArXG4gICAgICAgIGBcXG4ke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZXJyb3J9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVHbG9iYWxTZXR0aW5ncygpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gb3MuaG9tZWRpcigpO1xuICBpZiAoIWhvbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGhvbWUgZGlyZWN0b3J5IGZvdW5kLicpO1xuICB9XG5cbiAgY29uc3QgZ2xvYmFsUGF0aCA9IHBhdGguam9pbihob21lLCBnbG9iYWxGaWxlTmFtZSk7XG4gIHdyaXRlRmlsZVN5bmMoZ2xvYmFsUGF0aCwgSlNPTi5zdHJpbmdpZnkoeyB2ZXJzaW9uOiAxIH0pKTtcblxuICByZXR1cm4gZ2xvYmFsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVJhdyhcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBbSlNPTkZpbGUgfCBudWxsLCBzdHJpbmcgfCBudWxsXSB7XG4gIGxldCBjb25maWdQYXRoID0gbGV2ZWwgPT09ICdsb2NhbCcgPyBwcm9qZWN0RmlsZVBhdGgoKSA6IGdsb2JhbEZpbGVQYXRoKCk7XG5cbiAgaWYgKCFjb25maWdQYXRoKSB7XG4gICAgaWYgKGxldmVsID09PSAnZ2xvYmFsJykge1xuICAgICAgY29uZmlnUGF0aCA9IGNyZWF0ZUdsb2JhbFNldHRpbmdzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbbnVsbCwgbnVsbF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFtuZXcgSlNPTkZpbGUoY29uZmlnUGF0aCksIGNvbmZpZ1BhdGhdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVXb3Jrc3BhY2UoZGF0YToganNvbi5Kc29uT2JqZWN0KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHNjaGVtYSA9IHJlYWRBbmRQYXJzZUpzb24od29ya3NwYWNlU2NoZW1hUGF0aCkgYXMganNvbi5zY2hlbWEuSnNvblNjaGVtYTtcbiAgY29uc3QgeyBmb3JtYXRzIH0gPSBhd2FpdCBpbXBvcnQoJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJyk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeShmb3JtYXRzLnN0YW5kYXJkRm9ybWF0cyk7XG4gIGNvbnN0IHZhbGlkYXRvciA9IGF3YWl0IHJlZ2lzdHJ5LmNvbXBpbGUoc2NoZW1hKS50b1Byb21pc2UoKTtcblxuICBjb25zdCB7IHN1Y2Nlc3MsIGVycm9ycyB9ID0gYXdhaXQgdmFsaWRhdG9yKGRhdGEpLnRvUHJvbWlzZSgpO1xuICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICB0aHJvdyBuZXcganNvbi5zY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihlcnJvcnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZTogQW5ndWxhcldvcmtzcGFjZSwgbG9jYXRpb246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBpc0luc2lkZSA9IChiYXNlOiBzdHJpbmcsIHBvdGVudGlhbDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgYWJzb2x1dGVCYXNlID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUod29ya3NwYWNlLmJhc2VQYXRoLCBwb3RlbnRpYWwpO1xuICAgIGNvbnN0IHJlbGF0aXZlUG90ZW50aWFsID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUJhc2UsIGFic29sdXRlUG90ZW50aWFsKTtcbiAgICBpZiAoIXJlbGF0aXZlUG90ZW50aWFsLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBvdGVudGlhbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBjb25zdCBwcm9qZWN0cyA9IEFycmF5LmZyb20od29ya3NwYWNlLnByb2plY3RzKVxuICAgIC5tYXAoKFtuYW1lLCBwcm9qZWN0XSkgPT4gW3Byb2plY3Qucm9vdCwgbmFtZV0gYXMgW3N0cmluZywgc3RyaW5nXSlcbiAgICAuZmlsdGVyKCh0dXBsZSkgPT4gaXNJbnNpZGUodHVwbGVbMF0sIGxvY2F0aW9uKSlcbiAgICAvLyBTb3J0IHR1cGxlcyBieSBkZXB0aCwgd2l0aCB0aGUgZGVlcGVyIG9uZXMgZmlyc3QuIFNpbmNlIHRoZSBmaXJzdCBtZW1iZXIgaXMgYSBwYXRoIGFuZFxuICAgIC8vIHdlIGZpbHRlcmVkIGFsbCBpbnZhbGlkIHBhdGhzLCB0aGUgbG9uZ2VzdCB3aWxsIGJlIHRoZSBkZWVwZXN0IChhbmQgaW4gY2FzZSBvZiBlcXVhbGl0eVxuICAgIC8vIHRoZSBzb3J0IGlzIHN0YWJsZSBhbmQgdGhlIGZpcnN0IGRlY2xhcmVkIHByb2plY3Qgd2lsbCB3aW4pLlxuICAgIC5zb3J0KChhLCBiKSA9PiBiWzBdLmxlbmd0aCAtIGFbMF0ubGVuZ3RoKTtcblxuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAocHJvamVjdHMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IGZvdW5kID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3Qgc2FtZVJvb3RzID0gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB7XG4gICAgICBpZiAoIWZvdW5kLmhhcyh2WzBdKSkge1xuICAgICAgICBmb3VuZC5hZGQodlswXSk7XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoc2FtZVJvb3RzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEFtYmlndW91cyBsb2NhdGlvbiAtIGNhbm5vdCBkZXRlcm1pbmUgYSBwcm9qZWN0XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvamVjdHNbMF1bMV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlOiBBbmd1bGFyV29ya3NwYWNlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMSkge1xuICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgb25lIHByb2plY3QsIHJldHVybiB0aGF0IG9uZS5cbiAgICByZXR1cm4gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMua2V5cygpKVswXTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3QgPSBmaW5kUHJvamVjdEJ5UGF0aCh3b3Jrc3BhY2UsIHByb2Nlc3MuY3dkKCkpO1xuICBpZiAocHJvamVjdCkge1xuICAgIHJldHVybiBwcm9qZWN0O1xuICB9XG5cbiAgY29uc3QgZGVmYXVsdFByb2plY3QgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9uc1snZGVmYXVsdFByb2plY3QnXTtcbiAgaWYgKGRlZmF1bHRQcm9qZWN0ICYmIHR5cGVvZiBkZWZhdWx0UHJvamVjdCA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhIGRlZmF1bHQgcHJvamVjdCBuYW1lLCByZXR1cm4gaXQuXG4gICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogUHJvbWlzZTxQYWNrYWdlTWFuYWdlciB8IG51bGw+IHtcbiAgY29uc3QgZ2V0UGFja2FnZU1hbmFnZXIgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IFBhY2thZ2VNYW5hZ2VyIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHNvdXJjZVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSBhcyBQYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICBsZXQgcmVzdWx0OiBQYWNrYWdlTWFuYWdlciB8IG51bGwgPSBudWxsO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgaWYgKHByb2plY3QpIHtcbiAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPz89IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICBpZiAoIXJlc3VsdCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGdsb2JhbE9wdGlvbnM/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTY2hlbWF0aWNEZWZhdWx0cyhcbiAgY29sbGVjdGlvbjogc3RyaW5nLFxuICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgcHJvamVjdD86IHN0cmluZyB8IG51bGwsXG4pOiBQcm9taXNlPHt9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBtZXJnZU9wdGlvbnMgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIHRoZSBxdWFsaWZpZWQgbmFtZVxuICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIHNvdXJjZVtgJHtjb2xsZWN0aW9ufToke3NjaGVtYXRpY31gXSk7XG5cbiAgICAgIC8vIE1lcmdlIG9wdGlvbnMgZnJvbSBuZXN0ZWQgY29sbGVjdGlvbiBzY2hlbWF0aWNzXG4gICAgICBjb25zdCBjb2xsZWN0aW9uT3B0aW9ucyA9IHNvdXJjZVtjb2xsZWN0aW9uXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3QoY29sbGVjdGlvbk9wdGlvbnMpKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCBjb2xsZWN0aW9uT3B0aW9uc1tzY2hlbWF0aWNdKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gR2xvYmFsIGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBtZXJnZU9wdGlvbnMoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAvLyBXb3Jrc3BhY2UgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG5cbiAgICBwcm9qZWN0ID0gcHJvamVjdCB8fCBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgLy8gUHJvamVjdCBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgICAgbWVyZ2VPcHRpb25zKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzV2FybmluZ0VuYWJsZWQod2FybmluZzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGdldFdhcm5pbmcgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBzb3VyY2VbJ3dhcm5pbmdzJ107XG4gICAgICBpZiAoaXNKc29uT2JqZWN0KHdhcm5pbmdzKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdhcm5pbmdzW3dhcm5pbmddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdib29sZWFuJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzdWx0OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0V2FybmluZyh3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ID8/IGdldFdhcm5pbmcod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFdhcm5pbmcoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgLy8gQWxsIHdhcm5pbmdzIGFyZSBlbmFibGVkIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHJlc3VsdCA/PyB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdHNCeVBhdGgoXG4gIHdvcmtzcGFjZTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VEZWZpbml0aW9uLFxuICBjd2Q6IHN0cmluZyxcbiAgcm9vdDogc3RyaW5nLFxuKTogc3RyaW5nW10ge1xuICBpZiAod29ya3NwYWNlLnByb2plY3RzLnNpemUgPT09IDEpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh3b3Jrc3BhY2UucHJvamVjdHMua2V5cygpKTtcbiAgfVxuXG4gIGNvbnN0IGlzSW5zaWRlID0gKGJhc2U6IHN0cmluZywgcG90ZW50aWFsOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBhYnNvbHV0ZUJhc2UgPSBwYXRoLnJlc29sdmUocm9vdCwgYmFzZSk7XG4gICAgY29uc3QgYWJzb2x1dGVQb3RlbnRpYWwgPSBwYXRoLnJlc29sdmUocm9vdCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5lbnRyaWVzKCkpXG4gICAgLm1hcCgoW25hbWUsIHByb2plY3RdKSA9PiBbcGF0aC5yZXNvbHZlKHJvb3QsIHByb2plY3Qucm9vdCksIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBjd2QpKVxuICAgIC8vIFNvcnQgdHVwbGVzIGJ5IGRlcHRoLCB3aXRoIHRoZSBkZWVwZXIgb25lcyBmaXJzdC4gU2luY2UgdGhlIGZpcnN0IG1lbWJlciBpcyBhIHBhdGggYW5kXG4gICAgLy8gd2UgZmlsdGVyZWQgYWxsIGludmFsaWQgcGF0aHMsIHRoZSBsb25nZXN0IHdpbGwgYmUgdGhlIGRlZXBlc3QgKGFuZCBpbiBjYXNlIG9mIGVxdWFsaXR5XG4gICAgLy8gdGhlIHNvcnQgaXMgc3RhYmxlIGFuZCB0aGUgZmlyc3QgZGVjbGFyZWQgcHJvamVjdCB3aWxsIHdpbikuXG4gICAgLnNvcnQoKGEsIGIpID0+IGJbMF0ubGVuZ3RoIC0gYVswXS5sZW5ndGgpO1xuXG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gW3Byb2plY3RzWzBdWzFdXTtcbiAgfSBlbHNlIGlmIChwcm9qZWN0cy5sZW5ndGggPiAxKSB7XG4gICAgY29uc3QgZmlyc3RQYXRoID0gcHJvamVjdHNbMF1bMF07XG5cbiAgICByZXR1cm4gcHJvamVjdHMuZmlsdGVyKCh2KSA9PiB2WzBdID09PSBmaXJzdFBhdGgpLm1hcCgodikgPT4gdlsxXSk7XG4gIH1cblxuICByZXR1cm4gW107XG59XG4iXX0=