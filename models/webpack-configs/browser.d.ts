import { WebpackConfigOptions } from '../webpack-config';
export declare function getBrowserConfig(wco: WebpackConfigOptions): {
    output: {
        crossOriginLoading: string | boolean;
    };
    plugins: any[];
};
