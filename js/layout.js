// Monta a barra lateral comum às páginas internas (painel, importar, etc.).
// Recebe a chave da página ativa (para destacar o link) e o usuário logado.
import { signOut, auth } from './firebase.js';

const LINKS = [
  { chave: 'painel', rotulo: 'Painel', href: 'dashboard.html' },
  { chave: 'importar', rotulo: 'Importar fatura', href: 'importar.html' },
];

export function montarBarraLateral(paginaAtiva, usuario) {
  const barra = document.getElementById('barraLateral');
  if (!barra) return;

  const linksHtml = LINKS.map(
    (link) => `<a href="${link.href}" class="${link.chave === paginaAtiva ? 'ativo' : ''}">${link.rotulo}</a>`,
  ).join('');

  barra.innerHTML = `
    <div class="logo">
      <span class="marca">CF</span>
      <span>Controle Financeiro</span>
    </div>
    <nav>${linksHtml}</nav>
    <div class="rodape-lateral">
      <div class="usuario">${usuario ? usuario.email : ''}</div>
      <a href="#" id="linkSairBarra">Sair</a>
    </div>
  `;

  const linkSair = document.getElementById('linkSairBarra');
  linkSair.addEventListener('click', async (evento) => {
    evento.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
  });
}
