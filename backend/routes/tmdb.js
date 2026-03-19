const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Fetches pages 1 and 2 from TMDB /discover/movie in parallel and returns a deduplicated array.
async function discoverMovies(filters) {
  const apiKey = process.env.TMDB_API_KEY;

  const baseParams = {
    api_key: apiKey,
    language: 'en-US',
    include_adult: false,
    include_video: false,
    ...filters,
  };

  let responses;

  try {
    responses = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/discover/movie`, { params: { ...baseParams, page: 1 } }),
      axios.get(`${TMDB_BASE_URL}/discover/movie`, { params: { ...baseParams, page: 2 } }),
    ]);
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      throw new Error(`TMDB returned status ${status}`);
    }
    throw err;
  }

  const combined = [...responses[0].data.results, ...responses[1].data.results];
  const seen = new Set();
  return combined.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

// Transforms a raw TMDB movie object into the shape the client expects.
function formatMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    poster_path: movie.poster_path
      ? `${POSTER_BASE_URL}${movie.poster_path}`
      : null,
    genre_ids: movie.genre_ids,
  };
}

module.exports = { discoverMovies, formatMovie };
