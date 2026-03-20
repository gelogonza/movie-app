/**
 * @jest-environment jsdom
 */

var fs = require('fs');
var path = require('path');

window.scrollTo = jest.fn();
window.fetchRecommendations = jest.fn();
window.confirm = jest.fn().mockReturnValue(true);

// jsdom does not implement navigator.clipboard so we provide a mock
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// jsdom does not implement window.history.replaceState, provide a spy
var originalReplaceState = window.history.replaceState;
window.history.replaceState = jest.fn();

document.body.innerHTML =
  '<section id="mood-section" class="screen active">' +
    '<div class="mood-grid">' +
      '<button class="mood-card" data-mood="happy">Happy</button>' +
      '<button class="mood-card" data-mood="excited">Excited</button>' +
    '</div>' +
  '</section>' +
  '<section id="genre-section" class="screen">' +
    '<p id="mood-summary"></p>' +
    '<div class="genre-grid">' +
      '<button class="genre-pill" data-genre-id="28">Action</button>' +
      '<button class="genre-pill" data-genre-id="35">Comedy</button>' +
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

function flushPromises() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

beforeEach(function () {
  localStorage.clear();
  window.fetchRecommendations = jest.fn();
  window.history.replaceState.mockClear();
  navigator.clipboard.writeText.mockClear();
  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('movie-grid').innerHTML = '';
  document.getElementById('watched-pool-warning').textContent = '';
  document.getElementById('copy-link-btn').textContent = 'Copy link';
  var allBtns = document.querySelectorAll('.decade-btn');
  for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('decade-btn--active');
  selectedMood = null;
  selectedGenreId = null;
  selectedDecade = null;
});

// --- DECADE_RANGES constant ---

describe('DECADE_RANGES constant', function () {
  test('contains all seven expected decade keys', function () {
    expect(DECADE_RANGES).toHaveProperty('pre1970s');
    expect(DECADE_RANGES).toHaveProperty('1970s');
    expect(DECADE_RANGES).toHaveProperty('1980s');
    expect(DECADE_RANGES).toHaveProperty('1990s');
    expect(DECADE_RANGES).toHaveProperty('2000s');
    expect(DECADE_RANGES).toHaveProperty('2010s');
    expect(DECADE_RANGES).toHaveProperty('2020s');
  });

  test('pre1970s ranges from 1900 to 1969', function () {
    expect(DECADE_RANGES.pre1970s.gte).toBe('1900-01-01');
    expect(DECADE_RANGES.pre1970s.lte).toBe('1969-12-31');
  });

  test('2020s has gte but null lte since it is ongoing', function () {
    expect(DECADE_RANGES['2020s'].gte).toBe('2020-01-01');
    expect(DECADE_RANGES['2020s'].lte).toBeNull();
  });
});

// --- handleDecadeFilter ---

describe('handleDecadeFilter', function () {
  test('sets selectedDecade and adds active class to clicked button', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await handleDecadeFilter('1980s');

    expect(selectedDecade).toEqual({ gte: '1980-01-01', lte: '1989-12-31' });
    var btn = document.querySelector('.decade-btn[data-decade="1980s"]');
    expect(btn.classList.contains('decade-btn--active')).toBe(true);
  });

  test('deselects when clicking the already-active decade', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await handleDecadeFilter('1990s');
    expect(selectedDecade).toEqual({ gte: '1990-01-01', lte: '1999-12-31' });

    await handleDecadeFilter('1990s');
    expect(selectedDecade).toBeNull();

    var btn = document.querySelector('.decade-btn[data-decade="1990s"]');
    expect(btn.classList.contains('decade-btn--active')).toBe(false);
  });

  test('switches active class when selecting a different decade', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await handleDecadeFilter('1970s');
    await handleDecadeFilter('2000s');

    var oldBtn = document.querySelector('.decade-btn[data-decade="1970s"]');
    var newBtn = document.querySelector('.decade-btn[data-decade="2000s"]');
    expect(oldBtn.classList.contains('decade-btn--active')).toBe(false);
    expect(newBtn.classList.contains('decade-btn--active')).toBe(true);
    expect(selectedDecade).toEqual({ gte: '2000-01-01', lte: '2009-12-31' });
  });

  test('calls fetchRecommendations with the selected decade', async function () {
    selectedMood = 'sad';
    selectedGenreId = 35;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await handleDecadeFilter('1980s');

    expect(window.fetchRecommendations).toHaveBeenCalledWith(
      'sad', 35, [], { gte: '1980-01-01', lte: '1989-12-31' }
    );
  });

  test('calls fetchRecommendations with null when deselecting', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await handleDecadeFilter('2010s');
    window.fetchRecommendations.mockClear();
    await handleDecadeFilter('2010s');

    expect(window.fetchRecommendations).toHaveBeenCalledWith(
      'happy', 28, [], null
    );
  });

  test('shows error card when fetch fails', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockRejectedValue(new Error('fail'));

    await handleDecadeFilter('pre1970s');

    var grid = document.getElementById('movie-grid');
    expect(grid.querySelector('.movie-card').textContent).toBe('Something went wrong. Please try again.');
    expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
  });

  test('shows pool warning when poolSizeAfterExclusion is below 15', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 5,
    });

    await handleDecadeFilter('1970s');

    var warning = document.getElementById('watched-pool-warning');
    expect(warning.textContent).toContain('You have seen most of our picks');
  });
});

