// Tracks the user's current mood and genre selections.
var selectedMood = null;
var selectedGenreId = null;

// Returns the saved watchlist array from localStorage, or an empty array if absent.
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem('moviemood_watchlist')) || []; }
  catch (e) { return []; }
}

// Writes the given watchlist array to localStorage as JSON.
function saveWatchlist(list) {
  localStorage.setItem('moviemood_watchlist', JSON.stringify(list));
}

// Returns true if a movie with the given id exists in the saved watchlist.
function isInWatchlist(movieId) {
  var list = getWatchlist();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === movieId) return true;
  }
  return false;
}

// Hides all screen sections and shows only the one matching the given sectionId.
function showScreen(sectionId) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
  }
  document.getElementById(sectionId).classList.add('active');
  window.scrollTo(0, 0);
}

// Returns the string with its first letter capitalised.
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Builds and injects movie card elements into the movie grid container.
function renderMovies(movies) {
  var grid = document.getElementById('movie-grid');
  grid.innerHTML = '';

  if (!movies || movies.length === 0) {
    var emptyCard = document.createElement('div');
    emptyCard.className = 'movie-card';
    emptyCard.textContent =
      'No results found for this combination. Try a different mood or genre.';
    grid.appendChild(emptyCard);
    return;
  }

  for (var i = 0; i < movies.length; i++) {
    var movie = movies[i];
    var card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-movie-id', movie.id);

    var img = document.createElement('img');
    img.className = 'movie-poster';
    img.src = movie.poster_path
      ? movie.poster_path
      : 'https://via.placeholder.com/500x750?text=No+Image';
    img.alt = movie.title;
    card.appendChild(img);

    var titleDiv = document.createElement('div');
    titleDiv.className = 'movie-title';
    titleDiv.textContent = movie.title;
    card.appendChild(titleDiv);

    var ratingDiv = document.createElement('div');
    ratingDiv.className = 'movie-rating';
    ratingDiv.textContent = 'Rating: ' + movie.vote_average.toFixed(1);
    card.appendChild(ratingDiv);

    var yearDiv = document.createElement('div');
    yearDiv.className = 'movie-year';
    yearDiv.textContent = movie.release_date
      ? 'Released: ' + movie.release_date.slice(0, 4)
      : 'Released: Unknown';
    card.appendChild(yearDiv);

    var overviewP = document.createElement('p');
    overviewP.className = 'movie-overview';
    overviewP.textContent = movie.overview
      ? movie.overview
      : 'No description available.';
    card.appendChild(overviewP);

    var bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'bookmark-btn';
    if (isInWatchlist(movie.id)) {
      bookmarkBtn.textContent = 'Saved';
      bookmarkBtn.classList.add('bookmark-btn--saved');
    } else {
      bookmarkBtn.textContent = 'Save';
    }
    (function (m) {
      bookmarkBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleBookmark(m);
      });
    })(movie);
    card.appendChild(bookmarkBtn);

    grid.appendChild(card);
  }
}

// Adds or removes a movie from the watchlist and updates all related UI.
function handleBookmark(movie) {
  var list = getWatchlist();
  if (isInWatchlist(movie.id)) {
    if (!window.confirm('Remove this movie from your watchlist?')) return;
    list = list.filter(function (m) { return m.id !== movie.id; });
    saveWatchlist(list);
  } else {
    list.push(movie);
    saveWatchlist(list);
  }
  updateBookmarkButtons();
  updateWatchlistCount();
  if (document.getElementById('watchlist-panel').classList.contains('open')) {
    renderWatchlist();
  }
}

// Syncs every bookmark button in the movie grid with the current watchlist state.
function updateBookmarkButtons() {
  var buttons = document.querySelectorAll('#movie-grid .bookmark-btn');
  for (var i = 0; i < buttons.length; i++) {
    var card = buttons[i].parentElement;
    var movieId = Number(card.getAttribute('data-movie-id'));
    if (isInWatchlist(movieId)) {
      buttons[i].textContent = 'Saved';
      buttons[i].classList.add('bookmark-btn--saved');
    } else {
      buttons[i].textContent = 'Save';
      buttons[i].classList.remove('bookmark-btn--saved');
    }
  }
}

