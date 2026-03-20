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

// Fetches US flatrate streaming providers for a single movie, returning an empty array on failure.
async function getWatchProviders(movieId) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers`, {
      params: { api_key: process.env.TMDB_API_KEY },
    });
    const flatrate = response.data && response.data.results && response.data.results.US && response.data.results.US.flatrate;
    if (!Array.isArray(flatrate)) return [];
    return flatrate.map(function (p) {
      return {
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_url: 'https://image.tmdb.org/t/p/w92' + p.logo_path,
      };
    });
  } catch (err) {
    return [];
  }
}

// Fetches full movie details, credits, and trailer from TMDB in parallel and returns a combined object.
async function getMovieDetails(movieId) {
  const apiKey = process.env.TMDB_API_KEY;

  let movieRes, creditsRes, videosRes;

  try {
    [movieRes, creditsRes, videosRes] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, { params: { api_key: apiKey } }),
      axios.get(`${TMDB_BASE_URL}/movie/${movieId}/credits`, { params: { api_key: apiKey } }),
      axios.get(`${TMDB_BASE_URL}/movie/${movieId}/videos`, { params: { api_key: apiKey } }),
    ]);
  } catch (err) {
    throw new Error('Failed to fetch movie details');
  }

  const m = movieRes.data;
  const credits = creditsRes.data;
  const videos = videosRes.data;

  const backdropUrl = m.backdrop_path
    ? 'https://image.tmdb.org/t/p/w1280' + m.backdrop_path
    : null;

  const posterUrl = m.poster_path
    ? POSTER_BASE_URL + m.poster_path
    : null;

  let formattedRuntime = null;
  if (m.runtime && m.runtime > 0) {
    const hours = Math.floor(m.runtime / 60);
    const mins = m.runtime % 60;
    formattedRuntime = hours + 'h ' + mins + 'm';
  }

  const directorEntry = credits.crew
    ? credits.crew.find(function (c) { return c.job === 'Director'; })
    : null;
  const director = directorEntry ? directorEntry.name : null;

  const castList = (credits.cast || []).slice(0, 4).map(function (c) {
    return {
      name: c.name,
      character: c.character,
      profile_url: c.profile_path
        ? 'https://image.tmdb.org/t/p/w185' + c.profile_path
        : null,
    };
  });

  const trailer = (videos.results || []).find(function (v) {
    return v.type === 'Trailer' && v.site === 'YouTube';
  });
  const trailerKey = trailer ? trailer.key : null;

  return {
    id: m.id,
    title: m.title,
    tagline: m.tagline,
    overview: m.overview,
    runtime: formattedRuntime,
    backdrop_url: backdropUrl,
    poster_url: posterUrl,
    genres: m.genres,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    release_date: m.release_date,
    director: director,
    cast: castList,
    trailer_key: trailerKey,
  };
}

module.exports = { discoverMovies, formatMovie, getWatchProviders, getMovieDetails };
