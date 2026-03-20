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
  jest.restoreAllMocks();
});

// --- localStorage utilities ---

describe('getWatchedList', function () {
  test('returns empty array when key does not exist', function () {
    expect(getWatchedList()).toEqual([]);
  });

  test('returns parsed array from localStorage', function () {
    var movies = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
    localStorage.setItem('moviemood_watched', JSON.stringify(movies));

    expect(getWatchedList()).toEqual(movies);
  });

  test('returns empty array on invalid JSON', function () {
    localStorage.setItem('moviemood_watched', '{{{bad');

    expect(getWatchedList()).toEqual([]);
  });

  test('returns empty array when stored value parses to null', function () {
    localStorage.setItem('moviemood_watched', 'null');

    expect(getWatchedList()).toEqual([]);
  });
});

describe('saveWatchedList', function () {
  test('writes JSON to the moviemood_watched key', function () {
    var movies = [{ id: 10, title: 'Test' }];
    saveWatchedList(movies);

    expect(JSON.parse(localStorage.getItem('moviemood_watched'))).toEqual(movies);
  });

  test('overwrites existing data', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 1 }]));
    saveWatchedList([{ id: 2 }]);

    expect(JSON.parse(localStorage.getItem('moviemood_watched'))).toEqual([{ id: 2 }]);
  });

  test('can save an empty array', function () {
    saveWatchedList([]);

    expect(JSON.parse(localStorage.getItem('moviemood_watched'))).toEqual([]);
  });
});

describe('isWatched', function () {
  test('returns true when movie id exists in the list', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 5 }, { id: 10 }]));

    expect(isWatched(10)).toBe(true);
  });

  test('returns false when movie id is not in the list', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 5 }]));

    expect(isWatched(99)).toBe(false);
  });

  test('returns false when the list is empty', function () {
    expect(isWatched(1)).toBe(false);
  });
});

// --- DOM update functions ---

describe('updateWatchedCount', function () {
  beforeEach(function () {
    document.body.innerHTML =
      '<button id="watched-toggle">Watched<span class="watched-count hidden"></span></button>';
  });

  test('shows count and removes hidden when list is not empty', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 1 }, { id: 2 }]));

    updateWatchedCount();

    var badge = document.querySelector('.watched-count');
    expect(badge.textContent).toBe('2');
    expect(badge.classList.contains('hidden')).toBe(false);
  });

  test('adds hidden class when list is empty', function () {
    updateWatchedCount();

    var badge = document.querySelector('.watched-count');
    expect(badge.classList.contains('hidden')).toBe(true);
  });

  test('does not throw when badge element is missing', function () {
    document.body.innerHTML = '';

    expect(function () { updateWatchedCount(); }).not.toThrow();
  });
});

describe('updateWatchedButtons', function () {
  beforeEach(function () {
    document.body.innerHTML =
      '<div id="movie-grid">' +
        '<div class="movie-card" data-movie-id="1"><button class="watched-btn">Mark as watched</button></div>' +
        '<div class="movie-card" data-movie-id="2"><button class="watched-btn">Mark as watched</button></div>' +
      '</div>';
  });

  test('adds active class to buttons for watched movies', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([{ id: 1 }]));

    updateWatchedButtons();

    var btn1 = document.querySelector('[data-movie-id="1"] .watched-btn');
    var btn2 = document.querySelector('[data-movie-id="2"] .watched-btn');
    expect(btn1.textContent).toBe('Watched');
    expect(btn1.classList.contains('watched-btn--active')).toBe(true);
    expect(btn2.textContent).toBe('Mark as watched');
    expect(btn2.classList.contains('watched-btn--active')).toBe(false);
  });

  test('removes active class from unwatched movies', function () {
    var btn = document.querySelector('[data-movie-id="2"] .watched-btn');
    btn.classList.add('watched-btn--active');
    btn.textContent = 'Watched';

    updateWatchedButtons();

    expect(btn.textContent).toBe('Mark as watched');
    expect(btn.classList.contains('watched-btn--active')).toBe(false);
  });
});

// --- handleWatched ---

describe('handleWatched', function () {
  var testMovie;

  beforeEach(function () {
    testMovie = { id: 42, title: 'Test Movie', vote_average: 7.5, release_date: '2024-01-01', poster_path: null };
    document.body.innerHTML =
      '<div id="movie-grid">' +
        '<div class="movie-card" data-movie-id="42"><button class="watched-btn">Mark as watched</button></div>' +
      '</div>' +
      '<button id="watched-toggle">Watched<span class="watched-count hidden"></span></button>' +
      '<div id="watched-panel" class="watched-panel">' +
        '<p id="watched-empty-msg"></p>' +
        '<div id="watched-grid"></div>' +
      '</div>';
  });

  test('adds movie to watched list when not already watched', function () {
    handleWatched(testMovie);

    var list = JSON.parse(localStorage.getItem('moviemood_watched'));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(42);
  });

  test('removes movie when already watched and user confirms', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([testMovie]));
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    handleWatched(testMovie);

    var list = JSON.parse(localStorage.getItem('moviemood_watched'));
    expect(list).toHaveLength(0);
  });

  test('keeps movie when already watched but user cancels', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([testMovie]));
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    handleWatched(testMovie);

    var list = JSON.parse(localStorage.getItem('moviemood_watched'));
    expect(list).toHaveLength(1);
  });

  test('updates watched button state after adding', function () {
    handleWatched(testMovie);

    var btn = document.querySelector('[data-movie-id="42"] .watched-btn');
    expect(btn.textContent).toBe('Watched');
    expect(btn.classList.contains('watched-btn--active')).toBe(true);
  });

  test('updates count badge after adding', function () {
    handleWatched(testMovie);

    var badge = document.querySelector('.watched-count');
    expect(badge.textContent).toBe('1');
    expect(badge.classList.contains('hidden')).toBe(false);
  });
});

