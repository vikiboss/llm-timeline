---
name: llm-timeline-model-sync
description: Fetch and update the LLM release timeline dataset (src/data/models.json) in this project. Use when adding new model releases, refreshing release dates, extending coverage to earlier or missing vendors, or when asked to "update the timeline", "add the latest models", or fill gaps in company/mainline coverage.
---

# LLM Timeline 模型同步

核心原则：**机器给候选，人去判断**——API 只用于确定「日期」和「是否有这个模型」，
重要级别、输入模态、中文备注由人根据事实判断，不靠猜。

## 数据源

| 来源 | 用途 | 可靠性 |
|---|---|---|
| `https://models.dev/api.json` | 全量候选 + `release_date`（100% 填充） | 高（日期权威） |
| 同上，条目里的 `canonical_model_id`（如 `alibaba/qwen4-max`） | 判定模型归属哪家 | 最高（归属权威） |
| 厂商官方 blog / 模型卡 | 确认「首发日」而非「收录日」 | 最高 |

约 330 provider / 9,900 模型。**不要**爬官网，**不要**用搜索摘要当日期来源。

> 全流程只用**一个**快照 `/tmp/models-dev.json`，所有脚本从这里读，别再复制第二份。
> 日期窗口一律从数据集现读 `lastUpdated`，**脚本里不要写死上界**（会随同步过期）。

## 步骤 1：拉取快照

```bash
cd <项目根目录>
curl -s --noproxy '*' --max-time 30 -o /tmp/models-dev.json https://models.dev/api.json
```

`--noproxy '*'` **必须加**（本机有 HTTP 代理变量，不加会挂住）。失败重试 2 次即放弃。

## 步骤 2：抽取候选（**先按 `canonical_model_id` 归并，再排除**）

关键：**模型身份 = `canonical_model_id`**，不是 provider、也不是 name。
因为第一方 provider 会**漏收**自家新模型，模型只存在于转售平台。
（实例：腾讯 `tencent-tokenhub` 里没有 `hy4-flash`，只有 12 家转售商挂着它。）
若先按 provider 排除转售商，会把模型本体一起误杀。

```bash
node -e '
const d=require("/tmp/models-dev.json");
const last=require("./src/data/models.json").lastUpdated;
const SINCE=new Date(Date.parse(last)-7*864e5).toISOString().slice(0,10); // 上次同步前一周
const g=new Map();
for(const pid of Object.keys(d)) for(const m of Object.values(d[pid].models||{})){
  const dt=m.release_date||"";
  if(dt<SINCE || dt>last || dt.startsWith("1970")) continue;
  const k=(m.canonical_model_id||m.id||m.name).toLowerCase();
  (g.get(k)??g.set(k,[]).get(k)).push({dt,name:m.name,pid});
}
[...g.entries()].map(([k,v])=>[v.map(x=>x.dt).sort()[0], v[0].name, v.length, k]) // 多来源取最早日期
  .sort((a,b)=>a[0].localeCompare(b[0]))
  .forEach(r=>console.log(r[0],"|",r[1],"|",r[2]+"家","|",r[3]));
'
```

按**模型身份**排除，而不是按 provider：

1. 无 `canonical_model_id` 且仅转售商收录 → 无归属，丢弃
2. 变体别名：`* Uncensored`、`* Abliterated`、`* (free)`、`*-latest`、`*-preview`、`(US)`/`(EU)` 后缀
3. 补丁号：`Mistral Large 4.0.8` 与 `4` 是同一模型
4. 剩下的用 `canonical_model_id` 前缀定归属，再判断价值

> 转售商数量是**信号不是噪音**：一个模型被 10+ 家挂出、本库却没有 → 大概率是真缺口。
> 只被 1~2 家、名字像内部代号（`Ousia 1`、`Flint`、`Sparrow Auto`）→ 多为平台自建，跳过。

经验：半个月约 100~120 条原始候选 → 按 canonical 归并后约 30~40 个真模型 → 真缺口通常 **1~3 个**；
没有缺口是正常结果，别硬凑。

