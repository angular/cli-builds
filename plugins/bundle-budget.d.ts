/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Budget } from '../utilities/bundle-calculator';
export interface BundleBudgetPluginOptions {
    budgets: Budget[];
}
export declare class BundleBudgetPlugin {
    private options;
    constructor(options: BundleBudgetPluginOptions);
    apply(compiler: any): void;
    private calcualte(budget);
}
