
"use strict";

/* =========================================
   BEATIFY — MUSIC PLAYER
   Compatible with the existing index.html
========================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = {
  likes: "beatifyLikesV2",
  playlists: "beatifyPlaylistsV2",
  recent: "beatifyRecentlyPlayedV2",
  settings: "beatifySettingsV2"
};

const audio = $("#audioPlayer");

if (!audio) {
  console.error("BEATIFY: audioPlayer element is missing.");
}

/* =========================================
   SONG CATALOG
========================================= */

const artist = "Karan Aujla";

function musicPath(...parts) {
  return ["music", ...parts]
    .map(part => encodeURIComponent(part))
    .join("/");
}

function makeAlbumSongs(album, titles, prefix) {
  return titles.map((title, index) => ({
    id: `${prefix}-${index + 1}`,
    title,
    artist,
    album,
    duration: "—",
    src: musicPath(
      album,
      `${title} - Karan Aujla.mp3`
    ),
    mood: ["Punjabi"],
    art: "♫"
  }));
}

const songs = [
  ...makeAlbumSongs("P-POP CULTURE", [
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
  ], "ppop"),

  ...makeAlbumSongs("Making Memories", [
    "Bachke Bachke (feat. Yarah)",
    "Champions Anthem",
    "Girl, I Love You (Euro S Intro)",
    "Jee Ni Lagda",
    "Softly",
    "Try Me",
    "What",
    "You"
  ], "memories"),

  ...makeAlbumSongs("AUJLA SZN 1", [
    "Ashke",
    "Aujla Szn",
    "Rap Killa",
    "Real Bad Man",
    "Straight Up"
  ], "szn"),

  ...makeAlbumSongs("Four You", [
    "52 Bars",
    "Fallin Apart",
    "Take It Easy",
    "Yeah Naah"
  ], "fouryou"),

  ...makeAlbumSongs("Four Me", [
    "ANTIDOTE",
    "IDK HOW",
    "WHO THEY",
    "Y.D.G"
  ], "fourme"),

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

/* =========================================
   APP STATE
========================================= */

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("BEATIFY storage error:", error);
  }
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

let currentSong = null;
let currentIndex = -1;
let queue = [];

let shuffle = false;
let repeat = false;
let isPlaying = false;
let activeFilter = "all";

function validSongs(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map(id => songs.find(song => song.id === id))
    .filter(Boolean);
}

