// Autenticação do PROFESSOR-ENADE — Firebase Auth (e-mail/senha), restrito
// a e-mails @unichristus.edu.br verificados. Ver
// docs/superpowers/specs/2026-09-03-professor-enade-auth-design.md
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut as firebaseSignOut,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { isAllowedDomain, mapAuthError } from './professor-enade-auth-helpers.js';

const firebaseConfig = {
    apiKey: 'AIzaSyD3DR_mG7sqJuo67YswRGx5vnGNiw2QcCM',
    authDomain: 'professor-enade-vicduarte.firebaseapp.com',
    projectId: 'professor-enade-vicduarte',
    storageBucket: 'professor-enade-vicduarte.firebasestorage.app',
    messagingSenderId: '904014980410',
    appId: '1:904014980410:web:6d7c109dc315e2084b5c03',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const gate = document.getElementById('enade-auth-gate');
const loadingView = document.getElementById('enade-auth-loading');
const formWrap = document.getElementById('enade-auth-form-wrap');
const verifyView = document.getElementById('enade-auth-verify');
const authForm = document.getElementById('enade-auth-form');
const authEmail = document.getElementById('enade-auth-email');
const authPassword = document.getElementById('enade-auth-password');
const authAlert = document.getElementById('enade-auth-alert');
const authSubmit = document.getElementById('enade-auth-submit');
const authToggle = document.getElementById('enade-auth-toggle');
const authTitle = document.getElementById('enade-auth-title');
const verifyEmailLabel = document.getElementById('enade-auth-verify-email');
const verifyAlert = document.getElementById('enade-auth-verify-alert');
const verifyCheckButton = document.getElementById('enade-auth-verify-check');
const verifyResendButton = document.getElementById('enade-auth-verify-resend');
const verifySignoutButton = document.getElementById('enade-auth-verify-signout');
const userBar = document.getElementById('enade-user-bar');
const userEmailLabel = document.getElementById('enade-user-email');
const userSignoutButton = document.getElementById('enade-user-signout');
const workspaceContent = document.getElementById('enade-workspace-content');

let mode = 'login'; // 'login' | 'cadastro'

function showBoxAlert(box, message) {
    box.textContent = message;
    box.hidden = false;
}

function hideBoxAlert(box) {
    box.hidden = true;
    box.textContent = '';
}

function setView(view) {
    loadingView.hidden = view !== 'loading';
    formWrap.hidden = view !== 'form';
    verifyView.hidden = view !== 'verify';
    gate.hidden = view === 'ready';
    userBar.hidden = view !== 'ready';
    workspaceContent.hidden = view !== 'ready';
}

function updateUserBar(user) {
    userEmailLabel.textContent = user.email;
}

setView('loading');

authToggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'cadastro' : 'login';
    authTitle.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    authSubmit.querySelector('span').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    authToggle.textContent = mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar';
    hideBoxAlert(authAlert);
});

authForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideBoxAlert(authAlert);
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!isAllowedDomain(email)) {
        showBoxAlert(authAlert, 'Use um e-mail institucional @unichristus.edu.br.');
        return;
    }

    authSubmit.disabled = true;
    try {
        if (mode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(credential.user);
        }
    } catch (error) {
        showBoxAlert(authAlert, mapAuthError(error));
    } finally {
        authSubmit.disabled = false;
    }
});

verifyCheckButton.addEventListener('click', async () => {
    hideBoxAlert(verifyAlert);
    try {
        await auth.currentUser?.reload();
        if (!auth.currentUser?.emailVerified) {
            showBoxAlert(verifyAlert, 'Ainda não identificamos a confirmação. Tente novamente em instantes.');
            return;
        }
        updateUserBar(auth.currentUser);
        setView('ready');
    } catch {
        showBoxAlert(verifyAlert, 'Não foi possível checar agora. Tente de novo.');
    }
});

verifyResendButton.addEventListener('click', async () => {
    hideBoxAlert(verifyAlert);
    try {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
        showBoxAlert(verifyAlert, 'E-mail de confirmação reenviado. Se não aparecer em alguns minutos, confira a caixa de spam/lixo eletrônico.');
    } catch {
        showBoxAlert(verifyAlert, 'Não foi possível reenviar agora. Tente de novo.');
    }
});

verifySignoutButton.addEventListener('click', () => firebaseSignOut(auth));
userSignoutButton.addEventListener('click', () => firebaseSignOut(auth));

onAuthStateChanged(auth, user => {
    if (!user) {
        authEmail.value = '';
        authPassword.value = '';
        setView('form');
        return;
    }
    if (!user.emailVerified) {
        verifyEmailLabel.textContent = user.email;
        setView('verify');
        return;
    }
    updateUserBar(user);
    setView('ready');
});

window.ProfessorEnadeAuth = {
    getIdToken: async () => {
        const user = auth.currentUser;
        if (!user || !user.emailVerified) return null;
        return user.getIdToken();
    },
};
