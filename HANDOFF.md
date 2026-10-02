# 狮子街传说 — 交接文档

> 写给下一个接手的会话。读完这份就能继续干，不用翻聊天记录。
> **这是唯一最新的交接文档。** `STORY_LEARNING_STRATEGY_PLAYTEST.md` 是第四轮试玩版的交付记录，留作存档，不再描述当前版本。
> 最后更新：2026-10-05（第六轮：转向「央行行长」大战略——Blender 世界地图、油画肖像、删除对战与练习场、新流程；下一步 G1 央行玩法）

---

## 0. 一句话：这个项目现在是什么

**一款 Victoria 3 / 钢铁雄心式的金融历史战略游戏，玩家只扮演央行行长**：**沙盒**（在 Blender 建模的架空世界地图上执掌一国央行，G1 开发中）+ **十四关历史危机剧情战**（按难度排成阶梯，通关一关开下一关）。主菜单是全屏世界地图，只有一个「开始游戏」。

技术栈：TanStack Start + React 19 + Tailwind v4 + three.js（@react-three/fiber + drei），另有 WinForms + WebView2 + Inno Setup 自研桌面打包（见 §5）。

它**曾经**是"卡通小镇里单机炒股"，后来又有过 5v5 / 5v5v5 对战和单机练习场（散户/券商/行长三种身份）。**这些全部已删除（用户授权，2026-10-05）。** 如果你在代码或文案里看到"对战/大厅/队友/座位喊话/散户/券商/练习场/走过去点大楼"之类的描述，那是残留，是 bug（剧情关卡里作为历史角色出现的"券商""散户"除外）。

**全虚构世界是有意的产品决策**：真实地图要审图号、真人有名誉权、真实公司有商标问题。可玩世界一律架空，真实历史只出现在「史实档案」里（见 §3.3b）。

---

## 永久免责声明（所有者 2026-10-02 规定，不得移除）

> **此为游戏，切勿当成投资建议，出现一切问题后果自负。**
> This is a game. Never treat it as investment advice. You bear all consequences of any problem that arises.

- 文案只在 `src/lib/disclaimer.ts` 定义一次。
- 显示位置：
  - 网页版与桌面版**每个画面**底部常驻一条提示：`GameDisclaimer`，挂在 `src/routes/__root.tsx` 与 `src/desktop.tsx` 两个根上；不可关闭，不拦截点击；
  - 复制出去的每份战报末尾：`reportShareText`；
  - 桌面安装包在复制任何文件之前先显示：`desktop/免责声明.txt`，即 `setup.iss` 的 `InfoBeforeFile`。
- `src/lib/disclaimer.test.ts` 锁定以上各处。删除、缩短、隐藏或改成可关闭，测试都会失败。
- 底部常驻条大约占 20px：新加的贴底面板或按钮要留出这段空间（沙盒的面板、选国家面板已经让开）。
- 以后任何把本游戏接到其他产品（例如 Leo AI）的功能，也必须原样带上这句话。
- 来历：这条声明最初在 `claude/game-disclaimer` 分支上（提交 `2a6e50f`），2026-10-07 移植进 main 后该分支已删除。

---

## 1. 当前状态（2026-10-05 本机实测）

| 项目 | 状态 |
|---|---|
| `npm run test:unit` | **223 通过 / 0 失败**（12 个测试文件，见 `package.json`） |
| `npm run test:scaffold` | **194 通过 / 4 失败**——4 个失败只出现在 git worktree 里：它们读 `.grok/skills/og/SKILL.md`，而 `.grok/*` 被 gitignore，worktree 里没有。主检出目录里全部通过 |
| `npm run typecheck`（tsc --noEmit） | 干净 |
| `npm run build` | 通过 |
| 浏览器验证 | Windows 本机 dev server + 浏览器实测（方式见 §9「QA 环境」） |

**开发环境是 Windows 本机，不是 Linux 沙箱。** 两条直接后果：

- `scripts/browser-smoke.mjs` 硬编码 `/workspace` 输出路径，在本机不可用；
- `scripts/preview.mjs` 的信号语义在 Windows 上不可靠。
- 所以 QA 流程改为：`npm run dev` 起本机 dev server，用浏览器实际点。

**worktree 里跑 dev server** 需要依赖：worktree 根目录的 `node_modules` 是指向主检出 `node_modules` 的目录联接（junction），已被 gitignore。

**仓库本身不是 prettier-clean**（老文件也过不了 `prettier --check`），所以别顺手 `npm run format` 全量格式化，那会产生一个没人能审的 diff。

根目录的 `{}` 文件、`desktop/` 里的 NSIS 残留、`.vercel/` 目录，均经用户决定**保留**，不要顺手清理。

---

## 2. 目录结构

