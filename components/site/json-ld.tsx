/** Server component: render JSON-LD structured data.
 *  ส่ง object เดียวหรือ array ของ object ก็ได้ (array = หลาย schema ใน script เดียว) */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
