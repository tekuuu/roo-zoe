import * as fs from "fs/promises"
import * as path from "path"
import { TraceEntry } from "./types"

export class TraceService {
	private static instance: TraceService
	private workspacePath: string
	// simple promise queue to serialize file writes and avoid collisions
	private writeQueue: Promise<void> = Promise.resolve()

	private constructor(workspacePath: string) {
		this.workspacePath = workspacePath
	}

	public static getInstance(workspacePath?: string): TraceService {
		if (!TraceService.instance && workspacePath) {
			TraceService.instance = new TraceService(workspacePath)
		} else if (!TraceService.instance) {
			throw new Error("TraceService not initialized. Provide workspacePath.")
		}
		return TraceService.instance
	}

	private enqueue<T>(work: () => Promise<T>): Promise<T> {
		// chain operations so they execute sequentially
		const p = this.writeQueue.then(work, work)
		// after work completes, swallow errors to allow queue to continue
		this.writeQueue = p.then(
			() => {},
			() => {},
		)
		return p
	}

	public async appendTrace(entry: TraceEntry): Promise<void> {
		const orchestrationPath = path.join(this.workspacePath, ".orchestration")
		await fs.mkdir(orchestrationPath, { recursive: true })

		const filePath = path.join(orchestrationPath, "agent_trace.jsonl")
		const line = JSON.stringify(entry)
		await this.enqueue(() => fs.appendFile(filePath, line + "\n"))
	}

	public async getTracesByIntent(intentId: string, limit = 10): Promise<TraceEntry[]> {
		const filePath = path.join(this.workspacePath, ".orchestration", "agent_trace.jsonl")
		try {
			const content = await fs.readFile(filePath, "utf-8")
			const lines = content.trim().split("\n")
			const entries: TraceEntry[] = []
			for (const line of lines) {
				try {
					const obj = JSON.parse(line) as TraceEntry
					if (obj.intent_id === intentId) {
						entries.push(obj)
					}
				} catch {
					// ignore
				}
			}
			return entries.slice(-limit)
		} catch {
			return []
		}
	}
}
