# Pinia 状态管理 + 可拖拽工具栏 + 12/24 时制

这次主要做了三件事：

1. 把主题、配色、时钟设置等状态统一放到 Pinia 里管理。
2. 工具栏支持拖拽换位置，四个角都能放图标。
3. 时钟支持 12/24 小时切换，并且 12 小时制会显示 AM/PM。

---

## 新增的依赖

- 加了 `pinia`，用来集中管理状态。

---

## 主要功能变化

### 1) 拖拽工具栏（Dock）

- 原来的 IconDock 被替换成新的 ToolbarDock。
- 工具栏可以拖拽排序，也能从一个角拖到另一个角。
- 拖拽时会有“幽灵图标”跟着鼠标走，方便定位。
- 布局会保存到本地，下次打开还记得。

### 2) 12/24 小时切换

- 新增时间格式切换按钮（12 / 24）。
- 12 小时制会显示 AM/PM 标记。
- 设置会记住，不需要每次重设。

### 3) 主题和配色改成 Store 管理

- 原来用 `provide/inject` 的主题和配色逻辑，改成 Pinia store。
- 切换主题、修改主副色、重置配色都更集中、好维护。

---

## 配置调整

- Tauri 窗口配置里禁用了拖拽文件进窗口：`dragDropEnabled: false`。

---

## 新增文件一览

- 新图标资源：
  - `src/assets/Model-12.svg`
  - `src/assets/Model-24.svg`
  - `src/assets/Model-Loading.svg`

- 新增组件：
  - `src/components/ToolbarDock.vue`

- 新增组合逻辑：
  - `src/composables/useIconRegistry.ts`

- 新增状态管理：
  - `src/stores/clock.ts`（时间格式）
  - `src/stores/dock.ts`（工具栏布局）
  - `src/stores/theme.ts`（主题切换）
  - `src/stores/themeColors.ts`（配色管理）

---

## 简单体验方式

1. 启动项目后，右上角工具栏可以拖动和重排。
2. 点击“时间格式”图标，12/24 小时会切换。
3. 点击调色板图标，改配色，刷新也会保留。

如果你需要更细的改动说明，我可以再按文件逐条补充。
