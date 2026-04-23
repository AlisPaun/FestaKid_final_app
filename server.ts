import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Handle ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Firebase config
let db: any;
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Initialize Firebase
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn('Firebase config file missing');
  }
} catch (error) {
  console.error('Failed to initialize Firebase on server:', error);
}

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
  }

  // Handle dynamic meta tags for social sharing
  // MUST be before express.static to intercept the index request
  app.get('*', async (req, res, next) => {
    // Skip static assets (anything with an extension that isn't .html or the root)
    const isFileRequest = req.path.includes('.') && !req.path.endsWith('.html');
    if (isFileRequest) {
      return next();
    }

    // Capture partyId if present
    const partyId = req.query.partyId as string;
    
    // Only proceed with dynamic injection if it's a request that would serve index.html
    // (root path or explicit index.html or something that's not a file)
    const isIndexRequest = req.path === '/' || req.path.endsWith('/index.html') || !req.path.includes('.');
    
    if (!isIndexRequest) {
      return next();
    }

    const url = req.originalUrl;

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

      let title = "FestaKids: Crea Inviti Magici per Bambini 🎂";
      let description = "La piattaforma completa per gestire inviti, RSVP e regali per i tuoi bambini. Inizia a creare ora!";
      let image = "/social-preview.png";

      // Function to ensure image URL is absolute
      const getAbsoluteImageUrl = (imgUrl: string) => {
        if (imgUrl.startsWith('http')) return imgUrl;
        
        const host = req.get('host');
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        let baseUrl = `${protocol}://${host}`;
        
        const configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL;
        if (configuredUrl && !configuredUrl.includes('ai.studio/apps') && !configuredUrl.includes('.run.app')) {
          baseUrl = configuredUrl.replace(/\/$/, '');
        }
        
        return `${baseUrl.replace(/\/$/, '')}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
      };

      // If it's a party link, fetch details
      if (partyId && db) {
        try {
          const partyRef = doc(db, 'parties', partyId);
          const partySnap = await getDoc(partyRef);

          if (partySnap.exists()) {
            const partyData = partySnap.data();
            if (partyData) {
              title = `${partyData.title} 🎂`;
              description = partyData.description || 'Sei invitato alla festa! Clicca per vedere i dettagli e confermare la tua presenza.';
              if (partyData.invitationImageUrl) {
                image = partyData.invitationImageUrl;
              }
            }
          }
        } catch (dbError) {
          console.error('Error fetching party for metadata:', dbError);
        }
      }

      const absoluteImage = getAbsoluteImageUrl(image);

      // Simple replacement of placeholders
      html = html.replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${title}"`);
      html = html.replace(/property="og:description" content="[^"]*"/, `property="og:description" content="${description}"`);
      html = html.replace(/property="og:image" content="[^"]*"/, `property="og:image" content="${absoluteImage}"`);
      
      html = html.replace(/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${title}"`);
      html = html.replace(/name="twitter:description" content="[^"]*"/, `name="twitter:description" content="${description}"`);
      html = html.replace(/name="twitter:image" content="[^"]*"/, `name="twitter:image" content="${absoluteImage}"`);
      
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
      
      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      console.error('Error injecting meta tags:', error);
      if (process.env.NODE_ENV === 'production') {
        const prodIndexPath = path.join(__dirname, 'dist', 'index.html');
        if (fs.existsSync(prodIndexPath)) {
          return res.sendFile(prodIndexPath);
        }
      }
      next();
    }
  });

  // Serve static files in production AFTER the dynamic meta handler
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
