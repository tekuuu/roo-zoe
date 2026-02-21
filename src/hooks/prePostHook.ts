import { HookContext, HookResult } from "./types"
import { hookManager } from "./HookManager"

/**
 * Apply all registered pre-hooks and return the result.  If any hook fails the
 * returned object will have success=false and the caller is expected to abort
 * the operation accordingly.
 */
export async function applyPreHooks(context: HookContext): Promise<HookResult> {
	return hookManager.runPreHooks(context)
}

/**
 * Apply all registered post-hooks; failures are logged but not thrown.
 */
export async function applyPostHooks(context: HookContext, result: any): Promise<void> {
	await hookManager.runPostHooks(context, result)
}
