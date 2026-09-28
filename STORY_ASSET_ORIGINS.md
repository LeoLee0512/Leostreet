# 剧情战资产来源记录

检查与更新日期：2026-09-22。范围：本轮原创战略地图、界面配套品牌图及直接相关依赖；不是整个旧项目的版权许可认证。

## 本轮原创地图与品牌图

- `src/lib/story/atlas.ts`：原创灯湾沿岸地理坐标。三个可经营省区为苍岭省、河湾省、潮门省；维岚邦联和瑟林共和国为背景邻邦，不对应真实世界的国家、地形或疆域。
- `src/components/story/StoryAtlas.tsx`、`StoryAtlas.css`：Canvas 绘制海岸、岛屿、省界、等高线、调查网格、铁路和海运线路。不存在地图底图、卫星照片、地理数据集或来自参考游戏的图像输入。
- 地图仅把现有三行业的开工、库存、运力等数据投射到省区。居民收入、就业和物价为全辖区共同统计。背景邻邦没有独立模拟或伪造 AI 数据。
- `public/og.jpg`：1200 × 630 JPEG，90,632 字节。
- `public/x-banner.jpg`：1200 × 264 JPEG，44,338 字节。
- `public/favicon.svg`：32 × 32 viewBox 的原创三产业柱形图标，深色底与青灰色图形。
- `src/lib/og/site.json`：名称“狮子街传说”，`type: x:game`、`card: custom`、`color: 10191F`。
- 品牌卡由 `.grok/story-brand-art.py` 读取本项目自行编写的 atlas 坐标，在空白画布上绘制。代码没有读取、加工或描摹任何第三方图片，也没有使用参考游戏的标志、角色、地图或配乐。
- Python / Pillow 渲染，先暂存至 `.grok`，再由 `scripts/write-atomic.mjs` 原子移交。字体使用本机已安装的 Microsoft YaHei、Microsoft YaHei Bold、Georgia；没有复制、下载或分发字体文件。
- 本轮没有引入背景音乐、第三方录音或采样。既有 `src/lib/game/audio.ts` 点击、成功及失败提示通过 Web Audio 振荡器合成。

品牌图片 SHA-256：

```text
public/og.jpg
16C38DF14C26A8919079608B7361D372407CE58245B3E981837AE334C557E96D
public/x-banner.jpg
D2E4DAD8D4BAEDD343EE0E096FD16E93DB18BDF3E9E80D3371758E820A96A735
```

## 继承资源的核验边界

- 旧项目 `public/village/*` 与 `public/sprites/*`（含 16 张建筑图）以及根目录 `assets/`（约 64MB 旧地图素材）**已于 2026-09-24 的大清理中全部删除**，本条仅作存档记录。它们历史上没有逐项创作记录、采购凭证或授权清单，删除前记为“继承素材，尚未核验”。战略地图及品牌卡从未读取这些素材。
- `public/__grok/*` 是项目自带的平台品牌与安装资源，完整保留，未挪作游戏美术。
- 2026-09-21 的检查未发现 `public` 音频文件或源码外部配乐加载。当前地图和品牌更新没有新增任何音频。这只描述检查范围，不是对整个项目或依赖树作全面权利保证。

## 字体与组件许可

2026-09-21 核查的原有 Google Fonts 字体许可均为 SIL Open Font License 1.1：

- [Fredoka 官方许可](https://github.com/google/fonts/blob/main/ofl/fredoka/OFL.txt)
- [Nunito Sans 官方许可](https://github.com/google/fonts/blob/main/ofl/nunitosans/OFL.txt)
- [IBM Plex Mono 官方许可](https://github.com/google/fonts/blob/main/ofl/ibmplexmono/OFL.txt)

当时已读取的安装包许可：`lucide-react/LICENSE` 为 ISC（含 Feather 的 MIT 来源说明），`react/LICENSE`、`recharts/LICENSE`、`@radix-ui/react-tabs/LICENSE` 为 MIT。继续分发时应保留相应版权及许可声明。本清单未声称审计全部依赖；本轮地图没有新增依赖。

## 本轮验证

- 两张最终 JPEG 已回读并目视：尺寸正确、均小于 600 KB、中文标题完整；X 横幅全部重要文字位于左半部和上方 80% 安全区内。
- `node scripts/brand-check.mjs --game`：通过，`pending: false`、0 条警告。
- 独立 `atlas-qa` 浏览器会话检查过实际游戏内地图；另用该会话的隔离组件夹具检查 1280 × 900 与 390 × 844 视口，未操作用户会话或存档。
- 已检查省区按钮选择、供应与全辖区生活数值投射、缩放、平移、复位、管理回调对应行业、手机无水平溢出。组件夹具截图：`C:/workspace/screenshots/strategic-atlas-fixture-desktop.png`、`C:/workspace/screenshots/strategic-atlas-mobile.png`。
- 地图几何检查确认三个省区中心各自唯一命中本区。
- `npm run typecheck` 通过；本轮地图 TypeScript 文件的 ESLint 通过。生产构建与完整应用验证由主任务统一执行。
- 未更改根页面 meta、PWA 注入脚本或 `public/__grok`。