**上界要留意**：快照可能比数据集 `lastUpdated` 更新，出现其后的条目是**正常的**
（实例：GPT 6.2 Astra/Sol 2026-11-17、Gemini 4 Neon 2026-11-18）。这些是真新发布，收进来并把
`lastUpdated` 推进到最新条目日期即可，别当脏数据丢掉。

## 步骤 3：人工判断（关键，不能省）

- **`level`**：`flagship`（首页大图级主力）/ `major`（重要迭代）/ `minor`（`-mini/-flash/-lite` 等变体）/ `spinoff`（衍生 OSS 微调）。同月多个只有一个 flagship，其余降级。
- **`inputs`**：只能用 `text`/`image`/`audio`/`video`/`pdf`，**不要新增值**（否则 UI 空图标）。视频写 `video`，不要 `file`/`document`。新增模态需先改 `src/data/modalities.json` + 补 SVG。
- **`note`**：只写有明确事实的（参数量、上下文、首发特性），宁可留空不要编。
- **`category`**：默认 `chat`，另有 `image`/`video`/`audio`/`speech`/`code`。
- **`icon`**：复用同公司既有值，**不要拿 company id 想当然**——`node -e 'console.log([...new Set(require("./src/data/models.json").models.filter(m=>m.company==="tencent").map(m=>m.icon))]'` 输出 `['hunyuan']`，不是 `tencent`。缺 icon 会渲染空白。
- **`id`**：kebab-case 且全局唯一，沿用项目风格（`qwen-4-max` 而非 `qwen4-max`）。

日期用 `models.dev` 的 `release_date`；若官方首发日更早（收录延迟）以官方为准，并注明。

## 步骤 4：写入并排序

```bash
node -e '
const fs=require("fs");
const p="src/data/models.json", d=JSON.parse(fs.readFileSync(p));
const add=[ /* {id,name,company,releaseDate,inputs,category,level,icon,note} */ ];
const has=new Set(d.models.map(m=>m.id));
const fresh=add.filter(m=>!has.has(m.id));
d.models.push(...fresh);
d.models.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));
d.lastUpdated=fresh.reduce((a,m)=>m.releaseDate>a?m.releaseDate:a,d.lastUpdated);
fs.writeFileSync(p, JSON.stringify(d,null,2)+"\n");
console.log("added",fresh.length,"| total",d.models.length,"| lastUpdated",d.lastUpdated);
'
```

- JSON 里字段名是 **`releaseDate`**（`YYYY-MM-DD` 字符串），不是 API 的 `release_date`。
- 保持 `releaseDate` 倒序，diff 才只有新增块。除 `lastUpdated` 外不要动元数据。
- `lastUpdated` 要随新增条目推进，否则下次同步的窗口会漏掉它们。
- 收尾 `git diff --stat` 自检：应只有 `lastUpdated` 一行 + 新增块；出现其它改动说明误改了旧数据。

## 步骤 4.5：补充价格（可选但推荐）

`models.dev` 的 `cost` 单位是 **USD / 百万 token**，直接搬运，**不要估算或推算**；取不到就留空。

```bash
node -e '
const d=require("/tmp/models-dev.json"), mine=require("./src/data/models.json").models;
const norm=s=>s.toLowerCase().replace(/[\s._-]+/g,"").replace(/\(.*?\)/g,"");
const OFF=["openai","anthropic","google","xai","deepseek","moonshotai","zhipuai","zai","xiaomi",
  "alibaba","minimax","meta","stepfun","mistral","nvidia","baidu","tencent-tokenhub"];  // 第一方优先
const bucket=new Map();
for(const pid of Object.keys(d)) for(const m of Object.values(d[pid].models||{})){
  const c=m.cost; if(!c||typeof c.input!=="number"||typeof c.output!=="number") continue;
  if(c.input<=0&&c.output<=0) continue;      // 0 价 = 免费/自建，非真实定价
  const k=norm(m.name||""); (bucket.get(k)??bucket.set(k,[]).get(k)).push({pid,c});
}
let hit=0;
for(const m of mine){
  if(m.cost) continue;                       // 已有定价不覆盖
  const cands=bucket.get(norm(m.name)); if(!cands) continue;
  const off=cands.filter(x=>OFF.includes(x.pid));
  const pick=(off.length?off:cands).sort((a,b)=>a.c.input-b.c.input)[0];
  m.cost={input:pick.c.input,output:pick.c.output};
  if(typeof pick.c.cache_read==="number") m.cost.cacheRead=pick.c.cache_read;
  hit++;
}
console.log("cost covered",hit,"/",mine.filter(m=>m.cost).length,"of",mine.length);
'
```

