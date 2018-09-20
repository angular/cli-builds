"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
const core_1 = require("@angular-devkit/core");
const interface_1 = require("./interface");
class ParseArgumentException extends core_1.BaseException {
    constructor(comments, parsed, ignored) {
        super(`One or more errors occured while parsing arguments:\n  ${comments.join('\n  ')}`);
        this.comments = comments;
        this.parsed = parsed;
        this.ignored = ignored;
    }
}
exports.ParseArgumentException = ParseArgumentException;
function _coerceType(str, type, v) {
    switch (type) {
        case interface_1.OptionType.Any:
            if (Array.isArray(v)) {
                return v.concat(str || '');
            }
            return _coerceType(str, interface_1.OptionType.Boolean, v) !== undefined
                ? _coerceType(str, interface_1.OptionType.Boolean, v)
                : _coerceType(str, interface_1.OptionType.Number, v) !== undefined
                    ? _coerceType(str, interface_1.OptionType.Number, v)
                    : _coerceType(str, interface_1.OptionType.String, v);
        case interface_1.OptionType.String:
            return str || '';
        case interface_1.OptionType.Boolean:
            switch (str) {
                case 'false':
                    return false;
                case undefined:
                case '':
                case 'true':
                    return true;
                default:
                    return undefined;
            }
        case interface_1.OptionType.Number:
            if (str === undefined) {
                return 0;
            }
            else if (Number.isFinite(+str)) {
                return +str;
            }
            else {
                return undefined;
            }
        case interface_1.OptionType.Array:
            return Array.isArray(v) ? v.concat(str || '') : [str || ''];
        default:
            return undefined;
    }
}
function _coerce(str, o, v) {
    if (!o) {
        return _coerceType(str, interface_1.OptionType.Any, v);
    }
    else {
        const types = o.types || [o.type];
        // Try all the types one by one and pick the first one that returns a value contained in the
        // enum. If there's no enum, just return the first one that matches.
        for (const type of types) {
            const maybeResult = _coerceType(str, type, v);
            if (maybeResult !== undefined) {
                if (!o.enum || o.enum.includes(maybeResult)) {
                    return maybeResult;
                }
            }
        }
        return undefined;
    }
}
function _getOptionFromName(name, options) {
    const cName = core_1.strings.camelize(name);
    for (const option of options) {
        if (option.name == name || option.name == cName) {
            return option;
        }
        if (option.aliases.some(x => x == name || x == cName)) {
            return option;
        }
    }
    return undefined;
}
function _assignOption(arg, args, options, parsedOptions, _positionals, leftovers, ignored, errors) {
    let key = arg.substr(2);
    let option = null;
    let value = '';
    const i = arg.indexOf('=');
    // If flag is --no-abc AND there's no equal sign.
    if (i == -1) {
        if (key.startsWith('no-')) {
            // Only use this key if the option matching the rest is a boolean.
            const maybeOption = _getOptionFromName(key.substr(3), options);
            if (maybeOption && maybeOption.type == 'boolean') {
                value = 'false';
                option = maybeOption;
            }
        }
        else if (key.startsWith('no')) {
            // Only use this key if the option matching the rest is a boolean.
            const maybeOption = _getOptionFromName(key.substr(2), options);
            if (maybeOption && maybeOption.type == 'boolean') {
                value = 'false';
                option = maybeOption;
            }
        }
        if (option === null) {
            // Set it to true if it's a boolean and the next argument doesn't match true/false.
            const maybeOption = _getOptionFromName(key, options);
            if (maybeOption) {
                value = args[0];
                let shouldShift = true;
                if (value && value.startsWith('-')) {
                    // Verify if not having a value results in a correct parse, if so don't shift.
                    if (_coerce(undefined, maybeOption) !== undefined) {
                        shouldShift = false;
                    }
                }
                // Only absorb it if it leads to a better value.
                if (shouldShift && _coerce(value, maybeOption) !== undefined) {
                    args.shift();
                }
                else {
                    value = '';
                }
                option = maybeOption;
            }
        }
    }
    else {
        key = arg.substring(0, i);
        option = _getOptionFromName(key, options) || null;
        if (option) {
            value = arg.substring(i + 1);
        }
    }
    if (option === null) {
        if (args[0] && !args[0].startsWith('--')) {
            leftovers.push(arg, args[0]);
            args.shift();
        }
        else {
            leftovers.push(arg);
        }
    }
    else {
        const v = _coerce(value, option, parsedOptions[option.name]);
        if (v !== undefined) {
            parsedOptions[option.name] = v;
        }
        else {
            let error = `Argument ${key} could not be parsed using value ${JSON.stringify(value)}.`;
            if (option.enum) {
                error += ` Valid values are: ${option.enum.map(x => JSON.stringify(x)).join(', ')}.`;
            }
            else {
                error += `Valid type(s) is: ${(option.types || [option.type]).join(', ')}`;
            }
            errors.push(error);
            ignored.push(arg);
        }
    }
}
/**
 * Parse the arguments in a consistent way, but without having any option definition. This tries
 * to assess what the user wants in a free form. For example, using `--name=false` will set the
 * name properties to a boolean type.
 * This should only be used when there's no schema available or if a schema is "true" (anything is
 * valid).
 *
 * @param args Argument list to parse.
 * @returns An object that contains a property per flags from the args.
 */
