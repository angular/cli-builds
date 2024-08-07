/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { workspaces } from '@angular-devkit/core';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
export default class ExtractI18nCommandModule extends ArchitectCommandModule implements CommandModuleImplementation {
    multiTarget: boolean;
    command: string;
    describe: string;
    longDescriptionPath?: string | undefined;
    findDefaultBuilderName(project: workspaces.ProjectDefinition): Promise<string | undefined>;
}