// Updates the watchlist count badge in the navbar toggle button.
function updateWatchlistCount() {
  var count = getWatchlist().length;
  var badge = document.querySelector('#watchlist-toggle .watchlist-count');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// Opens or closes the watchlist slide-out panel and its backdrop overlay.
function toggleWatchlistPanel(forceClose) {
  var panel = document.getElementById('watchlist-panel');
  var overlay = document.getElementById('watchlist-overlay');
  if (forceClose) {
    panel.classList.remove('open');
    overlay.classList.remove('active');
    return;
  }
  var willOpen = !panel.classList.contains('open');
  panel.classList.toggle('open');
  overlay.classList.toggle('active');
  if (willOpen) {
    renderWatchlist();
    document.getElementById('watchlist-close').focus();
  }
}

// Renders the saved watchlist movies into the watchlist panel grid.
function renderWatchlist() {
  var list = getWatchlist();
  var grid = document.getElementById('watchlist-grid');
  var emptyMsg = document.getElementById('watchlist-empty-msg');
  while (grid.firstChild) { grid.removeChild(grid.firstChild); }

  if (list.length === 0) {
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  for (var i = 0; i < list.length; i++) {
    (function (movie) {
      var card = document.createElement('div');
      card.className = 'watchlist-card';

      var img = document.createElement('img');
      img.className = 'watchlist-poster';
      img.src = movie.poster_path ? movie.poster_path : 'https://via.placeholder.com/60x90?text=N/A';
      img.alt = movie.title;
      card.appendChild(img);

      var info = document.createElement('div');
      info.className = 'watchlist-card-info';

      var title = document.createElement('div');
      title.className = 'watchlist-title';
      title.textContent = movie.title;
      info.appendChild(title);

      var rating = document.createElement('div');
      rating.className = 'watchlist-rating';
      rating.textContent = 'Rating: ' + movie.vote_average.toFixed(1);
      info.appendChild(rating);

      var year = document.createElement('div');
      year.className = 'watchlist-year';
      year.textContent = movie.release_date ? 'Released: ' + movie.release_date.slice(0, 4) : 'Released: Unknown';
      info.appendChild(year);

      card.appendChild(info);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'watchlist-remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', function () {
        if (!window.confirm('Remove this movie from your watchlist?')) return;
        var updated = getWatchlist().filter(function (m) { return m.id !== movie.id; });
        saveWatchlist(updated);
        renderWatchlist();
        updateBookmarkButtons();
        updateWatchlistCount();
      });
      card.appendChild(removeBtn);

      grid.appendChild(card);
    })(list[i]);
  }
}

// Wires up all click listeners and shows the initial screen on page load.
document.addEventListener('DOMContentLoaded', function () {
  var moodButtons = document.querySelectorAll('.mood-card');
  for (var i = 0; i < moodButtons.length; i++) {
    moodButtons[i].addEventListener('click', function () {
      selectedMood = this.getAttribute('data-mood');
      document.getElementById('mood-summary').textContent =
        'Showing results for when you are feeling ' + capitalize(selectedMood);
      showScreen('genre-section');
    });
  }

  var genrePills = document.querySelectorAll('.genre-pill');
  for (var j = 0; j < genrePills.length; j++) {
    genrePills[j].addEventListener('click', async function () {
      selectedGenreId = Number(this.getAttribute('data-genre-id'));
      showScreen('results-section');
      document.getElementById('results-summary').textContent =
        capitalize(selectedMood) + ' - ' + this.textContent;

      var spinner = document.getElementById('loading-spinner');
      spinner.classList.remove('hidden');

      var grid = document.getElementById('movie-grid');
      grid.innerHTML = '';

      try {
        var movies = await window.fetchRecommendations(selectedMood, selectedGenreId);
        renderMovies(movies);
        spinner.classList.add('hidden');
      } catch (err) {
        spinner.classList.add('hidden');
        grid.innerHTML = '';
        var errorCard = document.createElement('div');
        errorCard.className = 'movie-card';
        errorCard.textContent = 'Something went wrong. Please try again.';
        grid.appendChild(errorCard);
      }
    });
  }

  // Navigates back to the mood screen and resets all selections.
  document.getElementById('back-to-mood').addEventListener('click', function () {
    selectedMood = null;
    selectedGenreId = null;
    showScreen('mood-section');
  });

  // Navigates back to the mood screen and resets all selections.
  document.getElementById('start-over').addEventListener('click', function () {
    selectedMood = null;
    selectedGenreId = null;
    showScreen('mood-section');
  });

  document.getElementById('watchlist-toggle').addEventListener('click', function () {
    toggleWatchlistPanel();
  });

  document.getElementById('watchlist-close').addEventListener('click', function () {
    toggleWatchlistPanel(true);
  });

  document.getElementById('watchlist-overlay').addEventListener('click', function () {
    toggleWatchlistPanel(true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('watchlist-panel').classList.contains('open')) {
      toggleWatchlistPanel(true);
    }
  });

  updateWatchlistCount();
  showScreen('mood-section');
});
