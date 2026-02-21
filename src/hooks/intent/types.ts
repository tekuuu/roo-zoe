export type IntentPriority = "critical" | "high" | "normal" | "low"
export type IntentStatus = "pending" | "in_progress" | "blocked" | "completed"
export type MutationClass = "AST_REFACTOR" | "INTENT_EVOLUTION" | "BUG_FIX" | "DOCUMENTATION"

export interface BusinessIntent {
	id: string
	name: string
	summary: string
	description: string
	status: IntentStatus
	priority: IntentPriority
	owned_scope: string[] // Glob patterns for authorized files
	constraints: string[]
	acceptance_criteria: string[]
	created_at: string
	updated_at: string
	related_intents: string[]
}

export interface IntentContext {
	active_intent: BusinessIntent | null
	recent_traces: TraceEntry[]
	scope_files: string[]
}

// forward declaration to avoid circular imports in plain TS
export interface TraceEntry {
	id: string
	// minimal fields used by IntentContext
}
