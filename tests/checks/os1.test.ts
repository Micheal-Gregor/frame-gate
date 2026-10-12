/**
 * OS-1 for TypeScript, parsed (IR-40; K7-era framework finding MF-26). The template's
 * line-regex check read `if (x === null) {` as a method named `if` with a default
 * argument; and because it scanned only tracked files, MOD-03's first pass was vacuous.
 * Each rule has a fixture that must be flagged; the conforming fixture is built from
 * exactly the shapes the regex got wrong.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
type Finding = [rule: string, line: number, message: string];
const os1 = (fixture: string): Finding[] =>
  JSON.parse(
    execFileSync(process.execPath, [resolve(repo, "tools/checks/ts-os1.mjs"), resolve(repo, "tests/fixtures/os1", fixture)], {
      cwd: repo,
      encoding: "utf8",
    }),
  ) as Finding[];
const rules = (f: Finding[]) => f.map(([r]) => r);

describe("OS-1, parsed", () => {
  it("test_a_default_argument_is_flagged_on_a_parameter_and_in_a_destructuring", () => {
    expect(rules(os1("default-argument.ts"))).toEqual(["OS-1_default_argument", "OS-1_default_argument"]);
  });

  it("test_a_rest_parameter_and_arguments_are_bags", () => {
    expect(rules(os1("bag-parameter.ts"))).toEqual(["OS-1_bag_parameter", "OS-1_bag_parameter"]);
  });

  it("test_taking_nothing_and_returning_a_literal_is_an_undeclared_input", () => {
    expect(rules(os1("undeclared-input.ts"))).toEqual([
      "OS-1_undeclared_input", "OS-1_undeclared_input", "OS-1_undeclared_input",
    ]);
  });

  it("test_a_module_constant_read_is_resolved_by_symbol_not_name", () => {
    // One read of the constant; the same-named PARAMETER in passesGiven is not one.
    expect(rules(os1("module-constant.ts"))).toEqual(["OS-1_module_constant"]);
  });

  it("test_the_shapes_the_regex_got_wrong_are_not_violations", () => {
    expect(os1("conforming.ts")).toEqual([]);
  });

  it("test_every_catalog_class_is_os1_clean", () => {
    for (const f of ["currency-order.ts", "unit-registry.ts", "declaration-ledger.ts", "independence-ledger.ts"]) {
      const out = JSON.parse(
        execFileSync(process.execPath, [resolve(repo, "tools/checks/ts-os1.mjs"), resolve(repo, "src/catalog", f)], {
          cwd: repo,
          encoding: "utf8",
        }),
      ) as Finding[];
      expect(out, f).toEqual([]);
    }
  });
});
