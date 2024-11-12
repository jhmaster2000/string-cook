import { unraw } from 'unraw';

// Regexes
const regex = {
    // Matches indexed access operators e.g. obj['foo'] or obj["foo"]
    stringIndexedAccess: /\.?\[\s*(?<key>"(?:(?:[^"\r\n]|\\")*)(?<![^\\]\\)"|'(?:(?:[^'\r\n]|\\')*)(?<![^\\]\\)')\s*\]/g,
    // Matches array index access operators e.g. obj[0] or obj[97]
    arrayIndexAccess: /\.?\[\s*(?<key>\+?\s*(?:(?:\.(?:\d|(?<=\d)_(?=\d))+|(?:0|[1-9](?:\d|_\d)*)(?:\.(?:\d|(?<=\d)_(?=\d))*)?)(?:[Ee][+-]?(?:\d|(?<=\d)_(?=\d))+)?|0b(?:[01]|(?<=[01])_(?=[01]))+|0o(?:[0-7]|(?<=[0-7])_(?=[0-7]))+|0x(?:[\da-fA-F]|(?<=[\da-fA-F])_(?=[\da-fA-F]))+))\s*\]/g,
    // do not try to understand this regex, it just gets the job done
    demonicRegexForgedInTheFiresOfTheNinthCircleOfHell: /\$\{\s*(?<fullpath>(?<root>(?:[$_\p{ID_Start}]|\\u[\da-fA-F]{4})(?:[$\u200C\u200D\p{ID_Continue}]|\\u[\da-fA-F]{4})*?)(?:\s*(?:\??\.\s*(?:(?:[$_\p{ID_Start}]|\\u[\da-fA-F]{4})(?:[$\u200C\u200D\p{ID_Continue}]|\\u[\da-fA-F]{4})*?)|(?:\?\.\s*)?\[\s*(?:"(?:[^{}\\\r\n"]|\\.)*"|'(?:[^{}\\\r\n']|\\.)*'|\+?\s*(?:(?:\.(?:\d|(?<=\d)_(?=\d))+|(?:0|[1-9](?:\d|_\d)*)(?:\.(?:\d|(?<=\d)_(?=\d))*)?)(?:[Ee][+-]?(?:\d|(?<=\d)_(?=\d))+)?|0b(?:[01]|(?<=[01])_(?=[01]))+|0o(?:[0-7]|(?<=[0-7])_(?=[0-7]))+|0x(?:[\da-fA-F]|(?<=[\da-fA-F])_(?=[\da-fA-F]))+))\s*\]))*)\s*\}/gu,
    // ...
};

// Temporary special encodings to prevent dot notation from breaking when performing string replacements
const tempEncoding = {
    '.': '\0\uDFFF\0',
    '?': '\0\uDFFE\0',
};

/** @param {string} objPath */
function parseObjPath(objPath) {
    let /** @type {string} */ prevChar, /** @type {string} */ prevChar2;
    let /** @type {`"` | `'` | null} */ stringQuote = null;
    return [...objPath.trim()]
        // cleanup whitespace characters outside of strings
        .filter(c => {
            let KEEP = true;
            if (stringQuote) {
                if (c === stringQuote && prevChar !== '\\' && prevChar2 !== '\\') stringQuote = null;
                KEEP = true;
            } else if (c === `'` || c === `"`) {
                stringQuote = c;
                KEEP = true;
            } else if (/\s/.test(c)) KEEP = false;
            prevChar2 = prevChar;
            prevChar = c;
            return KEEP;
        }).join('')
        // convert indexed string access operators to dot notation
        .replaceAll(regex.stringIndexedAccess, (match, $1, offset, srcStr, groups) =>
            '.' + unraw(groups.key.slice(1, -1)).replaceAll('.', tempEncoding['.']).replaceAll('?', tempEncoding['?'])
        )
        // convert array index access operators to dot notation
        .replaceAll(regex.arrayIndexAccess, (match, $1, offset, srcStr, groups) =>
            '.' + groups.key.replaceAll('.', tempEncoding['.'])
        )
        // parse dot notation and optional chaining
        .split('.').map(k => ({
            key: (k.endsWith('?') ? k.slice(0, -1) : k).replaceAll(tempEncoding['.'], '.').replaceAll(tempEncoding['?'], '?'),
            optional: k.endsWith('?'),
        }));
}

/** 
 * @param {object} obj
 * @param {string} pathStr */
function getObjPath(obj, pathStr, fb = `$\{${pathStr}}`) {
    return parseObjPath(pathStr).reduce((currObj, { key, optional }) => {
        // TODO: Proper optional chaining behavior mimicking + error handling instead of just returning a fallback
        //console.info('processing key: ' + key);
        if (['object', 'function'].includes(typeof currObj)) {
            if (key in currObj) return currObj[key];
            else {
                //console.error('!!! failed on key below:', /*currObj*/); console.dir(key);
                return fb;
            }
        } else return fb;
    }, obj);
}

/**
 * @param {string} str
 * @param {Record<string, unknown>=} scope */
export function cook(str, scope = {}) {
    return str.replaceAll(regex.demonicRegexForgedInTheFiresOfTheNinthCircleOfHell, (match, $1, $2, offset, srcStr, groups) => {
        //const root = groups.root;
        const path = groups.fullpath;
        return getObjPath(scope, path);
    });
}

export default cook;
