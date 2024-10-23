import * as fs from 'node:fs';

import {
  ClassBody,
  ClassDeclarationWithOptionalName,
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  MethodDefinition,
  Parameter,
  ProgramStatement,
  TSTypeAnnotation,
  TypeNode,
} from '@typescript-eslint/types/dist/generated/ast-spec';
import { parse } from '@typescript-eslint/typescript-estree';

export type ParseParamResult = { name: string; type: string };
export type ParseResult = { className: string; params: ParseParamResult[] };

export default class DependencyInjectionParser {
  parseFileContents(fileContents: string): ParseResult[] {
    const program = parse(fileContents).body;
    const importedDefinitions = program
      .filter(({ type }) => type === 'ImportDeclaration')
      .flatMap((i) => this.parseImport(i as ImportDeclaration));
    const results = program
      .filter(({ type }) => this.isClassDeclaration(type))
      .map((bodyElement) => this.parseClass(bodyElement));
    return [...importedDefinitions, ...results];
  }

  private parseImport(importDeclaration: ImportDeclaration): ParseResult[] {
    // TODO: Do not parse the same file multiple times
    const source = importDeclaration.source.value;
    // TODO: Assuming relative path
    const filePath = `${source}.ts`;
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath).toString();
      return this.parseFileContents(buffer);
    } else {
      return [];
    }
  }

  private parseClass(classDeclaration: ProgramStatement): ParseResult {
    const bodyElementType = classDeclaration.type;
    if (['ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(bodyElementType)) {
      const declaration = (classDeclaration as ExportNamedDeclaration)
        .declaration as ClassDeclarationWithOptionalName;
      const params = this.parseClassBody(declaration.body);
      return { className: declaration.id?.name ?? '?', params };
    } else if (bodyElementType === 'ClassDeclaration') {
      const params = this.parseClassBody(classDeclaration.body);
      return { className: classDeclaration.id?.name ?? '?', params };
    } else {
      throw new Error(`Dont know how to parse ${bodyElementType}`);
    }
  }

  private isClassDeclaration(bodyType: ProgramStatement['type']): boolean {
    switch (bodyType) {
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ClassDeclaration':
        return true;
      default:
        return false;
    }
  }

  private parseClassBody(classBody: ClassBody): ParseParamResult[] {
    return classBody.body
      .filter((body) => body.type === 'MethodDefinition')
      .flatMap((ctor) =>
        (ctor as MethodDefinition).value.params.map((param) => this.parseParam(param)),
      );
  }

  private parseParam(param: Parameter): ParseParamResult {
    const paramType = param.type;
    switch (paramType) {
      case 'TSParameterProperty': {
        const paramName = (param.parameter as Identifier).name;
        const typeAnnotation = param.parameter.typeAnnotation as TSTypeAnnotation;
        const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
        return { name: paramName, type };
      }
      case 'Identifier': {
        const paramName = param.name;
        const typeAnnotation = param.typeAnnotation as TSTypeAnnotation;
        const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
        return { name: paramName, type };
      }
      case 'RestElement': {
        const paramName = (param.argument as Identifier).name;
        const typeAnnotation = param.typeAnnotation as TSTypeAnnotation;
        const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
        return { name: `...${paramName}`, type };
      }
      case 'ObjectPattern': {
        const annotation = param.typeAnnotation?.typeAnnotation;
        const type = annotation ? this.parseTypeAnnotation(annotation) : '{}';
        const names = param.properties.map((p) => (p.value as Identifier).name);
        return { name: `{ ${names.join(', ')} }`, type };
      }
      case 'ArrayPattern': {
        const annotation = param.typeAnnotation?.typeAnnotation;
        const type = annotation ? this.parseTypeAnnotation(annotation) : '[]';
        const names = param.elements.map((e) => (e as Identifier).name).join(', ');
        return { name: `[${names}]`, type };
      }
      default:
        throw new Error(`dont know how to handle ctorParam ${paramType}`);
    }
  }

  private parseTypeAnnotation(typeAnnotation: TypeNode): string {
    const type = typeAnnotation.type;
    switch (type) {
      case 'TSTypeReference': {
        const typeName = typeAnnotation?.typeName as Identifier;
        return typeName.name;
      }
      case 'TSArrayType':
        return this.parseTypeAnnotation(typeAnnotation.elementType) + '[]';
      case 'TSUnionType':
        return typeAnnotation.types.map((t) => this.parseTypeAnnotation(t)).join(' | ');
      case 'TSIntersectionType':
        return typeAnnotation.types.map((t) => this.parseTypeAnnotation(t)).join(' & ');
      case 'TSTypeLiteral':
        // TODO: parse type literal
        return '{TypeLiteral}';
      case 'TSNullKeyword':
        return 'null';
      case 'TSUndefinedKeyword':
        return 'undefined';
      case 'TSUnknownKeyword':
        return 'unknown';
      case 'TSAnyKeyword':
        return 'any';
      case 'TSNumberKeyword':
        return 'number';
      case 'TSStringKeyword':
        return 'string';
      case 'TSBigIntKeyword':
        return 'bigint';
      case 'TSBooleanKeyword':
        return 'boolean';
      case 'TSVoidKeyword':
        return 'void';
      default:
        throw new Error(`Dont know how to handle TypeNode ${type}`);
    }
  }
}
