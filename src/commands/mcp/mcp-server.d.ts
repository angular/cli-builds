/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AngularWorkspace } from '../../utilities/config';
import { type AnyMcpToolDeclaration } from './tools/tool-registry';
/**
 * The set of tools that are available but not enabled by default.
 * These tools are considered experimental and may have limitations.
 */
export declare const EXPERIMENTAL_TOOLS: readonly [import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
    configuration: import("zod").ZodOptional<import("zod").ZodString>;
}, {
    status: import("zod").ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    path: import("zod").ZodOptional<import("zod").ZodString>;
}>, import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
}, {
    status: import("zod").ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}>, import("./tools/tool-registry").McpToolDeclaration<{
    directories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    transformations: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodEnum<{
        [x: string]: string;
    }>>>;
}, {
    instructions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}>, import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
    filter: import("zod").ZodOptional<import("zod").ZodString>;
}, {
    status: import("zod").ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}>, ...(import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
}, {
    message: import("zod").ZodString;
    address: import("zod").ZodOptional<import("zod").ZodString>;
}> | import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
}, {
    message: import("zod").ZodString;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}> | import("./tools/tool-registry").McpToolDeclaration<{
    project: import("zod").ZodOptional<import("zod").ZodString>;
    timeout: import("zod").ZodDefault<import("zod").ZodNumber>;
}, {
    status: import("zod").ZodEnum<{
        success: "success";
        timeout: "timeout";
        failure: "failure";
        unknown: "unknown";
        no_devserver_found: "no_devserver_found";
    }>;
    logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}>)[]];
/**
 * Experimental tools that are grouped together under a single name.
 *
 * Used for enabling them as a group.
 */
export declare const EXPERIMENTAL_TOOL_GROUPS: {
    all: readonly [import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
        configuration: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        status: import("zod").ZodEnum<{
            success: "success";
            failure: "failure";
        }>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        path: import("zod").ZodOptional<import("zod").ZodString>;
    }>, import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        status: import("zod").ZodEnum<{
            success: "success";
            failure: "failure";
        }>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }>, import("./tools/tool-registry").McpToolDeclaration<{
        directories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        transformations: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodEnum<{
            [x: string]: string;
        }>>>;
    }, {
        instructions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }>, import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
        filter: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        status: import("zod").ZodEnum<{
            success: "success";
            failure: "failure";
        }>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }>, ...(import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        message: import("zod").ZodString;
        address: import("zod").ZodOptional<import("zod").ZodString>;
    }> | import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        message: import("zod").ZodString;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }> | import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
        timeout: import("zod").ZodDefault<import("zod").ZodNumber>;
    }, {
        status: import("zod").ZodEnum<{
            success: "success";
            timeout: "timeout";
            failure: "failure";
            unknown: "unknown";
            no_devserver_found: "no_devserver_found";
        }>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }>)[]];
    devserver: (import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        message: import("zod").ZodString;
        address: import("zod").ZodOptional<import("zod").ZodString>;
    }> | import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
    }, {
        message: import("zod").ZodString;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }> | import("./tools/tool-registry").McpToolDeclaration<{
        project: import("zod").ZodOptional<import("zod").ZodString>;
        timeout: import("zod").ZodDefault<import("zod").ZodNumber>;
    }, {
        status: import("zod").ZodEnum<{
            success: "success";
            timeout: "timeout";
            failure: "failure";
            unknown: "unknown";
            no_devserver_found: "no_devserver_found";
        }>;
        logs: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    }>)[];
};
export declare function createMcpServer(options: {
    workspace?: AngularWorkspace;
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
}, logger: {
    warn(text: string): void;
}): Promise<McpServer>;
export declare function assembleToolDeclarations(stableDeclarations: readonly AnyMcpToolDeclaration[], experimentalDeclarations: readonly AnyMcpToolDeclaration[], options: {
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
    logger: {
        warn(text: string): void;
    };
}): AnyMcpToolDeclaration[];
