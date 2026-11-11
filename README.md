# Aurelia Scientific Calculator

A responsive scientific calculator built with React, TypeScript, and Vite. Its math engine is a standalone tokenizer and Pratt parser; user expressions are never evaluated with JavaScript `eval` or `Function`.

## Getting started

```sh
npm install
npm run dev
```

## Checks

```sh
npm test
npm run build
```

## Using the calculator

- Choose **DEG** or **RAD** for trigonometric functions.
- Type with the keypad or keyboard. Press **Enter** or `=` to calculate, **Backspace** to delete, **Esc** to clear, and `p` to insert π.
- Use **Ans** in a typed expression to refer to the previous calculated answer.
- Calculation history, memory, theme, digit grouping, and display precision are stored locally in this browser.

Supported expressions include arithmetic, parentheses, constants (`pi`, `e`, `ans`), postfix percentages and factorials, powers, and the functions `sin`, `cos`, `tan`, their inverses, hyperbolic and inverse-hyperbolic functions, `ln`, `log`, `sqrt`, `cbrt`, `root(value, degree)`, `abs`, `exp`, and `inv`.

Percentage is postfix scaling: `10%` is `0.1`, so `200*10%` evaluates to `20`. Exponentiation is right-associative and binds more tightly than a leading sign: `-2^2` is `-4`, while `(-2)^2` is `4`. Factorials are defined for non-negative integers up to 170. The calculator reports invalid syntax, real-domain errors, division by zero, and non-finite results without evaluating arbitrary code.
