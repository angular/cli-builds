"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const of_1 = require("rxjs/observable/of");
const operators_1 = require("rxjs/operators");
const fs = require("fs");
const os_1 = require("os");
const find_up_1 = require("../utilities/find-up");
// TODO: error out instead of returning null when workspace cannot be found.
class WorkspaceLoader {
    constructor(_host) {
        this._host = _host;
        this._workspaceCacheMap = new Map();
        // TODO: add remaining fallbacks.
        this._configFileNames = [
            core_1.normalize('.angular.json'),
            core_1.normalize('angular.json'),
        ];
    }
    loadGlobalWorkspace() {
        return this._getGlobalWorkspaceFilePath().pipe(operators_1.concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath)));
    }
    loadWorkspace() {
        return this._getProjectWorkspaceFilePath().pipe(operators_1.concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath)));
    }
    // TODO: do this with the host instead of fs.
    _getProjectWorkspaceFilePath(projectPath) {
        // Find the workspace file, either where specified, in the Angular CLI project
        // (if it's in node_modules) or from the current process.
        const workspaceFilePath = (projectPath && find_up_1.findUp(this._configFileNames, projectPath))
            || find_up_1.findUp(this._configFileNames, process.cwd())
            || find_up_1.findUp(this._configFileNames, __dirname);
        if (workspaceFilePath) {
            return of_1.of(core_1.normalize(workspaceFilePath));
        }
        else {
            return of_1.of(null);
        }
    }
    // TODO: do this with the host instead of fs.
    _getGlobalWorkspaceFilePath() {
        for (const fileName of this._configFileNames) {
            const workspaceFilePath = core_1.join(core_1.normalize(os_1.homedir()), fileName);
            if (fs.existsSync(workspaceFilePath)) {
                return of_1.of(core_1.normalize(workspaceFilePath));
            }
        }
        return of_1.of(null);
    }
    _loadWorkspaceFromPath(workspacePath) {
        if (!workspacePath) {
            return of_1.of(null);
        }
        if (this._workspaceCacheMap.has(workspacePath)) {
            return of_1.of(this._workspaceCacheMap.get(workspacePath));
        }
        const workspaceRoot = core_1.dirname(workspacePath);
        const workspaceFileName = core_1.basename(workspacePath);
        const workspace = new core_1.experimental.workspace.Workspace(workspaceRoot, this._host);
        return workspace.loadWorkspaceFromHost(workspaceFileName).pipe(operators_1.tap(workspace => this._workspaceCacheMap.set(workspacePath, workspace)));
    }
}
exports.WorkspaceLoader = WorkspaceLoader;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/workspace-loader.js.map