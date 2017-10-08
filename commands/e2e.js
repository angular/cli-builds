"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command = require('../ember-cli/lib/models/command');
const E2eCommand = Command.extend({
    name: 'e2e',
    aliases: ['e'],
    description: 'Run e2e tests in existing project.',
    works: 'insideProject',
    availableOptions: [],
    run: function () {
        this.ui.writeLine('e2e command is not supported when used with bazel');
    }
});
exports.default = E2eCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/e2e.js.map