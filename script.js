
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = {
  likes: "beatifyLikesV2",
  playlists: "beatifyPlaylistsV2",
  recent: "beatifyRecentlyPlayedV2",
  settings: "beatifySettingsV2"
};

// Encode each folder/file name safely for GitHub Pages.
const musicPath = (...parts) =>
  parts.map(part => encodeURIComponent(part)).join("/");

const artist = "Karan Aujla";

const songs = [
  // P-POP CULTURE
  ...[
    "7.7 Magnitude",
    "Boyfriend",
    "Daytona",
    "Flip-Side (Sandy's Interlude)",
    "For A Reason",
    "HIM.",
    "I Really Do...",
    "Ima Do My Thiiing",
    "MF Gabhru!",
    "P-POP CULTURE",
    "Youre U Tho"
  ].map((title, i) => ({
    id: `ppop-${i}`,
    title,
    artist,
    album: "P-POP CULTURE",
    duration: "—",
    src: musicPath("P-POP CULTURE", `${title} - Karan Aujla.mp3`),
    mood: ["Punjabi", "Popular"],
    art: "♫"
  })),

  // Making Memories
  ...[
    "Bachke Bachke (feat. Yarah)",
    "Champions Anthem",
    "Girl, I Love You (Euro S Intro)",
    "Jee Ni Lagda",
    "Softly",
    "Try Me",
    "What",
    "You"
  ].map((title, i) => ({
    id: `memories-${i}`,
    title,
    artist,
    album: "Making Memories",
    duration: "—",
    src: musicPath("Making Memories", `${title} - Karan Aujla.mp3`),
    mood: ["Punjabi", "Popular"],
    art: "♫"
  })),

  // AUJLA SZN 1
  ...[
    "Ashke",
    "Aujla Szn",
    "Rap Killa",
    "Real Bad Man",
    "Straight Up"
  ].map((title, i) => ({
    id: `szn-${i}`,
    title,
    artist,
    album: "AUJLA SZN 1",
    duration: "—",
    src: musicPath("AUJLA SZN 1", `${title} - Karan Aujla.mp3`),
    mood: ["Punjabi", "Rap"],
    art: "♫"
  })),

  // Four You
  ...[
    "52 Bars",
    "Fallin Apart",
    "Take It Easy",
    "Yeah Naah"
  ].map((title, i) => ({
    id: `fouryou-${i}`,
    title,
    artist,
    album: "Four You",
    duration: "—",
    src: musicPath("Four You", `${title} - Karan Aujla.mp3`),
    mood: ["Punjabi", "Popular"],
    art: "♫"
  })),

  // Four Me — confirmed folder: music/Four Me/
  ...[
    "ANTIDOTE",
    "IDK HOW",
    "WHO THEY",
    "Y.D.G"
  ].map((title, i) => ({
    id: `fourme-${i}`,
    title,
    artist,
    album: "Four Me",
    duration: "—",
    src: musicPath("Four Me", `${title} - Karan Aujla.mp3`),
    mood: ["Punjabi", "Rap"],
    art: "♫"
  })),

  // Existing single MP3
  {
    id: "love-ali",
    title: "Love",
    artist: "Ali",
    album: "Singles",
    duration: "—",
    src: "music/love.mp3",
    mood: ["Chill"],
    art: "♥"
  }
];

const albums = [
  { name: "P-POP CULTURE", artist, art: "♫", color: "album-green" },
  { name: "Making Memories", artist, art: "♫", color: "album-purple" },
  { name: "AUJLA SZN 1", artist, art: "♫", color: "album-orange" },
  { name: "Four You", artist, art: "♫", color: "album-blue" },
  { name: "Four Me", artist, art: "♫", color: "album-green" },
  { name: "Singles", artist: "Ali", art: "♥", color: "album-purple" }
];

const audio = $("#audioPlayer");

let currentSong = null;
let currentIndex = -1;
let queue = [];
let isPlaying = false;
let shuffle = false;
let repeat = false;
let activeView = "home";

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let liked = readStorage(STORAGE.likes, []);
let playlists = readStorage(STORAGE.playlists, []);
let recent = readStorage(STORAGE.recent, []);

