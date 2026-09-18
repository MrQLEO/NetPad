import {ITranslationService, LANGUAGE_CHANGED_SIGNAL} from "@application/i18n/itranslation-service";

/**
 * 翻译值转换器。模板中以 `key | t` 使用，例如 `${'menu.file.new' | t}` 或 `title.bind="'titlebar.close' | t"`。
 *
 * 通过 `signals` 声明依赖 LANGUAGE_CHANGED_SIGNAL：TranslationService 在语言变更后通过 ISignaler 触发该信号，
 * Aurelia 会重算本窗口所有 `| t` 绑定并刷新 UI（无需手动刷新页面）。
 *
 * 跨窗口同步说明：桌面端每个 OS 窗口是独立的渲染进程、拥有各自的 ISignaler 单例，
 * 单一窗口 dispatch 的信号不会跨进程到达其它窗口。因此 TranslationService 在收到后端广播的
 * SettingsUpdatedEvent 时，会在“本窗口”再次 dispatchSignal，从而让每个窗口各自的 `| t` 绑定都得到刷新。
 */
export class TValueConverter {
    // 必须是实例字段，不能写成 static：框架在绑定挂载时（runtime 的 astBind）从 DI 容器
    // 解析出的是转换器“实例”，实例读不到静态属性，vc.signals 会是 undefined，
    // 信号监听就挂不上去，语言切换后 dispatchSignal 对所有 `| t` 绑定都不生效。
    public readonly signals = [LANGUAGE_CHANGED_SIGNAL];

    constructor(@ITranslationService private readonly translation: ITranslationService) {
    }

    public toView(key?: string, params?: Record<string, string | number>): string {
        if (!key) {
            return "";
        }

        return this.translation.t(key, params);
    }
}
