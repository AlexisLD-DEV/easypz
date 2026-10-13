import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { quizCoverMeta } from '../src/features/public/publicGalleryModel.ts';

const subjects = [
  'Society', 'Citizenship', 'Equality', 'Culture', 'Identity', 'City', 'Media',
  'Digital', 'History', 'Reading', 'Listening', 'Sport', 'Creativity', 'Work',
  'Family', 'Daily', 'Game', 'Verbs', 'Study', 'General'
];
const quizzes = subjects.map((title, index) => ({
  id: String(index), title, description: '', primary_language: 'en',
  level: '', tags_json: '[]', slug: `quiz-${index}`
}));
function assign() {
  const used = new Set();
  return quizzes.map((quiz) => quizCoverMeta(quiz, { title: quiz.title, tags: [] }, used));
}
const covers = assign();
assert.equal(new Set(covers.slice(0, 16).map(({ image }) => image)).size, 16);
assert.equal(new Set(covers.map(({ image }) => image)).size, 16);
assert.deepEqual(covers, assign(), 'Assignment must be deterministic');
assert.deepEqual(covers[1], { image: '/quiz-covers/city.jpg', label: 'City' });
for (const [index, cover] of covers.entries()) {
  const name = cover.image.split('/').pop().replace('.jpg', '');
  assert.equal(cover.label, name === 'default' ? 'Quiz' : name[0].toUpperCase() + name.slice(1));
  if (index >= 16) {
    const quiz = quizzes[index];
    assert.deepEqual(cover, quizCoverMeta(quiz, { title: quiz.title, tags: [] }));
  }
}
console.log('OK: 20 quizzes; first 16 covers unique; thematic fallback for last 4; labels and determinism verified.');

// Check semantic assignments without the gallery's duplicate-cover fallback.
export const themeCases = [
  ['society', 'Society'], ['city', 'City'], ['media', 'Social media'],
  ['digital', 'Digital'], ['history', 'History'], ['reading', 'Reading'],
  ['listening', 'Listening'], ['sport', 'Sport'], ['creativity', 'Creativity'],
  ['work', 'Work'], ['family', 'Family'], ['daily', 'Daily'],
  ['game', 'Game'], ['level', 'Study'], ['verbs', 'Verbs'], ['default', 'General']
];
const thematicImages = themeCases.map(([theme, title]) => {
  const quiz = { ...quizzes[0], title, level: theme === 'level' ? 'A1' : '' };
  const cover = quizCoverMeta(quiz, { title, tags: [] });
  assert.equal(cover.image, `/quiz-covers/${theme}.jpg`, `Incorrect theme: ${title}`);
  const file = new URL(`../public${cover.image}`, import.meta.url);
  assert.ok(existsSync(file), `Missing cover: ${cover.image}`);
  return { image: cover.image, hash: createHash('sha256').update(readFileSync(file)).digest('hex') };
});
assert.equal(new Set(thematicImages.map(({ image }) => image)).size, 16, 'Distinct themes must have distinct images');
assert.equal(new Set(thematicImages.map(({ hash }) => hash)).size, 16, 'Cover contents must be distinct');
for (const [title, theme] of [
  ['Social media', 'media'], ['History of society', 'history'],
  ['Art and society', 'creativity'], ['Daily routine', 'daily'],
  ['Journal', 'media'], ['Association', 'default'], ['Apart', 'default']
]) {
  assert.equal(quizCoverMeta({ ...quizzes[0], level: '' }, { title, tags: [] }).image, `/quiz-covers/${theme}.jpg`);
}
console.log('OK: 16 distinct themes, paths and image contents; broad-match regressions verified.');
