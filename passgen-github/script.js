/* ============================================================
   SCRIPT.JS — PassGen
   Logique complète : génération, force, copie, historique,
   thème, tooltips, animations.
   Auteur : Giovanni BINTOUL — BTS SIO SLAM
   ============================================================ */

"use strict"; // Active le mode strict JS : détecte plus d'erreurs


/* ════════════════════════════════════════════════════════════
   1. SÉLECTION DES ÉLÉMENTS DU DOM
   ════════════════════════════════════════════════════════════
   document.getElementById() retourne l'élément HTML
   dont l'attribut id correspond à la chaîne passée.
   On les stocke en constantes pour éviter de les rechercher
   à chaque fois (meilleure performance). */

const elOutput      = document.getElementById("password-output");
const elPasswordRow = document.getElementById("password-zone").querySelector(".password-row");
const elMeta        = document.getElementById("password-meta");
const elCopyFeedback= document.getElementById("copy-feedback");
const elStrLabel    = document.getElementById("strength-label");
const elBars        = [1,2,3,4].map(i => document.getElementById(`s${i}`));
const elLengthSlider= document.getElementById("length-slider");
const elLengthValue = document.getElementById("length-value");
const elBtnGenerate = document.getElementById("btn-generate");
const elBtnCopy     = document.getElementById("btn-copy");
const elBtnRegen    = document.getElementById("btn-regen");
const elBtnToggle   = document.getElementById("btn-toggle");
const elIconEyeOpen = document.getElementById("icon-eye-open");
const elIconEyeOff  = document.getElementById("icon-eye-off");
const elBtnTheme    = document.getElementById("theme-toggle");
const elHistoryList = document.getElementById("history-list");
const elHistoryCount= document.getElementById("history-count");
const elBtnClear    = document.getElementById("btn-clear");
const elTooltip     = document.getElementById("tooltip-bubble");


/* ════════════════════════════════════════════════════════════
   2. JEUX DE CARACTÈRES
   ════════════════════════════════════════════════════════════
   Ces chaînes constituent les "alphabets" disponibles.
   On les combinera selon les options choisies. */

const CHARS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers:   "0123456789",
  symbols:   "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

/* Couleurs des niveaux de force (utilisées pour la pastille historique) */
const STRENGTH_COLORS = {
  weak:   "#e05252",
  fair:   "#d4870d",
  good:   "#2e7fd4",
  strong: "#1e9c6e",
};

/* Labels textuels des niveaux */
const STRENGTH_LABELS = {
  weak:   "🔴 Faible",
  fair:   "🟠 Moyen",
  good:   "🔵 Fort",
  strong: "🟢 Très fort",
};


/* ════════════════════════════════════════════════════════════
   3. ÉTAT DE L'APPLICATION
   ════════════════════════════════════════════════════════════
   Toutes les données "vivantes" de l'app sont ici.
   C'est le pattern "single source of truth". */

const state = {
  password:    null,    // Mot de passe actuellement affiché
  visible:     true,    // Mot de passe visible ou masqué ?
  history:     [],      // Tableau des entrées générées
  copyTimer:   null,    // Référence du timer "Copié !" (pour l'annuler)
};


/* ════════════════════════════════════════════════════════════
   4. GÉNÉRATION SÉCURISÉE
   ════════════════════════════════════════════════════════════ */

/**
 * secureRandom(max)
 * ─────────────────
 * Génère un entier aléatoire entre 0 (inclus) et max (exclus),
 * en utilisant l'API Crypto du navigateur.
 *
 * window.crypto.getRandomValues() remplit un tableau avec des
 * octets aléatoires de haute qualité (cryptographiquement sûrs).
 * C'est bien mieux que Math.random() qui est prévisible.
 *
 * On utilise le rejet si la valeur tirée dépasse la limite
 * pour éviter tout biais statistique.
 *
 * @param {number} max - Valeur maximale exclue
 * @returns {number} Entier dans [0, max[
 */
function secureRandom(max) {
  const array = new Uint32Array(1); // Tableau d'un seul entier 32 bits non signé

  // On recommence si la valeur dépasse la limite safe (évite le biais de modulo)
  const limit = Math.floor(0xFFFFFFFF / max) * max;

  let value;
  do {
    window.crypto.getRandomValues(array); // Remplit array[0] avec une valeur aléatoire
    value = array[0];
  } while (value >= limit); // Rejet si hors limite

  return value % max; // Retourne l'index dans [0, max[
}


