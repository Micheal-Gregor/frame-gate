/**
 * The respelling rule, tested for the host this build does NOT run on.
 *
 * K7 round 3 (CC-4) found path assertions that were true on POSIX and false on
 * Windows. The fix is only worth what it can be shown to do, and on Linux the
 * respelling is the identity - so a test of `reported()` alone proves nothing
 * about the arm that failed. `respell` takes the separator as an argument
 * precisely so the Windows arm is reachable from here.
 */
import { describe, expect, it } from "vitest";
import { isAbsolute, resolve, sep } from "node:path";
import { reported, respell } from "../../tools/checks/reported-path.js";

describe("reported paths are platform-stable", () => {
  it("test_windows_separators_are_respelled_as_forward_slashes", () => {
    // The exact shape that made `v.file.endsWith("src/facts/index.ts")` false.
    const windows = "C:\\Users\\x\\frame-gate\\src\\facts\\index.ts";
    const out = respell(windows, "\\");
    expect(out).toBe("C:/Users/x/frame-gate/src/facts/index.ts");
    expect(out.endsWith("src/facts/index.ts")).toBe(true);
  });

  it("test_posix_paths_are_unchanged", () => {
    const posix = "/home/x/frame-gate/src/facts/index.ts";
    expect(respell(posix, "/")).toBe(posix);
  });

  it("test_the_constructor_absolutises_and_respells_the_host_separator", () => {
    // Properties, not a second copy of the implementation (K7 round 4, CC-7 /
    // DR-10: the previous first assertion compared reported() with its own body,
    // so it could not fail, and the second was a ternary with identical arms).
    // Each line below fails for some reported() that breaks the rule.
    const made = reported("src/facts/index.ts");
    expect(isAbsolute(made), "not absolutised").toBe(true);
    expect(made, "a host separator survived").not.toContain("\\");
    expect(made.endsWith("/src/facts/index.ts"), "the relative tail was altered").toBe(true);
    // Lossless: undoing the respelling on this host gives back exactly the host's
    // own absolute path - nothing dropped, re-cased or reordered on the way.
    expect(made.split("/").join(sep)).toBe(resolve("src/facts/index.ts"));
  });
});
