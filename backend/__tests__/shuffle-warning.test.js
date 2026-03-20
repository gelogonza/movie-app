/**
 * @jest-environment jsdom
 */

var fs = require('fs');
var path = require('path');

window.scrollTo = jest.fn();
window.fetchRecommendations = jest.fn();
window.confirm = jest.fn().mockReturnValue(true);

// Minimal DOM required for DOMContentLoaded wiring in app.js
document.body.innerHTML =
  '<section id="mood-section" class="screen active">' +
    '<div class="mood-grid">' +
      '<button class="mood-card" data-mood="happy">Happy</button>' +
    '</div>' +
  '</section>' +
  '<section id="genre-section" class="screen">' +
    '<p id="mood-summary"></p>' +
    '<div class="genre-grid">' +
      '<button class="genre-pill" data-genre-id="28">Action</button>' +
    '</div>' +
    '<button id="back-to-mood">Back</button>' +
  '</section>' +
  '<section id="results-section" class="screen">' +
    '<p id="results-summary"></p>' +
    '<button id="copy-link-btn">Copy link</button>' +
    '<div id="watched-pool-warning" class="watched-pool-warning"></div>' +
    '<button id="shuffle-btn">Shuffle</button>' +
    '<div id="decade-filter" class="decade-filter">' +
      '<button class="decade-btn" data-decade="pre1970s">Pre 1970s</button>' +
      '<button class="decade-btn" data-decade="1970s">1970s</button>' +
      '<button class="decade-btn" data-decade="1980s">1980s</button>' +
      '<button class="decade-btn" data-decade="1990s">1990s</button>' +
      '<button class="decade-btn" data-decade="2000s">2000s</button>' +
      '<button class="decade-btn" data-decade="2010s">2010s</button>' +
      '<button class="decade-btn" data-decade="2020s">2020s</button>' +
    '</div>' +
    '<div id="loading-spinner" class="hidden">Finding your movies...</div>' +
    '<div id="movie-grid" class="movie-grid"></div>' +
    '<button id="start-over">Start over</button>' +
  '</section>' +
  '<button id="watchlist-toggle">Watchlist<span class="watchlist-count hidden"></span></button>' +
  '<button id="watched-toggle">Watched<span class="watched-count hidden"></span></button>' +
  '<div id="watchlist-panel" class="watchlist-panel">' +
    '<button id="watchlist-close">Close</button>' +
    '<p id="watchlist-empty-msg"></p>' +
    '<div id="watchlist-grid"></div>' +
  '</div>' +
  '<div id="watchlist-overlay" class="watchlist-overlay"></div>' +
  '<div id="watched-panel" class="watched-panel">' +
    '<button id="watched-close">Close</button>' +
    '<p id="watched-empty-msg"></p>' +
    '<div id="watched-grid"></div>' +
  '</div>' +
  '<div id="watched-overlay" class="watched-overlay"></div>' +
  '<div id="movie-modal-overlay" class="modal-overlay">' +
    '<div id="movie-modal">' +
      '<button id="modal-close">Close</button>' +
      '<div id="modal-backdrop" class="modal-backdrop"></div>' +
      '<div class="modal-body">' +
        '<h2 id="modal-title"></h2>' +
        '<p id="modal-tagline"></p>' +
        '<div class="modal-meta">' +
          '<span id="modal-rating"></span>' +
          '<span id="modal-year"></span>' +
          '<span id="modal-runtime"></span>' +
        '</div>' +
        '<div id="modal-genres"></div>' +
        '<p id="modal-overview"></p>' +
        '<div class="modal-people">' +
          '<div id="modal-director"></div>' +
          '<div id="modal-cast"></div>' +
        '</div>' +
        '<div id="modal-trailer"></div>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<button id="nav-burger" aria-label="Open menu" aria-expanded="false">' +
    '<span class="burger-line"></span>' +
  '</button>' +
  '<div id="nav-dropdown" class="nav-dropdown">' +
    '<button id="nav-watchlist-btn">Watchlist</button>' +
    '<button id="nav-watched-btn">Watched</button>' +
  '</div>';

