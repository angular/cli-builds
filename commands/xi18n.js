"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command = require('../ember-cli/lib/models/command');
const Xi18nCommand = Command.extend({
    name: 'xi18n',
    description: 'Extracts i18n messages from source code.',
    works: 'insideProject',
    run: function () {
        this.ui.writeLine('xi18n command is not supported when used with bazel');
    }
});
exports.default = Xi18nCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/xi18n.js.map