```
src/lib/world/          世界地图数据（G3）
  world.data.ts         ★生成文件，别手改：6 国 / 38 省 / 省份拾取网格（由 blender/world_map.py 生成）
  world.ts              provinceAt / atlasToWorld / worldToAtlas / countryOf
  world.test.ts

src/lib/sandbox/        G1 沙盒：央行行长玩法（纯逻辑，node 可跑）
  types.ts              Macro / SandboxGame / Action / FocusNode / PendingEvent
  countries.ts          6 国开局设定与难度（维岚★ → 拉莫娜★★★★★）
  sim.ts                每周一跳的宏观模型 + AI 央行 + 政治 + 玩家操作 act() ★核心
  events/               40 个事件，五类：core 危机 / history 史实原型 / random 时事 / national 国别 / swans 黑天鹅
                        （kit.ts 公共类型与工具，index.ts 合并与触发顺序 eventFor）
  focus.ts              16 项国策，三条分支（BRANCHES），at = 树状图坐标
  governors.ts          任期结算「史实对照」：七位真实央行行长任期的年均通胀/失业（近似值）
  provinces.ts          省级失业（地图热力图用）
  store.ts              zustand：时钟（暂停/1×/2×/3×）、自动存档 localStorage「leo-street-sandbox-v1」
  sandbox.test.ts       平衡与规则测试

src/lib/profile.ts      行长档案（名字、ID、性别）localStorage「leo-street-profile-v1」
src/lib/game/           只剩通用小件：audio / format / math / honor（登录记录、剧情胜负记录）

src/lib/story/          剧情战领域模型
  types.ts              Scenario / Objective / StoryRun / CallScript / Lexicon
  difficulty.ts         十个难度档 + LADDER 阶梯顺序 + 解锁 + 五个称号 ★
  lengths.ts            四种篇幅（半小时/一小时/一个半小时/三小时）+ 三个成就 ★
  calls.ts              电话：接通延时、哪通该响、哪通能打 ★
  engine.ts             压力/弹药/杠杆/承诺/休市的模拟 ★核心
  realtime.ts           实时经营 + 危机内阁（cabinet）
  economy.ts            三行业经济模拟（原料/制造/运输）
  civic.ts              民生、请愿与复苏评级
  mission.ts            胜利条件与时间线的规则映射
  engagement.ts         收藏、外观、战报、兴趣记录
  atlas.ts              剧情用的「灯湾沿岸」地理坐标（苍岭/河湾/潮门三省）
  progress.ts           通关记录、称号、成就（localStorage）
  scenarios.ts          注册表 + 座位名 + 可用储备
  crises/*.ts           十四关数据（见 §3.3）
  store.ts              zustand 运行时状态 + 电话状态机

src/components/game/    GameRoot（流程）/ MapHome（主菜单）/ ProfileScreen（建档）/
                        ModeSelect（沙盒或剧情）/ BankerPortrait（油画肖像）/ LoginCard / LangToggle
src/components/world/   WorldMap（3D 世界地图组件，支持按省着色 tints）/ WorldMapScene
src/components/sandbox/ SandboxScreen（入口+时钟）/ CountryPicker / PolicyDesk（决策台四个页签）/ FocusTree（国策树弹窗）/
                        Dashboard（经济仪表）/ Dialogs（事件、任期结算）/ layers（地图图层）
src/components/story/   剧情 UI（选关 / 前情提要 / 作战室 / 电话 / 复盘 / 时间线 / 收藏 / StoryAtlas）
src/components/3d/      Scene3D / CanvasRoot 与几个 3D 小件（Coin3D / Crest3D / WaxSeal3D）

src/assets/world/       world.glb（2.8MB 地形+首都央行建筑）/ world-poster.jpg（无 WebGL 时的俯视图）/
                        world-provinces.png（每像素一个省份 id，高亮着色器用）
src/assets/portraits/   两幅公有领域油画（见 §4）

blender/world_map.py    世界地图生成脚本（便携版 Blender 5.2.2：C:\Users\lijiahao\Desktop\建模\）
blender/out/            预览渲染与废弃稿，已 gitignore

desktop/                桌面打包（见 §5）
```

**约定：`src/lib/**` 下的相对 import 必须带 `.ts` 后缀**（`tsconfig` 开了 `allowImportingTsExtensions`）。这是为了让这些模块能用 `node --experimental-strip-types --test` 直接跑，不经过 Vite。`@/` 别名在这些文件里不能用。

---

## 3. 核心设计（改之前必须理解）

### 3.1 世界地图（G3）★

