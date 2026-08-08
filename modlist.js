// ============================================================
// FALLOUT MULTIVERSE MOD LIST
// ============================================================


// Google Sheets CSV URL
const MODLIST_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1vTQ2HqNzLKBHc3mqm_wh2FRLqRwsy4uO2RYP0wjRM0w/export?format=csv&gid=1304496736";


// Find elements on the page
const modList = document.querySelector("[data-mod-list]");
const modlistStatus = document.querySelector("[data-modlist-status]");


// ============================================================
// CSV PARSER
// ============================================================

function parseCsv(csvText) {

  const rows = [];

  let row = [];
  let field = "";
  let inQuotes = false;


  for (let i = 0; i < csvText.length; i++) {

    const char = csvText[i];
    const nextChar = csvText[i + 1];


    // Handle quotes
    if (char === '"') {

      // Double quote inside quoted field
      if (inQuotes && nextChar === '"') {

        field += '"';
        i++;

      } else {

        inQuotes = !inQuotes;

      }

    }


    // Handle comma
    else if (char === "," && !inQuotes) {

      row.push(field);
      field = "";

    }


    // Handle new line
    else if (
      (char === "\n" || char === "\r") &&
      !inQuotes
    ) {

      // Handle Windows CRLF
      if (char === "\r" && nextChar === "\n") {
        i++;
      }


      row.push(field);

      rows.push(row);

      row = [];
      field = "";

    }


    // Normal character
    else {

      field += char;

    }

  }


  // Add final field
  if (field || row.length) {

    row.push(field);

    rows.push(row);

  }


  return rows;
}


// ============================================================
// IMAGE URL HANDLER
// ============================================================

function getImageUrl(imageValue) {

  const trimmedValue = imageValue.trim();


  // Empty cell
  if (!trimmedValue) {
    return "";
  }


  // Google Sheets IMAGE formula
  //
  // Example:
  // =IMAGE("https://example.com/image.png")
  //
  const imageFormulaMatch =
    trimmedValue.match(/=IMAGE\(\s*["']([^"']+)["']/i);


  if (imageFormulaMatch) {

    return imageFormulaMatch[1];

  }


  // Normal URL
  if (/^https?:\/\//i.test(trimmedValue)) {

    return trimmedValue;

  }


  return "";
}


// ============================================================
// NORMALIZE MOD
// ============================================================

function normalizeMod(row) {

  return {

    // Column A
    image: getImageUrl(row[0] || ""),

    // Column B
    name: (row[1] || "").trim(),

    // Column C
    id: (row[2] || "").trim(),

    // Column D
    authors: (row[3] || "").trim(),

    // Column E
    description: (row[4] || "").trim()

  };

}


// ============================================================
// GET MODS
// ============================================================

function getMods(csvText) {

  const rows = parseCsv(csvText);


  /*
    Your sheet appears to have two header rows.

    Therefore we skip the first two rows.

    If your sheet only has ONE header row,
    change .slice(2) to .slice(1).
  */

  return rows

    .slice(2)

    .map(normalizeMod)

    .filter((mod) => mod.name)

    .sort((firstMod, secondMod) => {

      // Always put Vanilla first
      const firstIsVanilla =
        firstMod.name.toLowerCase() === "vanilla";

      const secondIsVanilla =
        secondMod.name.toLowerCase() === "vanilla";


      if (firstIsVanilla && !secondIsVanilla) {
        return -1;
      }


      if (!firstIsVanilla && secondIsVanilla) {
        return 1;
      }


      return 0;

    });

}


// ============================================================
// CREATE TEXT ELEMENT
// ============================================================

function createTextElement(
  tagName,
  className,
  text
) {

  const element =
    document.createElement(tagName);

  element.className = className;

  element.textContent = text;

  return element;

}


// ============================================================
// CREATE MOD CARD
// ============================================================

function renderMod(mod) {

  const article =
    document.createElement("article");

  article.className = "content-pack mod";


  // ==========================================================
  // IMAGE
  // ==========================================================

  const imageWrap =
    document.createElement("div");

  imageWrap.className = "mod-image";


  if (mod.image) {

    const image =
      document.createElement("img");

    image.src = mod.image;

    image.alt =
      `${mod.name} preview`;

    image.loading = "lazy";


    // If image fails to load
    image.onerror = function () {

      imageWrap.textContent =
        mod.name.slice(0, 1).toUpperCase();

      imageWrap.classList.add(
        "mod-image-fallback"
      );

    };


    imageWrap.append(image);

  } else {

    imageWrap.textContent =
      mod.name.slice(0, 1).toUpperCase();

    imageWrap.classList.add(
      "mod-image-fallback"
    );

  }


  // ==========================================================
  // MOD DETAILS
  // ==========================================================

  const details =
    document.createElement("div");

  details.className = "mod-details";


  // Mod name
  const title =
    document.createElement("h3");


  if (mod.id) {

    title.textContent =
      `${mod.name} - ${mod.id}`;

  } else {

    title.textContent =
      mod.name;

  }


  details.append(title);


  // Description
  details.append(
    createTextElement(
      "p",
      "mod-description",
      mod.description ||
        "No description provided."
    )
  );


  // Authors
  if (mod.authors) {

    details.append(
      createTextElement(
        "p",
        "mod-authors",
        `Author(s): ${mod.authors}`
      )
    );

  }


  // Put everything together
  article.append(
    imageWrap,
    details
  );


  return article;

}


// ============================================================
// RENDER ALL MODS
// ============================================================

function renderMods(mods) {

  // Remove existing content
  modList.replaceChildren();


  // Add every mod
  mods.forEach((mod) => {

    modList.append(
      renderMod(mod)
    );

  });


  // Hide loading message
  modlistStatus.hidden = true;

}


// ============================================================
// LOAD MODS FROM GOOGLE SHEETS
// ============================================================

async function loadMods() {

  try {

    // Request CSV
    const response =
      await fetch(
        MODLIST_CSV_URL,
        {
          cache: "no-store"
        }
      );


    // Check response
    if (!response.ok) {

      throw new Error(
        `Sheet request failed with HTTP ${response.status}`
      );

    }


    // Convert response to text
    const csvText =
      await response.text();


    // Parse mods
    const mods =
      getMods(csvText);


    // Make sure we actually found mods
    if (!mods.length) {

      throw new Error(
        "No mods were found in the Modlist sheet."
      );

    }


    // Display mods
    renderMods(mods);


    console.log(
      `Loaded ${mods.length} mods from Google Sheets.`
    );

  }


  catch (error) {

    console.error(
      "Failed to load Multiverse Mods:",
      error
    );


    // Display useful error
    modlistStatus.hidden = false;

    modlistStatus.textContent =
      "Unable to load mods from the Modlist right now.";


    modlistStatus.classList.add(
      "modlist-status--error"
    );

  }

}


// ============================================================
// START
// ============================================================

if (
  modList &&
  modlistStatus
) {

  loadMods();

}
