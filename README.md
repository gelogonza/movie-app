# MovieRecs

Live demo: [https://movie-app-movierecs.vercel.app](https://movie-app-movierecs.vercel.app)

A mood-based movie recommendation web app. You pick how you are feeling, pick a genre, and get a personalised list of 10 movies to watch — no account, no sign-up, no algorithm tracking you.

---

## What it does

MovieRecs walks you through two choices:

1. **Mood** — how you are feeling right now (Happy, Sad, Excited, Anxious, Romantic, Bored)
2. **Genre** — what kind of film you are in the mood for (Action, Comedy, Drama, Horror, Romance, Sci-Fi, Fantasy, Animation, Documentary, Crime, Thriller, War)

Once both are selected, the app queries the TMDB movie database using filters tuned to your mood, scores the results using a custom ranking formula, shuffles the top picks so you get something different each time, and displays up to 10 movie cards with poster, title, rating, year, and overview.

Beyond the core recommendation flow, the app includes three additional features:

- **Watchlist** — users can save any movie from the results grid by clicking a Save button on the card. Saved movies appear in a slide-out panel accessible from the navbar. The watchlist persists between browser sessions using localStorage.
- **Watched history** — users can mark any movie as watched. Watched movies are stored in localStorage and sent to the backend with every new recommendation request. The backend filters them out before ranking so the user always receives results they have not seen before.
- **Streaming availability** — each movie card shows which US streaming services the movie is currently available on as subscription streaming. Service logos are fetched from the TMDB watch providers endpoint and displayed below the movie overview.

---

## How it works

### Frontend

The frontend is a single HTML page (`frontend/index.html`) with three sections that show and hide one at a time: mood selection, genre selection, and results. There is no framework — just plain HTML, CSS, and two vanilla JavaScript files.

- `frontend/js/api.js` — handles the `POST /recommend` request to the backend and parses the response
- `frontend/js/app.js` — manages all screen transitions, click events, and injects movie cards into the DOM using `createElement`
- `frontend/css/style.css` — layout, buttons, typography, and responsive styles
- `frontend/css/cards.css` — movie card styles

### Backend

The backend is a Node.js and Express server (`backend/server.js`) that also serves the frontend as static files. It exposes one API endpoint:

```
POST /recommend
Content-Type: application/json

{ "mood": "happy", "genreId": 35 }
```

Returns a JSON array of up to 10 movie objects, each with: `id`, `title`, `overview`, `release_date`, `vote_average`, `vote_count`, `poster_path`, `genre_ids`.

#### Recommendation pipeline

**Step 1 — Mood to TMDB filters**

Each mood maps to a hardcoded set of TMDB `/discover/movie` query parameters that control how movies are sorted and what minimum quality thresholds apply:

| Mood | Sort by | Min rating | Min votes | Extra |
|---|---|---|---|---|
| Happy | Popularity | 6.5 | 200 | — |
| Sad | Rating | 7.5 | 300 | — |
| Excited | Popularity | 6.0 | 150 | Released in last 4 years only |
| Anxious | Rating | 7.0 | 200 | Runtime 100 min or under |
| Romantic | Rating | 6.5 | 150 | — |
| Bored | Popularity | 6.0 | 500 | — |

**Step 2 — Parallel TMDB fetch**

The genre ID is merged with the mood filters and sent to TMDB. Pages 1 and 2 are fetched at the same time using `Promise.all`, giving a raw pool of up to 40 movies. Any duplicates across the two pages are removed by movie ID.

**Step 3 — Scoring and ranking**

Every movie that has at least 100 votes is scored using:

```
score = (vote_average × 0.7) + (log10(vote_count) × 0.3)
```

The 70/30 split balances critical quality with audience reach. The logarithmic scale on vote count prevents blockbusters with millions of votes from completely dominating critically acclaimed films with smaller audiences.

**Step 4 — Shuffle for variety**

After sorting by score, the top 25 results are taken and shuffled using a Fisher-Yates shuffle. The first 10 from the shuffled pool are returned. This means every request for the same mood and genre combination will return a high-quality but varied set — repeating the same selection will show you different films.

**Step 5 — Watched movie exclusion**

The frontend sends an optional `excludeIds` array in the request body containing the numeric IDs of all movies the user has previously marked as watched. Before `rankAndFilter` runs, any movie whose ID appears in `excludeIds` is removed from the pool. This ensures the ranked and shuffled results only contain movies the user has not already seen.

---

## Project structure

```
movie-app/
├── backend/
│   ├── __tests__/
│   │   ├── recommend.test.js   # Tests for rankAndFilter
│   │   ├── tmdb.test.js        # Tests for discoverMovies and formatMovie
│   │   └── server.test.js      # Tests for Express routes and middleware
│   ├── routes/
│   │   ├── recommend.js        # POST /recommend handler and ranking logic
│   │   └── tmdb.js             # TMDB API calls, movie formatting, and getWatchProviders
│   ├── .env                    # Environment variables (not committed)
│   ├── package.json
│   └── server.js               # Express app entry point
├── frontend/
│   ├── css/
│   │   ├── cards.css           # Movie card styles
│   │   ├── style.css           # Global layout and button styles
│   │   ├── watchlist.css       # Slide-out watchlist panel styles
│   │   └── watched.css         # Slide-out watched history panel styles
│   ├── js/
│   │   ├── api.js              # Fetch wrapper for POST /recommend (accepts excludeIds)
│   │   └── app.js              # UI logic and DOM manipulation
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

This runs all three test suites with verbose output:

- `tmdb.test.js` — covers `formatMovie` (field shaping, poster URL construction, null handling) and `discoverMovies` (parallel fetching, page merging, deduplication, error handling)
- `recommend.test.js` — covers `rankAndFilter` (vote count filtering, scoring, top-25 pool selection, Fisher-Yates shuffle, `_score` field removal)
- `server.test.js` — covers the Express app health check, CORS headers, JSON parsing, and 404 handling

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
| Movie data | TMDB API (v3 `/discover/movie`) |
| HTTP client | Axios |
| Testing | Jest, Supertest |
| Deployment | DigitalOcean App Platform (backend), Vercel (frontend) |