- **唯一真相是 `blender/world_map.py`**。改国家、省份、形状、颜色：改脚本 → 在仓库根目录跑 `blender -b --factory-startup -P blender/world_map.py` → 它会重写 `src/assets/world/*` 和 `src/lib/world/world.data.ts`。别手改生成物。
- 坐标：图集单位 2400×1500（x 右、y 下）；Blender 里 X=(x−1200)/100、Y=−(y−750)/100；three.js 里 x=(ax−1200)/100、z=(ay−750)/100。
- 拾取：鼠标点到地形 → 世界坐标转回图集坐标 → `provinceAt` 查 12 单位分辨率的网格。高亮由着色器用 `world-provinces.png` 的 `texelFetch` 做，所以边界跟 Blender 一像素不差。
- 6 国：狮子国、大卫国、拉莫娜国、诺德岚、瑟林共和国、维岚邦联；38 省，全部虚构命名，每国首都有一座央行建筑。
- 地名标签是 DOM 层逐帧投影，**不要用 drei `<Html>`**（每个标签一个 React 根，热更新时报 unmount 错）。
- 主菜单背景是同一张地图的装饰态（无标签、无交互；竖屏时对准狮子国）。

### 3.2 游戏流程

`GameRoot.tsx` 一个 `screen` 状态机：主菜单（只有「开始游戏」）→ 首次进入先 `ProfileScreen` 建档 → `ModeSelect` 二选一：**沙盒**（`SandboxScreen`）/ **剧情**（`StoryGateway`）。之后再点「开始游戏」直接到选择页。

### 3.2b 沙盒（G1）★

- **一周一跳，十年任期**（520 周）。1× 每周 1 秒、2× 0.5 秒、3× 0.2 秒；事件弹出或任期结束时自动暂停。
- **模型**（`sim.ts` 顶部注释）：政策立场 = 实际利率 − r* − QE + 准备金 + 风险溢价，滞后约 5 个月生效；产出缺口、通胀、预期（按「市场信誉」锚定）、失业（奥肯）、汇率（实际利差 + 风险）、信贷/泡沫/银行健康、财政与国债。六国互相通过世界利率、世界需求和汇率耦合；另外五国由 AI 按泰勒规则每六周开一次会。
- **玩家工具**：利率 ±0.25/0.5、准备金率、QE/QT（需国策）、前瞻指引（需国策，违约重罚）、外汇干预、资本管制（30 公信力）、信贷上限（需国策）；最后贷款人通过「挤兑」事件抉择。
- **两种资源**：市场信誉（0–100，决定预期锚定）和公信力（政治资本点数，每周累积，买国策和部分操作）。另有民意支持、政府施压；民意 <20 且施压 >80 连续 10 周 → 被撤职；通胀 >40% → 恶性通胀下台。
- **事件**：每周最多一个，按 `events/index.ts` 的 ORDER 先急后缓。**可玩文本（标题/正文/选项）一律虚构命名**，真实人物、国家、货币只能写在 `history` 字段里（弹窗底部的「史实档案」）；测试会扫一张真实名词表。黑天鹅每个每周 0.03%，五个合计平均每局不到一次（测试钉死）。国别事件用 `only` 限定国家。
- **对外**：「国际互换额度」国策后可每年动用一次互换（+5% GDP 储备）；「国际央行合作」后可提议联合降息/加息，AI 央行只在本国泰勒规则同方向时加入。
- **评分**：每周福利损失 Σ(π−π*)² + ½(u−u*)²，平均后加危机次数惩罚 → S/A/B/C/D。
- **平衡由测试钉住**（`sandbox.test.ts`）：同种子可重放；6 国「称职行长」（泰勒规则 + 常理选项）都比「放手不管」好，且都能干满任期；维岚比拉莫娜容易、维岚称职打法拿 S；AI 央行不失控。**改参数后先跑这个文件。**

### 3.3 剧情战：十四关阶梯

`difficulty.ts` 里的 `LADDER` 是**唯一的顺序真相**。十个难度档（简单/普通/进阶/难/高难/极难/噩梦/地狱/深渊/炼狱），**难度允许并列**，所以顺序是自己的字段，难度只是贴在上面的标签。

| # | 关卡（游戏内名） | 取材 | 教什么 | 难度 |
|---|---|---|---|---|
| 1 | 银行家的恐慌 | 1907 美国 | 挤兑打的是流动性，而且必须今天救 | 简单 |
| 2 | 远洋公司泡沫 | 1720 南海 | 借钱给买家买你自己的东西 | 普通 |
| 3 | 铁路狂热 | 1846 英国 | 供给自己会把行情压垮 | 进阶 |
| 4 | 拉莫娜币保卫战 | 1997 泰铢 | 账面储备 ≠ 可用储备 | 进阶（并列） |
| 5 | 北线恐慌 | 1873 美国 | 连锁违约里，救谁就是选链条断在哪 | 难 |
| 6 | 大崩盘 | 1929 华尔街 | 保证金要提在涨的路上 | 难（并列） |
| 7 | 黑色星期一 | 1987 | 流动性是一句承诺 | 高难 |
| 8 | 大卫币黑色星期三 | 1992 英镑 | 利率天花板是政治的 | 高难（并列） |
| 9 | 十一月的名单 | 1890 巴林 | 最后贷款人的一半是名单 | 高难（并列） |
| 10 | 恒远资本的四十五天 | 1998 LTCM | 分散化是假设不是属性 | 极难 |
| 11 | 联盟债务危机 | 2010–12 欧债 | 承诺的效力来自它背后的东西 | 噩梦 |
| 12 | 狮子币保卫战 | 1998 港元 | 只守一条腿等于送钱 | 地狱 |
| 13 | 第三家投行的周末 | 2008 雷曼 | 回购抵押品是整个体系的地基 | 深渊 |
| 14 | 漫长的冬天 | 1929–33 大萧条 | 有些防线是拿来断的 | 炼狱 |

