export const siteConfig = {
  name: 'Home Tool Center',
  shortName: 'HTC',
  description: 'ศูนย์รวมวัสดุก่อสร้างครบวงจร',
  url: 'https://hometools-center.com',
  logoUrl: '/logo-htc.png', // will be migrated from WP
  contact: {
    phone: '02-426-2745',
    mobile: '081-234-2974',
    email: 'hometoolcenter.pipe@gmail.com',
    address: 'เลขที่ 642 ถ. พระราม ๒ แขวงบางมด เขตจอมทอง กรุงเทพมหานคร 10150',
    hours: 'จ-ส 08:00 - 17:00 / อา หยุด',
  },
  social: {
    facebook: 'https://www.facebook.com/',
    messenger: 'https://m.me/',
    line: 'https://line.me/',
  },
  nav: [
    { label: 'หน้าแรก', href: '/' },
    { label: 'สินค้าทั้งหมด', href: '/shop' },
    { label: 'โปรโมชั่น', href: '/promotion' },
    { label: 'บทความ', href: '/blog' },
    { label: 'วิธีสั่งซื้อสินค้า', href: '/how-to-place-an-order' },
    { label: 'เกี่ยวกับเรา', href: '/about-us' },
    { label: 'ติดต่อเรา', href: '/contact-us' },
  ],
  footerNav: {
    products: { title: 'สินค้า', items: [
      { label: 'สินค้า', href: '/shop' },
      { label: 'โปรโมชั่น', href: '/promotion' },
      { label: 'บทความ', href: '/blog' },
    ]},
    about: { title: 'เกี่ยวกับ', items: [
      { label: 'วิธีสั่งซื้อ', href: '/how-to-place-an-order' },
      { label: 'การขนส่ง', href: '/how-to-place-an-order' },
      { label: 'เกี่ยวกับเรา', href: '/about-us' },
      { label: 'นโยบายความเป็นส่วนตัว', href: '/privacy-policy' },
    ]},
  },
} as const;
