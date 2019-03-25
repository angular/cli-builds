"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_1 = require("../models/analytics");
const architect_command_1 = require("../models/architect-command");
const version_1 = require("../upgrade/version");
class ServeCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'serve';
    }
    validate(_options) {
        // Check Angular versions.
        version_1.Version.assertCompatibleAngularVersion(this.workspace.root);
        return true;
    }
    async run(options) {
        return this.runArchitectTarget(options);
    }
    async reportAnalytics(paths, options, dimensions = [], metrics = []) {
        if (options.buildEventLog !== undefined) {
            dimensions[analytics_1.AnalyticsDimensions.NgBuildBuildEventLog] = true;
        }
        return super.reportAnalytics(paths, options, dimensions, metrics);
    }
}
exports.ServeCommand = ServeCommand;