- 写进 `cost` 对象 `{input, output, cacheRead?}`，类型见 `src/types.ts`。
- 覆盖率约 **70%**，缺的多是按张/秒计价的图像视频音频与极新模型，属正常。
- **第一方没定价就留空**。转售商价格常差 2~3 倍（实例：`hy4-flash` 在 openrouter 报 0.035/0.1405，
  crossmodel 报 0.08/0.32），即使比例看起来一致也**不能按比例倒推**官方价——那是估算。留空优于填一个「看起来合理」的数字。
- **倍率在 UI 端算**（`src/lib/price.ts`），不要写死进 JSON：混合成本 = `input × 3 + output`，锚点 `GPT 5.2` = 1×，七档 极廉→昂贵。改锚点需同步 `ANCHOR_NAME`。

## 步骤 5：覆盖度审计

**5a. 时间跨度**——每家的起始日期要与真实首发相符（老厂不应从 2026 年才开始）：

```bash
node -e '
const m=require("./src/data/models.json").models, by={};
for(const x of m)(by[x.company]??=[]).push(x);
for(const [c,l] of Object.entries(by)){
  l.sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate));
  console.log(c.padEnd(12), String(l.length).padStart(3), l[0].releaseDate, "->", l.at(-1).releaseDate);
}'
```

偏晚的按步骤 3 补历史锚点（如 GPT-2 2019、Claude 1 2023-03）。

**5b. 逐家比对**——以第一方 provider 为基准；但**第一方会漏收自家模型**，
所以 5b 报「零新增」不等于真没有，必须配 5c 交叉验证。

```bash
node -e '
const d=require("/tmp/models-dev.json");
const m=require("./src/data/models.json").models;
const norm=s=>s.toLowerCase().replace(/[\s._-]+/g,"").replace(/\(.*?\)/g,"");
const mine=new Set(m.map(x=>norm(x.name)));
const t0=new Date(Date.now()-40*86400000).toISOString().slice(0,10);  // 近 40 天
// 值必须是数组：写成字符串会被 for..of 拆成单个字符，静默漏检
const FIRST={openai:["openai"],anthropic:["anthropic"],google:["google"],xai:["xai"],
  deepseek:["deepseek"],moonshot:["moonshotai"],zhipu:["zhipuai","zai"],xiaomi:["xiaomi"],
  alibaba:["alibaba"],minimax:["minimax"],meta:["meta"],stepfun:["stepfun"],
  mistral:["mistral"],nvidia:["nvidia"],tencent:["tencent-tokenhub"]};
for(const [c,pids] of Object.entries(FIRST)){
  const names=new Map();
  for(const pid of pids){ const p=d[pid]; if(!p){console.log("!! 无此 provider:",pid);continue;}
    for(const mod of Object.values(p.models||{})){
      const dt=mod.release_date||""; if(dt<t0||dt.startsWith("1970")) continue;
      names.set(norm(mod.name||""),[dt,mod.name]); }}
  const miss=[...names.entries()].filter(([k])=>!mine.has(k)).map(v=>v[1]);
  console.log(c.padEnd(11),"官方",String(names.size).padStart(3),"未收录",String(miss.length).padStart(3),
    miss.map(x=>x[0]+" "+x[1]).join(", "));
}'
```

