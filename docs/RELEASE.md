# 发版流程

推送到 master（或合并 PR）后，`.github/workflows/release.yml` 自动完成：

```text
校验 → 按 conventional commits 升版本 → 同步 3 个版本文件 → commit + tag + push
     → Windows/Linux/Android 构建 → 生成 latest.json → 发布 GitHub Release
```

## 触发方式

| 场景          | 触发                                                                          | 行为                                   |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| 日常发版      | push 到 master，且包含 feat / fix / breaking 提交                             | 自动升版本、打 tag、构建并发布         |
| 只有文档/杂项 | push 到 master，只有 chore / ci / refactor 等（纯 docs、markdown 推送不触发） | 只跑校验；脚本输出 `skip=true`，不发版 |
| 热修 / 补发   | Actions → Release → Run workflow，填**已存在**的 tag（如 `v1.0.0`）           | 不升版本，直接构建该 tag 并发布        |
| 推 tag        | push `v*` tag                                                                 | 同上（不升版本）                       |

release 自己产生的提交是 `chore(release): X.Y.Z [skip release]`，workflow 会忽略它；
`GITHUB_TOKEN` 推送的 commit/tag 也不会再次触发 workflow（所以构建与发布必须在同一个
workflow 里用 `needs` 串起来）。

## 版本策略

版本号来自 `package.json`，同步到 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml`。

| 提交                                                      | >= 1.0.0 | 0.x                         |
| --------------------------------------------------------- | -------- | --------------------------- |
| `feat`                                                    | minor    | minor                       |
| `fix` / `perf` / `revert`                                 | patch    | patch                       |
| `!` 或 `BREAKING CHANGE:`                                 | major    | minor（0.x 不直接跳 1.0.0） |
| docs / style / refactor / test / build / ci / chore / wip | 不发版   | 不发版                      |

- 基线 tag 是 `v<package.json version>`；找不到时分析全部历史（首次发版）。
- 算出的 tag 已存在时自动再升一个 patch（pre-release 则计数器 +1）并输出 warning。
- 本地预演：`pnpm release:plan`（只打印，不写文件）。
- pre-release（本地）：`node scripts/bump-version.mjs --prerelease beta`，得到 `X.Y.Z-beta.0`。

## 产物清单

| 平台    | 文件                                       | 说明                               |
| ------- | ------------------------------------------ | ---------------------------------- |
| Windows | `flip-clock_<ver>_x64-setup.exe`           | NSIS 安装包                        |
| Windows | `flip-clock_<ver>_x64_en-US.msi`           | MSI 安装包                         |
| Windows | `FlipClock-<ver>-windows-x64-portable.exe` | 便携版裸 exe                       |
| Windows | `FlipClock-<ver>-windows-x64-portable.zip` | 便携版 zip                         |
| Linux   | `flip-clock_<ver>_amd64.deb`               | deb 安装包                         |
| Linux   | `flip-clock_<ver>_amd64.AppImage`          | AppImage（updater 直接复用它）     |
| Linux   | `flip-clock_<ver>_amd64.AppImage.sig`      | AppImage 签名（自动更新用）        |
| Android | `FlipClock-<ver>-android-*.apk`            | 可选 job，失败不阻塞桌面发布       |
| 通用    | `*.sig` / `latest.json`                    | 自动更新签名与清单（需要签名密钥） |

`latest.json` 的 target 选择：

- `windows-x86_64` → `*-setup.exe` + 同名 `.sig`
- `linux-x86_64` → `*.AppImage` + 同名 `.sig`（若配置为 `createUpdaterArtifacts: "v1Compatible"` 则回退到 `*.AppImage.tar.gz` + `.sig`）

提交信息里的 emoji 不影响解析：`feat: :sparkles: xxx`、`feat: ✨ xxx` 都会被识别为 `feat`。

## 仓库需要的配置

### Secrets

| 名称                                 | 必填              | 说明                                   |
| ------------------------------------ | ----------------- | -------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | 要自动更新时必填  | `tauri signer generate` 生成的私钥内容 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 否                | 私钥带密码时填写                       |
| `ANDROID_KEYSTORE_BASE64`            | 要签名 APK 时必填 | `release.keystore` 的 base64 内容      |
| `ANDROID_KEYSTORE_PASSWORD`          | 同上              | keystore 密码                          |
| `ANDROID_KEY_ALIAS`                  | 同上              | 密钥别名（本仓库为 `release`）         |
| `ANDROID_KEY_PASSWORD`               | 同上              | 密钥密码                               |

缺少私钥时不会产出坏掉的 `latest.json`：构建会跳过 updater 产物、不生成 `latest.json`，
并在 workflow 里输出 warning，Release 里只有安装包和便携版，自动更新暂时失效。

**Android 签名**：配齐上面 4 个 `ANDROID_*` 变量后，CI 会用 keystore 构建**签名的 release APK**；
缺任意一个则退化为 debug APK（不影响发版，只是体积大且不能上架）。keystore 与口令同样只存在 hide 分支。

**私钥存放位置**：仓库 `master` 分支**不含**私钥（`src-tauri/signing/` 已在 .gitignore 中忽略）。
私钥与口令记录在本地 `hide` 分支的 `src-tauri/signing/` 与 `Hide.md` 中，需要发版时再把
`TAURI_SIGNING_PRIVATE_KEY`（文件内容）与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（口令）填进
GitHub 仓库的 Secrets。**hide 分支不要推送到任何远端。**

### Actions 权限

Settings → Actions → General → Workflow permissions 选择 **Read and write permissions**；
`release.yml` 内已声明 `permissions: contents: write`。
若 master 启用了分支保护，需要允许 GitHub Actions 推送到 master，否则 plan job 的
`git push` 会失败（此时改用 PAT 时需自行补防循环判断）。

## 本地验证

```powershell
pnpm version:check        # 三个版本文件是否同步
pnpm release:plan         # 只打印将要升的版本，不写文件
node scripts/bump-version.mjs --dry-run --json
pnpm check                # 格式 / lint / 类型
pnpm test
```

## 常见问题

- **没有发版**：看 plan job 日志，`skip=true` 表示自上个 tag 起没有 feat/fix/breaking。
- **tag 已存在**：脚本自动再升一个 patch；要指定版本可手动 `pnpm version:sync <ver>`、提交并推 tag，
  tag push 会直接走发布流程。
- **没有 latest.json / .sig**：签名密钥没配，检查 `TAURI_SIGNING_PRIVATE_KEY`。
- **版本不一致**：`pnpm version:check` 会列出文件；用 `pnpm version:sync <ver>` 修复。
- **Windows 便携版打不开**：依赖系统 WebView2 运行时（Win10/11 通常自带）。
- **Android 是 debug APK**：CI 未配置正式签名；如需 release 签名，自行配置 keystore 后
  扩展 `build-android` job。
