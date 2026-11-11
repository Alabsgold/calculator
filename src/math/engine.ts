export type AngleMode = "DEG" | "RAD";

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" | "%" | "!" }
  | { type: "leftParen" | "rightParen" | "comma" };

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationError";
  }
}

const functions: Record<string, (args: number[], angleMode: AngleMode) => number> = {
  sin: ([value], mode) => Math.sin(toRadians(value, mode)),
  cos: ([value], mode) => Math.cos(toRadians(value, mode)),
  tan: ([value], mode) => Math.tan(toRadians(value, mode)),
  asin: ([value], mode) => fromRadians(Math.asin(value), mode),
  acos: ([value], mode) => fromRadians(Math.acos(value), mode),
  atan: ([value], mode) => fromRadians(Math.atan(value), mode),
  sinh: ([value]) => Math.sinh(value),
  cosh: ([value]) => Math.cosh(value),
  tanh: ([value]) => Math.tanh(value),
  asinh: ([value]) => Math.asinh(value),
  acosh: ([value]) => Math.acosh(value),
  atanh: ([value]) => Math.atanh(value),
  ln: ([value]) => {
    if (value <= 0) throw new CalculationError("ln is defined for positive numbers.");
    return Math.log(value);
  },
  log: ([value]) => {
    if (value <= 0) throw new CalculationError("log is defined for positive numbers.");
    return Math.log10(value);
  },
  sqrt: ([value]) => {
    if (value < 0) throw new CalculationError("A real square root needs a non-negative number.");
    return Math.sqrt(value);
  },
  cbrt: ([value]) => Math.cbrt(value),
  abs: ([value]) => Math.abs(value),
  exp: ([value]) => Math.exp(value),
  inv: ([value]) => {
    if (value === 0) throw new CalculationError("Cannot divide by zero.");
    return 1 / value;
  },
  root: ([value, degree]) => {
    if (degree === 0) throw new CalculationError("The root degree cannot be zero.");
    if (value < 0 && !Number.isInteger(degree)) {
      throw new CalculationError("A negative number needs an integer root degree.");
    }
    if (value < 0 && Math.abs(degree % 2) === 1) return -((-value) ** (1 / degree));
    if (value < 0) throw new CalculationError("This root is not a real number.");
    return value ** (1 / degree);
  },
};

function toRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * 180) / Math.PI : value;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new CalculationError("Number is too large.");
      tokens.push({ type: "number", value });
      index += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[a-zA-Z]+/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0].toLowerCase() });
      index += identifier[0].length;
      continue;
    }

    if ("+-*/^%!".includes(char)) {
      tokens.push({ type: "operator", value: char as Extract<Token, { type: "operator" }>["value"] });
    } else if (char === "(") {
      tokens.push({ type: "leftParen" });
    } else if (char === ")") {
      tokens.push({ type: "rightParen" });
    } else if (char === ",") {
      tokens.push({ type: "comma" });
    } else {
      throw new CalculationError(`Unrecognized character: ${char}`);
    }
    index += 1;
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly angleMode: AngleMode,
    private readonly answer: number,
  ) {}

  parse(): number {
    if (this.tokens.length === 0) throw new CalculationError("Enter an expression to calculate.");
    const value = this.expression(0);
    if (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      throw new CalculationError(token.type === "rightParen" ? "There is an unmatched parenthesis." : "Check the expression.");
    }
    return this.checked(value);
  }

  private expression(minBindingPower: number): number {
    let left = this.prefix();

    while (this.position < this.tokens.length) {
      const token = this.tokens[this.position];

      if (token.type === "operator" && (token.value === "!" || token.value === "%")) {
        const power = 40;
        if (power < minBindingPower) break;
        this.position += 1;
        left = this.checked(token.value === "!" ? factorial(left) : left / 100);
        continue;
      }

      if (token.type !== "operator" || token.value === "!" || token.value === "%") break;
      const binding: Record<"+" | "-" | "*" | "/" | "^", [number, number]> = {
        "+": [10, 11],
        "-": [10, 11],
        "*": [20, 21],
        "/": [20, 21],
        "^": [30, 30],
      };
      const [leftPower, rightPower] = binding[token.value];
      if (leftPower < minBindingPower) break;
      this.position += 1;
      const right = this.expression(rightPower);

      if (token.value === "/" && right === 0) throw new CalculationError("Cannot divide by zero.");
      const result =
        token.value === "+" ? left + right :
        token.value === "-" ? left - right :
        token.value === "*" ? left * right :
        token.value === "/" ? left / right :
        left ** right;
      left = this.checked(result);
    }
    return left;
  }

  private prefix(): number {
    const token = this.tokens[this.position];
    if (!token) throw new CalculationError("Complete the expression.");
    this.position += 1;

    if (token.type === "number") return token.value;
    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      const value = this.expression(25);
      return token.value === "-" ? -value : value;
    }

    if (token.type === "leftParen") {
      const value = this.expression(0);
      if (this.tokens[this.position]?.type !== "rightParen") {
        throw new CalculationError("There is an unmatched parenthesis.");
      }
      this.position += 1;
      return value;
    }

    if (token.type === "identifier") {
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;
      if (token.value === "ans") return this.answer;
      if (!(token.value in functions)) throw new CalculationError(`Unknown function: ${token.value}`);
      if (this.tokens[this.position]?.type !== "leftParen") {
        throw new CalculationError(`${token.value} needs parentheses.`);
      }
      this.position += 1;
      const args: number[] = [];
      if (this.tokens[this.position]?.type !== "rightParen") {
        args.push(this.expression(0));
        while (this.tokens[this.position]?.type === "comma") {
          this.position += 1;
          args.push(this.expression(0));
        }
      }
      if (this.tokens[this.position]?.type !== "rightParen") {
        throw new CalculationError("There is an unmatched parenthesis.");
      }
      this.position += 1;
      const expectedArgs = token.value === "root" ? 2 : 1;
      if (args.length !== expectedArgs) {
        throw new CalculationError(`${token.value} needs ${expectedArgs} ${expectedArgs === 1 ? "value" : "values"}.`);
      }
      const operation = functions[token.value];
      if (!operation) throw new CalculationError(`Unknown function: ${token.value}`);
      return this.checked(operation(args, this.angleMode));
    }

    if (token.type === "rightParen") throw new CalculationError("There is an unmatched parenthesis.");
    if (token.type === "comma") throw new CalculationError("Check the function arguments.");
    throw new CalculationError("Complete the expression.");
  }

  private checked(value: number): number {
    if (!Number.isFinite(value)) throw new CalculationError("The result is outside the supported range.");
    return Object.is(value, -0) ? 0 : value;
  }
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new CalculationError("Factorial needs a non-negative integer.");
  }
  if (value > 170) throw new CalculationError("Factorial is too large to represent.");
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

export function evaluateExpression(
  expression: string,
  angleMode: AngleMode = "DEG",
  answer = 0,
): number {
  return new Parser(tokenize(expression), angleMode, answer).parse();
}

export function formatResult(value: number, precision = 10, useGrouping = true): string {
  if (!Number.isFinite(value)) return "—";
  const normalized = Object.is(value, -0) ? 0 : value;
  if (normalized !== 0 && (Math.abs(normalized) >= 1e12 || Math.abs(normalized) < 1e-8)) {
    return normalized.toExponential(Math.max(0, precision - 1)).replace(/\.?0+e/, "e");
  }
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: precision,
    useGrouping,
  }).format(normalized);
}
