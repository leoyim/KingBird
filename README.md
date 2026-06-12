# EZRSS

> 一款极简、高性能的 macOS 风格 RSS 阅读器，运行在浏览器中。所有数据仅存储在本地，不依赖任何云端服务。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-646cff)
![PWA](https://img.shields.io/badge/PWA-ready-brightgreen)

---

## 目录

- [背景](#背景)
- [特性](#特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [键盘快捷键](#键盘快捷键)
- [项目结构](#项目结构)
- [部署](#部署)

---

## 背景

RSS 阅读器市场成熟但割裂：**Reeder** 优雅却锁定 Apple 生态，**Feedly** 功能强大却有广告和订阅限制，**Tiny Tiny RSS** 自由却需自建服务器。用户普遍面临**信息过载**、**界面臃肿**、**隐私担忧**和**离线体验差**等痛点。

EZRSS 的核心理念：

- **数据主权** — 一切存储在本机 IndexedDB，绝不收集用户行为
- **极致简约** — macOS 设计语言，三栏布局一目了然
- **专注阅读** — 原文 / 纯文本 / 仿生阅读三种渲染模式
- **低调高效** — 虚拟滚动 + Service Worker 离线缓存 + Web Worker 后台抓取

---

## 特性

### 订阅管理
- ➕ 手动输入 URL 或网站地址智能检测 RSS 源
- 📂 文件夹 / 标签双重组织订阅源
- ✏️ 编辑订阅标题、URL、所属文件夹、标签
- 🗑️ 删除订阅源（级联清除关联文章）
- 📥 OPML 文件导入与导出
- 📦 JSON 全量数据备份与还原

### 文章阅读
- 📋 三栏布局：侧边栏 → 文章列表 → 阅读视图
- 👁️ 未读 / 已读状态追踪，一键标记已读
- ⭐ 文章收藏，独立收藏筛选视图
- 🔍 全文关键词搜索（FlexSearch 本地索引）
- 📊 虚拟滚动优化长列表性能

### 智能过滤
- 🏷️ "全部未读" / "收藏" 快速切换
- 🏷️ 按标签筛选订阅源
- 🔑 关键词过滤规则（设置中自定义）

### 阅读体验
- 📖 **原文模式** — 保留原始排版，代码块语法高亮
- 📝 **纯文本模式** — 提取纯文本，纯净阅读
- 🧠 **仿生阅读模式** — 单词首部加粗，提升阅读速度
- 🎛️ 字体大小动态缩放（12px — 24px）

### 界面定制
- 🌓 浅色 / 深色 / 跟随系统三种主题
- 👓 护眼模式（暖色背景）
- 🔔 浏览器推送通知

### 离线 & 后台
- ⚡ Service Worker 缓存策略（App Shell + 运行时缓存）
- 🔄 后台自动刷新（可配置 15 / 30 / 60 / 180 分钟）
- 👷 Web Worker 后台 RSS 抓取，不阻塞主线程
- ⚡ 多订阅源并行刷新

### 数据安全
- 🔒 所有数据仅存于本地 IndexedDB
- 🚫 零外部追踪、零分析服务
- 💾 OPML / JSON 文件备份还原

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Zustand |
| 本地存储 | Dexie.js (IndexedDB) |
| 样式 | Tailwind CSS + tailwindcss-animate |
| 图标 | Lucide React |
| 全文搜索 | FlexSearch |
| 代码高亮 | Prism.js |
| 正文提取 | @mozilla/readability |
| XSS 防护 | DOMPurify |
| 虚拟滚动 | @tanstack/react-virtual |

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装

```bash
git clone https://github.com/leoyim/ezrss.git
cd ezrss
npm install
```

### 开发

```bash
npm run dev
```

浏览器访问 `http://localhost:5173` 即可开始开发。

### 构建

```bash
npm run build    # 类型检查 + 生产打包
npm run preview  # 本地预览生产构建
```

构建产物输出到 `dist/` 目录。

---

## 使用指南

### 添加订阅源

1. 点击工具栏 **+** 按钮（或按 `N`）
2. 输入 RSS 链接或网站地址
3. 可选择文件夹和标签
4. 点击"添加"完成订阅

### 导入 OPML

1. 点击工具栏 **导入** 按钮（或进入设置 → 数据管理）
2. 拖放或选择 `.opml` / `.xml` 文件
3. 自动解析并导入所有订阅源

### 组织订阅源

- **文件夹**：编辑订阅时可选择 / 新建文件夹；文件夹可展开折叠
- **标签**：侧边栏中点击订阅旁的 `⋯` → "管理标签"→ 添加 / 移除标签
- **标签筛选**：点击标签按钮可只显示该标签下的订阅源

### 编辑 / 删除订阅源

- 悬停订阅源，点击 `⋯` 按钮弹出操作菜单
- 选择"编辑订阅"打开编辑对话框
- 选择"删除订阅"进入删除确认

### 阅读文章

- 点击文章进入阅读视图
- 工具栏可切换**原文 / 纯文本 / 仿生**三种模式
- 点击 ⭐ 收藏，点击 👁️ 切换已读状态
- `J` / `K` 切换上下一篇

### 搜索

- 点击 🔍 或按 `/` 打开搜索面板
- 输入关键词实时搜索所有文章

### 数据备份

- 打开设置面板（工具栏 ⚙️）
- 数据管理区域提供：导出 OPML / 导出 JSON / 导入 OPML / 导入 JSON

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `J` | 下一篇 |
| `K` | 上一篇 |
| `S` | 切换收藏 |
| `M` | 切换已读/未读 |
| `N` | 添加订阅 |
| `R` | 刷新 |
| `V` | 打开原文链接 |
| `/` | 搜索 |
| `Esc` | 关闭面板 / 关闭阅读 |

---

## 项目结构

```
ezrss/
├── public/
│   ├── sw.js                 # Service Worker 离线缓存
│   └── manifest.json         # PWA 清单
├── src/
│   ├── components/
│   │   ├── article/           # 文章列表、文章条目、骨架屏
│   │   ├── layout/            # AppLayout、Toolbar、Sidebar、StatusBar
│   │   ├── reader/            # ReaderView、LazyImage
│   │   ├── search/            # 搜索面板
│   │   ├── settings/          # 设置面板
│   │   └── subscription/      # 添加/编辑/导入订阅对话框
│   ├── db/
│   │   └── schema.ts          # Dexie (IndexedDB) 数据库定义
│   ├── hooks/                 # useTheme、useVirtualScroll 等
│   ├── services/              # RSS 解析、搜索、导出、通知
│   ├── stores/                # Zustand 状态管理
│   │   ├── subscriptionStore  # 订阅源 & 文件夹
│   │   ├── articleStore       # 文章 & 阅读状态
│   │   ├── tagStore           # 标签 & 关联
│   │   ├── filterStore        # 关键词过滤规则
│   │   └── uiStore            # UI 偏好 & 状态
│   ├── utils/                 # 工具函数 & 常量
│   ├── workers/               # Web Worker（后台抓取）
│   ├── App.tsx                # 根组件
│   ├── main.tsx               # 入口
│   └── index.css              # Tailwind 入口样式
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages 自动部署
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 部署

### GitHub Pages（自动）

推送到 `master` 分支后，GitHub Actions 自动构建并部署到 `gh-pages` 分支。

首次部署需在仓库 **Settings → Pages** 中设置：
- **Source**: `Deploy from a branch`
- **Branch**: `gh-pages` / `/ (root)`

### 其他平台

`dist/` 目录为纯静态文件，可部署到任意静态托管服务（Vercel、Netlify、Cloudflare Pages 等）。

---

## 许可

MIT License
