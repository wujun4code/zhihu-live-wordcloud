# 轻互动：让新人用 1 个词描述「你心中的知乎」——投屏实时词云

线上地址：**https://zhihu.aiechohub.com**

| 页面 | 地址 | 用途 |
|------|------|------|
| 提交页 | `/` | 观众手机扫码打开，输入 1 个词（≤10 字），每台设备限 1 次 |
| 大屏页 | `/screen.html` | 投屏全屏词云，右下角自带参与二维码，按 `F` 全屏 |
| 管理台 | `/admin.html` | 口令登录：暂停/恢复收集、删除不当词、导出 CSV、清空数据 |

## 架构

Cloudflare Pages（静态 + Functions）+ D1（数据库 `zhihu-wordcloud`）。

- `public/` — 三个纯静态页面 + 本地托管的 wordcloud2.js / qrcode.js
- `functions/api/` — Pages Functions：`submit`、`words`、`admin/*`
- `lib/utils.js` — 归一化、违禁词、限频哈希、鉴权等共享逻辑
- `schema.sql` — D1 表结构
- 大屏每 2s 轮询 `/api/words`；提交端有 IP 限频（60s 内 3 次）+ 敏感词过滤

## 本地开发

```sh
npx wrangler d1 execute zhihu-wordcloud --local --file schema.sql   # 首次
npx wrangler pages dev public --binding ADMIN_TOKEN=localtest123
```

## 部署（CI/CD）

Pages 项目 `zhihu-wordcloud` 已接 Cloudflare Git 集成：**push / PR 合并 / force-push 到 `main` 即自动云端构建发布**，无需本地任何操作。

- 构建配置：无 build command，输出目录 `public/`，`functions/` 自动编译
- D1 绑定（binding 名 `DB`）与 `ADMIN_TOKEN`（secret）配置在项目 deployment_configs 中，与代码无关
- 非 main 分支不产生 preview 部署（已关闭）
- 构建状态查看：Cloudflare Dashboard → Pages → zhihu-wordcloud

## 活动现场清单

- [ ] 投屏机打开 `https://zhihu.aiechohub.com/screen.html`，按 `F` 全屏
- [ ] 手机打开 `/admin.html`，输入口令，确认「收集中」
- [ ] 活动结束：导出 CSV → 清空数据，可复用于下一场