/**
 * buildPool()
 * ───────────
 * Construit le "pool" de caractères disponibles selon les options
 * cochées, et retourne aussi la liste des jeux actifs séparément.
 *
 * @returns {{ pool: string, activeSets: string[] }}
 */
function buildPool() {
  let pool = "";
  const activeSets = [];

  // Lecture des 4 checkboxes
  if (document.getElementById("opt-uppercase").checked) { pool += CHARS.uppercase; activeSets.push(CHARS.uppercase); }
  if (document.getElementById("opt-lowercase").checked) { pool += CHARS.lowercase; activeSets.push(CHARS.lowercase); }
  if (document.getElementById("opt-numbers").checked)   { pool += CHARS.numbers;   activeSets.push(CHARS.numbers);   }
  if (document.getElementById("opt-symbols").checked)   { pool += CHARS.symbols;   activeSets.push(CHARS.symbols);   }

  // Si tout est décoché, on force les minuscules pour ne pas planter
  if (pool === "") {
    pool = CHARS.lowercase;
    activeSets.push(CHARS.lowercase);
    document.getElementById("opt-lowercase").checked = true;
  }

  return { pool, activeSets };
}


/**
 * generatePassword()
 * ──────────────────
 * Génère un mot de passe aléatoire selon les options actuelles.
 *
 * Algorithme en 3 étapes :
 *  1. Construire le pool de caractères disponibles
 *  2. Tirer aléatoirement `length` caractères dans le pool
 *  3. Garantir qu'au moins un caractère de chaque type est présent
 *
 * @returns {string} Le mot de passe généré
 */
function generatePassword() {
  const length = parseInt(elLengthSlider.value);
  const { pool, activeSets } = buildPool();

  // ── Étape 2 : Tirage aléatoire ──
  // On remplit un tableau de longueur `length`
  const chars = Array.from({ length }, () => pool[secureRandom(pool.length)]);

  // ── Étape 3 : Garantie d'équilibre ──
  // Pour chaque type activé, on force un caractère de ce type
  // à une position calculée (distribuée uniformément dans le tableau)
  activeSets.forEach((set, i) => {
    const pos  = Math.floor((i / activeSets.length) * length); // Position cible
    const char = set[secureRandom(set.length)];                // Caractère aléatoire du type
    chars[pos] = char; // Remplacement
  });

  return chars.join(""); // Tableau → chaîne de caractères
}


/* ════════════════════════════════════════════════════════════
   5. ÉVALUATION DE LA FORCE
   ════════════════════════════════════════════════════════════ */

/**
 * evaluateStrength(password)
 * ──────────────────────────
 * Attribue un score selon plusieurs critères et retourne un niveau.
 *
 * Les expressions régulières (RegEx) testent la présence
 * d'un type de caractère. Exemple : /[A-Z]/.test("abc") → false
 *
 * @param {string} password
 * @returns {{ level: string, segments: number, color: string, label: string }}
 */
function evaluateStrength(password) {
  let score = 0;

  // ── Longueur ──
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (password.length >= 20) score++;

  // ── Variété (RegEx) ──
  if (/[A-Z]/.test(password))      score++; // Au moins une majuscule
  if (/[a-z]/.test(password))      score++; // Au moins une minuscule
  if (/[0-9]/.test(password))      score++; // Au moins un chiffre
  if (/[^A-Za-z0-9]/.test(password)) score++; // Au moins un symbole

  // ── Score → niveau ──
  if (score <= 2) return { level:"weak",   segments:1, color:STRENGTH_COLORS.weak,   label:STRENGTH_LABELS.weak   };
  if (score <= 4) return { level:"fair",   segments:2, color:STRENGTH_COLORS.fair,   label:STRENGTH_LABELS.fair   };
  if (score <= 6) return { level:"good",   segments:3, color:STRENGTH_COLORS.good,   label:STRENGTH_LABELS.good   };
                  return { level:"strong", segments:4, color:STRENGTH_COLORS.strong, label:STRENGTH_LABELS.strong };
}


/* ════════════════════════════════════════════════════════════
   6. MISE À JOUR DE L'INTERFACE (DOM)
   ════════════════════════════════════════════════════════════
   Ces fonctions modifient le HTML pour refléter l'état actuel. */

