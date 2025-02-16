const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const marked = require('marked');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

// Fonction pour transformer le texte en prompt markdown structuré
function createStructuredPrompt(text) {
  const sections = text.split(/\n(?=#{1,6}\s)/); // Divise par les en-têtes markdown
  
  let prompt = '# Résumé automatique du document\n\n';
  
  // Ajoute un résumé initial (premiers paragraphes)
  const firstParagraphs = sections[0].split('\n\n').slice(0, 2).join('\n\n');
  prompt += `${firstParagraphs}\n\n`;
  
  prompt += '# Points clés\n\n';
  
  // Extrait les points importants (basé sur la longueur et les mots-clés)
  sections.forEach(section => {
    if (section.length > 100 && /important|clé|principal|essentiel/i.test(section)) {
      prompt += `> ${section.trim()}\n\n`;
    }
  });
  
  prompt += '# Questions suggérées\n\n';
  prompt += '1. Quel est le message principal du document ?\n';
  prompt += '2. Quels sont les points qui nécessitent une clarification ?\n';
  prompt += '3. Quelles sont les implications pratiques des informations présentées ?\n';
  
  return prompt;
}

// Route pour l'upload de PDF
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF fourni' });
    }
    
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const prompt = createStructuredPrompt(data.text);
    
    // Nettoie le fichier uploadé
    fs.unlinkSync(req.file.path);
    
    res.json({ prompt });
  } catch (error) {
    console.error('Erreur lors du traitement du PDF:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});