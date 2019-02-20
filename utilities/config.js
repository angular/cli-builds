"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const fs_1 = require("fs");
const os = require("os");
const path = require("path");
const find_up_1 = require("./find-up");
function getSchemaLocation() {
    return path.join(__dirname, '../lib/config/schema.json');
}
exports.workspaceSchemaPath = getSchemaLocation();
const configNames = ['angular.json', '.angular.json'];
const globalFileName = '.angular-config.json';
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
    const p = path.join(home, globalFileName);
    if (fs_1.existsSync(p)) {
        return p;
    }
    return null;
}
const cachedWorkspaces = new Map();
function getWorkspace(level = 'local') {
    const cached = cachedWorkspaces.get(level);
    if (cached != undefined) {
        return cached;
    }
    const configPath = level === 'local' ? projectFilePath() : globalFilePath();
    if (!configPath) {
        cachedWorkspaces.set(level, null);
        return null;
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
    const globalPath = path.join(home, globalFileName);
    fs_1.writeFileSync(globalPath, JSON.stringify({ version: 1 }));
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
    let content = '';
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
    try {
        return workspace.getProjectByPath(core_1.normalize(process.cwd()));
    }
    catch (e) {
        if (e instanceof core_1.experimental.workspace.AmbiguousProjectPathException) {
            return workspace.getDefaultProjectName();
        }
        throw e;
    }
}
exports.getProjectByCwd = getProjectByCwd;
function getConfiguredPackageManager() {
    let workspace = getWorkspace('local');
    if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project && workspace.getProjectCli(project)) {
            const value = workspace.getProjectCli(project)['packageManager'];
            if (typeof value == 'string') {
                return value;
            }
        }
        if (workspace.getCli()) {
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
    // Only check legacy if updated workspace is not found.
    if (!workspace) {
        const legacyPackageManager = getLegacyPackageManager();
        if (legacyPackageManager !== null) {
            return legacyPackageManager;
        }
    }
    return null;
}
exports.getConfiguredPackageManager = getConfiguredPackageManager;
function migrateLegacyGlobalConfig() {
    const homeDir = os.homedir();
    if (homeDir) {
        const legacyGlobalConfigPath = path.join(homeDir, '.angular-cli.json');
        if (fs_1.existsSync(legacyGlobalConfigPath)) {
            const content = fs_1.readFileSync(legacyGlobalConfigPath, 'utf-8');
            const legacy = core_1.parseJson(content, core_1.JsonParseMode.Loose);
            if (!legacy || typeof legacy != 'object' || Array.isArray(legacy)) {
                return false;
            }
            const cli = {};
            if (legacy.packageManager && typeof legacy.packageManager == 'string'
                && legacy.packageManager !== 'default') {
                cli['packageManager'] = legacy.packageManager;
            }
            if (legacy.defaults && typeof legacy.defaults == 'object' && !Array.isArray(legacy.defaults)
                && legacy.defaults.schematics && typeof legacy.defaults.schematics == 'object'
                && !Array.isArray(legacy.defaults.schematics)
                && typeof legacy.defaults.schematics.collection == 'string') {
                cli['defaultCollection'] = legacy.defaults.schematics.collection;
            }
            if (legacy.warnings && typeof legacy.warnings == 'object'
                && !Array.isArray(legacy.warnings)) {
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
                fs_1.writeFileSync(globalPath, JSON.stringify({ version: 1, cli }, null, 2));
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
        if (fs_1.existsSync(legacyGlobalConfigPath)) {
            const content = fs_1.readFileSync(legacyGlobalConfigPath, 'utf-8');
            const legacy = core_1.parseJson(content, core_1.JsonParseMode.Loose);
            if (!legacy || typeof legacy != 'object' || Array.isArray(legacy)) {
                return null;
            }
            if (legacy.packageManager && typeof legacy.packageManager === 'string'
                && legacy.packageManager !== 'default') {
                return legacy.packageManager;
            }
        }
    }
    return null;
}
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
        if (workspace.getCli()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS91dGlsaXRpZXMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBUzhCO0FBQzlCLG9EQUEyRDtBQUMzRCwyQkFBNkQ7QUFDN0QseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3Qix1Q0FBbUM7QUFFbkMsU0FBUyxpQkFBaUI7SUFDeEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFFWSxRQUFBLG1CQUFtQixHQUFHLGlCQUFpQixFQUFFLENBQUM7QUFFdkQsTUFBTSxXQUFXLEdBQUcsQ0FBRSxjQUFjLEVBQUUsZUFBZSxDQUFFLENBQUM7QUFDeEQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUM7QUFFOUMsU0FBUyxlQUFlLENBQUMsV0FBb0I7SUFDM0MsNkVBQTZFO0lBQzdFLHlEQUF5RDtJQUN6RCxPQUFPLENBQUMsV0FBVyxJQUFJLGdCQUFNLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1dBQ2pELGdCQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztXQUNsQyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ3JCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzFDLElBQUksZUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pCLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFRCxPQUFP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TSxFQUFFLEVBQUU7UUFDbkMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksT0FBTyxRQUFRLElBQUksUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMzRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsSUFBSSxPQUFPLEtBQUssSUFBSSxTQUFTLEVBQUU7Z0JBQzdCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7U0FDRjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBckNELDRDQXFDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgSnNvbkFzdE9iamVjdCxcbiAgSnNvbk9iamVjdCxcbiAgSnNvblBhcnNlTW9kZSxcbiAgZXhwZXJpbWVudGFsLFxuICBub3JtYWxpemUsXG4gIHBhcnNlSnNvbixcbiAgcGFyc2VKc29uQXN0LFxuICB2aXJ0dWFsRnMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi9maW5kLXVwJztcblxuZnVuY3Rpb24gZ2V0U2NoZW1hTG9jYXRpb24oKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9saWIvY29uZmlnL3NjaGVtYS5qc29uJyk7XG59XG5cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTY2hlbWFQYXRoID0gZ2V0U2NoZW1hTG9jYXRpb24oKTtcblxuY29uc3QgY29uZmlnTmFtZXMgPSBbICdhbmd1bGFyLmpzb24nLCAnLmFuZ3VsYXIuanNvbicgXTtcbmNvbnN0IGdsb2JhbEZpbGVOYW1lID0gJy5hbmd1bGFyLWNvbmZpZy5qc29uJztcblxuZnVuY3Rpb24gcHJvamVjdEZpbGVQYXRoKHByb2plY3RQYXRoPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIC8vIEZpbmQgdGhlIGNvbmZpZ3VyYXRpb24sIGVpdGhlciB3aGVyZSBzcGVjaWZpZWQsIGluIHRoZSBBbmd1bGFyIENMSSBwcm9qZWN0XG4gIC8vIChpZiBpdCdzIGluIG5vZGVfbW9kdWxlcykgb3IgZnJvbSB0aGUgY3VycmVudCBwcm9jZXNzLlxuICByZXR1cm4gKHByb2plY3RQYXRoICYmIGZpbmRVcChjb25maWdOYW1lcywgcHJvamVjdFBhdGgpKVxuICAgICAgfHwgZmluZFVwKGNvbmZpZ05hbWVzLCBwcm9jZXNzLmN3ZCgpKVxuICAgICAgfHwgZmluZFVwKGNvbmZpZ05hbWVzLCBfX2Rpcm5hbWUpO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxGaWxlUGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgaG9tZSA9IG9zLmhvbWVkaXIoKTtcbiAgaWYgKCFob21lKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBwID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgaWYgKGV4aXN0c1N5bmMocCkpIHtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jb25zdCBjYWNoZWRXb3Jrc3BhY2VzID0gbmV3IE1hcDxzdHJpbmcsIGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlIHwgbnVsbD4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZShcbiAgbGV2ZWw6ICdsb2NhbCcgfCAnZ2xvYmFsJyA9ICdsb2NhbCcsXG4pOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSB8IG51bGwge1xuICBjb25zdCBjYWNoZWQgPSBjYWNoZWRXb3Jrc3BhY2VzLmdldChsZXZlbCk7XG4gIGlmIChjYWNoZWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBsZXZlbCA9PT0gJ2xvY2FsJyA/IHByb2plY3RGaWxlUGF0aCgpIDogZ2xvYmFsRmlsZVBhdGgoKTtcblxuICBpZiAoIWNvbmZpZ1BhdGgpIHtcbiAgICBjYWNoZWRXb3Jrc3BhY2VzLnNldChsZXZlbCwgbnVsbCk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHJvb3QgPSBub3JtYWxpemUocGF0aC5kaXJuYW1lKGNvbmZpZ1BhdGgpKTtcbiAgY29uc3QgZmlsZSA9IG5vcm1hbGl6ZShwYXRoLmJhc2VuYW1lKGNvbmZpZ1BhdGgpKTtcbiAgY29uc3Qgd29ya3NwYWNlID0gbmV3IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKFxuICAgIHJvb3QsXG4gICAgbmV3IE5vZGVKc1N5bmNIb3N0KCksXG4gICk7XG5cbiAgd29ya3NwYWNlLmxvYWRXb3Jrc3BhY2VGcm9tSG9zdChmaWxlKS5zdWJzY3JpYmUoKTtcbiAgY2FjaGVkV29ya3NwYWNlcy5zZXQobGV2ZWwsIHdvcmtzcGFjZSk7XG5cbiAgcmV0dXJuIHdvcmtzcGFjZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUdsb2JhbFNldHRpbmdzKCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvbWUgPSBvcy5ob21lZGlyKCk7XG4gIGlmICghaG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gaG9tZSBkaXJlY3RvcnkgZm91bmQuJyk7XG4gIH1cblxuICBjb25zdCBnbG9iYWxQYXRoID0gcGF0aC5qb2luKGhvbWUsIGdsb2JhbEZpbGVOYW1lKTtcbiAgd3JpdGVGaWxlU3luYyhnbG9iYWxQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDEgfSkpO1xuXG4gIHJldHVybiBnbG9iYWxQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUmF3KFxuICBsZXZlbDogJ2xvY2FsJyB8ICdnbG9iYWwnID0gJ2xvY2FsJyxcbik6IFtKc29uQXN0T2JqZWN0IHwgbnVsbCwgc3RyaW5nIHwgbnVsbF0ge1xuICBsZXQgY29uZmlnUGF0aCA9IGxldmVsID09PSAnbG9jYWwnID8gcHJvamVjdEZpbGVQYXRoKCkgOiBnbG9iYWxGaWxlUGF0aCgpO1xuXG4gIGlmICghY29uZmlnUGF0aCkge1xuICAgIGlmIChsZXZlbCA9PT0gJ2dsb2JhbCcpIHtcbiAgICAgIGNvbmZpZ1BhdGggPSBjcmVhdGVHbG9iYWxTZXR0aW5ncygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW251bGwsIG51bGxdO1xuICAgIH1cbiAgfVxuXG4gIGxldCBjb250ZW50ID0gJyc7XG4gIG5ldyBOb2RlSnNTeW5jSG9zdCgpLnJlYWQobm9ybWFsaXplKGNvbmZpZ1BhdGgpKVxuICAgIC5zdWJzY3JpYmUoZGF0YSA9PiBjb250ZW50ID0gdmlydHVhbEZzLmZpbGVCdWZmZXJUb1N0cmluZyhkYXRhKSk7XG5cbiAgY29uc3QgYXN0ID0gcGFyc2VKc29uQXN0KGNvbnRlbnQsIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuXG4gIGlmIChhc3Qua2luZCAhPSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBKU09OJyk7XG4gIH1cblxuICByZXR1cm4gW2FzdCwgY29uZmlnUGF0aF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVdvcmtzcGFjZShqc29uOiBKc29uT2JqZWN0KSB7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IG5ldyBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZShcbiAgICBub3JtYWxpemUoJy4nKSxcbiAgICBuZXcgTm9kZUpzU3luY0hvc3QoKSxcbiAgKTtcblxuICBsZXQgZXJyb3I7XG4gIHdvcmtzcGFjZS5sb2FkV29ya3NwYWNlRnJvbUpzb24oanNvbikuc3Vic2NyaWJlKHtcbiAgICBlcnJvcjogZSA9PiBlcnJvciA9IGUsXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiB3b3Jrc3BhY2UuZ2V0UHJvamVjdEJ5UGF0aChub3JtYWxpemUocHJvY2Vzcy5jd2QoKSkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBleHBlcmltZW50YWwud29ya3NwYWNlLkFtYmlndW91c1Byb2plY3RQYXRoRXhjZXB0aW9uKSB7XG4gICAgICByZXR1cm4gd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWd1cmVkUGFja2FnZU1hbmFnZXIoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCAmJiB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSkge1xuICAgICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAod29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsncGFja2FnZU1hbmFnZXInXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGlmICh3b3Jrc3BhY2UgJiYgd29ya3NwYWNlLmdldENsaSgpKSB7XG4gICAgY29uc3QgdmFsdWUgPSB3b3Jrc3BhY2UuZ2V0Q2xpKClbJ3BhY2thZ2VNYW5hZ2VyJ107XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE9ubHkgY2hlY2sgbGVnYWN5IGlmIHVwZGF0ZWQgd29ya3NwYWNlIGlzIG5vdCBmb3VuZC5cbiAgaWYgKCF3b3Jrc3BhY2UpIHtcbiAgICBjb25zdCBsZWdhY3lQYWNrYWdlTWFuYWdlciA9IGdldExlZ2FjeVBhY2thZ2VNYW5hZ2VyKCk7XG4gICAgaWYgKGxlZ2FjeVBhY2thZ2VNYW5hZ2VyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbGVnYWN5UGFja2FnZU1hbmFnZXI7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnKCk6IGJvb2xlYW4ge1xuICBjb25zdCBob21lRGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAoaG9tZURpcikge1xuICAgIGNvbnN0IGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGggPSBwYXRoLmpvaW4oaG9tZURpciwgJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBjb25zdCBsZWdhY3kgPSBwYXJzZUpzb24oY29udGVudCwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG4gICAgICBpZiAoIWxlZ2FjeSB8fCB0eXBlb2YgbGVnYWN5ICE9ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkobGVnYWN5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNsaTogSnNvbk9iamVjdCA9IHt9O1xuXG4gICAgICBpZiAobGVnYWN5LnBhY2thZ2VNYW5hZ2VyICYmIHR5cGVvZiBsZWdhY3kucGFja2FnZU1hbmFnZXIgPT0gJ3N0cmluZydcbiAgICAgICAgICAmJiBsZWdhY3kucGFja2FnZU1hbmFnZXIgIT09ICdkZWZhdWx0Jykge1xuICAgICAgICBjbGlbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBsZWdhY3kucGFja2FnZU1hbmFnZXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChsZWdhY3kuZGVmYXVsdHMgJiYgdHlwZW9mIGxlZ2FjeS5kZWZhdWx0cyA9PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShsZWdhY3kuZGVmYXVsdHMpXG4gICAgICAgICAgJiYgbGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgdHlwZW9mIGxlZ2FjeS5kZWZhdWx0cy5zY2hlbWF0aWNzID09ICdvYmplY3QnXG4gICAgICAgICAgJiYgIUFycmF5LmlzQXJyYXkobGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MpXG4gICAgICAgICAgJiYgdHlwZW9mIGxlZ2FjeS5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb24gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgY2xpWydkZWZhdWx0Q29sbGVjdGlvbiddID0gbGVnYWN5LmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgICAgIH1cblxuICAgICAgaWYgKGxlZ2FjeS53YXJuaW5ncyAmJiB0eXBlb2YgbGVnYWN5Lndhcm5pbmdzID09ICdvYmplY3QnXG4gICAgICAgICAgJiYgIUFycmF5LmlzQXJyYXkobGVnYWN5Lndhcm5pbmdzKSkge1xuXG4gICAgICAgIGNvbnN0IHdhcm5pbmdzOiBKc29uT2JqZWN0ID0ge307XG4gICAgICAgIGlmICh0eXBlb2YgbGVnYWN5Lndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB3YXJuaW5nc1sndmVyc2lvbk1pc21hdGNoJ10gPSBsZWdhY3kud2FybmluZ3MudmVyc2lvbk1pc21hdGNoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHdhcm5pbmdzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY2xpWyd3YXJuaW5ncyddID0gd2FybmluZ3M7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNsaSkubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBnbG9iYWxQYXRoID0gcGF0aC5qb2luKGhvbWVEaXIsIGdsb2JhbEZpbGVOYW1lKTtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhnbG9iYWxQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IDEsIGNsaSB9LCBudWxsLCAyKSk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBGYWxsYmFjaywgY2hlY2sgZm9yIHBhY2thZ2VNYW5hZ2VyIGluIGNvbmZpZyBmaWxlIGluIHYxLiogZ2xvYmFsIGNvbmZpZy5cbmZ1bmN0aW9uIGdldExlZ2FjeVBhY2thZ2VNYW5hZ2VyKCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBob21lRGlyID0gb3MuaG9tZWRpcigpO1xuICBpZiAoaG9tZURpcikge1xuICAgIGNvbnN0IGxlZ2FjeUdsb2JhbENvbmZpZ1BhdGggPSBwYXRoLmpvaW4oaG9tZURpciwgJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gICAgaWYgKGV4aXN0c1N5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMobGVnYWN5R2xvYmFsQ29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgIGNvbnN0IGxlZ2FjeSA9IHBhcnNlSnNvbihjb250ZW50LCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcbiAgICAgIGlmICghbGVnYWN5IHx8IHR5cGVvZiBsZWdhY3kgIT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShsZWdhY3kpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAobGVnYWN5LnBhY2thZ2VNYW5hZ2VyICYmIHR5cGVvZiBsZWdhY3kucGFja2FnZU1hbmFnZXIgPT09ICdzdHJpbmcnXG4gICAgICAgICAgJiYgbGVnYWN5LnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgcmV0dXJuIGxlZ2FjeS5wYWNrYWdlTWFuYWdlcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNjaGVtYXRpY0RlZmF1bHRzKFxuICBjb2xsZWN0aW9uOiBzdHJpbmcsXG4gIHNjaGVtYXRpYzogc3RyaW5nLFxuICBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCxcbik6IHt9IHtcbiAgbGV0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBmdWxsTmFtZSA9IGAke2NvbGxlY3Rpb259OiR7c2NoZW1hdGljfWA7XG5cbiAgbGV0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZSgnZ2xvYmFsJyk7XG4gIGlmICh3b3Jrc3BhY2UgJiYgd29ya3NwYWNlLmdldFNjaGVtYXRpY3MoKSkge1xuICAgIGNvbnN0IHNjaGVtYXRpY09iamVjdCA9IHdvcmtzcGFjZS5nZXRTY2hlbWF0aWNzKClbZnVsbE5hbWVdO1xuICAgIGlmIChzY2hlbWF0aWNPYmplY3QpIHtcbiAgICAgIHJlc3VsdCA9IHsgLi4ucmVzdWx0LCAuLi4oc2NoZW1hdGljT2JqZWN0IGFzIHt9KSB9O1xuICAgIH1cbiAgICBjb25zdCBjb2xsZWN0aW9uT2JqZWN0ID0gd29ya3NwYWNlLmdldFNjaGVtYXRpY3MoKVtjb2xsZWN0aW9uXTtcbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb25PYmplY3QgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoY29sbGVjdGlvbk9iamVjdCkpIHtcbiAgICAgIHJlc3VsdCA9IHsgLi4ucmVzdWx0LCAuLi4oY29sbGVjdGlvbk9iamVjdFtzY2hlbWF0aWNdIGFzIHt9KSB9O1xuICAgIH1cblxuICB9XG5cbiAgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKCdsb2NhbCcpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBpZiAod29ya3NwYWNlLmdldFNjaGVtYXRpY3MoKSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljT2JqZWN0ID0gd29ya3NwYWNlLmdldFNjaGVtYXRpY3MoKVtmdWxsTmFtZV07XG4gICAgICBpZiAoc2NoZW1hdGljT2JqZWN0KSB7XG4gICAgICAgIHJlc3VsdCA9IHsgLi4ucmVzdWx0LCAuLi4oc2NoZW1hdGljT2JqZWN0IGFzIHt9KSB9O1xuICAgICAgfVxuICAgICAgY29uc3QgY29sbGVjdGlvbk9iamVjdCA9IHdvcmtzcGFjZS5nZXRTY2hlbWF0aWNzKClbY29sbGVjdGlvbl07XG4gICAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb25PYmplY3QgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoY29sbGVjdGlvbk9iamVjdCkpIHtcbiAgICAgICAgcmVzdWx0ID0geyAuLi5yZXN1bHQsIC4uLihjb2xsZWN0aW9uT2JqZWN0W3NjaGVtYXRpY10gYXMge30pIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcHJvamVjdCA9IHByb2plY3QgfHwgZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgaWYgKHByb2plY3QgJiYgd29ya3NwYWNlLmdldFByb2plY3RTY2hlbWF0aWNzKHByb2plY3QpKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWNPYmplY3QgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdFNjaGVtYXRpY3MocHJvamVjdClbZnVsbE5hbWVdO1xuICAgICAgaWYgKHNjaGVtYXRpY09iamVjdCkge1xuICAgICAgICByZXN1bHQgPSB7IC4uLnJlc3VsdCwgLi4uKHNjaGVtYXRpY09iamVjdCBhcyB7fSkgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbGxlY3Rpb25PYmplY3QgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdFNjaGVtYXRpY3MocHJvamVjdClbY29sbGVjdGlvbl07XG4gICAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb25PYmplY3QgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoY29sbGVjdGlvbk9iamVjdCkpIHtcbiAgICAgICAgcmVzdWx0ID0geyAuLi5yZXN1bHQsIC4uLihjb2xsZWN0aW9uT2JqZWN0W3NjaGVtYXRpY10gYXMge30pIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2FybmluZ0VuYWJsZWQod2FybmluZzogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGxldCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0QnlDd2Qod29ya3NwYWNlKTtcbiAgICBpZiAocHJvamVjdCAmJiB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KSkge1xuICAgICAgY29uc3Qgd2FybmluZ3MgPSB3b3Jrc3BhY2UuZ2V0UHJvamVjdENsaShwcm9qZWN0KVsnd2FybmluZ3MnXTtcbiAgICAgIGlmICh0eXBlb2Ygd2FybmluZ3MgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkod2FybmluZ3MpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd2FybmluZ3Nbd2FybmluZ107XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh3b3Jrc3BhY2UuZ2V0Q2xpKCkpIHtcbiAgICAgIGNvbnN0IHdhcm5pbmdzID0gd29ya3NwYWNlLmdldENsaSgpWyd3YXJuaW5ncyddO1xuICAgICAgaWYgKHR5cGVvZiB3YXJuaW5ncyA9PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh3YXJuaW5ncykpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB3YXJuaW5nc1t3YXJuaW5nXTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoJ2dsb2JhbCcpO1xuICBpZiAod29ya3NwYWNlICYmIHdvcmtzcGFjZS5nZXRDbGkoKSkge1xuICAgIGNvbnN0IHdhcm5pbmdzID0gd29ya3NwYWNlLmdldENsaSgpWyd3YXJuaW5ncyddO1xuICAgIGlmICh0eXBlb2Ygd2FybmluZ3MgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkod2FybmluZ3MpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHdhcm5pbmdzW3dhcm5pbmddO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuIl19