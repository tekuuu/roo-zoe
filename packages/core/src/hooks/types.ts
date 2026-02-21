export enum AgentLifecycleState {
	IDLE = "IDLE",
	AWAITING_INTENT = "AWAITING_INTENT",
	PRE_HOOK_ANALYSIS = "PRE_HOOK_ANALYSIS",
	TOOL_EXECUTION = "TOOL_EXECUTION",
	POST_HOOK_LOGGING = "POST_HOOK_LOGGING",
	HUMAN_INTERVENTION = "HUMAN_INTERVENTION",
}

export interface HookContext {
	state: AgentLifecycleState
	intent_id: string | null
	tool_name: string
	tool_args: any
	authorization_status: "pending" | "approved" | "denied"
}

export type HookResult =
	| {
			success: true
			data?: any
	  }
	| {
			success: false
			error: string
			requires_human_intervention?: boolean
	  }
