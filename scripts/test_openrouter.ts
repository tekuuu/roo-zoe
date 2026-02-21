#!/usr/bin/env tsx

import { OpenRouterHandler } from "../src/api/providers/openrouter"

async function main() {
	const handler = new OpenRouterHandler({
		openRouterApiKey: "test",
		openRouterModelId: "test-model",
	})

	const systemPrompt = `This prompt refers to active_intents but no YAML.`
	const messages: any[] = []

	console.log("calling createMessage...")
	const gen = handler.createMessage(systemPrompt, messages, {})
	for await (const chunk of gen) {
		if (chunk.type === "text") {
			process.stdout.write(chunk.text)
		}
	}
	console.log("\ncompleted")
}

main().catch((e) => {
	console.error("error in script", e)
})
