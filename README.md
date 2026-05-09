# 构建包

## 快速开始

> 签名密钥、密码等敏感信息统一存放在 `Hide.md` 文件中（仅存在于 `hide` 私密分支）。
> 详见下方 [分支管理策略](#分支管理策略)。

### 应用标识

| 项目                 | 值                     |
| -------------------- | ---------------------- |
| 包名 (applicationId) | `com.kavie.flip_clock` |
| 产品名               | `flip-clock`           |
| identifier           | `com.kavie.flip-clock` |

---

## 构建 Windows EXE

```bash
pnpm tauri build
```

构建产物在 `src-tauri/target/release/bundle/msi` 目录下，会生成 `.exe` 和 `.msi` 安装包。

便携式，无需安装的包在 `src-tauri/target/release/flip-clock.exe`

配置如下 (`src-tauri/tauri.conf.json`)：

```json
{
  "bundle": {
    "windows": {
      "wix": null,
      "nsis": null
    },
    "android": {
      "minSdkVersion": 24,
      "autoIncrementVersionCode": true
    }
  },
  "plugins": {}
}
```

---

## 构建 Android APK

### 前置条件

安装 Android 工具链：

1. 安装 [Android Studio](https://developer.android.com/studio)
2. 通过 SDK Manager 安装 Android SDK Platform 34+、NDK、Build-Tools
3. 设置环境变量：

```bash
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk | tail -1)"
```

4. 添加 Rust Android 编译目标：

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

5. 初始化 Android 项目（只需执行一次）：

```bash
pnpm tauri android init
```

---

### 配置文件说明

#### 1. `src-tauri/tauri.conf.json` — Tauri 主配置

Android 相关的 bundle 配置：

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": null,
      "nsis": null
    },
    "android": {
      "minSdkVersion": 24,
      "autoIncrementVersionCode": true
    }
  },
  "plugins": {}
}
```

- `minSdkVersion: 24` — 最低支持 Android 7.0
- `autoIncrementVersionCode: true` — 每次 release 构建自动递增版本号

#### 2. `src-tauri/gen/android/app/build.gradle.kts` — Android 构建配置

签名配置（已添加 `signingConfigs` 和 release 签名）：

```kotlin
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.kavie.flip_clock"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.kavie.flip_clock"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }

    signingConfigs {
        create("release") {
            val keystoreFile = rootProject.file("keystore.properties")
            if (keystoreFile.exists()) {
                val props = Properties()
                props.load(keystoreFile.inputStream())
                storeFile = file(props["storeFile"] as String)
                storePassword = props["storePassword"] as String
                keyAlias = props["keyAlias"] as String
                keyPassword = props["keyPassword"] as String
            }
        }
    }

    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")
```

关键点：

- `signingConfigs` 块从 `keystore.properties` 读取签名信息
- release 构建类型强制使用 release 签名配置
- `isMinifyEnabled = true` 开启代码压缩混淆

#### 3. `src-tauri/gen/android/keystore.properties` — 签名密钥配置

此文件包含敏感信息，**仅存在于 `hide` 私密分支，不提交到公开仓库**。

```properties
storeFile=../release.keystore
storePassword=<你的密钥库密码>
keyAlias=release
keyPassword=<你的密钥密码>
```

#### 4. `src-tauri/gen/android/app/tauri.properties` — 版本信息

```properties
tauri.android.versionName=0.1.0
tauri.android.versionCode=1000
```

- `versionName` — 对用户显示的版本号，手动修改
- `versionCode` — 整数版本号，每次发布必须递增，`autoIncrementVersionCode: true` 时自动处理

#### 5. `package.json` — 构建脚本

```json
{
  "scripts": {
    "android:build": "pnpm tauri android build",
    "android:build:debug": "pnpm tauri android build --debug",
    "android:dev": "pnpm tauri android dev"
  }
}
```

---

### 构建发布版 APK（完整流程）

#### 第一步：生成签名密钥（只需一次）

实际命令和密码见 `Hide.md`（仅在 `hide` 分支）。以下是通用模板：

```bash
keytool -genkey -v -keystore src-tauri/gen/android/release.keystore \
  -alias release -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <你的密码> -keypass <你的密码> \
  -dname "CN=Flip Clock, OU=Dev, O=Kavie, L=City, S=State, C=CN"
