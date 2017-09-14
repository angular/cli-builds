import { AotPlugin, AngularCompilerPlugin } from '@ngtools/webpack';
import { WebpackConfigOptions } from '../webpack-config';
export declare const getNonAotConfig: (wco: WebpackConfigOptions) => {
    module: {
        rules: {
            test: RegExp;
            loader: string;
        }[];
    };
    plugins: (AngularCompilerPlugin | AotPlugin)[];
};
export declare const getAotConfig: (wco: WebpackConfigOptions) => {
    module: {
        rules: {
            test: RegExp;
            use: any[];
        }[];
    };
    plugins: (AngularCompilerPlugin | AotPlugin)[];
};
export declare const getNonAotTestConfig: (wco: WebpackConfigOptions) => {
    module: {
        rules: {
            test: RegExp;
            loader: string;
        }[];
    };
    plugins: (AngularCompilerPlugin | AotPlugin)[];
};