注意 LADDER 的顺序是 `… → hkd → lehman → depression`，雷曼在大萧条**之前**；第 3/5/9 关（铁路狂热、北线恐慌、巴林名单）是第四轮加入的三个维多利亚时代关卡。改顺序只改 `LADDER` 一处，别在别处派生顺序。

**通关定义：任一座位赢了就算通关。** **称号**：每通关两关一个，共五个（入门 / 新手 / 熟练 / 交易员 / 天才交易员）——十四关意味着最后一个称号在第十关拿到，其后不再给称号，这是有意的（`difficulty.ts` 注释原文如此）。

另外有**一个至高称号**：`Scenario.crown`，只有「漫长的冬天」有，只有三小时篇幅通关才给（「最后贷款人」）。有测试钉死「全作只能有一个 crown」。

### 3.3b 虚构命名 ★（改文案前必读）

**游戏里玩到的一切都是虚构的；真实的年份、数字、地名、人名只出现在「史实档案」那一块。**

- 可玩侧（关卡名、前情提要、剧本波、电话、目标、词汇表、座位名、结语）：只能出现狮子国 / 大卫国 / 拉莫娜国 / 北风基金这类虚构名词。
- 史实侧（`historyZh/En`、`historyDeepZh/En`）：必须出现真实名词——泰铢、港元、英镑、索罗斯、量子基金、美联储、罗斯福、摩根、大萧条……这是这个游戏唯一负责教历史的地方。

`story.test.ts` 里有两个测试把这条钉死了：一个扫可玩侧的禁用词表，一个检查每一关的史实块里该出现的名字都出现了。**加新文案之前先看那张 `REAL_NOUNS` 表。**

### 3.4 剧情战：一套引擎，每关一套词汇

十四关共用 `engine.ts` 的同一套算术：压力 / 弹药 / 杠杆 / 市场 / 自己的账面。区别在 **`Lexicon`**——每一关自己声明这些东西叫什么。1929 的"杠杆"是保证金比例，1720 的是"给买家放贷的比例"，2012 的是"财政紧缩力度"。

**HUD 上的每一个标签都来自 `Lexicon`。** 如果你新加一个显示项，不要写死"利率"或"股指"，去 `Lexicon` 加一个字段。测试会检查每个词条非空。

四条贯穿所有关卡的规则：

1. **杠杆是双刃的。** 它守住防线、同时按天拖垮市场。十四关都成立（大萧条关最极端：守平价的那根杠杆就是关银行的那根）。
2. **杠杆只挡「新增」压力。** 对已经建好的仓位无效——除非这一关 `rateRatchets`（只有 1929：早提的保证金把杠杆永久抽走了，所以防御按**历史最高值**算，痛苦按**当前值**算。这就是 1929 的正解：早提、崩盘时松）。
3. **弹药直接买回已有压力**，但 `reserveEfficiency` 每关不同（1907 的私人救助池 1.5，1997 的央行对着单向远期市场 0.55）。
4. **压力清零会浪费弹药。** 所以 1907 要「今天就花」，2008 要「先攒着」——两关的正解是相反的，这是有意的。

### 3.5 不是滑块的牌

- **公开承诺（`allowPledge`）**：一分钱不花，把当前压力 ×0.55。但**只有在弹药还剩 32% 以上、可信度 ≥0.5 时才有人信**；空着口袋说，压力 +0.18、可信度 −0.25。一局一次。这是 1987 和 2012 的正解。
- **休市（`allowHalt`）**：跳过这个时段的抛压——但那一波**被推到下一步**（`due.day = run.day + 1`），还叠一个 `carryOver` 倍率，可信度 −0.2。最多两次。1987 关里休市会**输**，这是史实。
- **可信度**：掉下去之后每一波都乘 `1 + (1 - credibility) * 0.35`。电话里说错话也会掉。
- **棘轮（`rateRatchets`）**：只有 1929。防御按历史最高值算，痛苦按当前值算——早提保证金、崩盘时松，是这一关的正解。
- **`endsOnBreak: false`**：只有大萧条关。防线断掉不结束，反而给市场一次 `breakRelief` 的反弹——因为 1933 年脱离金本位是复苏的起点。配套的目标类型是 `revive`（只看最后的市场指数，不看防线）。
- **`buyPotency` / `pledgeRelief`**：买市场的效力、承诺对市场的提振，每关不同。大萧条关买得最钝（0.45）、承诺最强（0.22），因为公开市场操作确实慢，而银行假日确实管用。

