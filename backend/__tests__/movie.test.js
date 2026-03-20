const axios = require('axios');
const request = require('supertest');
const { getMovieDetails } = require('../routes/tmdb');
const app = require('../server');

jest.mock('axios');

const fakeMoveData = {
  id: 550,
  title: 'Fight Club',
  tagline: 'Mischief. Mayhem. Soap.',
  overview: 'An insomniac office worker and a soap salesman build a global organization.',
  runtime: 112,
  backdrop_path: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
  vote_average: 8.4,
  vote_count: 26000,
  release_date: '1999-10-15',
};

const fakeCreditsData = {
  crew: [
    { job: 'Director', name: 'David Fincher' },
    { job: 'Producer', name: 'Art Linson' },
  ],
  cast: [
    { name: 'Brad Pitt', character: 'Tyler Durden', profile_path: '/brad.jpg' },
    { name: 'Edward Norton', character: 'The Narrator', profile_path: '/edward.jpg' },
    { name: 'Helena Bonham Carter', character: 'Marla Singer', profile_path: '/helena.jpg' },
    { name: 'Meat Loaf', character: 'Robert Paulson', profile_path: '/meat.jpg' },
    { name: 'Jared Leto', character: 'Angel Face', profile_path: '/jared.jpg' },
    { name: 'Zach Grenier', character: 'Richard Chesler', profile_path: '/zach.jpg' },
  ],
};

const fakeVideosData = {
  results: [
    { type: 'Trailer', site: 'YouTube', key: 'SUXWAEX2jlg' },
    { type: 'Teaser', site: 'YouTube', key: 'abc123' },
  ],
};

function mockTmdbSuccess(movieData, creditsData, videosData) {
  axios.get
    .mockResolvedValueOnce({ data: movieData || fakeMoveData })
    .mockResolvedValueOnce({ data: creditsData || fakeCreditsData })
    .mockResolvedValueOnce({ data: videosData || fakeVideosData });
}

