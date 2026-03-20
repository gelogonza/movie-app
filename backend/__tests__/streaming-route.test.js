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
}

beforeEach(function () {
  jest.clearAllMocks();
});

describe('POST /recommend -- streaming provider enrichment', function () {
  test('every movie in the response has a streamingProviders array', async function () {
    setupMock(20);
    getWatchProviders.mockResolvedValue([]);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    res.body.results.forEach(function (movie) {
      expect(movie).toHaveProperty('streamingProviders');
      expect(Array.isArray(movie.streamingProviders)).toBe(true);
    });
  });

  test('attaches provider data returned by getWatchProviders to each movie', async function () {
    setupMock(20);
    var fakeProviders = [
      { provider_id: 8, provider_name: 'Netflix', logo_url: 'https://image.tmdb.org/t/p/w92/netflix.jpg' },
    ];
    getWatchProviders.mockResolvedValue(fakeProviders);

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    res.body.results.forEach(function (movie) {
      expect(movie.streamingProviders).toEqual(fakeProviders);
    });
  });

  test('falls back to empty streamingProviders when getWatchProviders rejects', async function () {
    setupMock(20);
    getWatchProviders.mockRejectedValue(new Error('provider failure'));

    var res = await request(app)
      .post('/recommend')
      .send({ mood: 'happy', genreId: 28 });

    expect(res.status).toBe(200);
    res.body.results.forEach(function (movie) {
      expect(movie.streamingProviders).toEqual([]);
    });
  });
});