### 3.6 四种篇幅：同一场危机，四个分辨率

`lengths.ts`。**半小时（速写）= 一天一个决定 = 所有平衡的基准**（`createRun` 的默认值就是它，别改），且不可暂停。另外三档（全景/档案/全录）把一天切成若干时段、必要时把日历往前拉长，目标步数固定在 30 / 46 / 95，且**可以暂停**（暂停时只剩决策界面，地图行情时钟隐藏，排队指令恢复后执行）。

**关键不变量：同一套打法，在四种篇幅下必须得到同一个结论。** 引擎靠四个量维持它：`tempo`（每步累积项的缩放）、`drift`（安静步的压力预算）、`waveScale`（深篇幅打开更多剧本波时按比例缩小正向波，**负向波保持原值**）、`escNorm`（见 §3.6b）。

⚠ **测试里的策略必须是「篇幅中立」的**：写 `spend: usableReserves(s) * 0.11 * r.tempo`，不要写 `spend: r.reserves * 0.25`。

**成就**：一小时→亲历者，一个半小时→档案守夜人，三小时→历史的第一稿。**半小时没有成就**（用户明确要求）。三小时版本在选关页和前情提要里都有红字警告说明它极端困难——这不是装饰，是承诺：它确实要求全程盯盘、接电话、主动打电话。

### 3.6b 难度随时间上升 ★

`escalationAt()`。同一场危机的**总重量不变**，但重新分配：开局的时段减轻，收尾的时段加重，末段压力是开局的 2.5–3.7 倍（大萧条关最陡，`escalation: 2.6`）。

实现要点：`planEscNorm` 解出一个归一化常数，使「加权之后的总和 == 加权之前的总和」。**所以改 `escalation` 不会改变一关的总难度，只会改变它什么时候变难。** 有测试钉死这两条（单调上升、总量守恒）。

### 3.6c 史实扰动 ★

每一局都是**同一场危机的另一个讲法**：

- 每一个有据可查的大事件**一定会发生**（测试钉死），但它的分量有 ±16% 的抖动，落点可能提前或推后一个交易日。
- 另外从 `crises/seats.ts` 的 `DIVERGENCES` 池里抽两条小事件塞进这一局——报纸提前一天、邻国这次接了电话、一个数字迟了两小时。都不大，但足以改写结局。
- 这些全部由 `run.seed` 决定。**从选关页进去是新种子**（每次都不一样），**复盘页的「再打一次」传回同一个种子**（同一段历史，可以复盘研究）。
- 结果：英镑关的空方大约六成多的局面会赢——史实结局仍然是常见结局，但不再是唯一结局。测试用 `robust()` 跑十二个种子取胜率，**不要再写只钉一个种子的平衡测试**。

### 3.7 电话

`calls.ts` + `components/story/PhoneCall.tsx`。

- **接通延时 620–1400ms**，从 run 自己的种子流里抽——所以重播一局，电话响的时长也一样。测试钉死了「>0.5s 且 <1.5s」。
- **来电必须处理完才能下达命令**（`commitDay` 会直接 return）。这不是骚扰：每一通都是那把椅子上的人当天真的要回答的问题。
- **不接也是一种回答**：压力 +0.04、可信度 −0.05，并写进战报。
- 去电是玩家主动打的，从解锁那一步起一直可打（不会因为过了一步就消失）。
- `minDetail` 决定哪些电话属于哪个篇幅；`seats` 决定只对哪几把椅子响。

### 3.8 不是玩家坐的位置，由引擎代打

`autoDefence` 现在是**数据**（`Scenario.autoDefence`），不是 switch。日期按参考日历写，会像剧本波一样缩放到当前篇幅。没有它，港元关没人守，空方随便赢，结局跟历史反过来。

### 3.9 荣誉系统

`src/lib/game/honor.ts`。只读、只描述，不发放任何东西。记录登录天数 / 连续天数 / 在线时长（只在标签页可见时累加）和剧情战的胜负（`recordBout`）。原来的资产负债表与荣誉室面板随练习场一起删除；旧存档里 `kind: "match"` 的对局记录仍能读，不再产生新的。

---

## 4. 界面现状（第六轮）

