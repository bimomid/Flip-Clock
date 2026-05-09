# 专注计时器+图标栏合并优化

**新功能：专注时钟 (Focus Timer)**

- 新增 `FocusMode` 组件：圆形进度环 + 倒计时显示，带小球跟随动画
- 新增 `FocusRing` 组件：SVG 圆环进度条，支持报警脉冲动画
- 新增 `FocusTimePicker` 组件：三列无限滚轮时间选择器（时/分/秒），支持滚轮和拖拽
- 新增 `FocusTimer` Pinia store：完整的计时器状态机（开始/暂停/恢复/重置），持久化到 localStorage
- 倒计时归零时播放闹钟音频，任意点击关闭
- **后台计时**：切换到翻页时钟视图后计时不中断，闹钟触发时自动切回专注模式
- FlipClock 与 FocusMode 之间切换带缩放淡入淡出过渡动画

**新功能：自适应合并图标栏 (Dock Merge)**

- 新增 `DockRow` 组件：检测左右图标栏碰撞，自动合并为单行
- 窗口放大至足够宽度时自动分离回双栏，带滞后余量防抖
- FLIP 动画：合并/分离时图标平滑过渡到新位置
- 合并模式下拖拽图标靠近边缘自动滚动
- 滚动条 JS 显隐控制（`mouseenter`/`mouseleave`/`scroll`），比 CSS `:hover` 更可靠

**IconsDock 增强**

- 新增 `fluid` 模式：合并后的横向滚动图标栏
- 新增 `top` / `bottom` 两个 DockPosition，作为合并后的目标位置
- 拖拽虚影与预览插入位支持跨 dock 拖放
- 移动端误触优化：`wasDragged` 重置逻辑修正

**新增图标**

- `alarm-clock`：动态 SVG，时钟指针随计时进度旋转
- `count-clock`：倒计时图标
- `home`：返回翻页时钟，闹钟响时自动关闭闹钟
- `tasks`：任务图标（预留）

**代码优化**

- `FocusTimer`：提取 `beginTicking()` 消除 `start()`/`resume()` 7 行重复代码
- `FocusTimer`：`startAlarmInternal` 幂等化，避免 FocusMode 重挂载时音频重头播放
- `FocusTimer`：移除未使用的 `dispose()` 方法及 `hours`/`minutes`/`seconds` 死导出
- `DockRow`：提取 `pillW()`/`w()` 辅助函数消除重复的 querySelector 和宽度计算
- `FocusMode`：`playPauseIcon` 三路 if-else 简化为单行三元表达式
- `KeepPalette`：局部变量 `ref` 重命名为 `overrides`，消除 Vue `ref` 导入遮蔽
- `FlipClock`：Audio 元素改为懒初始化，避免页面加载即创建
- `SvgIcon`：`onBeforeUnmount` 中清理 watcher，防止内存泄漏
- `PanelPalette`：重置按钮从文字 `↺` 改为 SVG 图标，视觉统一
- `IconsConfig`：图标色调整体调整，更现代的配色方案
