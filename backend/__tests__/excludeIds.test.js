const request = require('supertest');

jest.mock('../routes/tmdb');

const { discoverMovies, formatMovie } = require('../routes/tmdb');
const app = require('../server');

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
}

beforeEach(function () {
  jest.clearAllMocks();
});

describe('POST /recommend -- excludeIds validation', function () {
  test('returns 400 when excludeIds is a string', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('excludeIds must be an array');
  });

  test('returns 400 when excludeIds is a number', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: 42 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('excludeIds must be an array');
  });

  test('returns 400 when excludeIds is a plain object', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: { a: 1 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('excludeIds must be an array');
  });

  test('returns 400 when excludeIds is a boolean', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('excludeIds must be an array');
  });

  test('accepts a valid excludeIds array', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('accepts request when excludeIds is omitted', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('accepts an empty excludeIds array', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /recommend -- excludeIds filtering', function () {
  test('excluded IDs do not appear in results', async function () {
    setupMock(20);
    var excluded = [1, 2, 3, 4, 5];

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: excluded });

    expect(res.status).toBe(200);
    var returnedIds = res.body.map(function (m) { return m.id; });
    for (var i = 0; i < excluded.length; i++) {
      expect(returnedIds).not.toContain(excluded[i]);
    }
  });

  test('non-matching excludeIds do not reduce results', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [9999, 8888] });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('excluding all movies produces an empty result', async function () {
    var raw = [
      fakeRawMovie(1, 8.0, 500),
      fakeRawMovie(2, 7.5, 300),
      fakeRawMovie(3, 7.0, 200),
    ];
    discoverMovies.mockResolvedValue(raw);
    formatMovie.mockImplementation(function (m) {
      return {
        id: m.id, title: m.title, overview: m.overview,
        release_date: m.release_date, vote_average: m.vote_average,
        vote_count: m.vote_count, poster_path: m.poster_path,
        genre_ids: m.genre_ids,
      };
    });

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [1, 2, 3] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('mood validation error takes priority over excludeIds', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ genreId: 28, excludeIds: [1] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing or invalid mood value');
  });

  test('genreId validation error takes priority over excludeIds', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', excludeIds: [1] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing or invalid genreId value');
  });
});