**主题：Victoria 3 式亮色羊皮纸。** `src/styles.css` 的 `@theme` 段是当前令牌真相：纸色 `--color-paper: #eadfc6`、墨 `--color-ink: #2c2214`、黄铜 `--color-brass: #8f6d1f`、火漆 `--color-seal: #9e2f25`、涨绿 `--color-up: #3e7c4f` / 跌红 `--color-down: #b2382b`；字体是 Playfair Display + Noto Serif SC 的衬线组合，圆角只有 2–6px。其下有一套 `vic-*` 原语类（`vic-panel`、`vic-frame`、`vic-kicker`、`vic-btn-brass`、`vic-btn-seal`、`vic-btn-ghost`、`vic-masthead`、`vic-divider`、`vic-wax` 等），新 UI 优先复用它们。

⚠ **`vic-*` 和 `.world-map` 这类 CSS 是 unlayered 的，会压过 Tailwind 的分层工具类**：`vic-btn-ghost` 自带 padding、`vic-wax` 自带 44px 宽高、`background: transparent`。要覆盖就用 inline `style`，别指望 `p-0` / `size-7` / `bg-*` 生效。

- **主菜单** `MapHome.tsx`：全屏世界地图 + 刊头 + 一个「开始游戏」；右上角只有「收藏与荣誉室」和中英切换。
- **建档页** `ProfileScreen.tsx`：登录方式、男/女油画肖像、显示名、游戏 ID。
- **肖像** `BankerPortrait.tsx`：大都会艺术博物馆 Open Access（CC0 公有领域）的两幅 1805 年油画——男：Henry Raeburn《William Robertson, Lord Robertson》（Met DP169641）；女：John Hoppner《Lady Hester King》（Met DP167134）。裁成半身装进镀金椭圆框，卡片上只署画家与年份，**游戏里不写画中人真名**。用户先后否掉了 3D 建模人物（恐怖谷）和卡通矢量画，明确要写实油画。
- 作战室、选关、前情提要、复盘、电话均已羊皮纸化；剧情内部壳是 `cabinet-shell`。剧情作战室仍用旧的 `StoryAtlas`（和三行业经济绑定），G1 时再考虑统一。

---

## 5. 桌面打包

`desktop/` 是一套自研的 Windows 桌面发行链：**WinForms + WebView2 外壳 + 独立 Vite 构建 + Inno Setup**。

- **外壳**：`desktop/Program.cs`，由系统自带的 `csc.exe`（.NET Framework 4.x）编译成 `LeoStreetLegend.exe`（winexe / x64 / 带 `game.ico` 与 `app.manifest`），运行时嵌 WebView2 加载本地页面；支持 `--check-runtime` 供安装包探测运行时。
- **独立 Web 构建**：`npm run build:desktop:web` 走 `desktop/vite.config.mjs`（`publicDir:false`，所以资源必须经 import 进 bundle，不能放 `public/`）。原来的排行榜本地桩 `desktop/leaderboard.ts` 已随排行榜删除。
- **一键链**：`desktop/build.ps1`，依次执行 ① 清理 `desktop/dist/app` 暂存目录（带路径校验）→ ② `build:desktop:web` → ③ `node desktop/prepare.mjs` 备料 → ④ `csc` 编译外壳 → ⑤ `desktop/tools/inno/ISCC.exe desktop/setup.iss` 打安装包。
- **版本号**：在 `desktop/setup.iss` 第 1 行 `#define AppVersion "0.1.0"`，改版本只改这一行，安装包文件名自动带上。
- **产物**：`release/狮子街传说-试玩版-<版本>-安装包.exe`，另有人写的 `release/RELEASE-0.1.0.md` 发行说明。
- **`desktop/试玩说明.txt`** 通过 Inno 的 `InfoAfterFile` 在安装结束时展示，改功能时记得同步它。
- 安装包负责探测并在需要时联网安装 WebView2 运行时、检查 .NET Framework 4.8+。`desktop/tools/` 里同时有 inno 与 nsis 残留，经用户决定保留。

---

## 6. 历次会话做了什么

### 第一、二轮（远古）

删卡通小镇地图换点选菜单、新建 5v5 对战、剧情战 3 关 → 10 关、四种篇幅 + 三个成就、电话系统、荣誉系统、引擎泛化成五种危机形状。

### 第三轮

难度随时间上升（escalation 总量守恒）、史实扰动 + 种子复盘、虚构命名切割、新增炼狱关「漫长的冬天」与全作唯一至高称号「最后贷款人」。

### 第四轮：维多利亚三关 + 试玩版

1. 阶梯 11 → **14 关**：新增 1846 铁路狂热、1873 北线恐慌、1890 巴林名单三个维多利亚时代关卡（LADDER 顺序见 §3.3）。
2. 拆除旧的零基础教学演练（`learning.ts` 及配套组件已不存在），保留第一关新手提示与可展开的大白话说明。
3. 危机内阁（cabinet）、实时经营（realtime）、三行业经济（economy）、民生请愿（civic）、时间线与胜利条件映射（mission）、收藏与外观（engagement）陆续进 `src/lib/story/`。
4. 结算页改为逐项显示最终值 / 要求值 / 达标状态；时间线明确标「通关条件」，民生评级标「额外成果」（民生成果不替代金融通关条件）。
5. 详细交付记录存档在 `STORY_LEARNING_STRATEGY_PLAYTEST.md`（其中的测试数、关卡数描述的是当时版本）。

