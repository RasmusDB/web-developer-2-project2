const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const detailsEl = document.getElementById("details");
const loadMoreBtn = document.getElementById("load-more");

if (typeof API_BASE === "undefined") {
    statusEl.textContent = "Config missing, meaning js/config.js not found."; // this is a fatal error, so we don't continue
}
const BASE = API_BASE;

const FIELDS = "Name,Icon,LevelEquip";
const PAGE_SIZE = 15;

// state that changes while the page is used
let nextCursor = null;    // cursor for the next page of results, null when there are no more
let shownCount = 0;       // how many cards are currently on screen
let selectedCard = null;  // the card that was clicked last

// returns a URL string for the first page of search results
function buildSearchUrl(term) {
    const params = new URLSearchParams({
        sheets: "Item",
        query: `Name~"${term}"`,
        fields: FIELDS,
        limit: PAGE_SIZE
    });
    return `${BASE}/search?${params}`;
}

// returns a URL string for the next page (the cursor remembers the search, so no query needed)
function buildNextPageUrl(cursor) {
    const params = new URLSearchParams({
        cursor: cursor,
        fields: FIELDS,
        limit: PAGE_SIZE
    });
    return `${BASE}/search?${params}`;
}

// fetch helper w/ response
async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// returns a URL string for the icon image
function iconUrl(icon) {
    return `${BASE}/asset?path=${icon.path}&format=png`;
}

// building a card
function createCard(result) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = result.row_id;

    const img = document.createElement("img");
    img.src = iconUrl(result.fields.Icon);
    img.alt = result.fields.Name;

    const equipLevel = document.createElement("p");
    equipLevel.textContent = "Equip Level: " + result.fields.LevelEquip;

    const name = document.createElement("h3");
    name.textContent = result.fields.Name;

    card.append(img, equipLevel, name);
    return card;
}

// adds one page of results to the screen and remembers where the next page starts
function showPage(data) {
    data.results.forEach((result) => {
        resultsEl.append(createCard(result));
    });

    shownCount += data.results.length;
    nextCursor = data.next || null;   // the API only sends "next" when more results exist
    loadMoreBtn.hidden = !nextCursor;
    updateStatus();
}

// the API doesn't give a total count, so we say whether more are available instead
function updateStatus() {
    if (shownCount === 0) {
        statusEl.textContent = "No items found.";
    } else if (nextCursor) {
        statusEl.textContent = `Showing ${shownCount} items, more available.`;
    } else {
        statusEl.textContent = `Found ${shownCount} items.`;
    }
}

// event listener for the search form
document.getElementById("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = document.getElementById("search-input").value.trim();

    // reset everything from the previous search
    resultsEl.innerHTML = "";
    detailsEl.innerHTML = "";
    shownCount = 0;
    nextCursor = null;
    selectedCard = null;
    loadMoreBtn.hidden = true;
    statusEl.textContent = "Loading…";

    try {
        const data = await getJson(buildSearchUrl(term));
        showPage(data);
    } catch (error) {
        statusEl.textContent = "Error occurred while fetching data: " + error.message;
    }
});

// event listener for the "Load more" button
loadMoreBtn.addEventListener("click", async () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";

    try {
        const data = await getJson(buildNextPageUrl(nextCursor));
        showPage(data);
    } catch (error) {
        statusEl.textContent = "Could not load more items: " + error.message;
    } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "Load more";
    }
});

// event listener for clicking a card
resultsEl.addEventListener("click", (e) => {
    const card = e.target.closest(".card");   // works even if you click the icon or text
    if (!card || card === selectedCard) return;  // empty space, or the same card again

    // move the highlight from the old card to the new one
    if (selectedCard) {
        selectedCard.classList.remove("selected");
    }
    card.classList.add("selected");
    selectedCard = card;

    loadDetails(card.dataset.id);
});

async function loadDetails(id) {
    const url = `${BASE}/sheet/Item/${id}?fields=Name,Description,Icon,LevelEquip,ItemUICategory.Name`;

    // loading message goes inside the details panel, so the status line above the results doesn't change
    detailsEl.innerHTML = '<p class="loading">Loading details…</p>';

    try {
        const data = await getJson(url);

        // if another card was clicked while this one was loading, ignore this older response
        if (!selectedCard || selectedCard.dataset.id !== id) return;

        const item = data.fields;

        const img = document.createElement("img");
        img.src = iconUrl(item.Icon);
        img.alt = item.Name;

        const name = document.createElement("h2");
        name.textContent = item.Name;

        const category = document.createElement("p");
        category.textContent = "Category: " + item.ItemUICategory.fields.Name;

        const level = document.createElement("p");
        level.textContent = "Equip Level: " + item.LevelEquip;

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = item.Description || "No description.";

        detailsEl.innerHTML = "";
        detailsEl.append(img, name, category, level, description);
        detailsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
        detailsEl.innerHTML = "";
        const message = document.createElement("p");
        message.className = "loading";
        message.textContent = "Could not load details: " + error.message;
        detailsEl.append(message);
    }
}
