import { describe, expect, it } from "vitest";
import { Container } from "../src/container";
import { Component } from "../src/component";

@Component()
class FooService {
  constructor() {}

  sayHi(): string {
    return "Hi from FooService";
  }
}

@Component()
class BarService {
  constructor(private readonly foo: FooService) {}

  greet(): string {
    return this.foo.sayHi();
  }
}

describe("Container", () => {
  it("should resolve a class with deps", () => {
    const container = new Container();
    const barService = container.resolve(BarService);
    expect(barService.greet()).toEqual("Hi from FooService");
  });

  it("Should resolve a class with no deps", () => {
    const container = new Container();
    const fooService = container.resolve(FooService);
    expect(fooService.sayHi()).toEqual("Hi from FooService");
  });
});
