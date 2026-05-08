// ============================================================
// GÉNÉRATEUR DE MOTS DE PASSE — script.js — BTS SIO SLAM
// ============================================================

// --- Éléments HTML ---
const passwordOutput      = document.getElementById('password-output');
const btnToggleVisibility = document.getElementById('btn-toggle-visibility');
const iconEyeShow         = document.getElementById('icon-eye-show');
const iconEyeHide         = document.getElementById('icon-eye-hide');
const btnCopy             = document.getElementById('btn-copy');
const strengthBar         = document.getElementById('strength-bar');
const strengthText        = document.getElementById('strength-text');
const lengthSlider        = document.getElementById('length-slider');
const lengthValue         = document.getElementById('length-value');
const useUppercase        = document.getElementById('use-uppercase');
const useLowercase        = document.getElementById('use-lowercase');
const useNumbers          = document.getElementById('use-numbers');
const useSymbols          = document.getElementById('use-symbols');
const btnGenerate         = document.getElementById('btn-generate');
const historyList         = document.getElementById('history-list');
const historyCount        = document.getElementById('history-count');
const btnClearHistory     = document.getElementById('btn-clear-history');
const toast               = document.getElementById('toast');

// --- Jeux de caractères ---
const CHARS_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARS_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const CHARS_NUMBERS   = '0123456789';
const CHARS_SYMBOLS   = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// --- État ---
let passwordHistory   = [];
let isPasswordVisible = false;
let toastTimer        = null;


// --- Génération du mot de passe ---

function generatePassword() {
    const length = parseInt(lengthSlider.value);
    let charset = '', required = [];

    // Pour chaque type coché : on enrichit le charset et on réserve 1 caractère obligatoire
    if (useUppercase.checked) { charset += CHARS_UPPERCASE; required.push(pickRandomChar(CHARS_UPPERCASE)); }
    if (useLowercase.checked) { charset += CHARS_LOWERCASE; required.push(pickRandomChar(CHARS_LOWERCASE)); }
    if (useNumbers.checked)   { charset += CHARS_NUMBERS;   required.push(pickRandomChar(CHARS_NUMBERS));   }
    if (useSymbols.checked)   { charset += CHARS_SYMBOLS;   required.push(pickRandomChar(CHARS_SYMBOLS));   }

    if (charset === '') {
        useLowercase.checked = true;
        charset = CHARS_LOWERCASE;
        required.push(pickRandomChar(CHARS_LOWERCASE));
        showToast('Sélectionnez au moins un type de caractère.');
    }

    let chars = [...required];
    for (let i = required.length; i < Math.max(length, required.length); i++) {
        chars.push(pickRandomChar(charset));
    }

    return shuffleArray(chars).join('');
}

// window.crypto.getRandomValues() = aléatoire cryptographique (≠ Math.random)
function pickRandomChar(chars) {
    const rand = new Uint32Array(1);
    window.crypto.getRandomValues(rand);
    return chars[rand[0] % chars.length];
}

// Algorithme Fisher-Yates : mélange aléatoire du tableau
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const rand = new Uint32Array(1);
        window.crypto.getRandomValues(rand);
        const j = rand[0] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// --- Analyse de la force ---

function analyzeStrength(password) {
    let score = 0;
    if (password.length >= 8)          score++;
    if (password.length >= 16)         score++;
    if (/[A-Z]/.test(password))        score++; // RegEx : contient une majuscule ?
    if (/[a-z]/.test(password))        score++; // RegEx : contient une minuscule ?
    if (/[0-9]/.test(password))        score++; // RegEx : contient un chiffre ?
    if (/[^A-Za-z0-9]/.test(password)) score++; // RegEx : contient un symbole ?

    const levels = [
        { max:2, label:'Faible',    cls:'weak',        color:'#ef4444' },
        { max:3, label:'Moyen',     cls:'medium',      color:'#f59e0b' },
        { max:5, label:'Fort',      cls:'strong',      color:'#22c55e' },
        { max:6, label:'Très fort', cls:'very-strong', color:'#4f46e5' },
    ];

    const lvl = levels.find(l => score <= l.max);
    strengthText.textContent = lvl.label;
    strengthText.style.color = lvl.color;
    strengthBar.className    = 'strength-fill ' + lvl.cls;
}


