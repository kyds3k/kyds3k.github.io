# kyds3k.github.io

Adam Darby's resume site. Plain HTML, CSS and JavaScript with no build step. GitHub Pages serves `main` directly.

## Update the resume

- Jobs: edit `js/experience.js`, newest first.
- Skills, contact and projects: edit `index.html`.
- PDF: replace `pdf/Adam_Darby_resume.pdf`.

## Run locally

JavaScript modules need a server, so opening `index.html` directly won't work:

```sh
python3 -m http.server 8000
```

## Movie Game

The clues are encrypted in `moviegame/data.enc.json`, and the password decrypts them in the browser. To edit clues or change the password:

```sh
node tools/moviegame-data.mjs decrypt   # writes moviegame/moviegame-data.json (gitignored)
node tools/moviegame-data.mjs encrypt   # asks for a password, rewrites data.enc.json
```

Each clue lists its films with a pinned TMDB poster path, so the game makes no API calls. Add an optional `accept` list to a clue for other answers that should count.

Side pages such as `tunes.html` still use the old `css/main.min.css`.
