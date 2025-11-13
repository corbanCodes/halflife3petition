const API_URL = "/.netlify/functions/get-stories";

const muralEl = document.getElementById("mural");
const modalEl = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalStory = document.getElementById("modal-story");
const modalMedia = document.getElementById("modal-media");
const refreshBtn = document.getElementById("refresh");
const sentinel = document.getElementById("sentinel");
const audio = document.getElementById("bg-audio");
const audioToggle = document.getElementById("audio-toggle");
const titleTyper = document.getElementById("title-typer");
const tagTyper = document.getElementById("tag-typer");
const intro = document.getElementById("intro");
const enterBtn = document.getElementById("enter-btn");
const formSection = document.getElementById("form-section");
const toggleFormBtn = document.getElementById("toggle-form");

// Pagination state for infinite scroll
let page = 1;
const pageSize = 60; // 50–100 at a time
let loading = false;
let reachedEnd = false;

refreshBtn?.addEventListener("click", () => loadStories());
modalEl?.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]")) hideModal();
});

// Audio toggle with autoplay attempt (will be blocked until user gesture in many browsers)
audioToggle?.addEventListener("click", async () => {
  if (!audio) return;
  if (audio.paused) {
    try { await audio.play(); audioToggle.setAttribute("aria-pressed", "true"); audioToggle.textContent = "🔊"; }
    catch { /* ignore */ }
  } else {
    audio.pause(); audioToggle.setAttribute("aria-pressed", "false"); audioToggle.textContent = "🔈";
  }
});

// Enter button starts everything
enterBtn?.addEventListener("click", async () => {
  // Start audio
  if (audio) {
    audio.volume = 1;
    audio.muted = false;
    try { await audio.play(); } catch {}
    audioToggle?.setAttribute("aria-pressed", "true");
    if (audioToggle) audioToggle.textContent = "🔊";
  }
  
  // Fade out intro, reveal page
  intro?.classList.add("hide");
  
  setTimeout(() => {
    if (titleTyper) titleTyper.textContent = "Half‑Life 3 Petition";
    if (tagTyper) tagTyper.textContent = "Add your memory from Half‑Life.";
    
    document.querySelectorAll(".site-header, #form-section, .panel").forEach(el => {
      el.classList.add("reveal-enter");
      requestAnimationFrame(() => el.classList.add("show"));
    });
    
    loadMore();
  }, 600);
});

// Collapsible form panel
toggleFormBtn?.addEventListener("click", () => {
  const isCollapsed = formSection?.classList.toggle("collapsed");
  formSection?.setAttribute("aria-expanded", String(!isCollapsed));
});

// Character-by-character typing animation
function typeCharacters(element, text, delay = 50) {
  return new Promise(resolve => {
    element.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(timer);
        resolve();
      }
    }, delay);
  });
}

// Intro sequence after fonts load
Promise.all([
  document.fonts.ready,
  new Promise(resolve => setTimeout(resolve, 100))
]).then(async () => {
  const introInner = document.querySelector(".intro-inner");
  const introTitle = document.getElementById("intro-title");
  const introLogo = document.getElementById("intro-logo");
  const introTag = document.getElementById("intro-tag");
  
  // Show container
  introInner?.classList.add("ready");
  
  // Small delay then start typing
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Type title (slower, dramatic)
  await typeCharacters(introTitle, "Half\u2011Life 3 Petition", 65);
  
  // Show logo
  await new Promise(resolve => setTimeout(resolve, 400));
  introLogo?.classList.add("show");
  
  // Type tagline
  await new Promise(resolve => setTimeout(resolve, 500));
  await typeCharacters(introTag, "Add your memory from Half\u2011Life.", 45);
});

// Audio stays off initially, start only on explicit click
if (audioToggle) {
  audioToggle.setAttribute("aria-pressed", "false");
  audioToggle.textContent = "🔈";
}

function showModal(entry){
  modalTitle.textContent = entry.data?.name || "Anonymous";
  modalStory.textContent = entry.data?.story || "";
  modalMedia.innerHTML = "";

  const imgur = (entry.data?.imgur || "").trim();
  const video = (entry.data?.video || "").trim();

  if (imgur) {
    const node = renderImgur(imgur);
    if (node) modalMedia.appendChild(node);
  }
  if (video) {
    const node = renderYouTube(video);
    if (node) modalMedia.appendChild(node);
  }

  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
}
function hideModal(){
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
}