// --- shuffleResults preserves decade filter ---

describe('shuffleResults with decade filter', function () {
  test('passes selectedDecade to fetchRecommendations', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    selectedDecade = { gte: '1980-01-01', lte: '1989-12-31' };
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await shuffleResults();

    expect(window.fetchRecommendations).toHaveBeenCalledWith(
      'happy', 28, [], { gte: '1980-01-01', lte: '1989-12-31' }
    );
  });

  test('passes null when no decade is selected', async function () {
    selectedMood = 'happy';
    selectedGenreId = 28;
    selectedDecade = null;
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await shuffleResults();

    expect(window.fetchRecommendations).toHaveBeenCalledWith(
      'happy', 28, [], null
    );
  });
});

// --- genre pill resets decade ---

describe('genre pill click resets decade filter', function () {
  test('resets selectedDecade to null and removes active class from decade buttons', async function () {
    selectedMood = 'happy';
    selectedDecade = { gte: '1980-01-01', lte: '1989-12-31' };
    document.querySelector('.decade-btn[data-decade="1980s"]').classList.add('decade-btn--active');
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    document.querySelector('.genre-pill[data-genre-id="28"]').click();
    await flushPromises();

    expect(selectedDecade).toBeNull();
    var activeButtons = document.querySelectorAll('.decade-btn--active');
    expect(activeButtons.length).toBe(0);
  });

  test('passes null as decadeRange to fetchRecommendations', async function () {
    selectedMood = 'happy';
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    document.querySelector('.genre-pill[data-genre-id="35"]').click();
    await flushPromises();

    expect(window.fetchRecommendations).toHaveBeenCalledWith(
      'happy', 35, [], null
    );
  });

  test('calls updatePageURL via history.replaceState', async function () {
    selectedMood = 'happy';
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    document.querySelector('.genre-pill[data-genre-id="28"]').click();
    await flushPromises();

    expect(window.history.replaceState).toHaveBeenCalled();
    var urlArg = window.history.replaceState.mock.calls[0][2];
    expect(urlArg).toContain('mood=happy');
    expect(urlArg).toContain('genreId=28');
  });
});

// --- navigation handlers reset decade and clear URL ---