/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remaining}`;
}

/* =========================================
   TRACK LIST RENDERING
========================================= */

function songCard(song, index) {
  const isLiked = liked.includes(song.id);

  return `
    <div class="track-row">
      <button
        class="play-track"
        data-play="${escapeHTML(song.id)}"
        aria-label="Play ${escapeHTML(song.title)}"
      >▶</button>

      <div class="track-info">
        <strong>${escapeHTML(song.title)}</strong>
        <span>${escapeHTML(song.artist)} · ${escapeHTML(song.album)}</span>
      </div>

      <span class="track-duration">${escapeHTML(song.duration)}</span>

      <div class="track-actions">
        <button
          class="small-icon ${isLiked ? "is-liked" : ""}"
          data-like="${escapeHTML(song.id)}"
          aria-label="Like ${escapeHTML(song.title)}"
        >${isLiked ? "♥" : "♡"}</button>
      </div>
    </div>
  `;
}

function renderTracks(container, list) {
  if (!container) return;

  if (!list.length) {
    container.innerHTML =
      `<p class="empty-state">Nothing here yet.</p>`;
    return;
  }

  container.innerHTML = list
    .map((song, index) => songCard(song, index))
    .join("");
}

function getLibrarySongs() {
  if (activeFilter === "all") return songs;

  if (activeFilter === "available") {
    return songs.filter(song =>
      song.id === "love-ali" ||
      song.album === "Four Me"
    );
  }

  return songs.filter(song =>
    song.id !== "love-ali" &&
    song.album !== "Four Me"
  );
}

/* =========================================
   ALBUMS
========================================= */

function renderAlbums() {
  const grid = $("#albumGrid");
  if (!grid) return;

  grid.innerHTML = albums.map(album => {
    const count = songs.filter(
      song => song.album === album.name
    ).length;

    return `
      <button
        class="album-card ${album.color}"
        data-album="${escapeHTML(album.name)}"
      >
        <div class="album-art">${album.art}</div>
        <strong>${escapeHTML(album.name)}</strong>
        <small>${count} tracks · ${escapeHTML(album.artist)}</small>
      </button>
    `;
  }).join("");
}

/* =========================================
   PLAYLISTS
========================================= */

function renderPlaylists() {
  const grid = $("#playlistGrid");
  if (!grid) return;

  if (!playlists.length) {
    grid.innerHTML =
      `<p class="empty-state">Create your first playlist.</p>`;
    return;
  }

  grid.innerHTML = playlists.map((playlist, index) => `
    <div class="playlist-card">
      <button data-playlist="${index}">
        <div class="playlist-art">♫</div>
        <strong>${escapeHTML(playlist.name)}</strong>
        <small>${validSongs(playlist.songs).length} songs</small>
      </button>

      <button
        class="small-icon"
        data-delete-playlist="${index}"
        aria-label="Delete playlist"
      >×</button>
    </div>
  `).join("");
}

/* =========================================
   PROFILE AND PLAYER DISPLAY
========================================= */

function updateProfile() {
  const name = settings.profileName || "Listener";

  if ($("#topProfileName")) {
    $("#topProfileName").textContent = name;
  }

  if ($("#profileAvatar")) {
    $("#profileAvatar").textContent =
      name.charAt(0).toUpperCase();
  }

  if ($("#profileNameInput")) {
    $("#profileNameInput").value = name;
  }
}

function updatePlayer(song) {
  if (!song) return;

  if ($("#playerTitle")) {
    $("#playerTitle").textContent = song.title;
  }

  if ($("#playerArtist")) {
    $("#playerArtist").textContent = song.artist;
  }

  if ($("#playerCover")) {
    $("#playerCover").textContent = song.art;
  }

  updateLikeButton();
}

function updateLikeButton() {
  const button = $("#playerLikeBtn");
  if (!button) return;

  const active = currentSong &&
    liked.includes(currentSong.id);

  button.textContent = active ? "♥" : "♡";
  button.classList.toggle("is-liked", Boolean(active));
}

function updatePlayButton() {
  const button = $("#playBtn");
  if (button) {
    button.textContent = isPlaying ? "Ⅱ" : "▶";
  }
}

/* =========================================
   MAIN RENDER
========================================= */

function renderAll() {
  renderTracks($("#homeTrackList"), songs);
  renderTracks($("#libraryTrackList"), getLibrarySongs());
  renderTracks($("#likedTrackList"), validSongs(liked));
  renderTracks($("#recentTrackList"), validSongs(recent));

  renderTracks(
    $("#homeRecent"),
    validSongs(recent.slice(0, 5))
  );

  renderAlbums();
  renderPlaylists();

  if ($("#likedCount")) {
    $("#likedCount").textContent = `${liked.length} tracks`;
  }

  if ($("#recentCount")) {
    $("#recentCount").textContent = `${recent.length} tracks`;
  }

  updateProfile();
  updateLikeButton();
}

/* =========================================
   MUSIC PLAYBACK
========================================= */

function rememberSong(song) {
  recent = [
    song.id,
    ...recent.filter(id => id !== song.id)
  ].slice(0, 30);

  saveStorage(STORAGE.recent, recent);

  renderTracks(
    $("#recentTrackList"),
    validSongs(recent)
  );

  renderTracks(
    $("#homeRecent"),
    validSongs(recent.slice(0, 5))
  );

  if ($("#recentCount")) {
    $("#recentCount").textContent = `${recent.length} tracks`;
  }
}

function playSong(song, collection = null) {
  if (!song || !audio) return;

  if (collection) {
    queue = collection.map(item => item.id);
  }

  if (!queue.length) {
    queue = songs.map(item => item.id);
  }

  currentIndex = queue.indexOf(song.id);

  if (currentIndex === -1) {
    queue = [song.id];
    currentIndex = 0;
  }

  currentSong = song;
  updatePlayer(song);

  audio.pause();
  audio.src = song.src;
  audio.load();

  audio.play()
    .then(() => {
      isPlaying = true;
      updatePlayButton();
      rememberSong(song);
    })
    .catch(error => {
      isPlaying = false;
      updatePlayButton();

      console.error("Playback error:", error);

      showToast(
        "Song file not found. Check its exact GitHub filename."
      );
    });
}

function togglePlay() {
  if (!audio) return;

  if (!currentSong) {
    playSong(songs[songs.length - 1]);
    return;
  }

  if (audio.paused) {
    audio.play()
      .then(() => {
        isPlaying = true;
        updatePlayButton();
      })
      .catch(() => {
        showToast("Unable to play this song.");
      });
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
    nextIndex = Math.floor(Math.random() * queue.length);

    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
  } else {
    nextIndex = currentIndex + 1;
  }

  if (nextIndex >= queue.length) {
    if (!repeat) {
      isPlaying = false;
      updatePlayButton();
      return;
    }

    nextIndex = 0;
  }

  currentIndex = nextIndex;

  const nextSong = songs.find(
    song => song.id === queue[currentIndex]
  );

  playSong(nextSong);
}

function playPrevious() {
  if (!queue.length) return;

  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  currentIndex =
    currentIndex <= 0
      ? queue.length - 1
      : currentIndex - 1;

  const previousSong = songs.find(
    song => song.id === queue[currentIndex]
  );

  playSong(previousSong);
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

/* =========================================
   LIKES
========================================= */

function toggleLike(id) {
  if (liked.includes(id)) {
    liked = liked.filter(item => item !== id);
  } else {
    liked.push(id);
  }

  saveStorage(STORAGE.likes, liked);
  renderAll();
}

/* =========================================
   PLAYLIST ACTIONS
========================================= */

function createPlaylist() {
  const input = $("#playlistNameInput");
  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    showToast("Enter a playlist name first.");
    return;
  }

  playlists.push({
    name,
    songs: []
  });

  saveStorage(STORAGE.playlists, playlists);

  input.value = "";
  renderPlaylists();

  showToast("Playlist created!");
}

function deletePlaylist(index) {
  if (!playlists[index]) return;

  playlists.splice(index, 1);
  saveStorage(STORAGE.playlists, playlists);

  renderPlaylists();
  showToast("Playlist deleted.");
}

function addCurrentToPlaylist(index) {
  if (!currentSong || !playlists[index]) return;

  const list = playlists[index];

  if (!list.songs.includes(currentSong.id)) {
    list.songs.push(currentSong.id);
  }

  saveStorage(STORAGE.playlists, playlists);
  renderPlaylists();
}

/* =========================================
   NAVIGATION
========================================= */

function openView(view) {
  const section = $(`#${view}View`);

  if (!section) return;

  $$(".view-section").forEach(item => {
    item.classList.toggle(
      "active-view",
      item.id === `${view}View`
    );
  });

  $$("[data-view]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === view
    );
  });

  activeView = view;

  $("#sidebar")?.classList.remove("open");
}

