const MODLIST_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1vTQ2HqNzLKBHc3mqm_wh2FRLqRwsy4uO2RYPOwjRM0w/gviz/tq?tqx=out:csv&gid=1304496736";

const modList = document.querySelector("[data-mod-list]");
const modlistStatus = document.querySelector("[data-modlist-status]");


/* ========================= */
/* CSV PARSER */
/* ========================= */

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {

      if (inQuotes && nextChar === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }

    } else if (char === "," && !inQuotes) {

      row.push(field);
      field = "";

    } else if ((char === "\n" || char === "\r") && !inQuotes) {

      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      row.push(field);

      // Ignore completely empty rows
      if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      field = "";

    } else {

      field += char;

    }
  }

  if (field || row.length) {
    row.push(field);

    if (row.some(cell => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}


/* ========================= */
/* IMAGE URL */
/* ========================= */

function getImageUrl(imageValue) {

  const trimmedValue = imageValue.trim();

  if (!trimmedValue) {
    return "";
  }

  // Google Sheets IMAGE("URL")
  const imageFormulaMatch = trimmedValue.match(
    /=IMAGE\(\s*["']([^"']+)["']/i
  );

  if (imageFormulaMatch) {
    return imageFormulaMatch[1];
  }

  // Direct image URL
  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return "";
}


/* ========================= */
/* NORMALIZE MOD */
/* ========================= */

function normalizeMod(row) {

  return {
    image: getImageUrl(row[0] || ""),
    name: (row[1] || "").trim(),
    id: (row[2] || "").trim(),
    authors: (row[3] || "").trim(),
    description: (row[4] || "").trim()
  };

}


/* ========================= */
/* GET MODS */
/* ========================= */

function getMods(csvText) {

  const rows = parseCsv(csvText);

  // Row 1 = title
  // Row 2 = column headers
  // Data starts at row 3
  return rows
    .slice(2)
    .map(normalizeMod)
    .filter(mod => mod.name)
    .sort((a, b) => {

      const aVanilla =
        a.name.toLowerCase() === "vanilla";

      const bVanilla =
        b.name.toLowerCase() === "vanilla";

      if (aVanilla && !bVanilla) {
        return -1;
      }

      if (!aVanilla && bVanilla) {
        return 1;
      }

      return a.name.localeCompare(b.name);

    });

}


/* ========================= */
/* CREATE TEXT ELEMENT */
/* ========================= */

function createTextElement(tagName, className, text) {

  const element = document.createElement(tagName);

  element.className = className;
  element.textContent = text;

  return element;

}


/* ========================= */
/* RENDER MOD */
/* ========================= */

function renderMod(mod) {

  const article = document.createElement("article");

  article.className = "mod";


  /* IMAGE */

  const imageWrap = document.createElement("div");

  imageWrap.className = "mod-image";


  if (mod.image) {

    const image = document.createElement("img");

    image.src = mod.image;

    image.alt = `${mod.name} preview`;

    image.loading = "lazy";

    image.onerror = () => {
      imageWrap.textContent =
        mod.name.slice(0, 1).toUpperCase();
    };

    imageWrap.append(image);

  } else {

    imageWrap.textContent =
      mod.name.slice(0, 1).toUpperCase();

  }


  /* DETAILS */

  const details = document.createElement("div");

  details.className = "mod-details";


  /* TITLE */

  const title = document.createElement("h3");

  title.textContent =
    mod.id
      ? `${mod.name} - ${mod.id}`
      : mod.name;

  details.append(title);


  /* DESCRIPTION */

  details.append(
    createTextElement(
      "p",
      "mod-description",
      mod.description || "No description provided."
    )
  );


  /* AUTHORS */

  if (mod.authors) {

    details.append(
      createTextElement(
        "p",
        "mod-authors",
        `Author(s): ${mod.authors}`
      )
    );

  }


  article.append(
    imageWrap,
    details
  );

  return article;

}


/* ========================= */
/* RENDER ALL MODS */
/* ========================= */

function renderMods(mods) {

  modList.replaceChildren(
    ...mods.map(renderMod)
  );

  modlistStatus.hidden = true;

}


/* ========================= */
/* LOAD MODS */
/* ========================= */

async function loadMods() {

  try {

    modlistStatus.textContent =
      "Loading mods from the Modlist...";

    modlistStatus.classList.remove(
      "modlist-status--error"
    );


    const response = await fetch(
      MODLIST_CSV_URL,
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        `Google Sheets request failed with HTTP ${response.status}`
      );

    }


    const csvText = await response.text();


    console.log("Google Sheets CSV:");

    console.log(csvText);


    const mods = getMods(csvText);


    console.log("Mods loaded:");

    console.log(mods);


    if (!mods.length) {

      throw new Error(
        "No mods were found in the Modlist sheet."
      );

    }


    renderMods(mods);


  } catch (error) {

    console.error(
      "Modlist loading error:",
      error
    );


    modlistStatus.hidden = false;

    modlistStatus.textContent =
      "Unable to load mods from the Modlist right now. Please try again later.";

    modlistStatus.classList.add(
      "modlist-status--error"
    );

  }

}


/* ========================= */
/* START */
/* ========================= */

if (modList && modlistStatus) {

  loadMods();

} else {

  console.error(
    "Modlist elements were not found in the HTML."
  );

}
