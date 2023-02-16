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
exports.isWarningEnabled = exports.getSchematicDefaults = exports.getConfiguredPackageManager = exports.getProjectByCwd = exports.validateWorkspace = exports.getWorkspaceRaw = exports.getWorkspace = exports.AngularWorkspace = exports.workspaceSchemaPath = void 0;
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
        readFile(path) {
            return fs_1.promises.readFile(path, 'utf-8');
        },
        async writeFile(path, data) {
            await fs_1.promises.writeFile(path, data);
        },
        async isDirectory(path) {
            try {
                const stats = await fs_1.promises.stat(path);
                return stats.isDirectory();
            }
            catch {
                return false;
            }
        },
        async isFile(path) {
            try {
                const stats = await fs_1.promises.stat(path);
                return stats.isFile();
            }
            catch {
                return false;
            }
        },
    };
}
exports.workspaceSchemaPath = path.join(__dirname, '../../lib/config/schema.json');
const configNames = ['angular.json', '.angular.json'];
const globalFileName = '.angular-config.json';
const defaultGlobalFilePath = path.join(os.homedir(), globalFileName);
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
    if ((0, fs_1.existsSync)(defaultGlobalFilePath)) {
        return defaultGlobalFilePath;
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
        return this.workspace.extensions['cli'];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProjectCli(projectName) {
        const project = this.workspace.projects.get(projectName);
        return project?.extensions['cli'];
    }
    save() {
        return core_1.workspaces.writeWorkspace(this.workspace, createWorkspaceHost(), this.filePath, core_1.workspaces.WorkspaceFormat.JSON);
    }
    static async load(workspaceFilePath) {
        const result = await core_1.workspaces.readWorkspace(workspaceFilePath, createWorkspaceHost(), core_1.workspaces.WorkspaceFormat.JSON);
        return new AngularWorkspace(result.workspace, workspaceFilePath);
    }
}
exports.AngularWorkspace = AngularWorkspace;
const cachedWorkspaces = new Map();
async function getWorkspace(level) {
    if (cachedWorkspaces.has(level)) {
        return cachedWorkspaces.get(level);
    }
    const configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        if (level === 'global') {
            // Unlike a local config, a global config is not mandatory.
            // So we create an empty one in memory and keep it as such until it has been modified and saved.
            const globalWorkspace = new AngularWorkspace({ extensions: {}, projects: new core_1.workspaces.ProjectDefinitionCollection() }, defaultGlobalFilePath);
            cachedWorkspaces.set(level, globalWorkspace);
            return globalWorkspace;
        }
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
/**
 * This method will load the workspace configuration in raw JSON format.
 * When `level` is `global` and file doesn't exists, it will be created.
 *
 * NB: This method is intended to be used only for `ng config`.
 */
async function getWorkspaceRaw(level = 'local') {
    let configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        if (level === 'global') {
            configPath = defaultGlobalFilePath;
            // Config doesn't exist, force create it.
            const globalWorkspace = await getWorkspace('global');
            await globalWorkspace.save();
        }
        else {
            return [null, null];
        }
    }
    return [new json_file_1.JSONFile(configPath), configPath];
}
exports.getWorkspaceRaw = getWorkspaceRaw;
async function validateWorkspace(data, isGlobal) {
    const schema = (0, json_file_1.readAndParseJson)(exports.workspaceSchemaPath);
    // We should eventually have a dedicated global config schema and use that to validate.
    const schemaToValidate = isGlobal
        ? {
            '$ref': '#/definitions/global',
            definitions: schema['definitions'],
        }
        : schema;
    const { formats } = await Promise.resolve().then(() => __importStar(require('@angular-devkit/schematics')));
    const registry = new core_1.json.schema.CoreSchemaRegistry(formats.standardFormats);
    const validator = await registry.compile(schemaToValidate);
    const { success, errors } = await validator(data);
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
            result = getPackageManager(workspace.projects.get(project)?.extensions['cli']);
        }
        result ?? (result = getPackageManager(workspace.extensions['cli']));
    }
    if (!result) {
        const globalOptions = await getWorkspace('global');
        result = getPackageManager(globalOptions?.extensions['cli']);
    }
    return result;
}
exports.getConfiguredPackageManager = getConfiguredPackageManager;
async function getSchematicDefaults(collection, schematic, project) {
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
    mergeOptions(globalOptions?.extensions['schematics']);
    const workspace = await getWorkspace('local');
    if (workspace) {
        // Workspace level schematic options
        mergeOptions(workspace.extensions['schematics']);
        project = project || getProjectByCwd(workspace);
        if (project) {
            // Project level schematic options
            mergeOptions(workspace.projects.get(project)?.extensions['schematics']);
        }
    }
    return result;
}
exports.getSchematicDefaults = getSchematicDefaults;
async function isWarningEnabled(warning) {
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
            result = getWarning(workspace.projects.get(project)?.extensions['cli']);
        }
        result = result ?? getWarning(workspace.extensions['cli']);
    }
    if (result === undefined) {
        const globalOptions = await getWorkspace('global');
        result = getWarning(globalOptions?.extensions['cli']);
    }
    // All warnings are enabled by default
    return result ?? true;
}
exports.isWarningEnabled = isWarningEnabled;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBd0Q7QUFDeEQsMkJBQWdEO0FBQ2hELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsdUNBQW1DO0FBQ25DLDJDQUF5RDtBQUV6RCxTQUFTLFlBQVksQ0FBQyxLQUFpQztJQUNyRCxPQUFPLEtBQUssS0FBSyxTQUFTLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsT0FBTztRQUNMLFFBQVEsQ0FBQyxJQUFJO1lBQ1gsT0FBTyxhQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSTtZQUN4QixNQUFNLGFBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUk7WUFDcEIsSUFBSTtnQkFDRixNQUFNLEtBQUssR0FBRyxNQUFNLGFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRWxDLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzVCO1lBQUMsTUFBTTtnQkFDTixPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUNmLElBQUk7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsTUFBTSxhQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVsQyxPQUFPLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN2QjtZQUFDLE1BQU07Z0JBQ04sT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVZLFFBQUEsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsQ0FBQztBQUV4RixNQUFNLFdBQVcsR0FBRyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN0RCxNQUFNLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQztBQUM5QyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBRXRFLFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxVQUFtQjtJQUN0RCwrRUFBK0U7SUFDL0UsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ25GLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRTNELE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO0FBQzdFLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDcEMsb0VBQW9FO0lBQ3BFLHNFQUFzRTtJQUN0RSwyREFBMkQ7SUFDM0QsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUVsRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLFdBQW9CO0lBQzNDLDZFQUE2RTtJQUM3RSx5REFBeUQ7SUFDekQsT0FBTyxDQUNMLENBQUMsV0FBVyxJQUFJLElBQUEsZ0JBQU0sRUFBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDakQsSUFBQSxnQkFBTSxFQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEMsSUFBQSxnQkFBTSxFQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FDL0IsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGNBQWM7SUFDckIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDVCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsaUNBQWlDO0lBQ2pDLDBEQUEwRDtJQUMxRCwwREFBMEQ7SUFDMUQsNERBQTREO0lBQzVELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDckQsSUFBSSxJQUFBLGVBQVUsRUFBQyxTQUFTLENBQUMsRUFBRTtRQUN6QixPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUNELG1FQUFtRTtJQUNuRSxvRUFBb0U7SUFDcEUsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxJQUFBLGVBQVUsRUFBQyxZQUFZLENBQUMsRUFBRTtRQUM1QiwrQkFBK0I7UUFDL0IsT0FBTyxDQUFDLElBQUksQ0FDVix3Q0FBd0MsWUFBWSxJQUFJO1lBQ3RELHdFQUF3RSxDQUMzRSxDQUFDO1FBRUYsT0FBTyxZQUFZLENBQUM7S0FDckI7SUFFRCxJQUFJLElBQUEsZUFBVSxFQUFDLHFCQUFxQixDQUFDLEVBQUU7UUFDckMsT0FBTyxxQkFBcUIsQ0FBQztLQUM5QjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQWEsZ0JBQWdCO0lBRzNCLFlBQ21CLFNBQXlDLEVBQ2pELFFBQWdCO1FBRFIsY0FBUyxHQUFULFNBQVMsQ0FBZ0M7UUFDakQsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUV6QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7SUFDakMsQ0FBQztJQUVELG9EQUFvRDtJQUVwRCw4REFBOEQ7SUFDOUQsTUFBTTtRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUE0QixDQUFDO0lBQ3JFLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsYUFBYSxDQUFDLFdBQW1CO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RCxPQUFPLE9BQU8sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUE0QixDQUFDO0lBQy9ELENBQUM7SUFFRCxJQUFJO1FBQ0YsT0FBTyxpQkFBVSxDQUFDLGNBQWMsQ0FDOUIsSUFBSSxDQUFDLFNBQVMsRUFDZCxtQkFBbUIsRUFBRSxFQUNyQixJQUFJLENBQUMsUUFBUSxFQUNiLGlCQUFVLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDaEMsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBeUI7UUFDekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBVSxDQUFDLGFBQWEsQ0FDM0MsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUFFLEVBQ3JCLGlCQUFVLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDaEMsQ0FBQztRQUVGLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBbERELDRDQWtEQztBQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7QUFRbEUsS0FBSyxVQUFVLFlBQVksQ0FDaEMsS0FBeUI7SUFFekIsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDL0IsT0FBTyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDcEM7SUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDNUUsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNmLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtZQUN0QiwyREFBMkQ7WUFDM0QsZ0dBQWdHO1lBQ2hHLE1BQU0sZUFBZSxHQUFHLElBQUksZ0JBQWdCLENBQzFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxpQkFBVSxDQUFDLDJCQUEyQixFQUFFLEVBQUUsRUFDMUUscUJBQXFCLENBQ3RCLENBQUM7WUFFRixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRTdDLE9BQU8sZUFBZSxDQUFDO1NBQ3hCO1FBRUQsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV2QyxPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELElBQUk7UUFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxRCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXZDLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLElBQUksS0FBSyxDQUNiLDJDQUEyQyxVQUFVLEVBQUU7WUFDckQsS0FBSyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FDeEQsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQXRDRCxvQ0FzQ0M7QUFFRDs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSxlQUFlLENBQ25DLFFBQTRCLE9BQU87SUFFbkMsSUFBSSxVQUFVLEdBQUcsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBRTFFLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDZixJQUFJLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDdEIsVUFBVSxHQUFHLHFCQUFxQixDQUFDO1lBQ25DLHlDQUF5QztZQUV6QyxNQUFNLGVBQWUsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyRCxNQUFNLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUM5QjthQUFNO1lBQ0wsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNyQjtLQUNGO0lBRUQsT0FBTyxDQUFDLElBQUksb0JBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBbEJELDBDQWtCQztBQUVNLEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxJQUFxQixFQUFFLFFBQWlCO0lBQzlFLE1BQU0sTUFBTSxHQUFHLElBQUEsNEJBQWdCLEVBQUMsMkJBQW1CLENBQUMsQ0FBQztJQUVyRCx1RkFBdUY7SUFDdkYsTUFBTSxnQkFBZ0IsR0FBMkIsUUFBUTtRQUN2RCxDQUFDLENBQUM7WUFDRSxNQUFNLEVBQUUsc0JBQXNCO1lBQzlCLFdBQVcsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDO1NBQ25DO1FBQ0gsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUVYLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyx3REFBYSw0QkFBNEIsR0FBQyxDQUFDO0lBQy9ELE1BQU0sUUFBUSxHQUFHLElBQUksV0FBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDN0UsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDM0QsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsRCxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osTUFBTSxJQUFJLFdBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDekQ7QUFDSCxDQUFDO0FBbEJELDhDQWtCQztBQUVELFNBQVMsaUJBQWlCLENBQUMsU0FBMkIsRUFBRSxRQUFnQjtJQUN0RSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxTQUFpQixFQUFXLEVBQUU7UUFDNUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQzlFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQztJQUVGLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUM1QyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBcUIsQ0FBQztTQUNsRSxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQseUZBQXlGO1FBQ3pGLDBGQUEwRjtRQUMxRiwrREFBK0Q7U0FDOUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFN0MsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN6QixPQUFPLElBQUksQ0FBQztLQUNiO1NBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2hDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFaEIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLGtEQUFrRDtZQUNsRCxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQsSUFBSSxxQ0FBcUMsR0FBRyxLQUFLLENBQUM7QUFDbEQsU0FBZ0IsZUFBZSxDQUFDLFNBQTJCO0lBQ3pELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1FBQ2pDLGlEQUFpRDtRQUNqRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVELElBQUksT0FBTyxFQUFFO1FBQ1gsT0FBTyxPQUFPLENBQUM7S0FDaEI7SUFFRCxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDOUQsSUFBSSxjQUFjLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFO1FBQ3hELGlEQUFpRDtRQUNqRCxJQUFJLENBQUMscUNBQXFDLEVBQUU7WUFDMUMsT0FBTyxDQUFDLElBQUksQ0FDVix5RUFBeUU7Z0JBQ3ZFLDJFQUEyRSxDQUM5RSxDQUFDO1lBRUYscUNBQXFDLEdBQUcsSUFBSSxDQUFDO1NBQzlDO1FBRUQsT0FBTyxjQUFjLENBQUM7S0FDdkI7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUEzQkQsMENBMkJDO0FBRU0sS0FBSyxVQUFVLDJCQUEyQjtJQUMvQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsTUFBa0MsRUFBeUIsRUFBRTtRQUN0RixJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN2QyxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7Z0JBQ3RDLE9BQU8sS0FBdUIsQ0FBQzthQUNoQztTQUNGO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7SUFFRixJQUFJLE1BQU0sR0FBMEIsSUFBSSxDQUFDO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLElBQUksU0FBUyxFQUFFO1FBQ2IsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLElBQUksT0FBTyxFQUFFO1lBQ1gsTUFBTSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2hGO1FBRUQsTUFBTSxLQUFOLE1BQU0sR0FBSyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUM7S0FDM0Q7SUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxhQUFhLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxHQUFHLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUM5RDtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUE3QkQsa0VBNkJDO0FBRU0sS0FBSyxVQUFVLG9CQUFvQixDQUN4QyxVQUFrQixFQUNsQixTQUFpQixFQUNqQixPQUF1QjtJQUV2QixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDbEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFrQyxFQUFRLEVBQUU7UUFDaEUsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDeEIsd0NBQXdDO1lBQ3hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLFVBQVUsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFNUQsa0RBQWtEO1lBQ2xELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzdDLElBQUksWUFBWSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDckQ7U0FDRjtJQUNILENBQUMsQ0FBQztJQUVGLGlDQUFpQztJQUNqQyxNQUFNLGFBQWEsR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuRCxZQUFZLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBRXRELE1BQU0sU0FBUyxHQUFHLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLElBQUksU0FBUyxFQUFFO1FBQ2Isb0NBQW9DO1FBQ3BDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFakQsT0FBTyxHQUFHLE9BQU8sSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEQsSUFBSSxPQUFPLEVBQUU7WUFDWCxrQ0FBa0M7WUFDbEMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1NBQ3pFO0tBQ0Y7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBcENELG9EQW9DQztBQUVNLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxPQUFlO0lBQ3BELE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBa0MsRUFBdUIsRUFBRTtRQUM3RSxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4QixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzFCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxPQUFPLEtBQUssSUFBSSxTQUFTLEVBQUU7b0JBQzdCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7U0FDRjtJQUNILENBQUMsQ0FBQztJQUVGLElBQUksTUFBMkIsQ0FBQztJQUVoQyxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxJQUFJLFNBQVMsRUFBRTtRQUNiLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDekU7UUFFRCxNQUFNLEdBQUcsTUFBTSxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDNUQ7SUFFRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDeEIsTUFBTSxhQUFhLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsTUFBTSxHQUFHLFVBQVUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDdkQ7SUFFRCxzQ0FBc0M7SUFDdEMsT0FBTyxNQUFNLElBQUksSUFBSSxDQUFDO0FBQ3hCLENBQUM7QUFoQ0QsNENBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24sIHdvcmtzcGFjZXMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uLy4uL2xpYi9jb25maWcvd29ya3NwYWNlLXNjaGVtYSc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuL2ZpbmQtdXAnO1xuaW1wb3J0IHsgSlNPTkZpbGUsIHJlYWRBbmRQYXJzZUpzb24gfSBmcm9tICcuL2pzb24tZmlsZSc7XG5cbmZ1bmN0aW9uIGlzSnNvbk9iamVjdCh2YWx1ZToganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQpOiB2YWx1ZSBpcyBqc29uLkpzb25PYmplY3Qge1xuICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiBqc29uLmlzSnNvbk9iamVjdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VIb3N0IHtcbiAgcmV0dXJuIHtcbiAgICByZWFkRmlsZShwYXRoKSB7XG4gICAgICByZXR1cm4gZnMucmVhZEZpbGUocGF0aCwgJ3V0Zi04Jyk7XG4gICAgfSxcbiAgICBhc3luYyB3cml0ZUZpbGUocGF0aCwgZGF0YSkge1xuICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHBhdGgsIGRhdGEpO1xuICAgIH0sXG4gICAgYXN5bmMgaXNEaXJlY3RvcnkocGF0aCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5zdGF0KHBhdGgpO1xuXG4gICAgICAgIHJldHVybiBzdGF0cy5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFzeW5jIGlzRmlsZShwYXRoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQocGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHN0YXRzLmlzRmlsZSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgd29ya3NwYWNlU2NoZW1hUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9saWIvY29uZmlnL3NjaGVtYS5qc29uJyk7XG5cbmNvbnN0IGNvbmZpZ05hbWVzID0gWydhbmd1bGFyLmpzb24nLCAnLmFuZ3VsYXIuanNvbiddO1xuY29uc3QgZ2xvYmFsRmlsZU5hbWUgPSAnLmFuZ3VsYXItY29uZmlnLmpzb24nO1xuY29uc3QgZGVmYXVsdEdsb2JhbEZpbGVQYXRoID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgZ2xvYmFsRmlsZU5hbWUpO1xuXG5mdW5jdGlvbiB4ZGdDb25maWdIb21lKGhvbWU6IHN0cmluZywgY29uZmlnRmlsZT86IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIGh0dHBzOi8vc3BlY2lmaWNhdGlvbnMuZnJlZWRlc2t0b3Aub3JnL2Jhc2VkaXItc3BlYy9iYXNlZGlyLXNwZWMtbGF0ZXN0Lmh0bWxcbiAgY29uc3QgeGRnQ29uZmlnSG9tZSA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXSB8fCBwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnKTtcbiAgY29uc3QgeGRnQW5ndWxhckhvbWUgPSBwYXRoLmpvaW4oeGRnQ29uZmlnSG9tZSwgJ2FuZ3VsYXInKTtcblxuICByZXR1cm4gY29uZmlnRmlsZSA/IHBhdGguam9pbih4ZGdBbmd1bGFySG9tZSwgY29uZmlnRmlsZSkgOiB4ZGdBbmd1bGFySG9tZTtcbn1cblxuZnVuY3Rpb24geGRnQ29uZmlnSG9tZU9sZChob21lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBDaGVjayB0aGUgY29uZmlndXJhdGlvbiBmaWxlcyBpbiB0aGUgb2xkIGxvY2F0aW9uIHRoYXQgc2hvdWxkIGJlOlxuICAvLyAtICRYREdfQ09ORklHX0hPTUUvLmFuZ3VsYXItY29uZmlnLmpzb24gKGlmIFhER19DT05GSUdfSE9NRSBpcyBzZXQpXG4gIC8vIC0gJEhPTUUvLmNvbmZpZy9hbmd1bGFyLy5hbmd1bGFyLWNvbmZpZy5qc29uIChvdGhlcndpc2UpXG4gIGNvbnN0IHAgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ10gfHwgcGF0aC5qb2luKGhvbWUsICcuY29uZmlnJywgJ2FuZ3VsYXInKTtcblxuICByZXR1cm4gcGF0aC5qb2luKHAsICcuYW5ndWxhci1jb25maWcuanNvbicpO1xufVxuXG5mdW5jdGlvbiBwcm9qZWN0RmlsZVBhdGgocHJvamVjdFBhdGg/OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgLy8gRmluZCB0aGUgY29uZmlndXJhdGlvbiwgZWl0aGVyIHdoZXJlIHNwZWNpZmllZCwgaW4gdGhlIEFuZ3VsYXIgQ0xJIHByb2plY3RcbiAgLy8gKGlmIGl0J3MgaW4gbm9kZV9tb2R1bGVzKSBvciBmcm9tIHRoZSBjdXJyZW50IHByb2Nlc3MuXG4gIHJldHVybiAoXG4gICAgKHByb2plY3RQYXRoICYmIGZpbmRVcChjb25maWdOYW1lcywgcHJvamVjdFBhdGgpKSB8fFxuICAgIGZpbmRVcChjb25maWdOYW1lcywgcHJvY2Vzcy5jd2QoKSkgfHxcbiAgICBmaW5kVXAoY29uZmlnTmFtZXMsIF9fZGlybmFtZSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2xvYmFsRmlsZVBhdGgoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKCk7XG4gIGlmICghaG9tZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZm9sbG93IFhERyBCYXNlIERpcmVjdG9yeSBzcGVjXG4gIC8vIG5vdGUgdGhhdCBjcmVhdGVHbG9iYWxTZXR0aW5ncygpIHdpbGwgY29udGludWUgY3JlYXRpbmdcbiAgLy8gZ2xvYmFsIGZpbGUgaW4gaG9tZSBkaXJlY3RvcnksIHdpdGggdGhpcyB1c2VyIHdpbGwgaGF2ZVxuICAvLyBjaG9pY2UgdG8gbW92ZSBjaGFuZ2UgaXRzIGxvY2F0aW9uIHRvIG1lZXQgWERHIGNvbnZlbnRpb25cbiAgY29uc3QgeGRnQ29uZmlnID0geGRnQ29uZmlnSG9tZShob21lLCAnY29uZmlnLmpzb24nKTtcbiAgaWYgKGV4aXN0c1N5bmMoeGRnQ29uZmlnKSkge1xuICAgIHJldHVybiB4ZGdDb25maWc7XG4gIH1cbiAgLy8gTk9URTogVGhpcyBjaGVjayBpcyBmb3IgdGhlIG9sZCBjb25maWd1cmF0aW9uIGxvY2F0aW9uLCBmb3IgbW9yZVxuICAvLyBpbmZvcm1hdGlvbiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8yMDU1NlxuICBjb25zdCB4ZGdDb25maWdPbGQgPSB4ZGdDb25maWdIb21lT2xkKGhvbWUpO1xuICBpZiAoZXhpc3RzU3luYyh4ZGdDb25maWdPbGQpKSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgIGNvbnNvbGUud2FybihcbiAgICAgIGBPbGQgY29uZmlndXJhdGlvbiBsb2NhdGlvbiBkZXRlY3RlZDogJHt4ZGdDb25maWdPbGR9XFxuYCArXG4gICAgICAgIGBQbGVhc2UgbW92ZSB0aGUgZmlsZSB0byB0aGUgbmV3IGxvY2F0aW9uIH4vLmNvbmZpZy9hbmd1bGFyL2NvbmZpZy5qc29uYCxcbiAgICApO1xuXG4gICAgcmV0dXJuIHhkZ0NvbmZpZ09sZDtcbiAgfVxuXG4gIGlmIChleGlzdHNTeW5jKGRlZmF1bHRHbG9iYWxGaWxlUGF0aCkpIHtcbiAgICByZXR1cm4gZGVmYXVsdEdsb2JhbEZpbGVQYXRoO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBBbmd1bGFyV29ya3NwYWNlIHtcbiAgcmVhZG9ubHkgYmFzZVBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IHdvcmtzcGFjZTogd29ya3NwYWNlcy5Xb3Jrc3BhY2VEZWZpbml0aW9uLFxuICAgIHJlYWRvbmx5IGZpbGVQYXRoOiBzdHJpbmcsXG4gICkge1xuICAgIHRoaXMuYmFzZVBhdGggPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICB9XG5cbiAgZ2V0IGV4dGVuc2lvbnMoKTogUmVjb3JkPHN0cmluZywganNvbi5Kc29uVmFsdWUgfCB1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9ucztcbiAgfVxuXG4gIGdldCBwcm9qZWN0cygpOiB3b3Jrc3BhY2VzLlByb2plY3REZWZpbml0aW9uQ29sbGVjdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMud29ya3NwYWNlLnByb2plY3RzO1xuICB9XG5cbiAgLy8gVGVtcG9yYXJ5IGhlbHBlciBmdW5jdGlvbnMgdG8gc3VwcG9ydCByZWZhY3RvcmluZ1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldENsaSgpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2UuZXh0ZW5zaW9uc1snY2xpJ10gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBnZXRQcm9qZWN0Q2xpKHByb2plY3ROYW1lOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBwcm9qZWN0ID0gdGhpcy53b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcblxuICAgIHJldHVybiBwcm9qZWN0Py5leHRlbnNpb25zWydjbGknXSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgfVxuXG4gIHNhdmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHdvcmtzcGFjZXMud3JpdGVXb3Jrc3BhY2UoXG4gICAgICB0aGlzLndvcmtzcGFjZSxcbiAgICAgIGNyZWF0ZVdvcmtzcGFjZUhvc3QoKSxcbiAgICAgIHRoaXMuZmlsZVBhdGgsXG4gICAgICB3b3Jrc3BhY2VzLldvcmtzcGFjZUZvcm1hdC5KU09OLFxuICAgICk7XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgbG9hZCh3b3Jrc3BhY2VGaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxBbmd1bGFyV29ya3NwYWNlPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya3NwYWNlcy5yZWFkV29ya3NwYWNlKFxuICAgICAgd29ya3NwYWNlRmlsZVBhdGgsXG4gICAgICBjcmVhdGVXb3Jrc3BhY2VIb3N0KCksXG4gICAgICB3b3Jrc3BhY2VzLldvcmtzcGFjZUZvcm1hdC5KU09OLFxuICAgICk7XG5cbiAgICByZXR1cm4gbmV3IEFuZ3VsYXJXb3Jrc3BhY2UocmVzdWx0LndvcmtzcGFjZSwgd29ya3NwYWNlRmlsZVBhdGgpO1xuICB9XG59XG5cbmNvbnN0IGNhY2hlZFdvcmtzcGFjZXMgPSBuZXcgTWFwPHN0cmluZywgQW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZD4oKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZShsZXZlbDogJ2dsb2JhbCcpOiBQcm9taXNlPEFuZ3VsYXJXb3Jrc3BhY2U+O1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZShsZXZlbDogJ2xvY2FsJyk6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZD47XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V29ya3NwYWNlKFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnLFxuKTogUHJvbWlzZTxBbmd1bGFyV29ya3NwYWNlIHwgdW5kZWZpbmVkPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZShcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyxcbik6IFByb21pc2U8QW5ndWxhcldvcmtzcGFjZSB8IHVuZGVmaW5lZD4ge1xuICBpZiAoY2FjaGVkV29ya3NwYWNlcy5oYXMobGV2ZWwpKSB7XG4gICAgcmV0dXJuIGNhY2hlZFdvcmtzcGFjZXMuZ2V0KGxldmVsKTtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcbiAgaWYgKCFjb25maWdQYXRoKSB7XG4gICAgaWYgKGxldmVsID09PSAnZ2xvYmFsJykge1xuICAgICAgLy8gVW5saWtlIGEgbG9jYWwgY29uZmlnLCBhIGdsb2JhbCBjb25maWcgaXMgbm90IG1hbmRhdG9yeS5cbiAgICAgIC8vIFNvIHdlIGNyZWF0ZSBhbiBlbXB0eSBvbmUgaW4gbWVtb3J5IGFuZCBrZWVwIGl0IGFzIHN1Y2ggdW50aWwgaXQgaGFzIGJlZW4gbW9kaWZpZWQgYW5kIHNhdmVkLlxuICAgICAgY29uc3QgZ2xvYmFsV29ya3NwYWNlID0gbmV3IEFuZ3VsYXJXb3Jrc3BhY2UoXG4gICAgICAgIHsgZXh0ZW5zaW9uczoge30sIHByb2plY3RzOiBuZXcgd29ya3NwYWNlcy5Qcm9qZWN0RGVmaW5pdGlvbkNvbGxlY3Rpb24oKSB9LFxuICAgICAgICBkZWZhdWx0R2xvYmFsRmlsZVBhdGgsXG4gICAgICApO1xuXG4gICAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgZ2xvYmFsV29ya3NwYWNlKTtcblxuICAgICAgcmV0dXJuIGdsb2JhbFdvcmtzcGFjZTtcbiAgICB9XG5cbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgdW5kZWZpbmVkKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IEFuZ3VsYXJXb3Jrc3BhY2UubG9hZChjb25maWdQYXRoKTtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgd29ya3NwYWNlKTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2U7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFdvcmtzcGFjZSBjb25maWcgZmlsZSBjYW5ub3QgYmUgbG9hZGVkOiAke2NvbmZpZ1BhdGh9YCArXG4gICAgICAgIGBcXG4ke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogZXJyb3J9YCxcbiAgICApO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2Qgd2lsbCBsb2FkIHRoZSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBpbiByYXcgSlNPTiBmb3JtYXQuXG4gKiBXaGVuIGBsZXZlbGAgaXMgYGdsb2JhbGAgYW5kIGZpbGUgZG9lc24ndCBleGlzdHMsIGl0IHdpbGwgYmUgY3JlYXRlZC5cbiAqXG4gKiBOQjogVGhpcyBtZXRob2QgaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCBvbmx5IGZvciBgbmcgY29uZmlnYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFdvcmtzcGFjZVJhdyhcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBQcm9taXNlPFtKU09ORmlsZSB8IG51bGwsIHN0cmluZyB8IG51bGxdPiB7XG4gIGxldCBjb25maWdQYXRoID0gbGV2ZWwgPT09ICdsb2NhbCcgPyBwcm9qZWN0RmlsZVBhdGgoKSA6IGdsb2JhbEZpbGVQYXRoKCk7XG5cbiAgaWYgKCFjb25maWdQYXRoKSB7XG4gICAgaWYgKGxldmVsID09PSAnZ2xvYmFsJykge1xuICAgICAgY29uZmlnUGF0aCA9IGRlZmF1bHRHbG9iYWxGaWxlUGF0aDtcbiAgICAgIC8vIENvbmZpZyBkb2Vzbid0IGV4aXN0LCBmb3JjZSBjcmVhdGUgaXQuXG5cbiAgICAgIGNvbnN0IGdsb2JhbFdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gICAgICBhd2FpdCBnbG9iYWxXb3Jrc3BhY2Uuc2F2ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW251bGwsIG51bGxdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbbmV3IEpTT05GaWxlKGNvbmZpZ1BhdGgpLCBjb25maWdQYXRoXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlV29ya3NwYWNlKGRhdGE6IGpzb24uSnNvbk9iamVjdCwgaXNHbG9iYWw6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc2NoZW1hID0gcmVhZEFuZFBhcnNlSnNvbih3b3Jrc3BhY2VTY2hlbWFQYXRoKTtcblxuICAvLyBXZSBzaG91bGQgZXZlbnR1YWxseSBoYXZlIGEgZGVkaWNhdGVkIGdsb2JhbCBjb25maWcgc2NoZW1hIGFuZCB1c2UgdGhhdCB0byB2YWxpZGF0ZS5cbiAgY29uc3Qgc2NoZW1hVG9WYWxpZGF0ZToganNvbi5zY2hlbWEuSnNvblNjaGVtYSA9IGlzR2xvYmFsXG4gICAgPyB7XG4gICAgICAgICckcmVmJzogJyMvZGVmaW5pdGlvbnMvZ2xvYmFsJyxcbiAgICAgICAgZGVmaW5pdGlvbnM6IHNjaGVtYVsnZGVmaW5pdGlvbnMnXSxcbiAgICAgIH1cbiAgICA6IHNjaGVtYTtcblxuICBjb25zdCB7IGZvcm1hdHMgfSA9IGF3YWl0IGltcG9ydCgnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnKTtcbiAgY29uc3QgcmVnaXN0cnkgPSBuZXcganNvbi5zY2hlbWEuQ29yZVNjaGVtYVJlZ2lzdHJ5KGZvcm1hdHMuc3RhbmRhcmRGb3JtYXRzKTtcbiAgY29uc3QgdmFsaWRhdG9yID0gYXdhaXQgcmVnaXN0cnkuY29tcGlsZShzY2hlbWFUb1ZhbGlkYXRlKTtcbiAgY29uc3QgeyBzdWNjZXNzLCBlcnJvcnMgfSA9IGF3YWl0IHZhbGlkYXRvcihkYXRhKTtcbiAgaWYgKCFzdWNjZXNzKSB7XG4gICAgdGhyb3cgbmV3IGpzb24uc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24oZXJyb3JzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kUHJvamVjdEJ5UGF0aCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UsIGxvY2F0aW9uOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaXNJbnNpZGUgPSAoYmFzZTogc3RyaW5nLCBwb3RlbnRpYWw6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGFic29sdXRlQmFzZSA9IHBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UuYmFzZVBhdGgsIGJhc2UpO1xuICAgIGNvbnN0IGFic29sdXRlUG90ZW50aWFsID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZS5iYXNlUGF0aCwgcG90ZW50aWFsKTtcbiAgICBjb25zdCByZWxhdGl2ZVBvdGVudGlhbCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVCYXNlLCBhYnNvbHV0ZVBvdGVudGlhbCk7XG4gICAgaWYgKCFyZWxhdGl2ZVBvdGVudGlhbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmVQb3RlbnRpYWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcHJvamVjdHMgPSBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cylcbiAgICAubWFwKChbbmFtZSwgcHJvamVjdF0pID0+IFtwcm9qZWN0LnJvb3QsIG5hbWVdIGFzIFtzdHJpbmcsIHN0cmluZ10pXG4gICAgLmZpbHRlcigodHVwbGUpID0+IGlzSW5zaWRlKHR1cGxlWzBdLCBsb2NhdGlvbikpXG4gICAgLy8gU29ydCB0dXBsZXMgYnkgZGVwdGgsIHdpdGggdGhlIGRlZXBlciBvbmVzIGZpcnN0LiBTaW5jZSB0aGUgZmlyc3QgbWVtYmVyIGlzIGEgcGF0aCBhbmRcbiAgICAvLyB3ZSBmaWx0ZXJlZCBhbGwgaW52YWxpZCBwYXRocywgdGhlIGxvbmdlc3Qgd2lsbCBiZSB0aGUgZGVlcGVzdCAoYW5kIGluIGNhc2Ugb2YgZXF1YWxpdHlcbiAgICAvLyB0aGUgc29ydCBpcyBzdGFibGUgYW5kIHRoZSBmaXJzdCBkZWNsYXJlZCBwcm9qZWN0IHdpbGwgd2luKS5cbiAgICAuc29ydCgoYSwgYikgPT4gYlswXS5sZW5ndGggLSBhWzBdLmxlbmd0aCk7XG5cbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHByb2plY3RzLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCBmb3VuZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHNhbWVSb290cyA9IHByb2plY3RzLmZpbHRlcigodikgPT4ge1xuICAgICAgaWYgKCFmb3VuZC5oYXModlswXSkpIHtcbiAgICAgICAgZm91bmQuYWRkKHZbMF0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKHNhbWVSb290cy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBBbWJpZ3VvdXMgbG9jYXRpb24gLSBjYW5ub3QgZGV0ZXJtaW5lIGEgcHJvamVjdFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByb2plY3RzWzBdWzFdO1xufVxuXG5sZXQgZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RCeUN3ZCh3b3Jrc3BhY2U6IEFuZ3VsYXJXb3Jrc3BhY2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHdvcmtzcGFjZS5wcm9qZWN0cy5zaXplID09PSAxKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgb25seSBvbmUgcHJvamVjdCwgcmV0dXJuIHRoYXQgb25lLlxuICAgIHJldHVybiBBcnJheS5mcm9tKHdvcmtzcGFjZS5wcm9qZWN0cy5rZXlzKCkpWzBdO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdCA9IGZpbmRQcm9qZWN0QnlQYXRoKHdvcmtzcGFjZSwgcHJvY2Vzcy5jd2QoKSk7XG4gIGlmIChwcm9qZWN0KSB7XG4gICAgcmV0dXJuIHByb2plY3Q7XG4gIH1cblxuICBjb25zdCBkZWZhdWx0UHJvamVjdCA9IHdvcmtzcGFjZS5leHRlbnNpb25zWydkZWZhdWx0UHJvamVjdCddO1xuICBpZiAoZGVmYXVsdFByb2plY3QgJiYgdHlwZW9mIGRlZmF1bHRQcm9qZWN0ID09PSAnc3RyaW5nJykge1xuICAgIC8vIElmIHRoZXJlIGlzIGEgZGVmYXVsdCBwcm9qZWN0IG5hbWUsIHJldHVybiBpdC5cbiAgICBpZiAoIWRlZmF1bHRQcm9qZWN0RGVwcmVjYXRpb25XYXJuaW5nU2hvd24pIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYERFUFJFQ0FURUQ6IFRoZSAnZGVmYXVsdFByb2plY3QnIHdvcmtzcGFjZSBvcHRpb24gaGFzIGJlZW4gZGVwcmVjYXRlZC4gYCArXG4gICAgICAgICAgYFRoZSBwcm9qZWN0IHRvIHVzZSB3aWxsIGJlIGRldGVybWluZWQgZnJvbSB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS5gLFxuICAgICAgKTtcblxuICAgICAgZGVmYXVsdFByb2plY3REZXByZWNhdGlvbldhcm5pbmdTaG93biA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmF1bHRQcm9qZWN0O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogUHJvbWlzZTxQYWNrYWdlTWFuYWdlciB8IG51bGw+IHtcbiAgY29uc3QgZ2V0UGFja2FnZU1hbmFnZXIgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IFBhY2thZ2VNYW5hZ2VyIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzSnNvbk9iamVjdChzb3VyY2UpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHNvdXJjZVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSBhcyBQYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICBsZXQgcmVzdWx0OiBQYWNrYWdlTWFuYWdlciB8IG51bGwgPSBudWxsO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgaWYgKHByb2plY3QpIHtcbiAgICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgICB9XG5cbiAgICByZXN1bHQgPz89IGdldFBhY2thZ2VNYW5hZ2VyKHdvcmtzcGFjZS5leHRlbnNpb25zWydjbGknXSk7XG4gIH1cblxuICBpZiAoIXJlc3VsdCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFBhY2thZ2VNYW5hZ2VyKGdsb2JhbE9wdGlvbnM/LmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTY2hlbWF0aWNEZWZhdWx0cyhcbiAgY29sbGVjdGlvbjogc3RyaW5nLFxuICBzY2hlbWF0aWM6IHN0cmluZyxcbiAgcHJvamVjdD86IHN0cmluZyB8IG51bGwsXG4pOiBQcm9taXNlPHt9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBtZXJnZU9wdGlvbnMgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyBmcm9tIHRoZSBxdWFsaWZpZWQgbmFtZVxuICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIHNvdXJjZVtgJHtjb2xsZWN0aW9ufToke3NjaGVtYXRpY31gXSk7XG5cbiAgICAgIC8vIE1lcmdlIG9wdGlvbnMgZnJvbSBuZXN0ZWQgY29sbGVjdGlvbiBzY2hlbWF0aWNzXG4gICAgICBjb25zdCBjb2xsZWN0aW9uT3B0aW9ucyA9IHNvdXJjZVtjb2xsZWN0aW9uXTtcbiAgICAgIGlmIChpc0pzb25PYmplY3QoY29sbGVjdGlvbk9wdGlvbnMpKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCBjb2xsZWN0aW9uT3B0aW9uc1tzY2hlbWF0aWNdKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gR2xvYmFsIGxldmVsIHNjaGVtYXRpYyBvcHRpb25zXG4gIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBtZXJnZU9wdGlvbnMoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snc2NoZW1hdGljcyddKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAvLyBXb3Jrc3BhY2UgbGV2ZWwgc2NoZW1hdGljIG9wdGlvbnNcbiAgICBtZXJnZU9wdGlvbnMod29ya3NwYWNlLmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG5cbiAgICBwcm9qZWN0ID0gcHJvamVjdCB8fCBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgLy8gUHJvamVjdCBsZXZlbCBzY2hlbWF0aWMgb3B0aW9uc1xuICAgICAgbWVyZ2VPcHRpb25zKHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdCk/LmV4dGVuc2lvbnNbJ3NjaGVtYXRpY3MnXSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzV2FybmluZ0VuYWJsZWQod2FybmluZzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGdldFdhcm5pbmcgPSAoc291cmNlOiBqc29uLkpzb25WYWx1ZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpc0pzb25PYmplY3Qoc291cmNlKSkge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSBzb3VyY2VbJ3dhcm5pbmdzJ107XG4gICAgICBpZiAoaXNKc29uT2JqZWN0KHdhcm5pbmdzKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdhcm5pbmdzW3dhcm5pbmddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdib29sZWFuJykge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBsZXQgcmVzdWx0OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSgnbG9jYWwnKTtcbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCkge1xuICAgICAgcmVzdWx0ID0gZ2V0V2FybmluZyh3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3QpPy5leHRlbnNpb25zWydjbGknXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ID8/IGdldFdhcm5pbmcod29ya3NwYWNlLmV4dGVuc2lvbnNbJ2NsaSddKTtcbiAgfVxuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGdsb2JhbE9wdGlvbnMgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICAgIHJlc3VsdCA9IGdldFdhcm5pbmcoZ2xvYmFsT3B0aW9ucz8uZXh0ZW5zaW9uc1snY2xpJ10pO1xuICB9XG5cbiAgLy8gQWxsIHdhcm5pbmdzIGFyZSBlbmFibGVkIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHJlc3VsdCA/PyB0cnVlO1xufVxuIl19