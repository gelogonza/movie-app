const express = require('express');
const { getMovieDetails } = require('./tmdb');

const router = express.Router();

// Returns detailed movie information for a given TMDB movie id.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid movie id' });
  }

  try {
    const details = await getMovieDetails(id);
    return res.json(details);
  } catch (err) {
    if (err.message && err.message.includes('Failed to fetch movie details')) {
      return res.status(502).json({ error: 'Failed to fetch movie details from TMDB' });
    }
    return res.status(500).json({ error: 'Something went wrong on the server' });
  }
});

module.exports = router;
