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
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11752-29458-1s41dfr.bcn9bv5cdi/angular-cli/utilities/override-options.js.map