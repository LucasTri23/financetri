// Inicialização única do Firebase (App + Auth + Firestore), reaproveitada
// pelas demais páginas via import deste módulo.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
};

export const googleProvider = new GoogleAuthProvider();

// Realiza o login com a conta Google do usuário (popup do Firebase Auth).
export function entrarComGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Resolve assim que soubermos se há (ou não) um usuário autenticado.
// Útil para páginas que precisam aguardar o estado de auth antes de agir.
export function aguardarUsuario() {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, (usuario) => {
      cancelar();
      resolve(usuario);
    });
  });
}

// Redireciona para o login se não houver usuário autenticado.
// Use no topo de páginas protegidas (dashboard, importar, etc.).
export async function exigirLogin() {
  const usuario = await aguardarUsuario();
  if (!usuario) {
    window.location.href = 'index.html';
    return null;
  }
  return usuario;
}