function parseFreeFormArguments(args) {
    const parsedOptions = {};
    const leftovers = [];
    for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
        if (arg == '--') {
            leftovers.push(...args);
            break;
        }
        if (arg.startsWith('--')) {
            const eqSign = arg.indexOf('=');
            let name;
            let value;
            if (eqSign !== -1) {
                name = arg.substring(2, eqSign);
                value = arg.substring(eqSign + 1);
            }
            else {
                name = arg.substr(2);
                value = args.shift();
            }
            const v = _coerce(value, null, parsedOptions[name]);
            if (v !== undefined) {
                parsedOptions[name] = v;
            }
        }
        else if (arg.startsWith('-')) {
            arg.split('').forEach(x => parsedOptions[x] = true);
        }
        else {
            leftovers.push(arg);
        }
    }
    parsedOptions['--'] = leftovers;
    return parsedOptions;
}
exports.parseFreeFormArguments = parseFreeFormArguments;
/**
 * Parse the arguments in a consistent way, from a list of standardized options.
 * The result object will have a key per option name, with the `_` key reserved for positional
 * arguments, and `--` will contain everything that did not match. Any key that don't have an
 * option will be pushed back in `--` and removed from the object. If you need to validate that
 * there's no additionalProperties, you need to check the `--` key.
 *
 * @param args The argument array to parse.
 * @param options List of supported options. {@see Option}.
 * @returns An object that contains a property per option.
 */
