"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command = require('../ember-cli/lib/models/command');
const doc_1 = require("../tasks/doc");
const DocCommand = Command.extend({
    name: 'doc',
    description: 'Opens the official Angular documentation for a given keyword.',
    works: 'everywhere',
    availableOptions: [
        {
            name: 'search',
            aliases: ['s'],
            type: Boolean,
            default: false,
            description: 'Search docs instead of api.'
        }
    ],
    anonymousOptions: [
        '<keyword>'
    ],
    run: function (commandOptions, rawArgs) {
        const keyword = rawArgs[0];
        const docTask = new doc_1.DocTask({
            ui: this.ui,
            project: this.project
        });
        return docTask.run(keyword, commandOptions.search);
    }
});
exports.default = DocCommand;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-34955-heb2o6.8aqm9xjemi/angular-cli/commands/doc.js.map