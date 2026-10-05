import { describe, expect, it } from "vitest";
import { EventBus } from "../src/core/EventBus";

describe("EventBus", () => {
  it("subscribes and emits payloads", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.on<number>("counter", (value) => seen.push(value));
    bus.emit("counter", 3);
    bus.emit("counter", 7);
    expect(seen).toEqual([3, 7]);
  });

  it("unsubscribes", () => {
    const bus = new EventBus();
    let calls = 0;
    const unsubscribe = bus.on("ping", () => { calls += 1; });
    bus.emit("ping");
    unsubscribe();
    bus.emit("ping");
    expect(calls).toBe(1);
  });

  it("once fires exactly one time", () => {
    const bus = new EventBus();
    let calls = 0;
    bus.once("once", () => { calls += 1; });
    bus.emit("once");
    bus.emit("once");
    expect(calls).toBe(1);
  });

  it("off removes a normal listener", () => {
    const bus = new EventBus();
    let calls = 0;
    const listener = () => { calls += 1; };
    bus.on("ping", listener);
    bus.off("ping", listener);
    bus.emit("ping");
    expect(calls).toBe(0);
  });

  it("clear removes all listeners", () => {
    const bus = new EventBus();
    let calls = 0;
    bus.on("a", () => { calls += 1; });
    bus.on("b", () => { calls += 1; });
    bus.clear();
    bus.emit("a");
    bus.emit("b");
    expect(calls).toBe(0);
  });
});
