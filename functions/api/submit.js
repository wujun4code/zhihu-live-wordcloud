import { normalizeWord, isBanned, ipHash, json, isPaused } from "../../lib/utils.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const raw = String(body.word || "").slice(0, 50).trim();
  const word = normalizeWord(raw);
  if (!word) return json({ ok: false, error: "empty" }, 400);
  if ([...word].length > 10) return json({ ok: false, error: "too_long" }, 400);
  if (isBanned(word)) return json({ ok: false, error: "banned" }, 400);
  if (await isPaused(env)) return json({ ok: false, error: "paused" }, 403);

  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const h = await ipHash(ip);
  const now = Math.floor(Date.now() / 1000);

  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM submissions WHERE ip_hash = ? AND created_at > ?"
  ).bind(h, now - 60).first();
  if (row.c >= 3) return json({ ok: false, error: "rate_limited" }, 429);

  await env.DB.prepare(
    "INSERT INTO submissions (word, raw_word, ip_hash, created_at) VALUES (?, ?, ?, ?)"
  ).bind(word, raw, h, now).run();

  return json({ ok: true });
}
