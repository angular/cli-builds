"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NgToolkitError extends Error {
    constructor(message) {
        super();
        if (message) {
            this.message = message;
        }
        else {
            this.message = this.constructor.name;
        }
    }
}
exports.NgToolkitError = NgToolkitError;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-42871-zwooiw.iwbxnr8uxr/angular-cli/models/error.js.map