describe('navigation handlers reset decade and clear URL params', function () {
  test('start-over resets selectedDecade and clears URL', function () {
    selectedDecade = { gte: '1980-01-01', lte: '1989-12-31' };
    document.querySelector('.decade-btn[data-decade="1980s"]').classList.add('decade-btn--active');

    document.getElementById('start-over').click();

    expect(selectedDecade).toBeNull();
    expect(document.querySelectorAll('.decade-btn--active').length).toBe(0);
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  test('back-to-mood resets selectedDecade and clears URL', function () {
    selectedDecade = { gte: '2010-01-01', lte: '2019-12-31' };
    document.querySelector('.decade-btn[data-decade="2010s"]').classList.add('decade-btn--active');

    document.getElementById('back-to-mood').click();

    expect(selectedDecade).toBeNull();
    expect(document.querySelectorAll('.decade-btn--active').length).toBe(0);
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});

// --- updatePageURL ---

describe('updatePageURL', function () {
  test('calls replaceState with mood and genreId params', function () {
    updatePageURL('sad', 18);

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null, '', expect.stringContaining('mood=sad')
    );
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null, '', expect.stringContaining('genreId=18')
    );
  });

  test('does not cause a full page reload (uses replaceState not assign)', function () {
    updatePageURL('happy', 35);

    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
  });
});

// --- loadFromURL ---

describe('loadFromURL', function () {
  test('loads results when valid mood and genreId are in the URL', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=35', href: '', pathname: '/' };
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await loadFromURL();

    expect(selectedMood).toBe('happy');
    expect(selectedGenreId).toBe(35);
    expect(window.fetchRecommendations).toHaveBeenCalledWith('happy', 35, [], null);
    expect(document.getElementById('results-summary').textContent).toBe('Happy - Comedy');
  });

  test('sets the correct genre name for known IDs', async function () {
    delete window.location;
    window.location = { search: '?mood=sad&genreId=27', href: '', pathname: '/' };
    window.fetchRecommendations.mockResolvedValue({
      results: [fakeMovie(1)],
      poolSizeAfterExclusion: 20,
    });

    await loadFromURL();

    expect(document.getElementById('results-summary').textContent).toBe('Sad - Horror');
  });

  test('uses Unknown for an unrecognized genreId', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=999', href: '', pathname: '/' };
    window.fetchRecommendations.mockResolvedValue({
      results: [],
      poolSizeAfterExclusion: 0,
    });

    await loadFromURL();

    expect(document.getElementById('results-summary').textContent).toBe('Happy - Unknown');
  });

  test('does nothing when mood param is missing', async function () {
    delete window.location;
    window.location = { search: '?genreId=28', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedMood).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('does nothing when genreId param is missing', async function () {
    delete window.location;
    window.location = { search: '?mood=happy', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedGenreId).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('does nothing when mood is invalid', async function () {
    delete window.location;
    window.location = { search: '?mood=angry&genreId=28', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedMood).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('does nothing when genreId is not a positive integer', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=-5', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedGenreId).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('does nothing when genreId is zero', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=0', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedGenreId).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('does nothing when genreId is not a number', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=abc', href: '', pathname: '/' };

    await loadFromURL();

    expect(selectedGenreId).toBeNull();
    expect(window.fetchRecommendations).not.toHaveBeenCalled();
  });

  test('shows error card when fetch fails', async function () {
    delete window.location;
    window.location = { search: '?mood=happy&genreId=28', href: '', pathname: '/' };
    window.fetchRecommendations.mockRejectedValue(new Error('Network error'));

    await loadFromURL();

    var grid = document.getElementById('movie-grid');
    expect(grid.querySelector('.movie-card').textContent).toBe('Something went wrong. Please try again.');
  });

  test('passes null for decadeRange', async function () {
    delete window.location;
    window.location = { search: '?mood=excited&genreId=28', href: '', pathname: '/' };
    window.fetchRecommendations.mockResolvedValue({
      results: [],
      poolSizeAfterExclusion: 0,
    });

    await loadFromURL();

    var callArgs = window.fetchRecommendations.mock.calls[0];
    expect(callArgs[3]).toBeNull();
  });
});

// --- copy link button ---

describe('copy link button', function () {
  test('calls navigator.clipboard.writeText with current URL', async function () {
    delete window.location;
    window.location = { href: 'https://movierecs.vercel.app?mood=happy&genreId=35', search: '', pathname: '/' };

    document.getElementById('copy-link-btn').click();
    await flushPromises();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://movierecs.vercel.app?mood=happy&genreId=35'
    );
  });

  test('changes button text to Copied on success', async function () {
    navigator.clipboard.writeText.mockResolvedValue(undefined);
    delete window.location;
    window.location = { href: 'https://example.com', search: '', pathname: '/' };

    document.getElementById('copy-link-btn').click();
    await flushPromises();

    var btn = document.getElementById('copy-link-btn');
    expect(btn.textContent).toBe('Copied');
    expect(btn.classList.contains('copied')).toBe(true);
  });

  test('changes button text to Copy failed when clipboard rejects', async function () {
    navigator.clipboard.writeText.mockRejectedValue(new Error('denied'));
    delete window.location;
    window.location = { href: 'https://example.com', search: '', pathname: '/' };

    document.getElementById('copy-link-btn').click();
    await flushPromises();

    var btn = document.getElementById('copy-link-btn');
    expect(btn.textContent).toBe('Copy failed');
  });
});
