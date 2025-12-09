/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Argv } from 'yargs';
import { CommandModule, CommandScope, Options } from '../../command-builder/command-module';
interface UpdateCommandArgs {
    packages?: string[];
    force: boolean;
    next: boolean;
    'migrate-only'?: boolean;
    name?: string;
    from?: string;
    to?: string;
    'allow-dirty': boolean;
    verbose: boolean;
    'create-commits': boolean;
}
export default class UpdateCommandModule extends CommandModule<UpdateCommandArgs> {
    scope: CommandScope;
    protected shouldReportAnalytics: boolean;
    private readonly resolvePaths;
    command: string;
    describe: string;
    longDescriptionPath: string;
    builder(localYargs: Argv): Argv<UpdateCommandArgs>;
    run(options: Options<UpdateCommandArgs>): Promise<number | void>;
    private migrateOnly;
    private updatePackagesAndMigrate;
}
export {};