let settings = {
  profileName: "Listener",
  autoplay: true,
  volume: 70,
  accent: "green",
  ...readStorage(STORAGE.settings, {})
};

const validSongs = ids =>
  ids.map(id => songs.find(song => song.id === id)).filter(Boolean);

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function songCard(song, index) {
  const likedSong = liked.includes(song.id);
  return `
    <div class="track-row" data-song-id="${song.id}">
      <button class="track-play" data-play="${song.id}" aria-label="Play ${song.title}">▶</button>
      <div class="track-art">${song.art}</div>
      <div class="track-info">
        <strong>${escapeHTML(song.title)}</strong>
        <span>${escapeHTML(song.artist)} · ${escapeHTML(song.album)}</span>
      </div>
      <span class="track-duration">${song.duration}</span>
      <button class="track-like ${likedSong ? "liked" : ""}" data-like="${song.id}" aria-label="Like song">
        ${likedSong ? "♥" : "♡"}
      </button>
    </div>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderTracks(container, list) {
  if (!container) return;
  container.innerHTML = list.length
    ? list.map((song, index) => songCard(song, index)).join("")
    : `<p class="empty-state">Nothing here yet.</p>`;
}

function renderAlbums() {
  const grid = $("#albumGrid");
  if (!grid) return;

  grid.innerHTML = albums.map(album => {
    const count = songs.filter(song => song.album === album.name).length;
    return `
      <button class="album-card ${album.color}" data-album="${escapeHTML(album.name)}">
        <span class="album-art">${album.art}</span>
        <strong>${escapeHTML(album.name)}</strong>
        <small>${count} tracks · ${escapeHTML(album.artist)}</small>
      </button>`;
  }).join("");
}

function renderPlaylists() {
  const grid = $("#playlistGrid");
  if (!grid) return;

  grid.innerHTML = playlists.length
    ? playlists.map((playlist, index) => `
      <div class="playlist-card">
        <button data-playlist="${index}">
          <span class="album-art">♫</span>
          <strong>${escapeHTML(playlist.name)}</strong>
          <small>${validSongs(playlist.songs || []).length} songs</small>
        </button>
        <button data-delete-playlist="${index}" aria-label="Delete playlist">×</button>
      </div>`).join("")
    : `<p class="empty-state">Create your first playlist.</p>`;
}

function renderAll() {
  renderTracks($("#homeTrackList"), songs);
  renderTracks($("#libraryTrackList"), songs);
  renderTracks($("#likedTrackList"), validSongs(liked));
  renderTracks($("#recentTrackList"), validSongs(recent));
  renderTracks($("#homeRecent"), validSongs(recent.slice(0, 5)));

  renderAlbums();
  renderPlaylists();

  if ($("#likedCount")) $("#likedCount").textContent = liked.length;
  if ($("#recentCount")) $("#recentCount").textContent = recent.length;
  updateProfile();
  updateLikeButton();
}

function updateProfile() {
  const name = settings.profileName || "Listener";
  if ($("#topProfileName")) $("#topProfileName").textContent = name;
  if ($("#profileAvatar")) $("#profileAvatar").textContent = name.charAt(0).toUpperCase();
  if ($("#profileNameInput")) $("#profileNameInput").value = name;
}

function updateLikeButton() {
  const button = $("#playerLikeBtn");
  if (!button || !currentSong) return;
  const active = liked.includes(currentSong.id);
  button.textContent = active ? "♥" : "♡";
  button.classList.toggle("liked", active);
}

function updatePlayer(song) {
  if ($("#playerTitle")) $("#playerTitle").textContent = song.title;
  if ($("#playerArtist")) $("#playerArtist").textContent = song.artist;
  if ($("#playerCover")) $("#playerCover").textContent = song.art;
  updateLikeButton();
}

function playSong(song) {
  if (!song) return;

  currentSong = song;
  queue = queue.length ? queue : songs.map(item => item.id);
  currentIndex = queue.indexOf(song.id);
  if (currentIndex < 0) {
    queue = songs.map(item => item.id);
    currentIndex = queue.indexOf(song.id);
  }

  audio.src = song.src;
  audio.load();

  audio.play().then(() => {
    isPlaying = true;
    updatePlayButton();
    updatePlayer(song);
    recent = [song.id, ...recent.filter(id => id !== song.id)].slice(0, 30);
    saveStorage(STORAGE.recent, recent);
    renderTracks($("#recentTrackList"), validSongs(recent));
    renderTracks($("#homeRecent"), validSongs(recent.slice(0, 5)));
    if ($("#recentCount")) $("#recentCount").textContent = recent.length;
  }).catch(() => {
    isPlaying = false;
    updatePlayButton();
    showToast("Could not play this file. Check its GitHub folder and filename.");
    updatePlayer(song);
  });
}

function updatePlayButton() {
  const button = $("#playBtn");
  if (button) button.textContent = isPlaying ? "Ⅱ" : "▶";
}

function togglePlay() {
  if (!currentSong) {
    playSong(songs[0]);
    return;
  }

  if (audio.paused) {
    audio.play().then(() => {
      isPlaying = true;
      updatePlayButton();
    }).catch(() => showToast("Unable to play this song."));
  } else {
    audio.pause();
    isPlaying = false;
    updatePlayButton();
  }
}

function playNext() {
  if (!queue.length) return;
  let nextIndex;

  if (shuffle && queue.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * queue.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (!repeat) {
        isPlaying = false;
        updatePlayButton();
        return;
      }
      nextIndex = 0;
    }
  }

  currentIndex = nextIndex;
  const nextSong = songs.find(song => song.id === queue[currentIndex]);
  playSong(nextSong);
}

function playPrevious() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  currentIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
  playSong(songs.find(song => song.id === queue[currentIndex]));
}

function playCollection(list) {
  if (!list.length) {
    showToast("No songs in this collection.");
    return;
  }
  queue = list.map(song => song.id);
  currentIndex = 0;
  playSong(list[0]);
}

function toggleLike(id) {
  liked = liked.includes(id)
    ? liked.filter(item => item !== id)
    : [...liked, id];

  saveStorage(STORAGE.likes, liked);
  renderAll();
}

function createPlaylist() {
  const input = $("#playlistNameInput");
  const name = input?.value.trim();
  if (!name) {
    showToast("Enter a playlist name first.");
    return;
  }

  playlists.push({ name, songs: [] });
  saveStorage(STORAGE.playlists, playlists);
  input.value = "";
  renderPlaylists();
  showToast("Playlist created!");
}

function deletePlaylist(index) {
  playlists.splice(index, 1);
  saveStorage(STORAGE.playlists, playlists);
  renderPlaylists();
  showToast("Playlist deleted.");
}

function addCurrentToPlaylist(index) {
  if (!currentSong || !playlists[index]) return;
  const list = playlists[index];
  if (!list.songs.includes(currentSong.id)) list.songs.push(currentSong.id);
  saveStorage(STORAGE.playlists, playlists);
  renderPlaylists();
  showToast("Added to playlist.");
}

function openView(view) {
  activeView = view;
  $$(".view").forEach(section => {
    section.classList.toggle("active", section.id === `${view}View`);
  });
  $$("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function searchSongs(query) {
  const term = query.trim().toLowerCase();
  const results = songs.filter(song =>
    `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(term)
  );
  renderTracks($("#searchResults"), term ? results : []);
}