function renderImgur(url){
  try{
    const u = new URL(url);
    if (u.hostname === "i.imgur.com") {
      const img = new Image();
      img.src = url;
      img.alt = "Imgur image";
      img.loading = "lazy";
      img.style.aspectRatio = "16/9";
      img.className = "thumb";
      // Fallback to lambda logo on error
      img.onerror = () => {
        img.src = "/Half-Life-logo.png";
        img.style.aspectRatio = "1/1";
        img.style.objectFit = "contain";
        img.onerror = null;
      };
      return img;
    }
    // fallback embed in iframe for gallery/album
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.referrerPolicy = "no-referrer";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    return iframe;
  }catch{ return null; }
}

function youtubeId(url){
  try{
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "");
  }catch{}
  return null;
}
function renderYouTube(url){
  const id = youtubeId(url);
  if (!id) return null;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${id}`;
  iframe.title = "YouTube video";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";
  return iframe;
}

function tileThumb(entry){
  const { name = "Anonymous", imgur = "", video = "" } = entry.data || {};

  // Prefer image thumbnail if available
  if (imgur) {
    try {
      const url = new URL(imgur);
      if (url.hostname === "i.imgur.com") return imgur; // direct image
      // Otherwise attempt thumbnail by appending .jpg if it looks like an id
      const maybeId = url.pathname.split("/").filter(Boolean).pop();
      if (maybeId && !maybeId.includes(".")) return `https://i.imgur.com/${maybeId}.jpg`;
    } catch {}
  }
  if (video){
    const id = youtubeId(video);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  // Fallback avatar with initials rendered via canvas data URL
  const initials = (name || "A").trim().split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase();
  const c = document.createElement("canvas");
  c.width = c.height = 300;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#151922"; ctx.fillRect(0,0,300,300);
  ctx.fillStyle = "#9aa3b7"; ctx.font = "bold 140px Inter, Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(initials, 150, 170);
  return c.toDataURL();
}

function appendToMural(entries){
  if (!entries || !entries.length){
    if (muralEl.children.length === 0){
      const empty = document.createElement("p");
      empty.className = "note";
      empty.textContent = "No stories yet. Be the first to sign!";
      muralEl.appendChild(empty);
    }
    return;
  }
  entries.forEach((entry) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.addEventListener("click", () => showModal(entry));

    const img = new Image();
    img.className = "thumb";
    img.alt = "Story thumbnail";
    img.loading = "lazy";
    img.src = tileThumb(entry);
    
    // Fallback to lambda logo on error
    img.onerror = () => {
      img.src = "/Half-Life-logo.png";
      img.onerror = null; // Prevent infinite loop
    };

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.data?.name || "Anonymous";

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = "Read Story";

    meta.appendChild(name);
    meta.appendChild(icon);

    tile.appendChild(img);
    tile.appendChild(overlay);
    tile.appendChild(meta);

    muralEl.appendChild(tile);
  });
}

async function fetchStories(){
  try{
    const res = await fetch(`${API_URL}?page=${page}&per_page=${pageSize}`, { headers: { "cache-control": "no-cache" }});
    if (!res.ok) throw new Error("Bad response");
    return await res.json();
  }catch(e){
    // Mock data when running locally or before Netlify is configured
    return [
      { data: { name: "Alyx V.", story: "I still remember the tram ride.", imgur: "https://i.imgur.com/3sK9kKq.jpeg", video: "" } },
      { data: { name: "Barney C.", story: "Pick up that can.", imgur: "", video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
    ];
  }
}

async function loadMore(){
  if (loading || reachedEnd) return;
  loading = true;
  const entries = await fetchStories();
  if (!entries || entries.length === 0){
    reachedEnd = true;
  } else {
    appendToMural(entries);
    page += 1;
  }
  loading = false;
}

// Refresh resets the mural and pagination
refreshBtn?.addEventListener("click", () => {
  muralEl.innerHTML = "";
  page = 1; reachedEnd = false; loading = false;
  loadMore();
});

// IntersectionObserver to trigger infinite loading
if (sentinel) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) loadMore();
    });
  }, { rootMargin: "400px 0px" });
  io.observe(sentinel);
}

// Initial load is triggered after intro ends
