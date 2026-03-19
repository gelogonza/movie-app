const axios = require('axios');
const { discoverMovies, formatMovie } = require('../routes/tmdb');

jest.mock('axios');

// --- formatMovie ---

describe('formatMovie', () => {
  test('returns only the required fields with a full poster URL', () => {
    const raw = {
      id: 123,
      title: 'Test Movie',
      overview: 'A test movie overview.',
      release_date: '2024-01-15',
      vote_average: 7.5,
      vote_count: 500,
      poster_path: '/abc123.jpg',
      genre_ids: [28, 35],
      adult: false,
      backdrop_path: '/backdrop.jpg',
      original_language: 'en',
      popularity: 100.5,
      video: false,
    };

    const result = formatMovie(raw);

    expect(result).toEqual({
      id: 123,
      title: 'Test Movie',
      overview: 'A test movie overview.',
      release_date: '2024-01-15',
      vote_average: 7.5,
      vote_count: 500,
      poster_path: 'https://image.tmdb.org/t/p/w500/abc123.jpg',
      genre_ids: [28, 35],
    });
  });

  test('strips extra TMDB fields that the client does not need', () => {
    const raw = {
      id: 1,
      title: 'X',
      overview: '',
      release_date: '',
      vote_average: 0,
      vote_count: 0,
      poster_path: '/x.jpg',
      genre_ids: [],
      adult: true,
      backdrop_path: '/bg.jpg',
      original_title: 'X Original',
      popularity: 999,
    };

    const result = formatMovie(raw);

    expect(result).not.toHaveProperty('adult');
    expect(result).not.toHaveProperty('backdrop_path');
    expect(result).not.toHaveProperty('original_title');
    expect(result).not.toHaveProperty('popularity');
  });

  test('returns null poster_path when the raw value is null', () => {
    const raw = {
      id: 456,
      title: 'No Poster',
      overview: 'No poster available.',
      release_date: '2023-06-01',
      vote_average: 6.0,
      vote_count: 200,
      poster_path: null,
      genre_ids: [18],
    };

    const result = formatMovie(raw);

    expect(result.poster_path).toBeNull();
  });

  test('returns null poster_path when the raw value is an empty string', () => {
    const raw = {
      id: 789,
      title: 'Empty Poster',
      overview: '',
      release_date: '2022-03-10',
      vote_average: 5.0,
      vote_count: 50,
      poster_path: '',
      genre_ids: [27],
    };

    const result = formatMovie(raw);

    expect(result.poster_path).toBeNull();
  });
});

// --- discoverMovies ---

describe('discoverMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  test('fetches page 1 and page 2 in parallel with correct parameters', async () => {
    axios.get.mockResolvedValue({ data: { results: [] } });

    const filters = { with_genres: 28, sort_by: 'popularity.desc' };
    await discoverMovies(filters);

    expect(axios.get).toHaveBeenCalledTimes(2);

    const page1Params = axios.get.mock.calls[0][1].params;
    const page2Params = axios.get.mock.calls[1][1].params;

    for (const params of [page1Params, page2Params]) {
      expect(params.api_key).toBe('test-api-key');
      expect(params.language).toBe('en-US');
      expect(params.include_adult).toBe(false);
      expect(params.include_video).toBe(false);
      expect(params.with_genres).toBe(28);
      expect(params.sort_by).toBe('popularity.desc');
    }

    expect(page1Params.page).toBe(1);
    expect(page2Params.page).toBe(2);
  });

  test('merges results from both pages into a single array', async () => {
    const page1Movies = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
    const page2Movies = [{ id: 3, title: 'C' }, { id: 4, title: 'D' }];

    axios.get
      .mockResolvedValueOnce({ data: { results: page1Movies } })
      .mockResolvedValueOnce({ data: { results: page2Movies } });

    const results = await discoverMovies({});

    expect(results).toEqual([...page1Movies, ...page2Movies]);
    expect(results).toHaveLength(4);
  });

  test('deduplicates movies that appear on both pages by id', async () => {
    const page1Movies = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
    const page2Movies = [{ id: 2, title: 'B' }, { id: 3, title: 'C' }];

    axios.get
      .mockResolvedValueOnce({ data: { results: page1Movies } })
      .mockResolvedValueOnce({ data: { results: page2Movies } });

    const results = await discoverMovies({});

    expect(results).toHaveLength(3);
    const ids = results.map((m) => m.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  test('throws an error with the status code when TMDB returns non-200', async () => {
    axios.get.mockRejectedValue({
      response: { status: 401 },
    });

    await expect(discoverMovies({})).rejects.toThrow('TMDB returned status 401');
  });

  test('throws when only the second page request fails', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockRejectedValueOnce({ response: { status: 429 } });

    await expect(discoverMovies({})).rejects.toThrow('TMDB returned status 429');
  });

  test('re-throws network errors that have no response object', async () => {
    const networkError = new Error('Network Error');
    networkError.code = 'ECONNREFUSED';

    axios.get.mockRejectedValue(networkError);

    await expect(discoverMovies({})).rejects.toThrow('Network Error');
  });
});