// Tests for the getMovieDetails function in tmdb.js
describe('getMovieDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  test('returns correctly shaped object with all required fields when TMDB responds successfully', async () => {
    mockTmdbSuccess();

    const result = await getMovieDetails(550);

    expect(result).toEqual({
      id: 550,
      title: 'Fight Club',
      tagline: 'Mischief. Mayhem. Soap.',
      overview: 'An insomniac office worker and a soap salesman build a global organization.',
      runtime: '1h 52m',
      backdrop_url: 'https://image.tmdb.org/t/p/w1280/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
      poster_url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
      vote_average: 8.4,
      vote_count: 26000,
      release_date: '1999-10-15',
      director: 'David Fincher',
      cast: [
        { name: 'Brad Pitt', character: 'Tyler Durden', profile_url: 'https://image.tmdb.org/t/p/w185/brad.jpg' },
        { name: 'Edward Norton', character: 'The Narrator', profile_url: 'https://image.tmdb.org/t/p/w185/edward.jpg' },
        { name: 'Helena Bonham Carter', character: 'Marla Singer', profile_url: 'https://image.tmdb.org/t/p/w185/helena.jpg' },
        { name: 'Meat Loaf', character: 'Robert Paulson', profile_url: 'https://image.tmdb.org/t/p/w185/meat.jpg' },
      ],
      trailer_key: 'SUXWAEX2jlg',
    });
  });

  test('formats runtime of 112 minutes as 1h 52m', async () => {
    mockTmdbSuccess({ ...fakeMoveData, runtime: 112 });

    const result = await getMovieDetails(550);

    expect(result.runtime).toBe('1h 52m');
  });

  test('formats runtime of 60 minutes as 1h 0m', async () => {
    mockTmdbSuccess({ ...fakeMoveData, runtime: 60 });

    const result = await getMovieDetails(550);

    expect(result.runtime).toBe('1h 0m');
  });

  test('formats runtime of 90 minutes as 1h 30m', async () => {
    mockTmdbSuccess({ ...fakeMoveData, runtime: 90 });

    const result = await getMovieDetails(550);

    expect(result.runtime).toBe('1h 30m');
  });

  test('returns null for runtime when runtime is 0', async () => {
    mockTmdbSuccess({ ...fakeMoveData, runtime: 0 });

    const result = await getMovieDetails(550);

    expect(result.runtime).toBeNull();
  });

  test('returns null for runtime when runtime is null', async () => {
    mockTmdbSuccess({ ...fakeMoveData, runtime: null });

    const result = await getMovieDetails(550);

    expect(result.runtime).toBeNull();
  });

  test('returns null for backdrop_url when backdrop_path is null', async () => {
    mockTmdbSuccess({ ...fakeMoveData, backdrop_path: null });

    const result = await getMovieDetails(550);

    expect(result.backdrop_url).toBeNull();
  });

  test('returns null for backdrop_url when backdrop_path is empty string', async () => {
    mockTmdbSuccess({ ...fakeMoveData, backdrop_path: '' });

    const result = await getMovieDetails(550);

    expect(result.backdrop_url).toBeNull();
  });

  test('returns null for trailer_key when no trailer exists in videos response', async () => {
    mockTmdbSuccess(null, null, { results: [] });

    const result = await getMovieDetails(550);

    expect(result.trailer_key).toBeNull();
  });

  test('returns null for trailer_key when videos exist but none have type Trailer and site YouTube', async () => {
    mockTmdbSuccess(null, null, {
      results: [
        { type: 'Teaser', site: 'YouTube', key: 'teaser1' },
        { type: 'Trailer', site: 'Vimeo', key: 'vimeo1' },
        { type: 'Featurette', site: 'YouTube', key: 'feat1' },
      ],
    });

    const result = await getMovieDetails(550);

    expect(result.trailer_key).toBeNull();
  });

  test('returns correct trailer_key when a matching video exists', async () => {
    mockTmdbSuccess(null, null, {
      results: [
        { type: 'Teaser', site: 'YouTube', key: 'teaser1' },
        { type: 'Trailer', site: 'YouTube', key: 'correctKey' },
      ],
    });

    const result = await getMovieDetails(550);

    expect(result.trailer_key).toBe('correctKey');
  });

  test('returns null for director when no Director is found in crew', async () => {
    mockTmdbSuccess(null, { crew: [{ job: 'Producer', name: 'Some Producer' }], cast: fakeCreditsData.cast });

    const result = await getMovieDetails(550);

    expect(result.director).toBeNull();
  });

  test('returns only the first 4 cast members even when more are available', async () => {
    mockTmdbSuccess();

    const result = await getMovieDetails(550);

    expect(result.cast).toHaveLength(4);
    expect(result.cast[0].name).toBe('Brad Pitt');
    expect(result.cast[3].name).toBe('Meat Loaf');
  });

  test('returns null for profile_url on a cast member when profile_path is null', async () => {
    const creditsWithNull = {
      ...fakeCreditsData,
      cast: [
        { name: 'No Photo Actor', character: 'Nobody', profile_path: null },
        ...fakeCreditsData.cast.slice(1),
      ],
    };
    mockTmdbSuccess(null, creditsWithNull);

    const result = await getMovieDetails(550);

    expect(result.cast[0].profile_url).toBeNull();
  });

  test('throws with message Failed to fetch movie details when axios rejects', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    await expect(getMovieDetails(550)).rejects.toThrow('Failed to fetch movie details');
  });
});

// Tests for the GET /movie/:id route in server.js
describe('GET /movie/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  test('returns 200 with correctly shaped movie object for a valid numeric id', async () => {
    mockTmdbSuccess();

    const res = await request(app).get('/movie/550');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(550);
    expect(res.body.title).toBe('Fight Club');
    expect(res.body.director).toBe('David Fincher');
    expect(res.body.cast).toHaveLength(4);
    expect(res.body.trailer_key).toBe('SUXWAEX2jlg');
  });

  test('returns 400 with error message for id of abc', async () => {
    const res = await request(app).get('/movie/abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid movie id' });
  });

  test('returns 400 with error message for id of 0', async () => {
    const res = await request(app).get('/movie/0');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid movie id' });
  });

  test('returns 400 with error message for a negative number', async () => {
    const res = await request(app).get('/movie/-5');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid movie id' });
  });

  test('returns 502 when getMovieDetails throws Failed to fetch movie details', async () => {
    axios.get.mockRejectedValue(new Error('Failed to fetch movie details'));

    const res = await request(app).get('/movie/550');

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Failed to fetch movie details from TMDB' });
  });

  test('returns 500 for any other unexpected error', async () => {
    axios.get
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: fakeCreditsData })
      .mockResolvedValueOnce({ data: fakeVideosData });

    const res = await request(app).get('/movie/550');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong on the server' });
  });
});