function saveSettings() {
  settings.profileName = $("#profileNameInput")?.value.trim() || "Listener";
  settings.autoplay = $("#autoplaySetting")?.checked ?? true;
  settings.volume = Number($("#defaultVolumeSetting")?.value ?? 70);
  settings.accent = $("#accentSetting")?.value || "green";

  audio.volume = Math.max(0, Math.min(100, settings.volume)) / 100;
  saveStorage(STORAGE.settings, settings);
  updateProfile();
  showToast("Settings saved!");
}

function initializeSettings() {
  if ($("#profileNameInput")) $("#profileNameInput").value = settings.profileName;
  if ($("#autoplaySetting")) $("#autoplaySetting").checked = settings.autoplay;
  if ($("#defaultVolumeSetting")) $("#defaultVolumeSetting").value = settings.volume;
  if ($("#accentSetting")) $("#accentSetting").value = settings.accent;
  audio.volume = Math.max(0, Math.min(100, settings.volume)) / 100;
}

function updateProgress() {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  if ($("#progressBar")) $("#progressBar").value = percent;
  if ($("#currentTime")) $("#currentTime").textContent = formatTime(audio.currentTime);
  if ($("#duration")) $("#duration").textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

// Track and album interactions
document.addEventListener("click", event => {
  const playButton = event.target.closest("[data-play]");
  if (playButton) {
    const song = songs.find(item => item.id === playButton.dataset.play);
    if (song) {
      queue = songs.map(item => item.id);
      playSong(song);
    }
    return;
  }

  const likeButton = event.target.closest("[data-like]");
  if (likeButton) {
    toggleLike(likeButton.dataset.like);
    return;
  }

  const albumButton = event.target.closest("[data-album]");
  if (albumButton) {
    const list = songs.filter(song => song.album === albumButton.dataset.album);
    playCollection(list);
    return;
  }

  const playlistButton = event.target.closest("[data-playlist]");
  if (playlistButton) {
    const playlist = playlists[Number(playlistButton.dataset.playlist)];
    if (playlist) playCollection(validSongs(playlist.songs || []));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-playlist]");
  if (deleteButton) {
    deletePlaylist(Number(deleteButton.dataset.deletePlaylist));
  }
});

// Navigation
$$("[data-view]").forEach(button => {
  button.addEventListener("click", () => openView(button.dataset.view));
});

$("#menuBtn")?.addEventListener("click", () =>
  $("#sidebar")?.classList.toggle("open")
);

$("#backBtn")?.addEventListener("click", () => history.back());
$("#forwardBtn")?.addEventListener("click", () => history.forward());

// Player controls
$("#playBtn")?.addEventListener("click", togglePlay);
$("#nextBtn")?.addEventListener("click", playNext);
$("#prevBtn")?.addEventListener("click", playPrevious);

$("#shuffleBtn")?.addEventListener("click", () => {
  shuffle = !shuffle;
  $("#shuffleBtn").classList.toggle("active", shuffle);
  showToast(shuffle ? "Shuffle on" : "Shuffle off");
});

$("#repeatBtn")?.addEventListener("click", () => {
  repeat = !repeat;
  $("#repeatBtn").classList.toggle("active", repeat);
  showToast(repeat ? "Repeat on" : "Repeat off");
});

$("#playerLikeBtn")?.addEventListener("click", () => {
  if (currentSong) toggleLike(currentSong.id);
});

$("#heroPlayBtn")?.addEventListener("click", () => playCollection(songs));
$("#likedPlayBtn")?.addEventListener("click", () => playCollection(validSongs(liked)));
$("#libraryShuffle")?.addEventListener("click", () => {
  shuffle = true;
  $("#shuffleBtn")?.classList.add("active");
  playCollection(songs.slice().sort(() => Math.random() - 0.5));
});

// Volume and progress
$("#volumeBar")?.addEventListener("input", event => {
  audio.volume = Number(event.target.value) / 100;
});

$("#progressBar")?.addEventListener("input", event => {
  if (audio.duration) {
    audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
  }
});

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", updateProgress);
audio.addEventListener("play", () => {
  isPlaying = true;
  updatePlayButton();
});
audio.addEventListener("pause", () => {
  isPlaying = false;
  updatePlayButton();
});
audio.addEventListener("ended", () => {
  if (settings.autoplay || repeat) playNext();
});

// Search
$("#globalSearch")?.addEventListener("input", event => {
  searchSongs(event.target.value);
  openView("search");
  if ($("#pageSearch")) $("#pageSearch").value = event.target.value;
});

$("#pageSearch")?.addEventListener("input", event => {
  searchSongs(event.target.value);
});

// Playlists and settings
$("#createPlaylistBtn")?.addEventListener("click", createPlaylist);
$("#saveSettingsBtn")?.addEventListener("click", saveSettings);

$("#clearHistoryBtn")?.addEventListener("click", () => {
  recent = [];
  saveStorage(STORAGE.recent, recent);
  renderAll();
  showToast("Recently played cleared.");
});

// Keyboard shortcuts
document.addEventListener("keydown", event => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  }
  if (event.key === "ArrowRight" && event.altKey) playNext();
  if (event.key === "ArrowLeft" && event.altKey) playPrevious();
});

// Start app
initializeSettings();
renderAll();
openView("home");
updatePlayButton();
