// The clues are AES-GCM encrypted in data.enc.json, so the password is what
// actually unlocks them. The game isn't loaded until decryption succeeds.

const KEY_SLOT = "moviegame-key";

const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

function applySavedTheme() {
  try {
    if (localStorage.getItem("theme") === "green") document.body.className = "green";
  } catch {
    // Storage can be blocked. The default theme is fine.
  }
}

async function deriveKey(password, payload) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(payload.salt), iterations: payload.iterations },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );
}

async function decryptClues(key, payload) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

// Keeps the game unlocked across refreshes until the tab closes.
function rememberKey(rawKey) {
  try {
    sessionStorage.setItem(KEY_SLOT, toBase64(rawKey));
  } catch {
    // Without storage, a refresh just asks for the password again.
  }
}

async function recallKey() {
  try {
    const saved = sessionStorage.getItem(KEY_SLOT);
    if (!saved) return null;
    return await crypto.subtle.importKey("raw", fromBase64(saved), "AES-GCM", true, ["decrypt"]);
  } catch {
    return null;
  }
}

async function openGame(clues) {
  const { startGame } = await import("./game.js");
  startGame(document.querySelector("#app"), clues);
}

async function init() {
  applySavedTheme();

  const form = document.querySelector(".gate");
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  const error = form.querySelector(".gate-error");

  const response = await fetch("data.enc.json");
  const payload = await response.json();

  const savedKey = await recallKey();
  if (savedKey) {
    try {
      await openGame(await decryptClues(savedKey, payload));
      return;
    } catch {
      sessionStorage.removeItem(KEY_SLOT);
    }
  }

  form.hidden = false;
  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    error.textContent = "";

    try {
      const key = await deriveKey(input.value, payload);
      const clues = await decryptClues(key, payload);
      rememberKey(await crypto.subtle.exportKey("raw", key));
      await openGame(clues);
    } catch {
      error.textContent = "Access denied.";
      input.select();
      button.disabled = false;
    }
  });
}

init();
