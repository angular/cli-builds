/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicCommand } from '../../../models/schematic-command';
import { Options } from '../../command-builder/command-module';
import { AddCommandArgs } from './cli';
declare type AddCommandOptions = Options<AddCommandArgs>;
export declare class AddCommandModule extends SchematicCommand<AddCommandOptions> {
    readonly allowPrivateSchematics = true;
    run(options: AddCommandOptions): Promise<number | void>;
    private isProjectVersionValid;
    reportAnalytics(paths: string[], options: AddCommandOptions, dimensions?: (boolean | number | string)[], metrics?: (boolean | number | string)[]): Promise<void>;
    private isPackageInstalled;
    private executeSchematic;
    private findProjectVersion;
    private hasMismatchedPeer;
}
export {};
