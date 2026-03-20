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

// Returns the saved watched-history array from localStorage, or an empty array if absent.
function getWatchedList() {
  try { return JSON.parse(localStorage.getItem('moviemood_watched')) || []; }
  catch (e) { return []; }
}

// Writes the given watched-history array to localStorage as JSON.
function saveWatchedList(list) {
  localStorage.setItem('moviemood_watched', JSON.stringify(list));
}

// Returns true if a movie with the given id exists in the watched-history array.
function isWatched(movieId) {
  var list = getWatchedList();
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

    if (movie.streamingProviders && movie.streamingProviders.length > 0) {
      var streamingDiv = document.createElement('div');
      streamingDiv.className = 'streaming-providers';
      var streamLabel = document.createElement('span');
      streamLabel.className = 'streaming-label';
      streamLabel.textContent = 'Stream on:';
      streamingDiv.appendChild(streamLabel);
      for (var s = 0; s < movie.streamingProviders.length; s++) {
        var provider = movie.streamingProviders[s];
        var logo = document.createElement('img');
        logo.className = 'streaming-logo';
        logo.src = provider.logo_url;
        logo.alt = provider.provider_name;
        logo.title = provider.provider_name;
        logo.setAttribute('width', '28');
        logo.setAttribute('height', '28');
        streamingDiv.appendChild(logo);
      }
      card.appendChild(streamingDiv);
    }

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

    var watchedBtn = document.createElement('button');
    watchedBtn.className = 'watched-btn';
    if (isWatched(movie.id)) {
      watchedBtn.textContent = 'Watched';
      watchedBtn.classList.add('watched-btn--active');
    } else {
      watchedBtn.textContent = 'Mark as watched';
    }
    (function (m) {
      watchedBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleWatched(m);
      });
    })(movie);
    card.appendChild(watchedBtn);

    card.style.cursor = 'pointer';
    (function (m) {
      card.addEventListener('click', function () {
        openMovieModal(m.id);
      });
    })(movie);

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

// Adds or removes a movie from the watched history and updates all related UI.
function handleWatched(movie) {
  var list = getWatchedList();
  if (isWatched(movie.id)) {
    if (!window.confirm('Remove this movie from your watched history?')) return;
    list = list.filter(function (m) { return m.id !== movie.id; });
    saveWatchedList(list);
  } else {
    list.push(movie);
    saveWatchedList(list);
  }
  updateWatchedButtons();
  updateWatchedCount();
  if (document.getElementById('watched-panel').classList.contains('open')) {
    renderWatchedPanel();
  }
}

// Syncs every watched button in the movie grid with the current watched-history state.
function updateWatchedButtons() {
  var buttons = document.querySelectorAll('#movie-grid .watched-btn');
  for (var i = 0; i < buttons.length; i++) {
    var card = buttons[i].parentElement;
    var movieId = Number(card.getAttribute('data-movie-id'));
    if (isWatched(movieId)) {
      buttons[i].textContent = 'Watched';
      buttons[i].classList.add('watched-btn--active');
    } else {
      buttons[i].textContent = 'Mark as watched';
      buttons[i].classList.remove('watched-btn--active');
    }
  }
}

