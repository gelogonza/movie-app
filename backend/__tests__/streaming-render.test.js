/**
 * @jest-environment jsdom
 */

var fs = require('fs');
var path = require('path');

window.scrollTo = jest.fn();
window.fetchRecommendations = jest.fn();

var appPath = path.join(__dirname, '..', '..', 'frontend', 'js', 'app.js');
var appCode = fs.readFileSync(appPath, 'utf8');
(1, eval)(appCode);

beforeEach(function () {
  localStorage.clear();
  document.body.innerHTML = '<div id="movie-grid" class="movie-grid"></div>';
});

function makeMovie(id, providers) {
  return {
    id: id,
    title: 'Movie ' + id,
    vote_average: 7.5,
    release_date: '2024-01-01',
    overview: 'A great film.',
    poster_path: null,
    streamingProviders: providers,
  };
}

describe('renderMovies -- streaming providers display', function () {
  test('creates a streaming-providers div with label when movie has providers', function () {
    renderMovies([makeMovie(1, [
      { provider_id: 8, provider_name: 'Netflix', logo_url: 'https://image.tmdb.org/t/p/w92/netflix.jpg' },
    ])]);

    var container = document.querySelector('.streaming-providers');
    expect(container).not.toBeNull();

    var label = container.querySelector('.streaming-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Stream on:');
  });

  test('creates one logo img per provider with correct attributes', function () {
    renderMovies([makeMovie(1, [
      { provider_id: 8, provider_name: 'Netflix', logo_url: 'https://image.tmdb.org/t/p/w92/netflix.jpg' },
      { provider_id: 337, provider_name: 'Disney Plus', logo_url: 'https://image.tmdb.org/t/p/w92/disney.jpg' },
    ])]);

    var logos = document.querySelectorAll('.streaming-logo');
    expect(logos.length).toBe(2);

    expect(logos[0].src).toBe('https://image.tmdb.org/t/p/w92/netflix.jpg');
    expect(logos[0].alt).toBe('Netflix');
    expect(logos[0].title).toBe('Netflix');
    expect(logos[0].getAttribute('width')).toBe('28');
    expect(logos[0].getAttribute('height')).toBe('28');

    expect(logos[1].src).toBe('https://image.tmdb.org/t/p/w92/disney.jpg');
    expect(logos[1].alt).toBe('Disney Plus');
  });

  test('does not create streaming-providers div when array is empty', function () {
    renderMovies([makeMovie(1, [])]);

    expect(document.querySelector('.streaming-providers')).toBeNull();
  });
});
