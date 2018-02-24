import { WebpackTestOptions } from '../webpack-test-config';
import { WebpackConfigOptions } from '../webpack-config';
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */
export declare function getTestConfig(wco: WebpackConfigOptions<WebpackTestOptions>): {
    resolve: {
        mainFields: string[];
    };
    devtool: string;
    entry: {
        main: string;
    };
    module: {
        rules: any[];
    };
    plugins: any[];
    optimization: {
        splitChunks: {
            chunks: string;
            cacheGroups: {
                vendors: boolean;
                vendor: {
                    name: string;
                    chunks: string;
                    test: (module: any, chunks: {
                        name: string;
                    }[]) => boolean;
                };
            };
        };
    };
};
