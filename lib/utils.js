// 共享工具：Pages Functions 通用逻辑

// 基础违禁词表（政治敏感 / 色情 / 辱骂），命中即拒绝提交。
// 主持人可在 /admin 页面事后删除漏网的不当词。
const BANNED = [
  "习近平", "共产党", "共產黨", "法轮功", "法輪功", "六四", "台独", "台獨", "港独", "港獨",
  "傻逼", "煞笔", "沙比", "傻b", "操你", "草你", "艹你", "草泥马", "妈的", "妈逼", "你妈",
  "尼玛", "卧槽", "我操", "去死", "滚蛋", "狗屎", "垃圾人",
  "鸡巴", "阴茎", "阴道", "做爱", "性交", "色情", "约炮", "卖淫",
  "fuck", "shit", "bitch", "cnm", "nmsl", "sb",
];

// 归一化：去空白、全角转半角、英文小写，避免「知乎 」和「知乎」算两个词
export function normalizeWord(input) {
  let s = String(input || "");
  s = s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/[\s　​‌‍﻿]+/g, "");
  s = s.toLowerCase();
  return s;
}

export function isBanned(word) {
  return BANNED.some((b) => word.includes(b));
}

export async function ipHash(ip) {
  const data = new TextEncoder().encode("zlwc:" + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

// 管理接口鉴权：Authorization: Bearer <token> 或 ?token=<token>（导出下载用）
export function requireAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : url.searchParams.get("token") || "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

export async function isPaused(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='paused'").first();
  return row && row.value === "1";
}
