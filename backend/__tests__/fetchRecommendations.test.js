/**
 * @jest-environment jsdom
 */

var fs = require('fs');
var path = require('path');

global.fetch = jest.fn();

var apiPath = path.join(__dirname, '..', '..', 'frontend', 'js', 'api.js');
var apiCode = fs.readFileSync(apiPath, 'utf8');
(1, eval)(apiCode);

beforeEach(function () {
  global.fetch.mockReset();
});

function mockFetchSuccess(data) {
  global.fetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(data),
  });
}

describe('fetchRecommendations -- excludeIds parameter', function () {
  test('includes excludeIds in the POST body', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('happy', 28, [10, 20]);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.excludeIds).toEqual([10, 20]);
  });

  test('defaults excludeIds to empty array when omitted', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('happy', 28);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.excludeIds).toEqual([]);
  });

  test('defaults excludeIds to empty array when null is passed', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('happy', 28, null);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.excludeIds).toEqual([]);
  });

  test('sends mood and genreId alongside excludeIds', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('sad', 35, [1]);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.mood).toBe('sad');
    expect(body.genreId).toBe(35);
    expect(body.excludeIds).toEqual([1]);
  });

  test('sends an empty array when given one', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('excited', 28, []);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.excludeIds).toEqual([]);
  });

  test('coerces genreId to a number', async function () {
    mockFetchSuccess([]);

    await fetchRecommendations('happy', '35', []);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.genreId).toBe(35);
  });
});
