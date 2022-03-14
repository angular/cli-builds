"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArguments = exports.parseFreeFormArguments = exports.ParseArgumentException = void 0;
const core_1 = require("@angular-devkit/core");
const interface_1 = require("./interface");
class ParseArgumentException extends core_1.BaseException {
    constructor(comments, parsed, ignored) {
        super(`One or more errors occurred while parsing arguments:\n  ${comments.join('\n  ')}`);
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
            if (maybeResult !== undefined && (!o.enum || o.enum.includes(maybeResult))) {
                return maybeResult;
            }
        }
        return undefined;
    }
}
function _getOptionFromName(name, options) {
    const camelName = /(-|_)/.test(name) ? core_1.strings.camelize(name) : name;
    for (const option of options) {
        if (option.name === name || option.name === camelName) {
            return option;
        }
        if (option.aliases.some((x) => x === name || x === camelName)) {
            return option;
        }
    }
    return undefined;
}
function _removeLeadingDashes(key) {
    const from = key.startsWith('--') ? 2 : key.startsWith('-') ? 1 : 0;
    return key.substr(from);
}
function _assignOption(arg, nextArg, { options, parsedOptions, leftovers, ignored, errors, warnings, }) {
    const from = arg.startsWith('--') ? 2 : 1;
    let consumedNextArg = false;
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
                value = nextArg;
                let shouldShift = true;
                if (value && value.startsWith('-') && _coerce(undefined, maybeOption) !== undefined) {
                    // Verify if not having a value results in a correct parse, if so don't shift.
                    shouldShift = false;
                }
                // Only absorb it if it leads to a better value.
                if (shouldShift && _coerce(value, maybeOption) !== undefined) {
                    consumedNextArg = true;
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
        if (nextArg && !nextArg.startsWith('-')) {
            leftovers.push(arg, nextArg);
            consumedNextArg = true;
        }
        else {
            leftovers.push(arg);
        }
    }
    else {
        const v = _coerce(value, option, parsedOptions[option.name]);
        if (v !== undefined) {
            if (parsedOptions[option.name] !== v) {
                if (parsedOptions[option.name] !== undefined && option.type !== interface_1.OptionType.Array) {
                    warnings.push(`Option ${JSON.stringify(option.name)} was already specified with value ` +
                        `${JSON.stringify(parsedOptions[option.name])}. The new value ${JSON.stringify(v)} ` +
                        `will override it.`);
                }
                parsedOptions[option.name] = v;
            }
        }
        else {
            let error = `Argument ${key} could not be parsed using value ${JSON.stringify(value)}.`;
            if (option.enum) {
                error += ` Valid values are: ${option.enum.map((x) => JSON.stringify(x)).join(', ')}.`;
            }
            else {
                error += `Valid type(s) is: ${(option.types || [option.type]).join(', ')}`;
            }
            errors.push(error);
            ignored.push(arg);
        }
        if (/^[a-z]+[A-Z]/.test(key)) {
            warnings.push('Support for camel case arguments has been deprecated and will be removed in a future major version.\n' +
                `Use '--${core_1.strings.dasherize(key)}' instead of '--${key}'.`);
        }
    }
    return consumedNextArg;
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
            arg.split('').forEach((x) => (parsedOptions[x] = true));
        }
        else {
            leftovers.push(arg);
        }
    }
    if (leftovers.length) {
        parsedOptions['--'] = leftovers;
    }
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
    for (let argIndex = 0; argIndex < args.length; argIndex++) {
        const arg = args[argIndex];
        let consumedNextArg = false;
        if (arg == '--') {
            // If we find a --, we're done.
            leftovers.push(...args.slice(argIndex + 1));
            break;
        }
        if (arg.startsWith('--')) {
            consumedNextArg = _assignOption(arg, args[argIndex + 1], state);
        }
        else if (arg.startsWith('-')) {
            // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
            for (let i = 1; i < arg.length; i++) {
                const flag = arg[i];
                // If the next character is an '=', treat it as a long flag.
                if (arg[i + 1] == '=') {
                    const f = '-' + flag + arg.slice(i + 1);
                    consumedNextArg = _assignOption(f, args[argIndex + 1], state);
                    break;
                }
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    const arg = '-' + flag;
                    consumedNextArg = _assignOption(arg, args[argIndex + 1], state);
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
        if (consumedNextArg) {
            argIndex++;
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
        warnings.forEach((message) => logger.warn(message));
    }
    if (errors.length > 0) {
        throw new ParseArgumentException(errors, parsedOptions, ignored);
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvbW9kZWxzL3BhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBdUU7QUFDdkUsMkNBQW1FO0FBRW5FLE1BQWEsc0JBQXVCLFNBQVEsb0JBQWE7SUFDdkQsWUFDa0IsUUFBa0IsRUFDbEIsTUFBaUIsRUFDakIsT0FBaUI7UUFFakMsS0FBSyxDQUFDLDJEQUEyRCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUoxRSxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFdBQU0sR0FBTixNQUFNLENBQVc7UUFDakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUduQyxDQUFDO0NBQ0Y7QUFSRCx3REFRQztBQUVELFNBQVMsV0FBVyxDQUFDLEdBQXVCLEVBQUUsSUFBZ0IsRUFBRSxDQUFTO0lBQ3ZFLFFBQVEsSUFBSSxFQUFFO1FBQ1osS0FBSyxzQkFBVSxDQUFDLEdBQUc7WUFDakIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwQixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQzVCO1lBRUQsT0FBTyxXQUFXLENBQUMsR0FBRyxFQUFFLHNCQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLFNBQVM7Z0JBQzFELENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLHNCQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDekMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztvQkFDdEQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxN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QkFDTCxVQUFVLEdBQUcsS0FBSyxDQUFDO3FCQUNwQjtvQkFDRCxZQUFZLEdBQUcsSUFBSSxDQUFDO2lCQUNyQjthQUNGO1lBRUQsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUM1QjtZQUNELElBQUksWUFBWSxFQUFFO2dCQUNoQixHQUFHLEVBQUUsQ0FBQzthQUNQO1lBQ0QsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsQ0FBQyxFQUFFLENBQUM7YUFDTDtTQUNGO0tBQ0Y7SUFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ2xELGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7S0FDdEQ7SUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sRUFBRTtRQUNqQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDckQ7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2xFO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQW5IRCx3Q0FtSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQmFzZUV4Y2VwdGlvbiwgbG9nZ2luZywgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3VtZW50cywgT3B0aW9uLCBPcHRpb25UeXBlLCBWYWx1ZSB9IGZyb20gJy4vaW50ZXJmYWNlJztcblxuZXhwb3J0IGNsYXNzIFBhcnNlQXJndW1lbnRFeGNlcHRpb24gZXh0ZW5kcyBCYXNlRXhjZXB0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGNvbW1lbnRzOiBzdHJpbmdbXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgcGFyc2VkOiBBcmd1bWVudHMsXG4gICAgcHVibGljIHJlYWRvbmx5IGlnbm9yZWQ6IHN0cmluZ1tdLFxuICApIHtcbiAgICBzdXBlcihgT25lIG9yIG1vcmUgZXJyb3JzIG9jY3VycmVkIHdoaWxlIHBhcnNpbmcgYXJndW1lbnRzOlxcbiAgJHtjb21tZW50cy5qb2luKCdcXG4gICcpfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb2VyY2VUeXBlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBPcHRpb25UeXBlLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgT3B0aW9uVHlwZS5Bbnk6XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICByZXR1cm4gdi5jb25jYXQoc3RyIHx8ICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5Cb29sZWFuLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpXG4gICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdikgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5OdW1iZXIsIHYpXG4gICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLlN0cmluZywgdik7XG5cbiAgICBjYXNlIE9wdGlvblR5cGUuU3RyaW5nOlxuICAgICAgcmV0dXJuIHN0ciB8fCAnJztcblxuICAgIGNhc2UgT3B0aW9uVHlwZS5Cb29sZWFuOlxuICAgICAgc3dpdGNoIChzdHIpIHtcbiAgICAgICAgY2FzZSAnZmFsc2UnOlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAndHJ1ZSc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgY2FzZSBPcHRpb25UeXBlLk51bWJlcjpcbiAgICAgIGlmIChzdHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gZWxzZSBpZiAoc3RyID09PSAnJykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChOdW1iZXIuaXNGaW5pdGUoK3N0cikpIHtcbiAgICAgICAgcmV0dXJuICtzdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgY2FzZSBPcHRpb25UeXBlLkFycmF5OlxuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodilcbiAgICAgICAgPyB2LmNvbmNhdChzdHIgfHwgJycpXG4gICAgICAgIDogdiA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gW3N0ciB8fCAnJ11cbiAgICAgICAgOiBbdiArICcnLCBzdHIgfHwgJyddO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvZXJjZShzdHI6IHN0cmluZyB8IHVuZGVmaW5lZCwgbzogT3B0aW9uIHwgbnVsbCwgdj86IFZhbHVlKTogVmFsdWUgfCB1bmRlZmluZWQge1xuICBpZiAoIW8pIHtcbiAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkFueSwgdik7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHlwZXMgPSBvLnR5cGVzIHx8IFtvLnR5cGVdO1xuXG4gICAgLy8gVHJ5IGFsbCB0aGUgdHlwZXMgb25lIGJ5IG9uZSBhbmQgcGljayB0aGUgZmlyc3Qgb25lIHRoYXQgcmV0dXJucyBhIHZhbHVlIGNvbnRhaW5lZCBpbiB0aGVcbiAgICAvLyBlbnVtLiBJZiB0aGVyZSdzIG5vIGVudW0sIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBvbmUgdGhhdCBtYXRjaGVzLlxuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgY29uc3QgbWF5YmVSZXN1bHQgPSBfY29lcmNlVHlwZShzdHIsIHR5cGUsIHYpO1xuICAgICAgaWYgKG1heWJlUmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgKCFvLmVudW0gfHwgby5lbnVtLmluY2x1ZGVzKG1heWJlUmVzdWx0KSkpIHtcbiAgICAgICAgcmV0dXJuIG1heWJlUmVzdWx0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2dldE9wdGlvbkZyb21OYW1lKG5hbWU6IHN0cmluZywgb3B0aW9uczogT3B0aW9uW10pOiBPcHRpb24gfCB1bmRlZmluZWQge1xuICBjb25zdCBjYW1lbE5hbWUgPSAvKC18XykvLnRlc3QobmFtZSkgPyBzdHJpbmdzLmNhbWVsaXplKG5hbWUpIDogbmFtZTtcblxuICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbi5uYW1lID09PSBuYW1lIHx8IG9wdGlvbi5uYW1lID09PSBjYW1lbE5hbWUpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbi5hbGlhc2VzLnNvbWUoKHgpID0+IHggPT09IG5hbWUgfHwgeCA9PT0gY2FtZWxOYW1lKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlTGVhZGluZ0Rhc2hlcyhrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGZyb20gPSBrZXkuc3RhcnRzV2l0aCgnLS0nKSA/IDIgOiBrZXkuc3RhcnRzV2l0aCgnLScpID8gMSA6IDA7XG5cbiAgcmV0dXJuIGtleS5zdWJzdHIoZnJvbSk7XG59XG5cbmZ1bmN0aW9uIF9hc3NpZ25PcHRpb24oXG4gIGFyZzogc3RyaW5nLFxuICBuZXh0QXJnOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHtcbiAgICBvcHRpb25zLFxuICAgIHBhcnNlZE9wdGlvbnMsXG4gICAgbGVmdG92ZXJzLFxuICAgIGlnbm9yZWQsXG4gICAgZXJyb3JzLFxuICAgIHdhcm5pbmdzLFxuICB9OiB7XG4gICAgb3B0aW9uczogT3B0aW9uW107XG4gICAgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzO1xuICAgIHBvc2l0aW9uYWxzOiBzdHJpbmdbXTtcbiAgICBsZWZ0b3ZlcnM6IHN0cmluZ1tdO1xuICAgIGlnbm9yZWQ6IHN0cmluZ1tdO1xuICAgIGVycm9yczogc3RyaW5nW107XG4gICAgd2FybmluZ3M6IHN0cmluZ1tdO1xuICB9LFxuKSB7XG4gIGNvbnN0IGZyb20gPSBhcmcuc3RhcnRzV2l0aCgnLS0nKSA/IDIgOiAxO1xuICBsZXQgY29uc3VtZWROZXh0QXJnID0gZmFsc2U7XG4gIGxldCBrZXkgPSBhcmcuc3Vic3RyKGZyb20pO1xuICBsZXQgb3B0aW9uOiBPcHRpb24gfCBudWxsID0gbnVsbDtcbiAgbGV0IHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQgPSAnJztcbiAgY29uc3QgaSA9IGFyZy5pbmRleE9mKCc9Jyk7XG5cbiAgLy8gSWYgZmxhZyBpcyAtLW5vLWFiYyBBTkQgdGhlcmUncyBubyBlcXVhbCBzaWduLlxuICBpZiAoaSA9PSAtMSkge1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8nKSkge1xuICAgICAgLy8gT25seSB1c2UgdGhpcyBrZXkgaWYgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgcmVzdCBpcyBhIGJvb2xlYW4uXG4gICAgICBjb25zdCBmcm9tID0ga2V5LnN0YXJ0c1dpdGgoJ25vLScpID8gMyA6IDI7XG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShzdHJpbmdzLmNhbWVsaXplKGtleS5zdWJzdHIoZnJvbSkpLCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbiAmJiBtYXliZU9wdGlvbi50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICB2YWx1ZSA9ICdmYWxzZSc7XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb24gPT09IG51bGwpIHtcbiAgICAgIC8vIFNldCBpdCB0byB0cnVlIGlmIGl0J3MgYSBib29sZWFuIGFuZCB0aGUgbmV4dCBhcmd1bWVudCBkb2Vzbid0IG1hdGNoIHRydWUvZmFsc2UuXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgIHZhbHVlID0gbmV4dEFyZztcbiAgICAgICAgbGV0IHNob3VsZFNoaWZ0ID0gdHJ1ZTtcblxuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuc3RhcnRzV2l0aCgnLScpICYmIF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFZlcmlmeSBpZiBub3QgaGF2aW5nIGEgdmFsdWUgcmVzdWx0cyBpbiBhIGNvcnJlY3QgcGFyc2UsIGlmIHNvIGRvbid0IHNoaWZ0LlxuICAgICAgICAgIHNob3VsZFNoaWZ0ID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGFic29yYiBpdCBpZiBpdCBsZWFkcyB0byBhIGJldHRlciB2YWx1ZS5cbiAgICAgICAgaWYgKHNob3VsZFNoaWZ0ICYmIF9jb2VyY2UodmFsdWUsIG1heWJlT3B0aW9uKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3VtZWROZXh0QXJnID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBrZXkgPSBhcmcuc3Vic3RyaW5nKDAsIGkpO1xuICAgIG9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShfcmVtb3ZlTGVhZGluZ0Rhc2hlcyhrZXkpLCBvcHRpb25zKSB8fCBudWxsO1xuICAgIGlmIChvcHRpb24pIHtcbiAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhpICsgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgIGlmIChuZXh0QXJnICYmICFuZXh0QXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgbGVmdG92ZXJzLnB1c2goYXJnLCBuZXh0QXJnKTtcbiAgICAgIGNvbnN1bWVkTmV4dEFyZyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IHYgPSBfY29lcmNlKHZhbHVlLCBvcHRpb24sIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdKTtcbiAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAocGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gIT09IHYpIHtcbiAgICAgICAgaWYgKHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdICE9PSB1bmRlZmluZWQgJiYgb3B0aW9uLnR5cGUgIT09IE9wdGlvblR5cGUuQXJyYXkpIHtcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKFxuICAgICAgICAgICAgYE9wdGlvbiAke0pTT04uc3RyaW5naWZ5KG9wdGlvbi5uYW1lKX0gd2FzIGFscmVhZHkgc3BlY2lmaWVkIHdpdGggdmFsdWUgYCArXG4gICAgICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdKX0uIFRoZSBuZXcgdmFsdWUgJHtKU09OLnN0cmluZ2lmeSh2KX0gYCArXG4gICAgICAgICAgICAgIGB3aWxsIG92ZXJyaWRlIGl0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGVycm9yID0gYEFyZ3VtZW50ICR7a2V5fSBjb3VsZCBub3QgYmUgcGFyc2VkIHVzaW5nIHZhbHVlICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfS5gO1xuICAgICAgaWYgKG9wdGlvbi5lbnVtKSB7XG4gICAgICAgIGVycm9yICs9IGAgVmFsaWQgdmFsdWVzIGFyZTogJHtvcHRpb24uZW51bS5tYXAoKHgpID0+IEpTT04uc3RyaW5naWZ5KHgpKS5qb2luKCcsICcpfS5gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IgKz0gYFZhbGlkIHR5cGUocykgaXM6ICR7KG9wdGlvbi50eXBlcyB8fCBbb3B0aW9uLnR5cGVdKS5qb2luKCcsICcpfWA7XG4gICAgICB9XG5cbiAgICAgIGVycm9ycy5wdXNoKGVycm9yKTtcbiAgICAgIGlnbm9yZWQucHVzaChhcmcpO1xuICAgIH1cblxuICAgIGlmICgvXlthLXpdK1tBLVpdLy50ZXN0KGtleSkpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goXG4gICAgICAgICdTdXBwb3J0IGZvciBjYW1lbCBjYXNlIGFyZ3VtZW50cyBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgbWFqb3IgdmVyc2lvbi5cXG4nICtcbiAgICAgICAgICBgVXNlICctLSR7c3RyaW5ncy5kYXNoZXJpemUoa2V5KX0nIGluc3RlYWQgb2YgJy0tJHtrZXl9Jy5gLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uc3VtZWROZXh0QXJnO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgYnV0IHdpdGhvdXQgaGF2aW5nIGFueSBvcHRpb24gZGVmaW5pdGlvbi4gVGhpcyB0cmllc1xuICogdG8gYXNzZXNzIHdoYXQgdGhlIHVzZXIgd2FudHMgaW4gYSBmcmVlIGZvcm0uIEZvciBleGFtcGxlLCB1c2luZyBgLS1uYW1lPWZhbHNlYCB3aWxsIHNldCB0aGVcbiAqIG5hbWUgcHJvcGVydGllcyB0byBhIGJvb2xlYW4gdHlwZS5cbiAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB3aGVuIHRoZXJlJ3Mgbm8gc2NoZW1hIGF2YWlsYWJsZSBvciBpZiBhIHNjaGVtYSBpcyBcInRydWVcIiAoYW55dGhpbmcgaXNcbiAqIHZhbGlkKS5cbiAqXG4gKiBAcGFyYW0gYXJncyBBcmd1bWVudCBsaXN0IHRvIHBhcnNlLlxuICogQHJldHVybnMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBwcm9wZXJ0eSBwZXIgZmxhZ3MgZnJvbSB0aGUgYXJncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRnJlZUZvcm1Bcmd1bWVudHMoYXJnczogc3RyaW5nW10pOiBBcmd1bWVudHMge1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcbiAgY29uc3QgbGVmdG92ZXJzID0gW107XG5cbiAgZm9yIChsZXQgYXJnID0gYXJncy5zaGlmdCgpOyBhcmcgIT09IHVuZGVmaW5lZDsgYXJnID0gYXJncy5zaGlmdCgpKSB7XG4gICAgaWYgKGFyZyA9PSAnLS0nKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaCguLi5hcmdzKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgY29uc3QgZXFTaWduID0gYXJnLmluZGV4T2YoJz0nKTtcbiAgICAgIGxldCBuYW1lOiBzdHJpbmc7XG4gICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChlcVNpZ24gIT09IC0xKSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyaW5nKDIsIGVxU2lnbik7XG4gICAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhlcVNpZ24gKyAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgPSBhcmcuc3Vic3RyKDIpO1xuICAgICAgICB2YWx1ZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdiA9IF9jb2VyY2UodmFsdWUsIG51bGwsIHBhcnNlZE9wdGlvbnNbbmFtZV0pO1xuICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJzZWRPcHRpb25zW25hbWVdID0gdjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGFyZy5zcGxpdCgnJykuZm9yRWFjaCgoeCkgPT4gKHBhcnNlZE9wdGlvbnNbeF0gPSB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGxlZnRvdmVycy5sZW5ndGgpIHtcbiAgICBwYXJzZWRPcHRpb25zWyctLSddID0gbGVmdG92ZXJzO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlZE9wdGlvbnM7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyBpbiBhIGNvbnNpc3RlbnQgd2F5LCBmcm9tIGEgbGlzdCBvZiBzdGFuZGFyZGl6ZWQgb3B0aW9ucy5cbiAqIFRoZSByZXN1bHQgb2JqZWN0IHdpbGwgaGF2ZSBhIGtleSBwZXIgb3B0aW9uIG5hbWUsIHdpdGggdGhlIGBfYCBrZXkgcmVzZXJ2ZWQgZm9yIHBvc2l0aW9uYWxcbiAqIGFyZ3VtZW50cywgYW5kIGAtLWAgd2lsbCBjb250YWluIGV2ZXJ5dGhpbmcgdGhhdCBkaWQgbm90IG1hdGNoLiBBbnkga2V5IHRoYXQgZG9uJ3QgaGF2ZSBhblxuICogb3B0aW9uIHdpbGwgYmUgcHVzaGVkIGJhY2sgaW4gYC0tYCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBvYmplY3QuIElmIHlvdSBuZWVkIHRvIHZhbGlkYXRlIHRoYXRcbiAqIHRoZXJlJ3Mgbm8gYWRkaXRpb25hbFByb3BlcnRpZXMsIHlvdSBuZWVkIHRvIGNoZWNrIHRoZSBgLS1gIGtleS5cbiAqXG4gKiBAcGFyYW0gYXJncyBUaGUgYXJndW1lbnQgYXJyYXkgdG8gcGFyc2UuXG4gKiBAcGFyYW0gb3B0aW9ucyBMaXN0IG9mIHN1cHBvcnRlZCBvcHRpb25zLiB7QHNlZSBPcHRpb259LlxuICogQHBhcmFtIGxvZ2dlciBMb2dnZXIgdG8gdXNlIHRvIHdhcm4gdXNlcnMuXG4gKiBAcmV0dXJucyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBhIHByb3BlcnR5IHBlciBvcHRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUFyZ3VtZW50cyhcbiAgYXJnczogc3RyaW5nW10sXG4gIG9wdGlvbnM6IE9wdGlvbltdIHwgbnVsbCxcbiAgbG9nZ2VyPzogbG9nZ2luZy5Mb2dnZXIsXG4pOiBBcmd1bWVudHMge1xuICBpZiAob3B0aW9ucyA9PT0gbnVsbCkge1xuICAgIG9wdGlvbnMgPSBbXTtcbiAgfVxuXG4gIGNvbnN0IGxlZnRvdmVyczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcG9zaXRpb25hbHM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyA9IHt9O1xuXG4gIGNvbnN0IGlnbm9yZWQ6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3Qgc3RhdGUgPSB7IG9wdGlvbnMsIHBhcnNlZE9wdGlvbnMsIHBvc2l0aW9uYWxzLCBsZWZ0b3ZlcnMsIGlnbm9yZWQsIGVycm9ycywgd2FybmluZ3MgfTtcblxuICBmb3IgKGxldCBhcmdJbmRleCA9IDA7IGFyZ0luZGV4IDwgYXJncy5sZW5ndGg7IGFyZ0luZGV4KyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2FyZ0luZGV4XTtcbiAgICBsZXQgY29uc3VtZWROZXh0QXJnID0gZmFsc2U7XG5cbiAgICBpZiAoYXJnID09ICctLScpIHtcbiAgICAgIC8vIElmIHdlIGZpbmQgYSAtLSwgd2UncmUgZG9uZS5cbiAgICAgIGxlZnRvdmVycy5wdXNoKC4uLmFyZ3Muc2xpY2UoYXJnSW5kZXggKyAxKSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGNvbnN1bWVkTmV4dEFyZyA9IF9hc3NpZ25PcHRpb24oYXJnLCBhcmdzW2FyZ0luZGV4ICsgMV0sIHN0YXRlKTtcbiAgICB9IGVsc2UgaWYgKGFyZy5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIC8vIEFyZ3VtZW50IGlzIG9mIGZvcm0gLWFiY2RlZi4gIFN0YXJ0cyBhdCAxIGJlY2F1c2Ugd2Ugc2tpcCB0aGUgYC1gLlxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGFyZ1tpXTtcbiAgICAgICAgLy8gSWYgdGhlIG5leHQgY2hhcmFjdGVyIGlzIGFuICc9JywgdHJlYXQgaXQgYXMgYSBsb25nIGZsYWcuXG4gICAgICAgIGlmIChhcmdbaSArIDFdID09ICc9Jykge1xuICAgICAgICAgIGNvbnN0IGYgPSAnLScgKyBmbGFnICsgYXJnLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICBjb25zdW1lZE5leHRBcmcgPSBfYXNzaWduT3B0aW9uKGYsIGFyZ3NbYXJnSW5kZXggKyAxXSwgc3RhdGUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRyZWF0IHRoZSBsYXN0IGZsYWcgYXMgYC0tYWAgKGFzIGlmIGZ1bGwgZmxhZyBidXQganVzdCBvbmUgbGV0dGVyKS4gV2UgZG8gdGhpcyBpblxuICAgICAgICAvLyB0aGUgbG9vcCBiZWNhdXNlIGl0IHNhdmVzIHVzIGEgY2hlY2sgdG8gc2VlIGlmIHRoZSBhcmcgaXMganVzdCBgLWAuXG4gICAgICAgIGlmIChpID09IGFyZy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgY29uc3QgYXJnID0gJy0nICsgZmxhZztcbiAgICAgICAgICBjb25zdW1lZE5leHRBcmcgPSBfYXNzaWduT3B0aW9uKGFyZywgYXJnc1thcmdJbmRleCArIDFdLCBzdGF0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoZmxhZywgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gX2NvZXJjZSh1bmRlZmluZWQsIG1heWJlT3B0aW9uLCBwYXJzZWRPcHRpb25zW21heWJlT3B0aW9uLm5hbWVdKTtcbiAgICAgICAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1ttYXliZU9wdGlvbi5uYW1lXSA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc2l0aW9uYWxzLnB1c2goYXJnKTtcbiAgICB9XG5cbiAgICBpZiAoY29uc3VtZWROZXh0QXJnKSB7XG4gICAgICBhcmdJbmRleCsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIERlYWwgd2l0aCBwb3NpdGlvbmFscy5cbiAgLy8gVE9ETyhoYW5zbCk6IHRoaXMgaXMgYnkgZmFyIHRoZSBtb3N0IGNvbXBsZXggcGllY2Ugb2YgY29kZSBpbiB0aGlzIGZpbGUuIFRyeSB0byByZWZhY3RvciBpdFxuICAvLyAgIHNpbXBsZXIuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3NpdGlvbmFscy5sZW5ndGg7ICkge1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50UG9zID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50SSA9IHRydWU7XG5cbiAgICAgIC8vIFdlIGRvIHRoaXMgd2l0aCBhIGZvdW5kIGZsYWcgYmVjYXVzZSBtb3JlIHRoYW4gMSBvcHRpb24gY291bGQgaGF2ZSB0aGUgc2FtZSBwb3NpdGlvbmFsLlxuICAgICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgICAvLyBJZiBhbnkgb3B0aW9uIGhhcyB0aGlzIHBvc2l0aW9uYWwgYW5kIG5vIHZhbHVlLCBBTkQgZml0IHRoZSB0eXBlLCB3ZSBuZWVkIHRvIHJlbW92ZSBpdC5cbiAgICAgICAgaWYgKG9wdGlvbi5wb3NpdGlvbmFsID09PSBwb3MpIHtcbiAgICAgICAgICBjb25zdCBjb2VyY2VkVmFsdWUgPSBfY29lcmNlKHBvc2l0aW9uYWxzW2ldLCBvcHRpb24sIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdKTtcbiAgICAgICAgICBpZiAocGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPT09IHVuZGVmaW5lZCAmJiBjb2VyY2VkVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPSBjb2VyY2VkVmFsdWU7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluY3JlbWVudEkgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5jcmVtZW50UG9zID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgcG9zaXRpb25hbHMuc3BsaWNlKGktLSwgMSk7XG4gICAgICB9XG4gICAgICBpZiAoaW5jcmVtZW50UG9zKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgfVxuICAgICAgaWYgKGluY3JlbWVudEkpIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwIHx8IGxlZnRvdmVycy5sZW5ndGggPiAwKSB7XG4gICAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IFsuLi5wb3NpdGlvbmFscywgLi4ubGVmdG92ZXJzXTtcbiAgfVxuXG4gIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwICYmIGxvZ2dlcikge1xuICAgIHdhcm5pbmdzLmZvckVhY2goKG1lc3NhZ2UpID0+IGxvZ2dlci53YXJuKG1lc3NhZ2UpKTtcbiAgfVxuXG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBQYXJzZUFyZ3VtZW50RXhjZXB0aW9uKGVycm9ycywgcGFyc2VkT3B0aW9ucywgaWdub3JlZCk7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cbiJdfQ==