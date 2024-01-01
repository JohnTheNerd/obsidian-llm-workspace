import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian"
import { LlmDexie } from "storage/db"
import { NoteContextView, VIEW_TYPE_NOTE_CONTEXT } from "view/NoteContextView"
import { VIEW_TYPE_WORKSPACE, WorkspaceView } from "view/WorkspaceView"

export interface LlmPluginSettings {
	openAIApiKey: string;
}

const DEFAULT_SETTINGS: LlmPluginSettings = {
	openAIApiKey: "",
}

export default class LlmPlugin extends Plugin {
	settings: LlmPluginSettings

	db: LlmDexie

	async onload() {
		await this.loadSettings()

		this.db = new LlmDexie(this.app.appId ?? this.app.vault.getName())

		this.registerView(
			VIEW_TYPE_NOTE_CONTEXT,
			(leaf) => new NoteContextView(leaf, this.settings, this.db)
		)
		this.registerView(
			VIEW_TYPE_WORKSPACE,
			(leaf) => new WorkspaceView(leaf, this.settings, this.db)
		)

		this.addSettingTab(new LlmSettingTab(this.app, this))

		this.addCommand({
			id: "activate-context-view",
			name: "Context of current note",
			callback: () => {
				this.activateContextView()
			},
		})

		this.addCommand({
			id: "activate-workspace-view",
			name: "Activate workspace",
			callback: () => {
				this.activateWorkspaceView()
			},
		})
	}

	// async llamaindexTest() {
	// 	const file = this.app.workspace.getActiveFile();
	// 	if (!file) {
	// 		return;
	// 	}
	// 	const text = await this.app.vault.cachedRead(file);
	// 	const document = new Document({ text });

	// 	const llm = new OpenAI({
	// 		model: "gpt-3.5-turbo",
	// 		temperature: 0,
	// 		apiKey: this.settings.openAIApiKey,
	// 		additionalSessionOptions: { dangerouslyAllowBrowser: true },
	// 	});
	// 	const embedModel = new OpenAIEmbedding({
	// 		apiKey: this.settings.openAIApiKey,
	// 		additionalSessionOptions: { dangerouslyAllowBrowser: true },
	// 	});
	// 	const nodeParser = new SimpleNodeParser({
	// 		textSplitter: new SentenceSplitter({
	// 			tokenizer: null,
	// 		}),
	// 		includeMetadata: true,
	// 		includePrevNextRel: false,
	// 		chunkSize: 1024,
	// 		chunkOverlap: 20,
	// 	});
	// 	const serviceContext = serviceContextFromDefaults({
	// 		llm,
	// 		embedModel,
	// 	});
	// 	const storageContext = await storageContextFromDefaults({
	// 		// docStore: new SimpleDocumentStore(), // TODO: replace with impl BaseDocumentStore
	// 		indexStore: new DexieIndexStore(this.db), // VectorStoreIndex depends on this
	// 		vectorStore: new DexieVectorStore(this.db),
	// 	});
	// 	const index = await VectorStoreIndex.fromDocuments([document], {
	// 		serviceContext,
	// 		storageContext,
	// 	});
	// 	// const index = await VectorStoreIndex.fromVectorStore(storageContext.vectorStore, serviceContext);
	// 	const nodesWithScores = await index
	// 		.asRetriever()
	// 		.retrieve("Summarize this text");
	// 	// const queryEngine = index.asQueryEngine();
	// 	// const response = await queryEngine.query("Summarize this text");
	// 	// console.log(response.toString());
	// 	console.log("Nodes with scores:", nodesWithScores);
	// }

	onunload() {}

	async activateContextView() {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_CONTEXT)

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0]
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false)
			await leaf.setViewState({
				type: VIEW_TYPE_NOTE_CONTEXT,
				active: true,
			})
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf)
	}

	// TODO: rethink multiple instances of this view type
	async activateWorkspaceView() {
		const { workspace } = this.app

		let leaf: WorkspaceLeaf | null = null
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKSPACE)

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0]
		} else {
			// Our view could not be found in the root split,
			// 
			leaf = workspace.getLeaf("split", "vertical")
			await leaf.setViewState({
				type: VIEW_TYPE_WORKSPACE,
				active: true,
			})
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf)
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		)
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class LlmSettingTab extends PluginSettingTab {
	plugin: LlmPlugin

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc("Get one at platform.openai.com")
			.addText((text) =>
				text
					.setPlaceholder("sk-")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value
						await this.plugin.saveSettings()
					})
			)
	}
}
