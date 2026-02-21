import { AgentLifecycleState, HookContext, HookResult } from "./types"

// placeholder imports for hooks
import { injectContext } from "./pre/ContextInjector"
import { enforceScope } from "./pre/ScopeEnforcer"
import { checkPermissions } from "./pre/PermissionGate"
import { validateIntentSelection } from "./pre/IntentSelector"
import { logExecution } from "./post/TraceLogger"
import { updateMap } from "./post/IntentMapper"

export class HookManager {
	private preHooks: Array<(context: HookContext) => Promise<HookResult>> = []
	private postHooks: Array<(context: HookContext, result: any) => Promise<void>> = []
	private currentContext: HookContext
	private state: AgentLifecycleState = AgentLifecycleState.IDLE

	constructor() {
		this.currentContext = this.createInitialContext()
		this.registerDefaultHooks()
	}

	private createInitialContext(): HookContext {
		return {
			state: AgentLifecycleState.IDLE,
			intent_id: null,
			tool_name: "",
			tool_args: {},
			authorization_status: "pending",
		}
	}

	private registerDefaultHooks(): void {
		// Pre-Hooks execute in order
		this.registerPreHook(validateIntentSelection)
		this.registerPreHook(enforceScope)
		this.registerPreHook(checkPermissions)
		this.registerPreHook(injectContext)

		// Post-Hooks execute in order
		this.registerPostHook(logExecution)
		this.registerPostHook(updateMap)
	}

	public registerPreHook(hook: (context: HookContext) => Promise<HookResult>): void {
		this.preHooks.push(hook)
	}

	public registerPostHook(hook: (context: HookContext, result: any) => Promise<void>): void {
		this.postHooks.push(hook)
	}

	public async executeToolWithHooks(toolName: string, args: any, originalExecutor: () => Promise<any>): Promise<any> {
		// Initialize context for this execution, but preserve any previously selected intent
		this.currentContext = {
			...this.createInitialContext(),
			intent_id: this.currentContext?.intent_id || null,
			tool_name: toolName,
			tool_args: args,
			state: AgentLifecycleState.PRE_HOOK_ANALYSIS,
		}

		// If args include an intent_id explicitly (e.g. from select_active_intent), accept it
		if (args && args.intent_id) {
			this.currentContext.intent_id = args.intent_id
		}

		// Special-case select_active_intent: record selection immediately so subsequent
		// tools in the same session inherit the intent even if they don't pass it.
		if (toolName === "select_active_intent" && args && args.intent_id) {
			this.currentContext.intent_id = args.intent_id
		}

		// Phase 1: Execute all Pre-Hooks
		for (const hook of this.preHooks) {
			const result = await hook(this.currentContext)

			if (!result.success) {
				if (result.requires_human_intervention) {
					this.currentContext.state = AgentLifecycleState.HUMAN_INTERVENTION
					throw new HumanInterventionRequiredError(result.error)
				}
				throw new HookExecutionError(result.error)
			}
		}

		// Phase 2: Execute the original tool
		this.currentContext.state = AgentLifecycleState.TOOL_EXECUTION
		let toolResult
		try {
			toolResult = await originalExecutor()
		} catch (error: any) {
			// Log failure but continue to post-hooks
			toolResult = { error: error.message }
		}

		// Phase 3: Execute all Post-Hooks
		this.currentContext.state = AgentLifecycleState.POST_HOOK_LOGGING
		for (const hook of this.postHooks) {
			try {
				await hook(this.currentContext, toolResult)
			} catch (error: any) {
				console.error(`Post-hook error: ${error.message}`)
				// Post-hook failures are non-fatal
			}
		}

		this.currentContext.state = AgentLifecycleState.IDLE
		return toolResult
	}

	public setIntent(intentId: string): void {
		this.currentContext.intent_id = intentId
	}

	public getCurrentContext(): HookContext {
		return { ...this.currentContext }
	}

	// expose individual hook runners for external integration
	public async runPreHooks(context: HookContext): Promise<HookResult> {
		for (const hook of this.preHooks) {
			const result = await hook(context)
			if (!result.success) {
				return result
			}
		}
		return { success: true }
	}

	public async runPostHooks(context: HookContext, result: any): Promise<void> {
		for (const hook of this.postHooks) {
			try {
				await hook(context, result)
			} catch (error: any) {
				console.error(`Post-hook error: ${error.message}`)
			}
		}
	}
}

// singleton instance for easy access
export const hookManager = new HookManager()

export class HookExecutionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "HookExecutionError"
	}
}

export class HumanInterventionRequiredError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "HumanInterventionRequiredError"
	}
}
