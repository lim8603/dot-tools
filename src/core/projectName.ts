/**
 * Pure validation for the start-wizard project name (F20, TASK-022). Kept vscode-free
 * so it is unit-testable and shared by every adapter's create flow. The rule set is a
 * conservative intersection that is safe for cargo / dotnet / cmake / python names:
 * a single path segment, no whitespace, letters/digits/hyphen/underscore only.
 *
 * Returns an error message (shown by the InputBox) or undefined when the name is valid.
 */
export function validateProjectName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Enter a project name.';
  }
  if (/[\\/]/.test(trimmed)) {
    return 'The name cannot contain path separators.';
  }
  if (/\s/.test(trimmed)) {
    return 'The name cannot contain spaces.';
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return 'Use letters, digits, hyphen (-), or underscore (_) only.';
  }
  return undefined;
}
