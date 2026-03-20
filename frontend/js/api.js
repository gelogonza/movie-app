// Sends a POST request to the backend and returns { results, poolSizeAfterExclusion }.
async function fetchRecommendations(mood, genreId, excludeIds, decadeRange) {
  var ids = Array.isArray(excludeIds) ? excludeIds : [];
  var dr = decadeRange || null;
  if (dr) {
    var built = { gte: dr.gte };
    if (dr.lte != null) built.lte = dr.lte;
    dr = built;
  }
  var response = await fetch('https://movie-app-u4m66.ondigitalocean.app/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood: mood, genreId: Number(genreId), excludeIds: ids, decadeRange: dr })
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
