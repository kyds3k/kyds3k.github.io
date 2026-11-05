import { jobs } from "./experience.js";

const LASTFM_USER = "kyds3k";
// Read-only Last.fm key. It has to ship to the browser on a static site.
const LASTFM_KEY = "70d032701f2e8602243e3915d6d25980";
const LASTFM_PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f.png";
const CASSETTE = "images/cassette-smaller.gif";
const POLL_MS = 180_000;
const THEME_KEY = "theme";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function externalLink(text, url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = text;
  return link;
}

function renderExperience() {
  const list = document.querySelector("#experience");
  const template = document.querySelector("#job-template");

  for (const job of jobs) {
    const entry = template.content.cloneNode(true);
    const heading = entry.querySelector("h3");

    job.links.forEach(({ label, url }, index) => {
      if (index > 0) heading.append(" / ");
      heading.append(url ? externalLink(label, url) : label);
    });

    entry.querySelector(".job-meta").textContent = [job.title, job.dates, job.location]
      .filter(Boolean)
      .join(" | ");
    entry.querySelector(".job-description").innerHTML = job.description;
    entry.querySelectorAll(".job-description a").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });

    list.append(entry);
  }
}

// Types into `element` a character at a time. Screen readers get the whole
// string through aria-label instead of hearing it spelled out.
async function typeOut(element, text, speed = 50) {
  element.setAttribute("aria-label", text);

  if (reducedMotion) {
    element.textContent = text;
    return;
  }

  element.textContent = "";
  element.classList.add("typing");
  for (const character of text) {
    element.textContent += character;
    await new Promise((resolve) => setTimeout(resolve, speed));
  }
  element.classList.remove("typing");
}

async function fetchLatestTrack() {
  const params = new URLSearchParams({
    method: "user.getRecentTracks",
    user: LASTFM_USER,
    api_key: LASTFM_KEY,
    limit: 1,
    extended: 1,
    format: "json",
  });
  const response = await fetch(`https://ws.audioscrobbler.com/2.0?${params}`);
  if (!response.ok) throw new Error(`Last.fm responded ${response.status}`);

  const { recenttracks } = await response.json();
  return recenttracks.track[0];
}

let currentTrackUrl;

async function updateNowPlaying() {
  const name = document.querySelector(".track-name");
  const artist = document.querySelector(".track-artist");
  const art = document.querySelector(".album-art");

  try {
    const track = await fetchLatestTrack();
    if (track.url === currentTrackUrl) return;
    currentTrackUrl = track.url;

    const image = track.image?.[2]?.["#text"];
    const hasArt = image && !image.endsWith(LASTFM_PLACEHOLDER);
    art.src = hasArt ? image : CASSETTE;
    art.alt = hasArt ? `${track.artist.name} - ${track.name}` : "";

    const trackLink = externalLink("", track.url);
    const artistLink = externalLink("", track.artist.url);
    name.replaceChildren(trackLink);
    artist.replaceChildren(artistLink);
    await typeOut(trackLink, track.name);
    await typeOut(artistLink, track.artist.name);
  } catch (error) {
    console.error(error);
    if (!currentTrackUrl) artist.textContent = "Signal lost. Try again later.";
  }
}

function setupPortrait() {
  const video = document.querySelector(".portrait-video");

  video.addEventListener("mouseenter", () => video.play().catch(() => {}));
  video.addEventListener("mouseleave", () => {
    video.pause();
    video.currentTime = 0;
  });
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private windows can block storage. The theme still applies for this visit.
  }
}

function setupTheme() {
  const toggle = document.querySelector(".theme-toggle");

  const applyTheme = (theme) => {
    const isGreen = theme === "green";
    document.body.className = theme;
    toggle.setAttribute("aria-pressed", String(isGreen));
    toggle.setAttribute("aria-label", `Switch to ${isGreen ? "blue" : "green"} theme`);
  };

  applyTheme(readTheme() === "green" ? "green" : "blue");

  toggle.addEventListener("click", () => {
    const theme = document.body.classList.contains("blue") ? "green" : "blue";
    applyTheme(theme);
    saveTheme(theme);
  });
}

renderExperience();
setupTheme();
setupPortrait();

const audioHeading = document.querySelector("[data-typed]");
typeOut(audioHeading, audioHeading.textContent);

updateNowPlaying();
setInterval(() => {
  if (!document.hidden) updateNowPlaying();
}, POLL_MS);
