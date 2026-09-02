import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "./result";

describe("Result<T, E>", () => {
  it("creates a successful result with ok()", () => {
    const result = ok("success_payload");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("success_payload");
    }
  });

  it("creates an error result with err()", () => {
    const result = err("failure_reason");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("failure_reason");
    }
  });

  it("supports type narrowing via discriminated union", () => {
    function processResult(res: Result<number, string>): string {
      if (res.ok) {
        return `Value: ${res.value}`;
      }
      return `Error: ${res.error}`;
    }

    expect(processResult(ok(42))).toBe("Value: 42");
    expect(processResult(err("not_found"))).toBe("Error: not_found");
  });
});
