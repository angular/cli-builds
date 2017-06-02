"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const config_1 = require("./config");
const webpack_config_1 = require("./webpack-config");
const webpackMerge = require('webpack-merge');
const webpack_configs_1 = require("./webpack-configs");
class XI18nWebpackConfig extends webpack_config_1.NgCliWebpackConfig {
    constructor(extractOptions, appConfig) {
        super({
            target: 'development',
            verbose: extractOptions.verbose,
            progress: extractOptions.progress
        }, appConfig);
        this.extractOptions = extractOptions;
        this.appConfig = appConfig;
        super.buildConfig();
    }
    buildConfig() {
        const configPath = config_1.CliConfig.configFilePath();
        const projectRoot = path.dirname(configPath);
        const extractI18nConfig = webpack_configs_1.getWebpackExtractI18nConfig(projectRoot, this.appConfig, this.extractOptions.genDir, this.extractOptions.i18nFormat, this.extractOptions.locale, this.extractOptions.outFile);
        this.config = webpackMerge([this.config, extractI18nConfig]);
        return this.config;
    }
}
exports.XI18nWebpackConfig = XI18nWebpackConfig;
//# sourceMappingURL=/private/var/folders/lp/5h0nls311ws4fn75nn7kzz600037zs/t/angular-cli-builds11752-29458-1s41dfr.bcn9bv5cdi/angular-cli/models/webpack-xi18n-config.js.map