/**
 * renderPassword(password)
 * ────────────────────────
 * Affiche le mot de passe dans la zone dédiée,
 * en tenant compte de l'état visible/masqué.
 * Déclenche l'animation de scan.
 */
function renderPassword(password) {
  // Retire la classe d'animation (si elle était déjà là)
  elOutput.classList.remove("scan");

  // Force le navigateur à recalculer le style (reflow)
  // Ce trick est nécessaire pour que l'animation se rejoue
  void elOutput.offsetWidth;

  // Texte affiché : vrai mot de passe ou points de masquage
  elOutput.textContent = state.visible
    ? password
    : "•".repeat(password.length);

  // Retire le style placeholder et ajoute l'animation
  elOutput.classList.remove("placeholder-state");
  elOutput.classList.add("scan");

  // Bordure verte sur la zone
  elPasswordRow.classList.add("active");

  // Méta-info (longueur)
  elMeta.textContent = `${password.length} caractères`;

  // Active le bouton copier
  elBtnCopy.disabled = false;
}


/**
 * renderStrength(strength)
 * ────────────────────────
 * Met à jour les 4 segments de la barre de force
 * et le label textuel.
 */
function renderStrength(strength) {
  // Allume les N premiers segments, éteint les autres
  elBars.forEach((bar, i) => {
    if (i < strength.segments) {
      bar.classList.add("on");
      bar.style.backgroundColor = strength.color;
      bar.style.borderColor = "transparent";
    } else {
      bar.classList.remove("on");
      bar.style.backgroundColor = "";
      bar.style.borderColor = "";
    }
  });

  // Label coloré
  elStrLabel.textContent = strength.label;
  elStrLabel.style.color = strength.color;
}


/**
 * renderSlider()
 * ──────────────
 * Met à jour le badge numérique et la couleur de progression
 * du slider selon sa valeur courante.
 */
function renderSlider() {
  const val = parseInt(elLengthSlider.value);
  const max = parseInt(elLengthSlider.max);
  const min = parseInt(elLengthSlider.min);
  const pct = ((val - min) / (max - min)) * 100;

  // Badge numérique
  elLengthValue.textContent = val;

  // Dégradé de la piste (partie gauche colorée, partie droite grise)
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent").trim();
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-muted").trim();

  elLengthSlider.style.background =
    `linear-gradient(to right, ${accent} ${pct}%, ${bg} ${pct}%)`;
}


/* ════════════════════════════════════════════════════════════
   7. ACTION PRINCIPALE : GÉNÉRER
   ════════════════════════════════════════════════════════════ */

/**
 * doGenerate()
 * ────────────
 * Orchestre toute la génération :
 * génère → évalue → affiche → ajoute à l'historique.
 */
function doGenerate() {
  const password  = generatePassword();
  const strength  = evaluateStrength(password);

  // Sauvegarde dans l'état
  state.password = password;

  // Mise à jour de l'UI
  renderPassword(password);
  renderStrength(strength);

  // Animation du bouton régénérer
  elBtnRegen.classList.remove("spinning");
  void elBtnRegen.offsetWidth;
  elBtnRegen.classList.add("spinning");

  // Ajout à l'historique
  addToHistory(password, strength);
}


/* ════════════════════════════════════════════════════════════
   8. HISTORIQUE
   ════════════════════════════════════════════════════════════ */

/**
 * addToHistory(password, strength)
 * ─────────────────────────────────
 * Ajoute une entrée en tête du tableau history
 * et re-rend la liste HTML.
 */
function addToHistory(password, strength) {
  const entry = {
    id:          Date.now(),          // Identifiant unique basé sur le timestamp
    password,
    strength,
    length:      password.length,
    time:        new Date().toLocaleTimeString("fr-FR", {
                   hour: "2-digit", minute: "2-digit", second: "2-digit"
                 }),
  };

  // Ajout en tête (plus récent en premier)
  state.history.unshift(entry);

  // Limite à 15 entrées
  if (state.history.length > 15) state.history.pop();

  renderHistory();
}


/**
 * renderHistory()
 * ───────────────
 * Reconstruit entièrement la liste HTML depuis state.history.
 * Approche simple et fiable : on vide puis on recrée.
 */
