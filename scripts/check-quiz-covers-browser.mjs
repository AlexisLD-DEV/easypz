import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { themeCases } from './check-quiz-covers.mjs';

// Exercise the built public gallery with one explicit fixture per cover theme.
// Only API data is mocked; HTML, JS, CSS and images come from Vite preview.
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
  await page.route('**/api/public/quizzes', route => route.fulfill({ json: {
    quizzes: themeCases.map(([theme, title]) => ({
      id: theme, title, description: `Quiz — ${title}`, primary_language: 'en',
      level: theme === 'level' ? 'A1' : '', tags_json: '[]', slug: theme,
      question_count: 10, choice_count: 40, question_types: 'multiple_choice'
    }))
  } }));
  await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/');
  const images = page.locator('.public-quiz-card .quiz-cover-image');
  await images.last().waitFor();
  assert.equal(await images.count(), 16);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el => el.decode());
  }
  const covers = await images.evaluateAll(items => items.map(img => ({
    src: new URL(img.currentSrc).pathname, loaded: img.complete && img.naturalWidth > 0
  })));
  assert.ok(covers.every(cover => cover.loaded), 'Broken cover');
  assert.equal(new Set(covers.map(cover => cover.src)).size, 16);
  assert.deepEqual(covers.map(cover => cover.src), themeCases.map(([theme]) => `/quiz-covers/${theme}.jpg`));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir('/tmp/easypz-artifacts', { recursive: true });
  const path = '/tmp/easypz-artifacts/quiz-grid.png';
  await page.locator('.public-gallery').screenshot({ path });
  console.log(`OK: Chromium preview; 16 covers loaded, 16 unique; fixture API; screenshot: ${path}`);
} finally {
  await browser.close();
}
