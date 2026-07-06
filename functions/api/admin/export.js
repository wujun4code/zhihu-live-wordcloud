import { requireAdmin } from "../../../lib/utils.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    "SELECT word, raw_word, created_at FROM submissions ORDER BY id ASC"
  ).all();
  const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = ["word,raw_word,submitted_at"];
  for (const r of results) {
    lines.push([esc(r.word), esc(r.raw_word), new Date(r.created_at * 1000).toISOString()].join(","));
  }
  // ﻿ BOM 让 Excel 正确识别 UTF-8 中文
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="wordcloud-export.csv"',
      "cache-control": "no-store",
    },
  });
}
