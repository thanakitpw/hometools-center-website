/**
 * Entry ของ Cloudflare Worker
 *
 * ส่ง request ทั้งหมดให้ handler ที่ OpenNext สร้าง (.open-next/worker.js)
 * เพิ่มแค่ redirect www → โดเมนหลัก และ http → https ซึ่งเดิม Vercel ทำให้จากการตั้งค่าโดเมน
 */
// @ts-expect-error: ไฟล์นี้ถูกสร้างตอน build
import { default as handler } from "./.open-next/worker.js";

// โดเมนหลักคือแบบไม่มี www (ตรงกับ siteConfig.url และลิงก์ทั้งหมดใน WP เดิม)
const CANONICAL_HOST = "hometools-center.com";

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
    return handler.fetch(request, env, ctx);
  },
};

// @ts-expect-error: ไฟล์นี้ถูกสร้างตอน build
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
