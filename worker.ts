/**
 * Entry ของ Cloudflare Worker
 *
 * ส่ง request ทั้งหมดให้ handler ที่ OpenNext สร้าง (.open-next/worker.js)
 * เพิ่มแค่ redirect www → โดเมนหลัก และ http → https ซึ่งเดิม Vercel ทำให้จากการตั้งค่าโดเมน
 */
// @ts-expect-error: ไฟล์นี้ถูกสร้างตอน build
import { default as handler } from "./.open-next/worker.js";

// path ไฟล์เดิมของ WordPress ("2024/07/ANA.pdf") → key ใน Supabase Storage
// สร้างโดย scripts/launch/build-wp-uploads-map.js
import wpUploads from "./lib/wp-uploads-map.json";

// โดเมนหลักคือแบบไม่มี www (ตรงกับ siteConfig.url และลิงก์ทั้งหมดใน WP เดิม)
const CANONICAL_HOST = "hometools-center.com";
const STORAGE_BASE = "https://dwogyznhmveltanehaya.supabase.co/storage/v1/object/public/media/";
const WP_UPLOADS = "/wp-content/uploads/";

/**
 * Google ยังเก็บ URL ไฟล์ของ WP เดิมไว้ (แคตตาล็อก PDF และรูป) ซึ่ง 404 ตั้งแต่ย้ายเว็บ
 * ส่ง 301 ไปที่ไฟล์เดียวกันใน Storage — รูปย่อของ WP (-300x300, -scaled) ส่งไปรูปต้นฉบับ
 */
function wpUploadRedirect(pathname: string): string | null {
  if (!pathname.startsWith(WP_UPLOADS)) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(pathname.slice(WP_UPLOADS.length)).normalize("NFC");
  } catch {
    return null;
  }
  const map = wpUploads as Record<string, string>;
  const key =
    map[rel] ??
    map[rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1")] ??
    map[rel.replace(/-scaled(\.[a-z0-9]+)$/i, "$1")] ??
    map[rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "-scaled$1")];
  if (!key) return null;
  return STORAGE_BASE + key.split("/").map(encodeURIComponent).join("/");
}

export default {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const url = new URL(request.url);
    // www → โดเมนหลัก และ http → https (โซนนี้ไม่ได้เปิด Always Use HTTPS)
    const isProdHost = url.hostname === CANONICAL_HOST || url.hostname === `www.${CANONICAL_HOST}`;
    if (isProdHost && (url.hostname !== CANONICAL_HOST || url.protocol === "http:")) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const upload = wpUploadRedirect(url.pathname);
    if (upload) return Response.redirect(upload, 301);
    return handler.fetch(request, env, ctx);
  },
};

// @ts-expect-error: ไฟล์นี้ถูกสร้างตอน build
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
