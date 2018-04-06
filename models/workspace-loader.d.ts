import { experimental, virtualFs } from '@angular-devkit/core';
import { Observable } from 'rxjs';
export declare class WorkspaceLoader {
    private _host;
    private _workspaceCacheMap;
    private _configFileNames;
    constructor(_host: virtualFs.Host);
    loadGlobalWorkspace(): Observable<experimental.workspace.Workspace | null>;
    loadWorkspace(): Observable<experimental.workspace.Workspace | null>;
    private _getProjectWorkspaceFilePath(projectPath?);
    private _getGlobalWorkspaceFilePath();
    private _loadWorkspaceFromPath(workspacePath);
}
