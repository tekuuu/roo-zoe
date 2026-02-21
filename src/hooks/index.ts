import { hookManager } from "./HookManager"

/**
 * Called during extension activation to ensure hook system is ready.
 * Additional custom hooks could be registered here if desired.
 */
export function registerHooks(): void {
	// constructor of HookManager already registers the default pre/post hooks.
	// nothing else to do for now.
}