// --- Afficher / Masquer ---

function togglePasswordVisibility() {
    isPasswordVisible = !isPasswordVisible;
    passwordOutput.type       = isPasswordVisible ? 'text'  : 'password';
    iconEyeShow.style.display = isPasswordVisible ? 'none'  : 'block';
    iconEyeHide.style.display = isPasswordVisible ? 'block' : 'none';
}


// --- Copier (async/await + try/catch) ---

async function copyToClipboard(text = null) {
    const toCopy = text || passwordOutput.value;
    if (!toCopy) return showToast('Aucun mot de passe à copier.');
    try {
        await navigator.clipboard.writeText(toCopy);
        showToast('Mot de passe copié !');
    } catch {
        showToast('Erreur : impossible de copier.');
    }
}


// --- Historique ---

function addToHistory(password) {
    passwordHistory.unshift(password);
    if (passwordHistory.length > 10) passwordHistory.pop();
    renderHistory();
}

function deleteFromHistory(index) {
    passwordHistory.splice(index, 1);
    renderHistory();
}

function clearHistory() {
    passwordHistory = [];
    renderHistory();
    showToast('Historique effacé.');
}

function renderHistory() {
    historyCount.textContent = passwordHistory.length + ' / 10';
    btnClearHistory.disabled = passwordHistory.length === 0;

    if (passwordHistory.length === 0) {
        historyList.innerHTML = '<p class="history-empty">Aucun mot de passe généré.</p>';
        return;
    }

    historyList.innerHTML = '';

    passwordHistory.forEach((pwd, i) => {
        const item    = document.createElement('div');
        item.className = 'history-item';

        const pwdText = document.createElement('span');
        pwdText.className = 'history-password';
        pwdText.textContent = pwd;
        pwdText.title = pwd;

        const actions   = document.createElement('div');
        actions.className = 'history-actions';

        const copyBtn   = document.createElement('button');
        copyBtn.className   = 'history-btn-copy';
        copyBtn.textContent = 'Copier';
        copyBtn.addEventListener('click', () => copyToClipboard(pwd));

        const deleteBtn = document.createElement('button');
        deleteBtn.className   = 'history-btn-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => deleteFromHistory(i));

        actions.append(copyBtn, deleteBtn);
        item.append(pwdText, actions);
        historyList.appendChild(item);
    });
}


// --- Toast ---

function showToast(message, duration = 2500) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}


// --- Rafraîchir l'interface ---

function refreshPassword() {
    const password = generatePassword();

    passwordOutput.style.opacity = '0';
    setTimeout(() => { passwordOutput.value = password; passwordOutput.style.opacity = '1'; }, 120);

    analyzeStrength(password);
    addToHistory(password);

    btnGenerate.classList.add('animating');
    setTimeout(() => btnGenerate.classList.remove('animating'), 250);
}


// --- Événements ---

btnGenerate.addEventListener('click', refreshPassword);
btnCopy.addEventListener('click', () => copyToClipboard());
btnToggleVisibility.addEventListener('click', togglePasswordVisibility);
btnClearHistory.addEventListener('click', clearHistory);

lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
    refreshPassword();
});

useUppercase.addEventListener('change', refreshPassword);
useLowercase.addEventListener('change', refreshPassword);
useNumbers.addEventListener('change',   refreshPassword);
useSymbols.addEventListener('change',   refreshPassword);


// --- Démarrage ---

function init() {
    lengthValue.textContent = lengthSlider.value;
    refreshPassword();
    renderHistory();
}

init();
