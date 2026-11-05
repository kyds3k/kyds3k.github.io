#!/usr/bin/env node
// Encrypts or decrypts the Movie Game clues. No dependencies.
//
//   node tools/moviegame-data.mjs decrypt   data.enc.json -> moviegame-data.json
//   node tools/moviegame-data.mjs encrypt   moviegame-data.json -> data.enc.json
//
// moviegame-data.json holds the answers in plain text and is gitignored.
// Change the password by decrypting with the old one and encrypting with the new one.

import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const PLAIN_FILE = new URL("../moviegame/moviegame-data.json", import.meta.url);
const ENCRYPTED_FILE = new URL("../moviegame/data.enc.json", import.meta.url);
const ITERATIONS = 600_000;

function askPassword() {
  if (process.env.MOVIEGAME_PASSWORD) return process.env.MOVIEGAME_PASSWORD;

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const write = prompt._writeToOutput.bind(prompt);
  prompt._writeToOutput = (text) => {
    if (text.startsWith("Password")) write(text);
  };

  return new Promise((resolve) => {
    prompt.question("Password: ", (password) => {
      prompt.close();
      process.stdout.write("\n");
      resolve(password);
    });
  });
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt() {
  const plain = await readFile(PLAIN_FILE);
  JSON.parse(plain);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(await askPassword(), salt, ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  const base64 = (bytes) => Buffer.from(bytes).toString("base64");
  const payload = {
    iterations: ITERATIONS,
    salt: base64(salt),
    iv: base64(iv),
    ciphertext: base64(ciphertext),
  };
  await writeFile(ENCRYPTED_FILE, `${JSON.stringify(payload)}\n`);
  console.log("Wrote moviegame/data.enc.json");
}

async function decrypt() {
  const payload = JSON.parse(await readFile(ENCRYPTED_FILE, "utf8"));
  const bytes = (value) => Buffer.from(value, "base64");
  const key = await deriveKey(await askPassword(), bytes(payload.salt), payload.iterations);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(payload.iv) },
      key,
      bytes(payload.ciphertext),
    );
    await writeFile(PLAIN_FILE, Buffer.from(plain));
    console.log("Wrote moviegame/moviegame-data.json");
  } catch {
    console.error("Wrong password.");
    process.exitCode = 1;
  }
}

const commands = { encrypt, decrypt };
const command = commands[process.argv[2]];

if (command) {
  await command();
} else {
  console.error("Usage: node tools/moviegame-data.mjs <encrypt|decrypt>");
  process.exitCode = 1;
}
