import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Command,
  Delete,
  History,
  Keyboard,
  MemoryStick,
  MoreHorizontal,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateExpression, formatResult, type AngleMode } from "../math/engine";

type HistoryEntry = {
  id: string;
  expression: string;
  result: number;
  createdAt: number;
};

type Preferences = {
  precision: number;
  grouping: boolean;
  theme: "light" | "dark";
};

const HISTORY_KEY = "aurelia.history";
const PREFERENCES_KEY = "aurelia.preferences";
const MEMORY_KEY = "aurelia.memory";
const DEFAULT_PREFERENCES: Preferences = { precision: 10, grouping: true, theme: "light" };

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function prettyExpression(expression: string): string {
  return expression
    .replace(/pi/gi, "π")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−");
}

function App() {
  const [expression, setExpression] = useState("sin(30)");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [answer, setAnswer] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => readStorage(HISTORY_KEY, []));
  const [memory, setMemory] = useState<number | null>(() => readStorage(MEMORY_KEY, null));
  const [preferences, setPreferences] = useState<Preferences>(() =>
    readStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES),
  );
  const [panel, setPanel] = useState<"history" | "settings" | null>(null);
  const [memoryNotice, setMemoryNotice] = useState("");
  const [justCalculated, setJustCalculated] = useState(false);
  const expressionRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  const result = useMemo(() => {
    if (!expression.trim()) return null;
    try {
      return evaluateExpression(expression, angleMode, answer);
    } catch {
      return null;
    }
  }, [answer, angleMode, expression]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences]);
  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }, [memory]);

  const append = useCallback((value: string, startsNew = false) => {
    setExpression((current) => {
      const base = justCalculated && startsNew ? "" : current;
      return base + value;
    });
    setJustCalculated(false);
    setError("");
  }, [justCalculated]);

  const clear = useCallback(() => {
    setExpression("");
    setLastResult(null);
    setError("");
    setJustCalculated(false);
  }, []);

  const calculate = useCallback(() => {
    try {
      const value = evaluateExpression(expression, angleMode, answer);
      setAnswer(value);
      setLastResult(value);
      setError("");
      setJustCalculated(true);
      setHistory((items) => [
        { id: crypto.randomUUID(), expression, result: value, createdAt: Date.now() },
        ...items,
      ].slice(0, 40));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This expression could not be calculated.");
    }
  }, [angleMode, answer, expression]);

  const backspace = useCallback(() => {
    setExpression((current) => current.slice(0, -1));
    setError("");
    setJustCalculated(false);
  }, []);

  const performMemory = useCallback((action: "clear" | "recall" | "add" | "subtract") => {
    if (action === "clear") {
      setMemory(null);
      setMemoryNotice("Memory cleared");
      return;
    }
    if (action === "recall") {
      if (memory === null) {
        setMemoryNotice("Memory is empty");
        return;
      }
      append(formatResult(memory, preferences.precision, false), true);
      setMemoryNotice("Memory recalled");
      return;
    }
    if (result === null) {
      setMemoryNotice("Enter a valid expression first");
      return;
    }
    setMemory((current) => (current ?? 0) + (action === "add" ? result : -result));
    setMemoryNotice(action === "add" ? "Added to memory" : "Subtracted from memory");
  }, [append, memory, preferences.precision, result]);

  const selectHistory = (entry: HistoryEntry) => {
    setExpression(entry.expression);
    setLastResult(entry.result);
    setError("");
    setPanel(null);
    setJustCalculated(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;
      if (event.key === "Escape") {
        if (panel) {
          setPanel(null);
        } else {
          clear();
        }
        event.preventDefault();
        return;
      }
      if (target.closest("input, select, textarea, button, a")) return;
      if (panel) return;
      if (event.key === "Enter" || event.key === "=") {
        calculate();
        event.preventDefault();
        return;
      }
      if (event.key === "Backspace") {
        backspace();
        event.preventDefault();
        return;
      }
      if (/^[0-9.+\-*/^()%!]$/.test(event.key)) {
        append(event.key, /^[0-9.]$/.test(event.key));
      } else if (event.key.toLowerCase() === "p") {
        append("pi", true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [append, backspace, calculate, clear, panel]);

  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement;
    const container = panel === "settings" ? settingsRef.current : historyRef.current;
    container?.querySelector<HTMLElement>("button, select, input")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [panel]);

  const enterFunction = (name: string) => {
    append(`${name}(`, true);
    expressionRef.current?.focus();
  };

  const buttons: { label: string; value: string; tone?: string; action?: () => void }[] = [
    { label: "(", value: "(" }, { label: ")", value: ")" },
    { label: "π", value: "pi", tone: "scientific", action: () => append("pi", true) },
    { label: "e", value: "e", tone: "scientific", action: () => append("e", true) },
    { label: "AC", value: "clear", tone: "quiet", action: clear },
    { label: "7", value: "7", tone: "number" }, { label: "8", value: "8", tone: "number" },
    { label: "9", value: "9", tone: "number" }, { label: "÷", value: "/", tone: "operator" },
    { label: "4", value: "4", tone: "number" }, { label: "5", value: "5", tone: "number" },
    { label: "6", value: "6", tone: "number" }, { label: "×", value: "*", tone: "operator" },
    { label: "1", value: "1", tone: "number" }, { label: "2", value: "2", tone: "number" },
    { label: "3", value: "3", tone: "number" }, { label: "−", value: "-", tone: "operator" },
    { label: "±", value: "negative", tone: "quiet", action: () => append("-(", true) },
    { label: "0", value: "0", tone: "number" }, { label: ".", value: ".", tone: "number" },
    { label: "+", value: "+", tone: "operator" },
  ];

  const scientific = [
    { label: "sin", fn: "sin" }, { label: "cos", fn: "cos" }, { label: "tan", fn: "tan" },
    { label: "sin⁻¹", fn: "asin" }, { label: "cos⁻¹", fn: "acos" }, { label: "tan⁻¹", fn: "atan" },
    { label: "sinh", fn: "sinh" }, { label: "cosh", fn: "cosh" }, { label: "tanh", fn: "tanh" },
    { label: "sinh⁻¹", fn: "asinh" }, { label: "cosh⁻¹", fn: "acosh" }, { label: "tanh⁻¹", fn: "atanh" },
    { label: "ln", fn: "ln" }, { label: "log", fn: "log" }, { label: "eˣ", fn: "exp" },
    { label: "√", fn: "sqrt" }, { label: "∛", fn: "cbrt" }, { label: "ʸ√x", fn: "root" },
    { label: "x²", value: "^2" }, { label: "xʸ", value: "^" }, { label: "!", value: "!" },
    { label: "|x|", fn: "abs" }, { label: "1/x", fn: "inv" }, { label: "%", value: "%" },
  ];

  const onButton = (button: (typeof buttons)[number]) => {
    if (button.action) button.action();
    else append(button.value, button.tone === "number");
  };

  const shownResult = result ?? (justCalculated ? lastResult : null);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Aurelia calculator home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">aurelia<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <div className="status-note"><span className="status-dot" /> Precision instrument</div>
          <button
            ref={settingsTriggerRef}
            className="icon-button settings-trigger"
            type="button"
            aria-label="Open calculator settings"
            onClick={() => setPanel("settings")}
          >
            <Settings2 size={18} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Scientific calculator">
        <div className="workspace-intro">
          <div>
            <div className="eyebrow"><Sparkles size={13} /> SCIENTIFIC CALCULATOR</div>
            <h1>Think in numbers.</h1>
          </div>
          <p>Clarity for every calculation.</p>
        </div>

        <div className="calculator-layout">
          <section className="calculator-card" aria-label="Calculator">
            <div className="calculator-topline">
              <span className="model-label"><span className="model-indicator" /> SCI-01</span>
              <div className="angle-switch" role="group" aria-label="Angle unit">
                {(["DEG", "RAD"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={angleMode === mode ? "active" : ""}
                    aria-pressed={angleMode === mode}
                    onClick={() => setAngleMode(mode)}
                  >{mode}</button>
                ))}
              </div>
              <button
                ref={historyTriggerRef}
                type="button"
                className="icon-button history-trigger"
                aria-label="Open calculation history"
                onClick={() => setPanel("history")}
              ><History size={17} /></button>
            </div>

            <div className="display" aria-label="Calculator display">
              <div className="display-meta">
                <span>EXPRESSION</span>
                <span>{angleMode === "DEG" ? "DEGREES" : "RADIANS"}</span>
              </div>
              <div
                ref={expressionRef}
                className="expression"
                tabIndex={0}
                aria-label={`Expression: ${expression || "empty"}`}
                title="Use your keyboard to edit the expression"
              >
                {expression ? prettyExpression(expression) : <span className="placeholder">0</span>}
                <span className="cursor" aria-hidden="true" />
              </div>
              <div className="result-row">
                <span className="result-prefix">=</span>
                <span className={`result-value ${error ? "error-value" : ""}`}>
                  {error || (shownResult !== null
                    ? formatResult(shownResult, preferences.precision, preferences.grouping)
                    : "0")}
                </span>
              </div>
              <div className="display-footer">
                <span className="live-state">
                  {error ? "CHECK EXPRESSION" : result !== null ? "LIVE RESULT" : "READY"}
                </span>
                <div className="display-tools">
                  <span className={`memory-indicator ${memory !== null ? "has-memory" : ""}`}>
                    <MemoryStick size={13} /> {memory === null ? "M —" : "M"}
                  </span>
                  <button
                    type="button"
                    className="backspace-button"
                    aria-label="Delete last character"
                    onClick={backspace}
                  ><Delete size={15} /> Delete</button>
                </div>
              </div>
            </div>

            <div className="memory-row" aria-label="Memory functions">
              <span className="memory-label">MEMORY</span>
              {([
                ["MC", "clear"], ["MR", "recall"], ["M+", "add"], ["M−", "subtract"],
              ] as const).map(([label, action]) => (
                <button key={action} type="button" onClick={() => performMemory(action)}>{label}</button>
              ))}
              <span className="memory-message" role="status">{memoryNotice}</span>
            </div>

            <div className="scientific-grid" aria-label="Scientific functions">
              {scientific.map((button) => (
                <motion.button
                  key={button.label}
                  type="button"
                  className="key scientific-key"
                  whileHover={reducedMotion ? undefined : { y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97, y: 1 }}
                  onClick={() => button.fn ? enterFunction(button.fn) : append(button.value ?? "", button.value === "^")}
                  aria-label={button.fn ? `${button.label} function` : button.label}
                >{button.label}</motion.button>
              ))}
            </div>

            <div className="number-grid" aria-label="Number pad">
              {buttons.map((button) => (
                <motion.button
                  key={button.label}
                  type="button"
                  className={`key ${button.tone ?? ""} ${button.label === "AC" ? "clear-key" : ""}`}
                  whileHover={reducedMotion ? undefined : { y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97, y: 1 }}
                  onClick={() => onButton(button)}
                  aria-label={button.label === "AC" ? "All clear" : button.label === "±" ? "Negative sign" : button.label}
                >{button.label}</motion.button>
              ))}
              <motion.button
                type="button"
                className="key equals-key"
                whileHover={reducedMotion ? undefined : { y: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97, y: 1 }}
                onClick={calculate}
                aria-label="Calculate result"
              ><span>=</span><span className="equals-hint"><Command size={11} /> Enter</span></motion.button>
            </div>
            <div className="calculator-footer">
              <span><Keyboard size={13} /> Keyboard ready</span>
              <span>Scientific · {angleMode}</span>
            </div>
          </section>

          <aside className="side-rail">
            <section className="rail-card memory-card">
              <div className="rail-card-heading">
                <span className="rail-icon memory-icon"><MemoryStick size={17} /></span>
                <span>Memory</span>
                <button
                  type="button"
                  className="subtle-action"
                  onClick={() => performMemory("clear")}
                  aria-label="Clear memory"
                >Clear</button>
              </div>
              <div className="memory-value">
                {memory === null ? "—" : formatResult(memory, preferences.precision, preferences.grouping)}
              </div>
              <p>{memory === null ? "Your stored value will appear here." : "Stored value is ready to recall."}</p>
            </section>

            <section className="rail-card history-card">
              <div className="rail-card-heading">
                <span className="rail-icon history-icon"><Clock3 size={16} /></span>
                <span>Recent work</span>
                <button type="button" className="subtle-action" onClick={() => setPanel("history")}>All <ArrowUpRight size={13} /></button>
              </div>
              {history.length ? (
                <div className="recent-list">
                  {history.slice(0, 3).map((entry) => (
                    <button className="recent-entry" key={entry.id} onClick={() => selectHistory(entry)}>
                      <span className="recent-expression">{prettyExpression(entry.expression)}</span>
                      <span className="recent-result">{formatResult(entry.result, preferences.precision, preferences.grouping)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="history-empty">
                  <span className="empty-glyph"><MoreHorizontal size={16} /></span>
                  <p>Your calculations will<br />find a home here.</p>
                </div>
              )}
              <button type="button" className="history-link" onClick={() => setPanel("history")}>
                View calculation history <ArrowDownRight size={14} />
              </button>
            </section>

            <div className="tip-card">
              <span className="tip-star">✳</span>
              <p><strong>A small shortcut</strong><br />Press <kbd>Enter</kbd> to evaluate.</p>
            </div>
          </aside>
        </div>
        <footer className="page-footer">
          <span>Made for curious minds.</span>
          <span>Every number, considered <span className="footer-spark">✳</span></span>
        </footer>
      </section>

      <AnimatePresence>
        {panel === "history" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPanel(null);
            }}
          >
            <motion.aside
              ref={historyRef}
              className="drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-title"
              initial={reducedMotion ? undefined : { x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reducedMotion ? undefined : { x: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              <div className="drawer-header">
                <div><span className="eyebrow"><Clock3 size={13} /> YOUR WORKSPACE</span><h2 id="history-title">Calculation history</h2></div>
                <button className="icon-button" type="button" aria-label="Close history" onClick={() => setPanel(null)}><X size={18} /></button>
              </div>
              {history.length ? (
                <>
                  <div className="history-list">
                    {history.map((entry) => (
                      <button className="history-item" key={entry.id} onClick={() => selectHistory(entry)}>
                        <span className="history-item-top"><span>{prettyExpression(entry.expression)}</span><span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></span>
                        <span className="history-item-result">{formatResult(entry.result, preferences.precision, preferences.grouping)} <ArrowUpRight size={14} /></span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="clear-history" onClick={() => setHistory([])}><RotateCcw size={14} /> Clear all history</button>
                </>
              ) : (
                <div className="drawer-empty"><History size={22} /><h3>A clean slate.</h3><p>Once you calculate something, it will be saved here.</p></div>
              )}
              <div className="drawer-note"><Check size={14} /> Stored locally on this device</div>
            </motion.aside>
          </motion.div>
        )}
        {panel === "settings" && (
          <motion.div
            className="overlay settings-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPanel(null);
            }}
          >
            <motion.div
              ref={settingsRef}
              className="settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-title"
              initial={reducedMotion ? undefined : { y: 12, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={reducedMotion ? undefined : { y: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
            >
              <div className="drawer-header">
                <div><span className="eyebrow"><Settings2 size={13} /> PREFERENCES</span><h2 id="settings-title">Your instrument</h2></div>
                <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setPanel(null)}><X size={18} /></button>
              </div>
              <label className="setting-row">
                <span><strong>Result precision</strong><small>Significant digits shown in results</small></span>
                <span className="select-wrap">
                  <select
                    value={preferences.precision}
                    onChange={(event) => setPreferences((current) => ({ ...current, precision: Number(event.target.value) }))}
                    aria-label="Result precision"
                  >
                    <option value={6}>6 digits</option><option value={10}>10 digits</option><option value={14}>14 digits</option>
                  </select><ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
              <label className="setting-row">
                <span><strong>Digit grouping</strong><small>Separate thousands with commas</small></span>
                <input
                  className="toggle-input"
                  type="checkbox"
                  checked={preferences.grouping}
                  onChange={(event) => setPreferences((current) => ({ ...current, grouping: event.target.checked }))}
                  aria-label="Use digit grouping"
                />
              </label>
              <label className="setting-row">
                <span><strong>Appearance</strong><small>Choose a calm or low-light surface</small></span>
                <span className="select-wrap">
                  <select
                    value={preferences.theme}
                    onChange={(event) => setPreferences((current) => ({ ...current, theme: event.target.value as Preferences["theme"] }))}
                    aria-label="Appearance"
                  >
                    <option value="light">Light</option><option value="dark">Dark</option>
                  </select><ChevronDown size={14} aria-hidden="true" />
                </span>
              </label>
              <div className="shortcut-note"><Keyboard size={15} /><span><strong>Keyboard shortcuts</strong><small>Enter to calculate · Backspace to delete · Esc to clear</small></span></div>
              <button type="button" className="done-button" onClick={() => setPanel(null)}>Done <Check size={15} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {error ? `Calculation error: ${error}` : lastResult !== null ? `Result: ${formatResult(lastResult, preferences.precision, preferences.grouping)}` : ""}
      </div>
    </main>
  );
}

export default App;
