# 实时词云 Web App — 完整计划文档

> 轻互动：让新人用 1 个词描述「你心中的知乎」——投屏实时词云

## 1. 目标与场景

线下活动现场，主持人投屏展示大屏页面；观众用手机扫码打开提交页，输入 **1 个词**描述「你心中的知乎」；大屏上的词云**近实时**更新，出现频次越高的词字号越大。

约束：
- 现场人数预估 50～500 人，提交高峰集中在 1～2 分钟内
- 手机端必须秒开（弱网 / 现场 Wi-Fi 拥挤），页面极简
- 大屏端 1080p/4K 投屏，深色背景更显好看
- 零成本运行：全部落在 Cloudflare 免费额度内

## 2. 页面与角色

| 路径 | 角色 | 功能 |
|------|------|------|
| `/` | 观众（手机） | 输入 1 个词（≤10 字符）→ 提交 → 显示「已收到」；每台设备限提交 1 次 |
| `/screen` | 大屏（投屏） | 全屏词云实时渲染 + 角落二维码（指向 `/`）+ 参与人数统计 |
| `/admin` | 主持人 | 口令保护；清空数据、暂停/恢复收集、删除个别不当词、导出 CSV |

## 3. 技术架构

**Cloudflare Pages（静态前端） + Pages Functions（API） + D1（存储）**

```
观众手机 ──POST /api/submit──▶ Pages Function ──INSERT──▶ D1
大屏页面 ──GET /api/words (每 2s 轮询)──▶ Pages Function ──SELECT──▶ D1
```

选型理由：
- **D1 而非 KV**：KV 是最终一致（跨节点传播可达 60s），大屏会明显滞后；D1 强一致，读写都在免费额度内（500 人 × 1 次写 + 大屏 2s 一次读，量级极小）。
- **轮询而非 WebSocket**：真 WebSocket 需要 Durable Objects（属 Workers 体系，Pages 里要绕一层）。轮询方只有大屏 1～2 个客户端，每 2 秒一次完全无压力，体验上与实时无异。这是坚持用 Pages 的前提下最简架构。
- 前端纯静态：无框架（原生 HTML/CSS/JS），保证手机端秒开。

### 依赖库（前端，走 CDN 或直接内嵌）
- **wordcloud2.js**（~15KB）：Canvas 词云渲染，支持中文、自定义配色与形状
- **qrcode 生成**：大屏端用 `qrcode.min.js` 本地生成二维码（不依赖外部图片服务）

## 4. 数据模型（D1）

```sql
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,              -- 归一化后的词（去首尾空格、全角转半角、小写化英文）
  raw_word TEXT NOT NULL,          -- 原始输入（审计用）
  ip_hash TEXT,                    -- IP 的 SHA-256 截断（限频用，不存明文 IP）
  created_at INTEGER NOT NULL      -- Unix 时间戳
);
CREATE INDEX idx_word ON submissions(word);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,            -- 'paused' | 'admin_token' 等
  value TEXT
);
```

词频聚合用 `SELECT word, COUNT(*) FROM submissions GROUP BY word` 实时算，数据量小无需缓存表。

## 5. API 设计（Pages Functions，`/functions` 目录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/submit` | body `{word}`；校验长度 ≤10、非空、敏感词过滤、IP 限频（同一 IP 60s 内最多 3 次）、暂停状态拒收；返回 `{ok}` |
| GET | `/api/words` | 返回 `[{word, count}]`（按 count 降序，取前 100）+ 总参与数；响应头 `cache-control: no-store` |
| POST | `/api/admin/clear` | 清空 submissions（需 `Authorization: Bearer <token>`） |
| POST | `/api/admin/pause` | 切换暂停/恢复 |
| POST | `/api/admin/delete-word` | 按词删除（处理不当内容） |
| GET | `/api/admin/export` | 导出 CSV |

管理口令存在 Pages 项目的环境变量 `ADMIN_TOKEN` 中，不入库不入代码。

## 6. 防刷与内容安全

