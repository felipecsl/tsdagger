import "reflect-metadata";
import { getParamTypeMetadata, isComponent } from "./component";

export class Container {
  private instances = new Map<Function, unknown>();

  resolve<T>(target: new (...args: any[]) => T): T {
    if (this.instances.has(target)) {
      return this.instances.get(target) as T;
    }

    if (!isComponent(target)) {
      throw new Error(
        `Cannot resolve dependency of ${target.name}: invalid dependency. Make sure the class is annotated with @Component()`,
      );
    }

    const types = getParamTypeMetadata(target);
    if (!types) {
      throw new Error(
        `No constructor metadata found for ${target.name}. Make sure the class is annotated with @Component()`,
      );
    }

    // Recursively resolve dependencies
    // TODO: Handle loops gracefully
    const dependencies = types.map((dep: any) => {
      if (!dep) {
        throw new Error(
          `Cannot resolve dependency of ${target.name}: invalid dependency.`,
        );
      }
      return this.resolve(dep);
    });

    const instance = new target(...dependencies);
    this.instances.set(target, instance);

    return instance;
  }
}
