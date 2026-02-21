#!/usr/bin/env node
const fs = require("fs").promises
const path = require("path")
const os = require("os")

async function main() {
	// Ensure .orchestration folder and active_intents.yaml exist
	const orchestrationDir = path.join(process.cwd(), ".orchestration")
	try {
		await fs.mkdir(orchestrationDir, { recursive: true })
	} catch (e) {}

	const intentsPath = path.join(orchestrationDir, "active_intents.yaml")
	const testIntent = `# Active Intents\nactive_intents:\n  - id: INT-TEST-001\n    title: Test intent for repro\n    description: Test intent\n`
	await fs.writeFile(intentsPath, testIntent, "utf-8")
	console.log(`Wrote test intent to ${intentsPath}`)

	// Simulate system prompt that references active_intents but has no YAML
	let systemPrompt = `You are an assistant. Use active_intents to select scope.\nReference: active_intents\nDo not fail.`

	const hasActiveIntentsYaml = /active_intents\s*:\s*\[|active_intents\s*:/m.test(systemPrompt)
	const referencesBareActiveIntents =
		/active_intents is not defined/.test(systemPrompt) ||
		(/\bactive_intents\b/.test(systemPrompt) && !hasActiveIntentsYaml)

	if (referencesBareActiveIntents) {
		const excerpt = systemPrompt.slice(-8000)
		const tmpPath = path.join(os.tmpdir(), `roo_prompt_debug_sim_${Date.now()}.txt`)
		await fs.writeFile(tmpPath, excerpt, "utf-8")
		console.log("Detected bare active_intents reference — wrote excerpt to", tmpPath)
		systemPrompt = `${systemPrompt}\n\n# Active Intents (injected fallback)\nactive_intents: []`
	} else {
		console.log("No bare reference detected — prompt OK")
	}

	// Show final prompt tail for verification
	console.log("Final prompt tail:\n", systemPrompt.slice(-300))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
