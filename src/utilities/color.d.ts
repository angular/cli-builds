/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
export declare const colors: Readonly<{
    black: (text: string) => string;
    blue: (text: string) => string;
    bold: (text: string) => string;
    cyan: (text: string) => string;
    dim: (text: string) => string;
    gray: (text: string) => string;
    green: (text: string) => string;
    italic: (text: string) => string;
    magenta: (text: string) => string;
    red: (text: string) => string;
    underline: (text: string) => string;
    white: (text: string) => string;
    yellow: (text: string) => string;
}>;
export declare function supportColor(stream?: NodeJS.WritableStream): boolean;
