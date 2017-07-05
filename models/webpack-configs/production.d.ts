import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../webpack-config';
export declare const getProdConfig: (wco: WebpackConfigOptions) => {
    entry: {
        [key: string]: string[];
    };
    plugins: webpack.HashedModuleIdsPlugin[];
};
