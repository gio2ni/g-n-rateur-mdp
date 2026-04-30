/* ============================================================
   SCRIPT.JS — Générateur de mot de passe sécurisé
   Logique : génération, force, copie, animations
   Auteur : Projet BTS SIO SLAM
   ============================================================ */


/* ============================================================
   1. SÉLECTION DES ÉLÉMENTS DU DOM
   Le DOM (Document Object Model) représente la structure HTML.
   document.getElementById() permet d'accéder à un élément par son id.
   ============================================================ */

// Zone d'affichage du mot de passe généré
const passwordOutput = document.getElementById('password-output');

// Boutons
const btnGenerate = document.getElementById('btn-generate');
const btnCopy     = document.getElementById('btn-copy');

// Slider de longueur et badge d'affichage de la valeur
const lengthSlider = document.getElementById('length-slider');
const lengthValue  = document.getElementById('length-value');

// Cases à cocher des options
const optUppercase = document.getElementById('opt-uppercase');
const optLowercase = document.getElementById('opt-lowercase');
const optNumbers   = document.getElementById('opt-numbers');
const optSymbols   = document.getElementById('opt-symbols');

// Indicateur de force
const strengthFill  = document.getElementById('strength-fill');
const strengthLabel = document.getElementById('strength-label');

// Message de confirmation de copie
const copyFeedback = document.getElementById('copy-feedback');

// Conteneur de la zone d'affichage (pour changer la bordure)
const passwordDisplay = document.querySelector('.password-display');

// Icône du bouton générer (pour l'animation de rotation)
const btnIcon = document.querySelector('.btn-icon');


/* ============================================================
   2. JEUX DE CARACTÈRES
   Ce sont les "alphabets" utilisés pour construire le mot de passe.
   Selon les options cochées, on les combine.
   ============================================================ */
const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?'
};


/* ============================================================
   3. GÉNÉRATION DU MOT DE PASSE
   Logique principale : construire un pool de caractères autorisés,
   puis tirer aléatoirement N caractères dedans.
   ============================================================ */
function generatePassword() {

  // -- 3.1 Construction du pool de caractères disponibles --
  // On commence avec une chaîne vide, et on y ajoute les jeux cochés
  let pool = '';

  if (optUppercase.checked) pool += CHARS.uppercase;
  if (optLowercase.checked) pool += CHARS.lowercase;
  if (optNumbers.checked)   pool += CHARS.numbers;
  if (optSymbols.checked)   pool += CHARS.symbols;

  // Sécurité : si aucune option n'est cochée, on force les minuscules
  if (pool === '') {
    pool = CHARS.lowercase;
    optLowercase.checked = true; // On recoche visuellement l'option
  }

  // -- 3.2 Lecture de la longueur souhaitée --
  // parseInt() convertit la valeur texte du slider en nombre entier
  const length = parseInt(lengthSlider.value);

  // -- 3.3 Génération caractère par caractère --
  let password = '';

  for (let i = 0; i < length; i++) {
    /*
      Math.random()        → nombre aléatoire entre 0 (inclus) et 1 (exclus)
      * pool.length         → ramène ce nombre dans [0, longueur du pool[
      Math.floor(...)       → arrondit à l'entier inférieur pour obtenir un index valide
      pool[index]           → récupère le caractère à cet index
    */
    const randomIndex = Math.floor(Math.random() * pool.length);
    password += pool[randomIndex];
  }

  // -- 3.4 Garantie de qualité (au moins 1 caractère de chaque type coché) --
  // Cela évite qu'un mot de passe ne contienne par hasard aucun chiffre
  // alors que l'option "chiffres" est cochée.
  password = ensureVariety(password, pool, length);

  return password;
}


/* ============================================================
   4. GARANTIR LA VARIÉTÉ DU MOT DE PASSE
   S'assure qu'au moins un caractère de chaque type activé est présent.
   Technique : on "force" des caractères obligatoires aux positions aléatoires.
   ============================================================ */
