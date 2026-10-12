import { isFillCorrect, normalizeAnswer, percent } from './grading';

describe('normalizeAnswer', () => {
  it('merapikan huruf besar, spasi, dan tanda baca ujung', () => {
    expect(normalizeAnswer('  Watches. ')).toBe('watches');
    expect(normalizeAnswer('has   been')).toBe('has been');
  });
  it('menyamakan apostrof melengkung', () => {
    expect(normalizeAnswer('don’t')).toBe("don't");
  });
});

describe('isFillCorrect', () => {
  it('menerima jawaban yang sama, tanpa peduli huruf besar', () => {
    expect(isFillCorrect('Watches', ['watches'])).toBe(true);
  });
  it('menerima salah satu dari beberapa jawaban', () => {
    expect(isFillCorrect('am not', ['am not', "i'm not"])).toBe(true);
    expect(isFillCorrect("I'm not", ['am not', "i'm not"])).toBe(true);
  });
  it('menolak jawaban salah atau kosong', () => {
    expect(isFillCorrect('watch', ['watches'])).toBe(false);
    expect(isFillCorrect('   ', ['watches'])).toBe(false);
  });
});

describe('percent', () => {
  it('menghitung persen dan membulatkan', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });
  it('total 0 menghasilkan 0', () => {
    expect(percent(0, 0)).toBe(0);
  });
});
