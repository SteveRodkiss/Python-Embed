// Simple CRUD editor for exercises.json.
// Uses the File System Access API when available so changes can be saved
// straight back to disk; otherwise falls back to downloading the file.
// The file handle is remembered in IndexedDB so the file can reload
// automatically next time, without showing the picker again.

let data = {};
let currentKey = null;
let fileHandle = null;
const canUseFileSystemAccess = "showOpenFilePicker" in window;
const DB_NAME = "exercise-editor";
const STORE_NAME = "handles";
const HANDLE_KEY = "exercisesFile";

const els = {
  status: document.getElementById("status"),
  app: document.getElementById("app"),
  list: document.getElementById("list"),
  editor: document.getElementById("editor"),
  openBtn: document.getElementById("openBtn"),
  saveBtn: document.getElementById("saveBtn"),
  newBtn: document.getElementById("newBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  fieldKey: document.getElementById("fieldKey"),
  fieldTitle: document.getElementById("fieldTitle"),
  fieldInstructions: document.getElementById("fieldInstructions"),
  fieldCode: document.getElementById("fieldCode"),
  fieldHint: document.getElementById("fieldHint"),
};

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("w3-pale-red", isError);
  els.status.classList.toggle("w3-border-red", isError);
  els.status.classList.toggle("w3-pale-yellow", !isError);
  els.status.classList.toggle("w3-border-amber", !isError);
}

async function openFile() {
  try {
    let text;
    if (canUseFileSystemAccess) {
      const reused = await tryReuseStoredHandle();
      if (reused) return;
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      fileHandle = handle;
      await idbSet(HANDLE_KEY, handle);
      const file = await handle.getFile();
      text = await file.text();
    } else {
      text = await openFileFallback();
    }
    data = JSON.parse(text);
    currentKey = null;
    els.editor.style.display = "none";
    els.app.style.display = "block";
    els.saveBtn.disabled = false;
    renderList();
    setStatus(
      canUseFileSystemAccess
        ? "Loaded. Changes are saved directly back to the file you opened."
        : "Loaded. Your browser can't write files directly, so Save will download an updated copy."
    );
  } catch (err) {
    if (err.name !== "AbortError") setStatus("Could not open file: " + err.message, true);
  }
}

function openFileFallback() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return reject(new Error("No file selected"));
      file.text().then(resolve, reject);
    };
    input.click();
  });
}

// Tries to reload the previously opened file via its remembered handle,
// asking for permission again if the browser has forgotten it.
async function tryReuseStoredHandle() {
  const handle = await idbGet(HANDLE_KEY);
  if (!handle) return false;
  if (!(await verifyPermission(handle))) return false;
  fileHandle = handle;
  const file = await handle.getFile();
  data = JSON.parse(await file.text());
  currentKey = null;
  els.editor.style.display = "none";
  els.app.style.display = "block";
  els.saveBtn.disabled = false;
  renderList();
  setStatus("Reloaded exercises.json. Changes are saved directly back to the file.");
  return true;
}

// Silently reloads the last file on page load if permission is still granted
// (no picker, no prompt) so opening editor.html feels seamless.
async function tryAutoLoadOnStartup() {
  if (!canUseFileSystemAccess) return;
  try {
    const handle = await idbGet(HANDLE_KEY);
    if (!handle) return;
    const granted = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
    if (!granted) return;
    fileHandle = handle;
    const file = await handle.getFile();
    data = JSON.parse(await file.text());
    currentKey = null;
    els.app.style.display = "block";
    els.saveBtn.disabled = false;
    renderList();
    setStatus("Reloaded exercises.json automatically.");
  } catch {
    // Ignore and let the user open the file manually.
  }
}

async function verifyPermission(handle) {
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if ((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function renderList() {
  els.list.innerHTML = "";
  const keys = Object.keys(data);
  if (keys.length === 0) {
    els.list.innerHTML = '<div class="w3-bar-item w3-text-grey">No exercises yet.</div>';
    return;
  }
  for (const key of keys) {
    const item = document.createElement("div");
    item.className = "w3-bar-item w3-button" + (key === currentKey ? " active" : "");
    item.textContent = data[key].title ? `${key} — ${data[key].title}` : key;
    item.onclick = () => selectKey(key);
    els.list.appendChild(item);
  }
}

function selectKey(key) {
  currentKey = key;
  const exercise = data[key];
  els.fieldKey.value = key;
  els.fieldTitle.value = exercise.title || "";
  els.fieldInstructions.value = exercise.instructions || "";
  els.fieldCode.value = exercise.code || "";
  els.fieldHint.value = exercise.hint || "";
  els.editor.style.display = "block";
  renderList();
}

function newExercise() {
  let key = prompt("Enter a unique key for the new exercise (e.g. debug04):");
  if (key === null) return;
  key = key.trim();
  if (!key) {
    setStatus("Key cannot be empty.", true);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(data, key)) {
    setStatus(`Key "${key}" already exists.`, true);
    return;
  }
  data[key] = { title: "", instructions: "", code: "", hint: "" };
  selectKey(key);
}

function deleteExercise() {
  if (!currentKey) return;
  if (!confirm(`Delete exercise "${currentKey}"? This cannot be undone.`)) return;
  delete data[currentKey];
  currentKey = null;
  els.editor.style.display = "none";
  renderList();
}

function renameKey(newKey) {
  newKey = newKey.trim();
  if (!newKey || newKey === currentKey) {
    els.fieldKey.value = currentKey;
    return;
  }
  if (Object.prototype.hasOwnProperty.call(data, newKey)) {
    setStatus(`Key "${newKey}" already exists.`, true);
    els.fieldKey.value = currentKey;
    return;
  }
  const reordered = {};
  for (const key of Object.keys(data)) {
    reordered[key === currentKey ? newKey : key] = data[key];
  }
  data = reordered;
  currentKey = newKey;
  renderList();
}

function updateField(field, value) {
  if (!currentKey) return;
  data[currentKey][field] = value;
  if (field === "title") renderList();
}

async function saveFile() {
  const json = JSON.stringify(data, null, 2);
  try {
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      setStatus("Saved to exercises.json.");
    } else {
      downloadFile(json);
      setStatus("Downloaded updated exercises.json. Replace the original file with this copy.");
    }
  } catch (err) {
    setStatus("Could not save: " + err.message, true);
  }
}

function downloadFile(json) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exercises.json";
  a.click();
  URL.revokeObjectURL(url);
}

els.openBtn.addEventListener("click", openFile);
els.saveBtn.addEventListener("click", saveFile);
els.newBtn.addEventListener("click", newExercise);
els.deleteBtn.addEventListener("click", deleteExercise);
els.fieldKey.addEventListener("change", (e) => renameKey(e.target.value));
els.fieldTitle.addEventListener("input", (e) => updateField("title", e.target.value));
els.fieldInstructions.addEventListener("input", (e) => updateField("instructions", e.target.value));
els.fieldCode.addEventListener("input", (e) => updateField("code", e.target.value));
els.fieldHint.addEventListener("input", (e) => updateField("hint", e.target.value));

tryAutoLoadOnStartup();