function renderHistory() {
  const isEmpty = state.history.length === 0;

  // Affiche / cache les boutons et le compteur
  elBtnClear.hidden = isEmpty;
  elHistoryCount.hidden = isEmpty;
  if (!isEmpty) elHistoryCount.textContent = state.history.length;

  // Vide la liste HTML
  elHistoryList.innerHTML = "";

  if (isEmpty) {
    // Message vide
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "Aucun mot de passe généré pour l'instant.";
    elHistoryList.appendChild(li);
    return;
  }

  // Construction des éléments
  state.history.forEach(entry => {
    const li = document.createElement("li");
    li.className = "history-item";

    // ── Pastille de force ──
    const dot = document.createElement("span");
    dot.className = "h-dot";
    dot.style.backgroundColor = entry.strength.color;
    dot.title = entry.strength.label.replace(/[^\w\s]/g, "").trim(); // Sans emoji
    li.appendChild(dot);

    // ── Mot de passe masqué (affiche début...fin) ──
    const pwd = document.createElement("span");
    pwd.className = "h-password";
    pwd.textContent = maskPassword(entry.password);
    pwd.title = entry.password; // Le vrai mdp apparaît au survol (title)
    li.appendChild(pwd);

    // ── Méta (longueur + heure) ──
    const meta = document.createElement("span");
    meta.className = "h-meta";
    meta.textContent = `${entry.length} car. · ${entry.time}`;
    li.appendChild(meta);

    // ── Bouton copie ──
    const copyBtn = document.createElement("button");
    copyBtn.className = "h-copy";
    copyBtn.setAttribute("aria-label", `Copier le mot de passe de ${entry.time}`);
    copyBtn.title = "Copier";
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(entry.password).then(() => {
        copyBtn.textContent = "✓";
        copyBtn.classList.add("ok");
        setTimeout(() => {
          copyBtn.classList.remove("ok");
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
      }).catch(() => {});
    });

    li.appendChild(copyBtn);
    elHistoryList.appendChild(li);
  });
}


/**
 * maskPassword(pwd)
 * ─────────────────
 * Affiche les 3 premiers + les 3 derniers caractères,
 * le milieu est remplacé par des points.
 * Exemple : "xR7mK2qPzAbN" → "xR7•••••AbN"
 */
function maskPassword(pwd) {
  if (pwd.length <= 8) return "•".repeat(pwd.length);
  return pwd.slice(0, 3) + "•".repeat(pwd.length - 6) + pwd.slice(-3);
}


/* ════════════════════════════════════════════════════════════
   9. COPIE DANS LE PRESSE-PAPIERS
   ════════════════════════════════════════════════════════════ */

/**
 * doCopy()
 * ────────
 * Copie state.password dans le presse-papiers
 * et affiche le feedback "Copié !" pendant 2 secondes.
 *
 * navigator.clipboard.writeText() est une API asynchrone
 * (Promise) — on utilise .then() pour l'action post-copie.
 *
 * ⚠️ Nécessite HTTPS ou localhost pour fonctionner
 *    (restriction de sécurité du navigateur).
 */
function doCopy() {
  if (!state.password) return;

  navigator.clipboard.writeText(state.password)
    .then(() => {
      // Affiche "Copié !"
      elCopyFeedback.classList.add("show");

      // Annule le timer précédent si on clique plusieurs fois
      if (state.copyTimer) clearTimeout(state.copyTimer);

      // Cache "Copié !" après 2 secondes
      state.copyTimer = setTimeout(() => {
        elCopyFeedback.classList.remove("show");
      }, 2000);
    })
    .catch(() => {
      // En cas d'échec, on affiche une alerte simple
      alert("Impossible de copier automatiquement.\nSélectionnez le mot de passe et copiez manuellement.");
    });
}


/* ════════════════════════════════════════════════════════════
   10. AFFICHER / MASQUER LE MOT DE PASSE
   ════════════════════════════════════════════════════════════ */

function doToggleVisibility() {
  state.visible = !state.visible;

  if (!state.password) return;

  // Met à jour l'affichage
  elOutput.textContent = state.visible
    ? state.password
    : "•".repeat(state.password.length);

  // Permute les icônes œil
  elIconEyeOpen.style.display = state.visible ? "block" : "none";
  elIconEyeOff.style.display  = state.visible ? "none"  : "block";
}


/* ════════════════════════════════════════════════════════════
   11. THÈME CLAIR / SOMBRE
   ════════════════════════════════════════════════════════════ */