- 转售平台会把同一模型重复几十遍，还会**张冠李戴**（实例：`Muse Glimmer` 被挂到 Mistral，实为 Meta）。
- provider id 不直观：`moonshotai` / `zhipuai`+`zai` / `tencent-tokenhub`。`!! 无此 provider` 告警必须处理，写错 id 会让该厂商看起来「零新增」。
- 归属存疑时看 `canonical_model_id` 一锤定音。
- `baidu` / `inclusionai` / `liquid` 等**没有**第一方 provider，此审计无效，只能人工核对官方公告。

**5c. 反向交叉验证（必做，专门堵 5b 的盲区）**——找出「本库没有、但多家转售商收录」的模型。
这是发现 `hy4-flash` 这类缺口的手段（5b 对它完全无感）。

```bash
node -e '
const d=require("/tmp/models-dev.json");
const models=require("./src/data/models.json").models;
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
const mineN=new Set(models.map(x=>norm(x.name)));
const last=require("./src/data/models.json").lastUpdated;
const g=new Map();
for(const pid of Object.keys(d)) for(const m of Object.values(d[pid].models||{})){
  const dt=m.release_date||""; if(dt<last||dt.startsWith("1970")) continue;
  const cid=m.canonical_model_id||"";
  if(!cid||mineN.has(norm(m.name))) continue;
  (g.get(cid)??g.set(cid,[]).get(cid)).push({dt,name:m.name,pid});
}
[...g.entries()].filter(([,v])=>v.length>=3)      // 3+ 家收录才看
  .sort((a,b)=>b[1].length-a[1].length)
  .forEach(([cid,v])=>{
    // 优先展示不带 (free)/Uncensored 等后缀的代表名
    const clean=v.find(x=>!/free|uncensored|abliterated|\(/i.test(x.name))??v[0];
    console.log(String(v.length).padStart(3),"家 |",cid,"|",clean.name,"|",clean.dt);
  });
'
```

- 转售商数多 + `canonical_model_id` 前缀是已知厂商 → 大概率真缺口，进步骤 3。
- 前缀陌生、名字像代号 → 跳过。
- 空输出 = 本库已追上快照，是**正常结果**。

剩余未收录通常可放过：`*-latest`/`*-preview` 别名、尺寸变体（`8B`/`A22B`/`mini`/`nano`）、
embedding/rerank/语音等基础设施模型。**真缺口特征**：起始日期明显偏晚、条目数远低于同行，
或 5c 报出多家转售商收录而本库缺失。

## 步骤 6：验证

```bash
pnpm exec tsc -b && pnpm lint && pnpm build
```

- **主线正则（最容易踩）**：新增旗舰世代号一涨，`src/lib/race.ts` 的 `MAINLINE` 就可能匹配不上，
  表现为竞速图断线（实例：`/^Qwen(-| )?[123]/` 匹配不到 "Qwen 4"）。自检：

```bash
node -e '
const m=require("./src/data/models.json").models;
const re=/^Qwen(-| )?[1234]/;   // 换成你刚动过的那家的正则
const hit=m.filter(x=>x.company==="alibaba"&&x.category==="chat"&&re.test(x.name))
  .sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate));
console.log(hit.length,"条命中；最新：",hit.at(-1)?.name);'
```

  最新一条必须是刚添加的旗舰，否则把版本号范围扩一位。
- 新增厂商时同步 `src/data/companies.json`（缺 icon 会渲染空白）+ `MAINLINE` 加一条正则。
- `pnpm build` 的「chunk > 500 kB」警告是既有的，**不是**本次改动引入，忽略即可。

## 不要做的事

- ❌ 凭记忆写日期——用 API 或官方公告。
- ❌ 全站爬官网——成本高、易被封、结构易变。
- ❌ 把同一模型的不同 provider 副本当多条记录。
- ❌ 虚构旗舰或补假日期来让图好看。
- ❌ 为了「有产出」硬凑条目。
- ❌ 按 provider 名字过滤转售商再做归属——会误杀只在转售商出现的第一方模型。先按 `canonical_model_id` 归并。
- ❌ 看到 `lastUpdated` 之后的日期就当脏数据丢掉——那可能是快照更新后的真新发布。
- ❌ 用转售商价格比例倒推官方价——取不到就留空。
