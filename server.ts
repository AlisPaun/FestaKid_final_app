import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Handle ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8'));

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  // Handle dynamic meta tags for social sharing
  app.get('*', async (req, res, next) => {
    // Skip static assets
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      return next();
    }

    const url = req.originalUrl;
    const partyId = req.query.partyId as string;

    try {
      let templatePath = '';
      if (process.env.NODE_ENV === 'production') {
        templatePath = path.join(__dirname, 'dist', 'index.html');
      } else {
        templatePath = path.join(__dirname, 'index.html');
      }

      if (!fs.existsSync(templatePath)) {
        return next();
      }

      let html = fs.readFileSync(templatePath, 'utf-8');

      // Transform if in dev mode
      if (vite) {
        html = await vite.transformIndexHtml(url, html);
      }

      let title = "FestaKid: Crea Inviti Magici per Bambini 🎂";
      let description = "La piattaforma completa per gestire inviti, RSVP e regali per i tuoi bambini. Inizia a creare ora!";
      let image = "https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&w=1200&h=630&q=80";

      // If it's a party link, fetch details
      if (partyId) {
        const partyRef = doc(db, 'parties', partyId);
        const partySnap = await getDoc(partyRef);

        if (partySnap.exists()) {
          const partyData = partySnap.data();
          title = `${partyData.title} 🎂`;
          description = partyData.description || 'Sei invitato alla festa! Clicca per vedere i dettagli e confermare la tua presenza.';
          if (partyData.invitationImageUrl) {
            image = partyData.invitationImageUrl;
          }
        }
      }

      // Simple replacement of placeholders
      html = html.replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${title}"`);
      html = html.replace(/property="og:description" content="[^"]*"/, `property="og:description" content="${description}"`);
      html = html.replace(/property="og:image" content="[^"]*"/, `property="og:image" content="${image}"`);
      
      // Twitter tags replacement
      html = html.replace(/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${title}"`);
      html = html.replace(/name="twitter:description" content="[^"]*"/, `name="twitter:description" content="${description}"`);
      html = html.replace(/name="twitter:image" content="[^"]*"/, `name="twitter:image" content="${image}"`);
      
      // Fallback title tag
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
      
      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      console.error('Error injecting meta tags:', error);
      if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      } else {
        next();
      }
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
