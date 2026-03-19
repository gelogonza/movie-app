// Tracks the user's current mood and genre selections.
var selectedMood = null;
var selectedGenreId = null;

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

    grid.appendChild(card);
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

  showScreen('mood-section');
});
