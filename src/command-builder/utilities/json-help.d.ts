/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface JsonHelp {
    name: string;
    shortDescription?: string;
    command: string;
    longDescription?: string;
    longDescriptionRelativePath?: string;
    options: JsonHelpOption[];
    subcommands?: {
        name: string;
        description: string;
        aliases: string[];
        deprecated: string | boolean;
    }[];
}
interface JsonHelpOption {
    name: string;
    type?: string;
    deprecated: boolean | string;
    aliases?: string[];
    default?: string;
    required?: boolean;
    positional?: number;
    enum?: string[];
    description?: string;
}
export declare function jsonHelpUsage(): string;
export {};
