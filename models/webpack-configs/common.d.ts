import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../webpack-config';
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('url-loader')
 * require('file-loader')
 * require('@angular-devkit/build-optimizer')
 */
export declare function getCommonConfig(wco: WebpackConfigOptions): {
    resolve: {
        extensions: string[];
        modules: string[];
        symlinks: boolean;
    };
    resolveLoader: {
        modules: string[];
    };
    context: string;
    entry: {
        [key: string]: string[];
    };
    output: {
        path: string;
        publicPath: string;
        filename: string;
        chunkFilename: string;
    };
    module: {
        rules: {
            test: RegExp;
            loader: string;
        }[];
    };
    plugins: webpack.NoEmitOnErrorsPlugin[];
};
