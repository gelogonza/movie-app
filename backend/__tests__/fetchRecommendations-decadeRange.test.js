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

describe('fetchRecommendations -- decadeRange parameter', function () {
  test('includes decadeRange with gte and lte in the POST body', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('happy', 28, [], { gte: '1980-01-01', lte: '1989-12-31' });

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.decadeRange).toEqual({ gte: '1980-01-01', lte: '1989-12-31' });
  });

  test('includes only gte when lte is null', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('happy', 28, [], { gte: '2020-01-01', lte: null });

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.decadeRange).toEqual({ gte: '2020-01-01' });
    expect(body.decadeRange).not.toHaveProperty('lte');
  });

  test('sends decadeRange as null when not provided', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('happy', 28, []);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.decadeRange).toBeNull();
  });

  test('sends decadeRange as null when null is passed explicitly', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('happy', 28, [], null);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.decadeRange).toBeNull();
  });

  test('sends decadeRange as null when undefined is passed', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('happy', 28, [], undefined);

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.decadeRange).toBeNull();
  });

  test('preserves mood, genreId, and excludeIds alongside decadeRange', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('sad', 35, [10, 20], { gte: '1990-01-01', lte: '1999-12-31' });

    var body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.mood).toBe('sad');
    expect(body.genreId).toBe(35);
    expect(body.excludeIds).toEqual([10, 20]);
    expect(body.decadeRange).toEqual({ gte: '1990-01-01', lte: '1999-12-31' });
  });

  test('never sends lte: null in the decadeRange object', async function () {
    mockFetchSuccess({ results: [], poolSizeAfterExclusion: 0 });

    await fetchRecommendations('excited', 28, [], { gte: '2020-01-01', lte: null });

    var raw = global.fetch.mock.calls[0][1].body;
    expect(raw).not.toContain('"lte":null');
    expect(raw).not.toContain('"lte": null');
  });
});
