/**
 * Command registry — central catalogue of shell-level commands
 * (future ⌘K palette, keyboard shortcuts, deep links).
 * Keep it a pure data structure: no React, no side effects at import time.
 */

export interface AppCommand {
  id: string
  /** Vietnamese label shown in the UI */
  title: string
  /** Extra words used for fuzzy matching */
  keywords?: string[]
  /** Route to navigate to on activation */
  route?: string
  /** Arbitrary action to run on activation (alternative to route) */
  action?: () => void
  /** Guard evaluated at palette-open time */
  isAvailable?: () => boolean
}

const commands: AppCommand[] = []

/** Register a command (idempotent: later registration wins). */
export function registerCommand(command: AppCommand): () => void {
  const index = commands.findIndex((entry) => entry.id === command.id)
  if (index >= 0) commands.splice(index, 1)
  commands.push(command)
  return () => {
    const at = commands.indexOf(command)
    if (at >= 0) commands.splice(at, 1)
  }
}

/** All registered commands. */
export function listCommands(): readonly AppCommand[] {
  return commands
}

/** Commands whose availability guard (if any) currently passes. */
export function availableCommands(): readonly AppCommand[] {
  return commands.filter((command) => !command.isAvailable || command.isAvailable())
}

/** Register a command that navigates to one of the app's routes. */
export function registerRouteCommand(id: string, title: string, route: string, keywords?: string[]) {
  return registerCommand({ id, title, route, keywords })
}