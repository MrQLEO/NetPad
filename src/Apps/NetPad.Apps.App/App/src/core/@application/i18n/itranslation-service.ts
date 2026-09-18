import {DI, IDisposable} from "aurelia";

/**
 * 语言切换信号名。TranslationService 在语言变更后通过 ISignaler 触发该信号，
 * 所有使用了 TValueConverter（即模板里的 `| t`）的绑定会自动重算并刷新 UI（无需刷新页面）。
 *
 * 注意：桌面端每个 OS 窗口都是独立的渲染进程、拥有各自的 ISignaler 单例，
 * 因此跨窗口同步由 TranslationService 监听后端广播的 SettingsUpdatedEvent、在“本窗口”再次 dispatchSignal 实现，
 * 不能依赖单一全局信号跨进程传递。
 */
export const LANGUAGE_CHANGED_SIGNAL = "language-changed";

/**
 * 一种支持的语言。
 */
export interface LanguageInfo {
    /** 语言代码，如 "en"、"zh-CN"、"ja" */
    code: string;
    /** 该语言的自称（native name），用于语言选择列表，如 "English"、"中文" */
    displayName: string;
}

/**
 * 应用翻译服务。提供 t() 翻译、语言切换与变更订阅。
 */
export interface ITranslationService {
    /** 当前语言代码 */
    readonly currentLanguage: string;

    /** 所有可用语言 */
    readonly availableLanguages: LanguageInfo[];

    /**
     * 翻译指定 key。
     * @param key 点分 key，如 "menu.file.new"
     * @param params 可选插值参数，模板里用 {name} 占位
     * @returns 翻译后的文本；若当前语言与回退语言都缺失该 key，则返回 key 本身（便于发现漏翻）
     */
    t(key: string, params?: Record<string, string | number>): string;

    /**
     * 切换语言并持久化到用户设置。会立即触发刷新信号与变更回调。
     */
    setLanguage(language: string): Promise<void>;

    /**
     * 仅初始化当前语言（不持久化、不广播），用于应用启动时根据已保存的设置设定语言。
     */
    initialize(language?: string): void;

    /**
     * 订阅语言变更，返回用于取消订阅的句柄。
     */
    onLanguageChanged(callback: (language: string) => void): IDisposable;

    /**
     * 订阅后端广播的语言变更事件，用于桌面端跨窗口同步。
     * 必须在 IPC 网关（SignalRIpcGateway）start() 之后调用，否则 this.connection 尚未创建会报错；
     * 故不在构造函数里订阅，而由 main.ts 在 app.start() 之后调用。
     */
    subscribeToServerEvents(): void;
}

export const ITranslationService = DI.createInterface<ITranslationService>();
