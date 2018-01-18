"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const bundle_calculator_1 = require("../utilities/bundle-calculator");
class BundleBudgetPlugin {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        const { budgets } = this.options;
        compiler.plugin('after-emit', (compilation, cb) => {
            if (!budgets || budgets.length === 0) {
                cb();
                return;
            }
            budgets.map(budget => {
                const thresholds = this.calcualte(budget);
                return {
                    budget,
                    thresholds,
                    sizes: bundle_calculator_1.calculateSizes(budget, compilation)
                };
            })
                .forEach(budgetCheck => {
                budgetCheck.sizes.forEach(size => {
                    if (budgetCheck.thresholds.maximumWarning) {
                        if (budgetCheck.thresholds.maximumWarning < size.size) {
                            compilation.warnings.push(`budgets, maximum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.maximumError) {
                        if (budgetCheck.thresholds.maximumError < size.size) {
                            compilation.errors.push(`budgets, maximum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.minimumWarning) {
                        if (budgetCheck.thresholds.minimumWarning > size.size) {
                            compilation.warnings.push(`budgets, minimum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.minimumError) {
                        if (budgetCheck.thresholds.minimumError > size.size) {
                            compilation.errors.push(`budgets, minimum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.warningLow) {
                        if (budgetCheck.thresholds.warningLow > size.size) {
                            compilation.warnings.push(`budgets, minimum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.warningHigh) {
                        if (budgetCheck.thresholds.warningHigh < size.size) {
                            compilation.warnings.push(`budgets, maximum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.errorLow) {
                        if (budgetCheck.thresholds.errorLow > size.size) {
                            compilation.errors.push(`budgets, minimum exceeded for ${size.label}.`);
                        }
                    }
                    if (budgetCheck.thresholds.errorHigh) {
                        if (budgetCheck.thresholds.errorHigh < size.size) {
                            compilation.errors.push(`budgets, maximum exceeded for ${size.label}.`);
                        }
                    }
                });
            });
            cb();
        });
    }
    calcualte(budget) {
        let thresholds = {};
        if (budget.maximumWarning) {
            thresholds.maximumWarning = bundle_calculator_1.calculateBytes(budget.maximumWarning, budget.baseline, 'pos');
        }
        if (budget.maximumError) {
            thresholds.maximumError = bundle_calculator_1.calculateBytes(budget.maximumError, budget.baseline, 'pos');
        }
        if (budget.minimumWarning) {
            thresholds.minimumWarning = bundle_calculator_1.calculateBytes(budget.minimumWarning, budget.baseline, 'neg');
        }
        if (budget.minimumError) {
            thresholds.minimumError = bundle_calculator_1.calculateBytes(budget.minimumError, budget.baseline, 'neg');
        }
        if (budget.warning) {
            thresholds.warningLow = bundle_calculator_1.calculateBytes(budget.warning, budget.baseline, 'neg');
        }
        if (budget.warning) {
            thresholds.warningHigh = bundle_calculator_1.calculateBytes(budget.warning, budget.baseline, 'pos');
        }
        if (budget.error) {
            thresholds.errorLow = bundle_calculator_1.calculateBytes(budget.error, budget.baseline, 'neg');
        }
        if (budget.error) {
            thresholds.errorHigh = bundle_calculator_1.calculateBytes(budget.error, budget.baseline, 'pos');
        }
        return thresholds;
    }
}
exports.BundleBudgetPlugin = BundleBudgetPlugin;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/plugins/bundle-budget.js.map