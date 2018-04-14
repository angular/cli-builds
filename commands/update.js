"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_tags_1 = require("common-tags");
const chalk = require('chalk');
const Command = require('../ember-cli/lib/models/command');
const UpdateCommand = Command.extend({
    name: 'update',
    description: 'Updates your application.',
    works: 'everywhere',
    availableOptions: [],
    anonymousOptions: [],
    run: function (_commandOptions) {
        console.log(chalk.red(common_tags_1.stripIndent `
      CLI 1.7 does not support an automatic v6 update. Manually install @angular/cli via your
      package manager, then run the update migration schematic to finish the process.


        npm install @angular/cli@^6.0.0
        ng update @angular/cli --migrate-only --from=1
    ` + '\n\n'));
    }
});
exports.default = UpdateCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/update.js.map