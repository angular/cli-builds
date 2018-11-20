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
            else if (str === '') {
                return undefined;
            }
            else if (Number.isFinite(+str)) {
                return +str;
            }
            else {
                return undefined;
            }
        case interface_1.OptionType.Array:
            return Array.isArray(v)
                ? v.concat(str || '')
                : v === undefined
                    ? [str || '']
                    : [v + '', str || ''];
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
    const camelName = /(-|_)/.test(name)
        ? core_1.strings.camelize(name)
        : name;
    for (const option of options) {
        if (option.name === name || option.name === camelName) {
            return option;
        }
        if (option.aliases.some(x => x === name || x === camelName)) {
            return option;
        }
    }
    return undefined;
}
function _removeLeadingDashes(key) {
    const from = key.startsWith('--') ? 2 : key.startsWith('-') ? 1 : 0;
    return key.substr(from);
}
function _assignOption(arg, args, { options, parsedOptions, leftovers, ignored, errors, warnings }) {
    const from = arg.startsWith('--') ? 2 : 1;
    let key = arg.substr(from);
    let option = null;
    let value = '';
    const i = arg.indexOf('=');
    // If flag is --no-abc AND there's no equal sign.
    if (i == -1) {
        if (key.startsWith('no')) {
            // Only use this key if the option matching the rest is a boolean.
            const from = key.startsWith('no-') ? 3 : 2;
            const maybeOption = _getOptionFromName(core_1.strings.camelize(key.substr(from)), options);
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
        option = _getOptionFromName(_removeLeadingDashes(key), options) || null;
        if (option) {
            value = arg.substring(i + 1);
        }
    }
    if (option === null) {
        if (args[0] && !args[0].startsWith('-')) {
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
            if (parsedOptions[option.name] !== v) {
                if (parsedOptions[option.name] !== undefined) {
                    warnings.push(`Option ${JSON.stringify(option.name)} was already specified with value `
                        + `${JSON.stringify(parsedOptions[option.name])}. The new value ${JSON.stringify(v)} `
                        + `will override it.`);
                }
                parsedOptions[option.name] = v;
                if (option.deprecated !== undefined && option.deprecated !== false) {
                    warnings.push(`Option ${JSON.stringify(option.name)} is deprecated${typeof option.deprecated == 'string' ? ': ' + option.deprecated : ''}.`);
                }
            }
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
 * @param logger Logger to use to warn users.
 * @returns An object that contains a property per option.
 */
function parseArguments(args, options, logger) {
    if (options === null) {
        options = [];
    }
    const leftovers = [];
    const positionals = [];
    const parsedOptions = {};
    const ignored = [];
    const errors = [];
    const warnings = [];
    const state = { options, parsedOptions, positionals, leftovers, ignored, errors, warnings };
    for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
        if (arg == '--') {
            // If we find a --, we're done.
            leftovers.push(...args);
            break;
        }
        if (arg.startsWith('--')) {
            _assignOption(arg, args, state);
        }
        else if (arg.startsWith('-')) {
            // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
            for (let i = 1; i < arg.length; i++) {
                const flag = arg[i];
                // If the next character is an '=', treat it as a long flag.
                if (arg[i + 1] == '=') {
                    const f = '-' + flag + arg.slice(i + 1);
                    _assignOption(f, args, state);
                    break;
                }
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    const arg = '-' + flag;
                    _assignOption(arg, args, state);
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
    // TODO(hansl): this is by far the most complex piece of code in this file. Try to refactor it
    //   simpler.
    if (positionals.length > 0) {
        let pos = 0;
        for (let i = 0; i < positionals.length;) {
            let found = false;
            let incrementPos = false;
            let incrementI = true;
            // We do this with a found flag because more than 1 option could have the same positional.
            for (const option of options) {
                // If any option has this positional and no value, AND fit the type, we need to remove it.
                if (option.positional === pos) {
                    const coercedValue = _coerce(positionals[i], option, parsedOptions[option.name]);
                    if (parsedOptions[option.name] === undefined && coercedValue !== undefined) {
                        parsedOptions[option.name] = coercedValue;
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
    if (warnings.length > 0 && logger) {
        warnings.forEach(message => logger.warn(message));
    }
    if (errors.length > 0) {
        throw new ParseArgumentException(errors, parsedOptions, ignored);
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUF1RTtBQUN2RSwyQ0FBbUU7QUFHbkUsTUFBYSxzQkFBdUIsU0FBUSxvQkFBYTtJQUN2RCxZQUNrQixRQUFrQixFQUNsQixNQUFpQixFQUNqQixPQUFpQjtRQUVqQyxLQUFLLENBQUMsMERBQTBELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBSnpFLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBR25DLENBQUM7Q0FDRjtBQVJELHdEQVFDO0FBR0QsU0FBUyxXQUFXLENBQUMsR0FBdUIsRUFBRSxJQUFnQixFQUFFLENBQVM7SUFDdkUsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLHNCQUFVLENBQUMsR0FBRztZQUNqQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUI7WUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztnQkFDMUQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUNwRCxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7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QVUsRUFBRTtnQkFDZCxDQUFDLEVBQUUsQ0FBQzthQUNMO1NBQ0Y7S0FDRjtJQUVELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbEQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztLQUN0RDtJQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxFQUFFO1FBQ2pDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDbkQ7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2xFO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQTVHRCx3Q0E0R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICpcbiAqL1xuaW1wb3J0IHsgQmFzZUV4Y2VwdGlvbiwgbG9nZ2luZywgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uLCBPcHRpb25UeXBlLCBWYWx1ZSB9IGZyb20gJy4vaW50ZXJmYWNlJztcblxuXG5leHBvcnQgY2xhc3MgUGFyc2VBcmd1bWVudEV4Y2VwdGlvbiBleHRlbmRzIEJhc2VFeGNlcHRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29tbWVudHM6IHN0cmluZ1tdLFxuICAgIHB1YmxpYyByZWFkb25seSBwYXJzZWQ6IEFyZ3VtZW50cyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgaWdub3JlZDogc3RyaW5nW10sXG4gICkge1xuICAgIHN1cGVyKGBPbmUgb3IgbW9yZSBlcnJvcnMgb2NjdXJlZCB3aGlsZSBwYXJzaW5nIGFyZ3VtZW50czpcXG4gICR7Y29tbWVudHMuam9pbignXFxuICAnKX1gKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9jb2VyY2VUeXBlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBPcHRpb25UeXBlLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgT3B0aW9uVHlwZS5Bbnk6XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICByZXR1cm4gdi5jb25jYXQoc3RyIHx8ICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5Cb29sZWFuLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpXG4gICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdikgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdilcbiAgICAgICAgICA6IF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5TdHJpbmcsIHYpO1xuXG4gICAgY2FzZSBPcHRpb25UeXBlLlN0cmluZzpcbiAgICAgIHJldHVybiBzdHIgfHwgJyc7XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuQm9vbGVhbjpcbiAgICAgIHN3aXRjaCAoc3RyKSB7XG4gICAgICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgIGNhc2UgJ3RydWUnOlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgT3B0aW9uVHlwZS5OdW1iZXI6XG4gICAgICBpZiAoc3RyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9IGVsc2UgaWYgKHN0ciA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAoTnVtYmVyLmlzRmluaXRlKCtzdHIpKSB7XG4gICAgICAgIHJldHVybiArc3RyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgT3B0aW9uVHlwZS5BcnJheTpcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHYpXG4gICAgICAgID8gdi5jb25jYXQoc3RyIHx8ICcnKVxuICAgICAgICA6IHYgPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gW3N0ciB8fCAnJ11cbiAgICAgICAgICA6IFt2ICsgJycsIHN0ciB8fCAnJ107XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY29lcmNlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCBvOiBPcHRpb24gfCBudWxsLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGlmICghbykge1xuICAgIHJldHVybiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuQW55LCB2KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB0eXBlcyA9IG8udHlwZXMgfHwgW28udHlwZV07XG5cbiAgICAvLyBUcnkgYWxsIHRoZSB0eXBlcyBvbmUgYnkgb25lIGFuZCBwaWNrIHRoZSBmaXJzdCBvbmUgdGhhdCByZXR1cm5zIGEgdmFsdWUgY29udGFpbmVkIGluIHRoZVxuICAgIC8vIGVudW0uIElmIHRoZXJlJ3Mgbm8gZW51bSwganVzdCByZXR1cm4gdGhlIGZpcnN0IG9uZSB0aGF0IG1hdGNoZXMuXG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKSB7XG4gICAgICBjb25zdCBtYXliZVJlc3VsdCA9IF9jb2VyY2VUeXBlKHN0ciwgdHlwZSwgdik7XG4gICAgICBpZiAobWF5YmVSZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIW8uZW51bSB8fCBvLmVudW0uaW5jbHVkZXMobWF5YmVSZXN1bHQpKSB7XG4gICAgICAgICAgcmV0dXJuIG1heWJlUmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9nZXRPcHRpb25Gcm9tTmFtZShuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IE9wdGlvbltdKTogT3B0aW9uIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgY2FtZWxOYW1lID0gLygtfF8pLy50ZXN0KG5hbWUpXG4gICAgPyBzdHJpbmdzLmNhbWVsaXplKG5hbWUpXG4gICAgOiBuYW1lO1xuXG4gIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9uLm5hbWUgPT09IG5hbWUgfHwgb3B0aW9uLm5hbWUgPT09IGNhbWVsTmFtZSkge1xuICAgICAgcmV0dXJuIG9wdGlvbjtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9uLmFsaWFzZXMuc29tZSh4ID0+IHggPT09IG5hbWUgfHwgeCA9PT0gY2FtZWxOYW1lKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlTGVhZGluZ0Rhc2hlcyhrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGZyb20gPSBrZXkuc3RhcnRzV2l0aCgnLS0nKSA/IDIgOiBrZXkuc3RhcnRzV2l0aCgnLScpID8gMSA6IDA7XG5cbiAgcmV0dXJuIGtleS5zdWJzdHIoZnJvbSk7XG59XG5cbmZ1bmN0aW9uIF9hc3NpZ25PcHRpb24oXG4gIGFyZzogc3RyaW5nLFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgeyBvcHRpb25zLCBwYXJzZWRPcHRpb25zLCBsZWZ0b3ZlcnMsIGlnbm9yZWQsIGVycm9ycywgd2FybmluZ3MgfToge1xuICAgIG9wdGlvbnM6IE9wdGlvbltdLFxuICAgIHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyxcbiAgICBwb3NpdGlvbmFsczogc3RyaW5nW10sXG4gICAgbGVmdG92ZXJzOiBzdHJpbmdbXSxcbiAgICBpZ25vcmVkOiBzdHJpbmdbXSxcbiAgICBlcnJvcnM6IHN0cmluZ1tdLFxuICAgIHdhcm5pbmdzOiBzdHJpbmdbXSxcbiAgfSxcbikge1xuICBjb25zdCBmcm9tID0gYXJnLnN0YXJ0c1dpdGgoJy0tJykgPyAyIDogMTtcbiAgbGV0IGtleSA9IGFyZy5zdWJzdHIoZnJvbSk7XG4gIGxldCBvcHRpb246IE9wdGlvbiB8IG51bGwgPSBudWxsO1xuICBsZXQgdmFsdWUgPSAnJztcbiAgY29uc3QgaSA9IGFyZy5pbmRleE9mKCc9Jyk7XG5cbiAgLy8gSWYgZmxhZyBpcyAtLW5vLWFiYyBBTkQgdGhlcmUncyBubyBlcXVhbCBzaWduLlxuICBpZiAoaSA9PSAtMSkge1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8nKSkge1xuICAgICAgLy8gT25seSB1c2UgdGhpcyBrZXkgaWYgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgcmVzdCBpcyBhIGJvb2xlYW4uXG4gICAgICBjb25zdCBmcm9tID0ga2V5LnN0YXJ0c1dpdGgoJ25vLScpID8gMyA6IDI7XG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShzdHJpbmdzLmNhbWVsaXplKGtleS5zdWJzdHIoZnJvbSkpLCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbiAmJiBtYXliZU9wdGlvbi50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICB2YWx1ZSA9ICdmYWxzZSc7XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb24gPT09IG51bGwpIHtcbiAgICAgIC8vIFNldCBpdCB0byB0cnVlIGlmIGl0J3MgYSBib29sZWFuIGFuZCB0aGUgbmV4dCBhcmd1bWVudCBkb2Vzbid0IG1hdGNoIHRydWUvZmFsc2UuXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgIHZhbHVlID0gYXJnc1swXTtcbiAgICAgICAgbGV0IHNob3VsZFNoaWZ0ID0gdHJ1ZTtcblxuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgICAgLy8gVmVyaWZ5IGlmIG5vdCBoYXZpbmcgYSB2YWx1ZSByZXN1bHRzIGluIGEgY29ycmVjdCBwYXJzZSwgaWYgc28gZG9uJ3Qgc2hpZnQuXG4gICAgICAgICAgaWYgKF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2hvdWxkU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGFic29yYiBpdCBpZiBpdCBsZWFkcyB0byBhIGJldHRlciB2YWx1ZS5cbiAgICAgICAgaWYgKHNob3VsZFNoaWZ0ICYmIF9jb2VyY2UodmFsdWUsIG1heWJlT3B0aW9uKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgYXJncy5zaGlmdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGtleSA9IGFyZy5zdWJzdHJpbmcoMCwgaSk7XG4gICAgb3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKF9yZW1vdmVMZWFkaW5nRGFzaGVzKGtleSksIG9wdGlvbnMpIHx8IG51bGw7XG4gICAgaWYgKG9wdGlvbikge1xuICAgICAgdmFsdWUgPSBhcmcuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0aW9uID09PSBudWxsKSB7XG4gICAgaWYgKGFyZ3NbMF0gJiYgIWFyZ3NbMF0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcsIGFyZ3NbMF0pO1xuICAgICAgYXJncy5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCB2ID0gX2NvZXJjZSh2YWx1ZSwgb3B0aW9uLCBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSk7XG4gICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdICE9PSB2KSB7XG4gICAgICAgIGlmIChwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgd2FybmluZ3MucHVzaChcbiAgICAgICAgICAgIGBPcHRpb24gJHtKU09OLnN0cmluZ2lmeShvcHRpb24ubmFtZSl9IHdhcyBhbHJlYWR5IHNwZWNpZmllZCB3aXRoIHZhbHVlIGBcbiAgICAgICAgICAgICsgYCR7SlNPTi5zdHJpbmdpZnkocGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0pfS4gVGhlIG5ldyB2YWx1ZSAke0pTT04uc3RyaW5naWZ5KHYpfSBgXG4gICAgICAgICAgICArIGB3aWxsIG92ZXJyaWRlIGl0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gdjtcblxuICAgICAgICBpZiAob3B0aW9uLmRlcHJlY2F0ZWQgIT09IHVuZGVmaW5lZCAmJiBvcHRpb24uZGVwcmVjYXRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKGBPcHRpb24gJHtKU09OLnN0cmluZ2lmeShvcHRpb24ubmFtZSl9IGlzIGRlcHJlY2F0ZWQke1xuICAgICAgICAgICAgdHlwZW9mIG9wdGlvbi5kZXByZWNhdGVkID09ICdzdHJpbmcnID8gJzogJyArIG9wdGlvbi5kZXByZWNhdGVkIDogJyd9LmApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBlcnJvciA9IGBBcmd1bWVudCAke2tleX0gY291bGQgbm90IGJlIHBhcnNlZCB1c2luZyB2YWx1ZSAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0uYDtcbiAgICAgIGlmIChvcHRpb24uZW51bSkge1xuICAgICAgICBlcnJvciArPSBgIFZhbGlkIHZhbHVlcyBhcmU6ICR7b3B0aW9uLmVudW0ubWFwKHggPT4gSlNPTi5zdHJpbmdpZnkoeCkpLmpvaW4oJywgJyl9LmA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvciArPSBgVmFsaWQgdHlwZShzKSBpczogJHsob3B0aW9uLnR5cGVzIHx8IFtvcHRpb24udHlwZV0pLmpvaW4oJywgJyl9YDtcbiAgICAgIH1cblxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgICAgaWdub3JlZC5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG59XG5cblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIGluIGEgY29uc2lzdGVudCB3YXksIGJ1dCB3aXRob3V0IGhhdmluZyBhbnkgb3B0aW9uIGRlZmluaXRpb24uIFRoaXMgdHJpZXNcbiAqIHRvIGFzc2VzcyB3aGF0IHRoZSB1c2VyIHdhbnRzIGluIGEgZnJlZSBmb3JtLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC0tbmFtZT1mYWxzZWAgd2lsbCBzZXQgdGhlXG4gKiBuYW1lIHByb3BlcnRpZXMgdG8gYSBib29sZWFuIHR5cGUuXG4gKiBUaGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgd2hlbiB0aGVyZSdzIG5vIHNjaGVtYSBhdmFpbGFibGUgb3IgaWYgYSBzY2hlbWEgaXMgXCJ0cnVlXCIgKGFueXRoaW5nIGlzXG4gKiB2YWxpZCkuXG4gKlxuICogQHBhcmFtIGFyZ3MgQXJndW1lbnQgbGlzdCB0byBwYXJzZS5cbiAqIEByZXR1cm5zIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgcHJvcGVydHkgcGVyIGZsYWdzIGZyb20gdGhlIGFyZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKGFyZ3M6IHN0cmluZ1tdKTogQXJndW1lbnRzIHtcbiAgY29uc3QgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzID0ge307XG4gIGNvbnN0IGxlZnRvdmVycyA9IFtdO1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmIChhcmcgPT0gJy0tJykge1xuICAgICAgbGVmdG92ZXJzLnB1c2goLi4uYXJncyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGNvbnN0IGVxU2lnbiA9IGFyZy5pbmRleE9mKCc9Jyk7XG4gICAgICBsZXQgbmFtZTogc3RyaW5nO1xuICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoZXFTaWduICE9PSAtMSkge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cmluZygyLCBlcVNpZ24pO1xuICAgICAgICB2YWx1ZSA9IGFyZy5zdWJzdHJpbmcoZXFTaWduICsgMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cigyKTtcbiAgICAgICAgdmFsdWUgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHYgPSBfY29lcmNlKHZhbHVlLCBudWxsLCBwYXJzZWRPcHRpb25zW25hbWVdKTtcbiAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyc2VkT3B0aW9uc1tuYW1lXSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBhcmcuc3BsaXQoJycpLmZvckVhY2goeCA9PiBwYXJzZWRPcHRpb25zW3hdID0gdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IGxlZnRvdmVycztcblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgZnJvbSBhIGxpc3Qgb2Ygc3RhbmRhcmRpemVkIG9wdGlvbnMuXG4gKiBUaGUgcmVzdWx0IG9iamVjdCB3aWxsIGhhdmUgYSBrZXkgcGVyIG9wdGlvbiBuYW1lLCB3aXRoIHRoZSBgX2Aga2V5IHJlc2VydmVkIGZvciBwb3NpdGlvbmFsXG4gKiBhcmd1bWVudHMsIGFuZCBgLS1gIHdpbGwgY29udGFpbiBldmVyeXRoaW5nIHRoYXQgZGlkIG5vdCBtYXRjaC4gQW55IGtleSB0aGF0IGRvbid0IGhhdmUgYW5cbiAqIG9wdGlvbiB3aWxsIGJlIHB1c2hlZCBiYWNrIGluIGAtLWAgYW5kIHJlbW92ZWQgZnJvbSB0aGUgb2JqZWN0LiBJZiB5b3UgbmVlZCB0byB2YWxpZGF0ZSB0aGF0XG4gKiB0aGVyZSdzIG5vIGFkZGl0aW9uYWxQcm9wZXJ0aWVzLCB5b3UgbmVlZCB0byBjaGVjayB0aGUgYC0tYCBrZXkuXG4gKlxuICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50IGFycmF5IHRvIHBhcnNlLlxuICogQHBhcmFtIG9wdGlvbnMgTGlzdCBvZiBzdXBwb3J0ZWQgb3B0aW9ucy4ge0BzZWUgT3B0aW9ufS5cbiAqIEBwYXJhbSBsb2dnZXIgTG9nZ2VyIHRvIHVzZSB0byB3YXJuIHVzZXJzLlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgb3B0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwsXG4gIGxvZ2dlcj86IGxvZ2dpbmcuTG9nZ2VyLFxuKTogQXJndW1lbnRzIHtcbiAgaWYgKG9wdGlvbnMgPT09IG51bGwpIHtcbiAgICBvcHRpb25zID0gW107XG4gIH1cblxuICBjb25zdCBsZWZ0b3ZlcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBvc2l0aW9uYWxzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcblxuICBjb25zdCBpZ25vcmVkOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IHN0YXRlID0geyBvcHRpb25zLCBwYXJzZWRPcHRpb25zLCBwb3NpdGlvbmFscywgbGVmdG92ZXJzLCBpZ25vcmVkLCBlcnJvcnMsIHdhcm5pbmdzIH07XG5cbiAgZm9yIChsZXQgYXJnID0gYXJncy5zaGlmdCgpOyBhcmcgIT09IHVuZGVmaW5lZDsgYXJnID0gYXJncy5zaGlmdCgpKSB7XG4gICAgaWYgKGFyZyA9PSAnLS0nKSB7XG4gICAgICAvLyBJZiB3ZSBmaW5kIGEgLS0sIHdlJ3JlIGRvbmUuXG4gICAgICBsZWZ0b3ZlcnMucHVzaCguLi5hcmdzKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgX2Fzc2lnbk9wdGlvbihhcmcsIGFyZ3MsIHN0YXRlKTtcbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIC8vIEFyZ3VtZW50IGlzIG9mIGZvcm0gLWFiY2RlZi4gIFN0YXJ0cyBhdCAxIGJlY2F1c2Ugd2Ugc2tpcCB0aGUgYC1gLlxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGFyZ1tpXTtcbiAgICAgICAgLy8gSWYgdGhlIG5leHQgY2hhcmFjdGVyIGlzIGFuICc9JywgdHJlYXQgaXQgYXMgYSBsb25nIGZsYWcuXG4gICAgICAgIGlmIChhcmdbaSArIDFdID09ICc9Jykge1xuICAgICAgICAgIGNvbnN0IGYgPSAnLScgKyBmbGFnICsgYXJnLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICBfYXNzaWduT3B0aW9uKGYsIGFyZ3MsIHN0YXRlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyBUcmVhdCB0aGUgbGFzdCBmbGFnIGFzIGAtLWFgIChhcyBpZiBmdWxsIGZsYWcgYnV0IGp1c3Qgb25lIGxldHRlcikuIFdlIGRvIHRoaXMgaW5cbiAgICAgICAgLy8gdGhlIGxvb3AgYmVjYXVzZSBpdCBzYXZlcyB1cyBhIGNoZWNrIHRvIHNlZSBpZiB0aGUgYXJnIGlzIGp1c3QgYC1gLlxuICAgICAgICBpZiAoaSA9PSBhcmcubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbnN0IGFyZyA9ICctJyArIGZsYWc7XG4gICAgICAgICAgX2Fzc2lnbk9wdGlvbihhcmcsIGFyZ3MsIHN0YXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShmbGFnLCBvcHRpb25zKTtcbiAgICAgICAgICBpZiAobWF5YmVPcHRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHYgPSBfY29lcmNlKHVuZGVmaW5lZCwgbWF5YmVPcHRpb24sIHBhcnNlZE9wdGlvbnNbbWF5YmVPcHRpb24ubmFtZV0pO1xuICAgICAgICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBwYXJzZWRPcHRpb25zW21heWJlT3B0aW9uLm5hbWVdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcG9zaXRpb25hbHMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERlYWwgd2l0aCBwb3NpdGlvbmFscy5cbiAgLy8gVE9ETyhoYW5zbCk6IHRoaXMgaXMgYnkgZmFyIHRoZSBtb3N0IGNvbXBsZXggcGllY2Ugb2YgY29kZSBpbiB0aGlzIGZpbGUuIFRyeSB0byByZWZhY3RvciBpdFxuICAvLyAgIHNpbXBsZXIuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3NpdGlvbmFscy5sZW5ndGg7KSB7XG4gICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgIGxldCBpbmNyZW1lbnRQb3MgPSBmYWxzZTtcbiAgICAgIGxldCBpbmNyZW1lbnRJID0gdHJ1ZTtcblxuICAgICAgLy8gV2UgZG8gdGhpcyB3aXRoIGEgZm91bmQgZmxhZyBiZWNhdXNlIG1vcmUgdGhhbiAxIG9wdGlvbiBjb3VsZCBoYXZlIHRoZSBzYW1lIHBvc2l0aW9uYWwuXG4gICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICAgIC8vIElmIGFueSBvcHRpb24gaGFzIHRoaXMgcG9zaXRpb25hbCBhbmQgbm8gdmFsdWUsIEFORCBmaXQgdGhlIHR5cGUsIHdlIG5lZWQgdG8gcmVtb3ZlIGl0LlxuICAgICAgICBpZiAob3B0aW9uLnBvc2l0aW9uYWwgPT09IHBvcykge1xuICAgICAgICAgIGNvbnN0IGNvZXJjZWRWYWx1ZSA9IF9jb2VyY2UocG9zaXRpb25hbHNbaV0sIG9wdGlvbiwgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0pO1xuICAgICAgICAgIGlmIChwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSA9PT0gdW5kZWZpbmVkICYmIGNvZXJjZWRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSA9IGNvZXJjZWRWYWx1ZTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5jcmVtZW50SSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpbmNyZW1lbnRQb3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICBwb3NpdGlvbmFscy5zcGxpY2UoaS0tLCAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbmNyZW1lbnRQb3MpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICB9XG4gICAgICBpZiAoaW5jcmVtZW50SSkge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHBvc2l0aW9uYWxzLmxlbmd0aCA+IDAgfHwgbGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICBwYXJzZWRPcHRpb25zWyctLSddID0gWy4uLnBvc2l0aW9uYWxzLCAuLi5sZWZ0b3ZlcnNdO1xuICB9XG5cbiAgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDAgJiYgbG9nZ2VyKSB7XG4gICAgd2FybmluZ3MuZm9yRWFjaChtZXNzYWdlID0+IGxvZ2dlci53YXJuKG1lc3NhZ2UpKTtcbiAgfVxuXG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBQYXJzZUFyZ3VtZW50RXhjZXB0aW9uKGVycm9ycywgcGFyc2VkT3B0aW9ucywgaWdub3JlZCk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cbiJdfQ==