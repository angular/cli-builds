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
function _assignOption(arg, args, { options, parsedOptions, leftovers, ignored, errors, deprecations }) {
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
            parsedOptions[option.name] = v;
            if (option.deprecated !== undefined && option.deprecated !== false) {
                deprecations.push(`Option ${JSON.stringify(option.name)} is deprecated${typeof option.deprecated == 'string' ? ': ' + option.deprecated : ''}.`);
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
    const deprecations = [];
    const state = { options, parsedOptions, positionals, leftovers, ignored, errors, deprecations };
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
    if (deprecations.length > 0 && logger) {
        deprecations.forEach(message => logger.warn(message));
    }
    if (errors.length > 0) {
        throw new ParseArgumentException(errors, parsedOptions, ignored);
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUF1RTtBQUN2RSwyQ0FBbUU7QUFHbkUsTUFBYSxzQkFBdUIsU0FBUSxvQkFBYTtJQUN2RCxZQUNrQixRQUFrQixFQUNsQixNQUFpQixFQUNqQixPQUFpQjtRQUVqQyxLQUFLLENBQUMsMERBQTBELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBSnpFLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsV0FBTSxHQUFOLE1BQU0sQ0FBVztRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBR25DLENBQUM7Q0FDRjtBQVJELHdEQVFDO0FBR0QsU0FBUyxXQUFXLENBQUMsR0FBdUIsRUFBRSxJQUFnQixFQUFFLENBQVM7SUFDdkUsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLHNCQUFVLENBQUMsR0FBRztZQUNqQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUI7WUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztnQkFDMUQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUNwRCxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7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O0tBQ2xFO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQTVHRCx3Q0E0R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICpcbiAqL1xuaW1wb3J0IHsgQmFzZUV4Y2VwdGlvbiwgbG9nZ2luZywgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uLCBPcHRpb25UeXBlLCBWYWx1ZSB9IGZyb20gJy4vaW50ZXJmYWNlJztcblxuXG5leHBvcnQgY2xhc3MgUGFyc2VBcmd1bWVudEV4Y2VwdGlvbiBleHRlbmRzIEJhc2VFeGNlcHRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29tbWVudHM6IHN0cmluZ1tdLFxuICAgIHB1YmxpYyByZWFkb25seSBwYXJzZWQ6IEFyZ3VtZW50cyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgaWdub3JlZDogc3RyaW5nW10sXG4gICkge1xuICAgIHN1cGVyKGBPbmUgb3IgbW9yZSBlcnJvcnMgb2NjdXJlZCB3aGlsZSBwYXJzaW5nIGFyZ3VtZW50czpcXG4gICR7Y29tbWVudHMuam9pbignXFxuICAnKX1gKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9jb2VyY2VUeXBlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBPcHRpb25UeXBlLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgT3B0aW9uVHlwZS5Bbnk6XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICByZXR1cm4gdi5jb25jYXQoc3RyIHx8ICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5Cb29sZWFuLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpXG4gICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdikgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdilcbiAgICAgICAgICA6IF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5TdHJpbmcsIHYpO1xuXG4gICAgY2FzZSBPcHRpb25UeXBlLlN0cmluZzpcbiAgICAgIHJldHVybiBzdHIgfHwgJyc7XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuQm9vbGVhbjpcbiAgICAgIHN3aXRjaCAoc3RyKSB7XG4gICAgICAgIGNhc2UgJ2ZhbHNlJzpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgIGNhc2UgJ3RydWUnOlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgT3B0aW9uVHlwZS5OdW1iZXI6XG4gICAgICBpZiAoc3RyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9IGVsc2UgaWYgKHN0ciA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAoTnVtYmVyLmlzRmluaXRlKCtzdHIpKSB7XG4gICAgICAgIHJldHVybiArc3RyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgT3B0aW9uVHlwZS5BcnJheTpcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHYpID8gdi5jb25jYXQoc3RyIHx8ICcnKSA6IFtzdHIgfHwgJyddO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvZXJjZShzdHI6IHN0cmluZyB8IHVuZGVmaW5lZCwgbzogT3B0aW9uIHwgbnVsbCwgdj86IFZhbHVlKTogVmFsdWUgfCB1bmRlZmluZWQge1xuICBpZiAoIW8pIHtcbiAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkFueSwgdik7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHlwZXMgPSBvLnR5cGVzIHx8IFtvLnR5cGVdO1xuXG4gICAgLy8gVHJ5IGFsbCB0aGUgdHlwZXMgb25lIGJ5IG9uZSBhbmQgcGljayB0aGUgZmlyc3Qgb25lIHRoYXQgcmV0dXJucyBhIHZhbHVlIGNvbnRhaW5lZCBpbiB0aGVcbiAgICAvLyBlbnVtLiBJZiB0aGVyZSdzIG5vIGVudW0sIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBvbmUgdGhhdCBtYXRjaGVzLlxuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgY29uc3QgbWF5YmVSZXN1bHQgPSBfY29lcmNlVHlwZShzdHIsIHR5cGUsIHYpO1xuICAgICAgaWYgKG1heWJlUmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFvLmVudW0gfHwgby5lbnVtLmluY2x1ZGVzKG1heWJlUmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiBtYXliZVJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0T3B0aW9uRnJvbU5hbWUobmFtZTogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25bXSk6IE9wdGlvbiB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGNhbWVsTmFtZSA9IC8oLXxfKS8udGVzdChuYW1lKVxuICAgID8gc3RyaW5ncy5jYW1lbGl6ZShuYW1lKVxuICAgIDogbmFtZTtcblxuICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbi5uYW1lID09PSBuYW1lIHx8IG9wdGlvbi5uYW1lID09PSBjYW1lbE5hbWUpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbi5hbGlhc2VzLnNvbWUoeCA9PiB4ID09PSBuYW1lIHx8IHggPT09IGNhbWVsTmFtZSkpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZUxlYWRpbmdEYXNoZXMoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBmcm9tID0ga2V5LnN0YXJ0c1dpdGgoJy0tJykgPyAyIDoga2V5LnN0YXJ0c1dpdGgoJy0nKSA/IDEgOiAwO1xuXG4gIHJldHVybiBrZXkuc3Vic3RyKGZyb20pO1xufVxuXG5mdW5jdGlvbiBfYXNzaWduT3B0aW9uKFxuICBhcmc6IHN0cmluZyxcbiAgYXJnczogc3RyaW5nW10sXG4gIHsgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgbGVmdG92ZXJzLCBpZ25vcmVkLCBlcnJvcnMsIGRlcHJlY2F0aW9ucyB9OiB7XG4gICAgb3B0aW9uczogT3B0aW9uW10sXG4gICAgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzLFxuICAgIHBvc2l0aW9uYWxzOiBzdHJpbmdbXSxcbiAgICBsZWZ0b3ZlcnM6IHN0cmluZ1tdLFxuICAgIGlnbm9yZWQ6IHN0cmluZ1tdLFxuICAgIGVycm9yczogc3RyaW5nW10sXG4gICAgZGVwcmVjYXRpb25zOiBzdHJpbmdbXSxcbiAgfSxcbikge1xuICBjb25zdCBmcm9tID0gYXJnLnN0YXJ0c1dpdGgoJy0tJykgPyAyIDogMTtcbiAgbGV0IGtleSA9IGFyZy5zdWJzdHIoZnJvbSk7XG4gIGxldCBvcHRpb246IE9wdGlvbiB8IG51bGwgPSBudWxsO1xuICBsZXQgdmFsdWUgPSAnJztcbiAgY29uc3QgaSA9IGFyZy5pbmRleE9mKCc9Jyk7XG5cbiAgLy8gSWYgZmxhZyBpcyAtLW5vLWFiYyBBTkQgdGhlcmUncyBubyBlcXVhbCBzaWduLlxuICBpZiAoaSA9PSAtMSkge1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8nKSkge1xuICAgICAgLy8gT25seSB1c2UgdGhpcyBrZXkgaWYgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgcmVzdCBpcyBhIGJvb2xlYW4uXG4gICAgICBjb25zdCBmcm9tID0ga2V5LnN0YXJ0c1dpdGgoJ25vLScpID8gMyA6IDI7XG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShzdHJpbmdzLmNhbWVsaXplKGtleS5zdWJzdHIoZnJvbSkpLCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbiAmJiBtYXliZU9wdGlvbi50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICB2YWx1ZSA9ICdmYWxzZSc7XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb24gPT09IG51bGwpIHtcbiAgICAgIC8vIFNldCBpdCB0byB0cnVlIGlmIGl0J3MgYSBib29sZWFuIGFuZCB0aGUgbmV4dCBhcmd1bWVudCBkb2Vzbid0IG1hdGNoIHRydWUvZmFsc2UuXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgIHZhbHVlID0gYXJnc1swXTtcbiAgICAgICAgbGV0IHNob3VsZFNoaWZ0ID0gdHJ1ZTtcblxuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgICAgLy8gVmVyaWZ5IGlmIG5vdCBoYXZpbmcgYSB2YWx1ZSByZXN1bHRzIGluIGEgY29ycmVjdCBwYXJzZSwgaWYgc28gZG9uJ3Qgc2hpZnQuXG4gICAgICAgICAgaWYgKF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2hvdWxkU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGFic29yYiBpdCBpZiBpdCBsZWFkcyB0byBhIGJldHRlciB2YWx1ZS5cbiAgICAgICAgaWYgKHNob3VsZFNoaWZ0ICYmIF9jb2VyY2UodmFsdWUsIG1heWJlT3B0aW9uKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgYXJncy5zaGlmdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGtleSA9IGFyZy5zdWJzdHJpbmcoMCwgaSk7XG4gICAgb3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKF9yZW1vdmVMZWFkaW5nRGFzaGVzKGtleSksIG9wdGlvbnMpIHx8IG51bGw7XG4gICAgaWYgKG9wdGlvbikge1xuICAgICAgdmFsdWUgPSBhcmcuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0aW9uID09PSBudWxsKSB7XG4gICAgaWYgKGFyZ3NbMF0gJiYgIWFyZ3NbMF0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcsIGFyZ3NbMF0pO1xuICAgICAgYXJncy5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCB2ID0gX2NvZXJjZSh2YWx1ZSwgb3B0aW9uLCBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSk7XG4gICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPSB2O1xuXG4gICAgICBpZiAob3B0aW9uLmRlcHJlY2F0ZWQgIT09IHVuZGVmaW5lZCAmJiBvcHRpb24uZGVwcmVjYXRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgZGVwcmVjYXRpb25zLnB1c2goYE9wdGlvbiAke0pTT04uc3RyaW5naWZ5KG9wdGlvbi5uYW1lKX0gaXMgZGVwcmVjYXRlZCR7XG4gICAgICAgICAgICB0eXBlb2Ygb3B0aW9uLmRlcHJlY2F0ZWQgPT0gJ3N0cmluZycgPyAnOiAnICsgb3B0aW9uLmRlcHJlY2F0ZWQgOiAnJ30uYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBlcnJvciA9IGBBcmd1bWVudCAke2tleX0gY291bGQgbm90IGJlIHBhcnNlZCB1c2luZyB2YWx1ZSAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0uYDtcbiAgICAgIGlmIChvcHRpb24uZW51bSkge1xuICAgICAgICBlcnJvciArPSBgIFZhbGlkIHZhbHVlcyBhcmU6ICR7b3B0aW9uLmVudW0ubWFwKHggPT4gSlNPTi5zdHJpbmdpZnkoeCkpLmpvaW4oJywgJyl9LmA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvciArPSBgVmFsaWQgdHlwZShzKSBpczogJHsob3B0aW9uLnR5cGVzIHx8IFtvcHRpb24udHlwZV0pLmpvaW4oJywgJyl9YDtcbiAgICAgIH1cblxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgICAgaWdub3JlZC5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG59XG5cblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIGluIGEgY29uc2lzdGVudCB3YXksIGJ1dCB3aXRob3V0IGhhdmluZyBhbnkgb3B0aW9uIGRlZmluaXRpb24uIFRoaXMgdHJpZXNcbiAqIHRvIGFzc2VzcyB3aGF0IHRoZSB1c2VyIHdhbnRzIGluIGEgZnJlZSBmb3JtLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC0tbmFtZT1mYWxzZWAgd2lsbCBzZXQgdGhlXG4gKiBuYW1lIHByb3BlcnRpZXMgdG8gYSBib29sZWFuIHR5cGUuXG4gKiBUaGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgd2hlbiB0aGVyZSdzIG5vIHNjaGVtYSBhdmFpbGFibGUgb3IgaWYgYSBzY2hlbWEgaXMgXCJ0cnVlXCIgKGFueXRoaW5nIGlzXG4gKiB2YWxpZCkuXG4gKlxuICogQHBhcmFtIGFyZ3MgQXJndW1lbnQgbGlzdCB0byBwYXJzZS5cbiAqIEByZXR1cm5zIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgcHJvcGVydHkgcGVyIGZsYWdzIGZyb20gdGhlIGFyZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKGFyZ3M6IHN0cmluZ1tdKTogQXJndW1lbnRzIHtcbiAgY29uc3QgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzID0ge307XG4gIGNvbnN0IGxlZnRvdmVycyA9IFtdO1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmIChhcmcgPT0gJy0tJykge1xuICAgICAgbGVmdG92ZXJzLnB1c2goLi4uYXJncyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGNvbnN0IGVxU2lnbiA9IGFyZy5pbmRleE9mKCc9Jyk7XG4gICAgICBsZXQgbmFtZTogc3RyaW5nO1xuICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoZXFTaWduICE9PSAtMSkge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cmluZygyLCBlcVNpZ24pO1xuICAgICAgICB2YWx1ZSA9IGFyZy5zdWJzdHJpbmcoZXFTaWduICsgMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cigyKTtcbiAgICAgICAgdmFsdWUgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHYgPSBfY29lcmNlKHZhbHVlLCBudWxsLCBwYXJzZWRPcHRpb25zW25hbWVdKTtcbiAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyc2VkT3B0aW9uc1tuYW1lXSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBhcmcuc3BsaXQoJycpLmZvckVhY2goeCA9PiBwYXJzZWRPcHRpb25zW3hdID0gdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IGxlZnRvdmVycztcblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgZnJvbSBhIGxpc3Qgb2Ygc3RhbmRhcmRpemVkIG9wdGlvbnMuXG4gKiBUaGUgcmVzdWx0IG9iamVjdCB3aWxsIGhhdmUgYSBrZXkgcGVyIG9wdGlvbiBuYW1lLCB3aXRoIHRoZSBgX2Aga2V5IHJlc2VydmVkIGZvciBwb3NpdGlvbmFsXG4gKiBhcmd1bWVudHMsIGFuZCBgLS1gIHdpbGwgY29udGFpbiBldmVyeXRoaW5nIHRoYXQgZGlkIG5vdCBtYXRjaC4gQW55IGtleSB0aGF0IGRvbid0IGhhdmUgYW5cbiAqIG9wdGlvbiB3aWxsIGJlIHB1c2hlZCBiYWNrIGluIGAtLWAgYW5kIHJlbW92ZWQgZnJvbSB0aGUgb2JqZWN0LiBJZiB5b3UgbmVlZCB0byB2YWxpZGF0ZSB0aGF0XG4gKiB0aGVyZSdzIG5vIGFkZGl0aW9uYWxQcm9wZXJ0aWVzLCB5b3UgbmVlZCB0byBjaGVjayB0aGUgYC0tYCBrZXkuXG4gKlxuICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50IGFycmF5IHRvIHBhcnNlLlxuICogQHBhcmFtIG9wdGlvbnMgTGlzdCBvZiBzdXBwb3J0ZWQgb3B0aW9ucy4ge0BzZWUgT3B0aW9ufS5cbiAqIEBwYXJhbSBsb2dnZXIgTG9nZ2VyIHRvIHVzZSB0byB3YXJuIHVzZXJzLlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgb3B0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwsXG4gIGxvZ2dlcj86IGxvZ2dpbmcuTG9nZ2VyLFxuKTogQXJndW1lbnRzIHtcbiAgaWYgKG9wdGlvbnMgPT09IG51bGwpIHtcbiAgICBvcHRpb25zID0gW107XG4gIH1cblxuICBjb25zdCBsZWZ0b3ZlcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBvc2l0aW9uYWxzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcblxuICBjb25zdCBpZ25vcmVkOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGRlcHJlY2F0aW9uczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBzdGF0ZSA9IHsgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycywgaWdub3JlZCwgZXJyb3JzLCBkZXByZWNhdGlvbnMgfTtcblxuICBmb3IgKGxldCBhcmcgPSBhcmdzLnNoaWZ0KCk7IGFyZyAhPT0gdW5kZWZpbmVkOyBhcmcgPSBhcmdzLnNoaWZ0KCkpIHtcbiAgICBpZiAoYXJnID09ICctLScpIHtcbiAgICAgIC8vIElmIHdlIGZpbmQgYSAtLSwgd2UncmUgZG9uZS5cbiAgICAgIGxlZnRvdmVycy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdGFydHNXaXRoKCctLScpKSB7XG4gICAgICBfYXNzaWduT3B0aW9uKGFyZywgYXJncywgc3RhdGUpO1xuICAgIH0gZWxzZSBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgLy8gQXJndW1lbnQgaXMgb2YgZm9ybSAtYWJjZGVmLiAgU3RhcnRzIGF0IDEgYmVjYXVzZSB3ZSBza2lwIHRoZSBgLWAuXG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBmbGFnID0gYXJnW2ldO1xuICAgICAgICAvLyBJZiB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgYW4gJz0nLCB0cmVhdCBpdCBhcyBhIGxvbmcgZmxhZy5cbiAgICAgICAgaWYgKGFyZ1tpICsgMV0gPT0gJz0nKSB7XG4gICAgICAgICAgY29uc3QgZiA9ICctJyArIGZsYWcgKyBhcmcuc2xpY2UoaSArIDEpO1xuICAgICAgICAgIF9hc3NpZ25PcHRpb24oZiwgYXJncywgc3RhdGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRyZWF0IHRoZSBsYXN0IGZsYWcgYXMgYC0tYWAgKGFzIGlmIGZ1bGwgZmxhZyBidXQganVzdCBvbmUgbGV0dGVyKS4gV2UgZG8gdGhpcyBpblxuICAgICAgICAvLyB0aGUgbG9vcCBiZWNhdXNlIGl0IHNhdmVzIHVzIGEgY2hlY2sgdG8gc2VlIGlmIHRoZSBhcmcgaXMganVzdCBgLWAuXG4gICAgICAgIGlmIChpID09IGFyZy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgY29uc3QgYXJnID0gJy0nICsgZmxhZztcbiAgICAgICAgICBfYXNzaWduT3B0aW9uKGFyZywgYXJncywgc3RhdGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGZsYWcsIG9wdGlvbnMpO1xuICAgICAgICAgIGlmIChtYXliZU9wdGlvbikge1xuICAgICAgICAgICAgY29uc3QgdiA9IF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbiwgcGFyc2VkT3B0aW9uc1ttYXliZU9wdGlvbi5uYW1lXSk7XG4gICAgICAgICAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHBhcnNlZE9wdGlvbnNbbWF5YmVPcHRpb24ubmFtZV0gPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwb3NpdGlvbmFscy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgLy8gRGVhbCB3aXRoIHBvc2l0aW9uYWxzLlxuICAvLyBUT0RPKGhhbnNsKTogdGhpcyBpcyBieSBmYXIgdGhlIG1vc3QgY29tcGxleCBwaWVjZSBvZiBjb2RlIGluIHRoaXMgZmlsZS4gVHJ5IHRvIHJlZmFjdG9yIGl0XG4gIC8vICAgc2ltcGxlci5cbiAgaWYgKHBvc2l0aW9uYWxzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgcG9zID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBvc2l0aW9uYWxzLmxlbmd0aDspIHtcbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgbGV0IGluY3JlbWVudFBvcyA9IGZhbHNlO1xuICAgICAgbGV0IGluY3JlbWVudEkgPSB0cnVlO1xuXG4gICAgICAvLyBXZSBkbyB0aGlzIHdpdGggYSBmb3VuZCBmbGFnIGJlY2F1c2UgbW9yZSB0aGFuIDEgb3B0aW9uIGNvdWxkIGhhdmUgdGhlIHNhbWUgcG9zaXRpb25hbC5cbiAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gSWYgYW55IG9wdGlvbiBoYXMgdGhpcyBwb3NpdGlvbmFsIGFuZCBubyB2YWx1ZSwgQU5EIGZpdCB0aGUgdHlwZSwgd2UgbmVlZCB0byByZW1vdmUgaXQuXG4gICAgICAgIGlmIChvcHRpb24ucG9zaXRpb25hbCA9PT0gcG9zKSB7XG4gICAgICAgICAgY29uc3QgY29lcmNlZFZhbHVlID0gX2NvZXJjZShwb3NpdGlvbmFsc1tpXSwgb3B0aW9uLCBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSk7XG4gICAgICAgICAgaWYgKHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID09PSB1bmRlZmluZWQgJiYgY29lcmNlZFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gY29lcmNlZFZhbHVlO1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmNyZW1lbnRJID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluY3JlbWVudFBvcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgIHBvc2l0aW9uYWxzLnNwbGljZShpLS0sIDEpO1xuICAgICAgfVxuICAgICAgaWYgKGluY3JlbWVudFBvcykge1xuICAgICAgICBwb3MrKztcbiAgICAgIH1cbiAgICAgIGlmIChpbmNyZW1lbnRJKSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAocG9zaXRpb25hbHMubGVuZ3RoID4gMCB8fCBsZWZ0b3ZlcnMubGVuZ3RoID4gMCkge1xuICAgIHBhcnNlZE9wdGlvbnNbJy0tJ10gPSBbLi4ucG9zaXRpb25hbHMsIC4uLmxlZnRvdmVyc107XG4gIH1cblxuICBpZiAoZGVwcmVjYXRpb25zLmxlbmd0aCA+IDAgJiYgbG9nZ2VyKSB7XG4gICAgZGVwcmVjYXRpb25zLmZvckVhY2gobWVzc2FnZSA9PiBsb2dnZXIud2FybihtZXNzYWdlKSk7XG4gIH1cblxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgUGFyc2VBcmd1bWVudEV4Y2VwdGlvbihlcnJvcnMsIHBhcnNlZE9wdGlvbnMsIGlnbm9yZWQpO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlZE9wdGlvbnM7XG59XG4iXX0=