/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Argv } from 'yargs';
import { CommandModule, Options } from '../../command-builder/command-module';
interface AnalyticsCommandArgs {
    'setting-or-project': 'on' | 'off' | 'ci' | 'project' | 'prompt' | string;
    'project-setting'?: 'on' | 'off' | 'prompt' | string;
}
export declare class AnalyticsCommandModule extends CommandModule<AnalyticsCommandArgs> {
    command: string;
    describe: string;
    longDescriptionPath: string;
    builder(localYargs: Argv): Argv<AnalyticsCommandArgs>;
    run({ settingOrProject, projectSetting, }: Options<AnalyticsCommandArgs>): Promise<number | void>;
}
export {};