1. **设备限一次**：提交成功后写 `localStorage` 标记，前端禁止重复提交（软限制，够用于友好现场）
2. **IP 限频**：Function 内按 `ip_hash` 查 60 秒窗口内提交次数，>3 次返回 429（硬限制）
3. **敏感词过滤**：内置一份基础违禁词表（政治/色情/辱骂），命中直接拒绝；主持人可在 `/admin` 事后删词兜底
4. **输入归一化**：去空格、全角→半角、英文统一小写，避免「知乎 」和「知乎」被算成两个词

## 7. 大屏端体验设计

- 深色渐变背景，词云采用知乎品牌蓝（#0084FF）为主的多级配色
- 词云每次轮询后**增量重绘**（wordcloud2.js 全量重画很快，数据变化时才重画，避免闪烁）
- 新词首次出现时短暂高亮动效
- 右下角固定二维码 + 「扫码参与」提示 + 实时参与人数
- 支持 `F` 键全屏、URL 参数控制主题（备用浅色主题应对投影仪偏亮场景）

## 8. 部署方案（Cloudflare Pages）

通过 **wrangler 直传**（不依赖 GitHub 集成，最快）：

1. `wrangler d1 create zhihu-wordcloud` 创建 D1 库，执行 schema
2. Pages 项目创建：`wrangler pages project create zhihu-wordcloud`
3. 绑定：在 Pages 项目设置中绑定 D1（binding 名 `DB`）、设置 `ADMIN_TOKEN` 环境变量
4. 部署：`wrangler pages deploy public/`
5. 验证 `*.pages.dev` 地址功能完整

后续迭代直接重复第 4 步；如需 CI，可再接 GitHub 自动构建。

## 9. 域名绑定

你的 Cloudflare 账户（已通过本地 MCP 授权验证）下有 11 个可用域名。**建议用子域名**，例如：

- `zhihu.shouyicheng.com`（推荐——你已有多个项目挂在此域名下）
- 或 `word.aiechohub.com` / 其他任意一个 zone 的子域

绑定步骤（我可以直接通过 MCP/API 完成）：
1. Pages 项目 → Custom domains → 添加 `zhihu.shouyicheng.com`
2. Cloudflare 自动在对应 zone 创建 CNAME 记录（同账户域名全自动，无需手动改 DNS）
3. HTTPS 证书自动签发，约 1～5 分钟生效

## 10. 项目结构

```
zhihu-live-wordcloud/
├── public/
│   ├── index.html        # 观众提交页
│   ├── screen.html       # 大屏词云页
│   ├── admin.html        # 管理页
│   ├── js/ (wordcloud2.js, qrcode.min.js, 各页逻辑)
│   └── css/
├── functions/
│   └── api/
│       ├── submit.ts
│       ├── words.ts
│       └── admin/ (clear.ts, pause.ts, delete-word.ts, export.ts)
├── schema.sql
├── wrangler.toml
└── PLAN.md
```

## 11. 实施步骤与工作量

| # | 任务 | 说明 |
|---|------|------|
| 1 | 项目脚手架 + schema | wrangler.toml、D1 建库建表 |
| 2 | API：submit / words | 含限频、敏感词、归一化 |
| 3 | 提交页 | 极简表单 + 已提交态 |
| 4 | 大屏页 | 词云渲染 + 轮询 + 二维码 + 全屏 |
| 5 | 管理页 + admin API | 口令、清空、暂停、删词、导出 |
| 6 | 本地联调 | `wrangler pages dev` 全流程验证 |
| 7 | 部署 + 绑域名 | Pages 部署、自定义域、真机扫码验证 |

全部一次会话内可完成（约 1～2 小时代理工作量）。

## 12. 风险与对策

| 风险 | 对策 |
|------|------|
| 现场网络差，手机打不开页面 | 页面 <30KB、无框架、静态资源走 Cloudflare 边缘缓存 |
| 恶意刷词 | IP 限频 + 敏感词过滤 + admin 实时删词 |
| D1 免费额度 | 每日 500 万行读 / 10 万行写，本场景用量 <0.1% |
| 大屏浏览器休眠导致轮询停止 | 页面申请 Wake Lock API + 提示关闭系统休眠 |
| 活动结束数据留存 | admin 导出 CSV 后可一键清空，复用于下一场 |
