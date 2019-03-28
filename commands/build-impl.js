"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const architect_command_1 = require("../models/architect-command");
const version_1 = require("../upgrade/version");
class BuildCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'build';
    }
    async run(options) {
        // Check Angular version.
        version_1.Version.assertCompatibleAngularVersion(this.workspace.root);
        return this.runArchitectTarget(options);
    }
    async reportAnalytics(paths, options, dimensions = [], metrics = []) {
        if (options.buildEventLog !== undefined) {
            dimensions[core_1.analytics.NgCliAnalyticsDimensions.NgBuildBuildEventLog] = true;
        }
        return super.reportAnalytics(paths, options, dimensions, metrics);
    }
}
exports.BuildCommand = BuildCommand;
