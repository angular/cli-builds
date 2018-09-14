/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
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
    private _host;
    protected _architect: Architect;
    protected _workspace: experimental.workspace.Workspace;
    protected _logger: import("packages/angular_devkit/core/src/logger/logger").Logger;
    protected _registry: json.schema.SchemaRegistry;
    protected multiTarget: boolean;
    target: string | undefined;
    initialize(options: ArchitectCommandOptions & Arguments): Promise<void>;
    run(options: ArchitectCommandOptions & Arguments): Promise<number>;
    protected runArchitectTarget(options: ArchitectCommandOptions & Arguments): Promise<number>;
    private getProjectNamesByTarget;
    private _loadWorkspaceAndArchitect;
    private _makeTargetSpecifier;
}
