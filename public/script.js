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

let allTracks = [];

// Récupère les musiques
fetch('/api/music')
  .then(res => res.json())
  .then(data => {
    allTracks = data;
    renderTracks();
  })
  .catch(err => {
    console.error("Erreur de chargement des pistes :", err);
    listEl.innerHTML = "<p>Impossible de charger les musiques.</p>";
  });

// Affiche les pistes
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
      <img src="${track.cover || 'covers/default.jpg'}" alt="cover" style="width:100%; border-radius: 8px;" />
      <h3>${track.title}</h3>
    `;
    div.onclick = () => playTrack(track);
    listEl.appendChild(div);
  });
}
}

// Statistique
function incrementStat(title) {
  const key = 'play_' + title;
  let count = parseInt(localStorage.getItem(key) || "0");
  localStorage.setItem(key, count + 1);

  // Envoie aussi la stat au serveur pour le Top 5
  fetch('/api/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
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
if (playPauseBtn && audio && seekBar) {
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
}

// Format MM:SS
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}
const volumeControl = document.getElementById('volumeControl');
const loopBtn = document.getElementById('loopBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const playCountEl = document.getElementById('playCount');

let isShuffle = false;

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

// Lecture avec stats et shuffle
function playTrack(track) {
  audio.src = track.file;
  audio.play();
  nowPlaying.textContent = "Lecture : " + track.title;
  coverImg.src = track.cover || "covers/default.jpg";
  incrementStat(track.title);
  updatePlayCount(track.title);
  currentTrackTitle = track.title;
}

// Incrémente et affiche le compteur
function incrementStat(title) {
  const key = 'play_' + title;
  let count = parseInt(localStorage.getItem(key) || "0");
  localStorage.setItem(key, count + 1);
}

function updatePlayCount(title) {
  const count = localStorage.getItem('play_' + title) || "0";
  playCountEl.textContent = `Écoutes : ${count}`;
}

let currentTrackTitle = null;

// Lecture suivante en mode shuffle
audio.addEventListener('ended', () => {
  if (isShuffle && allTracks.length > 1) {
    let next;
    do {
      next = allTracks[Math.floor(Math.random() * allTracks.length)];
    } while (next.title === currentTrackTitle);
    playTrack(next);
  }
});
// Charger le Top 5 des morceaux les plus écoutés
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
const userArea = document.getElementById('userArea');

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
    loginLink.style.textDecoration = 'none';
    loginLink.style.color = 'var(--text-color, #fff)';
    loginLink.style.padding = '0.3rem 0.6rem';
    loginLink.style.border = '1px solid var(--text-color, #fff)';
    loginLink.style.borderRadius = '4px';

    const registerLink = document.createElement('a');
    registerLink.href = '/register.html';
    registerLink.textContent = 'Inscription';
    registerLink.style.textDecoration = 'none';
    registerLink.style.color = 'var(--text-color, #fff)';
    registerLink.style.padding = '0.3rem 0.6rem';
    registerLink.style.border = '1px solid var(--text-color, #fff)';
    registerLink.style.borderRadius = '4px';

    userArea.appendChild(loginLink);
    userArea.appendChild(registerLink);
  });
