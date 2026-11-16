# 群星纪年 · 大模型发布全景

大模型发布全景时间轴，收录 GPT、Claude、Gemini、Grok、Kimi、GLM、MiMo、DeepSeek 等厂商的
模型发布时间，支持按**公司**、**模型分类**、**输入类型**、**重要程度**筛选。

## 页面结构

从上到下是一条「先给结论，再给细节」的阅读路径：

| 区块 | 回答的问题 |
| --- | --- |
| 此刻概览 | 最新旗舰是谁 / 最便宜的选择 / 近 30 天节奏 / 平均迭代速度（随筛选联动） |
| 发布密度 | 哪几个月是发布高峰，点击柱状图直接跳到该月 |
| 代际竞速 | 各家主力模型的迭代轨迹，点越密说明迭代越快 |
| 年份条 + 时间轴 | 按年跳转，按月分组，旗舰/重要有视觉分级 |

筛选维度按「粗 → 细」排列：公司（默认折叠为前 8 家，已选项自动置顶）→ 模型分类 →
输入类型 → 重要程度。手机上另有一条「全部 / 只看旗舰 / 旗舰 + 重要」的快捷分段，
把 297 条压缩到 84 条，避免长时间滚动。

### URL 即视图状态

筛选、搜索、打开的详情全部同步到 `location.hash`，例如：

```
#companies=openai,google&cats=chat&levels=flagship&inputs=text&q=claude&model=qwen-4-max
```

因此链接可直接分享、刷新后状态不丢、浏览器前进/后退可用。右上角「分享」按钮复制当前链接。

## 技术栈

- Vite（CSR）+ React 19 + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite`）
- pnpm

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # 类型检查 + 生产构建
pnpm lint
```

## 数据

全部数据以预定义 JSON 存放于 `src/data/`：

| 文件 | 说明 |
| --- | --- |
| `models.json` | 模型发布事件：`id` / `name` / `company` / `releaseDate` / `inputs` / `category` / `level` / `icon` / `note` / `cost` / `source` |
| `companies.json` | 厂商：`id` / `name` / `nameZh` / `country` / `website` / `icon` / `color` / `tier` |
| `modalities.json` | 输入类型（文本 / 图像 / 音频 / 视频 / 文档） |
| `levels.json` | 重要程度分级及权重 |

### 重要程度分级

| 级别 | 含义 |
| --- | --- |
| `flagship` 旗舰 | 各厂主力旗舰发布，如 GPT 6、Claude Opus 5.5、Gemini 4、DeepSeek V4.1 |
| `major` 重要 | 重要版本、变体与生态节点 |
| `minor` 常规 | Flash / Mini / Image 等非主线模型 |
| `spinoff` 衍生 | 社区衍生版本 |

### 更新数据

1. 编辑 `src/data/models.json`，并把 `lastUpdated` 改为新的基准日（页面上的"相对时间"以此为准）。
2. 保持 `company` 与 `companies.json` 的 `id` 一致；`inputs` 取值需在 `modalities.json` 内。

## 图标

品牌图标来自 [lobehub/icons](https://github.com/lobehub/lobe-icons)（MIT），已复制至
`src/assets/icons/`，并由 `src/data/icons.ts` 以内联 SVG 方式提供，可随 `currentColor` 着色。
输入类型图标为项目自绘 SVG（见 `src/components/modalityIcons.ts`），各自带主题色。
