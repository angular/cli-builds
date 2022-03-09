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
        .map(([name, description, _, aliases, deprecated]) => ({
        name: name.split(' ', 1)[0],
        command: name,
        description,
        aliases,
        deprecated,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const parseDescription = (rawDescription) => {
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
    };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1oZWxwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvanNvbi1oZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILGtEQUEwQjtBQThCMUIsU0FBZ0IsYUFBYTs7SUFDM0IsOERBQThEO0lBQzlELE1BQU0sVUFBVSxHQUFHLGVBQVksQ0FBQztJQUNoQyxNQUFNLEVBQ0osaUJBQWlCLEVBQ2pCLEtBQUssRUFBRSxPQUFPLEVBQ2QsS0FBSyxFQUNMLE1BQU0sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUFFLFVBQVUsRUFDbkIsYUFBYSxHQUFHLEVBQUUsR0FDbkIsR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7SUFFNUIsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDeEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzdDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNyRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxDQUF5QixDQUFDO0lBRTFGLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sZ0JBQWdCLEdBQXFCLEVBQUUsQ0FBQztJQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0s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QU0sTUFBTSxHQUFhO1FBQ3ZCLElBQUksRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRTtRQUNqQyxPQUFPLEVBQUUsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO1FBQ25DLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUztLQUMxRCxDQUFDO0lBRUYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQTFHRCxzQ0EwR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHlhcmdzIGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IEZ1bGxEZXNjcmliZSB9IGZyb20gJy4uL2NvbW1hbmQtbW9kdWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBKc29uSGVscCB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2hvcnREZXNjcmlwdGlvbj86IHN0cmluZztcbiAgY29tbWFuZDogc3RyaW5nO1xuICBsb25nRGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGxvbmdEZXNjcmlwdGlvblJlbGF0aXZlUGF0aD86IHN0cmluZztcbiAgb3B0aW9uczogSnNvbkhlbHBPcHRpb25bXTtcbiAgc3ViY29tbWFuZHM/OiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgYWxpYXNlczogc3RyaW5nW107XG4gICAgZGVwcmVjYXRlZDogc3RyaW5nIHwgYm9vbGVhbjtcbiAgfVtdO1xufVxuXG5pbnRlcmZhY2UgSnNvbkhlbHBPcHRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHR5cGU/OiBzdHJpbmc7XG4gIGRlcHJlY2F0ZWQ6IGJvb2xlYW4gfCBzdHJpbmc7XG4gIGFsaWFzZXM/OiBzdHJpbmdbXTtcbiAgZGVmYXVsdD86IHN0cmluZztcbiAgcmVxdWlyZWQ/OiBib29sZWFuO1xuICBwb3NpdGlvbmFsPzogbnVtYmVyO1xuICBlbnVtPzogc3RyaW5nW107XG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ganNvbkhlbHBVc2FnZSgpOiBzdHJpbmcge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBjb25zdCBsb2NhbFlhcmdzID0geWFyZ3MgYXMgYW55O1xuICBjb25zdCB7XG4gICAgZGVwcmVjYXRlZE9wdGlvbnMsXG4gICAgYWxpYXM6IGFsaWFzZXMsXG4gICAgYXJyYXksXG4gICAgc3RyaW5nLFxuICAgIGJvb2xlYW4sXG4gICAgbnVtYmVyLFxuICAgIGNob2ljZXMsXG4gICAgZGVtYW5kZWRPcHRpb25zLFxuICAgIGRlZmF1bHQ6IGRlZmF1bHRWYWwsXG4gICAgaGlkZGVuT3B0aW9ucyA9IFtdLFxuICB9ID0gbG9jYWxZYXJncy5nZXRPcHRpb25zKCk7XG5cbiAgY29uc3QgaW50ZXJuYWxNZXRob2RzID0gbG9jYWxZYXJncy5nZXRJbnRlcm5hbE1ldGhvZHMoKTtcbiAgY29uc3QgdXNhZ2VJbnN0YW5jZSA9IGludGVybmFsTWV0aG9kcy5nZXRVc2FnZUluc3RhbmNlKCk7XG4gIGNvbnN0IGNvbnRleHQgPSBpbnRlcm5hbE1ldGhvZHMuZ2V0Q29udGV4dCgpO1xuICBjb25zdCBkZXNjcmlwdGlvbnMgPSB1c2FnZUluc3RhbmNlLmdldERlc2NyaXB0aW9ucygpO1xuICBjb25zdCBncm91cHMgPSBsb2NhbFlhcmdzLmdldEdyb3VwcygpO1xuICBjb25zdCBwb3NpdGlvbmFsID0gZ3JvdXBzW3VzYWdlSW5zdGFuY2UuZ2V0UG9zaXRpb25hbEdyb3VwTmFtZSgpXSBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcblxuICBjb25zdCBoaWRkZW4gPSBuZXcgU2V0KGhpZGRlbk9wdGlvbnMpO1xuICBjb25zdCBub3JtYWxpemVPcHRpb25zOiBKc29uSGVscE9wdGlvbltdID0gW107XG4gIGNvbnN0IGFsbEFsaWFzZXMgPSBuZXcgU2V0KFsuLi5PYmplY3QudmFsdWVzPHN0cmluZ1tdPihhbGlhc2VzKS5mbGF0KCldKTtcblxuICBmb3IgKGNvbnN0IFtuYW1lcywgdHlwZV0gb2YgW1xuICAgIFthcnJheSwgJ2FycmF5J10sXG4gICAgW3N0cmluZywgJ3N0cmluZyddLFxuICAgIFtib29sZWFuLCAnYm9vbGVhbiddLFxuICAgIFtudW1iZXIsICdudW1iZXInXSxcbiAgXSkge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgaWYgKGFsbEFsaWFzZXMuaGFzKG5hbWUpIHx8IGhpZGRlbi5oYXMobmFtZSkpIHtcbiAgICAgICAgLy8gSWdub3JlIGhpZGRlbiwgYWxpYXNlcyBhbmQgYWxyZWFkeSB2aXNpdGVkIG9wdGlvbi5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBvc2l0aW9uYWxJbmRleCA9IHBvc2l0aW9uYWw/LmluZGV4T2YobmFtZSkgPz8gLTE7XG4gICAgICBjb25zdCBhbGlhcyA9IGFsaWFzZXNbbmFtZV07XG5cbiAgICAgIG5vcm1hbGl6ZU9wdGlvbnMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGRlcHJlY2F0ZWQ6IGRlcHJlY2F0ZWRPcHRpb25zW25hbWVdLFxuICAgICAgICBhbGlhc2VzOiBhbGlhcz8ubGVuZ3RoID4gMCA/IGFsaWFzIDogdW5kZWZpbmVkLFxuICAgICAgICBkZWZhdWx0OiBkZWZhdWx0VmFsW25hbWVdLFxuICAgICAgICByZXF1aXJlZDogZGVtYW5kZWRPcHRpb25zW25hbWVdLFxuICAgICAgICBlbnVtOiBjaG9pY2VzW25hbWVdLFxuICAgICAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb25zW25hbWVdPy5yZXBsYWNlKCdfX3lhcmdzU3RyaW5nX186JywgJycpLFxuICAgICAgICBwb3NpdGlvbmFsOiBwb3NpdGlvbmFsSW5kZXggPj0gMCA/IHBvc2l0aW9uYWxJbmRleCA6IHVuZGVmaW5lZCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YXJncy95YXJncy9ibG9iLzAwZTRlYmJlM2FjZDQzOGU3M2ZkYjEwMWU3NWI0Zjg3OWViNmQzNDUvbGliL3VzYWdlLnRzI0wxMjRcbiAgY29uc3Qgc3ViY29tbWFuZHMgPSAoXG4gICAgdXNhZ2VJbnN0YW5jZS5nZXRDb21tYW5kcygpIGFzIFtcbiAgICAgIG5hbWU6IHN0cmluZyxcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gICAgICBpc0RlZmF1bHQ6IGJvb2xlYW4sXG4gICAgICBhbGlhc2VzOiBzdHJpbmdbXSxcbiAgICAgIGRlcHJlY2F0ZWQ6IHN0cmluZyB8IGJvb2xlYW4sXG4gICAgXVtdXG4gIClcbiAgICAubWFwKChbbmFtZSwgZGVzY3JpcHRpb24sIF8sIGFsaWFzZXMsIGRlcHJlY2F0ZWRdKSA9PiAoe1xuICAgICAgbmFtZTogbmFtZS5zcGxpdCgnICcsIDEpWzBdLFxuICAgICAgY29tbWFuZDogbmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgYWxpYXNlcyxcbiAgICAgIGRlcHJlY2F0ZWQsXG4gICAgfSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuXG4gIGNvbnN0IHBhcnNlRGVzY3JpcHRpb24gPSAocmF3RGVzY3JpcHRpb246IHN0cmluZyk6IFBhcnRpYWw8SnNvbkhlbHA+ID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qge1xuICAgICAgICBsb25nRGVzY3JpcHRpb24sXG4gICAgICAgIGRlc2NyaWJlOiBzaG9ydERlc2NyaXB0aW9uLFxuICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGgsXG4gICAgICB9ID0gSlNPTi5wYXJzZShyYXdEZXNjcmlwdGlvbikgYXMgRnVsbERlc2NyaWJlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaG9ydERlc2NyaXB0aW9uLFxuICAgICAgICBsb25nRGVzY3JpcHRpb25SZWxhdGl2ZVBhdGgsXG4gICAgICAgIGxvbmdEZXNjcmlwdGlvbixcbiAgICAgIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaG9ydERlc2NyaXB0aW9uOiByYXdEZXNjcmlwdGlvbixcbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IFtjb21tYW5kLCByYXdEZXNjcmlwdGlvbl0gPSB1c2FnZUluc3RhbmNlLmdldFVzYWdlKClbMF0gPz8gW107XG5cbiAgY29uc3Qgb3V0cHV0OiBKc29uSGVscCA9IHtcbiAgICBuYW1lOiBbLi4uY29udGV4dC5jb21tYW5kc10ucG9wKCksXG4gICAgY29tbWFuZDogY29tbWFuZD8ucmVwbGFjZSgnJDAnLCBsb2NhbFlhcmdzWyckMCddKSxcbiAgICAuLi5wYXJzZURlc2NyaXB0aW9uKHJhd0Rlc2NyaXB0aW9uKSxcbiAgICBvcHRpb25zOiBub3JtYWxpemVPcHRpb25zLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpLFxuICAgIHN1YmNvbW1hbmRzOiBzdWJjb21tYW5kcy5sZW5ndGggPyBzdWJjb21tYW5kcyA6IHVuZGVmaW5lZCxcbiAgfTtcblxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkob3V0cHV0LCB1bmRlZmluZWQsIDIpO1xufVxuIl19