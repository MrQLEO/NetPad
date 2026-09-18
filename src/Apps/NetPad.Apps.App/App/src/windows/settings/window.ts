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

            // 用户点了 Apply/Save 才真正切换语言：触发 @observable 变更使所有 `| t` 即时刷新，
            // 并广播回调（如主菜单重建）。持久化已由上面的 update 完成。
            await this.translation.setLanguage(this.editableSettings.language ?? "en");

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
