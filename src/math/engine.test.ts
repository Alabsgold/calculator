import { describe, expect, it } from "vitest";
import { CalculationError, evaluateExpression } from "./engine";

describe("evaluateExpression", () => {
  it("applies arithmetic precedence and grouping", () => {
    expect(evaluateExpression("2+3*4")).toBe(14);
    expect(evaluateExpression("(2+3)*4")).toBe(20);
    expect(evaluateExpression("((2+3)*4)/2")).toBe(10);
  });

  it("handles unary signs and right-associative powers", () => {
    expect(evaluateExpression("-2^2")).toBe(-4);
    expect(evaluateExpression("(-2)^2")).toBe(4);
    expect(evaluateExpression("2^3^2")).toBe(512);
    expect(evaluateExpression("2^-2")).toBe(0.25);
  });

  it("uses explicit postfix percentage semantics", () => {
    expect(evaluateExpression("200*10%")).toBe(20);
    expect(evaluateExpression("50%+0.25")).toBe(0.75);
  });

  it("evaluates scientific functions in the requested angle mode", () => {
    expect(evaluateExpression("sin(30)", "DEG")).toBeCloseTo(0.5);
    expect(evaluateExpression("sin(pi/6)", "RAD")).toBeCloseTo(0.5);
    expect(evaluateExpression("asin(0.5)", "DEG")).toBeCloseTo(30);
    expect(evaluateExpression("sinh(1)", "RAD")).toBeCloseTo(Math.sinh(1));
    expect(evaluateExpression("log(1000)")).toBe(3);
    expect(evaluateExpression("ln(e)")).toBeCloseTo(1);
    expect(evaluateExpression("sqrt(81)+root(32,5)")).toBeCloseTo(11);
    expect(evaluateExpression("exp(1)")).toBeCloseTo(Math.E);
    expect(evaluateExpression("abs(-4)+inv(2)")).toBe(4.5);
  });

  it("handles factorial, constants, and previous answer", () => {
    expect(evaluateExpression("5!")).toBe(120);
    expect(evaluateExpression("0!")).toBe(1);
    expect(evaluateExpression("pi+e")).toBeCloseTo(Math.PI + Math.E);
    expect(evaluateExpression("ans*2", "DEG", 21)).toBe(42);
  });

  it("rejects malformed, non-real, and non-finite calculations", () => {
    for (const expression of ["", "2/0", "sqrt(-1)", "ln(0)", "(-3)!", "171!", "2^10000", "(2+3"]) {
      expect(() => evaluateExpression(expression)).toThrow(CalculationError);
    }
  });
});
