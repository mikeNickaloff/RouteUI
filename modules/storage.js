const STORAGE_KEY = "routetool.topology.v1";

export function loadFromLocalStorage(createInitialState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return createInitialState();
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to load diagram from localStorage:", error);
    return createInitialState();
  }
}

export function saveToLocalStorage(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
}

export async function loadInitialState(createInitialState, defaultUrl) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load diagram from localStorage:", error);
  }

  if (defaultUrl) {
    try {
      const response = await fetch(defaultUrl, { cache: "no-store" });
      if (response.ok) {
        const parsed = await response.json();
        if (parsed && typeof parsed === "object") {
          saveToLocalStorage(parsed);
          return parsed;
        }
      } else {
        console.warn("Failed to load default example:", response.status);
      }
    } catch (error) {
      console.warn("Failed to fetch default example:", error);
    }
  }

  return createInitialState();
}

export function exportToFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `routetool-topology-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Imported file is not a valid topology JSON object.");
  }
  return parsed;
}
