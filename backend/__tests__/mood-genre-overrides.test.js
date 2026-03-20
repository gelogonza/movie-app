const request = require('supertest');

jest.mock('../routes/tmdb');

const { discoverMovies, formatMovie, getWatchProviders } = require('../routes/tmdb');
const app = require('../server');
const router = require('../routes/recommend');

const { MOOD_FILTERS, MOOD_GENRE_OVERRIDES } = router._testExports;

function fakeRawMovie(id, voteAvg, voteCount) {
  return {
    id: id,
    title: 'Movie ' + id,
    overview: 'Overview text',
    release_date: '2024-01-01',
    vote_average: voteAvg,
    vote_count: voteCount,
    poster_path: '/poster' + id + '.jpg',
    genre_ids: [28],
    adult: false,
    backdrop_path: null,
  };
}

function setupMock(count) {
  var raw = [];
  for (var i = 1; i <= count; i++) {
    raw.push(fakeRawMovie(i, 7.0 + i * 0.05, 200 + i * 20));
  }
  discoverMovies.mockResolvedValue(raw);
  formatMovie.mockImplementation(function (m) {
    return {
      id: m.id,
      title: m.title,
      overview: m.overview,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      poster_path: m.poster_path
        ? 'https://image.tmdb.org/t/p/w500' + m.poster_path
        : null,
      genre_ids: m.genre_ids,
    };
  });
  getWatchProviders.mockResolvedValue([]);
}

beforeEach(function () {
  jest.clearAllMocks();
});

describe('MOOD_GENRE_OVERRIDES structure', function () {
  test('contains exactly the four expected mood+genre pairs', function () {
    var moodKeys = Object.keys(MOOD_GENRE_OVERRIDES);
    expect(moodKeys.sort()).toEqual(['bored', 'excited', 'happy', 'romantic']);

    expect(MOOD_GENRE_OVERRIDES.happy).toHaveProperty('27');
    expect(MOOD_GENRE_OVERRIDES.excited).toHaveProperty('18');
    expect(MOOD_GENRE_OVERRIDES.bored).toHaveProperty('27');
    expect(MOOD_GENRE_OVERRIDES.romantic).toHaveProperty('28');
  });

  test('each override has a sort_by and vote_count.gte parameter', function () {
    var pairs = [
      MOOD_GENRE_OVERRIDES.happy[27],
      MOOD_GENRE_OVERRIDES.excited[18],
      MOOD_GENRE_OVERRIDES.bored[27],
      MOOD_GENRE_OVERRIDES.romantic[28],
    ];
    pairs.forEach(function (entry) {
      expect(entry).toHaveProperty('sort_by');
      expect(entry['vote_count.gte']).toBeDefined();
    });
  });
});

describe('POST /recommend -- override replaces base filter for happy+horror', function () {
  test('passes the happy+horror override params to discoverMovies', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 27 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('vote_average.desc');
    expect(filters['vote_average.gte']).toBe(6.0);
    expect(filters['vote_average.lte']).toBe(7.8);
    expect(filters['vote_count.gte']).toBe(800);
    expect(filters.with_genres).toBe(27);
  });
});

describe('POST /recommend -- override replaces base filter for excited+drama', function () {
  test('passes the excited+drama override params without a date filter', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'excited', genreId: 18 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('vote_average.desc');
    expect(filters['vote_average.gte']).toBe(7.5);
    expect(filters['vote_count.gte']).toBe(400);
    expect(filters.with_genres).toBe(18);
    expect(filters['primary_release_date.gte']).toBeUndefined();
  });
});

describe('POST /recommend -- override replaces base filter for bored+horror', function () {
  test('passes the bored+horror override params to discoverMovies', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'bored', genreId: 27 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('vote_average.desc');
    expect(filters['vote_average.gte']).toBe(7.0);
    expect(filters['vote_count.gte']).toBe(600);
    expect(filters.with_genres).toBe(27);
  });
});

describe('POST /recommend -- override replaces base filter for romantic+action', function () {
  test('passes the romantic+action override params including runtime cap', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'romantic', genreId: 28 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('popularity.desc');
    expect(filters['vote_average.gte']).toBe(6.5);
    expect(filters['vote_count.gte']).toBe(400);
    expect(filters['with_runtime.lte']).toBe(130);
    expect(filters.with_genres).toBe(28);
  });
});

describe('POST /recommend -- non-override combos use base mood filters', function () {
  test('happy+action uses the base happy filter, not the horror override', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe(MOOD_FILTERS.happy.sort_by);
    expect(filters['vote_average.gte']).toBe(MOOD_FILTERS.happy['vote_average.gte']);
    expect(filters['vote_count.gte']).toBe(MOOD_FILTERS.happy['vote_count.gte']);
    expect(filters['vote_average.lte']).toBeUndefined();
    expect(filters.with_genres).toBe(28);
  });

  test('excited+action uses the base excited filter with a date restriction', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'excited', genreId: 28 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe(MOOD_FILTERS.excited.sort_by);
    expect(filters['vote_average.gte']).toBe(MOOD_FILTERS.excited['vote_average.gte']);
    expect(filters['vote_count.gte']).toBe(MOOD_FILTERS.excited['vote_count.gte']);
    expect(filters['primary_release_date.gte']).toBeDefined();
    expect(filters.with_genres).toBe(28);
  });
});

describe('POST /recommend -- override does not bleed base filter fields', function () {
  test('happy+horror does not carry over the base happy popularity sort', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 27 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).not.toBe('popularity.desc');
  });

  test('bored+horror does not carry over the base bored popularity sort or low vote floor', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'bored', genreId: 27 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).not.toBe('popularity.desc');
    expect(filters['vote_count.gte']).not.toBe(MOOD_FILTERS.bored['vote_count.gte']);
  });
});
