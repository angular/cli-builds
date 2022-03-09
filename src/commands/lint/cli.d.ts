/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
export declare class LintCommandModule extends ArchitectCommandModule implements CommandModuleImplementation {
    missingErrorTarget: string;
    multiTarget: boolean;
    command: string;
    longDescriptionPath: string;
    describe: string;
}
