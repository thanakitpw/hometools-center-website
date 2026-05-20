export const siteConfig = {
  name: 'Home Tool Center',
  shortName: 'HTC',
  description: 'ศูนย์รวมวัสดุก่อสร้างครบวงจร',
  url: 'https://hometools-center.com',
  logoUrl: '/logo-htc.png', // will be migrated from WP
  contact: {
    phone: '02-426-2745',
    mobile: '081-234-2974',
    email: 'hometoolcenter.yspd@gmail.com',
    address: 'แฟลต 6/2 ซ. พหลโยธิน 8 (สายลม) แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10330',
    hours: 'จ-ส 08:00 - 17:00 / อา หยุด',
  },
  social: {
    facebook: 'https://www.facebook.com/',
    line: 'https://line.me/',
  },
  nav: [
    { label: 'หน้าหลัก', href: '/' },
    { label: 'สินค้า&บริการ', href: '/shop' },
    { label: 'โปรโมชั่น', href: '/promotion' },
    { label: 'วิธีการสั่งซื้อ', href: '/how-to-place-an-order' },
    { label: 'เกี่ยวกับเรา', href: '/about-us' },
    { label: 'ติดต่อ', href: '/contact-us' },
  ],
  footerNav: {
    products: { title: 'สินค้า', items: [
      { label: 'งานระบบ', href: '/product-category/system-work' },
      { label: 'วัสดุก่อสร้าง', href: '/product-category/construction-materials-and-equipment' },
    ]},
    about: { title: 'เกี่ยวกับ', items: [
      { label: 'เกี่ยวกับเรา', href: '/about-us' },
      { label: 'วิธีการสั่งซื้อ', href: '/how-to-place-an-order' },
      { label: 'โปรโมชั่น', href: '/promotion' },
      { label: 'นโยบายความเป็นส่วนตัว', href: '/privacy-policy' },
      { label: 'นโยบายคุกกี้', href: '/cookie-policy' },
    ]},
  },
} as const;