/**
 * On lit la préférence sauvegardée dans localStorage,
 * ou la préférence système si c'est la première visite.
 */
function initTheme() {
  const saved   = localStorage.getItem("passgen-theme");
  const system  = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme   = saved || system;

  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next    = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("passgen-theme", next);
  renderSlider(); // Recalcule la couleur du slider avec les nouvelles variables
}


/* ════════════════════════════════════════════════════════════
   12. TOOLTIPS
   ════════════════════════════════════════════════════════════
   Les boutons "?" affichent une bulle d'aide flottante.
   La bulle suit le bouton cliqué. */

let activeTooltipBtn = null;

function showTooltip(btn) {
  const text = btn.dataset.tip;
  if (!text) return;

  // Si on reclique sur le même bouton → fermer
  if (activeTooltipBtn === btn) {
    hideTooltip();
    return;
  }

  activeTooltipBtn = btn;
  elTooltip.textContent = text;
  elTooltip.removeAttribute("aria-hidden");

  // Positionnement au-dessus du bouton
  const rect = btn.getBoundingClientRect();
  elTooltip.style.left = `${rect.left + window.scrollX}px`;
  elTooltip.style.top  = `${rect.top  + window.scrollY - elTooltip.offsetHeight - 10}px`;

  elTooltip.classList.add("visible");

  // Ferme si on clique ailleurs
  setTimeout(() => {
    document.addEventListener("click", hideTooltip, { once: true });
  }, 50);
}

function hideTooltip() {
  elTooltip.classList.remove("visible");
  elTooltip.setAttribute("aria-hidden", "true");
  activeTooltipBtn = null;
}


/* ════════════════════════════════════════════════════════════
   13. GESTIONNAIRES D'ÉVÉNEMENTS
   ════════════════════════════════════════════════════════════
   addEventListener() connecte une fonction à un événement
   utilisateur (clic, changement de valeur, etc.). */

// Bouton principal "Générer"
elBtnGenerate.addEventListener("click", doGenerate);

// Bouton régénérer (icône flèche)
elBtnRegen.addEventListener("click", doGenerate);

// Bouton copier
elBtnCopy.addEventListener("click", doCopy);

// Bouton afficher / masquer
elBtnToggle.addEventListener("click", doToggleVisibility);

// Bouton thème
elBtnTheme.addEventListener("click", () => {
  toggleTheme();
});

// Bouton effacer l'historique
elBtnClear.addEventListener("click", () => {
  state.history = [];
  renderHistory();
});

// Slider de longueur
// "input" se déclenche en temps réel (contrairement à "change")
elLengthSlider.addEventListener("input", () => {
  renderSlider();
  // Régénère en temps réel si un mdp existe déjà
  if (state.password) doGenerate();
});

// Checkboxes : régénère à chaque changement d'option
["opt-uppercase", "opt-lowercase", "opt-numbers", "opt-symbols"].forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    if (state.password) doGenerate();
  });
});

// Boutons "?" des tooltips
// Délégation d'événements : on écoute sur le document
// et on filtre selon la classe .tip-btn
document.addEventListener("click", e => {
  const btn = e.target.closest(".tip-btn");
  if (btn) {
    e.preventDefault(); // Empêche la case de se cocher/décocher
    e.stopPropagation(); // Empêche la fermeture immédiate du tooltip
    showTooltip(btn);
  }
});

// Raccourci clavier : Entrée → Générer, Espace → Copier
document.addEventListener("keydown", e => {
  // On n'agit pas si le focus est sur un input ou bouton spécifique
  if (e.target.tagName === "INPUT") return;

  if (e.key === "Enter") doGenerate();
  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    doCopy();
  }
  if (e.key === "c" && e.ctrlKey) doCopy(); // Ctrl+C habituel
});


/* ════════════════════════════════════════════════════════════
   14. INITIALISATION AU CHARGEMENT
   ════════════════════════════════════════════════════════════
   DOMContentLoaded s'exécute quand le HTML est entièrement
   parsé (avant que les images soient chargées). */

document.addEventListener("DOMContentLoaded", () => {
  // Applique le thème sauvegardé
  initTheme();

  // Initialise l'affichage du slider
  renderSlider();

  // État initial de la zone mot de passe
  elOutput.classList.add("placeholder-state");

  // Génère un premier mot de passe automatiquement
  doGenerate();
});
