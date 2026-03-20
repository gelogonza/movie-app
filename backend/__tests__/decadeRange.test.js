const request = require('supertest');

jest.mock('../routes/tmdb');

const { discoverMovies, formatMovie, getWatchProviders } = require('../routes/tmdb');
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
  getWatchProviders.mockResolvedValue([]);
}

beforeEach(function () {
  jest.clearAllMocks();
});

// --- decadeRange validation ---

describe('POST /recommend -- decadeRange validation', function () {
  test('returns 400 when decadeRange is a string', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('decadeRange must be an object');
  });

  test('returns 400 when decadeRange is a number', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: 42 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('decadeRange must be an object');
  });

  test('returns 400 when decadeRange is a boolean', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('decadeRange must be an object');
  });

  test('returns 400 when decadeRange is an array', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: [1, 2] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('decadeRange must be an object');
  });

  test('accepts a valid decadeRange object with gte and lte', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: { gte: '1980-01-01', lte: '1989-12-31' } });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('accepts a valid decadeRange object with only gte', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: { gte: '2020-01-01' } });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('accepts request when decadeRange is null', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: null });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('accepts request when decadeRange is omitted', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('mood validation takes priority over decadeRange', async function () {
    var res = await request(app)
      .post('/recommend')
      .send({ genreId: 28, decadeRange: { gte: '1980-01-01' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing or invalid mood value');
  });
});

// --- decadeRange filter merging ---

describe('POST /recommend -- decadeRange merges into filters', function () {
  test('passes gte and lte to discoverMovies when decadeRange is provided', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: { gte: '1980-01-01', lte: '1989-12-31' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBe('1980-01-01');
    expect(filters['primary_release_date.lte']).toBe('1989-12-31');
  });

  test('passes only gte when lte is absent in decadeRange', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: { gte: '2020-01-01' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBe('2020-01-01');
    expect(filters['primary_release_date.lte']).toBeUndefined();
  });

  test('does not set date filters when decadeRange is null', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, decadeRange: null });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBeUndefined();
    expect(filters['primary_release_date.lte']).toBeUndefined();
  });
});

// --- decadeRange overrides the excited mood date filter ---

describe('POST /recommend -- decadeRange overwrites excited mood date filter', function () {
  test('excited mood without decadeRange uses the four-year recency filter', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'excited', genreId: 28 });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBeDefined();
    expect(filters['primary_release_date.lte']).toBeUndefined();
  });

  test('excited mood with decadeRange replaces the recency filter with the decade gte', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'excited', genreId: 28, decadeRange: { gte: '1990-01-01', lte: '1999-12-31' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBe('1990-01-01');
    expect(filters['primary_release_date.lte']).toBe('1999-12-31');
  });

  test('excited+drama override with decadeRange still applies decadeRange on top', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'excited', genreId: 18, decadeRange: { gte: '1970-01-01', lte: '1979-12-31' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters['primary_release_date.gte']).toBe('1970-01-01');
    expect(filters['primary_release_date.lte']).toBe('1979-12-31');
  });
});

// --- decadeRange with mood+genre overrides ---

describe('POST /recommend -- decadeRange applies on top of mood+genre overrides', function () {
  test('happy+horror override still gets decadeRange dates applied', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 27, decadeRange: { gte: '2000-01-01', lte: '2009-12-31' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('vote_average.desc');
    expect(filters['vote_average.lte']).toBe(7.8);
    expect(filters['primary_release_date.gte']).toBe('2000-01-01');
    expect(filters['primary_release_date.lte']).toBe('2009-12-31');
  });

  test('bored+horror override still gets decadeRange dates applied', async function () {
    setupMock(20);

    await request(app)
      .post('/recommend')
      .send({ mood: 'bored', genreId: 27, decadeRange: { gte: '1980-01-01', lte: '1989-12-31' } });

    var filters = discoverMovies.mock.calls[0][0];
    expect(filters.sort_by).toBe('vote_average.desc');
    expect(filters['vote_count.gte']).toBe(600);
    expect(filters['primary_release_date.gte']).toBe('1980-01-01');
    expect(filters['primary_release_date.lte']).toBe('1989-12-31');
  });
});