### 第五轮：Vic3 羊皮纸 + 地图主界面 + 大清理（本轮定稿）

1. **整套主题换成 Victoria 3 式亮色羊皮纸**：`@theme` 令牌全部换值，新建 `vic-*` 原语类体系；作战室、选关、前情提要、复盘、电话全部重做。
2. **地图即主界面**：`MapHome.tsx` 取代旧入口，`StoryLaunch.tsx` 删除；`TitleScreen.tsx` 退为对战/练习的建档页。
3. **大清理**（已删除，别再当它们存在）：
   - `assets/`（约 64MB 旧地图素材）
   - `src/lib/app-data/`（`preview-host-bridge.ts` 已把 `grok:connector-token-ready` 常量内联到自己文件里）
   - `src/lib/multiplayer/`（客户端权威的 p2p 脚手架，从未可用于排位）
   - `public/demo-account.html`（演示存档页）
   - `artifacts/imagine_images/`、`artifacts/` 下两个 before-20260921 回滚备份
   - STORY_REALTIME / STORY_ECONOMY / STORY_CABINET 三篇旧 PLAYTEST 文档
   - `desktop/dependency-graph.json` 与 desktop 日志（构建会再生成）
   - **保留**（用户决定）：根目录 `{}` 文件、`desktop/tools` 的 NSIS 残留、`.vercel/`。
4. 测试达到 **280 单元 + 198 脚手架**，tsc、build 全绿。

### 第六轮：转向「央行行长」大战略（2026-10-05）

用户批准的方向（G1–G4）：玩家**只扮演央行行长**，在世界地图上像 Victoria 3 / 钢铁雄心那样调利率、点国策；世界地图与人物重做。

1. **G3 世界地图**：用便携版 Blender 程序化生成 6 国 38 省的架空大陆（`blender/world_map.py`），导出带贴图的 glb；`WorldMap` 组件可缩放拖动、悬停高亮、点击看省份；主菜单背景换成它。
2. **G4 人物**：3D 手办（恐怖谷，否决）→ 卡通 SVG（否决）→ **公有领域 19 世纪油画**（定稿，见 §4）。旧的 `Figure3D` / `FigureMesh` / `HeroSprite` 已删。
3. **流程重做 + 大删除**（用户明确要求「彻底删除 5v5、5v5v5」「不要散户」）：
   - 删除对战模式全部代码（`src/lib/match`、`src/components/match`）——**G2「多人对战」随之取消**，除非用户重新提出；
   - 删除旧练习场（交易所/银行/地产/券商/风投/外汇/法庭/商店/排行榜/荣誉室等面板，`sim`/`store`/`economy`/`catalog` 等引擎），以及散户/券商/行长三种身份；
   - i18n 字典删掉 883 条只给这些模式用的文案；
   - **保留** `migrations/0002_leaderboard.sql`（线上库可能已有这张表，且脚手架测试检查它存在）。
4. 新流程：主菜单「开始游戏」→ 建档 → 沙盒 / 剧情（见 §3.2）。

**下一步：G1 沙盒的央行玩法**（选国家、利率/准备金/QE、最后贷款人、汇率干预、国策树与「公信力」，AI 政府与外国央行）。

---

## 7. 已修复的真 bug（避免回归）

| Bug | 症状 |
|---|---|
| 做空保证金跨币种漏损 | 开空按本币扣、平仓退 Leo，外币钱包永远收不回 |
| 卖出期权保证金按当前价退还 | 股价翻倍就白拿一倍保证金，可刷钱 |
| BS 定价不自洽 | d1 分子用未夹紧的 sigma |
| 三角套利罚款时交易照成交却报错 | UI 说失败但钱已经换了 |
| 央行滑块 onChange 直接触发 | 拖一次滑块打几十次政策冲击 |
| 两处 `Math.random()` | 破坏 seed 确定性 |
| 组合面板外国股不换汇 | 盈亏差 75 倍 |
| `sort` 稳定导致 A 队永远赢平局 | 天梯上的系统性偏袒 |
| 玩家账面按**累计**跌幅每天重复计一次 | 同一笔亏损反复扣 |
| `with-app-env.mjs` 未加引号拼接 | 任何带空格的路径都炸 |
| `npm test` 引号问题 | Windows 上**静默跳过**全部脚手架测试 |
| 深篇幅偷偷更难 | `drift` 被 `Math.max(0, …)` 夹住，多出来的剧本波没人抵消 |
| 休市把抛压**删掉**而不是推迟 | 1987 关里停两天就白嫖通关 |
| 选关页面遮住关卡名却在下一关的提示里念出来 | 「??????」下面写着「先通关上一场「南海泡沫」」 |
| 结算只给结论不给依据 | 民生目标全绿、复苏三星却失败，玩家无法知道差在哪（修复：结算逐项显示最终值/要求值/达标状态，战报存判定明细） |

