import { json, requireAdmin, normalizeWord } from "../../../lib/utils.js";

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const word = normalizeWord(String(body.word || ""));
  if (!word) return json({ ok: false, error: "empty" }, 400);
  const r = await env.DB.prepare("DELETE FROM submissions WHERE word = ?").bind(word).run();
  return json({ ok: true, deleted: r.meta.changes });
}
