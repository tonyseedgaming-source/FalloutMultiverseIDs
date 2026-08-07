const MODLIST_CSV_URL = "https://docs.google.com/spreadsheets/d/1vTQ2HqNzLKBHc3mqm_wh2FRLqRwsy4uO2RYP0wjRM0w/export?format=csv&gid=1304496736";

const contentPackList = document.querySelector("[data-content-pack-list]");
const contentPackStatus = document.querySelector("[data-content-pack-status]");

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

function normalizeContentPack(row) {
  return {
    image: getImageUrl(row[0] || ""),
    name: (row[1] || "").trim(),
    id: (row[2] || "").trim(),
    authors: (row[3] || "").trim(),
    description: (row[4] || "").trim(),
  };
}

function getContentPacks(csvText) {
  return parseCsv(csvText)
    .slice(2)
    .map(normalizeContentPack)
    .filter((pack) => pack.name)
    .sort((firstPack, secondPack) => {
      const firstIsVanilla = firstPack.name.toLowerCase() === "vanilla";
      const secondIsVanilla = secondPack.name.toLowerCase() === "vanilla";

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

function renderContentPack(pack) {
  const article = document.createElement("article");
  article.className = "content-pack";

  const imageWrap = document.createElement("div");
  imageWrap.className = "content-pack-image";

  if (pack.image) {
    const image = document.createElement("img");
    image.src = pack.image;
    image.alt = `${pack.name} preview`;
    image.loading = "lazy";
    imageWrap.append(image);
  } else {
    imageWrap.textContent = pack.name.slice(0, 1).toUpperCase();
  }

  const details = document.createElement("div");
  details.className = "content-pack-details";

  const title = document.createElement("h3");
  title.textContent = pack.id ? `${pack.name} - ${pack.id}` : pack.name;
  details.append(title);

  details.append(createTextElement("p", "content-pack-description", pack.description || "No description provided."));

  if (pack.authors) {
    details.append(createTextElement("p", "content-pack-authors", `Author(s): ${pack.authors}`));
  }

  article.append(imageWrap, details);
  return article;
}

function renderContentPacks(packs) {
  contentPackList.replaceChildren(...packs.map(renderContentPack));
  contentPackStatus.hidden = true;
}

async function loadContentPacks() {
  try {
    const response = await fetch(MODLIST_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Sheet request failed with ${response.status}`);
    }

    const csvText = await response.text();
    const packs = getContentPacks(csvText);

    if (!packs.length) {
      throw new Error("No content packs were found in the Modlist sheet.");
    }

    renderContentPacks(packs);
  } catch (error) {
    contentPackStatus.textContent = "Unable to load content packs from the sheet right now. Please try again later.";
    contentPackStatus.classList.add("content-pack-status--error");
    console.error(error);
  }
}

if (contentPackList && contentPackStatus) {
  loadContentPacks();
}
