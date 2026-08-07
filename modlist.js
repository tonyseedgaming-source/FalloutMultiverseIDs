const MODLIST_CSV_URL = "https://docs.google.com/spreadsheets/d/1vTQ2HqNzLKBHc3mqm_wh2FRLqRwsy4uO2RYP0wjRM0w/export?format=csv&gid=1304496736";

const modList = document.querySelector("[data-mod-list]");
const modlistStatus = document.querySelector("[data-modlist-status]");

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function getImageUrl(imageValue) {
  const trimmedValue = imageValue.trim();

  if (!trimmedValue) {
    return "";
  }

  const imageFormulaMatch = trimmedValue.match(/=IMAGE\(["']([^"']+)["']/i);
  if (imageFormulaMatch) {
    return imageFormulaMatch[1];
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return "";
}

function normalizeMod(row) {
  return {
    image: getImageUrl(row[0] || ""),
    name: (row[1] || "").trim(),
    id: (row[2] || "").trim(),
    authors: (row[3] || "").trim(),
    description: (row[4] || "").trim(),
  };
}

function getMods(csvText) {
  return parseCsv(csvText)
    .slice(2)
    .map(normalizeMod)
    .filter((mod) => mod.name)
    .sort((firstMod, secondMod) => {
      const firstIsVanilla = firstMod.name.toLowerCase() === "vanilla";
      const secondIsVanilla = secondMod.name.toLowerCase() === "vanilla";

      if (firstIsVanilla && !secondIsVanilla) {
        return -1;
      }

      if (!firstIsVanilla && secondIsVanilla) {
        return 1;
      }

      return 0;
    });
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderMod(mod) {
  const article = document.createElement("article");
  article.className = "mod";

  const imageWrap = document.createElement("div");
  imageWrap.className = "mod-image";

  if (mod.image) {
    const image = document.createElement("img");
    image.src = mod.image;
    image.alt = `${mod.name} preview`;
    image.loading = "lazy";
    imageWrap.append(image);
  } else {
    imageWrap.textContent = mod.name.slice(0, 1).toUpperCase();
  }

  const details = document.createElement("div");
  details.className = "mod-details";

  const title = document.createElement("h3");
  title.textContent = mod.id ? `${mod.name} - ${mod.id}` : mod.name;
  details.append(title);

  details.append(createTextElement("p", "mod-description", mod.description || "No description provided."));

  if (mod.authors) {
    details.append(createTextElement("p", "mod-authors", `Author(s): ${mod.authors}`));
  }

  article.append(imageWrap, details);
  return article;
}

function renderMods(mods) {
  modList.replaceChildren(...mods.map(renderMod));
  modlistStatus.hidden = true;
}

async function loadMods() {
  try {
    const response = await fetch(MODLIST_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Sheet request failed with ${response.status}`);
    }

    const csvText = await response.text();
    const mods = getMods(csvText);

    if (!mods.length) {
      throw new Error("No mods were found in the Modlist sheet.");
    }

    renderMods(mods);
  } catch (error) {
    modlistStatus.textContent = "Unable to load mods from the sheet right now. Please try again later.";
    modlistStatus.classList.add("modlist-status--error");
    console.error(error);
  }
}

if (modList && modlistStatus) {
  loadMods();
}
