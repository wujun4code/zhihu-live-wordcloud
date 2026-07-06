import { json, requireAdmin } from "../../../lib/utils.js";

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const paused = body.paused ? "1" : "0";
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('paused', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(paused).run();
  return json({ ok: true, paused: paused === "1" });
}
