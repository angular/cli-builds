import { WebpackConfigOptions } from '../webpack-config';
export declare function getBrowserConfig(wco: WebpackConfigOptions): {
    resolve: {
        mainFields: string[];
    };
    output: {
        crossOriginLoading: string | boolean;
    };
    optimization: {
        runtimeChunk: string;
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
    plugins: any[];
    node: {
        fs: string;
        global: boolean;
        crypto: string;
        tls: string;
        net: string;
        process: boolean;
        module: boolean;
        clearImmediate: boolean;
        setImmediate: boolean;
    };
};
