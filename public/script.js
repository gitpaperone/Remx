const listEl = document.getElementById('music-list');
const audio = document.getElementById('audio');
const nowPlaying = document.getElementById('now-playing');
const coverImg = document.getElementById('cover');
const searchInput = document.getElementById('search');
const themeSwitch = document.getElementById('themeSwitch');
const sortSelect = document.getElementById('sortSelect');
const playPauseBtn = document.getElementById('playPause');
const seekBar = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeControl = document.getElementById('volumeControl');
const loopBtn = document.getElementById('loopBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const playCountEl = document.getElementById('playCount');
const userArea = document.getElementById('userArea');

let allTracks = [];
let isShuffle = false;
let currentTrackTitle = null;

// Supabase
const { createClient } = supabase;
const supabaseClient = createClient(
  'https://TON_URL_SUPABASE.supabase.co',
  'TON_ANON_KEY'
);
const BUCKET = 'musics';
const FOLDER = 'uploads';

// Récupération des musiques
async function fetchTracksFromSupabase() {
  const { data: files, error } = await supabaseClient
    .storage
    .from(BUCKET)
    .list(FOLDER, { limit: 100 });

  if (error || !files) {
    console.error("Erreur de chargement des pistes :", error?.message);
    listEl.innerHTML = "<p>Impossible de charger les musiques.</p>";
    return;
  }

  const mp3Files = files.filter(f => f.name.endsWith('.mp3'));
  const jpgFiles = files.filter(f => f.name.endsWith('.jpg'));

  allTracks = mp3Files.map(mp3 => {
    const title = mp3.name.replace('.mp3', '');
    const image = jpgFiles.find(img => img.name === `${title}.jpg`);
    const filePath = `${FOLDER}/${mp3.name}`;
    const coverPath = image ? `${FOLDER}/${image.name}` : "covers/default.jpg";

    const audioUrl = supabaseClient
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath).publicUrl;

    const coverUrl = image
      ? supabaseClient.storage.from(BUCKET).getPublicUrl(coverPath).publicUrl
      : "covers/default.jpg";

    return {
      title,
      file: audioUrl,
      cover: coverUrl,
      date: new Date(mp3.created_at || Date.now())
    };
  });

  renderTracks();
}

fetchTracksFromSupabase();

// Affichage des musiques
function renderTracks(filter = "") {
  listEl.innerHTML = '';
  let filtered = allTracks.filter(track =>
    track.title.toLowerCase().includes(filter.toLowerCase())
  );

  const sortValue = sortSelect?.value;
  if (sortValue === 'alpha') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortValue === 'recent') {
    filtered.sort((a, b) => b.date - a.date);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = "<p>Aucun morceau trouvé 🎵</p>";
  } else {
    filtered.forEach(track => {
      const div = document.createElement('div');
      div.className = 'track';
      div.innerHTML = `
        <img src="${track.cover}" alt="cover" style="width:100%; border-radius: 8px;" />
        <h3>${track.title}</h3>
      `;
      div.onclick = () => playTrack(track);
      listEl.appendChild(div);
    });
  }
}

// Lecture d'un morceau
function playTrack(track) {
  audio.src = track.file;
  audio.play();
  nowPlaying.textContent = "Lecture : " + track.title;
  coverImg.src = track.cover;
  incrementStat(track.title);
  updatePlayCount(track.title);
  currentTrackTitle = track.title;
}

// Incrémentation des stats
function incrementStat(title) {
  const key = 'play_' + title;
  let count = parseInt(localStorage.getItem(key) || "0");
  localStorage.setItem(key, count + 1);

  fetch('/api/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
}

function updatePlayCount(title) {
  const count = localStorage.getItem('play_' + title) || "0";
  playCountEl.textContent = `Écoutes : ${count}`;
}

// Recherche et tri
searchInput?.addEventListener('input', e => {
  renderTracks(e.target.value);
});
sortSelect?.addEventListener('change', () => {
  renderTracks(searchInput?.value || "");
});

// Thème
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  if (themeSwitch) themeSwitch.checked = true;
}
themeSwitch?.addEventListener('change', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// Contrôles audio
playPauseBtn.addEventListener('click', () => {
  audio.paused ? audio.play() : audio.pause();
});

audio.addEventListener('play', () => {
  playPauseBtn.textContent = '⏸️';
});

audio.addEventListener('pause', () => {
  playPauseBtn.textContent = '▶️';
});

audio.addEventListener('loadedmetadata', () => {
  seekBar.max = audio.duration;
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  seekBar.value = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

seekBar.addEventListener('input', () => {
  audio.currentTime = seekBar.value;
});

audio.addEventListener('error', () => {
  nowPlaying.textContent = "Erreur de lecture 😞";
});

// Format MM:SS
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// Volume
volumeControl.addEventListener('input', () => {
  audio.volume = volumeControl.value;
});

// Loop toggle
loopBtn.addEventListener('click', () => {
  audio.loop = !audio.loop;
  loopBtn.style.opacity = audio.loop ? 1 : 0.5;
});

// Shuffle toggle
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.style.opacity = isShuffle ? 1 : 0.5;
});

// Lecture suivante en shuffle
audio.addEventListener('ended', () => {
  if (isShuffle && allTracks.length > 1) {
    let next;
    do {
      next = allTracks[Math.floor(Math.random() * allTracks.length)];
    } while (next.title === currentTrackTitle);
    playTrack(next);
  }
});

// Top 5
fetch('/api/top')
  .then(res => res.json())
  .then(top => {
    const ul = document.getElementById('topList');
    if (!ul) return;
    ul.innerHTML = '';
    top.forEach(t => {
      const li = document.createElement('li');
      li.textContent = `${t.title} (${t.plays || 0} écoutes)`;
      ul.appendChild(li);
    });
  });

// Gestion utilisateur
fetch('/api/profile')
  .then(res => {
    if (!res.ok) throw new Error('Non connecté');
    return res.json();
  })
  .then(data => {
    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = "👤 " + data.username;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = "Déconnexion";
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.style.padding = '0.3rem 0.6rem';
    logoutBtn.style.border = 'none';
    logoutBtn.style.backgroundColor = '#f33';
    logoutBtn.style.color = '#fff';
    logoutBtn.style.borderRadius = '4px';

    logoutBtn.onclick = () => {
      fetch('/api/logout', { method: 'POST' })
        .then(() => location.reload());
    };

    userArea.appendChild(usernameSpan);
    userArea.appendChild(logoutBtn);
  })
  .catch(() => {
    const loginLink = document.createElement('a');
    loginLink.href = '/login.html';
    loginLink.textContent = 'Connexion';
    loginLink.className = 'auth-link';

    const registerLink = document.createElement('a');
    registerLink.href = '/register.html';
    registerLink.textContent = 'Inscription';
    registerLink.className = 'auth-link';

    userArea.appendChild(loginLink);
    userArea.appendChild(registerLink);
  });
