const router = require('../routes/recommend');

const { rankAndFilter } = router._testExports;

// Builds a fake movie object with a given id, vote_average, and vote_count.
function fakeMovie(id, vote_average, vote_count) {
  return {
    id,
    title: `Movie ${id}`,
    overview: 'Overview',
    release_date: '2024-01-01',
    vote_average,
    vote_count,
    poster_path: `/poster${id}.jpg`,
    genre_ids: [28],
  };
}

describe('rankAndFilter', () => {
  test('filters out movies with vote_count below 100', () => {
    const movies = [
      fakeMovie(1, 8.0, 500),
      fakeMovie(2, 9.0, 50),
      fakeMovie(3, 7.0, 99),
    ];

    const results = rankAndFilter(movies);

    const ids = results.map((m) => m.id);
    expect(ids).toContain(1);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(3);
  });

  test('keeps movies with exactly 100 vote_count', () => {
    const movies = [fakeMovie(1, 7.0, 100)];

    const results = rankAndFilter(movies);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
  });

  test('returns at most 10 movies from a large pool', () => {
    const movies = [];
    for (let i = 1; i <= 30; i++) {
      movies.push(fakeMovie(i, 6.0 + i * 0.1, 200 + i * 10));
    }

    const results = rankAndFilter(movies);

    expect(results.length).toBeLessThanOrEqual(10);
  });

  test('returns fewer than 10 when the qualifying pool is smaller', () => {
    const movies = [
      fakeMovie(1, 8.0, 500),
      fakeMovie(2, 7.5, 300),
      fakeMovie(3, 7.0, 200),
    ];

    const results = rankAndFilter(movies);

    expect(results).toHaveLength(3);
  });

  test('returns an empty array when no movies pass the vote_count filter', () => {
    const movies = [
      fakeMovie(1, 9.0, 10),
      fakeMovie(2, 8.5, 50),
    ];

    const results = rankAndFilter(movies);

    expect(results).toEqual([]);
  });

  test('returns an empty array for empty input', () => {
    expect(rankAndFilter([])).toEqual([]);
  });

  test('strips the _score field from every returned movie', () => {
    const movies = [];
    for (let i = 1; i <= 15; i++) {
      movies.push(fakeMovie(i, 7.0, 500));
    }

    const results = rankAndFilter(movies);

    results.forEach((movie) => {
      expect(movie).not.toHaveProperty('_score');
    });
  });

  test('all returned movies come from the top 25 by score', () => {
    const movies = [];
    for (let i = 1; i <= 30; i++) {
      movies.push(fakeMovie(i, 5.0 + i * 0.1, 100 + i * 50));
    }

    const top25Ids = movies
      .map((m) => ({
        id: m.id,
        _score: m.vote_average * 0.7 + Math.log10(m.vote_count) * 0.3,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 25)
      .map((m) => m.id);

    const results = rankAndFilter(movies);
    results.forEach((movie) => {
      expect(top25Ids).toContain(movie.id);
    });
  });

  test('produces varied orderings across multiple calls (shuffle works)', () => {
    const movies = [];
    for (let i = 1; i <= 30; i++) {
      movies.push(fakeMovie(i, 6.0 + i * 0.05, 200 + i * 20));
    }

    const orderings = new Set();
    for (let run = 0; run < 20; run++) {
      const ids = rankAndFilter(movies).map((m) => m.id).join(',');
      orderings.add(ids);
    }

    expect(orderings.size).toBeGreaterThan(1);
  });
});
