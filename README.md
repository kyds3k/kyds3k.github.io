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

Side pages such as `tunes.html` still use the old `css/main.min.css`.
