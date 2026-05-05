# 🔑 PassGen — Générateur de Mots de Passe Sécurisé

Application web **100% front-end** — fonctionne directement sur GitHub Pages.

## 🚀 Lancer le projet

**Option 1 — En local :**
Double-cliquez sur `index.html` → s'ouvre dans le navigateur.

**Option 2 — GitHub Pages :**
1. Pushez les 3 fichiers sur un dépôt GitHub
2. Settings → Pages → Source : `main` / `root`
3. Votre URL : `https://[username].github.io/[repo]/`

## 📁 Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML de l'application |
| `style.css` | Design, thème, animations |
| `script.js` | Logique complète (génération, historique, copie…) |

## ✨ Fonctionnalités

- Génération avec `window.crypto.getRandomValues()` (cryptographiquement sûr)
- Slider de longueur (4 à 64 caractères)
- Options : majuscules, minuscules, chiffres, symboles
- Indicateur de force sur 4 niveaux (Faible → Très fort)
- Bouton Copier avec feedback « Copié ! »
- Afficher / Masquer le mot de passe
- Historique des 15 derniers mots de passe
- Mode sombre / clair (mémorisé)
- Tooltips d'aide sur chaque option
- Raccourcis clavier : `Entrée` = Générer, `Espace` = Copier
- Responsive mobile + desktop

## 🔐 Sécurité

La génération utilise `window.crypto.getRandomValues()` — l'équivalent navigateur de `crypto.randomInt()` de Node.js. Bien plus sûr que `Math.random()`.

---

*Projet BTS SIO SLAM — Giovanni BINTOUL — Lycée Melkior-Garré*
