// Monta a barra lateral comum às páginas internas (painel, importar, etc.).
// Recebe a chave da página ativa (para destacar o link) e o usuário logado.
import { signOut, auth } from './firebase.js';

const SECOES = [
  {
    rotulo: null,
    links: [{ chave: 'painel', rotulo: '🏠 Painel', href: 'dashboard.html' }],
  },
  {
    rotulo: 'Lançamentos',
    links: [
      { chave: 'importar', rotulo: '📄 Importar fatura', href: 'importar.html' },
      { chave: 'nova-saida', rotulo: '↘ Nova saída', href: 'nova-saida.html' },
      { chave: 'nova-entrada', rotulo: '↗ Nova entrada', href: 'nova-entrada.html' },
    ],
  },
  {
    rotulo: 'Plano',
    links: [{ chave: 'plano', rotulo: '👥 Plano compartilhado', href: 'plano.html' }],
  },
];

export function montarBarraLateral(paginaAtiva, usuario) {
  const barra = document.getElementById('barraLateral');
  if (!barra) return;

  const navHtml = SECOES.map((secao) => {
    const linksHtml = secao.links
      .map(
        (link) => `<a href="${link.href}" class="${link.chave === paginaAtiva ? 'ativo' : ''}">${link.rotulo}</a>`,
      )
      .join('');
    const tituloHtml = secao.rotulo ? `<div class="secao">${secao.rotulo}</div>` : '';
    return `${tituloHtml}${linksHtml}`;
  }).join('');

  barra.innerHTML = `
    <div class="logo">
      <span class="marca">CF</span>
      <span>Controle Financeiro</span>
    </div>
    <nav>${navHtml}</nav>
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
