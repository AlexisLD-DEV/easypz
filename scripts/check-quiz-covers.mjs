import assert from 'node:assert/strict';
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
