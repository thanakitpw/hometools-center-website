import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { splitCategoryContent } from './category-content';
import { extractFaq } from './seo/faq';

describe('splitCategoryContent', () => {
  it('treats plain text as the intro', () => {
    expect(splitCategoryContent('ท่อ PVC ทุกขนาด')).toEqual({ introText: 'ท่อ PVC ทุกขนาด', introHtml: null, bodyHtml: null });
  });

  it('returns nothing for empty values', () => {
    expect(splitCategoryContent(null)).toEqual({ introText: null, introHtml: null, bodyHtml: null });
    expect(splitCategoryContent('  ')).toEqual({ introText: null, introHtml: null, bodyHtml: null });
  });

  it('keeps HTML without a marker as the intro only', () => {
    expect(splitCategoryContent('<p>สั้น</p>')).toEqual({ introText: null, introHtml: '<p>สั้น</p>', bodyHtml: null });
  });

  it('splits intro and body at <!--more-->', () => {
    const r = splitCategoryContent('<p>intro</p>\n<!--more-->\n<h2>x</h2>');
    expect(r.introHtml).toBe('<p>intro</p>');
    expect(r.bodyHtml).toBe('<h2>x</h2>');
  });

  it('yields FAQ pairs for every authored category guide', () => {
    const dir = path.resolve(__dirname, '..', 'seo', 'categories');
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
      const { introHtml, bodyHtml } = splitCategoryContent(fs.readFileSync(path.join(dir, f), 'utf8'));
      expect(introHtml, f).toBeTruthy();
      const faq = extractFaq(bodyHtml);
      expect(faq.length, f).toBeGreaterThan(0);
      for (const q of faq) expect(q.answer.length, `${f}: ${q.question}`).toBeGreaterThan(20);
    }
  });
});
