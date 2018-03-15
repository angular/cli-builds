"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const architect_1 = require("@angular-devkit/architect");
const operators_1 = require("rxjs/operators");
const config_1 = require("../models/config");
const app_utils_1 = require("../utilities/app-utils");
const build_webpack_compat_1 = require("./build-webpack-compat");
function runTarget(root, target, options) {
    // We assume the default build-webpack package, so we need to add it here for the dep checker.
    // require('@angular-devkit/build-webpack')
    const host = new node_1.NodeJsSyncHost();
    const logger = node_1.createConsoleLogger();
    const cliConfig = config_1.CliConfig.fromProject().config;
    const architect = new architect_1.Architect(core_1.normalize(root), host);
    const app = app_utils_1.getAppFromConfig(options.app);
    const workspaceConfig = build_webpack_compat_1.createArchitectWorkspace(cliConfig);
    const project = build_webpack_compat_1.getProjectName(app, options.app);
    const overrides = build_webpack_compat_1.convertOptions(Object.assign({}, options));
    const targetOptions = { project, target, overrides };
    const context = { logger };
    return architect.loadWorkspaceFromJson(workspaceConfig).pipe(operators_1.concatMap(() => architect.run(architect.getTarget(targetOptions), context)));
}
exports.runTarget = runTarget;
function run(options) {
    const { root, app, target, configuration, overrides } = options;
    const host = new node_1.NodeJsSyncHost();
    const logger = node_1.createConsoleLogger();
    const cliConfig = config_1.CliConfig.fromProject().config;
    const architect = new architect_1.Architect(core_1.normalize(root), host);
    const appConfig = app_utils_1.getAppFromConfig(app);
    const workspaceConfig = build_webpack_compat_1.createArchitectWorkspace(cliConfig);
    const project = build_webpack_compat_1.getProjectName(appConfig, app);
    const convertOverrides = build_webpack_compat_1.convertOptions(Object.assign({}, overrides));
    const context = { logger };
    const targetOptions = {
        project,
        target,
        configuration,
        overrides: convertOverrides
    };
    return architect.loadWorkspaceFromJson(workspaceConfig).pipe(operators_1.concatMap(() => architect.run(architect.getTarget(targetOptions), context)));
}
exports.run = run;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/utilities/architect.js.map