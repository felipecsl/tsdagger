"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
class DependencyInjectionParser {
    parseFileContents(fileContents) {
        const program = (0, typescript_estree_1.parse)(fileContents).body;
        const importedDefinitions = program
            .filter(({ type }) => type === 'ImportDeclaration')
            .flatMap((i) => this.parseImport(i));
        const results = program
            .filter(({ type }) => this.isClassDeclaration(type))
            .map((bodyElement) => this.parseClass(bodyElement));
        return [...importedDefinitions, ...results];
    }
    parseImport(importDeclaration) {
        // TODO: Do not parse the same file multiple times
        const source = importDeclaration.source.value;
        // TODO: Assuming relative path
        const filePath = `${source}.ts`;
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath).toString();
            return this.parseFileContents(buffer);
        }
        else {
            return [];
        }
    }
    parseClass(classDeclaration) {
        const bodyElementType = classDeclaration.type;
        if (['ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(bodyElementType)) {
            const declaration = classDeclaration
                .declaration;
            const params = this.parseClassBody(declaration.body);
            return { className: declaration.id?.name ?? '?', params };
        }
        else if (bodyElementType === 'ClassDeclaration') {
            const params = this.parseClassBody(classDeclaration.body);
            return { className: classDeclaration.id?.name ?? '?', params };
        }
        else {
            throw new Error(`Dont know how to parse ${bodyElementType}`);
        }
    }
    isClassDeclaration(bodyType) {
        switch (bodyType) {
            case 'ExportNamedDeclaration':
            case 'ExportDefaultDeclaration':
            case 'ClassDeclaration':
                return true;
            default:
                return false;
        }
    }
    parseClassBody(classBody) {
        return classBody.body
            .filter((body) => body.type === 'MethodDefinition')
            .flatMap((ctor) => ctor.value.params.map((param) => this.parseParam(param)));
    }
    parseParam(param) {
        const paramType = param.type;
        switch (paramType) {
            case 'TSParameterProperty': {
                const paramName = param.parameter.name;
                const typeAnnotation = param.parameter.typeAnnotation;
                const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
                return { name: paramName, type };
            }
            case 'Identifier': {
                const paramName = param.name;
                const typeAnnotation = param.typeAnnotation;
                const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
                return { name: paramName, type };
            }
            case 'RestElement': {
                const paramName = param.argument.name;
                const typeAnnotation = param.typeAnnotation;
                const type = this.parseTypeAnnotation(typeAnnotation?.typeAnnotation);
                return { name: `...${paramName}`, type };
            }
            case 'ObjectPattern': {
                const annotation = param.typeAnnotation?.typeAnnotation;
                const type = annotation ? this.parseTypeAnnotation(annotation) : '{}';
                const names = param.properties.map((p) => p.value.name);
                return { name: `{ ${names.join(', ')} }`, type };
            }
            case 'ArrayPattern': {
                const annotation = param.typeAnnotation?.typeAnnotation;
                const type = annotation ? this.parseTypeAnnotation(annotation) : '[]';
                const names = param.elements.map((e) => e.name).join(', ');
                return { name: `[${names}]`, type };
            }
            default:
                throw new Error(`dont know how to handle ctorParam ${paramType}`);
        }
    }
    parseTypeAnnotation(typeAnnotation) {
        const type = typeAnnotation.type;
        switch (type) {
            case 'TSTypeReference': {
                const typeName = typeAnnotation?.typeName;
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
exports.default = DependencyInjectionParser;