$$("[data-view]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    openView(button.dataset.view);
  });
});

$$("[data-jump]").forEach(button => {
  button.addEventListener("click", () => {
    openView(button.dataset.jump);
  });
});

/* =========================================
   SEARCH
========================================= */

function searchSongs(query) {
  const term = query.trim().toLowerCase();

  const results = songs.filter(song => {
    const text =
      `${song.title} ${song.artist} ${song.album}`.toLowerCase();

    return text.includes(term);
  });

  renderTracks(
    $("#searchResults"),
    term ? results : []
  );
}

$("#globalSearch")?.addEventListener("input", event => {
  const value = event.target.value;

  if ($("#pageSearch")) {
    $("#pageSearch").value = value;
  }

  openView("search");
  searchSongs(value);
});

$("#pageSearch")?.addEventListener("input", event => {
  searchSongs(event.target.value);

  if ($("#globalSearch")) {
    $("#globalSearch").value = event.target.value;
  }
});

/* =========================================
   MOOD FILTERS
========================================= */

$$("[data-mood]").forEach(button => {
  button.addEventListener("click", () => {
    const mood = button.dataset.mood;

    const results = songs.filter(song =>
      song.mood.includes(mood)
    );

    openView("library");
    renderTracks($("#libraryTrackList"), results);

    showToast(`${mood} music`);
  });
});

/* =========================================
   LIBRARY FILTERS
========================================= */

$$("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    $$("[data-filter]").forEach(item => {
      item.classList.toggle(
        "selected",
        item === button
      );
    });

    renderTracks(
      $("#libraryTrackList"),
      getLibrarySongs()
    );
  });
});

/* =========================================
   ALBUM AND TRACK CLICK HANDLING
========================================= */

document.addEventListener("click", event => {
  const playButton = event.target.closest("[data-play]");

  if (playButton) {
    const song = songs.find(
      item => item.id === playButton.dataset.play
    );

    if (song) playSong(song);
    return;
  }

  const likeButton = event.target.closest("[data-like]");

  if (likeButton) {
    toggleLike(likeButton.dataset.like);
    return;
  }

  const albumButton = event.target.closest("[data-album]");

  if (albumButton) {
    const list = songs.filter(
      song => song.album === albumButton.dataset.album
    );

    playCollection(list);
    return;
  }

  const playlistButton = event.target.closest("[data-playlist]");

  if (playlistButton) {
    const playlist = playlists[
      Number(playlistButton.dataset.playlist)
    ];

    if (playlist) {
      playCollection(validSongs(playlist.songs));
    }

    return;
  }

  const deleteButton =
    event.target.closest("[data-delete-playlist]");

  if (deleteButton) {
    deletePlaylist(
      Number(deleteButton.dataset.deletePlaylist)
    );
  }
});

/* =========================================
   PLAYER BUTTONS
========================================= */

$("#playBtn")?.addEventListener("click", togglePlay);
$("#nextBtn")?.addEventListener("click", playNext);
$("#prevBtn")?.addEventListener("click", playPrevious);

$("#heroPlayBtn")?.addEventListener("click", () => {
  playCollection(songs);
});

