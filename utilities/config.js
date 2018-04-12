"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os = require("os");
const path = require("path");
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const find_up_1 = require("./find-up");
function getSchemaLocation() {
    const packagePath = require.resolve('@angular-devkit/core/package.json');
    return path.join(path.dirname(packagePath), 'src/workspace/workspace-schema.json');
}
exports.workspaceSchemaPath = getSchemaLocation();
const configNames = ['angular.json', '.angular.json'];
function projectFilePath(projectPath) {
    // Find the configuration, either where specified, in the Angular CLI project
    // (if it's in node_modules) or from the current process.
    return (projectPath && find_up_1.findUp(configNames, projectPath))
        || find_up_1.findUp(configNames, process.cwd())
        || find_up_1.findUp(configNames, __dirname);
}
function globalFilePath() {
    const home = os.homedir();
    if (!home) {
        return null;
    }
    for (const name of configNames) {
        const p = path.join(home, name);
        if (fs_1.existsSync(p)) {
            return p;
        }
    }
    return null;
}
const cachedWorkspaces = new Map();
function getWorkspace(level = 'local') {
    const cached = cachedWorkspaces.get(level);
    if (cached != undefined) {
        return cached;
    }
    let configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        if (level === 'global') {
            configPath = createGlobalSettings();
        }
        else {
            cachedWorkspaces.set(level, null);
            return null;
        }
    }
    const root = core_1.normalize(path.dirname(configPath));
    const file = core_1.normalize(path.basename(configPath));
    const workspace = new core_1.experimental.workspace.Workspace(root, new node_1.NodeJsSyncHost());
    workspace.loadWorkspaceFromHost(file).subscribe();
    cachedWorkspaces.set(level, workspace);
    return workspace;
}
exports.getWorkspace = getWorkspace;
function createGlobalSettings() {
    const home = os.homedir();
    if (!home) {
        throw new Error('No home directory found.');
    }
    const globalPath = path.join(home, configNames[1]);
    fs_1.writeFileSync(globalPath, JSON.stringify({ version: 1 }));
    return globalPath;
}
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
    let content;
    new node_1.NodeJsSyncHost().read(core_1.normalize(configPath))
        .subscribe(data => content = core_1.virtualFs.fileBufferToString(data));
    const ast = core_1.parseJsonAst(content, core_1.JsonParseMode.Loose);
    if (ast.kind != 'object') {
        throw new Error('Invalid JSON');
    }
    return [ast, configPath];
}
exports.getWorkspaceRaw = getWorkspaceRaw;
function validateWorkspace(json) {
    const workspace = new core_1.experimental.workspace.Workspace(core_1.normalize('.'), new node_1.NodeJsSyncHost());
    let error;
    workspace.loadWorkspaceFromJson(json).subscribe({
        error: e => error = e,
    });
    if (error) {
        throw error;
    }
    return true;
}
exports.validateWorkspace = validateWorkspace;
function getProjectByCwd(workspace) {
    if (!workspace) {
        workspace = getWorkspace('local');
        if (!workspace) {
            return null;
        }
    }
    const projectNames = workspace.listProjectNames();
    if (projectNames.length === 1) {
        return projectNames[0];
    }
    const cwd = core_1.normalize(process.cwd());
    const isInside = (base, potential) => {
        const absoluteBase = core_1.resolve(workspace.root, base);
        const absolutePotential = core_1.resolve(workspace.root, potential);
        const relativePotential = core_1.relative(absoluteBase, absolutePotential);
        if (!relativePotential.startsWith('..') && !core_1.isAbsolute(relativePotential)) {
            return true;
        }
        return false;
    };
    const projects = workspace.listProjectNames()
        .map(name => [workspace.getProject(name).root, name])
        .sort((a, b) => isInside(a[0], b[0]) ? 1 : 0);
    for (const project of projects) {
        if (isInside(project[0], cwd)) {
            return project[1];
        }
    }
    return null;
}
exports.getProjectByCwd = getProjectByCwd;
function getPackageManager() {
    let workspace = getWorkspace();
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project && workspace.getProjectCli(project)) {
            const value = workspace.getProjectCli(project)['packageManager'];
            if (typeof value == 'string') {
                return value;
            }
        }
        else if (workspace.getCli()) {
            const value = workspace.getCli()['packageManager'];
            if (typeof value == 'string') {
                return value;
            }
        }
    }
    workspace = getWorkspace('global');
    if (workspace && workspace.getCli()) {
        const value = workspace.getCli()['packageManager'];
        if (typeof value == 'string') {
            return value;
        }
    }
    return 'npm';
}
exports.getPackageManager = getPackageManager;
function getDefaultSchematicCollection() {
    let workspace = getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project && workspace.getProjectCli(project)) {
            const value = workspace.getProjectCli(project)['defaultCollection'];
            if (typeof value == 'string') {
                return value;
            }
        }
        if (workspace.getCli()) {
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value == 'string') {
                return value;
            }
        }
    }
    workspace = getWorkspace('global');
    if (workspace && workspace.getCli()) {
        const value = workspace.getCli()['defaultCollection'];
        if (typeof value == 'string') {
            return value;
        }
    }
    return '@schematics/angular';
}
exports.getDefaultSchematicCollection = getDefaultSchematicCollection;
function getSchematicDefaults(collection, schematic, project) {
    let result = {};
    const fullName = `${collection}:${schematic}`;
    let workspace = getWorkspace('global');
    if (workspace && workspace.getSchematics()) {
        const schematicObject = workspace.getSchematics()[fullName];
        if (schematicObject) {
            result = Object.assign({}, result, schematicObject);
        }
        const collectionObject = workspace.getSchematics()[collection];
        if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
            result = Object.assign({}, result, collectionObject[schematic]);
        }
    }
    workspace = getWorkspace('local');
    if (workspace) {
        if (workspace.getSchematics()) {
            const schematicObject = workspace.getSchematics()[fullName];
            if (schematicObject) {
                result = Object.assign({}, result, schematicObject);
            }
            const collectionObject = workspace.getSchematics()[collection];
            if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
                result = Object.assign({}, result, collectionObject[schematic]);
            }
        }
        project = project || getProjectByCwd(workspace);
        if (project && workspace.getProjectSchematics(project)) {
            const schematicObject = workspace.getProjectSchematics(project)[fullName];
            if (schematicObject) {
                result = Object.assign({}, result, schematicObject);
            }
            const collectionObject = workspace.getProjectSchematics(project)[collection];
            if (typeof collectionObject == 'object' && !Array.isArray(collectionObject)) {
                result = Object.assign({}, result, collectionObject[schematic]);
            }
        }
    }
    return result;
}
exports.getSchematicDefaults = getSchematicDefaults;
function isWarningEnabled(warning) {
    let workspace = getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project && workspace.getProjectCli(project)) {
            const warnings = workspace.getProjectCli(project)['warnings'];
            if (typeof warnings == 'object' && !Array.isArray(warnings)) {
                const value = warnings[warning];
                if (typeof value == 'boolean') {
                    return value;
                }
            }
        }
        else if (workspace.getCli()) {
            const warnings = workspace.getCli()['warnings'];
            if (typeof warnings == 'object' && !Array.isArray(warnings)) {
                const value = warnings[warning];
                if (typeof value == 'boolean') {
                    return value;
                }
            }
        }
    }
    workspace = getWorkspace('global');
    if (workspace && workspace.getCli()) {
        const warnings = workspace.getCli()['warnings'];
        if (typeof warnings == 'object' && !Array.isArray(warnings)) {
            const value = warnings[warning];
            if (typeof value == 'boolean') {
                return value;
            }
        }
    }
    return true;
}
exports.isWarningEnabled = isWarningEnabled;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/config.js.map