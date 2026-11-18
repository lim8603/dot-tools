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

/**
 * The inverse of parseArgsLine: the line to show in the Run-args input so that editing
 * and re-committing it yields the same argv. A bare join would drop the quotes around
 * `my file.txt`, and appending ` -v` would then split it into two arguments.
 */
export function formatArgsLine(args: readonly string[]): string {
  return args.map(quoteArg).join(' ');
}

function quoteArg(arg: string): string {
  if (arg !== '' && !/[\s'"]/.test(arg)) {
    return arg; // nothing parseArgsLine would split or strip (a lone backslash is literal)
  }
  let quoted = '"';
  for (let i = 0; i < arg.length; i++) {
    const ch = arg[i];
    const next = arg[i + 1];
    if (ch === '"') {
      quoted += '\\"';
    } else if (ch === '\\' && (next === undefined || next === '"' || next === '\\')) {
      quoted += '\\\\'; // only where parseArgsLine would read it as an escape
    } else {
      quoted += ch;
    }
  }
  return `${quoted}"`;
}
