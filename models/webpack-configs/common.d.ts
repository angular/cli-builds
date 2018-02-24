import { WebpackConfigOptions } from '../webpack-config';
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('raw-loader')
 * require('url-loader')
 * require('file-loader')
 * require('cache-loader')
 * require('@angular-devkit/build-optimizer')
 */
export declare function getCommonConfig(wco: WebpackConfigOptions): {
    mode: string;
    devtool: boolean;
    resolve: {
        extensions: string[];
        symlinks: boolean;
        modules: string[];
        alias: {};
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
    };
    module: {
        rules: ({
            test: RegExp;
            loader: string;
        } | {
            test: RegExp;
            loader: string;
            options: {
                name: string;
                limit: number;
            };
        } | {
            use: ({
                loader: string;
                options: {
                    cacheDirectory: string;
                };
            } | {
                loader: string;
                options: {
                    sourceMap: boolean;
                };
            })[];
            test: RegExp;
            sideEffects: boolean;
            parser: {
                system: boolean;
            };
        } | {
            use: ({
                loader: string;
                options: {
                    cacheDirectory: string;
                };
            } | {
                loader: string;
                options: {
                    sourceMap: boolean;
                };
            })[];
            test: RegExp;
        })[];
    };
    optimization: {
        noEmitOnErrors: boolean;
        minimizer: any[];
    };
    plugins: any[];
};
