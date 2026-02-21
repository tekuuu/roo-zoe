import * as fs from "fs/promises"
import * as path from "path"
import * as yaml from "js-yaml"
import { BusinessIntent, IntentContext } from "./types"

export class IntentService {
	private static instance: IntentService
	private workspacePath: string
	private intents: Map<string, BusinessIntent> = new Map()
	private fileToIntentMap: Map<string, string> = new Map()

	private constructor(workspacePath: string) {
		this.workspacePath = workspacePath
	}

	public static getInstance(workspacePath?: string): IntentService {
		if (!IntentService.instance && workspacePath) {
			IntentService.instance = new IntentService(workspacePath)
		} else if (!IntentService.instance) {
			throw new Error("IntentService not initialized. Provide workspacePath.")
		}
		return IntentService.instance
	}

	public async initialize(): Promise<void> {
		const orchestrationPath = path.join(this.workspacePath, ".orchestration")

		// Ensure directory exists
		await fs.mkdir(orchestrationPath, { recursive: true })

		// Load or create active_intents.yaml
		const intentsPath = path.join(orchestrationPath, "active_intents.yaml")

		try {
			const content = await fs.readFile(intentsPath, "utf-8")
			const data = yaml.load(content) as any

			if (data?.active_intents) {
				for (const intent of data.active_intents) {
					this.intents.set(intent.id, intent)
				}
			}
		} catch {
			// Create default template
			await this.createDefaultIntentsFile(intentsPath)
		}

		// Load intent_map.md
		await this.loadIntentMap()
	}

	private async createDefaultIntentsFile(intentsPath: string): Promise<void> {
		const template = `# Active Intents
# This file is managed by the Intent-Traceability System
# Do not edit manually

active_intents: []
`
		await fs.writeFile(intentsPath, template)
	}

	private async loadIntentMap(): Promise<void> {
		const mapPath = path.join(this.workspacePath, ".orchestration", "intent_map.md")

		try {
			const content = await fs.readFile(mapPath, "utf-8")
			// Parse markdown to build file->intent mapping
			const lines = content.split("\n")
			let currentIntent: string | null = null

			for (const line of lines) {
				const intentMatch = line.match(/^##\s+(INT-\d+)/)
				if (intentMatch) {
					currentIntent = intentMatch[1]
					continue
				}

				const fileMatch = line.match(/^-\s+(.+)\s+\(/)
				if (fileMatch && currentIntent) {
					this.fileToIntentMap.set(fileMatch[1], currentIntent)
				}
			}
		} catch {
			// Map doesn't exist yet
		}
	}

	public async getIntent(intentId: string): Promise<BusinessIntent | null> {
		// Refresh from disk
		await this.initialize()
		return this.intents.get(intentId) || null
	}

	public async updateIntent(intent: BusinessIntent): Promise<void> {
		this.intents.set(intent.id, intent)
		await this.persistIntents()
	}

	public async addFileToIntentMap(intentId: string, filePath: string): Promise<void> {
		this.fileToIntentMap.set(filePath, intentId)
		await this.updateIntentMapMarkdown(intentId, filePath)
	}

	private async persistIntents(): Promise<void> {
		const intentsPath = path.join(this.workspacePath, ".orchestration", "active_intents.yaml")
		const data = {
			active_intents: Array.from(this.intents.values()),
		}

		await fs.writeFile(intentsPath, yaml.dump(data))
	}

	private async updateIntentMapMarkdown(intentId: string, filePath: string): Promise<void> {
		const mapPath = path.join(this.workspacePath, ".orchestration", "intent_map.md")
		let content = ""

		try {
			content = await fs.readFile(mapPath, "utf-8")
		} catch {
			content = "# Intent Map\n\n"
		}

		// Check if intent section exists
		if (!content.includes(`## ${intentId}`)) {
			content += `\n## ${intentId}\n\n`
		}

		// Add file entry if not exists
		const fileEntry = `- ${filePath}`
		if (!content.includes(fileEntry)) {
			// Find the intent section and append
			const lines = content.split("\n")
			const sectionIndex = lines.findIndex((l) => l.includes(`## ${intentId}`))

			if (sectionIndex !== -1) {
				// Find end of section
				let insertIndex = sectionIndex + 1
				while (insertIndex < lines.length && !lines[insertIndex].startsWith("##")) {
					insertIndex++
				}
				lines.splice(insertIndex, 0, `${fileEntry} (${new Date().toISOString()})`)
				content = lines.join("\n")
			}
		}

		await fs.writeFile(mapPath, content)
	}
}