function ensureVariety(password, fullPool, length) {

  // Tableau des jeux obligatoires selon les cases cochées
  const required = [];
  if (optUppercase.checked) required.push(CHARS.uppercase);
  if (optLowercase.checked) required.push(CHARS.lowercase);
  if (optNumbers.checked)   required.push(CHARS.numbers);
  if (optSymbols.checked)   required.push(CHARS.symbols);

  // Convertit le mot de passe en tableau de caractères (plus facile à modifier)
  let chars = password.split('');

  // Pour chaque type requis, on force un caractère de ce type à une position aléatoire
  required.forEach((charSet, i) => {

    // Index de position dans le mot de passe (distribué uniformément)
    const pos = Math.floor((i / required.length) * length);

    // Caractère aléatoire du jeu concerné
    const randomChar = charSet[Math.floor(Math.random() * charSet.length)];

    // On remplace le caractère à cette position
    chars[pos] = randomChar;
  });

  // Retourne le tableau reconverti en chaîne de caractères
  return chars.join('');
}


/* ============================================================
   5. CALCUL DE LA FORCE DU MOT DE PASSE
   On attribue des points selon plusieurs critères,
   puis on retourne un niveau : weak / fair / good / strong
   ============================================================ */
function evaluateStrength(password) {

  let score = 0;

  // Critère 1 : longueur
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (password.length >= 20) score++;

  // Critère 2 : variété de types de caractères
  // Les RegEx (expressions régulières) testent si le mot de passe contient
  // un ou plusieurs caractères d'un type donné
  if (/[A-Z]/.test(password)) score++; // Contient au moins une majuscule
  if (/[a-z]/.test(password)) score++; // Contient au moins une minuscule
  if (/[0-9]/.test(password)) score++; // Contient au moins un chiffre
  if (/[^A-Za-z0-9]/.test(password)) score++; // Contient au moins un symbole

  // Retourne un objet avec le niveau, le pourcentage (pour la barre) et la couleur
  if (score <= 2) return { level: 'Faible',    pct: 25,  color: 'var(--strength-weak)'   };
  if (score <= 4) return { level: 'Moyen',     pct: 50,  color: 'var(--strength-fair)'   };
  if (score <= 6) return { level: 'Fort',      pct: 75,  color: 'var(--strength-good)'   };
                  return { level: 'Très fort', pct: 100, color: 'var(--strength-strong)' };
}


/* ============================================================
   6. MISE À JOUR DE L'INTERFACE (affichage du résultat)
   Cette fonction modifie le DOM pour afficher le mot de passe
   et mettre à jour l'indicateur de force.
   ============================================================ */
function updateUI(password) {

  // -- 6.1 Affichage du mot de passe avec animation --

  // Retire la classe d'animation si elle était déjà présente
  // (important pour que l'animation se rejoue à chaque clic)
  passwordOutput.classList.remove('animate', 'placeholder');

  // Force le navigateur à "reflow" pour redémarrer l'animation CSS
  void passwordOutput.offsetWidth; // Cette ligne "astucieuse" réinitialise l'animation

  // Affiche le mot de passe
  passwordOutput.textContent = password;

  // Ajoute la classe qui déclenche l'animation CSS (définie dans style.css)
  passwordOutput.classList.add('animate');

  // Ajoute la classe pour la bordure verte
  passwordDisplay.classList.add('has-password');


  // -- 6.2 Mise à jour de l'indicateur de force --

  const strength = evaluateStrength(password);

  // Modifie la largeur et la couleur de la barre (propriétés CSS inline)
  strengthFill.style.width      = strength.pct + '%';
  strengthFill.style.background = strength.color;

  // Affiche le texte du niveau et le colorie
  strengthLabel.textContent  = strength.level;
  strengthLabel.style.color  = strength.color;
}


/* ============================================================
   7. GESTIONNAIRE D'ÉVÉNEMENTS — BOUTON GÉNÉRER
   Un "événement" est une action de l'utilisateur (clic, saisie…).
   addEventListener() permet de "écouter" un événement sur un élément.
   ============================================================ */
