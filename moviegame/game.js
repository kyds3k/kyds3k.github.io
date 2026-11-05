const POSTER_URL = "https://image.tmdb.org/t/p/w500";
const MATCH_THRESHOLD = 0.8;
const TYPE_SPEED = 40;

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover)").matches;

const TEMPLATE = `
  <section class="stage card notch-right">
    <header class="hud">
      <h1>Movie Game</h1>
      <p class="status"></p>
      <button class="cta host-toggle" type="button"></button>
    </header>

    <p class="sr-only clue-text" role="status"></p>
    <p class="clue" aria-hidden="true"></p>

    <div class="posters"></div>
    <p class="answer"></p>

    <form class="guess">
      <label class="sr-only" for="guess-input">Your guess</label>
      <input id="guess-input" type="text" autocomplete="off" placeholder="Name the mashup">
      <button class="cta" type="submit">Guess</button>
    </form>
    <p class="feedback" role="status"></p>

    <div class="actions">
      <button class="cta reveal" type="button"></button>
      <button class="cta next" type="button">Skip</button>
    </div>

    <p class="keys">Space: reveal &nbsp; N: next &nbsp; H: exit host mode</p>

    <p class="credit">
      This product uses the TMDB API but is not endorsed or certified by TMDB.
      <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
        <img src="/images/blue_long_1-8ba2ac31f354005783fab473602c34c3f4fd207150182061e425d366e4f34596.svg" alt="The Movie Database">
      </a>
    </p>
  </section>
`;

function shuffled(items) {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

function isCloseEnough(guess, answer) {
  const a = normalize(guess);
  const b = normalize(answer);
  if (!a) return false;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length) >= MATCH_THRESHOLD;
}

export function startGame(root, clues) {
  root.innerHTML = TEMPLATE;

  const find = (selector) => root.querySelector(selector);
  const clue = find(".clue");
  const clueText = find(".clue-text");
  const posters = find(".posters");
  const answer = find(".answer");
  const guessForm = find(".guess");
  const guessInput = find("#guess-input");
  const feedback = find(".feedback");
  const status = find(".status");
  const revealButton = find(".reveal");
  const nextButton = find(".next");
  const hostToggle = find(".host-toggle");

  let deck = shuffled(clues);
  let index = 0;
  let revealed = 0;
  let finished = false;
  let score = 0;
  let streak = 0;
  let hostMode = new URLSearchParams(location.search).has("host");
  let typing = null;

  const round = () => deck[index];

  // Only one element types at a time. Finishing writes the full text right
  // away and stops the timer, so nothing can land in a later round.
  function finishTyping() {
    if (!typing) return false;
    typing.stopped = true;
    typing.element.textContent = typing.text;
    typing.element.classList.remove("typing");
    typing = null;
    return true;
  }

  function typeOut(element, text) {
    finishTyping();

    if (reducedMotion) {
      element.textContent = text;
      return;
    }

    const job = { element, text, stopped: false };
    typing = job;
    let position = 0;
    element.textContent = "";
    element.classList.add("typing");

    const step = () => {
      if (job.stopped) return;
      position += 1;
      element.textContent = text.slice(0, position);
      if (position < text.length) {
        setTimeout(step, TYPE_SPEED);
      } else {
        element.classList.remove("typing");
        typing = null;
      }
    };
    step();
  }

  function renderStatus() {
    const progress = `Clue ${index + 1} / ${deck.length}`;
    status.textContent = hostMode ? progress : `${progress} | Score ${score} | Streak ${streak}`;
  }

  function renderButtons() {
    const total = round().movies.length;
    revealButton.hidden = finished;
    revealButton.textContent = revealed < total ? `Hint: poster ${revealed + 1}` : "Reveal answer";
    nextButton.textContent = finished ? "Next clue" : "Skip";
    guessForm.hidden = finished || hostMode;
  }

  function renderPosters() {
    posters.replaceChildren();

    round().movies.forEach((movie, position) => {
      if (position > 0) {
        const plus = document.createElement("span");
        plus.className = "symbol";
        plus.textContent = "+";
        posters.append(plus);
      }
      const slot = document.createElement("div");
      slot.className = "poster";
      slot.textContent = "?";
      posters.append(slot);
    });
  }

  function showPoster(position) {
    const movie = round().movies[position];
    const image = new Image();
    const fadeIn = () => image.classList.add("loaded");
    image.addEventListener("load", fadeIn);
    image.addEventListener("error", fadeIn);
    image.alt = `${movie.title} (${movie.year})`;
    image.src = POSTER_URL + movie.poster;
    root.querySelectorAll(".poster")[position].append(image);
  }

  function preloadPosters() {
    for (const movie of round().movies) new Image().src = POSTER_URL + movie.poster;
  }

  function finishRound() {
    const total = round().movies.length;
    while (revealed < total) showPoster(revealed++);
    finished = true;
    typeOut(answer, round().answer);
    renderButtons();
    renderStatus();
    if (canHover && !hostMode) nextButton.focus();
  }

  function reveal() {
    if (finished) return;
    finishTyping();

    if (revealed < round().movies.length) {
      showPoster(revealed++);
      renderButtons();
    } else {
      streak = 0;
      feedback.textContent = "";
      finishRound();
    }
  }

  function loadRound() {
    finishTyping();
    revealed = 0;
    finished = false;
    answer.textContent = "";
    guessInput.value = "";

    clueText.textContent = round().clue;
    typeOut(clue, round().clue);
    renderPosters();
    preloadPosters();
    renderButtons();
    renderStatus();
    if (canHover && !hostMode) guessInput.focus();
  }

  function next() {
    if (!finished) streak = 0;
    feedback.textContent = "";
    index += 1;

    if (index >= deck.length) {
      deck = shuffled(clues);
      index = 0;
      feedback.textContent = "Deck complete. Reshuffled.";
    }
    loadRound();
  }

  function submitGuess(event) {
    event.preventDefault();
    if (finished) return;

    const accepted = [round().answer, ...(round().accept ?? [])];

    if (accepted.some((answer) => isCloseEnough(guessInput.value, answer))) {
      const points = round().movies.length + 1 - revealed;
      score += points;
      streak += 1;
      feedback.textContent = `Correct! +${points}`;
      finishRound();
    } else {
      feedback.textContent = "Not quite. Try again or take a hint.";
      guessInput.select();
    }
  }

  function setHostMode(enabled) {
    hostMode = enabled;
    document.body.classList.toggle("host", enabled);
    hostToggle.textContent = enabled ? "Exit host mode" : "Host mode";
    renderButtons();
    renderStatus();
  }

  function onKeydown(event) {
    if (event.target.matches("input") || event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === "h") {
      setHostMode(!hostMode);
    } else if (key === "n") {
      next();
    } else if (key === " " && (hostMode || !event.target.closest("button, a"))) {
      // In host mode Space always drives the game, so a focused button can't
      // be clicked by accident.
      event.preventDefault();
      document.activeElement?.blur();
      if (finishTyping()) return;
      if (finished) next();
      else reveal();
    }
  }

  clue.addEventListener("click", finishTyping);
  revealButton.addEventListener("click", reveal);
  nextButton.addEventListener("click", next);
  guessForm.addEventListener("submit", submitGuess);
  hostToggle.addEventListener("click", () => {
    setHostMode(!hostMode);
    hostToggle.blur();
  });
  document.addEventListener("keydown", onKeydown);

  setHostMode(hostMode);
  loadRound();
}
