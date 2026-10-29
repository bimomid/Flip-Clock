<p align="center">
  <h1 align="center">Flip Clock</h1>
  <p align="center">A versatile desktop time tool built with Vue 3 + Tauri</p>
  <p align="center">基于 Vue 3 + Tauri 的多功能桌面时钟工具</p>
  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue" alt="License" /></a>
    <a href="https://github.com/bimomid/Flip-Clock/releases/latest"><img src="https://img.shields.io/github/v/release/bimomid/Flip-Clock" alt="Latest release" /></a>
  </p>
</p>

---

## 📥 Download | 下载

Windows 与 Linux 安装包见 [Releases](https://github.com/bimomid/Flip-Clock/releases/latest)：

| 平台    | 产物                                                  |
| ------- | ----------------------------------------------------- |
| Windows | NSIS 安装包 `*-setup.exe`（支持自动更新）、MSI 安装包 |
| Linux   | AppImage（支持自动更新）、`.deb`                      |
| Android | APK（CI 构建，见下文「Android 构建」）                |

> 非商业使用许可，详见 [LICENSE](LICENSE)。

---

## ✨ Features | 功能

- **Flip Clock** — Classic flip-style clock with smooth flip animation and optional tick sound
- **Focus Timer** — Pomodoro-style countdown with ring progress visualization and alarm
- **Stopwatch** — Precise stopwatch with lap/split timing
- **Task Notepad** — Draggable & resizable floating notepad
- **Customizable Dock** — Drag-and-drop icon toolbar supporting 6 dock positions
- **Theme** — Dark / Light theme switching
- **12/24h** — Time format toggle
- **i18n** — Multi-language support (English / 中文)

---

- **翻页时钟** — 经典翻页动画时钟，带翻页音效
- **专注计时** — 番茄钟倒计时，环形进度与闹铃提醒
- **秒表** — 高精度秒表，支持计圈/分段计时
- **任务便签** — 可拖拽、可缩放的悬浮记事本
- **图标坞** — 可拖拽排序的图标工具栏，支持 6 种停靠位置
- **主题切换** — 深色 / 浅色主题
- **12/24 小时制** — 时间格式切换
- **国际化** — 多语言支持（English / 中文）

## 📸 Screenshots | 截图

<div align="center">
  <img src="img/1.png" width="45%" alt="Flip clock (dark)" />
  <img src="img/2.png" width="45%" alt="Flip clock (light)" />
  <img src="img/3.png" width="45%" alt="Focus timer running" />
  <img src="img/4.png" width="45%" alt="Stopwatch with laps" />
  <img src="img/5.png" width="45%" alt="Theme switch animation, dark to light, mid-frame" />
  <img src="img/6.png" width="45%" alt="Task notepad" />
  <img src="img/7.png" width="45%" alt="Palette panel" />
  <img src="img/8.png" width="45%" alt="Language picker" />
  <img src="img/9.png" width="45%" alt="Theme switch animation, light to dark, mid-frame" />
  <img src="img/10.png" width="45%" alt="Flip clock in 12 hour format" />
  <img src="img/11.png" width="45%" alt="Focus timer duration picker" />
</div>

<div align="center">
  <img src="img/12.png" width="22%" alt="Android build running on a phone" />
</div>

> 截图均来自打包后的正式版本（Windows，`pnpm tauri build` 产物）。亮暗主题切换使用 View Transitions API 做圆形扩散动画，
> `img/5.png` 与 `img/9.png` 是动画进行到约 1/4 时的画面，用于展示过渡瞬间的图层效果。

## 🛠 Tech Stack | 技术栈

| Category  | Stack                           |
| --------- | ------------------------------- |
| Framework | Vue 3 (Composition API)         |
| Desktop   | Tauri 2                         |
| Language  | TypeScript                      |
| State     | Pinia + persisted state         |
| i18n      | vue-i18n                        |
| Toolchain | Vite+ (Vite 8 + Oxlint + Oxfmt) |
| Styles    | SCSS + CSS custom properties    |
| CSS Lint  | Stylelint                       |

## 🚀 Getting Started | 开始

### Requirements | 环境要求

| 依赖     | 版本             | 说明                                                               |
| -------- | ---------------- | ------------------------------------------------------------------ |
| Node.js  | ≥ 24             | CI 使用 Node 24                                                    |
| pnpm     | ≥ 10             | 仓库只接受 pnpm（`preinstall` 有 `only-allow` 校验）               |
| Rust     | stable（≥ 1.90） | `tauri-plugin-updater` 要求；通过 [rustup](https://rustup.rs) 安装 |
| 平台依赖 | —                | 见下表                                                             |

平台依赖：

- **Windows**：Microsoft C++ Build Tools（勾选「使用 C++ 的桌面开发」）+ WebView2 Runtime（Win11 自带）
- **Linux**：`libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
- **Android**（可选）：JDK 21 + Android SDK / NDK，首次需执行 `pnpm tauri android init`

```bash
pnpm install        # 安装依赖
pnpm dev            # 浏览器开发（http://localhost:1420）
pnpm tauri dev      # 桌面端开发（热更新）
pnpm build          # 构建前端
pnpm tauri build    # 构建桌面安装包

pnpm check          # 格式 + Oxlint + 类型检查（不修改文件）
pnpm check:fix      # 同上，自动修复
pnpm test           # 单元测试（单次运行）
pnpm test:watch     # 单元测试（watch）
pnpm version:check  # 校验三处版本号一致

pnpm commit         # 交互式提交（commitizen + cz-git）
```

国际化：首次启动跟随系统语言（`navigator.languages`），在图标坞切换后会被记住。

## 📁 Project Structure | 目录结构

```
src/
├── components/    # Vue components
├── composables/   # Reusable composition functions
├── config/        # Static config tables
├── layouts/       # Page layouts
├── languages/     # i18n definitions
├── services/      # Platform bridges
├── stores/        # Pinia stores
├── styles/        # Global styles and theme tokens
├── utils/         # Pure helper functions
├── assets/        # Static assets (svg, mp3)
└── main.ts        # Entry
tests/             # All test files
src-tauri/         # Tauri (Rust) backend
```

## 🧪 测试

```bash
pnpm test     # Vitest 单次运行
```

- 测试文件放在 `tests/`，命名 `*.test.ts`
- 纯函数（`src/utils`、`src/languages/locale.ts`）优先覆盖边界情况
- 涉及计时的 store 用 `vi.useFakeTimers()`，不要依赖真实时间

## 📝 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)，由 commitlint 在 `commit-msg` 钩子校验，允许的 type：
`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `revert` `chore` `wip`。

```bash
pnpm commit   # 交互式生成符合规范的提交信息
```

提交前请至少跑通 `pnpm check` 与 `pnpm test`。

## 🌐 国际化

- 词条位于 `src/languages/packages/<locale>.json`，各语言文件结构必须保持一致
- 新增语言：复制 `en-US.json` → 改 `locale.name` → 在 `src/languages/index.ts` 的 `messages` 里注册
- 组件里不要写死文案，统一用 `$t("...")`

## 🤖 Android 构建

APK 由 CI 自动构建并附在 Release 中；本地构建需要签名环境：

1. 首次执行 `pnpm tauri android init`
2. 在 `src-tauri/gen/android/keystore.properties` 填写签名信息（该文件已被 gitignore，**不要提交**）
3. 执行 `pnpm android:build`，产物位于 `src-tauri/gen/android/app/build/outputs/apk/`

## ⚙️ CI 与发布

- **CI**（PR / push）：格式 + lint + 类型 + 单测 + 前端构建、`cargo fmt` + `clippy -D warnings`、Windows/Linux 编译冒烟
- **Release**（push `master`，全自动）：校验 → 按 Conventional Commits 自动升版本号（三处同步）→ 打 tag → 矩阵构建 Windows（NSIS/MSI/便携 zip）、Linux（deb/AppImage）、Android（APK）→ 生成 `latest.json` → 发布 GitHub Release

发版细节、需要的 secrets 与手动热修流程见 [docs/RELEASE.md](docs/RELEASE.md)。

## 🔒 安全说明

- 渲染进程使用 Tauri CSP：`default-src 'self'`，脚本只允许同源，样式仅允许同源 + 内联。
- `script-src` 需额外允许 `'unsafe-eval'`：`vue-i18n` 在运行时编译词条模板（`new Function`），而 CSP 默认禁止。
  这是目前唯一启用 eval 的路径；若后续改为构建期预编译词条（`@intlify/unplugin-vue-i18n`），可移除该豁免。
- 应用不发起远程请求（除更新检查），不加载外部脚本，任务便签等输入均按纯文本渲染。

## 📄 License | 许可

本项目采用 [PolyForm Noncommercial 1.0.0](LICENSE)：允许个人学习、研究、修改与非商业分发，**禁止商业使用**，版权归作者所有。商业授权请联系作者。

> 说明：该许可证属于 source-available，并非 OSI 认可的开源许可证。
