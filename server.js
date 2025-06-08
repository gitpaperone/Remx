const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Sert les fichiers statiques depuis public/
app.use(express.static('public'));

// Middleware pour nettoyer et formater le titre
function parseTitle(req, res, next) {
  const rawTitle = req.body.title || 'track';
  const cleaned = rawTitle
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()); // Majuscule à chaque mot

  req.cleanedTitle = cleaned;
  next();
}

// Configuration du stockage pour Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'file') {
      cb(null, 'public/music');
    } else if (file.fieldname === 'cover') {
      cb(null, 'public/covers');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let title = req.cleanedTitle;

    // Si parseTitle n’a pas encore tourné
    if (!title && req.body.title) {
      title = req.body.title
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
      req.cleanedTitle = title;
    }

    cb(null, `${title}${ext}`);
  }
});

const upload = multer({ storage });

// API pour obtenir la liste des musiques
app.get('/api/music', (req, res) => {
  const musicDir = path.join(__dirname, 'public/music');
  fs.readdir(musicDir, (err, files) => {
    if (err) {
      console.error("Erreur lecture dossier music :", err);
      return res.status(500).json({ error: 'Impossible de lire les musiques.' });
    }

    const tracks = files
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const title = path.parse(file).name;
        return {
          title: title,
          file: `music/${file}`,
          cover: `covers/${title}.jpg`,
          date: fs.statSync(path.join(musicDir, file)).mtime.getTime()
        };
      });

    console.log("Fichiers MP3 trouvés :", tracks);
    res.json(tracks);
  });
});

// API pour compter les lectures
app.post('/api/play', express.json(), (req, res) => {
  console.log("Lecture :", req.body.title);
  res.status(200).end();
});

// Route d’upload
app.post('/upload',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  parseTitle,
  (req, res) => {
    if (!req.cleanedTitle || !req.files?.file || !req.files?.cover) {
      return res.status(400).send("Données manquantes.");
    }

    console.log(`Piste reçue : ${req.cleanedTitle}`);
    res.send("Piste envoyée avec succès !");
  }
);

// Lancement du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
