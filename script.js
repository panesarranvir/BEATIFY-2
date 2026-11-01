const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const STORAGE = {likes:"beatifyLikesV2", playlists:"beatifyPlaylistsV2", recent:"beatifyRecentlyPlayedV2", settings:"beatifySettingsV2"};
const songs = [
  {id:"dreams",title:"Dreams",artist:"BEATIFY Sessions",album:"Midnight Bloom",duration:"3:42",src:"music/love.mp3",mood:["Chill","Night"],art:"☾"},
  {id:"night-vibes",title:"Night Vibes",artist:"The Neon Collective",album:"After Hours",duration:"Coming soon",src:"",mood:["Night"],art:"☾"},
  {id:"feel-the-beat",title:"Feel The Beat",artist:"Pulse Theory",album:"Electric Motion",duration:"Coming soon",src:"",mood:["Energy"],art:"ϟ"},
  {id:"chill-mood",title:"Chill Mood",artist:"Soft Signals",album:"Midnight Bloom",duration:"Coming soon",src:"",mood:["Chill"],art:"☁"},
  {id:"deep-focus",title:"Deep Focus",artist:"Quiet Form",album:"Focus Flow",duration:"Coming soon",src:"",mood:["Focus"],art:"◈"},
  {id:"city-lights",title:"City Lights",artist:"Nova Lane",album:"After Hours",duration:"Coming soon",src:"",mood:["Night","Energy"],art:"✦"},
  {id:"slow-motion",title:"Slow Motion",artist:"Sunday Stereo",album:"Midnight Bloom",duration:"Coming soon",src:"",mood:["Chill"],art:"❋"},
  {id:"momentum",title:"Momentum",artist:"Pulse Theory",album:"Electric Motion",duration:"Coming soon",src:"",mood:["Energy","Focus"],art:"ϟ"}
];
const albums = [
  {name:"Midnight Bloom",artist:"Various Artists",art:"☾",color:"album-green",ids:["dreams","chill-mood","slow-motion"]},
  {name:"After Hours",artist:"The Neon Collective",art:"✦",color:"album-purple",ids:["night-vibes","city-lights"]},
  {name:"Electric Motion",artist:"Pulse Theory",art:"ϟ",color:"album-orange",ids:["feel-the-beat","momentum"]},
  {name:"Focus Flow",artist:"Quiet Form",art:"◈",color:"album-blue",ids:["deep-focus"]}
];
let liked = read(STORAGE.likes,[]);
let playlists = read(STORAGE.playlists,[]);
let recent = read(STORAGE.recent,[]);
let settings = {...{name:"Listener",autoplay:true,volume:70,accent:"green"},...read(STORAGE.settings,{})};
let currentId = null, isShuffle = false, repeatMode = 0, activeFilter = "all", toastTimer;
const audio = $("#audioPlayer");

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function track(id){return songs.find(s=>s.id===id)}
function notify(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300)}
function safeText(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function trackRow(song,index){const isLiked=liked.includes(song.id);return `<div class="track-row"><span class="track-number">${String(index+1).padStart(2,"0")}</span><div style="display:flex;align-items:center;gap:11px;min-width:0"><div class="track-cover">${song.art}</div><div class="track-info"><strong>${safeText(song.title)}</strong><span>${safeText(song.artist)}</span></div></div><span class="track-duration">${song.duration}</span><div class="track-actions"><button class="small-icon ${isLiked?"is-liked":""}" data-like="${song.id}" aria-label="Like ${safeText(song.title)}">${isLiked?"♥":"♡"}</button><button class="play-track" data-play="${song.id}" aria-label="Play ${safeText(song.title)}">${currentId===song.id&&!audio.paused?"Ⅱ":"▶"}</button></div></div>`}
function renderTrackList(target,items){const el=$(target);if(!el)return;el.innerHTML=items.length?items.map((s,i)=>trackRow(s,i)).join(""):`<div class="empty-state">Nothing here yet. Start exploring your music.</div>`}
function renderHome(){renderTrackList("#homeTrackList",songs.slice(0,5));renderRecent("#homeRecent",recent.slice(0,4))}
function renderLibrary(){let items=songs.filter(s=>activeFilter==="all"||(activeFilter==="available"?!!s.src:!s.src));renderTrackList("#libraryTrackList",items)}
function renderLiked(){const items=liked.map(track).filter(Boolean);$("#likedCount").textContent=`${items.length} ${items.length===1?"track":"tracks"}`;renderTrackList("#likedTrackList",items)}
function renderRecent(target="#recentTrackList"){const items=recent.map(track).filter(Boolean);if(target==="#recentTrackList")$("#recentCount").textContent=`${items.length} tracks`;if(target==="#homeRecent"){$(target).innerHTML=items.length?items.map(s=>`<div class="recent-card" data-play-card="${s.id}"><div class="recent-art">${s.art}</div><strong>${safeText(s.title)}</strong><small>${safeText(s.artist)}</small></div>`).join(""):`<p class="muted">Your listening history will appear here.</p>`}else renderTrackList(target,items)}
function renderPlaylists(){const grid=$("#playlistGrid");grid.innerHTML=playlists.length?playlists.map(p=>`<article class="playlist-card" data-open-playlist="${p.id}"><div class="playlist-art">♫</div><strong>${safeText(p.name)}</strong><small>${p.songIds.length} tracks</small><button class="text-button" data-delete-playlist="${p.id}">Delete playlist</button></article>`).join(""):`<p class="muted">No playlists yet. Create your first one above.</p>`}
function renderAlbums(){const grid=$("#albumGrid");grid.innerHTML=albums.map(a=>`<article class="album-card" data-album="${safeText(a.name)}"><div class="album-art">${a.art}</div><strong>${safeText(a.name)}</strong><small>${safeText(a.artist)}</small><p>${a.ids.length} tracks · BEATIFY collection</p></article>`).join("")}
function renderAll(){renderHome();renderLibrary();renderLiked();renderRecent();renderPlaylists();renderAlbums()}
function navigate(view){const valid=["home","search","library","liked","playlists","albums","recent","settings"];if(!valid.includes(view))view="home";$$(".view-section").forEach(s=>s.classList.remove("active-view"));$(`#${view}View`).classList.add("active-view");$$(".nav-link[data-view]").forEach(a=>a.classList.toggle("active",a.dataset.view===view));$("#sidebar").classList.remove("open");if(view==="search")$("#pageSearch").focus();location.hash=view}
function toggleLike(id){liked=liked.includes(id)?liked.filter(x=>x!==id):[...liked,id];save(STORAGE.likes,liked);renderAll();updatePlayerLike();notify(liked.includes(id)?"Added to Liked Songs":"Removed from Liked Songs")}
function playSong(id){const s=track(id);if(!s)return;if(!s.src){notify("This demo track is coming soon. Add its audio file later.");return}if(currentId===id){if(audio.paused)audio.play().catch(()=>notify("Couldn't play this audio file."));else audio.pause();updatePlayState();return}currentId=id;audio.src=s.src;audio.volume=Number(settings.volume)/100;audio.play().then(()=>{recent=[id,...recent.filter(x=>x!==id)].slice(0,12);save(STORAGE.recent,recent);renderRecent();renderHome();updatePlayer()}).catch(()=>notify("Audio file not found. Add music/love.mp3 to the music folder."));updatePlayer()}
function updatePlayer(){const s=track(currentId);if(!s)return;$("#playerTitle").textContent=s.title;$("#playerArtist").textContent=s.artist;$("#playerCover").textContent=s.art;updatePlayerLike();updatePlayState()}
function updatePlayerLike(){$("#playerLikeBtn").classList.toggle("is-liked",liked.includes(currentId));$("#playerLikeBtn").textContent=liked.includes(currentId)?"♥":"♡"}
function updatePlayState(){const playing=!audio.paused;$("#playBtn").textContent=playing?"Ⅱ":"▶";$("#playBtn").setAttribute("aria-label",playing?"Pause":"Play");renderTrackList("#homeTrackList",songs.slice(0,5));}
function playCollection(items){const available=items.filter(s=>s&&s.src);if(!available.length){notify("No playable songs in this collection yet.");return}playSong(available[0].id)}
function nextSong(){let list=songs.filter(s=>s.src);if(!list.length)return;let index=list.findIndex(s=>s.id===currentId);if(isShuffle)index=Math.floor(Math.random()*list.length);else index=(index+1)%list.length;playSong(list[index].id)}
function previousSong(){if(audio.currentTime>3){audio.currentTime=0;return}let list=songs.filter(s=>s.src),index=list.findIndex(s=>s.id===currentId);playSong(list[(index-1+list.length)%list.length].id)}
function formatTime(sec){if(!Number.isFinite(sec))return"0:00";return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,"0")}`}
function search(query){const q=query.trim().toLowerCase();const results=q?songs.filter(s=>`${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(q)):[];$("#searchResults").innerHTML=q?`<div class="section-heading"><h2>Tracks</h2><span>${results.length} results</span></div>${results.length?`<div class="track-list">${results.map(trackRow).join("")}</div>`:`<p class="muted">No results found. Try another search.</p>`}`:`<p class="muted">Start typing to find tracks and artists.</p>`}
function createPlaylist(){const name=$("#playlistNameInput").value.trim();if(!name){notify("Enter a playlist name first.");return}playlists.push({id:`pl-${Date.now()}`,name,songIds:[]});save(STORAGE.playlists,playlists);$("#playlistNameInput").value="";renderPlaylists();notify("Playlist created")}
function openPlaylist(id){const p=playlists.find(x=>x.id===id);if(!p)return;const items=p.songIds.map(track).filter(Boolean);const content=`${p.name}\n${items.map(s=>`• ${s.title} — ${s.artist}`).join("\n")||"No songs added yet."}`;const add=prompt(`${content}\n\nType a track number to add it (1-${songs.length}), or leave blank to close.`);if(add===null||add.trim()==="")return;const n=Number(add);if(Number.isInteger(n)&&n>=1&&n<=songs.length){if(!p.songIds.includes(songs[n-1].id))p.songIds.push(songs[n-1].id);save(STORAGE.playlists,playlists);renderPlaylists();notify("Track added to playlist")}else notify("That track number isn't valid")}
function applySettings(){document.documentElement.dataset.accent=settings.accent;const accents={green:"#1ed760",blue:"#4da3ff",purple:"#b18cff"};document.documentElement.style.setProperty("--accent",accents[settings.accent]||accents.green);$("#topProfileName").textContent=settings.name||"Listener";$("#profileAvatar").textContent=(settings.name||"B").charAt(0).toUpperCase();$("#profileNameInput").value=settings.name||"";$("#autoplaySetting").checked=!!settings.autoplay;$("#defaultVolumeSetting").value=settings.volume;$("#volumeBar").value=settings.volume;$("#accentSetting").value=settings.accent;audio.volume=settings.volume/100}
function saveSettings(){settings={name:$("#profileNameInput").value.trim()||"Listener",autoplay:$("#autoplaySetting").checked,volume:Number($("#defaultVolumeSetting").value),accent:$("#accentSetting").value};save(STORAGE.settings,settings);applySettings();$("#settingsMessage").textContent="Settings saved ✓";setTimeout(()=>$("#settingsMessage").textContent="",2500)}
function clearHistory(){if(!recent.length){notify("Your history is already empty.");return}if(confirm("Clear your recently played history?")){recent=[];save(STORAGE.recent,recent);renderRecent();renderHome();notify("Listening history cleared")}}
function init(){applySettings();renderAll();navigate(location.hash.replace("#","")||"home");$("#volumeBar").value=settings.volume}
document.addEventListener("click",e=>{const nav=e.target.closest("[data-view]");if(nav){e.preventDefault();navigate(nav.dataset.view);return}const jump=e.target.closest("[data-jump]");if(jump){navigate(jump.dataset.jump);return}const play=e.target.closest("[data-play]");if(play){playSong(play.dataset.play);return}const like=e.target.closest("[data-like]");if(like){toggleLike(like.dataset.like);return}const card=e.target.closest("[data-play-card]");if(card){playSong(card.dataset.playCard);return}const album=e.target.closest("[data-album]");if(album){const a=albums.find(x=>x.name===album.dataset.album);playCollection(a.ids.map(track));return}const mood=e.target.closest("[data-mood]");if(mood){const list=songs.filter(s=>s.mood.includes(mood.dataset.mood));playCollection(list);return}const pl=e.target.closest("[data-open-playlist]");if(pl){openPlaylist(pl.dataset.openPlaylist);return}const del=e.target.closest("[data-delete-playlist]");if(del){playlists=playlists.filter(p=>p.id!==del.dataset.deletePlaylist);save(STORAGE.playlists,playlists);renderPlaylists();notify("Playlist deleted")}});
$$(".filter-pill").forEach(btn=>btn.addEventListener("click",()=>{$$(".filter-pill").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected");activeFilter=btn.dataset.filter;renderLibrary()}));
$("#createPlaylistBtn").addEventListener("click",createPlaylist);$("#playlistNameInput").addEventListener("keydown",e=>{if(e.key==="Enter")createPlaylist()});
$("#playBtn").addEventListener("click",()=>currentId?playSong(currentId):playCollection(songs));$("#heroPlayBtn").addEventListener("click",()=>playCollection(songs));$("#nextBtn").addEventListener("click",nextSong);$("#prevBtn").addEventListener("click",previousSong);
$("#shuffleBtn").addEventListener("click",()=>{isShuffle=!isShuffle;$("#shuffleBtn").classList.toggle("active",isShuffle);notify(isShuffle?"Shuffle on":"Shuffle off")});
$("#repeatBtn").addEventListener("click",()=>{repeatMode=(repeatMode+1)%3;$("#repeatBtn").classList.toggle("active",repeatMode!==0);$("#repeatBtn").textContent=repeatMode===2?"↻¹":"↻";notify(["Repeat off","Repeat all","Repeat one"][repeatMode])});
$("#playerLikeBtn").addEventListener("click",()=>currentId&&toggleLike(currentId));$("#likedPlayBtn").addEventListener("click",()=>playCollection(liked.map(track)));
$("#libraryShuffle").addEventListener("click",()=>{isShuffle=true;$("#shuffleBtn").classList.add("active");playCollection([...songs].sort(()=>Math.random()-.5))});
$("#clearHistoryBtn").addEventListener("click",clearHistory);$("#saveSettingsBtn").addEventListener("click",saveSettings);
$("#defaultVolumeSetting").addEventListener("input",e=>{$("#volumeBar").value=e.target.value;audio.volume=Number(e.target.value)/100});
$("#volumeBar").addEventListener("input",e=>{audio.volume=Number(e.target.value)/100;$("#defaultVolumeSetting").value=e.target.value;settings.volume=Number(e.target.value)});
$("#globalSearch").addEventListener("input",e=>{navigate("search");$("#pageSearch").value=e.target.value;search(e.target.value)});
$("#pageSearch").addEventListener("input",e=>search(e.target.value));
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#backBtn").addEventListener("click",()=>history.back());$("#forwardBtn").addEventListener("click",()=>history.forward());
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#globalSearch").focus()}if(e.code==="Space"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("#playBtn").click()}});
audio.addEventListener("timeupdate",()=>{if(audio.duration){$("#progressBar").value=audio.currentTime/audio.duration*100;$("#currentTime").textContent=formatTime(audio.currentTime);$("#duration").textContent=formatTime(audio.duration)}});
$("#progressBar").addEventListener("input",e=>{if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/100});
audio.addEventListener("play",updatePlayState);audio.addEventListener("pause",updatePlayState);
audio.addEventListener("ended",()=>{if(repeatMode===2){audio.currentTime=0;audio.play()}else if(settings.autoplay)nextSong();else updatePlayState()});
audio.addEventListener("error",()=>{if(currentId)notify("Couldn't load this track. Check its audio file path.")});
window.addEventListener("hashchange",()=>{const view=location.hash.slice(1);if(view)navigate(view)});
init();
