import { describe, expect, it } from "vitest";
import { createSerialTaskQueue } from "../../worker/live/serialTaskQueue";

describe("createSerialTaskQueue", () => {
  it("serializes concurrent async mutations without losing updates", async () => {
    const queue = createSerialTaskQueue();
    let count = 0;

    await Promise.all(Array.from({ length: 30 }, () => queue.run(async () => {
      const current = count;
      await Promise.resolve();
      count = current + 1;
    })));

    expect(count).toBe(30);
  });
});