$("#likedPlayBtn")?.addEventListener("click", () => {
  playCollection(validSongs(liked));
});

$("#libraryShuffle")?.addEventListener("click", () => {
  const list = getLibrarySongs().slice();

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  shuffle = true;
  $("#shuffleBtn")?.classList.add("active");

  playCollection(list);
});

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
  if (currentSong) {
    toggleLike(currentSong.id);
  }
});

/* =========================================
   AUDIO PROGRESS AND VOLUME
========================================= */

function updateProgress() {
  if (!audio || !Number.isFinite(audio.duration)) return;

  const percent =
    (audio.currentTime / audio.duration) * 100;

  if ($("#progressBar")) {
    $("#progressBar").value = percent;
  }

  if ($("#currentTime")) {
    $("#currentTime").textContent =
      formatTime(audio.currentTime);
  }

  if ($("#duration")) {
    $("#duration").textContent =
      formatTime(audio.duration);
  }
}

audio?.addEventListener("timeupdate", updateProgress);
audio?.addEventListener("loadedmetadata", updateProgress);

audio?.addEventListener("play", () => {
  isPlaying = true;
  updatePlayButton();
});

audio?.addEventListener("pause", () => {
  isPlaying = false;
  updatePlayButton();
});

audio?.addEventListener("ended", () => {
  if (settings.autoplay || repeat) {
    playNext();
  }
});

audio?.addEventListener("error", () => {
  isPlaying = false;
  updatePlayButton();
});

$("#progressBar")?.addEventListener("input", event => {
  if (audio?.duration) {
    audio.currentTime =
      (Number(event.target.value) / 100) * audio.duration;
  }
});

$("#volumeBar")?.addEventListener("input", event => {
  if (audio) {
    audio.volume = Number(event.target.value) / 100;
  }
});

/* =========================================
   SETTINGS
========================================= */

function applyAccent() {
  const colors = {
    green: "#1ed760",
    blue: "#3b9cff",
    purple: "#a879ff"
  };

  document.documentElement.style.setProperty(
    "--accent",
    colors[settings.accent] || colors.green
  );
}

function initializeSettings() {
  if ($("#profileNameInput")) {
    $("#profileNameInput").value =
      settings.profileName || "Listener";
  }

  if ($("#autoplaySetting")) {
    $("#autoplaySetting").checked =
      Boolean(settings.autoplay);
  }

  if ($("#defaultVolumeSetting")) {
    $("#defaultVolumeSetting").value =
      settings.volume ?? 70;
  }

  if ($("#accentSetting")) {
    $("#accentSetting").value =
      settings.accent || "green";
  }

  if ($("#volumeBar")) {
    $("#volumeBar").value = settings.volume ?? 70;
  }

  if (audio) {
    audio.volume =
      Math.max(0, Math.min(100, settings.volume ?? 70)) / 100;
  }

  applyAccent();
}

function saveSettings() {
  settings.profileName =
    $("#profileNameInput")?.value.trim() || "Listener";

  settings.autoplay =
    $("#autoplaySetting")?.checked ?? true;

  settings.volume =
    Number($("#defaultVolumeSetting")?.value ?? 70);

  settings.accent =
    $("#accentSetting")?.value || "green";

  if (audio) {
    audio.volume =
      Math.max(0, Math.min(100, settings.volume)) / 100;
  }

  if ($("#volumeBar")) {
    $("#volumeBar").value = settings.volume;
  }

  saveStorage(STORAGE.settings, settings);

  updateProfile();
  applyAccent();

  if ($("#settingsMessage")) {
    $("#settingsMessage").textContent = "Settings saved!";
  }

  showToast("Settings saved!");
}

$("#saveSettingsBtn")?.addEventListener(
  "click",
  saveSettings
);

/* =========================================
   CLEAR HISTORY
========================================= */

$("#clearHistoryBtn")?.addEventListener("click", () => {
  recent = [];

  saveStorage(STORAGE.recent, recent);

  renderAll();
  showToast("Listening history cleared.");
});

/* =========================================
   MOBILE MENU
========================================= */

$("#menuBtn")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("open");
});

/* =========================================
   BROWSER HISTORY
========================================= */

$("#backBtn")?.addEventListener("click", () => {
  history.back();
});

$("#forwardBtn")?.addEventListener("click", () => {
  history.forward();
});

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener("keydown", event => {
  const tag = document.activeElement?.tagName;

  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
    if (event.key === "Escape") {
      document.activeElement.blur();
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  }

  if (event.altKey && event.key === "ArrowRight") {
    playNext();
  }

  if (event.altKey && event.key === "ArrowLeft") {
    playPrevious();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#globalSearch")?.focus();
  }
});

/* =========================================
   START BEATIFY
========================================= */

initializeSettings();
renderAll();
openView("home");
updatePlayButton();

console.log("BEATIFY loaded successfully.");