function parseArguments(args, options) {
    if (options === null) {
        options = [];
    }
    const leftovers = [];
    const positionals = [];
    const parsedOptions = {};
    const ignored = [];
    const errors = [];
    for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
        if (!arg) {
            break;
        }
        if (arg == '--') {
            // If we find a --, we're done.
            leftovers.push(...args);
            break;
        }
        if (arg.startsWith('--')) {
            _assignOption(arg, args, options, parsedOptions, positionals, leftovers, ignored, errors);
        }
        else if (arg.startsWith('-')) {
            // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
            for (let i = 1; i < arg.length; i++) {
                const flag = arg[i];
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    const arg = '--' + flag;
                    _assignOption(arg, args, options, parsedOptions, positionals, leftovers, ignored, errors);
                }
                else {
                    const maybeOption = _getOptionFromName(flag, options);
                    if (maybeOption) {
                        const v = _coerce(undefined, maybeOption, parsedOptions[maybeOption.name]);
                        if (v !== undefined) {
                            parsedOptions[maybeOption.name] = v;
                        }
                    }
                }
            }
        }
        else {
            positionals.push(arg);
        }
    }
    // Deal with positionals.
    if (positionals.length > 0) {
        let pos = 0;
        for (let i = 0; i < positionals.length;) {
            let found = false;
            let incrementPos = false;
            let incrementI = true;
            // We do this with a found flag because more than 1 option could have the same positional.
            for (const option of options) {
                // If any option has this positional and no value, we need to remove it.
                if (option.positional === pos) {
                    if (parsedOptions[option.name] === undefined) {
                        parsedOptions[option.name] = positionals[i];
                        found = true;
                    }
                    else {
                        incrementI = false;
                    }
                    incrementPos = true;
                }
            }
            if (found) {
                positionals.splice(i--, 1);
            }
            if (incrementPos) {
                pos++;
            }
            if (incrementI) {
                i++;
            }
        }
    }
    if (positionals.length > 0 || leftovers.length > 0) {
        parsedOptions['--'] = [...positionals, ...leftovers];
    }
    if (errors.length > 0) {
        throw new ParseArgumentException(errors, parsedOptions, ignored);
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUE4RDtBQUM5RCwyQ0FBbUU7QUFHbkUsTUFBYSxzQkFBdUIsU0FBUSxvQkFBYTtJQUN2RCxZQUNrQixRQUFrQixFQUNsQixNQUFpQixFQUNqQixPQUFpQjtRQUVqQyxLQUFLLENBQUMsMERBQTBELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBSnpFLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBR25DLENBQUM7Q0FDRjtBQVJELHdEQVFDO0FBR0QsU0FBUyxXQUFXLENBQUMsR0FBdUIsRUFBRSxJQUFnQixFQUFFLENBQVM7SUFDdkUsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLHNCQUFVLENBQUMsR0FBRztZQUNqQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUI7WUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztnQkFDdkQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUN0RCxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7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LEtBQUssR0FBRyxFQUFFO29CQUM3QixJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO3dCQUM1QyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDNUMsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDt5QkFBTTt3QkFDTCxVQUFVLEdBQUcsS0FBSyxDQUFDO3FCQUNwQjtvQkFDRCxZQUFZLEdBQUcsSUFBSSxDQUFDO2lCQUNyQjthQUNGO1lBRUQsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUM1QjtZQUNELElBQUksWUFBWSxFQUFFO2dCQUNoQixHQUFHLEVBQUUsQ0FBQzthQUNQO1lBQ0QsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsQ0FBQyxFQUFFLENBQUM7YUFDTDtTQUNGO0tBQ0Y7SUFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ2xELGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7S0FDdEQ7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2xFO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQTVGRCx3Q0E0RkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICpcbiAqL1xuaW1wb3J0IHsgQmFzZUV4Y2VwdGlvbiwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uLCBPcHRpb25UeXBlLCBWYWx1ZSB9IGZyb20gJy4vaW50ZXJmYWNlJztcblxuXG5leHBvcnQgY2xhc3MgUGFyc2VBcmd1bWVudEV4Y2VwdGlvbiBleHRlbmRzIEJhc2VFeGNlcHRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29tbWVudHM6IHN0cmluZ1tdLFxuICAgIHB1YmxpYyByZWFkb25seSBwYXJzZWQ6IEFyZ3VtZW50cyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgaWdub3JlZDogc3RyaW5nW10sXG4gICkge1xuICAgIHN1cGVyKGBPbmUgb3IgbW9yZSBlcnJvcnMgb2NjdXJlZCB3aGlsZSBwYXJzaW5nIGFyZ3VtZW50czpcXG4gICR7Y29tbWVudHMuam9pbignXFxuICAnKX1gKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9jb2VyY2VUeXBlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBPcHRpb25UeXBlLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgT3B0aW9uVHlwZS5Bbnk6XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICByZXR1cm4gdi5jb25jYXQoc3RyIHx8ICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5Cb29sZWFuLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpXG4gICAgICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdikgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICA/IF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5OdW1iZXIsIHYpXG4gICAgICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLlN0cmluZywgdik7XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuU3RyaW5nOlxuICAgICAgcmV0dXJuIHN0ciB8fCAnJztcblxuICAgIGNhc2UgT3B0aW9uVHlwZS5Cb29sZWFuOlxuICAgICAgc3dpdGNoIChzdHIpIHtcbiAgICAgICAgY2FzZSAnZmFsc2UnOlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAndHJ1ZSc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgY2FzZSBPcHRpb25UeXBlLk51bWJlcjpcbiAgICAgIGlmIChzdHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gZWxzZSBpZiAoTnVtYmVyLmlzRmluaXRlKCtzdHIpKSB7XG4gICAgICAgIHJldHVybiArc3RyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgT3B0aW9uVHlwZS5BcnJheTpcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHYpID8gdi5jb25jYXQoc3RyIHx8ICcnKSA6IFtzdHIgfHwgJyddO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvZXJjZShzdHI6IHN0cmluZyB8IHVuZGVmaW5lZCwgbzogT3B0aW9uIHwgbnVsbCwgdj86IFZhbHVlKTogVmFsdWUgfCB1bmRlZmluZWQge1xuICBpZiAoIW8pIHtcbiAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkFueSwgdik7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHlwZXMgPSBvLnR5cGVzIHx8IFtvLnR5cGVdO1xuXG4gICAgLy8gVHJ5IGFsbCB0aGUgdHlwZXMgb25lIGJ5IG9uZSBhbmQgcGljayB0aGUgZmlyc3Qgb25lIHRoYXQgcmV0dXJucyBhIHZhbHVlIGNvbnRhaW5lZCBpbiB0aGVcbiAgICAvLyBlbnVtLiBJZiB0aGVyZSdzIG5vIGVudW0sIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBvbmUgdGhhdCBtYXRjaGVzLlxuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgY29uc3QgbWF5YmVSZXN1bHQgPSBfY29lcmNlVHlwZShzdHIsIHR5cGUsIHYpO1xuICAgICAgaWYgKG1heWJlUmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFvLmVudW0gfHwgby5lbnVtLmluY2x1ZGVzKG1heWJlUmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiBtYXliZVJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0T3B0aW9uRnJvbU5hbWUobmFtZTogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25bXSk6IE9wdGlvbiB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGNOYW1lID0gc3RyaW5ncy5jYW1lbGl6ZShuYW1lKTtcblxuICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbi5uYW1lID09IG5hbWUgfHwgb3B0aW9uLm5hbWUgPT0gY05hbWUpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbi5hbGlhc2VzLnNvbWUoeCA9PiB4ID09IG5hbWUgfHwgeCA9PSBjTmFtZSkpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfYXNzaWduT3B0aW9uKFxuICBhcmc6IHN0cmluZyxcbiAgYXJnczogc3RyaW5nW10sXG4gIG9wdGlvbnM6IE9wdGlvbltdLFxuICBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMsXG4gIF9wb3NpdGlvbmFsczogc3RyaW5nW10sXG4gIGxlZnRvdmVyczogc3RyaW5nW10sXG4gIGlnbm9yZWQ6IHN0cmluZ1tdLFxuICBlcnJvcnM6IHN0cmluZ1tdLFxuKSB7XG4gIGxldCBrZXkgPSBhcmcuc3Vic3RyKDIpO1xuICBsZXQgb3B0aW9uOiBPcHRpb24gfCBudWxsID0gbnVsbDtcbiAgbGV0IHZhbHVlID0gJyc7XG4gIGNvbnN0IGkgPSBhcmcuaW5kZXhPZignPScpO1xuXG4gIC8vIElmIGZsYWcgaXMgLS1uby1hYmMgQU5EIHRoZXJlJ3Mgbm8gZXF1YWwgc2lnbi5cbiAgaWYgKGkgPT0gLTEpIHtcbiAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ25vLScpKSB7XG4gICAgICAvLyBPbmx5IHVzZSB0aGlzIGtleSBpZiB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSByZXN0IGlzIGEgYm9vbGVhbi5cbiAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleS5zdWJzdHIoMyksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uICYmIG1heWJlT3B0aW9uLnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHZhbHVlID0gJ2ZhbHNlJztcbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8nKSkge1xuICAgICAgLy8gT25seSB1c2UgdGhpcyBrZXkgaWYgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgcmVzdCBpcyBhIGJvb2xlYW4uXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXkuc3Vic3RyKDIpLCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbiAmJiBtYXliZU9wdGlvbi50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICB2YWx1ZSA9ICdmYWxzZSc7XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb24gPT09IG51bGwpIHtcbiAgICAgIC8vIFNldCBpdCB0byB0cnVlIGlmIGl0J3MgYSBib29sZWFuIGFuZCB0aGUgbmV4dCBhcmd1bWVudCBkb2Vzbid0IG1hdGNoIHRydWUvZmFsc2UuXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgIHZhbHVlID0gYXJnc1swXTtcbiAgICAgICAgbGV0IHNob3VsZFNoaWZ0ID0gdHJ1ZTtcblxuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgICAgLy8gVmVyaWZ5IGlmIG5vdCBoYXZpbmcgYSB2YWx1ZSByZXN1bHRzIGluIGEgY29ycmVjdCBwYXJzZSwgaWYgc28gZG9uJ3Qgc2hpZnQuXG4gICAgICAgICAgaWYgKF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2hvdWxkU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGFic29yYiBpdCBpZiBpdCBsZWFkcyB0byBhIGJldHRlciB2YWx1ZS5cbiAgICAgICAgaWYgKHNob3VsZFNoaWZ0ICYmIF9jb2VyY2UodmFsdWUsIG1heWJlT3B0aW9uKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgYXJncy5zaGlmdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGtleSA9IGFyZy5zdWJzdHJpbmcoMCwgaSk7XG4gICAgb3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleSwgb3B0aW9ucykgfHwgbnVsbDtcbiAgICBpZiAob3B0aW9uKSB7XG4gICAgICB2YWx1ZSA9IGFyZy5zdWJzdHJpbmcoaSArIDEpO1xuICAgIH1cbiAgfVxuICBpZiAob3B0aW9uID09PSBudWxsKSB7XG4gICAgaWYgKGFyZ3NbMF0gJiYgIWFyZ3NbMF0uc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnLCBhcmdzWzBdKTtcbiAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdiA9IF9jb2VyY2UodmFsdWUsIG9wdGlvbiwgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0pO1xuICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGVycm9yID0gYEFyZ3VtZW50ICR7a2V5fSBjb3VsZCBub3QgYmUgcGFyc2VkIHVzaW5nIHZhbHVlICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfS5gO1xuICAgICAgaWYgKG9wdGlvbi5lbnVtKSB7XG4gICAgICAgIGVycm9yICs9IGAgVmFsaWQgdmFsdWVzIGFyZTogJHtvcHRpb24uZW51bS5tYXAoeCA9PiBKU09OLnN0cmluZ2lmeSh4KSkuam9pbignLCAnKX0uYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yICs9IGBWYWxpZCB0eXBlKHMpIGlzOiAkeyhvcHRpb24udHlwZXMgfHwgW29wdGlvbi50eXBlXSkuam9pbignLCAnKX1gO1xuICAgICAgfVxuXG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgICBpZ25vcmVkLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cbn1cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgYnV0IHdpdGhvdXQgaGF2aW5nIGFueSBvcHRpb24gZGVmaW5pdGlvbi4gVGhpcyB0cmllc1xuICogdG8gYXNzZXNzIHdoYXQgdGhlIHVzZXIgd2FudHMgaW4gYSBmcmVlIGZvcm0uIEZvciBleGFtcGxlLCB1c2luZyBgLS1uYW1lPWZhbHNlYCB3aWxsIHNldCB0aGVcbiAqIG5hbWUgcHJvcGVydGllcyB0byBhIGJvb2xlYW4gdHlwZS5cbiAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB3aGVuIHRoZXJlJ3Mgbm8gc2NoZW1hIGF2YWlsYWJsZSBvciBpZiBhIHNjaGVtYSBpcyBcInRydWVcIiAoYW55dGhpbmcgaXNcbiAqIHZhbGlkKS5cbiAqXG4gKiBAcGFyYW0gYXJncyBBcmd1bWVudCBsaXN0IHRvIHBhcnNlLlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgZmxhZ3MgZnJvbSB0aGUgYXJncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoYXJnczogc3RyaW5nW10pOiBBcmd1bWVudHMge1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcbiAgY29uc3QgbGVmdG92ZXJzID0gW107XG5cbiAgZm9yIChsZXQgYXJnID0gYXJncy5zaGlmdCgpOyBhcmcgIT09IHVuZGVmaW5lZDsgYXJnID0gYXJncy5zaGlmdCgpKSB7XG4gICAgaWYgKGFyZyA9PSAnLS0nKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaCguLi5hcmdzKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgY29uc3QgZXFTaWduID0gYXJnLmluZGV4T2YoJz0nKTtcbiAgICAgIGxldCBuYW1lOiBzdHJpbmc7XG4gICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChlcVNpZ24gIT09IC0xKSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyaW5nKDIsIGVxU2lnbik7XG4gICAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhlcVNpZ24gKyAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyKDIpO1xuICAgICAgICB2YWx1ZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdiA9IF9jb2VyY2UodmFsdWUsIG51bGwsIHBhcnNlZE9wdGlvbnNbbmFtZV0pO1xuICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJzZWRPcHRpb25zW25hbWVdID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGFyZy5zcGxpdCgnJykuZm9yRWFjaCh4ID0+IHBhcnNlZE9wdGlvbnNbeF0gPSB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZWRPcHRpb25zWyctLSddID0gbGVmdG92ZXJzO1xuXG4gIHJldHVybiBwYXJzZWRPcHRpb25zO1xufVxuXG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyBpbiBhIGNvbnNpc3RlbnQgd2F5LCBmcm9tIGEgbGlzdCBvZiBzdGFuZGFyZGl6ZWQgb3B0aW9ucy5cbiAqIFRoZSByZXN1bHQgb2JqZWN0IHdpbGwgaGF2ZSBhIGtleSBwZXIgb3B0aW9uIG5hbWUsIHdpdGggdGhlIGBfYCBrZXkgcmVzZXJ2ZWQgZm9yIHBvc2l0aW9uYWxcbiAqIGFyZ3VtZW50cywgYW5kIGAtLWAgd2lsbCBjb250YWluIGV2ZXJ5dGhpbmcgdGhhdCBkaWQgbm90IG1hdGNoLiBBbnkga2V5IHRoYXQgZG9uJ3QgaGF2ZSBhblxuICogb3B0aW9uIHdpbGwgYmUgcHVzaGVkIGJhY2sgaW4gYC0tYCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBvYmplY3QuIElmIHlvdSBuZWVkIHRvIHZhbGlkYXRlIHRoYXRcbiAqIHRoZXJlJ3Mgbm8gYWRkaXRpb25hbFByb3BlcnRpZXMsIHlvdSBuZWVkIHRvIGNoZWNrIHRoZSBgLS1gIGtleS5cbiAqXG4gKiBAcGFyYW0gYXJncyBUaGUgYXJndW1lbnQgYXJyYXkgdG8gcGFyc2UuXG4gKiBAcGFyYW0gb3B0aW9ucyBMaXN0IG9mIHN1cHBvcnRlZCBvcHRpb25zLiB7QHNlZSBPcHRpb259LlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgb3B0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoYXJnczogc3RyaW5nW10sIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCk6IEFyZ3VtZW50cyB7XG4gIGlmIChvcHRpb25zID09PSBudWxsKSB7XG4gICAgb3B0aW9ucyA9IFtdO1xuICB9XG5cbiAgY29uc3QgbGVmdG92ZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwb3NpdGlvbmFsczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzID0ge307XG5cbiAgY29uc3QgaWdub3JlZDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmICghYXJnKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnID09ICctLScpIHtcbiAgICAgIC8vIElmIHdlIGZpbmQgYSAtLSwgd2UncmUgZG9uZS5cbiAgICAgIGxlZnRvdmVycy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdGFydHNXaXRoKCctLScpKSB7XG4gICAgICBfYXNzaWduT3B0aW9uKGFyZywgYXJncywgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycywgaWdub3JlZCwgZXJyb3JzKTtcbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIC8vIEFyZ3VtZW50IGlzIG9mIGZvcm0gLWFiY2RlZi4gIFN0YXJ0cyBhdCAxIGJlY2F1c2Ugd2Ugc2tpcCB0aGUgYC1gLlxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGFyZ1tpXTtcbiAgICAgICAgLy8gVHJlYXQgdGhlIGxhc3QgZmxhZyBhcyBgLS1hYCAoYXMgaWYgZnVsbCBmbGFnIGJ1dCBqdXN0IG9uZSBsZXR0ZXIpLiBXZSBkbyB0aGlzIGluXG4gICAgICAgIC8vIHRoZSBsb29wIGJlY2F1c2UgaXQgc2F2ZXMgdXMgYSBjaGVjayB0byBzZWUgaWYgdGhlIGFyZyBpcyBqdXN0IGAtYC5cbiAgICAgICAgaWYgKGkgPT0gYXJnLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBjb25zdCBhcmcgPSAnLS0nICsgZmxhZztcbiAgICAgICAgICBfYXNzaWduT3B0aW9uKGFyZywgYXJncywgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycywgaWdub3JlZCwgZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShmbGFnLCBvcHRpb25zKTtcbiAgICAgICAgICBpZiAobWF5YmVPcHRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHYgPSBfY29lcmNlKHVuZGVmaW5lZCwgbWF5YmVPcHRpb24sIHBhcnNlZE9wdGlvbnNbbWF5YmVPcHRpb24ubmFtZV0pO1xuICAgICAgICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBwYXJzZWRPcHRpb25zW21heWJlT3B0aW9uLm5hbWVdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcG9zaXRpb25hbHMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERlYWwgd2l0aCBwb3NpdGlvbmFscy5cbiAgaWYgKHBvc2l0aW9uYWxzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgcG9zID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBvc2l0aW9uYWxzLmxlbmd0aDspIHtcbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgbGV0IGluY3JlbWVudFBvcyA9IGZhbHNlO1xuICAgICAgbGV0IGluY3JlbWVudEkgPSB0cnVlO1xuXG4gICAgICAvLyBXZSBkbyB0aGlzIHdpdGggYSBmb3VuZCBmbGFnIGJlY2F1c2UgbW9yZSB0aGFuIDEgb3B0aW9uIGNvdWxkIGhhdmUgdGhlIHNhbWUgcG9zaXRpb25hbC5cbiAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gSWYgYW55IG9wdGlvbiBoYXMgdGhpcyBwb3NpdGlvbmFsIGFuZCBubyB2YWx1ZSwgd2UgbmVlZCB0byByZW1vdmUgaXQuXG4gICAgICAgIGlmIChvcHRpb24ucG9zaXRpb25hbCA9PT0gcG9zKSB7XG4gICAgICAgICAgaWYgKHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gcG9zaXRpb25hbHNbaV07XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluY3JlbWVudEkgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5jcmVtZW50UG9zID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgcG9zaXRpb25hbHMuc3BsaWNlKGktLSwgMSk7XG4gICAgICB9XG4gICAgICBpZiAoaW5jcmVtZW50UG9zKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgfVxuICAgICAgaWYgKGluY3JlbWVudEkpIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwIHx8IGxlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IFsuLi5wb3NpdGlvbmFscywgLi4ubGVmdG92ZXJzXTtcbiAgfVxuXG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBQYXJzZUFyZ3VtZW50RXhjZXB0aW9uKGVycm9ycywgcGFyc2VkT3B0aW9ucywgaWdub3JlZCk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cbiJdfQ==