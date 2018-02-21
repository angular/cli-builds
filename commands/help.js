"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const fs = require("fs");
const path = require("path");
const { cyan } = chalk_1.default;
const Command = require('../ember-cli/lib/models/command');
const stringUtils = require('ember-cli-string-utils');
const lookupCommand = require('../ember-cli/lib/cli/lookup-command');
const HelpCommand = Command.extend({
    name: 'help',
    description: 'Shows help for the CLI.',
    works: 'everywhere',
    availableOptions: [],
    anonymousOptions: [],
    run: function (_commandOptions, _rawArgs) {
        let commandFiles = fs.readdirSync(__dirname)
            .filter(file => file.match(/\.(j|t)s$/) && !file.match(/\.d.ts$/))
            .map(file => path.parse(file).name)
            .map(file => file.toLowerCase());
        let commandMap = commandFiles.reduce((acc, curr) => {
            let classifiedName = stringUtils.classify(curr);
            let defaultImport = require(`./${curr}`).default;
            acc[classifiedName] = defaultImport;
            return acc;
        }, {});
        const commands = commandFiles
            .map(commandFile => {
            const Command = lookupCommand(commandMap, commandFile);
            const cmd = new Command({
                ui: this.ui,
                project: this.project,
                commands: this.commands,
                tasks: this.tasks
            });
            return cmd;
        })
            .filter(cmd => !cmd.hidden && !cmd.unknown)
            .map(cmd => ({ name: cmd.name, description: cmd.description }));
        this.ui.writeLine(`Available Commands:`);
        commands.forEach(cmd => {
            this.ui.writeLine(`  ${cyan(cmd.name)} ${cmd.description}`);
        });
        this.ui.writeLine(`\nFor more detailed help run "ng [command name] --help"`);
    }
});
HelpCommand.overrideCore = true;
exports.default = HelpCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/help.js.map