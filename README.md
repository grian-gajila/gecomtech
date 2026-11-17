# Gecomtech Quiz

A responsive, browser-based trivia app backed by the [Open Trivia Database](https://opentdb.com/).

## Features

- Configurable multiple-choice rounds by topic, difficulty, and length.
- Resume an unfinished round after a reload or return to the home page.
- Local activity summary with the average score and the 20 most recent rounds.
- Review the question-by-question results for any saved round.
- Versioned local storage with validation and explicit recovery for unreadable data.

No account or application backend is required. Quiz data remains in the current browser.

## Deploy to Vercel

This is a static site; Vercel serves the HTML, CSS, and JavaScript over HTTPS. No backend or local server is needed after deployment.

1. Import this repository into Vercel.
2. Select the **Other** framework preset and keep the project root as the root directory.
3. Leave the build command empty and deploy the static files from the repository root.
4. Open the HTTPS deployment URL provided by Vercel.

Do not open `index.html` directly as a `file://` URL: browsers block module loading and cross-origin API requests from that origin. Starting a round requires an internet connection to retrieve questions from Open Trivia Database.

## Tests

Node.js 20 or newer is required. Run the dependency-free unit tests with:

```sh
npm test
```

Core validation, scoring, progress persistence, completion, history retention, and invalid stored data are covered by the tests in `tests/`.
