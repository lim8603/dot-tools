/**
 * parseArgsLine — tokenize one input line into argv by shell quoting rules
 * (TASK-014, F16 / 상세설계서 §10.3). Pure and vscode-free so both the cargo adapter
 * and the settings page share one definition (UI must not import from an adapter).
 * Handles single/double quotes and backslash escapes inside double quotes.
 */
export function parseArgsLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let quote: "'" | '"' | undefined;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote === "'") {
      if (ch === "'") {
        quote = undefined;
      } else {
        current += ch;
      }
    } else if (quote === '"') {
      if (ch === '"') {
        quote = undefined;
      } else if (ch === '\\' && (line[i + 1] === '"' || line[i + 1] === '\\')) {
        current += line[++i];
      } else {
        current += ch;
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (ch === ' ' || ch === '\t') {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
    } else {
      current += ch;
      started = true;
    }
  }
  if (started) {
    tokens.push(current);
  }
  return tokens;
}
