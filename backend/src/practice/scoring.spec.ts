import { alignWords, labelFor, normalizeWords, scoreSpeech } from './scoring';

describe('normalizeWords', () => {
  it('membuang tanda baca dan huruf besar', () => {
    expect(normalizeWords('How are you today?')).toEqual(['how', 'are', 'you', 'today']);
  });
  it('menyamakan apostrof melengkung', () => {
    expect(normalizeWords('It’s OK.')).toEqual(["it's", 'ok']);
  });
});

describe('alignWords', () => {
  it('menandai kata salah', () => {
    const r = alignWords(['i', 'like', 'books'], ['i', 'like', 'book']);
    expect(r.words[2]).toEqual({ status: 'wrong', target: 'books', heard: 'book' });
  });
  it('menandai kata terlewat', () => {
    const r = alignWords(['a', 'cup', 'of', 'coffee'], ['a', 'cup', 'coffee']);
    expect(r.words.map((w) => w.status)).toEqual(['correct', 'correct', 'missing', 'correct']);
  });
  it('menandai kata tambahan', () => {
    const r = alignWords(['i', 'am', 'happy'], ['i', 'am', 'very', 'happy']);
    expect(r.words.map((w) => w.status)).toEqual(['correct', 'correct', 'extra', 'correct']);
  });
});

describe('scoreSpeech', () => {
  it('ucapan sama persis: 100 Excellent', () => {
    const r = scoreSpeech('How are you today?', 'how are you today', 1);
    expect(r.finalScore).toBe(100);
    expect(r.label).toBe('Excellent');
  });
  it('satu kata salah, dengan confidence', () => {
    const r = scoreSpeech('I like to read books', 'I like to read book', 0.9);
    expect(r.correctCount).toBe(4);
    expect(r.wrongCount).toBe(1);
    expect(r.finalScore).toBe(82);
    expect(r.label).toBe('Good');
  });
  it('tanpa confidence, bobot dibagi ulang', () => {
    const r = scoreSpeech('I like to read books', 'I like to read book');
    expect(r.confidenceScore).toBeNull();
    expect(r.finalScore).toBe(80);
  });
  it('satu kata terlewat', () => {
    const r = scoreSpeech('I want a cup of coffee', 'I want a cup coffee');
    expect(r.missingCount).toBe(1);
    expect(r.correctCount).toBe(5);
  });
  it('kata tambahan hanya sedikit mengurangi skor', () => {
    const r = scoreSpeech('I am happy', 'I am very happy');
    expect(r.extraCount).toBe(1);
    expect(r.finalScore).toBe(94);
  });
  it('urutan terbalik menurunkan skor urutan', () => {
    const r = scoreSpeech('dogs chase cats', 'cats chase dogs');
    expect(r.wordScore).toBe(1);
    expect(r.orderScore).toBeCloseTo(1 / 3, 5);
    expect(r.finalScore).toBe(83);
  });
  it('ucapan beda total: Try again', () => {
    const r = scoreSpeech('good morning', 'banana');
    expect(r.finalScore).toBe(0);
    expect(r.label).toBe('Try again');
  });
  it('confidence di luar 0..1 dipotong', () => {
    expect(scoreSpeech('hello', 'hello', 5).confidenceScore).toBe(1);
    expect(scoreSpeech('hello', 'hello', -2).confidenceScore).toBe(0);
  });
  it('tanpa suara sama sekali: skor 0', () => {
    const r = scoreSpeech('hello world', '');
    expect(r.finalScore).toBe(0);
    expect(r.missingCount).toBe(2);
  });
});

describe('labelFor', () => {
  it.each([
    [100, 'Excellent'], [90, 'Excellent'], [89, 'Good'], [75, 'Good'],
    [74, 'Needs practice'], [50, 'Needs practice'], [49, 'Try again'], [0, 'Try again'],
  ])('skor %i = %s', (score, label) => {
    expect(labelFor(score).label).toBe(label);
  });
});
