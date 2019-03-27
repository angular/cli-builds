/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { index2 } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { experimental, json } from '@angular-devkit/core';
import { BaseCommandOptions, Command } from './command';
import { Arguments } from './interface';
export interface ArchitectCommandOptions extends BaseCommandOptions {
    project?: string;
    configuration?: string;
    prod?: boolean;
    target?: string;
}
export declare abstract class ArchitectCommand<T extends ArchitectCommandOptions = ArchitectCommandOptions> extends Command<ArchitectCommandOptions> {
    protected _architect: index2.Architect;
    protected _architectHost: WorkspaceNodeModulesArchitectHost;
    protected _workspace: experimental.workspace.Workspace;
    protected _registry: json.schema.SchemaRegistry;
    protected multiTarget: boolean;
    target: string | undefined;
    initialize(options: ArchitectCommandOptions & Arguments): Promise<void>;
    run(options: ArchitectCommandOptions & Arguments): Promise<number>;
    protected runBepTarget<T>(command: string, configuration: index2.Target, overrides: json.JsonObject, buildEventLog: string): Promise<number>;
    protected runSingleTarget(target: index2.Target, targetOptions: string[], commandOptions: ArchitectCommandOptions & Arguments): Promise<number>;
    protected runArchitectTarget(options: ArchitectCommandOptions & Arguments): Promise<number>;
    private getProjectNamesByTarget;
    private _makeTargetSpecifier;
}
