import { OpenRouterHandler } from "../src/api/providers/openrouter"

async function run() {
	// create dummy options
	const handler = new OpenRouterHandler({
		openRouterApiKey: "testkey",
		openRouterModelId: "test-model",
	} as any)

	// spy console
	console.log("Will call createMessage with simple system prompt...")
	const systemPrompt = "Please assist using active_intents variable"
	const messages: any[] = []
	try {
		for await (const chunk of handler.createMessage(systemPrompt, messages)) {
			// ignore
		}
		console.log("completed without error")
	} catch (err) {
		console.error("error from handler:", err)
	}
}

run().catch(console.error)
