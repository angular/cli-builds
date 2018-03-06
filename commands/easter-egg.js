"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const chalk_1 = require("chalk");
function pickOne(of) {
    return of[Math.floor(Math.random() * of.length)];
}
class AwesomeCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'make-this-awesome';
        this.description = '';
        this.arguments = [];
        this.options = [];
    }
    run(_options) {
        const phrase = pickOne([
            `You're on it, there's nothing for me to do!`,
            `Let's take a look... nope, it's all good!`,
            `You're doing fine.`,
            `You're already doing great.`,
            `Nothing to do; already awesome. Exiting.`,
            `Error 418: As Awesome As Can Get.`,
            `I spy with my little eye a great developer!`,
            `Noop... already awesome.`
        ]);
        this.logger.info(chalk_1.default.green(phrase));
    }
}
exports.default = AwesomeCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/easter-egg.js.map