// Updates the watched count badge in the navbar toggle button.
function updateWatchedCount() {
  var count = getWatchedList().length;
  var badge = document.querySelector('#watched-toggle .watched-count');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// Opens or closes the watched-history slide-out panel and its backdrop overlay.
function toggleWatchedPanel(forceClose) {
  var panel = document.getElementById('watched-panel');
  var overlay = document.getElementById('watched-overlay');
  if (forceClose) {
    panel.classList.remove('open');
    overlay.classList.remove('active');
    return;
  }
  var willOpen = !panel.classList.contains('open');
  panel.classList.toggle('open');
  overlay.classList.toggle('active');
  if (willOpen) {
    renderWatchedPanel();
    document.getElementById('watched-close').focus();
  }
}

// Renders the watched-history movies into the watched panel grid.
function renderWatchedPanel() {
  var list = getWatchedList();
  var grid = document.getElementById('watched-grid');
  var emptyMsg = document.getElementById('watched-empty-msg');
  while (grid.firstChild) { grid.removeChild(grid.firstChild); }

  if (list.length === 0) {
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  for (var i = 0; i < list.length; i++) {
    (function (movie) {
      var card = document.createElement('div');
      card.className = 'watched-card';

      var img = document.createElement('img');
      img.className = 'watched-poster';
      img.src = movie.poster_path ? movie.poster_path : 'https://via.placeholder.com/60x90?text=N/A';
      img.alt = movie.title;
      card.appendChild(img);

      var info = document.createElement('div');
      info.className = 'watched-card-info';

      var title = document.createElement('div');
      title.className = 'watched-title';
      title.textContent = movie.title;
      info.appendChild(title);

      var rating = document.createElement('div');
      rating.className = 'watched-rating';
      rating.textContent = 'Rating: ' + movie.vote_average.toFixed(1);
      info.appendChild(rating);

      var year = document.createElement('div');
      year.className = 'watched-year';
      year.textContent = movie.release_date ? 'Released: ' + movie.release_date.slice(0, 4) : 'Released: Unknown';
      info.appendChild(year);

      card.appendChild(info);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'watched-remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', function () {
        if (!window.confirm('Remove this movie from your watched history?')) return;
        var updated = getWatchedList().filter(function (m) { return m.id !== movie.id; });
        saveWatchedList(updated);
        renderWatchedPanel();
        updateWatchedButtons();
        updateWatchedCount();
      });
      card.appendChild(removeBtn);

      grid.appendChild(card);
    })(list[i]);
  }
}

// Fetches movie details from the backend and opens the detail modal.
function openMovieModal(movieId) {
  var overlay = document.getElementById('movie-modal-overlay');
  overlay.classList.add('active');
  document.getElementById('modal-title').textContent = 'Loading...';
  document.getElementById('modal-tagline').textContent = '';
  document.getElementById('modal-rating').textContent = '';
  document.getElementById('modal-year').textContent = '';
  document.getElementById('modal-runtime').textContent = '';
  document.getElementById('modal-runtime').classList.remove('hidden');
  document.getElementById('modal-genres').innerHTML = '';
  document.getElementById('modal-overview').textContent = '';
  document.getElementById('modal-backdrop').style.backgroundImage = '';
  document.getElementById('modal-backdrop').style.height = '';
  document.getElementById('modal-director').textContent = '';
  document.getElementById('modal-cast').innerHTML = '';
  document.getElementById('modal-trailer').innerHTML = '';

  fetch('https://movie-app-u4m66.ondigitalocean.app/movie/' + movieId)
    .then(function (response) {
      if (!response.ok) {
        document.getElementById('modal-title').textContent = 'Something went wrong';
        return;
      }
      return response.json();
    })
    .then(function (data) {
      if (data) {
        populateModal(data);
      }
    })
    .catch(function () {
      document.getElementById('modal-title').textContent = 'Something went wrong';
    });
}

// Closes the movie detail modal and stops any playing trailer.
function closeMovieModal() {
  document.getElementById('movie-modal-overlay').classList.remove('active');
  document.getElementById('modal-trailer').innerHTML = '';
}

// Fills the movie detail modal with data from the backend response.
function populateModal(movie) {
  document.getElementById('modal-title').textContent = movie.title;
  document.getElementById('modal-tagline').textContent =
    (movie.tagline && movie.tagline.length > 0) ? movie.tagline : '';
  document.getElementById('modal-rating').textContent =
    'Rating: ' + movie.vote_average.toFixed(1);
  document.getElementById('modal-year').textContent =
    movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown';

  var runtimeEl = document.getElementById('modal-runtime');
  if (movie.runtime) {
    runtimeEl.textContent = movie.runtime;
    runtimeEl.classList.remove('hidden');
  } else {
    runtimeEl.textContent = '';
    runtimeEl.classList.add('hidden');
  }

  document.getElementById('modal-overview').textContent =
    (movie.overview && movie.overview.length > 0) ? movie.overview : 'No description available.';

  var backdropEl = document.getElementById('modal-backdrop');
  if (movie.backdrop_url) {
    backdropEl.style.backgroundImage = 'url(' + movie.backdrop_url + ')';
    backdropEl.style.height = '';
  } else {
    backdropEl.style.backgroundImage = '';
    backdropEl.style.height = '0';
  }

  var genresEl = document.getElementById('modal-genres');
  genresEl.innerHTML = '';
  if (movie.genres) {
    for (var g = 0; g < movie.genres.length; g++) {
      var pill = document.createElement('span');
      pill.className = 'modal-genre-pill';
      pill.textContent = movie.genres[g].name;
      genresEl.appendChild(pill);
    }
  }

  var directorEl = document.getElementById('modal-director');
  while (directorEl.firstChild) { directorEl.removeChild(directorEl.firstChild); }
  var dirLabel = document.createElement('span');
  dirLabel.className = 'modal-director-label';
  dirLabel.textContent = 'Director: ';
  directorEl.appendChild(dirLabel);
  directorEl.appendChild(document.createTextNode(movie.director ? movie.director : 'Unknown'));

  var castEl = document.getElementById('modal-cast');
  castEl.innerHTML = '';
  if (movie.cast) {
    for (var c = 0; c < movie.cast.length; c++) {
      var member = movie.cast[c];
      var memberDiv = document.createElement('div');
      memberDiv.className = 'modal-cast-member';

      var photo = document.createElement('img');
      photo.className = 'modal-cast-photo';
      photo.src = member.profile_url ? member.profile_url : 'https://via.placeholder.com/56x56?text=N/A';
      photo.alt = member.name;
      memberDiv.appendChild(photo);

      var nameSpan = document.createElement('span');
      nameSpan.className = 'modal-cast-name';
      nameSpan.textContent = member.name;
      memberDiv.appendChild(nameSpan);

      var charSpan = document.createElement('span');
      charSpan.className = 'modal-cast-character';
      charSpan.textContent = member.character;
      memberDiv.appendChild(charSpan);

      castEl.appendChild(memberDiv);
    }
  }

  var trailerEl = document.getElementById('modal-trailer');
  trailerEl.innerHTML = '';
  if (movie.trailer_key) {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + movie.trailer_key + '?rel=0';
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.allowFullscreen = true;
    trailerEl.appendChild(iframe);
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
        var watchedIds = getWatchedList().map(function (m) { return m.id; });
        var movies = await window.fetchRecommendations(selectedMood, selectedGenreId, watchedIds);
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

  document.getElementById('watched-toggle').addEventListener('click', function () {
    toggleWatchedPanel();
  });

  document.getElementById('watched-close').addEventListener('click', function () {
    toggleWatchedPanel(true);
  });

  document.getElementById('watched-overlay').addEventListener('click', function () {
    toggleWatchedPanel(true);
  });

  document.getElementById('modal-close').addEventListener('click', function () {
    closeMovieModal();
  });

  document.getElementById('movie-modal-overlay').addEventListener('click', function (e) {
    if (e.target === document.getElementById('movie-modal-overlay')) {
      closeMovieModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('movie-modal-overlay').classList.contains('active')) {
        closeMovieModal();
      }
      if (document.getElementById('watchlist-panel').classList.contains('open')) {
        toggleWatchlistPanel(true);
      }
      if (document.getElementById('watched-panel').classList.contains('open')) {
        toggleWatchedPanel(true);
      }
    }
  });

  updateWatchlistCount();
  updateWatchedCount();
  showScreen('mood-section');
});
