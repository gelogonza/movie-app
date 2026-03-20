# MovieRecs

Live demo: [https://movie-app-nu-hazel.vercel.app/](https://movie-app-nu-hazel.vercel.app/)

A mood-based movie recommendation web app. You pick how you are feeling, pick a genre, and get a personalised list of 10 movies to watch — no account, no sign-up, no algorithm tracking you.

---

## What it does

MovieRecs walks you through two choices:

1. **Mood** — how you are feeling right now (Happy, Sad, Excited, Anxious, Romantic, Bored)
2. **Genre** — what kind of film you are in the mood for (Action, Comedy, Drama, Horror, Romance, Sci-Fi, Fantasy, Animation, Documentary, Crime, Thriller, War)

Once both are selected, the app queries the TMDB movie database using filters tuned to your mood, scores the results using a custom ranking formula, shuffles the top picks so you get something different each time, and displays up to 10 movie cards with poster, title, rating, year, and overview.

Beyond the core recommendation flow, the app includes several additional features:

- **Movie detail modal** — clicking any movie card opens a full detail modal with a backdrop image, tagline, runtime, genre pills, full overview, director name, top 4 cast members with photos, and an embedded YouTube trailer. The modal fetches rich data from a dedicated `GET /movie/:id` backend endpoint.
- **Watchlist** — users can save any movie from the results grid by clicking a Save button on the card. Saved movies appear in a slide-out panel accessible from the navbar. The watchlist persists between browser sessions using localStorage.
- **Watched history** — users can mark any movie as watched. Watched movies are stored in localStorage and sent to the backend with every new recommendation request. The backend filters them out before ranking so the user always receives results they have not seen before. When most movies in a mood/genre pool have been watched, a warning appears suggesting the user try a different genre.
- **Shuffle** — a Shuffle button on the results screen fetches a fresh set of recommendations for the same mood and genre combination without navigating back.
- **Decade filter** — on the results screen, a row of era buttons (Pre 1970s, 1970s, 1980s, 1990s, 2000s, 2010s, 2020s) lets users narrow results to a specific release decade. Selecting an era re-fetches results with date range parameters. Clicking the active era again deselects it and fetches unfiltered results. The active era persists through shuffle clicks. Navigating away from results clears the filter. If the Excited mood's four-year recency filter is active, an explicit decade selection overrides it.
- **Shareable results URL** — when results are shown, the page URL updates to include the mood and genre as query parameters (e.g. `?mood=happy&genreId=35`) without a page reload. Anyone visiting that URL lands directly on the results screen with recommendations already loaded, skipping the mood and genre selection screens. A Copy Link button on the results screen copies the current URL to the clipboard.
- **Streaming availability** — each movie card shows which US streaming services the movie is currently available on as subscription streaming. Service logos are fetched from the TMDB watch providers endpoint and displayed below the movie overview.
- **Mobile burger menu** — on small screens (480px and below), the Watchlist and Watched navbar buttons collapse into an animated hamburger menu with a slide-down dropdown. The burger icon animates to an X when open, and the menu closes on outside click or Escape key.
- **Keyboard shortcuts** — pressing Escape closes any open panel, modal, or dropdown.

---

## How it works

### Frontend

The frontend is a single HTML page (`frontend/index.html`) with three sections that show and hide one at a time: mood selection, genre selection, and results. There is no framework -- just plain HTML, CSS, and two vanilla JavaScript files.

- `frontend/js/api.js` -- handles the `POST /recommend` request to the backend (accepts mood, genreId, excludeIds, and optional decadeRange) and parses the response
- `frontend/js/app.js` -- manages all screen transitions, click events, movie detail modal, burger menu, decade filter, shareable URL handling, copy link, watchlist/watched panels, and injects movie cards into the DOM using `createElement`
- `frontend/css/style.css` -- layout, buttons, typography, responsive breakpoints (mobile and tablet)
- `frontend/css/cards.css` -- movie card styles
- `frontend/css/watchlist.css` -- slide-out watchlist panel styles
- `frontend/css/watched.css` -- slide-out watched history panel styles
- `frontend/css/modal.css` -- movie detail modal overlay, panel, backdrop, cast, trailer
- `frontend/css/burger.css` -- mobile hamburger menu button and dropdown

### Backend

The backend is a Node.js and Express server (`backend/server.js`) that also serves the frontend as static files. It exposes two API endpoints:

```
POST /recommend
Content-Type: application/json

{
  "mood": "happy",
  "genreId": 35,
  "excludeIds": [550, 680],
  "decadeRange": { "gte": "1980-01-01", "lte": "1989-12-31" }
}
```

The `excludeIds` and `decadeRange` fields are optional. `decadeRange` is an object with `gte` (start date, YYYY-MM-DD) and optionally `lte` (end date). When provided, it adds or overwrites any existing date filters on the TMDB query, including the Excited mood's four-year recency filter.

Returns a JSON object with two fields:
- `results` -- an array of up to 10 movie objects, each with: `id`, `title`, `overview`, `release_date`, `vote_average`, `vote_count`, `poster_path`, `genre_ids`, and `streamingProviders`
- `poolSizeAfterExclusion` -- the number of movies remaining after removing already-watched IDs, used by the frontend to show a low-pool warning

```
GET /movie/:id
```

Returns a single detailed movie object with: `id`, `title`, `tagline`, `overview`, `runtime` (formatted as "1h 45m"), `backdrop_url`, `poster_url`, `genres`, `vote_average`, `vote_count`, `release_date`, `director`, `cast` (top 4 with name, character, and photo URL), and `trailer_key` (YouTube video ID).

#### Recommendation pipeline

**Step 1 -- Mood to TMDB filters**

Each mood maps to a hardcoded set of TMDB `/discover/movie` query parameters that control how movies are sorted and what minimum quality thresholds apply:

| Mood | Sort by | Min rating | Min votes | Extra |
|---|---|---|---|---|
| Happy | Popularity | 6.5 | 200 | — |
| Sad | Rating | 7.5 | 300 | — |
| Excited | Popularity | 6.0 | 150 | Released in last 4 years only |
| Anxious | Rating | 7.0 | 200 | Runtime 100 min or under |
| Romantic | Rating | 6.5 | 150 | — |
| Bored | Popularity | 6.0 | 500 | — |

**Step 1b -- Mood-genre overrides**

Certain mood and genre pairings have combination-specific filter overrides that completely replace the base mood filters. These are tuned to produce better results when the default mood filters clash with the genre:

| Mood + Genre | Override behaviour |
|---|---|
| Happy + Horror | Rating sort, caps max rating at 7.8 and raises vote floor to 800 to surface fun crowd-pleaser horror instead of bleak prestige picks |
| Excited + Drama | Drops the recency filter, raises rating to 7.5 and votes to 400 to surface landmark high-energy prestige dramas |
| Bored + Horror | Rating sort, raises vote floor to 600 and minimum rating to 7.0 to surface cult classics and genre-defining horror |
| Romantic + Action | Popularity sort with a 130-minute runtime cap and 400-vote floor to avoid heavy long action epics |

**Step 2 -- Parallel TMDB fetch**

The genre ID is merged with the mood filters (or override, if one exists) and sent to TMDB. Pages 1 and 2 are fetched at the same time using `Promise.all`, giving a raw pool of up to 40 movies. Any duplicates across the two pages are removed by movie ID.

**Step 3 -- Scoring and ranking**

Every movie that has at least 100 votes is scored using:

```
score = (vote_average × 0.7) + (log10(vote_count) × 0.3)
```

The 70/30 split balances critical quality with audience reach. The logarithmic scale on vote count prevents blockbusters with millions of votes from completely dominating critically acclaimed films with smaller audiences.

**Step 4 -- Shuffle for variety**

After sorting by score, the top 25 results are taken and shuffled using a Fisher-Yates shuffle. The first 10 from the shuffled pool are returned. This means every request for the same mood and genre combination will return a high-quality but varied set — repeating the same selection will show you different films.

**Step 5 -- Decade range filtering**

The frontend can optionally send a `decadeRange` object with `gte` and/or `lte` date strings. If present, these values are merged into the TMDB query filters after the mood and override filters are built, overwriting any existing date parameters. This means if the Excited mood's four-year recency filter is active and the user selects a specific decade, the decade range takes precedence. If a mood-genre override is active, the decade range is still applied on top.

**Step 6 -- Watched movie exclusion**

The frontend sends an optional `excludeIds` array in the request body containing the numeric IDs of all movies the user has previously marked as watched. Before `rankAndFilter` runs, any movie whose ID appears in `excludeIds` is removed from the pool. This ensures the ranked and shuffled results only contain movies the user has not already seen. The number of movies remaining after exclusion (`poolSizeAfterExclusion`) is returned alongside the results so the frontend can warn users when the pool is running low.

**Step 7 -- Streaming provider lookup**

After ranking, the backend fetches US flatrate streaming availability for each of the 10 result movies in parallel using the TMDB watch providers endpoint. Each movie in the response includes a `streamingProviders` array with provider name and logo URL. If any provider lookup fails, that movie gets an empty array rather than blocking the entire response.

---

## Project structure

```
movie-app/
├── backend/
│   ├── __tests__/
│   │   ├── decadeRange.test.js                  # Decade range validation and filter merging
│   │   ├── decade-filter-url.test.js            # Decade filter UI, shareable URL, copy link
│   │   ├── excludeIds.test.js                   # Watched-ID exclusion logic
│   │   ├── fetchRecommendations.test.js         # Client-side fetch wrapper (excludeIds)
│   │   ├── fetchRecommendations-decadeRange.test.js # Client-side fetch wrapper (decadeRange)
│   │   ├── mood-genre-overrides.test.js         # Combination-specific filter overrides
│   │   ├── movie.test.js                        # GET /movie/:id route
│   │   ├── recommend.test.js                    # rankAndFilter scoring and shuffle
│   │   ├── response-shape.test.js               # POST /recommend response structure
│   │   ├── server.test.js                       # Express health check, CORS, 404
│   │   ├── shuffle-warning.test.js              # Low-pool warning threshold
│   │   ├── streaming-render.test.js             # Streaming provider UI rendering
│   │   ├── streaming-route.test.js              # Streaming data in recommend route
│   │   ├── streaming.test.js                    # getWatchProviders unit tests
│   │   ├── tmdb.test.js                         # discoverMovies and formatMovie
│   │   └── watched.test.js                      # Watched history persistence
│   ├── routes/
│   │   ├── movie.js            # GET /movie/:id handler (detail, credits, trailer)
│   │   ├── recommend.js        # POST /recommend handler and ranking logic
│   │   └── tmdb.js             # TMDB API calls, formatting, providers, movie details
│   ├── .env                    # Environment variables (not committed)
│   ├── package.json
│   └── server.js               # Express app entry point
├── frontend/
│   ├── css/
│   │   ├── burger.css          # Mobile hamburger menu and dropdown
│   │   ├── cards.css           # Movie card styles
│   │   ├── modal.css           # Movie detail modal overlay and panel
│   │   ├── style.css           # Global layout, buttons, responsive breakpoints
│   │   ├── watched.css         # Slide-out watched history panel styles
│   │   └── watchlist.css       # Slide-out watchlist panel styles
│   ├── js/
│   │   ├── api.js              # Fetch wrapper for POST /recommend (accepts excludeIds, decadeRange)
│   │   └── app.js              # UI logic, DOM, modal, burger menu, decade filter, shareable URL
│   └── index.html              # Single-page app shell
├── .gitignore
└── README.md
```

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A free [TMDB API key](https://developer.themoviedb.org/docs/getting-started)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd movie-app
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Set up environment variables

Create a file named `.env` inside the `backend` directory. Add the following, replacing the placeholder with your actual TMDB API key:

```
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3000
```

You can get a free API key by creating an account at [themoviedb.org](https://www.themoviedb.org) and requesting one under Settings > API.

### 4. Start the server

```bash
cd backend
npm start
```

The server starts on `http://localhost:3000`. Open that URL in your browser — the frontend is served automatically from the same process.

For development with auto-restart on file changes:

```bash
npm run dev
```

---

## Running tests

All tests are inside `backend/__tests__/` and use Jest and Supertest.

```bash
cd backend
npm test
```

This runs all 16 test suites (187 tests) with verbose output:

- `tmdb.test.js` -- `formatMovie` (field shaping, poster URL, null handling) and `discoverMovies` (parallel fetch, deduplication, errors)
- `recommend.test.js` -- `rankAndFilter` (vote filtering, scoring, top-25 pool, Fisher-Yates shuffle, `_score` removal)
- `server.test.js` -- Express health check, CORS headers, JSON parsing, 404 handling
- `movie.test.js` -- `GET /movie/:id` route (detail response shape, invalid ID handling, TMDB errors)
- `excludeIds.test.js` -- watched-ID exclusion from the recommendation pool
- `fetchRecommendations.test.js` -- client-side fetch wrapper (request body, error handling)
- `fetchRecommendations-decadeRange.test.js` -- client-side fetch wrapper decadeRange parameter (body shape, lte omission when null)
- `decadeRange.test.js` -- backend decadeRange validation, filter merging, excited mood override, mood-genre override interaction
- `decade-filter-url.test.js` -- decade filter UI (select, deselect, switch, persist through shuffle), shareable URL (updatePageURL, loadFromURL with valid/invalid params), copy link button
- `mood-genre-overrides.test.js` -- combination-specific filter overrides replace base mood filters
- `response-shape.test.js` -- `POST /recommend` returns `{ results, poolSizeAfterExclusion }`
- `shuffle-warning.test.js` -- low-pool threshold triggers frontend warning, decade filter DOM compatibility
- `streaming.test.js` -- `getWatchProviders` unit tests (US flatrate parsing, fallback on error)
- `streaming-route.test.js` -- streaming provider data attached in `POST /recommend` response
- `streaming-render.test.js` -- streaming provider logos rendered on movie cards
- `watched.test.js` -- watched history localStorage persistence and UI sync

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TMDB_API_KEY` | Yes | Your TMDB v3 API key |
| `PORT` | No | Port the server listens on (default: 3000) |

The `.env` file must be placed inside the `backend/` directory. It is excluded from version control by `.gitignore`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express |
| Movie data | TMDB API (v3 `/discover/movie`, `/movie/:id`, `/movie/:id/credits`, `/movie/:id/videos`, `/movie/:id/watch/providers`) |
| HTTP client | Axios |
| Testing | Jest, Supertest |
| Deployment | DigitalOcean App Platform (backend), Vercel (frontend) |
