//kilocode_change - new file
import { HTMLAttributes, useState } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Trans } from "react-i18next"
import { Bot, Webhook, Zap, Brain } from "lucide-react" // kilocode_change - Add Brain icon for LangChain
import { cn } from "@/lib/utils"
import { useExtensionState } from "../../../context/ExtensionStateContext"
import { SectionHeader } from "../../settings/SectionHeader"
import { Section } from "../../settings/Section"
import { GhostServiceSettings } from "@roo-code/types"
import { SetCachedStateField } from "../../settings/types"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Slider,
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "@src/components/ui"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react" // kilocode_change - Import from correct location
import { vscode } from "@/utils/vscode"
import { ControlledCheckbox } from "../common/ControlledCheckbox"
import { useKeybindings } from "@/hooks/useKeybindings"

type GhostServiceSettingsViewProps = HTMLAttributes<HTMLDivElement> & {
	ghostServiceSettings: GhostServiceSettings
	setCachedStateField: SetCachedStateField<"ghostServiceSettings">
}

export const GhostServiceSettingsView = ({
	ghostServiceSettings,
	setCachedStateField,
	className,
	...props
}: GhostServiceSettingsViewProps) => {
	const { t } = useAppTranslation()
	const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false)
	const [isLangChainSettingsOpen, setIsLangChainSettingsOpen] = useState(false) // kilocode_change
	const {
		enableAutoTrigger,
		autoTriggerDelay,
		apiConfigId,
		enableQuickInlineTaskKeybinding,
		enableSmartInlineTaskKeybinding,
		enableCustomProvider,
		// kilocode_change start - Add LangChain settings
		enableLangChain,
		langChainOpenaiApiKey,
		langChainChunkSize,
		langChainMaxContextFiles,
		langChainSimilarityThreshold,
		langChainModelName,
		// kilocode_change end
	} = ghostServiceSettings || {}
	const { listApiConfigMeta } = useExtensionState()
	const keybindings = useKeybindings(["kilo-code.ghost.promptCodeSuggestion", "kilo-code.ghost.generateSuggestions"])

	const onEnableAutoTriggerChange = (newValue: boolean) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			enableAutoTrigger: newValue,
		})
	}

	const onAutoTriggerDelayChange = (newValue: number[]) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			autoTriggerDelay: newValue[0],
		})
	}

	const onEnableQuickInlineTaskKeybindingChange = (newValue: boolean) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			enableQuickInlineTaskKeybinding: newValue,
		})
	}

	const onEnableSmartInlineTaskKeybindingChange = (newValue: boolean) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			enableSmartInlineTaskKeybinding: newValue,
		})
	}

	const onEnableCustomProviderChange = (newValue: boolean) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			enableCustomProvider: newValue,
			apiConfigId: newValue ? ghostServiceSettings?.apiConfigId : "",
		})
	}

	const onApiConfigIdChange = (value: string) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			apiConfigId: value === "-" ? "" : value,
		})
	}

	const openGlobalKeybindings = (filter?: string) => {
		vscode.postMessage({ type: "openGlobalKeybindings", text: filter })
	}

	// kilocode_change start - Add LangChain setting handlers
	const onEnableLangChainChange = (newValue: boolean) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			enableLangChain: newValue,
		})
	}

	const onLangChainOpenaiApiKeyChange = (newValue: string) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			langChainOpenaiApiKey: newValue,
		})
	}

	const onLangChainChunkSizeChange = (newValue: number[]) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			langChainChunkSize: newValue[0],
		})
	}

	const onLangChainMaxContextFilesChange = (newValue: number[]) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			langChainMaxContextFiles: newValue[0],
		})
	}

	const onLangChainSimilarityThresholdChange = (newValue: number[]) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			langChainSimilarityThreshold: newValue[0] / 100, // Convert percentage to decimal
		})
	}

	const onLangChainModelNameChange = (newValue: string) => {
		setCachedStateField("ghostServiceSettings", {
			...ghostServiceSettings,
			langChainModelName: newValue,
		})
	}
	// kilocode_change end

	return (
		<div className={cn("flex flex-col", className)} {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<Bot className="w-4" />
					<div>{t("kilocode:ghost.title")}</div>
				</div>
			</SectionHeader>

			<Section className="flex flex-col gap-5">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2 font-bold">
							<Zap className="w-4" />
							<div>{t("kilocode:ghost.settings.triggers")}</div>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<ControlledCheckbox checked={enableAutoTrigger || false} onChange={onEnableAutoTriggerChange}>
							<span className="font-medium">{t("kilocode:ghost.settings.enableAutoTrigger.label")}</span>
						</ControlledCheckbox>
						<div className="text-vscode-descriptionForeground text-sm mt-1">
							<Trans i18nKey="kilocode:ghost.settings.enableAutoTrigger.description" />
						</div>
					</div>

					{enableAutoTrigger && (
						<div className="flex flex-col gap-1">
							<label className="block font-medium text-sm">
								{t("kilocode:ghost.settings.autoTriggerDelay.label")}
							</label>
							<div className="flex items-center gap-3">
								<Slider
									value={[autoTriggerDelay || 3]}
									onValueChange={onAutoTriggerDelayChange}
									min={1}
									max={30}
									step={1}
									className="flex-1"
									disabled={!enableAutoTrigger}
								/>
								<span className="text-sm text-vscode-descriptionForeground w-8 text-right">
									{autoTriggerDelay || 3}s
								</span>
							</div>
							<div className="text-vscode-descriptionForeground text-xs mt-1">
								<Trans i18nKey="kilocode:ghost.settings.autoTriggerDelay.description" />
							</div>
						</div>
					)}

					<div className="flex flex-col gap-1">
						<ControlledCheckbox
							checked={enableQuickInlineTaskKeybinding || false}
							onChange={onEnableQuickInlineTaskKeybindingChange}>
							<span className="font-medium">
								{t("kilocode:ghost.settings.enableQuickInlineTaskKeybinding.label", {
									keybinding: keybindings["kilo-code.ghost.promptCodeSuggestion"],
								})}
							</span>
						</ControlledCheckbox>
						<div className="text-vscode-descriptionForeground text-sm mt-1">
							<Trans
								i18nKey="kilocode:ghost.settings.enableQuickInlineTaskKeybinding.description"
								components={{
									DocsLink: (
										<a
											href="#"
											onClick={() =>
												openGlobalKeybindings("kilo-code.ghost.promptCodeSuggestion")
											}
											className="text-[var(--vscode-list-highlightForeground)] hover:underline cursor-pointer"></a>
									),
								}}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<ControlledCheckbox
							checked={enableSmartInlineTaskKeybinding || false}
							onChange={onEnableSmartInlineTaskKeybindingChange}>
							<span className="font-medium">
								{t("kilocode:ghost.settings.enableSmartInlineTaskKeybinding.label", {
									keybinding: keybindings["kilo-code.ghost.generateSuggestions"],
								})}
							</span>
						</ControlledCheckbox>
						<div className="text-vscode-descriptionForeground text-sm mt-1">
							<Trans
								i18nKey="kilocode:ghost.settings.enableSmartInlineTaskKeybinding.description"
								values={{ keybinding: keybindings["kilo-code.ghost.generateSuggestions"] }}
								components={{
									DocsLink: (
										<a
											href="#"
											onClick={() => openGlobalKeybindings("kilo-code.ghost.generateSuggestions")}
											className="text-[var(--vscode-list-highlightForeground)] hover:underline cursor-pointer"></a>
									),
								}}
							/>
						</div>
					</div>
				</div>

				{/* Advanced Settings */}
				<Collapsible open={isAdvancedSettingsOpen} onOpenChange={setIsAdvancedSettingsOpen}>
					<CollapsibleTrigger className="flex items-center gap-1 w-full cursor-pointer hover:opacity-80 mt-4">
						<span className={`codicon codicon-chevron-${isAdvancedSettingsOpen ? "down" : "right"}`}></span>
						<span className="font-medium">{t("settings:advancedSettings.title")}</span>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						{/* Provider Settings */}
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2 font-bold">
									<Webhook className="w-4" />
									<div>{t("kilocode:ghost.settings.provider")}</div>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<ControlledCheckbox
									checked={enableCustomProvider || false}
									onChange={onEnableCustomProviderChange}>
									<span className="font-medium">
										{t("kilocode:ghost.settings.enableCustomProvider.label")}
									</span>
								</ControlledCheckbox>
								<div className="text-vscode-descriptionForeground text-sm mt-1">
									<Trans i18nKey="kilocode:ghost.settings.enableCustomProvider.description" />
								</div>
							</div>
							{enableCustomProvider && (
								<div className="flex flex-col gap-3">
									<div>
										<label className="block font-medium mb-1">
											{t("kilocode:ghost.settings.apiConfigId.label")}
										</label>
										<div className="flex items-center gap-2">
											<div>
												<Select value={apiConfigId || "-"} onValueChange={onApiConfigIdChange}>
													<SelectTrigger
														data-testid="autocomplete-api-config-select"
														className="w-full">
														<SelectValue
															placeholder={t(
																"kilocode:ghost.settings.apiConfigId.current",
															)}
														/>
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="-">
															{t("kilocode:ghost.settings.apiConfigId.current")}
														</SelectItem>
														{(listApiConfigMeta || []).map((config) => (
															<SelectItem
																key={config.id}
																value={config.id}
																data-testid={`autocomplete-${config.id}-option`}>
																{config.name} ({config.apiProvider})
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<div className="text-sm text-vscode-descriptionForeground mt-1">
													{t("kilocode:ghost.settings.apiConfigId.description")}
												</div>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* kilocode_change start - LangChain Settings */}
						<Collapsible open={isLangChainSettingsOpen} onOpenChange={setIsLangChainSettingsOpen}>
							<CollapsibleTrigger className="flex items-center gap-1 w-full cursor-pointer hover:opacity-80 mt-4">
								<span className={`codicon codicon-chevron-${isLangChainSettingsOpen ? "down" : "right"}`}></span>
								<div className="flex items-center gap-2 font-bold">
									<Brain className="w-4" />
									<span>{t("kilocode:ghost.settings.langchain.title")}</span>
								</div>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-3">
								<div className="flex flex-col gap-3">
									<div className="text-vscode-descriptionForeground text-sm">
										<Trans i18nKey="kilocode:ghost.settings.langchain.description" />
									</div>

									<div className="flex flex-col gap-1">
										<ControlledCheckbox
											checked={enableLangChain || false}
											onChange={onEnableLangChainChange}>
											<span className="font-medium">
												{t("kilocode:ghost.settings.langchain.enableLangChain.label")}
											</span>
										</ControlledCheckbox>
										<div className="text-vscode-descriptionForeground text-sm mt-1">
											<Trans i18nKey="kilocode:ghost.settings.langchain.enableLangChain.description" />
										</div>
									</div>

									{enableLangChain && (
										<div className="flex flex-col gap-3 ml-4 border-l-2 border-vscode-textSeparator-foreground pl-4">
											{/* OpenAI API Key */}
											<div className="flex flex-col gap-1">
												<label className="block font-medium text-sm">
													{t("kilocode:ghost.settings.langchain.openaiApiKey.label")}
												</label>
												<VSCodeTextField
													value={langChainOpenaiApiKey || ""}
													onInput={(e: any) => onLangChainOpenaiApiKeyChange(e.target.value)}
													placeholder={t("kilocode:ghost.settings.langchain.openaiApiKey.placeholder")}
													className="w-full"
													type="password"
												/>
												<div className="text-vscode-descriptionForeground text-xs mt-1">
													<Trans i18nKey="kilocode:ghost.settings.langchain.openaiApiKey.description" />
												</div>
											</div>

											{/* Chunk Size */}
											<div className="flex flex-col gap-1">
												<label className="block font-medium text-sm">
													{t("kilocode:ghost.settings.langchain.chunkSize.label")}
												</label>
												<div className="flex items-center gap-3">
													<Slider
														value={[langChainChunkSize || 1000]}
														onValueChange={onLangChainChunkSizeChange}
														min={500}
														max={2000}
														step={100}
														className="flex-1"
													/>
													<span className="text-sm text-vscode-descriptionForeground w-12 text-right">
														{langChainChunkSize || 1000}
													</span>
												</div>
												<div className="text-vscode-descriptionForeground text-xs mt-1">
													<Trans i18nKey="kilocode:ghost.settings.langchain.chunkSize.description" />
												</div>
											</div>

											{/* Max Context Files */}
											<div className="flex flex-col gap-1">
												<label className="block font-medium text-sm">
													{t("kilocode:ghost.settings.langchain.maxContextFiles.label")}
												</label>
												<div className="flex items-center gap-3">
													<Slider
														value={[langChainMaxContextFiles || 10]}
														onValueChange={onLangChainMaxContextFilesChange}
														min={5}
														max={50}
														step={5}
														className="flex-1"
													/>
													<span className="text-sm text-vscode-descriptionForeground w-8 text-right">
														{langChainMaxContextFiles || 10}
													</span>
												</div>
												<div className="text-vscode-descriptionForeground text-xs mt-1">
													<Trans i18nKey="kilocode:ghost.settings.langchain.maxContextFiles.description" />
												</div>
											</div>

											{/* Similarity Threshold */}
											<div className="flex flex-col gap-1">
												<label className="block font-medium text-sm">
													{t("kilocode:ghost.settings.langchain.similarityThreshold.label")}
												</label>
												<div className="flex items-center gap-3">
													<Slider
														value={[Math.round((langChainSimilarityThreshold || 0.7) * 100)]}
														onValueChange={onLangChainSimilarityThresholdChange}
														min={50}
														max={95}
														step={5}
														className="flex-1"
													/>
													<span className="text-sm text-vscode-descriptionForeground w-12 text-right">
														{Math.round((langChainSimilarityThreshold || 0.7) * 100)}%
													</span>
												</div>
												<div className="text-vscode-descriptionForeground text-xs mt-1">
													<Trans i18nKey="kilocode:ghost.settings.langchain.similarityThreshold.description" />
												</div>
											</div>

											{/* Embedding Model */}
											<div className="flex flex-col gap-1">
												<label className="block font-medium text-sm">
													{t("kilocode:ghost.settings.langchain.modelName.label")}
												</label>
												<Select
													value={langChainModelName || "text-embedding-3-small"}
													onValueChange={onLangChainModelNameChange}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="text-embedding-3-small">
															text-embedding-3-small (Cost-effective)
														</SelectItem>
														<SelectItem value="text-embedding-3-large">
															text-embedding-3-large (High performance)
														</SelectItem>
														<SelectItem value="text-embedding-ada-002">
															text-embedding-ada-002 (Legacy)
														</SelectItem>
													</SelectContent>
												</Select>
												<div className="text-vscode-descriptionForeground text-xs mt-1">
													<Trans i18nKey="kilocode:ghost.settings.langchain.modelName.description" />
												</div>
											</div>
										</div>
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>
						{/* kilocode_change end - LangChain Settings */}
					</CollapsibleContent>
				</Collapsible>
			</Section>
		</div>
	)
}
