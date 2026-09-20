import {IContainer} from "aurelia";
import {ISettingsService, IWindowService, MonacoEnvironmentManager, Settings} from "@application";
import {ITranslationService} from "@application/i18n/itranslation-service";
import {WindowBase} from "@application/windows/window-base";
import {WindowParams} from "@application/windows/window-params";

export class Window extends WindowBase {
    public editableSettings: Settings;
    public selectedTab;
    public tabs = [
        {route: "general", text: "settings.tabs.general"},
        {route: "editor", text: "settings.tabs.editor"},
        {route: "results", text: "settings.tabs.results"},
        {route: "style", text: "settings.tabs.style"},
        {route: "keyboard-shortcuts", text: "settings.tabs.keyboard"},
        {route: "omnisharp", text: "settings.tabs.omnisharp"},
        {route: "about", text: "settings.tabs.about"},
    ];

    constructor(
        @ISettingsService private readonly settingsService: ISettingsService,
        @IWindowService private readonly windowService: IWindowService,
        @ITranslationService private readonly translation: ITranslationService,
        @IContainer private readonly container: IContainer) {
        super();

        document.title = "Settings";

        let tabIndex = this.tabs.findIndex(t => t.route === WindowParams.get("tab"));
        if (tabIndex < 0)
            tabIndex = 0;

        this.selectedTab = this.tabs[tabIndex];
        this.editableSettings = this.settings.clone();
    }

    public async binding() {
        await MonacoEnvironmentManager.setupMonacoEnvironment(this.container);
    }

    public get canApply() {
        return JSON.stringify(this.settings) !== JSON.stringify(this.editableSettings);
    }

    public async apply(): Promise<boolean> {
        if (!this.validate()) {
            return false;
        }

        try {
            await this.settingsService.update(this.editableSettings);

            // 语言随上面的 update 一并持久化，后端会广播 SettingsUpdatedEvent 让其他窗口同步；
            // 这里只做本窗口的即时切换。不要调 setLanguage 之类会再次写库的方法——
            // 它基于单例设置克隆后整体回写，广播尚未到达时会把刚保存的其他设置（如主题）覆盖回旧值。
            this.translation.applyLanguage(this.editableSettings.language ?? "en");

            return true;
        } catch (e) {
            this.logger.error("Error while saving settings", e);
            alert("A problem occurred. Could not save settings");
            return false;
        }
    }

    public async save() {
        if (!await this.apply()) {
            return;
        }

        await this.windowService.close();
    }

    public async close() {
        await this.windowService.close();
    }

    public async showAppDataFolder() {
        await this.settingsService.showSettingsFile();
    }

    private validate(): boolean {
        let userValue: unknown = this.editableSettings.results.maxSerializationDepth;
        if ((userValue !== 0 && !userValue) || isNaN(Number(userValue))) {
            alert("Results > Serialization > Max Depth is required.");
            return false;
        }

        userValue = this.editableSettings.results.maxCollectionSerializeLength;
        if ((userValue !== 0 && !userValue) || isNaN(Number(userValue))) {
            alert("Results > Serialization > Max Collection Length is required.");
            return false;
        }

        return true;
    }
}
