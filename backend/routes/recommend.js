const express = require('express');
const { discoverMovies, formatMovie, getWatchProviders } = require('./tmdb');

const router = express.Router();

// Returns a YYYY-MM-DD date string for exactly four years before today.
function getFourYearsAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 4);
  return date.toISOString().split('T')[0];
}

// Maps each mood string to a set of TMDB discover query parameters.
const MOOD_FILTERS = {
  happy: {
    sort_by: 'popularity.desc',
    'vote_average.gte': 6.5,
    'vote_count.gte': 200,
  },
  sad: {
    sort_by: 'vote_average.desc',
    'vote_average.gte': 7.5,
    'vote_count.gte': 300,
  },
  excited: {
    sort_by: 'popularity.desc',
    'vote_average.gte': 6.0,
    'vote_count.gte': 150,
  },
  anxious: {
    sort_by: 'vote_average.desc',
    'vote_average.gte': 7.0,
    'vote_count.gte': 200,
    'with_runtime.lte': 100,
  },
  romantic: {
    sort_by: 'vote_average.desc',
    'vote_average.gte': 6.5,
    'vote_count.gte': 150,
  },
  bored: {
    sort_by: 'popularity.desc',
    'vote_average.gte': 6.0,
    'vote_count.gte': 500,
  },
};

// In-memory cache using a Map. Key is "mood-genreId", value is { data, cachedAt }.
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

// Returns cached data if it exists and has not expired, otherwise null.
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

// Stores data in the cache with the current timestamp.
function setCache(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}

// Filters out low-vote movies, scores them, shuffles the top 25, and returns 10 varied picks.
function rankAndFilter(movies) {
  const scored = movies
    .filter((movie) => movie.vote_count >= 100)
    .map((movie) => ({
      ...movie,
      _score: movie.vote_average * 0.7 + Math.log10(movie.vote_count) * 0.3,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 25);

  for (let i = scored.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = scored[i];
    scored[i] = scored[j];
    scored[j] = temp;
  }

  return scored.slice(0, 10).map(({ _score, ...movie }) => movie);
}

// Handles POST /recommend -- validates input, checks cache, calls TMDB, ranks results.
router.post('/', async (req, res) => {
  try {
    const { mood, genreId, excludeIds } = req.body;

    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid mood value' });
    }

    if (genreId === undefined || genreId === null || typeof genreId !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid genreId value' });
    }

    if (excludeIds !== undefined && !Array.isArray(excludeIds)) {
      return res.status(400).json({ error: 'excludeIds must be an array' });
    }

    const idsToExclude = Array.isArray(excludeIds) ? excludeIds : [];

    const moodKey = mood.toLowerCase();
    const moodFilter = MOOD_FILTERS[moodKey];

    if (!moodFilter) {
      return res.status(400).json({ error: 'Unrecognised mood value' });
    }

    // Cache read disabled -- results are now randomised so serving a cached set
    // would defeat the purpose of the shuffle in rankAndFilter.
    // const cacheKey = `${moodKey}-${genreId}`;
    // const cached = getCached(cacheKey);
    // if (cached) {
    //   console.log(`[CACHE HIT] ${cacheKey}`);
    //   return res.json(cached);
    // }

    const filters = { ...moodFilter, with_genres: genreId };

    if (moodKey === 'excited') {
      filters['primary_release_date.gte'] = getFourYearsAgo();
    }

    const rawMovies = await discoverMovies(filters);
    const formatted = rawMovies.map(formatMovie);
    // Remove movies the user has already watched so they get fresh results
    const afterExclusion = formatted.filter(function (m) { return idsToExclude.indexOf(m.id) === -1; });
    const results = rankAndFilter(afterExclusion);

    // Fetch streaming provider data for all results in parallel
    try {
      const providerResults = await Promise.all(results.map(function (m) { return getWatchProviders(m.id); }));
      for (let i = 0; i < results.length; i++) {
        results[i].streamingProviders = providerResults[i];
      }
    } catch (err) {
      for (let i = 0; i < results.length; i++) {
        results[i].streamingProviders = [];
      }
    }

    // Cache write disabled -- results are randomised per request so caching
    // would lock in a single shuffled set for the TTL duration.
    // setCache(cacheKey, results);
    // console.log(`[CACHE SET] ${cacheKey} -- ${results.length} movies`);

    // Number of movies remaining after excluding already-watched IDs
    var poolSizeAfterExclusion = afterExclusion.length;

    return res.json({ results: results, poolSizeAfterExclusion: poolSizeAfterExclusion });
  } catch (err) {
    console.error('Error in /recommend:', err.message);

    if (err.message && err.message.includes('TMDB')) {
      return res.status(502).json({ error: 'Failed to fetch data from TMDB' });
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(502).json({ error: 'Failed to fetch data from TMDB' });
    }

    return res.status(500).json({ error: 'Something went wrong on the server' });
  }
});

router._testExports = {
  rankAndFilter,
  getCached,
  setCache,
  getFourYearsAgo,
  MOOD_FILTERS,
  cache,
  CACHE_TTL,
};

module.exports = router;
