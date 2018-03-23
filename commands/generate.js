"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const chalk_1 = require("chalk");
const config_1 = require("../models/config");
const schematics_1 = require("../utilities/schematics");
const common_tags_1 = require("common-tags");
const schematic_command_1 = require("../models/schematic-command");
const { cyan } = chalk_1.default;
class GenerateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'generate';
        this.description = 'Generates and/or modifies files based on a schematic.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['schematic'];
        this.options = [
            ...this.coreOptions
        ];
        this.initialized = false;
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            this.initialized = true;
            const [collectionName, schematicName] = this.parseSchematicInfo(options);
            if (!!schematicName) {
                const availableOptions = yield this.getOptions({
                    schematicName,
                    collectionName,
                });
                this.options = this.options.concat(availableOptions || []);
            }
        });
    }
    validate(options) {
        if (!options._[0]) {
            this.logger.error(common_tags_1.oneLine `
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);
            return false;
        }
        return true;
    }
    run(options) {
        const [collectionName, schematicName] = this.parseSchematicInfo(options);
        // remove the schematic name from the options
        options._ = options._.slice(1);
        return this.runSchematic({
            collectionName,
            schematicName,
            schematicOptions: options,
            debug: options.debug,
            dryRun: options.dryRun,
            force: options.force,
        });
    }
    parseSchematicInfo(options) {
        let collectionName = config_1.CliConfig.getValue('defaults.schematics.collection');
        let schematicName = options._[0];
        if (schematicName) {
            if (schematicName.match(/:/)) {
                [collectionName, schematicName] = schematicName.split(':', 2);
            }
        }
        return [collectionName, schematicName];
    }
    printHelp(options) {
        if (options.schematic) {
            super.printHelp(options);
        }
        else {
            this.printHelpUsage(this.name, this.arguments, this.options);
            const engineHost = schematics_1.getEngineHost();
            const [collectionName] = this.parseSchematicInfo(options);
            const collection = schematics_1.getCollection(collectionName);
            const schematicNames = engineHost.listSchematics(collection);
            this.logger.info('Available schematics:');
            schematicNames.forEach(schematicName => {
                this.logger.info(`    ${schematicName}`);
            });
            this.logger.warn(`\nTo see help for a schematic run:`);
            this.logger.info(cyan(`  ng generate <schematic> --help`));
        }
    }
}
GenerateCommand.aliases = ['g'];
exports.default = GenerateCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/generate.js.map