# string-cook
Cook (interpolate) raw template literal strings without unsafe dynamic code execution.

## Example Usage
- `sample.txt`
```txt
Hello, ${user.name}!\nYou are currently ${user.age} years old.
```
- `sample.js`
```js
import cookString from 'string-cook';
import fs from 'fs';

const rawString = fs.readFileSync('sample.txt', 'utf8');
// 'Hello, ${user.name}!\\nYou are currently ${user.age} years old.'

const user = { name: 'Bill', age: 27 };
const cooked = cookString(rawString, { user });
// Hello, Bill!
// You are currently 27 years old.

/* Obviously, you can also pass strings directly from code rather than a file: */
const welcomeBack = 'Welcome back ${user.name}!';
const cooked2 = cookString(welcomeBack, { user });
// Welcome back Bill!
```

## API
There is only one function:
```ts
cook(str: string, scope?: Record<string, unknown> = {}): string
```
This function is both the default export and a named export.

* `str`: The input string to cook / interpolate.
* `scope`: An object containing the variables which are exposed to the string interpolation. `${title}` on the input string will attempt to map to the value of a property named **title** in the `scope` object.
    * Infinitely nested properties are supported, therefore the string `${foo.bar.baz}` is valid and maps to the value of **123** with an example `scope` object of `{ foo: { bar: { baz: 123 } } }`
    * The `scope` object can contain properties not used by the input string.
    * If the `scope` object does not contain a property used within the input string, the current behavior is to fallback to leaving the `${...}` text in place. (Proper error handling coming soon)
    * The `scope` object is optional and can be empty or omitted.
        * Cooking strings without a `scope` object is still useful to cook escape sequences, such as `\\n` (the `\` character followed by `n`) to `\n` (the newline character escape sequence)

## Features and Limitations
* Accurate to ECMAScript specification standards for valid identifiers. Invalid identifiers according to the spec are ignored. (Example: `${1invalid}`)
* Only static object key identifiers **are supported**, any form of dynamic expression, such as `${user.age + 1}`, is **not supported** and will be ignored.
* Indexed access syntax **is supported**, such as `${user['age']}` or `${user["age"]}`
    * Backtick ( **\`** ) quotes in indexed access are **not supported**, since nested string cooking is **not supported** therefore it would serve no purpose.
* Optional chaining access syntax **is supported**, such as `${user?.email}` or `${user?.['email']}`
    * Currently, `?.` is parsed but treated identical to `.`, proper optional chaining behavior mimicking will come at a later update.
* Unicode character escapes **are supported**, such as `${us\u0065r}` or `${user['ag\u0065']}`
    * Unicode code point escapes (`\u{000000}`) are **not supported** due to breaking the parsing of `${...}`
    * Other character escapes, such as hex (`\x00`) or octal (`\0`) are **not supported** in identifiers as the spec disallows it. However they **are supported** in indexed access strings.
* Array index access **is supported**, such as `${user.friends[0]}`
    * The full JS numeric literal syntax **is supported**, this includes:
        * Hex literals (`0x00`), octal literals (`0o00`) and binary literals (`0b00`)
        * Scientific notation literals (`1e9`, `3E+7`, `2.7e-4`)
        * Fractions (`.5`, `0.5`, `5.`, `5.0`, `967.830041`)
        * Numeric separators (`1_500_000`, `0xFFFF_FFFF`)
        * Unary `+` operator (`+42`)
    * The following **unsupported** exceptions apply:
        * Unary `-` operator / negative numbers (`-81`)
        * The literals `Infinity`, `-Infinity` and `NaN`
* Whitespace-insensivity **is supported**, such as `${   user  .    age }` is correctly parsed as `${user.age}`
