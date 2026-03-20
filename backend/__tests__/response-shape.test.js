var request = require('supertest');

jest.mock('../routes/tmdb');

var tmdb = require('../routes/tmdb');
var discoverMovies = tmdb.discoverMovies;
var formatMovie = tmdb.formatMovie;
var getWatchProviders = tmdb.getWatchProviders;
var app = require('../server');

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

describe('POST /recommend -- response shape with poolSizeAfterExclusion', function () {
  test('response body has a results array property', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('response body has a poolSizeAfterExclusion number property', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('poolSizeAfterExclusion');
    expect(typeof res.body.poolSizeAfterExclusion).toBe('number');
  });

  test('poolSizeAfterExclusion equals pool size minus excluded IDs', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [1, 2, 3, 4, 5] });

    expect(res.status).toBe(200);
    expect(res.body.poolSizeAfterExclusion).toBe(15);
  });

  test('poolSizeAfterExclusion is zero when every movie is excluded', async function () {
    var raw = [
      fakeRawMovie(1, 8.0, 500),
      fakeRawMovie(2, 7.5, 300),
    ];
    discoverMovies.mockResolvedValue(raw);
    formatMovie.mockImplementation(function (m) {
      return {
        id: m.id, title: m.title, overview: m.overview,
        release_date: m.release_date, vote_average: m.vote_average,
        vote_count: m.vote_count, poster_path: null, genre_ids: m.genre_ids,
      };
    });
    getWatchProviders.mockResolvedValue([]);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28, excludeIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(res.body.poolSizeAfterExclusion).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  test('poolSizeAfterExclusion equals full pool when no excludeIds given', async function () {
    setupMock(20);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(res.body.poolSizeAfterExclusion).toBe(20);
  });
});
