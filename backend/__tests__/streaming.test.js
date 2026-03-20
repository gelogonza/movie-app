const axios = require('axios');
const { getWatchProviders } = require('../routes/tmdb');

jest.mock('axios');

beforeEach(function () {
  jest.clearAllMocks();
  process.env.TMDB_API_KEY = 'test-api-key';
});

describe('getWatchProviders', function () {
  test('returns mapped providers when US flatrate data exists', async function () {
    axios.get.mockResolvedValue({
      data: {
        results: {
          US: {
            flatrate: [
              { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' },
              { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg' },
            ],
          },
        },
      },
    });

    var result = await getWatchProviders(550);

    expect(result).toEqual([
      { provider_id: 8, provider_name: 'Netflix', logo_url: 'https://image.tmdb.org/t/p/w92/netflix.jpg' },
      { provider_id: 337, provider_name: 'Disney Plus', logo_url: 'https://image.tmdb.org/t/p/w92/disney.jpg' },
    ]);
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/550/watch/providers',
      { params: { api_key: 'test-api-key' } }
    );
  });

  test('returns empty array when US region has no flatrate key', async function () {
    axios.get.mockResolvedValue({
      data: {
        results: {
          US: {
            rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg' }],
            buy: [{ provider_id: 3, provider_name: 'Google Play', logo_path: '/gplay.jpg' }],
          },
        },
      },
    });

    var result = await getWatchProviders(550);

    expect(result).toEqual([]);
  });

  test('returns empty array when results have no US region', async function () {
    axios.get.mockResolvedValue({
      data: {
        results: {
          GB: {
            flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }],
          },
        },
      },
    });

    var result = await getWatchProviders(550);

    expect(result).toEqual([]);
  });

  test('returns empty array when the API call fails', async function () {
    axios.get.mockRejectedValue(new Error('Network Error'));

    var result = await getWatchProviders(550);

    expect(result).toEqual([]);
  });
});