var appPath = path.join(__dirname, '..', '..', 'frontend', 'js', 'app.js');
var appCode = fs.readFileSync(appPath, 'utf8');
(1, eval)(appCode);

// DOMContentLoaded has already fired in jsdom before eval, so re-dispatch
// to attach the click handlers wired inside that callback.
document.dispatchEvent(new Event('DOMContentLoaded'));

function fakeMovie(id) {
  return {
    id: id,
    title: 'Movie ' + id,
    vote_average: 7.5,
    release_date: '2024-01-01',
    overview: 'A great film.',
    poster_path: null,
    streamingProviders: [],
  };
}

// Waits for pending microtasks (resolved promises) to flush
function flushPromises() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

beforeEach(function () {
  localStorage.clear();
  window.fetchRecommendations = jest.fn();
  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('movie-grid').innerHTML = '';
  document.getElementById('watched-pool-warning').textContent = '';
  selectedMood = null;
  selectedGenreId = null;
});

// --- shuffleResults ---

describe('shuffleResults', function () {
  test('returns early without showing spinner when selectedMood is null', async function () {
    selectedMood = null;
    selectedGenreId = 28;

    await shuffleResults();

    expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('returns early without showing spinner when selectedGenreId is null', async function () {
    selectedMood = 'happy';
    selectedGenreId = null;

    await shuffleResults();

    expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('calls fetchRecommendations with current mood, genre, and watched IDs', async function () {
    selectedMood = 'sad';
    selectedGenreId = 35;
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 10 }, { id: 20 }]));
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(99)],
      poolSizeAfterExclusion: 18,
    });

    await shuffleResults();

    expect(window.fetchRecommendations).toHaveBeenCalledWith('sad', 35, [10, 20], null);
  });

  test('renders movies and hides spinner on successful fetch', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1), fakeMovie(2)],
      poolSizeAfterExclusion: 20,
    });

    await shuffleResults();

    var grid = document.getElementById('movie-grid');
    expect(grid.querySelectorAll('.movie-card').length).toBe(2);
    expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
  });

  test('shows error card and hides spinner when fetch fails', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockRejectedValue(new Error('Network error'));

    await shuffleResults();

    var grid = document.getElementById('movie-grid');
    expect(grid.querySelectorAll('.movie-card').length).toBe(1);
    expect(grid.querySelector('.movie-card').textContent).toBe('Something went wrong. Please try again.');
    expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
  });

  test('shows warning when poolSizeAfterExclusion is below 15', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 8,
    });

    await shuffleResults();

    var warning = document.getElementById('watched-pool-warning');
    expect(warning.textContent).toBe(
      'You have seen most of our picks for this combination. Try a different genre for more variety.'
    );
  });

  test('clears warning when poolSizeAfterExclusion is 15 or above', async function () {
    document.getElementById('watched-pool-warning').textContent = 'old warning';
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1), fakeMovie(2)],
      poolSizeAfterExclusion: 25,
    });

    await shuffleResults();

    expect(document.getElementById('watched-pool-warning').textContent).toBe('');
  });
});

// --- genre pill click handler ---

describe('genre pill click handler', function () {
  test('shows warning when poolSizeAfterExclusion is below 15', async function () {
    selectedMood = 'happy';
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 5,
    });

    document.querySelector('.genre-pill').click();
    await flushPromises();

    var warning = document.getElementById('watched-pool-warning');
    expect(warning.textContent).toBe(
      'You have seen most of our picks for this combination. Try a different genre for more variety.'
    );
  });
});

// --- navigation handlers clear warning ---

describe('navigation handlers clear watched-pool-warning', function () {
  test('start-over clears the warning text', function () {
    document.getElementById('watched-pool-warning').textContent = 'Some warning';

    document.getElementById('start-over').click();

    expect(document.getElementById('watched-pool-warning').textContent).toBe('');
  });

  test('back-to-mood clears the warning text', function () {
    document.getElementById('watched-pool-warning').textContent = 'Some warning';

    document.getElementById('back-to-mood').click();

    expect(document.getElementById('watched-pool-warning').textContent).toBe('');
  });
});
