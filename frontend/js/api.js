// Sends a POST request to the backend and returns the parsed movie recommendations array.
async function fetchRecommendations(mood, genreId) {
  var response = await fetch('https://movie-app-u4m66.ondigitalocean.app/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood: mood, genreId: Number(genreId) })
  });

  if (!response.ok) {
    var errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error('Failed to fetch recommendations');
    }
    throw new Error(
      errorData && errorData.error ? errorData.error : 'Failed to fetch recommendations'
    );
  }

  return response.json();
}

window.fetchRecommendations = fetchRecommendations;
