"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const architect_1 = require("../utilities/architect");
const Task = require('../ember-cli/lib/models/task');
exports.Extracti18nTask = Task.extend({
    run: function (options) {
        return architect_1.runTarget(this.project.root, 'extract-i18n', options).toPromise().then(buildEvent => {
            if (buildEvent.success === false) {
                return Promise.reject('Run failed');
            }
        });
    }
});
//# sourceMappingURL=/home/travis/build/angular/angular-cli/tasks/extract-i18n.js.map