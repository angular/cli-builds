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
function _coerceType(str, type, v) {
    switch (type) {
        case 'any':
            if (Array.isArray(v)) {
                return v.concat(str || '');
            }
            return _coerceType(str, interface_1.OptionType.Boolean, v) !== undefined
                ? _coerceType(str, interface_1.OptionType.Boolean, v)
                : _coerceType(str, interface_1.OptionType.Number, v) !== undefined
                    ? _coerceType(str, interface_1.OptionType.Number, v)
                    : _coerceType(str, interface_1.OptionType.String, v);
        case 'string':
            return str || '';
        case 'boolean':
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
        case 'number':
            if (str === undefined) {
                return 0;
            }
            else if (Number.isFinite(+str)) {
                return +str;
            }
            else {
                return undefined;
            }
        case 'array':
            return Array.isArray(v) ? v.concat(str || '') : [str || ''];
        default:
            return undefined;
    }
}
function _coerce(str, o, v) {
    if (!o) {
        return _coerceType(str, interface_1.OptionType.Any, v);
    }
    else if (o.type == 'suboption') {
        return _coerceType(str, interface_1.OptionType.String, v);
    }
    else {
        return _coerceType(str, o.type, v);
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
function _assignOption(arg, args, options, parsedOptions, _positionals, leftovers) {
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
                // Not of type boolean, consume the next value.
                value = args[0];
                // Only absorb it if it leads to a value.
                if (_coerce(value, maybeOption) !== undefined) {
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
            if (option.type === 'boolean' && _coerce(value, option) === undefined) {
                value = 'true';
            }
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
            _assignOption(arg, args, options, parsedOptions, positionals, leftovers);
        }
        else if (arg.startsWith('-')) {
            // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
            for (let i = 1; i < arg.length; i++) {
                const flag = arg[i];
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    _assignOption('--' + flag, args, options, parsedOptions, positionals, leftovers);
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
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUErQztBQUMvQywyQ0FBbUU7QUFHbkUscUJBQXFCLEdBQXVCLEVBQUUsSUFBZ0IsRUFBRSxDQUFTO0lBQ3ZFLFFBQVEsSUFBSSxFQUFFO1FBQ1osS0FBSyxLQUFLO1lBQ1IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwQixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQzVCO1lBRUQsT0FBTyxXQUFXLENBQUMsR0FBRyxFQUFFLHNCQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLFNBQVM7Z0JBQ3ZELENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLHNCQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDekMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztvQkFDdEQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUN4QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoRCxLQUFLLFFBQVE7WUFDWCxPQUFPLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFFbkIsS0FBSyxTQUFTO1lBQ1osUUFBUSxHQUFHLEVBQUU7Z0JBQ1gsS0FBSyxPQUFPO29CQUNWLE9BQU8sS0FBSyxDQUFDO2dCQUVmLEtBQUssU0FBUyxDQUFDO2dCQUNmLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssTUFBTTtvQkFDVCxPQUFPLElB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QUFHLEVBQUUsQ0FBQzthQUNQO1lBQ0QsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsQ0FBQyxFQUFFLENBQUM7YUFDTDtTQUNGO0tBQ0Y7SUFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ2xELGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7S0FDdEQ7SUFFRCxPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDO0FBcEZELHdDQW9GQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKlxuICovXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBPcHRpb24sIE9wdGlvblR5cGUsIFZhbHVlIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuXG5cbmZ1bmN0aW9uIF9jb2VyY2VUeXBlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBPcHRpb25UeXBlLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ2FueSc6XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICByZXR1cm4gdi5jb25jYXQoc3RyIHx8ICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5Cb29sZWFuLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpXG4gICAgICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdikgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICA/IF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5OdW1iZXIsIHYpXG4gICAgICAgICAgIDogX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLlN0cmluZywgdik7XG5cbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHN0ciB8fCAnJztcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgc3dpdGNoIChzdHIpIHtcbiAgICAgICAgY2FzZSAnZmFsc2UnOlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAndHJ1ZSc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIGlmIChzdHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gZWxzZSBpZiAoTnVtYmVyLmlzRmluaXRlKCtzdHIpKSB7XG4gICAgICAgIHJldHVybiArc3RyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHYpID8gdi5jb25jYXQoc3RyIHx8ICcnKSA6IFtzdHIgfHwgJyddO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvZXJjZShzdHI6IHN0cmluZyB8IHVuZGVmaW5lZCwgbzogT3B0aW9uIHwgbnVsbCwgdj86IFZhbHVlKTogVmFsdWUgfCB1bmRlZmluZWQge1xuICBpZiAoIW8pIHtcbiAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkFueSwgdik7XG4gIH0gZWxzZSBpZiAoby50eXBlID09ICdzdWJvcHRpb24nKSB7XG4gICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgT3B0aW9uVHlwZS5TdHJpbmcsIHYpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBfY29lcmNlVHlwZShzdHIsIG8udHlwZSwgdik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0T3B0aW9uRnJvbU5hbWUobmFtZTogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25bXSk6IE9wdGlvbiB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGNOYW1lID0gc3RyaW5ncy5jYW1lbGl6ZShuYW1lKTtcblxuICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbi5uYW1lID09IG5hbWUgfHwgb3B0aW9uLm5hbWUgPT0gY05hbWUpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbi5hbGlhc2VzLnNvbWUoeCA9PiB4ID09IG5hbWUgfHwgeCA9PSBjTmFtZSkpIHtcbiAgICAgIHJldHVybiBvcHRpb247XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBfYXNzaWduT3B0aW9uKFxuICBhcmc6IHN0cmluZyxcbiAgYXJnczogc3RyaW5nW10sXG4gIG9wdGlvbnM6IE9wdGlvbltdLFxuICBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMsXG4gIF9wb3NpdGlvbmFsczogc3RyaW5nW10sXG4gIGxlZnRvdmVyczogc3RyaW5nW10sXG4pIHtcbiAgbGV0IGtleSA9IGFyZy5zdWJzdHIoMik7XG4gIGxldCBvcHRpb246IE9wdGlvbiB8IG51bGwgPSBudWxsO1xuICBsZXQgdmFsdWUgPSAnJztcbiAgY29uc3QgaSA9IGFyZy5pbmRleE9mKCc9Jyk7XG5cbiAgLy8gSWYgZmxhZyBpcyAtLW5vLWFiYyBBTkQgdGhlcmUncyBubyBlcXVhbCBzaWduLlxuICBpZiAoaSA9PSAtMSkge1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnbm8tJykpIHtcbiAgICAgIC8vIE9ubHkgdXNlIHRoaXMga2V5IGlmIHRoZSBvcHRpb24gbWF0Y2hpbmcgdGhlIHJlc3QgaXMgYSBib29sZWFuLlxuICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LnN1YnN0cigzKSwgb3B0aW9ucyk7XG4gICAgICBpZiAobWF5YmVPcHRpb24gJiYgbWF5YmVPcHRpb24udHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdmFsdWUgPSAnZmFsc2UnO1xuICAgICAgICBvcHRpb24gPSBtYXliZU9wdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGtleS5zdGFydHNXaXRoKCdubycpKSB7XG4gICAgICAvLyBPbmx5IHVzZSB0aGlzIGtleSBpZiB0aGUgb3B0aW9uIG1hdGNoaW5nIHRoZSByZXN0IGlzIGEgYm9vbGVhbi5cbiAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleS5zdWJzdHIoMiksIG9wdGlvbnMpO1xuICAgICAgaWYgKG1heWJlT3B0aW9uICYmIG1heWJlT3B0aW9uLnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHZhbHVlID0gJ2ZhbHNlJztcbiAgICAgICAgb3B0aW9uID0gbWF5YmVPcHRpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgICAgLy8gU2V0IGl0IHRvIHRydWUgaWYgaXQncyBhIGJvb2xlYW4gYW5kIHRoZSBuZXh0IGFyZ3VtZW50IGRvZXNuJ3QgbWF0Y2ggdHJ1ZS9mYWxzZS5cbiAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGtleSwgb3B0aW9ucyk7XG4gICAgICBpZiAobWF5YmVPcHRpb24pIHtcbiAgICAgICAgLy8gTm90IG9mIHR5cGUgYm9vbGVhbiwgY29uc3VtZSB0aGUgbmV4dCB2YWx1ZS5cbiAgICAgICAgdmFsdWUgPSBhcmdzWzBdO1xuICAgICAgICAvLyBPbmx5IGFic29yYiBpdCBpZiBpdCBsZWFkcyB0byBhIHZhbHVlLlxuICAgICAgICBpZiAoX2NvZXJjZSh2YWx1ZSwgbWF5YmVPcHRpb24pICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBvcHRpb24gPSBtYXliZU9wdGlvbjtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAga2V5ID0gYXJnLnN1YnN0cmluZygwLCBpKTtcbiAgICBvcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LCBvcHRpb25zKSB8fCBudWxsO1xuICAgIGlmIChvcHRpb24pIHtcbiAgICAgIHZhbHVlID0gYXJnLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICBpZiAob3B0aW9uLnR5cGUgPT09ICdib29sZWFuJyAmJiBfY29lcmNlKHZhbHVlLCBvcHRpb24pID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsdWUgPSAndHJ1ZSc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChvcHRpb24gPT09IG51bGwpIHtcbiAgICBpZiAoYXJnc1swXSAmJiAhYXJnc1swXS5zdGFydHNXaXRoKCctLScpKSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcsIGFyZ3NbMF0pO1xuICAgICAgYXJncy5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCB2ID0gX2NvZXJjZSh2YWx1ZSwgb3B0aW9uLCBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSk7XG4gICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPSB2O1xuICAgIH1cbiAgfVxufVxuXG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyBpbiBhIGNvbnNpc3RlbnQgd2F5LCBidXQgd2l0aG91dCBoYXZpbmcgYW55IG9wdGlvbiBkZWZpbml0aW9uLiBUaGlzIHRyaWVzXG4gKiB0byBhc3Nlc3Mgd2hhdCB0aGUgdXNlciB3YW50cyBpbiBhIGZyZWUgZm9ybS4gRm9yIGV4YW1wbGUsIHVzaW5nIGAtLW5hbWU9ZmFsc2VgIHdpbGwgc2V0IHRoZVxuICogbmFtZSBwcm9wZXJ0aWVzIHRvIGEgYm9vbGVhbiB0eXBlLlxuICogVGhpcyBzaG91bGQgb25seSBiZSB1c2VkIHdoZW4gdGhlcmUncyBubyBzY2hlbWEgYXZhaWxhYmxlIG9yIGlmIGEgc2NoZW1hIGlzIFwidHJ1ZVwiIChhbnl0aGluZyBpc1xuICogdmFsaWQpLlxuICpcbiAqIEBwYXJhbSBhcmdzIEFyZ3VtZW50IGxpc3QgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBhIHByb3BlcnR5IHBlciBmbGFncyBmcm9tIHRoZSBhcmdzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGcmVlRm9ybUFyZ3VtZW50cyhhcmdzOiBzdHJpbmdbXSk6IEFyZ3VtZW50cyB7XG4gIGNvbnN0IHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyA9IHt9O1xuICBjb25zdCBsZWZ0b3ZlcnMgPSBbXTtcblxuICBmb3IgKGxldCBhcmcgPSBhcmdzLnNoaWZ0KCk7IGFyZyAhPT0gdW5kZWZpbmVkOyBhcmcgPSBhcmdzLnNoaWZ0KCkpIHtcbiAgICBpZiAoYXJnID09ICctLScpIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdGFydHNXaXRoKCctLScpKSB7XG4gICAgICBjb25zdCBlcVNpZ24gPSBhcmcuaW5kZXhPZignPScpO1xuICAgICAgbGV0IG5hbWU6IHN0cmluZztcbiAgICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKGVxU2lnbiAhPT0gLTEpIHtcbiAgICAgICAgbmFtZSA9IGFyZy5zdWJzdHJpbmcoMiwgZXFTaWduKTtcbiAgICAgICAgdmFsdWUgPSBhcmcuc3Vic3RyaW5nKGVxU2lnbiArIDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZSA9IGFyZy5zdWJzdHIoMik7XG4gICAgICAgIHZhbHVlID0gYXJncy5zaGlmdCgpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2ID0gX2NvZXJjZSh2YWx1ZSwgbnVsbCwgcGFyc2VkT3B0aW9uc1tuYW1lXSk7XG4gICAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcnNlZE9wdGlvbnNbbmFtZV0gPSB2O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgYXJnLnNwbGl0KCcnKS5mb3JFYWNoKHggPT4gcGFyc2VkT3B0aW9uc1t4XSA9IHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0b3ZlcnMucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlZE9wdGlvbnNbJy0tJ10gPSBsZWZ0b3ZlcnM7XG5cbiAgcmV0dXJuIHBhcnNlZE9wdGlvbnM7XG59XG5cblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIGluIGEgY29uc2lzdGVudCB3YXksIGZyb20gYSBsaXN0IG9mIHN0YW5kYXJkaXplZCBvcHRpb25zLlxuICogVGhlIHJlc3VsdCBvYmplY3Qgd2lsbCBoYXZlIGEga2V5IHBlciBvcHRpb24gbmFtZSwgd2l0aCB0aGUgYF9gIGtleSByZXNlcnZlZCBmb3IgcG9zaXRpb25hbFxuICogYXJndW1lbnRzLCBhbmQgYC0tYCB3aWxsIGNvbnRhaW4gZXZlcnl0aGluZyB0aGF0IGRpZCBub3QgbWF0Y2guIEFueSBrZXkgdGhhdCBkb24ndCBoYXZlIGFuXG4gKiBvcHRpb24gd2lsbCBiZSBwdXNoZWQgYmFjayBpbiBgLS1gIGFuZCByZW1vdmVkIGZyb20gdGhlIG9iamVjdC4gSWYgeW91IG5lZWQgdG8gdmFsaWRhdGUgdGhhdFxuICogdGhlcmUncyBubyBhZGRpdGlvbmFsUHJvcGVydGllcywgeW91IG5lZWQgdG8gY2hlY2sgdGhlIGAtLWAga2V5LlxuICpcbiAqIEBwYXJhbSBhcmdzIFRoZSBhcmd1bWVudCBhcnJheSB0byBwYXJzZS5cbiAqIEBwYXJhbSBvcHRpb25zIExpc3Qgb2Ygc3VwcG9ydGVkIG9wdGlvbnMuIHtAc2VlIE9wdGlvbn0uXG4gKiBAcmV0dXJucyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBhIHByb3BlcnR5IHBlciBvcHRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUFyZ3VtZW50cyhhcmdzOiBzdHJpbmdbXSwgb3B0aW9uczogT3B0aW9uW10gfCBudWxsKTogQXJndW1lbnRzIHtcbiAgaWYgKG9wdGlvbnMgPT09IG51bGwpIHtcbiAgICBvcHRpb25zID0gW107XG4gIH1cblxuICBjb25zdCBsZWZ0b3ZlcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBvc2l0aW9uYWxzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwYXJzZWRPcHRpb25zOiBBcmd1bWVudHMgPSB7fTtcblxuICBmb3IgKGxldCBhcmcgPSBhcmdzLnNoaWZ0KCk7IGFyZyAhPT0gdW5kZWZpbmVkOyBhcmcgPSBhcmdzLnNoaWZ0KCkpIHtcbiAgICBpZiAoIWFyZykge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGFyZyA9PSAnLS0nKSB7XG4gICAgICAvLyBJZiB3ZSBmaW5kIGEgLS0sIHdlJ3JlIGRvbmUuXG4gICAgICBsZWZ0b3ZlcnMucHVzaCguLi5hcmdzKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgX2Fzc2lnbk9wdGlvbihhcmcsIGFyZ3MsIG9wdGlvbnMsIHBhcnNlZE9wdGlvbnMsIHBvc2l0aW9uYWxzLCBsZWZ0b3ZlcnMpO1xuICAgIH0gZWxzZSBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgLy8gQXJndW1lbnQgaXMgb2YgZm9ybSAtYWJjZGVmLiAgU3RhcnRzIGF0IDEgYmVjYXVzZSB3ZSBza2lwIHRoZSBgLWAuXG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGFyZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBmbGFnID0gYXJnW2ldO1xuICAgICAgICAvLyBUcmVhdCB0aGUgbGFzdCBmbGFnIGFzIGAtLWFgIChhcyBpZiBmdWxsIGZsYWcgYnV0IGp1c3Qgb25lIGxldHRlcikuIFdlIGRvIHRoaXMgaW5cbiAgICAgICAgLy8gdGhlIGxvb3AgYmVjYXVzZSBpdCBzYXZlcyB1cyBhIGNoZWNrIHRvIHNlZSBpZiB0aGUgYXJnIGlzIGp1c3QgYC1gLlxuICAgICAgICBpZiAoaSA9PSBhcmcubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIF9hc3NpZ25PcHRpb24oJy0tJyArIGZsYWcsIGFyZ3MsIG9wdGlvbnMsIHBhcnNlZE9wdGlvbnMsIHBvc2l0aW9uYWxzLCBsZWZ0b3ZlcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG1heWJlT3B0aW9uID0gX2dldE9wdGlvbkZyb21OYW1lKGZsYWcsIG9wdGlvbnMpO1xuICAgICAgICAgIGlmIChtYXliZU9wdGlvbikge1xuICAgICAgICAgICAgY29uc3QgdiA9IF9jb2VyY2UodW5kZWZpbmVkLCBtYXliZU9wdGlvbiwgcGFyc2VkT3B0aW9uc1ttYXliZU9wdGlvbi5uYW1lXSk7XG4gICAgICAgICAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHBhcnNlZE9wdGlvbnNbbWF5YmVPcHRpb24ubmFtZV0gPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwb3NpdGlvbmFscy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgLy8gRGVhbCB3aXRoIHBvc2l0aW9uYWxzLlxuICBpZiAocG9zaXRpb25hbHMubGVuZ3RoID4gMCkge1xuICAgIGxldCBwb3MgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zaXRpb25hbHMubGVuZ3RoOykge1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50UG9zID0gZmFsc2U7XG4gICAgICBsZXQgaW5jcmVtZW50SSA9IHRydWU7XG5cbiAgICAgIC8vIFdlIGRvIHRoaXMgd2l0aCBhIGZvdW5kIGZsYWcgYmVjYXVzZSBtb3JlIHRoYW4gMSBvcHRpb24gY291bGQgaGF2ZSB0aGUgc2FtZSBwb3NpdGlvbmFsLlxuICAgICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgICAvLyBJZiBhbnkgb3B0aW9uIGhhcyB0aGlzIHBvc2l0aW9uYWwgYW5kIG5vIHZhbHVlLCB3ZSBuZWVkIHRvIHJlbW92ZSBpdC5cbiAgICAgICAgaWYgKG9wdGlvbi5wb3NpdGlvbmFsID09PSBwb3MpIHtcbiAgICAgICAgICBpZiAocGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZV0gPSBwb3NpdGlvbmFsc1tpXTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5jcmVtZW50SSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpbmNyZW1lbnRQb3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICBwb3NpdGlvbmFscy5zcGxpY2UoaS0tLCAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbmNyZW1lbnRQb3MpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICB9XG4gICAgICBpZiAoaW5jcmVtZW50SSkge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHBvc2l0aW9uYWxzLmxlbmd0aCA+IDAgfHwgbGVmdG92ZXJzLmxlbmd0aCA+IDApIHtcbiAgICBwYXJzZWRPcHRpb25zWyctLSddID0gWy4uLnBvc2l0aW9uYWxzLCAuLi5sZWZ0b3ZlcnNdO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlZE9wdGlvbnM7XG59XG4iXX0=