```

> 密钥文件 `release.keystore` 仅存在于 `hide` 分支。请妥善保管，丢失后无法对后续版本签名更新。

#### 第二步：填写签名配置

创建 `src-tauri/gen/android/keystore.properties`，填入签名密码：

```properties
storeFile=../release.keystore
storePassword=<你的密钥库密码>
keyAlias=release
keyPassword=<你的密钥密码>
```

#### 第三步：构建

```bash
pnpm android:build
```

#### 第四步：获取 APK

构建产物路径（实际目录结构按 CPU 架构分组）：

```
src-tauri/gen/android/app/build/outputs/apk/universal/release/
```

| 文件                          | 大小   | 说明                      |
| ----------------------------- | ------ | ------------------------- |
| `app-universal-release.apk`   | ~28MB  | 通用包，覆盖所有 CPU 架构 |
| `app-arm64-v8a-release.apk`   | 按架构 | 现代手机 (64位 ARM)       |
| `app-armeabi-v7a-release.apk` | 按架构 | 老旧手机 (32位 ARM)       |
| `app-x86_64-release.apk`      | 按架构 | 模拟器 (x86_64)           |

> 直接安装到手机使用 `app-universal-release.apk`。上架 Google Play 推荐使用 AAB 格式：`src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab` (~13MB)。

#### 第五步：验证 APK 签名（可选）

```bash
keytool -printcert -jarfile src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

输出包含 `CN=Flip Clock` 等签名信息则表示签名成功。

---

### 构建调试版 APK（无需签名）

如果只是快速测试，调试版无需 keystore，默认自动签名：

```bash
pnpm android:build:debug
```

产物路径：`src-tauri/gen/android/app/build/outputs/apk/universal/debug/`

> 调试版体积较大 (~388MB)，因为包含调试符号和未压缩的 native 库。

---

### JDK 21 兼容性配置

如果使用 JDK 21 构建，Gradle 会报 source/target version 8 已过时的警告。在 `src-tauri/gen/android/gradle.properties` 中添加：

```properties
android.javaCompile.suppressSourceTargetDeprecationWarning=true
```

---

### 安装到设备

```bash
# 通过 ADB 安装
adb install src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk

# 或复制到手机直接点击 APK 安装
```

---

## 分支管理策略

项目使用双分支管理敏感信息：

```
master (公开 → GitHub)          hide (私密 → 本地)
├── README.md (占位符)           ├── README.md (占位符，同 master)
├── 所有源代码和配置             ├── 所有源代码和配置 (同 master)
                                ├── Hide.md ← 签名密码等敏感信息
                                ├── release.keystore ← 签名密钥文件
                                └── keystore.properties ← 签名配置
```

### 日常开发工作流

1. **日常开发在 `master` 分支进行**

   ```bash
   git checkout master
   # 修改代码...
   git add -A
   git commit -m "feat: 新增功能"
   ```

2. **将 master 的更新同步到 hide**

   ```bash
   git checkout hide
   git merge master
   # 因为 hide 只有额外文件，README 内容相同，不会有冲突
   ```

3. **构建发布版 APK 必须切换到 hide 分支**

   ```bash
   git checkout hide
   pnpm android:build
   ```

4. **推送 master 到 GitHub**
   ```bash
   git checkout master
   git push origin master
   # hide 分支永远不推送
   ```

### 敏感文件清单

以下文件**仅存在于 `hide` 分支**，已加入 `.gitignore` 且永远不会出现在 `master` 分支：

| 文件                                        | 说明                             |
| ------------------------------------------- | -------------------------------- |
| `Hide.md`                                   | 签名密码、环境路径等所有敏感信息 |
| `src-tauri/gen/android/release.keystore`    | Android 签名密钥文件             |
| `src-tauri/gen/android/keystore.properties` | 签名密钥配置（含密码）           |

---

### 常见问题

**Q: 签名密钥丢失了怎么办？**

A: 无法恢复。只能生成新密钥，但 Google Play 不允许更换签名密钥更新应用。本地安装的话需要先卸载旧版本再装新版本。

**Q: 安装时提示"应用未签名"？**

A: 检查 `keystore.properties` 是否存在且密码正确，或检查 `build.gradle.kts` 中 `signingConfig` 是否正确配置。

**Q: 构建报错 "Android SDK not found"？**

A: 确认 `ANDROID_HOME` 环境变量已设置，指向 Android SDK 目录。

**Q: 构建时报 "Supplied consumer proguard configuration does not exist" 警告？**

A: 这是 tauri-plugin-opener 的已知小问题，不影响构建和 APK 功能，可安全忽略。
