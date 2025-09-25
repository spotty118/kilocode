import { z } from "zod"

export const ghostServiceSettingsSchema = z
	.object({
		enableAutoTrigger: z.boolean().optional(),
		autoTriggerDelay: z.number().min(1).max(30).default(3).optional(),
		enableQuickInlineTaskKeybinding: z.boolean().optional(),
		enableSmartInlineTaskKeybinding: z.boolean().optional(),
		enableCustomProvider: z.boolean().optional(),
		apiConfigId: z.string().optional(),
		showGutterAnimation: z.boolean().optional(),
		// kilocode_change start - Add LangChain settings
		enableLangChain: z.boolean().optional(),
		langChainOpenaiApiKey: z.string().optional(),
		langChainChunkSize: z.number().min(500).max(2000).default(1000).optional(),
		langChainMaxContextFiles: z.number().min(5).max(50).default(10).optional(),
		langChainSimilarityThreshold: z.number().min(0.1).max(1.0).default(0.7).optional(),
		langChainModelName: z.string().default("text-embedding-3-small").optional(),
		// kilocode_change end
	})
	.optional()

export type GhostServiceSettings = z.infer<typeof ghostServiceSettingsSchema>

export const commitRangeSchema = z.object({
	from: z.string(),
	to: z.string(),
})

export type CommitRange = z.infer<typeof commitRangeSchema>

export const kiloCodeMetaDataSchema = z.object({
	commitRange: commitRangeSchema.optional(),
})

export type KiloCodeMetaData = z.infer<typeof kiloCodeMetaDataSchema>
