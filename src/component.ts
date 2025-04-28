import "reflect-metadata";

const COMPONENT_METADATA_KEY = Symbol("component");
const COMPONENT_PARAM_TYPES_METADATA_KEY = Symbol("componentParamTypes");

export function Component(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(COMPONENT_METADATA_KEY, true, target);
    const types = getConstructorParamTypes(target);
    Reflect.defineMetadata(COMPONENT_PARAM_TYPES_METADATA_KEY, types, target);
  };
}

export function getParamTypeMetadata(target: Function): any[] {
  return Reflect.getMetadata(COMPONENT_PARAM_TYPES_METADATA_KEY, target);
}

function getConstructorParamTypes(target: Function): any[] {
  const types = Reflect.getMetadata("design:paramtypes", target);
  if (!types) {
    throw new Error(
      `No constructor param types found for ${target.name}. Make sure 'emitDecoratorMetadata' is enabled.`,
    );
  }
  if (types.length === 0) {
    return []; // No ctor args
  }
  return types;
}

export function isComponent(target: Function): boolean {
  return Reflect.getMetadata(COMPONENT_METADATA_KEY, target) === true;
}
