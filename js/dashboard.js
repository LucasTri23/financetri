import { exigirLogin, signOut, auth } from './firebase.js';

const usuario = await exigirLogin();
if (usuario) {
  document.getElementById('nomeUsuario').textContent = usuario.email;
}

document.getElementById('linkSair').addEventListener('click', async (evento) => {
  evento.preventDefault();
  await signOut(auth);
  window.location.href = 'index.html';
});
