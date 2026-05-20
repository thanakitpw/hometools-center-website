// Rewrite hardcoded WP URLs in app/(site)/page.tsx, components/site/header.tsx, footer.tsx
const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'image-url-map.json'), 'utf8'));

const FILES = [
  'app/(site)/page.tsx',
  'components/site/header.tsx',
  'components/site/footer.tsx',
];

let totalReplaced = 0;
for (const f of FILES) {
  const p = path.join(__dirname, '..', f);
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    if (s.includes(oldUrl)) {
      s = s.split(oldUrl).join(newUrl);
      n++;
    }
  }
  if (n) {
    fs.writeFileSync(p, s);
    console.log(f, '→', n, 'urls replaced');
    totalReplaced += n;
  }
}
console.log('Total replaced:', totalReplaced);