---

## 8. 还没做的（开放项）

1. **G1 第二版已完成**（国策树、40 个事件、对外合作、史实对照）。可继续：存档多槽位、事件之间的连锁（比如泡沫破裂后更可能出现「投行周末」已经有，但可以更多）、AI 央行之间的危机传染、更细的省级经济。
2. **真联网没做**，对战已删除。将来要做多人，应在世界地图上重新设计（每人一国央行），服务端权威，别复活旧代码。
3. **支付是本地占位**，随商店一起删了；如果以后加回付费内容，纯前端做不了安全支付。
4. **剧情战的组队模式目前只是选项**，五座位共守一边的具体交互还没实现（个人模式完整可玩）。
5. **三小时篇幅目前靠时段数堆出来**（95 个决定点）。要再往上加，应该加**新的电话和新的剧本波**，不是更多时段。
6. **9 国 9 币**：建议**不要**朝那个方向设计——9 国 = 36 个货币对，bug 是平方级增长。可落地的做法是"一个国家 = 一个机制的内容包"。
7. `StoryAtlas` 的 `decorative` / `zoomable` 两个参数现在没人用了（原来给主菜单和练习场），G1 统一地图时可一并清理。

---

## 9. 容易踩的坑

- **别在 `src/lib/**` 里用 `@/` 别名**（story / world / profile / game 都一样），会让 `node --test` 跑不起来。相对路径 + `.ts` 后缀。
- **改剧情数值前先跑 `story.test.ts`**，平衡是调出来的不是拍出来的。尤其是 §3.6 那条篇幅不变量。
- **`createRun` 的默认篇幅必须是 `sprint`。** 所有既有平衡测试都建立在"一天一个决定"上。
- **文案和机制必须一致**（用户明确要求过）。写"你还得让股指不被砸穿"就必须真的检查股指——这条踩过一次，修的办法是给 `Objective` 加了 `equityFloor`。现在还多了 `contain`（同时检查防线、市场和压力）。
- **`i18n.ts` 里的文案是纯文本渲染**，写 `**加粗**` 会显示成字面星号。中文用「」。
- 检查缺失 i18n key 的命令（Git Bash 下可跑）：
  ```bash
  grep -rhoE '\bt\("[a-zA-Z0-9_.-]+"' src/components src/lib | sed -E 's/^t\("//; s/"$//' | sort -u > /tmp/u.txt
  grep -oE '^  "[a-zA-Z0-9_.-]+": \{' src/lib/i18n.ts | sed -E 's/^  "//; s/": \{//' | sort -u > /tmp/h.txt
  comm -23 /tmp/u.txt /tmp/h.txt
  ```
  正常输出应为空。
- **史实字段是事实，不是文案。** `historyZh` 必须以「史实：」开头（有测试），里面的日期和数字要经得起查。虚构的部分（北风基金、拉莫娜国）和史实部分在 UI 上是分开呈现的，别把两者混在同一段里。
- **加新关卡时**：`LADDER`、`crises/` 里的数据文件、`scenarios.ts` 的 `ALL` 三处都要改，难度必须非递减（有测试）。选关页的「共几场」是动态的，不用改文案。
- **QA 环境**：本机是 Windows，`scripts/browser-smoke.mjs`（硬编码 `/workspace`）和 `scripts/preview.mjs`（信号语义）在本机不可用/不可靠。QA = `npm run dev` + 浏览器实测；启动脚本用 `startup-windows.ps1`（`startup.sh` 是留给 Linux 平台的，别删）。
- **Windows 上 `npm test` 的引号**：`test:scaffold` 里的 glob 引号曾经让 Windows 静默跳过全部脚手架测试，改 `package.json` scripts 时在本机实跑一遍再收工。

---

## 10. 一个产品判断，供参考

会话早期用户问过"这个游戏吸引人吗"，当时的回答是不吸引人，核心问题是**前 30 分钟玩家在交易纯噪声**——价格是 GBM，玩家没有信息优势。

第一次改造让信息来源变成队友（对战）和真实历史（剧情战）。第六轮用户判断对战"太无聊"，转向**央行行长大战略**：玩家不再是在噪声里下注的交易员，而是制造宏观条件的人——利率、承诺、救不救谁——这正是十四关剧情战一直在教的东西。沙盒要做的，是把剧情战里一关一个的机制放到一张活的世界地图上同时运转。

如果后续要做取舍，**优先保住两条**：剧情战「每关教一个真实机制」，以及沙盒里「玩家是制造宏观条件的人」。