btnGenerate.addEventListener('click', () => {

  // Animation de rotation de l'icône du bouton
  btnIcon.classList.remove('spin');
  void btnIcon.offsetWidth;         // Réinitialise l'animation
  btnIcon.classList.add('spin');

  // Génère le mot de passe et met à jour l'affichage
  const newPassword = generatePassword();
  updateUI(newPassword);
});


/* ============================================================
   8. GESTIONNAIRE D'ÉVÉNEMENTS — BOUTON COPIER
   L'API Clipboard (navigator.clipboard) permet d'écrire dans
   le presse-papiers du système. Elle renvoie une Promise.
   ============================================================ */
btnCopy.addEventListener('click', () => {

  // Récupère le texte actuellement affiché
  const text = passwordOutput.textContent;

  // Vérifie qu'il y a bien un mot de passe à copier
  if (!text || text === 'Cliquez sur Générer') return;

  // navigator.clipboard.writeText() est asynchrone (renvoie une Promise)
  // .then() s'exécute si ça réussit, .catch() si ça échoue
  navigator.clipboard.writeText(text)
    .then(() => {

      // Affiche le message "Copié !"
      copyFeedback.classList.add('show');

      // Cache le message après 1,8 secondes
      setTimeout(() => {
        copyFeedback.classList.remove('show');
      }, 1800);

    })
    .catch(err => {
      console.error('Erreur lors de la copie :', err);
    });
});


/* ============================================================
   9. GESTIONNAIRE D'ÉVÉNEMENTS — SLIDER
   'input' se déclenche en temps réel pendant le déplacement du slider.
   On met à jour le badge d'affichage de la longueur.
   ============================================================ */
lengthSlider.addEventListener('input', () => {

  // Met à jour le badge numérique affiché à côté du label "Longueur"
  lengthValue.textContent = lengthSlider.value;

  // Re-génère et affiche un nouveau mot de passe en temps réel
  // (confort UX : l'utilisateur voit immédiatement l'effet)
  const newPassword = generatePassword();
  updateUI(newPassword);
});


/* ============================================================
   10. GESTIONNAIRES D'ÉVÉNEMENTS — CASES À COCHER
   On écoute les changements sur chaque checkbox.
   Quand une option change, on regénère le mot de passe.
   ============================================================ */
[optUppercase, optLowercase, optNumbers, optSymbols].forEach(opt => {
  opt.addEventListener('change', () => {
    const newPassword = generatePassword();
    updateUI(newPassword);
  });
});


/* ============================================================
   11. FOND ANIMÉ — CANVAS
   Effet de particules flottantes pour le fond de la page.
   Le canvas HTML5 permet de dessiner via JavaScript.
   ============================================================ */
(function initCanvas() {

  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d'); // Contexte de dessin 2D

  // Redimensionne le canvas à la taille de la fenêtre
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Crée un tableau de particules
  const particles = [];
  const COUNT = 50; // Nombre de particules

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x:     Math.random() * window.innerWidth,   // Position X aléatoire
      y:     Math.random() * window.innerHeight,  // Position Y aléatoire
      r:     Math.random() * 1.5 + 0.3,           // Rayon (taille du point)
      dx:    (Math.random() - 0.5) * 0.3,         // Vitesse horizontale
      dy:    (Math.random() - 0.5) * 0.3,         // Vitesse verticale
      alpha: Math.random() * 0.4 + 0.05           // Opacité aléatoire
    });
  }

  // Boucle d'animation (appelée ~60 fois par seconde par le navigateur)
  function animate() {
    requestAnimationFrame(animate); // Appel récursif pour la prochaine frame

    // Efface le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {

      // Déplace la particule
      p.x += p.dx;
      p.y += p.dy;

      // Rebond sur les bords
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

      // Dessine la particule (cercle vert semi-transparent)
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(48, 240, 128, ${p.alpha})`;
      ctx.fill();
    });
  }

  animate();

})(); // IIFE : la fonction s'appelle elle-même immédiatement


/* ============================================================
   12. INITIALISATION — GÉNÉRATION AU CHARGEMENT DE LA PAGE
   On génère un premier mot de passe dès l'ouverture de la page.
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  const initialPassword = generatePassword();
  updateUI(initialPassword);
});
