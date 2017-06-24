import { WebpackConfigOptions } from '../webpack-config';
export declare const getProdConfig: (wco: WebpackConfigOptions) => {
    entry: {
        [key: string]: string[];
    };
    module: {
        rules: {
            'test': RegExp;
            use: {
                loader: string;
                options: {
                    sourceMap: boolean;
                };
            }[];
        }[];
    };
    plugins: any[];
};
