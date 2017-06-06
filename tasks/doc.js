"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Task = require('../ember-cli/lib/models/task');
const opn = require('opn');
exports.DocTask = Task.extend({
    run: function (keyword, search) {
        const searchUrl = search ? `https://angular.io/search/#stq=${keyword}&stp=1` :
            `https://angular.io/docs/ts/latest/api/#!?query=${keyword}`;
        return opn(searchUrl, { wait: false });
    }
});
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-62193-lhciji.cdxm8fflxr/angular-cli/tasks/doc.js.map