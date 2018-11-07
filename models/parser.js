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
    const from = arg.startsWith('--') ? 2 : 1;
    let key = arg.substr(from);
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
                // If the next character is an '=', treat it as a long flag.
                if (arg[i + 1] == '=') {
                    const f = '-' + flag + arg.slice(i + 1);
                    _assignOption(f, args, options, parsedOptions, positionals, leftovers, ignored, errors);
                    break;
                }
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    const arg = '-' + flag;
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
    if (errors.length > 0) {
        throw new ParseArgumentException(errors, parsedOptions, ignored);
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUE4RDtBQUM5RCwyQ0FBbUU7QUFHbkUsTUFBYSxzQkFBdUIsU0FBUSxvQkFBYTtJQUN2RCxZQUNrQixRQUFrQixFQUNsQixNQUFpQixFQUNqQixPQUFpQjtRQUVqQyxLQUFLLENBQUMsMERBQTBELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBSnpFLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBR25DLENBQUM7Q0FDRjtBQVJELHdEQVFDO0FBR0QsU0FBUyxXQUFXLENBQUMsR0FBdUIsRUFBRSxJQUFnQixFQUFFLENBQVM7SUFDdkUsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLHNCQUFVLENBQUMsR0FBRztZQUNqQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUI7WUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztnQkFDdkQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUN0RCxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7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O2FBQ1A7WUFDRCxJQUFJLFVBQVUsRUFBRTtnQkFDZCxDQUFDLEVBQUUsQ0FBQzthQUNMO1NBQ0Y7S0FDRjtJQUVELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbEQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztLQUN0RDtJQUVELElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDckIsTUFBTSxJQUFJLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDbEU7SUFFRCxPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDO0FBakdELHdDQWlHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKlxuICovXG5pbXBvcnQgeyBCYXNlRXhjZXB0aW9uLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBPcHRpb24sIE9wdGlvblR5cGUsIFZhbHVlIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuXG5cbmV4cG9ydCBjbGFzcyBQYXJzZUFyZ3VtZW50RXhjZXB0aW9uIGV4dGVuZHMgQmFzZUV4Y2VwdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBjb21tZW50czogc3RyaW5nW10sXG4gICAgcHVibGljIHJlYWRvbmx5IHBhcnNlZDogQXJndW1lbnRzLFxuICAgIHB1YmxpYyByZWFkb25seSBpZ25vcmVkOiBzdHJpbmdbXSxcbiAgKSB7XG4gICAgc3VwZXIoYE9uZSBvciBtb3JlIGVycm9ycyBvY2N1cmVkIHdoaWxlIHBhcnNpbmcgYXJndW1lbnRzOlxcbiAgJHtjb21tZW50cy5qb2luKCdcXG4gICcpfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gX2NvZXJjZVR5cGUoc3RyOiBzdHJpbmcgfCB1bmRlZmluZWQsIHR5cGU6IE9wdGlvblR5cGUsIHY/OiBWYWx1ZSk6IFZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBPcHRpb25UeXBlLkFueTpcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHJldHVybiB2LmNvbmNhdChzdHIgfHwgJycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgPyBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuQm9vbGVhbiwgdilcbiAgICAgICAgICAgOiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuTnVtYmVyLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdilcbiAgICAgICAgICAgOiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuU3RyaW5nLCB2KTtcblxuICAgIGNhc2UgT3B0aW9uVHlwZS5TdHJpbmc6XG4gICAgICByZXR1cm4gc3RyIHx8ICcnO1xuXG4gICAgY2FzZSBPcHRpb25UeXBlLkJvb2xlYW46XG4gICAgICBzd2l0Y2ggKHN0cikge1xuICAgICAgICBjYXNlICdmYWxzZSc6XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICBjYXNlICcnOlxuICAgICAgICBjYXNlICd0cnVlJzpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuTnVtYmVyOlxuICAgICAgaWYgKHN0ciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSBlbHNlIGlmIChzdHIgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKE51bWJlci5pc0Zpbml0ZSgrc3RyKSkge1xuICAgICAgICByZXR1cm4gK3N0cjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuQXJyYXk6XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2KSA/IHYuY29uY2F0KHN0ciB8fCAnJykgOiBbc3RyIHx8ICcnXTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb2VyY2Uoc3RyOiBzdHJpbmcgfCB1bmRlZmluZWQsIG86IE9wdGlvbiB8IG51bGwsIHY/OiBWYWx1ZSk6IFZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCFvKSB7XG4gICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5BbnksIHYpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHR5cGVzID0gby50eXBlcyB8fCBbby50eXBlXTtcblxuICAgIC8vIFRyeSBhbGwgdGhlIHR5cGVzIG9uZSBieSBvbmUgYW5kIHBpY2sgdGhlIGZpcnN0IG9uZSB0aGF0IHJldHVybnMgYSB2YWx1ZSBjb250YWluZWQgaW4gdGhlXG4gICAgLy8gZW51bS4gSWYgdGhlcmUncyBubyBlbnVtLCBqdXN0IHJldHVybiB0aGUgZmlyc3Qgb25lIHRoYXQgbWF0Y2hlcy5cbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGNvbnN0IG1heWJlUmVzdWx0ID0gX2NvZXJjZVR5cGUoc3RyLCB0eXBlLCB2KTtcbiAgICAgIGlmIChtYXliZVJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghby5lbnVtIHx8IG8uZW51bS5pbmNsdWRlcyhtYXliZVJlc3VsdCkpIHtcbiAgICAgICAgICByZXR1cm4gbWF5YmVSZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cblxuZnVuY3Rpb24gX2dldE9wdGlvbkZyb21OYW1lKG5hbWU6IHN0cmluZywgb3B0aW9uczogT3B0aW9uW10pOiBPcHRpb24gfCB1bmRlZmluZWQge1xuICBjb25zdCBjTmFtZSA9IHN0cmluZ3MuY2FtZWxpemUobmFtZSk7XG5cbiAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgIGlmIChvcHRpb24ubmFtZSA9PSBuYW1lIHx8IG9wdGlvbi5uYW1lID09IGNOYW1lKSB7XG4gICAgICByZXR1cm4gb3B0aW9uO1xuICAgIH1cblxuICAgIGlmIChvcHRpb24uYWxpYXNlcy5zb21lKHggPT4geCA9PSBuYW1lIHx8IHggPT0gY05hbWUpKSB7XG4gICAgICByZXR1cm4gb3B0aW9uO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZnVuY3Rpb24gX2Fzc2lnbk9wdGlvbihcbiAgYXJnOiBzdHJpbmcsXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBvcHRpb25zOiBPcHRpb25bXSxcbiAgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzLFxuICBfcG9zaXRpb25hbHM6IHN0cmluZ1tdLFxuICBsZWZ0b3ZlcnM6IHN0cmluZ1tdLFxuICBpZ25vcmVkOiBzdHJpbmdbXSxcbiAgZXJyb3JzOiBzdHJpbmdbXSxcbikge1xuICBjb25zdCBmcm9tID0gYXJnLnN0YXJ0c1dpdGgoJy0tJykgPyAyIDogMTtcbiAgbGV0IGtleSA9IGFyZy5zdWJzdHIoZnJvbSk7XG4gIGxldCBvcHRpb246IE9wdGlvbiB8IG51bGwgPSBudWxsO1xuICBsZXQgdmFsdWUgPSAnJztcbiAgY29uc3QgaSA9IGFyZy5pbmRleE9mKCc9Jyk7XG5cbiAgLy8gSWYgZmxhZyBpcyAtLW5vLWFiYyBBTkQgdGhlcmUncyBubyBlcXVhbCBzaWduLlxuICBpZiAoaSA9PSAtMSkge1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8tJykpIHtcbiAgICAgIC8vIE9ubHkgdXNlIHRoaXMga2V5IGlmIHRoZSBvcHRpb24gbWF0Y2hpbmcgdGhlIHJlc3QgaXMgYSBib29sZWFuLlxuICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LnN1YnN0cigzKSwgb3B0aW9ucyk7XG4gICAgICBpZiAobWF5YmVPcHRpb24gJiYgbWF5YmVPcHRpb24udHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdmFsdWUgPSAnZmFsc2UnO1xuICAgICAgICBvcHRpb24gPSBtYXliZU9wdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGtleS5zdGFydHNXaXRoKCdubycpKSB7XG4gICAgICAvLyBPbmx5IHVzZSB0aGlzIGtleSBpZiB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSByZXN0IGlzIGEgYm9vbGVhbi5cbiAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleS5zdWJzdHIoMiksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uICYmIG1heWJlT3B0aW9uLnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHZhbHVlID0gJ2ZhbHNlJztcbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgICAgLy8gU2V0IGl0IHRvIHRydWUgaWYgaXQncyBhIGJvb2xlYW4gYW5kIHRoZSBuZXh0IGFyZ3VtZW50IGRvZXNuJ3QgbWF0Y2ggdHJ1ZS9mYWxzZS5cbiAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleSwgb3B0aW9ucyk7XG4gICAgICBpZiAobWF5YmVPcHRpb24pIHtcbiAgICAgICAgdmFsdWUgPSBhcmdzWzBdO1xuICAgICAgICBsZXQgc2hvdWxkU2hpZnQgPSB0cnVlO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgICAgICAvLyBWZXJpZnkgaWYgbm90IGhhdmluZyBhIHZhbHVlIHJlc3VsdHMgaW4gYSBjb3JyZWN0IHBhcnNlLCBpZiBzbyBkb24ndCBzaGlmdC5cbiAgICAgICAgICBpZiAoX2NvZXJjZSh1bmRlZmluZWQsIG1heWJlT3B0aW9uKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzaG91bGRTaGlmdCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgYWJzb3JiIGl0IGlmIGl0IGxlYWRzIHRvIGEgYmV0dGVyIHZhbHVlLlxuICAgICAgICBpZiAoc2hvdWxkU2hpZnQgJiYgX2NvZXJjZSh2YWx1ZSwgbWF5YmVPcHRpb24pICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBvcHRpb24gPSBtYXliZU9wdGlvbjtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAga2V5ID0gYXJnLnN1YnN0cmluZygwLCBpKTtcbiAgICBvcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LCBvcHRpb25zKSB8fCBudWxsO1xuICAgIGlmIChvcHRpb24pIHtcbiAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhpICsgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgIGlmIChhcmdzWzBdICYmICFhcmdzWzBdLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnLCBhcmdzWzBdKTtcbiAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdiA9IF9jb2VyY2UodmFsdWUsIG9wdGlvbiwgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0pO1xuICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGVycm9yID0gYEFyZ3VtZW50ICR7a2V5fSBjb3VsZCBub3QgYmUgcGFyc2VkIHVzaW5nIHZhbHVlICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfS5gO1xuICAgICAgaWYgKG9wdGlvbi5lbnVtKSB7XG4gICAgICAgIGVycm9yICs9IGAgVmFsaWQgdmFsdWVzIGFyZTogJHtvcHRpb24uZW51bS5tYXAoeCA9PiBKU09OLnN0cmluZ2lmeSh4KSkuam9pbignLCAnKX0uYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yICs9IGBWYWxpZCB0eXBlKHMpIGlzOiAkeyhvcHRpb24udHlwZXMgfHwgW29wdGlvbi50eXBlXSkuam9pbignLCAnKX1gO1xuICAgICAgfVxuXG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgICBpZ25vcmVkLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cbn1cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgYnV0IHdpdGhvdXQgaGF2aW5nIGFueSBvcHRpb24gZGVmaW5pdGlvbi4gVGhpcyB0cmllc1xuICogdG8gYXNzZXNzIHdoYXQgdGhlIHVzZXIgd2FudHMgaW4gYSBmcmVlIGZvcm0uIEZvciBleGFtcGxlLCB1c2luZyBgLS1uYW1lPWZhbHNlYCB3aWxsIHNldCB0aGVcbiAqIG5hbWUgcHJvcGVydGllcyB0byBhIGJvb2xlYW4gdHlwZS5cbiAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB3aGVuIHRoZXJlJ3Mgbm8gc2NoZW1hIGF2YWlsYWJsZSBvciBpZiBhIHNjaGVtYSBpcyBcInRydWVcIiAoYW55dGhpbmcgaXNcbiAqIHZhbGlkKS5cbiAqXG4gKiBAcGFyYW0gYXJncyBBcmd1bWVudCBsaXN0IHRvIHBhcnNlLlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgZmxhZ3MgZnJvbSB0aGUgYXJncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoYXJnczogc3RyaW5nW10pOiBBcmd1bWVudHMge1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcbiAgY29uc3QgbGVmdG92ZXJzID0gW107XG5cbiAgZm9yIChsZXQgYXJnID0gYXJncy5zaGlmdCgpOyBhcmcgIT09IHVuZGVmaW5lZDsgYXJnID0gYXJncy5zaGlmdCgpKSB7XG4gICAgaWYgKGFyZyA9PSAnLS0nKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaCguLi5hcmdzKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgY29uc3QgZXFTaWduID0gYXJnLmluZGV4T2YoJz0nKTtcbiAgICAgIGxldCBuYW1lOiBzdHJpbmc7XG4gICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChlcVNpZ24gIT09IC0xKSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyaW5nKDIsIGVxU2lnbik7XG4gICAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhlcVNpZ24gKyAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyKDIpO1xuICAgICAgICB2YWx1ZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdiA9IF9jb2VyY2UodmFsdWUsIG51bGwsIHBhcnNlZE9wdGlvbnNbbmFtZV0pO1xuICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJzZWRPcHRpb25zW25hbWVdID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGFyZy5zcGxpdCgnJykuZm9yRWFjaCh4ID0+IHBhcnNlZE9wdGlvbnNbeF0gPSB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZWRPcHRpb25zWyctLSddID0gbGVmdG92ZXJzO1xuXG4gIHJldHVybiBwYXJzZWRPcHRpb25zO1xufVxuXG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyBpbiBhIGNvbnNpc3RlbnQgd2F5LCBmcm9tIGEgbGlzdCBvZiBzdGFuZGFyZGl6ZWQgb3B0aW9ucy5cbiAqIFRoZSByZXN1bHQgb2JqZWN0IHdpbGwgaGF2ZSBhIGtleSBwZXIgb3B0aW9uIG5hbWUsIHdpdGggdGhlIGBfYCBrZXkgcmVzZXJ2ZWQgZm9yIHBvc2l0aW9uYWxcbiAqIGFyZ3VtZW50cywgYW5kIGAtLWAgd2lsbCBjb250YWluIGV2ZXJ5dGhpbmcgdGhhdCBkaWQgbm90IG1hdGNoLiBBbnkga2V5IHRoYXQgZG9uJ3QgaGF2ZSBhblxuICogb3B0aW9uIHdpbGwgYmUgcHVzaGVkIGJhY2sgaW4gYC0tYCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBvYmplY3QuIElmIHlvdSBuZWVkIHRvIHZhbGlkYXRlIHRoYXRcbiAqIHRoZXJlJ3Mgbm8gYWRkaXRpb25hbFByb3BlcnRpZXMsIHlvdSBuZWVkIHRvIGNoZWNrIHRoZSBgLS1gIGtleS5cbiAqXG4gKiBAcGFyYW0gYXJncyBUaGUgYXJndW1lbnQgYXJyYXkgdG8gcGFyc2UuXG4gKiBAcGFyYW0gb3B0aW9ucyBMaXN0IG9mIHN1cHBvcnRlZCBvcHRpb25zLiB7QHNlZSBPcHRpb259LlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgb3B0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoYXJnczogc3RyaW5nW10sIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCk6IEFyZ3VtZW50cyB7XG4gIGlmIChvcHRpb25zID09PSBudWxsKSB7XG4gICAgb3B0aW9ucyA9IFtdO1xuICB9XG5cbiAgY29uc3QgbGVmdG92ZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwb3NpdGlvbmFsczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzID0ge307XG5cbiAgY29uc3QgaWdub3JlZDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmIChhcmcgPT0gJy0tJykge1xuICAgICAgLy8gSWYgd2UgZmluZCBhIC0tLCB3ZSdyZSBkb25lLlxuICAgICAgbGVmdG92ZXJzLnB1c2goLi4uYXJncyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIF9hc3NpZ25PcHRpb24oYXJnLCBhcmdzLCBvcHRpb25zLCBwYXJzZWRPcHRpb25zLCBwb3NpdGlvbmFscywgbGVmdG92ZXJzLCBpZ25vcmVkLCBlcnJvcnMpO1xuICAgIH0gZWxzZSBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgLy8gQXJndW1lbnQgaXMgb2YgZm9ybSAtYWJjZGVmLiAgU3RhcnRzIGF0IDEgYmVjYXVzZSB3ZSBza2lwIHRoZSBgLWAuXG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBmbGFnID0gYXJnW2ldO1xuICAgICAgICAvLyBJZiB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgYW4gJz0nLCB0cmVhdCBpdCBhcyBhIGxvbmcgZmxhZy5cbiAgICAgICAgaWYgKGFyZ1tpICsgMV0gPT0gJz0nKSB7XG4gICAgICAgICAgY29uc3QgZiA9ICctJyArIGZsYWcgKyBhcmcuc2xpY2UoaSArIDEpO1xuICAgICAgICAgIF9hc3NpZ25PcHRpb24oZiwgYXJncywgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycywgaWdub3JlZCwgZXJyb3JzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyBUcmVhdCB0aGUgbGFzdCBmbGFnIGFzIGAtLWFgIChhcyBpZiBmdWxsIGZsYWcgYnV0IGp1c3Qgb25lIGxldHRlcikuIFdlIGRvIHRoaXMgaW5cbiAgICAgICAgLy8gdGhlIGxvb3AgYmVjYXVzZSBpdCBzYXZlcyB1cyBhIGNoZWNrIHRvIHNlZSBpZiB0aGUgYXJnIGlzIGp1c3QgYC1gLlxuICAgICAgICBpZiAoaSA9PSBhcmcubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbnN0IGFyZyA9ICctJyArIGZsYWc7XG4gICAgICAgICAgX2Fzc2lnbk9wdGlvbihhcmcsIGFyZ3MsIG9wdGlvbnMsIHBhcnNlZE9wdGlvbnMsIHBvc2l0aW9uYWxzLCBsZWZ0b3ZlcnMsIGlnbm9yZWQsIGVycm9ycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoZmxhZywgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gX2NvZXJjZSh1bmRlZmluZWQsIG1heWJlT3B0aW9uLCBwYXJzZWRPcHRpb25zW21heWJlT3B0aW9uLm5hbWVdKTtcbiAgICAgICAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1ttYXliZU9wdGlvbi5uYW1lXSA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc2l0aW9uYWxzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICAvLyBEZWFsIHdpdGggcG9zaXRpb25hbHMuXG4gIC8vIFRPRE8oaGFuc2wpOiB0aGlzIGlzIGJ5IGZhciB0aGUgbW9zdCBjb21wbGV4IHBpZWNlIG9mIGNvZGUgaW4gdGhpcyBmaWxlLiBUcnkgdG8gcmVmYWN0b3IgaXRcbiAgLy8gICBzaW1wbGVyLlxuICBpZiAocG9zaXRpb25hbHMubGVuZ3RoID4gMCkge1xuICAgIGxldCBwb3MgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zaXRpb25hbHMubGVuZ3RoOykge1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50UG9zID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50SSA9IHRydWU7XG5cbiAgICAgIC8vIFdlIGRvIHRoaXMgd2l0aCBhIGZvdW5kIGZsYWcgYmVjYXVzZSBtb3JlIHRoYW4gMSBvcHRpb24gY291bGQgaGF2ZSB0aGUgc2FtZSBwb3NpdGlvbmFsLlxuICAgICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgICAvLyBJZiBhbnkgb3B0aW9uIGhhcyB0aGlzIHBvc2l0aW9uYWwgYW5kIG5vIHZhbHVlLCBBTkQgZml0IHRoZSB0eXBlLCB3ZSBuZWVkIHRvIHJlbW92ZSBpdC5cbiAgICAgICAgaWYgKG9wdGlvbi5wb3NpdGlvbmFsID09PSBwb3MpIHtcbiAgICAgICAgICBjb25zdCBjb2VyY2VkVmFsdWUgPSBfY29lcmNlKHBvc2l0aW9uYWxzW2ldLCBvcHRpb24sIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdKTtcbiAgICAgICAgICBpZiAocGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPT09IHVuZGVmaW5lZCAmJiBjb2VyY2VkVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPSBjb2VyY2VkVmFsdWU7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluY3JlbWVudEkgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5jcmVtZW50UG9zID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgcG9zaXRpb25hbHMuc3BsaWNlKGktLSwgMSk7XG4gICAgICB9XG4gICAgICBpZiAoaW5jcmVtZW50UG9zKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgfVxuICAgICAgaWYgKGluY3JlbWVudEkpIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwIHx8IGxlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IFsuLi5wb3NpdGlvbmFscywgLi4ubGVmdG92ZXJzXTtcbiAgfVxuXG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBQYXJzZUFyZ3VtZW50RXhjZXB0aW9uKGVycm9ycywgcGFyc2VkT3B0aW9ucywgaWdub3JlZCk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cbiJdfQ==