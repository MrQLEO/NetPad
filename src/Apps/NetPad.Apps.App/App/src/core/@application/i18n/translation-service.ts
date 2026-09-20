import {IDisposable} from "@aurelia/kernel";
// ISignaler 必须从 "aurelia" 主包导入：dev 模式下 webpack 把各 @aurelia/* 别名到各自独立的
// index.dev.mjs 独立打包，每份都有自己的令牌对象；而框架用 "aurelia" 主包聚合的那份令牌注册
// Signaler。若从 "@aurelia/runtime" 导入会拿到“未注册”的那份令牌，导致容器构造抛 AUR0012。
// 项目内所有框架令牌（ILogger/IContainer/DI 等）均遵循从 "aurelia" 导入的约定。
import {ISignaler} from "aurelia";
import {IEventBus, SettingsUpdatedEvent} from "@application";
import en from "./en.json";
import zhCN from "./zh-CN.json";
import ja from "./ja.json";
import {ITranslationService, LanguageInfo, LANGUAGE_CHANGED_SIGNAL} from "./itranslation-service";

const FALLBACK_LANGUAGE = "en";

// 静态引入所有语言资源，由 webpack 一并打包，避免运行时按需加载的兼容风险。
// 后续新增语言时，在此登记并在 availableLanguages 中追加即可。
const RESOURCES: Record<string, Record<string, string>> = {
    "en": en,
    "zh-CN": zhCN,
    "ja": ja,
};

export class TranslationService implements ITranslationService {
    public currentLanguage: string = FALLBACK_LANGUAGE;
    private readonly _onLanguageChangedCallbacks = new Set<(language: string) => void>();
    private _eventSubscription: IDisposable | null = null;
    private _serverEventsSubscribed = false;

    public readonly availableLanguages: LanguageInfo[] = [
        {code: "en", displayName: "English"},
        {code: "zh-CN", displayName: "中文"},
        {code: "ja", displayName: "日本語"},
    ];

    constructor(
        @IEventBus private readonly eventBus: IEventBus,
        @ISignaler private readonly signaler: ISignaler
    ) {
        // 注意：不在构造函数里订阅 SettingsUpdatedEvent。此时 SignalRIpcGateway 还没 start()，
        // this.connection 为 undefined，订阅会抛 Cannot read properties of undefined (reading 'on')。
        // 订阅改由 subscribeToServerEvents() 在 app.start() 之后（网关已连接）调用。
    }

    // 订阅后端广播的语言变更事件，用于桌面端跨窗口同步。
    // 必须在 app.start() 之后调用（此时 SignalRIpcGateway 已 start()、this.connection 已创建），
    // 否则订阅会抛 Cannot read properties of undefined (reading 'on')。
    // 由 main.ts 在应用启动完成后调用；带去重保护，重复调用安全。
    public subscribeToServerEvents(): void {
        if (this._serverEventsSubscribed) {
            return;
        }
        this._serverEventsSubscribed = true;

        this._eventSubscription = this.eventBus.subscribeToServer(SettingsUpdatedEvent, msg => {
            const lang = msg?.settings?.language;
            if (lang) {
                this.applyLanguage(lang);
            }
        });
    }

    public t(key: string, params?: Record<string, string | number>): string {
        const current = RESOURCES[this.currentLanguage];
        let value = (current && current[key]) ?? RESOURCES[FALLBACK_LANGUAGE][key] ?? key;

        if (params) {
            for (const [name, val] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{${name}\\}`, "g"), String(val));
            }
        }

        return value;
    }

    public initialize(language?: string): void {
        if (language && RESOURCES[language]) {
            this.currentLanguage = language;
        }
    }

    // 仅切换当前语言并触发刷新信号与回调，不持久化。供本窗口即时切换与跨窗口事件同步复用，避免重复写库与回环。
    // 语言无变化时直接跳过，避免每次（无关的）设置保存都触发菜单重建等副作用。
    public applyLanguage(language: string): void {
        if (!RESOURCES[language]) {
            language = FALLBACK_LANGUAGE;
        }

        if (this.currentLanguage === language) {
            return;
        }

        this.currentLanguage = language;

        // 本窗口即时刷新：触发 ISignaler 信号，所有 `| t` 绑定会重算。
        this.signaler.dispatchSignal(LANGUAGE_CHANGED_SIGNAL);

        for (const callback of this._onLanguageChangedCallbacks) {
            try {
                callback(language);
            } catch (err) {
                console.error("A language-changed callback threw:", err);
            }
        }
    }

    public onLanguageChanged(callback: (language: string) => void): IDisposable {
        this._onLanguageChangedCallbacks.add(callback);
        return {
            dispose: () => {
                this._onLanguageChangedCallbacks.delete(callback);
            }
        };
    }
}
