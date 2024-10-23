"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = __importDefault(require("src/parser"));
describe('DependencyInjectionParser', () => {
    const parser = new parser_1.default();
    it('exported class', () => {
        const code = `export class Foo {
      constructor(readonly theBarParam: Bar) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: 'theBarParam', type: 'Bar' }] }]);
    });
    it('imported node module', () => {
        const code = `import { omit } from 'lodash';`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([]);
    });
    it('object pattern param', () => {
        const code = `@Injectable class Foo {
      constructor({ blah, test }: { blah: string, test: number }) {} 
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([
            { className: 'Foo', params: [{ name: '{ blah, test }', type: '{TypeLiteral}' }] },
        ]);
    });
    it('array pattern param', () => {
        const code = `@Injectable class Foo {
      constructor([blah]: string[]) {} 
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: '[blah]', type: 'string[]' }] }]);
    });
    it('imported class', () => {
        const code = `import './src/ts-dagger/foo';
    class Bar {
      constructor(foo: Foo) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual(expect.arrayContaining([
            { className: 'Bar', params: [{ name: 'foo', type: 'Foo' }] },
            { className: 'Foo', params: [{ name: 'something', type: 'number' }] },
        ]));
    });
    it('after class members', () => {
        const code = `export default abstract class Blah {
      private readonly logger: Logger;
      
      protected constructor(blah: { [k: string]: string }) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([
            { className: 'Blah', params: [{ name: 'blah', type: '{TypeLiteral}' }] },
        ]);
    });
    it('export default class', () => {
        const code = `export default class Blah {
      constructor() {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Blah', params: [] }]);
    });
    it('no classes', () => {
        const code = `{}`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([]);
    });
    it('any', () => {
        const code = `export class Foo {
      constructor(blah: any) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: 'blah', type: 'any' }] }]);
    });
    it('array arg', () => {
        const code = `export class Foo {
      constructor(blah: any[]) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: 'blah', type: 'any[]' }] }]);
    });
    it('spread arg', () => {
        const code = `export class Foo {
      constructor(...blah: any[]) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: '...blah', type: 'any[]' }] }]);
    });
    it('non-exported class', () => {
        const code = `class Foo {
      constructor(readonly hello: Bar) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([{ className: 'Foo', params: [{ name: 'hello', type: 'Bar' }] }]);
    });
    it('intersection param', () => {
        const code = `class Foo {
      constructor(readonly hello: number & void) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([
            { className: 'Foo', params: [{ name: 'hello', type: 'number & void' }] },
        ]);
    });
    it('multiple params', () => {
        const code = `class Foo {
      constructor(hello: HelloType, private readonly world: WorldType) {}
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([
            {
                className: 'Foo',
                params: [
                    { name: 'hello', type: 'HelloType' },
                    { name: 'world', type: 'WorldType' },
                ],
            },
        ]);
    });
    it('multiple classes, union types missing constructor', () => {
        const code = `class Foo {
      constructor(a: A | null | unknown, b: B | undefined) {}
    }
    
    class Bar {
    }`;
        const result = parser.parseFileContents(code);
        expect(result).toEqual([
            {
                className: 'Foo',
                params: [
                    { name: 'a', type: 'A | null | unknown' },
                    { name: 'b', type: 'B | undefined' },
                ],
            },
            {
                className: 'Bar',
                params: [],
            },
        ]);
    });
});
