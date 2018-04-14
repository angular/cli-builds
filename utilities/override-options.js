"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloneDeep = require('lodash/cloneDeep');
function overrideOptions(original, overrides) {
    let copy = cloneDeep(original);
    overrides.forEach(override => {
        const option = copy.find((opt) => opt.name == override.name);
        if (option) {
            Object.assign(option, override);
        }
    });
    return copy;
}
exports.overrideOptions = overrideOptions;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/override-options.js.map