// --- renderWatchedPanel ---

describe('renderWatchedPanel', function () {
  beforeEach(function () {
    document.body.innerHTML =
      '<div id="watched-panel" class="watched-panel">' +
        '<p id="watched-empty-msg">No movies yet.</p>' +
        '<div id="watched-grid"></div>' +
      '</div>' +
      '<button id="watched-toggle"><span class="watched-count hidden"></span></button>' +
      '<div id="movie-grid"></div>';
  });

  test('shows empty message when list is empty', function () {
    renderWatchedPanel();

    var emptyMsg = document.getElementById('watched-empty-msg');
    expect(emptyMsg.style.display).not.toBe('none');
    expect(document.getElementById('watched-grid').children.length).toBe(0);
  });

  test('creates a watched-card for each movie', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'Movie A', vote_average: 7.5, release_date: '2024-06-15', poster_path: null },
      { id: 2, title: 'Movie B', vote_average: 8.0, release_date: '2023-01-01', poster_path: 'http://img.com/p.jpg' },
    ]));

    renderWatchedPanel();

    var grid = document.getElementById('watched-grid');
    expect(grid.children.length).toBe(2);
    expect(grid.children[0].classList.contains('watched-card')).toBe(true);
  });

  test('renders correct title, rating, and year', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'Movie A', vote_average: 7.5, release_date: '2024-06-15', poster_path: null },
    ]));

    renderWatchedPanel();

    var card = document.querySelector('.watched-card');
    expect(card.querySelector('.watched-title').textContent).toBe('Movie A');
    expect(card.querySelector('.watched-rating').textContent).toBe('Rating: 7.5');
    expect(card.querySelector('.watched-year').textContent).toBe('Released: 2024');
  });

  test('shows Released Unknown when release_date is empty', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'No Date', vote_average: 6.0, release_date: '', poster_path: null },
    ]));

    renderWatchedPanel();

    expect(document.querySelector('.watched-year').textContent).toBe('Released: Unknown');
  });

  test('hides empty message when movies exist', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'A', vote_average: 7.0, release_date: '2024-01-01', poster_path: null },
    ]));

    renderWatchedPanel();

    expect(document.getElementById('watched-empty-msg').style.display).toBe('none');
  });

  test('clears old cards before rendering new ones', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'A', vote_average: 7.0, release_date: '2024-01-01', poster_path: null },
    ]));
    renderWatchedPanel();
    expect(document.getElementById('watched-grid').children.length).toBe(1);

    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 2, title: 'B', vote_average: 8.0, release_date: '2024-01-01', poster_path: null },
      { id: 3, title: 'C', vote_average: 6.0, release_date: '2024-01-01', poster_path: null },
    ]));
    renderWatchedPanel();
    expect(document.getElementById('watched-grid').children.length).toBe(2);
  });

  test('remove button removes movie after confirm', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'A', vote_average: 7.0, release_date: '2024-01-01', poster_path: null },
    ]));
    renderWatchedPanel();
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    document.querySelector('.watched-remove-btn').click();

    expect(document.getElementById('watched-grid').children.length).toBe(0);
    expect(JSON.parse(localStorage.getItem('moviemood_watched'))).toHaveLength(0);
  });

  test('remove button does nothing when user cancels', function () {
    localStorage.setItem('moviemood_watched', JSON.stringify([
      { id: 1, title: 'A', vote_average: 7.0, release_date: '2024-01-01', poster_path: null },
    ]));
    renderWatchedPanel();
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    document.querySelector('.watched-remove-btn').click();

    expect(document.getElementById('watched-grid').children.length).toBe(1);
    expect(JSON.parse(localStorage.getItem('moviemood_watched'))).toHaveLength(1);
  });
});

// --- toggleWatchedPanel ---

describe('toggleWatchedPanel', function () {
  beforeEach(function () {
    document.body.innerHTML =
      '<div id="watched-panel" class="watched-panel">' +
        '<button id="watched-close">Close</button>' +
        '<p id="watched-empty-msg"></p>' +
        '<div id="watched-grid"></div>' +
      '</div>' +
      '<div id="watched-overlay" class="watched-overlay"></div>';
  });

  test('adds open and active classes when opened', function () {
    toggleWatchedPanel();

    expect(document.getElementById('watched-panel').classList.contains('open')).toBe(true);
    expect(document.getElementById('watched-overlay').classList.contains('active')).toBe(true);
  });

  test('removes classes when toggled again', function () {
    toggleWatchedPanel();
    toggleWatchedPanel();

    expect(document.getElementById('watched-panel').classList.contains('open')).toBe(false);
    expect(document.getElementById('watched-overlay').classList.contains('active')).toBe(false);
  });

  test('forceClose removes both classes', function () {
    toggleWatchedPanel();
    toggleWatchedPanel(true);

    expect(document.getElementById('watched-panel').classList.contains('open')).toBe(false);
    expect(document.getElementById('watched-overlay').classList.contains('active')).toBe(false);
  });

  test('forceClose on already-closed panel does not throw', function () {
    expect(function () { toggleWatchedPanel(true); }).not.toThrow();
  });
});
