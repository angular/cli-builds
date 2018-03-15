"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const architect_command_1 = require("../models/architect-command");
class E2eCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'e2e';
        this.target = 'protractor';
        this.description = 'Run e2e tests in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['app'];
        this.options = [
            this.prodOption,
            this.configurationOption
        ];
    }
    run(options) {
        let configuration = options.configuration;
        if (!configuration && options.prod) {
            configuration = 'production';
        }
        const overrides = Object.assign({}, options);
        delete overrides.app;
        delete overrides.prod;
        return this.runArchitect({
            app: options.app,
            configuration,
            overrides
        });
    }
}
E2eCommand.aliases = ['e'];
exports.default = E2eCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/e2e.js.map