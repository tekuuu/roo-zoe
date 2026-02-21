export interface ClassificationResult {
	category: string
	risk_level: "safe" | "destructive" | "unknown"
}

export class CommandClassifier {
	private whitelist: Set<string> = new Set()

	classify(command: string): ClassificationResult {
		const normalized = command.trim().toLowerCase()
		if (this.whitelist.has(normalized)) {
			return { category: "whitelist", risk_level: "safe" }
		}

		// simple heuristics
		if (normalized.match(/\brm\s+-rf\b/) || normalized.match(/\bshutdown\b/) || normalized.match(/\bformat\b/)) {
			return { category: "destructive", risk_level: "destructive" }
		}
		if (normalized.length === 0) {
			return { category: "empty", risk_level: "safe" }
		}
		return { category: "unknown", risk_level: "safe" }
	}

	addToWhitelist(cmd: string) {
		this.whitelist.add(cmd.trim().toLowerCase())
	}
}
