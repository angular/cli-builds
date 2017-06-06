"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command = require('../ember-cli/lib/models/command');
const SilentError = require('silent-error');
const DestroyCommand = Command.extend({
    name: 'destroy',
    aliases: ['d'],
    works: 'insideProject',
    hidden: true,
    anonymousOptions: [
        '<blueprint>'
    ],
    run: function () {
        return Promise.reject(new SilentError('The destroy command is not supported by Angular CLI.'));
    }
});
exports.default = DestroyCommand;
DestroyCommand.overrideCore = true;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11756-42142-rgdeza.khinng66r/angular-cli/commands/destroy.js.map