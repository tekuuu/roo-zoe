export interface TraceEntry {
	id: string
	timestamp: string
	vcs: {
		revision_id: string
	}
	intent_id: string
	mutation_class: string
	files: FileTrace[]
}

export interface FileTrace {
	relative_path: string
	conversations: ConversationTrace[]
}

export interface ConversationTrace {
	url: string
	contributor: {
		entity_type: "AI" | "Human"
		model_identifier: string
	}
	ranges: ContentRange[]
	related: RelatedReference[]
}

export interface ContentRange {
	start_line: number
	end_line: number
	content_hash: string
}

export interface RelatedReference {
	type: "specification" | "intent" | "constraint"
	value: string
}
