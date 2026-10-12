import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("branding assets", () => {
  it("uses the EasyPZ mascot image as the favicon", () => {
    const html = readFileSync(resolve("index.html"), "utf8");

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="/easypz-mascot.png"');
    expect(existsSync(resolve("public/easypz-mascot.png"))).toBe(true);
  });
});
