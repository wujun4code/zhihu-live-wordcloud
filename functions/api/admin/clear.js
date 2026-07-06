import { json, requireAdmin } from "../../../lib/utils.js";

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  await env.DB.prepare("DELETE FROM submissions").run();
  return json({ ok: true });
}
