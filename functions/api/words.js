import { json, isPaused } from "../../lib/utils.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT word, COUNT(*) AS count FROM submissions GROUP BY word ORDER BY count DESC, MIN(id) ASC LIMIT 100"
  ).all();
  const totalRow = await env.DB.prepare("SELECT COUNT(*) AS total FROM submissions").first();
  const paused = await isPaused(env);
  return json({ words: results, total: totalRow.total, paused });
}
