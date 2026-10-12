/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation, Options } from '../../command-builder/command-module';
interface ConfigCommandArgs {
    'json-path'?: string;
    value?: string;
    global?: boolean;
}
export default class ConfigCommandModule extends CommandModule<ConfigCommandArgs> implements CommandModuleImplementation<ConfigCommandArgs> {
    command: string;
    describe: string;
    longDescriptionPath: string;
    builder(localYargs: Argv): Argv<ConfigCommandArgs>;
    run(options: Options<ConfigCommandArgs>): Promise<number | void>;
    private get;
    private set;
}
/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {(string|number)[]} The fragments for the string.
 */
export declare function parseJsonPath(path: string): (string | number)[];
export {};
