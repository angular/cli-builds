"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonHelpUsage = void 0;
const yargs_1 = __importDefault(require("yargs"));
function jsonHelpUsage() {
    var _a, _b, _c;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localYargs = yargs_1.default;
    const { deprecatedOptions, alias: aliases, array, string, boolean, number, choices, demandedOptions, default: defaultVal, hiddenOptions = [], } = localYargs.getOptions();
    const internalMethods = localYargs.getInternalMethods();
    const usageInstance = internalMethods.getUsageInstance();
    const context = internalMethods.getContext();
    const descriptions = usageInstance.getDescriptions();
    const groups = localYargs.getGroups();
    const positional = groups[usageInstance.getPositionalGroupName()];
    const hidden = new Set(hiddenOptions);
    const normalizeOptions = [];
    const allAliases = new Set([...Object.values(aliases).flat()]);
    for (const [names, type] of [
        [array, 'array'],
        [string, 'string'],
        [boolean, 'boolean'],
        [number, 'number'],
    ]) {
        for (const name of names) {
            if (allAliases.has(name) || hidden.has(name)) {
                // Ignore hidden, aliases and already visited option.
                continue;
            }
            const positionalIndex = (_a = positional === null || positional === void 0 ? void 0 : positional.indexOf(name)) !== null && _a !== void 0 ? _a : -1;
            const alias = aliases[name];
            normalizeOptions.push({
                name,
                type,
                deprecated: deprecatedOptions[name],
                aliases: (alias === null || alias === void 0 ? void 0 : alias.length) > 0 ? alias : undefined,
                default: defaultVal[name],
                required: demandedOptions[name],
                enum: choices[name],
                description: (_b = descriptions[name]) === null || _b === void 0 ? void 0 : _b.replace('__yargsString__:', ''),
                positional: positionalIndex >= 0 ? positionalIndex : undefined,
            });
        }
    }
    // https://github.com/yargs/yargs/blob/00e4ebbe3acd438e73fdb101e75b4f879eb6d345/lib/usage.ts#L124
    const subcommands = usageInstance.getCommands()
        .map(([name, rawDescription, _, aliases, deprecated]) => ({
        name: name.split(' ', 1)[0],
        command: name,
        ...parseDescription(rawDescription),
        aliases,
        deprecated,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const [command, rawDescription] = (_c = usageInstance.getUsage()[0]) !== null && _c !== void 0 ? _c : [];
    const output = {
        name: [...context.commands].pop(),
        command: command === null || command === void 0 ? void 0 : command.replace('$0', localYargs['$0']),
        ...parseDescription(rawDescription),
        options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
        subcommands: subcommands.length ? subcommands : undefined,
    };
    return JSON.stringify(output, undefined, 2);
}
exports.jsonHelpUsage = jsonHelpUsage;
function parseDescription(rawDescription) {
    try {
        const { longDescription, describe: shortDescription, longDescriptionRelativePath, } = JSON.parse(rawDescription);
        return {
            shortDescription,
            longDescriptionRelativePath,
            longDescription,
        };
    }
    catch (_a) {
        return {
            shortDescription: rawDescription,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1oZWxwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvanNvbi1oZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILGtEQUEwQjtBQWtDMUIsU0FBZ0IsYUFBYTs7SUFDM0IsOERBQThEO0lBQzlELE1BQU0sVUFBVSxHQUFHLGVBQVksQ0FBQztJQUNoQyxNQUFNLEVBQ0osaUJBQWlCLEVBQ2pCLEtBQUssRUFBRSxPQUFPLEVBQ2QsS0FBSyxFQUNMLE1BQU0sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUFFLFVBQVUsRUFDbkIsYUFBYSxHQUFHLEVBQUUsR0FDbkIsR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7SUFFNUIsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDeEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzdDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNyRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxDQUF5QixDQUFDO0lBRTFGLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sZ0JBQWdCLEdBQXFCLEVBQUUsQ0FBQztJQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0s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QUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RSxXQUFXLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQzFELENBQUM7SUFFRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBdEZELHNDQXNGQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsY0FBc0I7SUFDOUMsSUFBSTtRQUNGLE1BQU0sRUFDSixlQUFlLEVBQ2YsUUFBUSxFQUFFLGdCQUFnQixFQUMxQiwyQkFBMkIsR0FDNUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBaUIsQ0FBQztRQUUvQyxPQUFPO1lBQ0wsZ0JBQWdCO1lBQ2hCLDJCQUEyQjtZQUMzQixlQUFlO1NBQ2hCLENBQUM7S0FDSDtJQUFDLFdBQU07UUFDTixPQUFPO1lBQ0wsZ0JBQWdCLEVBQUUsY0FBYztTQUNqQyxDQUFDO0tBQ0g7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB5YXJncyBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBGdWxsRGVzY3JpYmUgfSBmcm9tICcuLi9jb21tYW5kLW1vZHVsZSc7XG5cbmludGVyZmFjZSBKc29uSGVscE9wdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZT86IHN0cmluZztcbiAgZGVwcmVjYXRlZDogYm9vbGVhbiB8IHN0cmluZztcbiAgYWxpYXNlcz86IHN0cmluZ1tdO1xuICBkZWZhdWx0Pzogc3RyaW5nO1xuICByZXF1aXJlZD86IGJvb2xlYW47XG4gIHBvc2l0aW9uYWw/OiBudW1iZXI7XG4gIGVudW0/OiBzdHJpbmdbXTtcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBKc29uSGVscERlc2NyaXB0aW9uIHtcbiAgc2hvcnREZXNjcmlwdGlvbj86IHN0cmluZztcbiAgbG9uZ0Rlc2NyaXB0aW9uPzogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGg/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBKc29uSGVscFN1YmNvbW1hbmQgZXh0ZW5kcyBKc29uSGVscERlc2NyaXB0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBhbGlhc2VzOiBzdHJpbmdbXTtcbiAgZGVwcmVjYXRlZDogc3RyaW5nIHwgYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBKc29uSGVscCBleHRlbmRzIEpzb25IZWxwRGVzY3JpcHRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGNvbW1hbmQ6IHN0cmluZztcbiAgb3B0aW9uczogSnNvbkhlbHBPcHRpb25bXTtcbiAgc3ViY29tbWFuZHM/OiBKc29uSGVscFN1YmNvbW1hbmRbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpzb25IZWxwVXNhZ2UoKTogc3RyaW5nIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgY29uc3QgbG9jYWxZYXJncyA9IHlhcmdzIGFzIGFueTtcbiAgY29uc3Qge1xuICAgIGRlcHJlY2F0ZWRPcHRpb25zLFxuICAgIGFsaWFzOiBhbGlhc2VzLFxuICAgIGFycmF5LFxuICAgIHN0cmluZyxcbiAgICBib29sZWFuLFxuICAgIG51bWJlcixcbiAgICBjaG9pY2VzLFxuICAgIGRlbWFuZGVkT3B0aW9ucyxcbiAgICBkZWZhdWx0OiBkZWZhdWx0VmFsLFxuICAgIGhpZGRlbk9wdGlvbnMgPSBbXSxcbiAgfSA9IGxvY2FsWWFyZ3MuZ2V0T3B0aW9ucygpO1xuXG4gIGNvbnN0IGludGVybmFsTWV0aG9kcyA9IGxvY2FsWWFyZ3MuZ2V0SW50ZXJuYWxNZXRob2RzKCk7XG4gIGNvbnN0IHVzYWdlSW5zdGFuY2UgPSBpbnRlcm5hbE1ldGhvZHMuZ2V0VXNhZ2VJbnN0YW5jZSgpO1xuICBjb25zdCBjb250ZXh0ID0gaW50ZXJuYWxNZXRob2RzLmdldENvbnRleHQoKTtcbiAgY29uc3QgZGVzY3JpcHRpb25zID0gdXNhZ2VJbnN0YW5jZS5nZXREZXNjcmlwdGlvbnMoKTtcbiAgY29uc3QgZ3JvdXBzID0gbG9jYWxZYXJncy5nZXRHcm91cHMoKTtcbiAgY29uc3QgcG9zaXRpb25hbCA9IGdyb3Vwc1t1c2FnZUluc3RhbmNlLmdldFBvc2l0aW9uYWxHcm91cE5hbWUoKV0gYXMgc3RyaW5nW10gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3QgaGlkZGVuID0gbmV3IFNldChoaWRkZW5PcHRpb25zKTtcbiAgY29uc3Qgbm9ybWFsaXplT3B0aW9uczogSnNvbkhlbHBPcHRpb25bXSA9IFtdO1xuICBjb25zdCBhbGxBbGlhc2VzID0gbmV3IFNldChbLi4uT2JqZWN0LnZhbHVlczxzdHJpbmdbXT4oYWxpYXNlcykuZmxhdCgpXSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZXMsIHR5cGVdIG9mIFtcbiAgICBbYXJyYXksICdhcnJheSddLFxuICAgIFtzdHJpbmcsICdzdHJpbmcnXSxcbiAgICBbYm9vbGVhbiwgJ2Jvb2xlYW4nXSxcbiAgICBbbnVtYmVyLCAnbnVtYmVyJ10sXG4gIF0pIHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgIGlmIChhbGxBbGlhc2VzLmhhcyhuYW1lKSB8fCBoaWRkZW4uaGFzKG5hbWUpKSB7XG4gICAgICAgIC8vIElnbm9yZSBoaWRkZW4sIGFsaWFzZXMgYW5kIGFscmVhZHkgdmlzaXRlZCBvcHRpb24uXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb3NpdGlvbmFsSW5kZXggPSBwb3NpdGlvbmFsPy5pbmRleE9mKG5hbWUpID8/IC0xO1xuICAgICAgY29uc3QgYWxpYXMgPSBhbGlhc2VzW25hbWVdO1xuXG4gICAgICBub3JtYWxpemVPcHRpb25zLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICBkZXByZWNhdGVkOiBkZXByZWNhdGVkT3B0aW9uc1tuYW1lXSxcbiAgICAgICAgYWxpYXNlczogYWxpYXM/Lmxlbmd0aCA+IDAgPyBhbGlhcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgZGVmYXVsdDogZGVmYXVsdFZhbFtuYW1lXSxcbiAgICAgICAgcmVxdWlyZWQ6IGRlbWFuZGVkT3B0aW9uc1tuYW1lXSxcbiAgICAgICAgZW51bTogY2hvaWNlc1tuYW1lXSxcbiAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uc1tuYW1lXT8ucmVwbGFjZSgnX195YXJnc1N0cmluZ19fOicsICcnKSxcbiAgICAgICAgcG9zaXRpb25hbDogcG9zaXRpb25hbEluZGV4ID49IDAgPyBwb3NpdGlvbmFsSW5kZXggOiB1bmRlZmluZWQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFyZ3MveWFyZ3MvYmxvYi8wMGU0ZWJiZTNhY2Q0MzhlNzNmZGIxMDFlNzViNGY4NzllYjZkMzQ1L2xpYi91c2FnZS50cyNMMTI0XG4gIGNvbnN0IHN1YmNvbW1hbmRzID0gKFxuICAgIHVzYWdlSW5zdGFuY2UuZ2V0Q29tbWFuZHMoKSBhcyBbXG4gICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgaXNEZWZhdWx0OiBib29sZWFuLFxuICAgICAgYWxpYXNlczogc3RyaW5nW10sXG4gICAgICBkZXByZWNhdGVkOiBzdHJpbmcgfCBib29sZWFuLFxuICAgIF1bXVxuICApXG4gICAgLm1hcCgoW25hbWUsIHJhd0Rlc2NyaXB0aW9uLCBfLCBhbGlhc2VzLCBkZXByZWNhdGVkXSkgPT4gKHtcbiAgICAgIG5hbWU6IG5hbWUuc3BsaXQoJyAnLCAxKVswXSxcbiAgICAgIGNvbW1hbmQ6IG5hbWUsXG4gICAgICAuLi5wYXJzZURlc2NyaXB0aW9uKHJhd0Rlc2NyaXB0aW9uKSxcbiAgICAgIGFsaWFzZXMsXG4gICAgICBkZXByZWNhdGVkLFxuICAgIH0pKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcblxuICBjb25zdCBbY29tbWFuZCwgcmF3RGVzY3JpcHRpb25dID0gdXNhZ2VJbnN0YW5jZS5nZXRVc2FnZSgpWzBdID8/IFtdO1xuXG4gIGNvbnN0IG91dHB1dDogSnNvbkhlbHAgPSB7XG4gICAgbmFtZTogWy4uLmNvbnRleHQuY29tbWFuZHNdLnBvcCgpLFxuICAgIGNvbW1hbmQ6IGNvbW1hbmQ/LnJlcGxhY2UoJyQwJywgbG9jYWxZYXJnc1snJDAnXSksXG4gICAgLi4ucGFyc2VEZXNjcmlwdGlvbihyYXdEZXNjcmlwdGlvbiksXG4gICAgb3B0aW9uczogbm9ybWFsaXplT3B0aW9ucy5zb3J0KChhLCBiKSA9PiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKSxcbiAgICBzdWJjb21tYW5kczogc3ViY29tbWFuZHMubGVuZ3RoID8gc3ViY29tbWFuZHMgOiB1bmRlZmluZWQsXG4gIH07XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG91dHB1dCwgdW5kZWZpbmVkLCAyKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEZXNjcmlwdGlvbihyYXdEZXNjcmlwdGlvbjogc3RyaW5nKTogSnNvbkhlbHBEZXNjcmlwdGlvbiB7XG4gIHRyeSB7XG4gICAgY29uc3Qge1xuICAgICAgbG9uZ0Rlc2NyaXB0aW9uLFxuICAgICAgZGVzY3JpYmU6IHNob3J0RGVzY3JpcHRpb24sXG4gICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGgsXG4gICAgfSA9IEpTT04ucGFyc2UocmF3RGVzY3JpcHRpb24pIGFzIEZ1bGxEZXNjcmliZTtcblxuICAgIHJldHVybiB7XG4gICAgICBzaG9ydERlc2NyaXB0aW9uLFxuICAgICAgbG9uZ0Rlc2NyaXB0aW9uUmVsYXRpdmVQYXRoLFxuICAgICAgbG9uZ0Rlc2NyaXB0aW9uLFxuICAgIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7XG4gICAgICBzaG9ydERlc2NyaXB0aW9uOiByYXdEZXNjcmlwdGlvbixcbiAgICB9O1xuICB9XG59XG4iXX0=