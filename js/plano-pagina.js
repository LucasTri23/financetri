// Tela "Plano compartilhado": permite criar um plano, convidar alguém por
// código, e ver os integrantes do plano atual.
import { exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';
import { buscarPlanoDoUsuario, criarPlano, entrarComCodigo } from './plano.js';

const usuario = await exigirLogin();
if (usuario) {
  await iniciarPagina(usuario);
}

async function iniciarPagina(usuario) {
  montarBarraLateral('plano', usuario);

  const estadoPlano = document.getElementById('estadoPlano');
  const blocoSemPlano = document.getElementById('blocoSemPlano');
  const blocoComPlano = document.getElementById('blocoComPlano');

  const campoNomePlano = document.getElementById('nomePlano');
  const botaoCriarPlano = document.getElementById('botaoCriarPlano');
  const statusCriarPlano = document.getElementById('statusCriarPlano');

  const campoCodigoConvite = document.getElementById('codigoConvite');
  const botaoEntrarComCodigo = document.getElementById('botaoEntrarComCodigo');
  const statusEntrarPlano = document.getElementById('statusEntrarPlano');

  const nomeDoPlano = document.getElementById('nomeDoPlano');
  const codigoConviteAtual = document.getElementById('codigoConviteAtual');
  const listaMembros = document.getElementById('listaMembros');

  async function carregarPlano() {
    estadoPlano.textContent = 'Carregando…';
    estadoPlano.hidden = false;
    blocoSemPlano.hidden = true;
    blocoComPlano.hidden = true;

    let plano = null;
    try {
      plano = await buscarPlanoDoUsuario(usuario);
    } catch (erro) {
      console.error(erro);
      estadoPlano.textContent = 'Não foi possível carregar o plano compartilhado. Tente novamente em instantes.';
      return;
    }
    estadoPlano.hidden = true;

    if (!plano) {
      blocoSemPlano.hidden = false;
      return;
    }

    blocoComPlano.hidden = false;
    nomeDoPlano.textContent = plano.nome || 'Seu plano';
    codigoConviteAtual.textContent = plano.codigoConvite;
    renderizarMembros(plano);
  }

  function renderizarMembros(plano) {
    const membros = plano.membros || [];
    const membrosInfo = plano.membrosInfo || {};

    listaMembros.innerHTML = membros
      .map((uidMembro) => {
        const email = membrosInfo[uidMembro]?.email || 'Integrante do plano';
        const ehVoce = uidMembro === usuario.uid;
        const inicial = email.charAt(0).toUpperCase();
        return `
          <div class="membro">
            <span class="avatar">${inicial}</span>
            <span class="info">
              <strong>${email}</strong>
              ${uidMembro === plano.donoId ? '<span class="descricao">Criou o plano</span>' : ''}
            </span>
            ${ehVoce ? '<span class="voce">Você</span>' : ''}
          </div>
        `;
      })
      .join('');
  }

  botaoCriarPlano.addEventListener('click', async () => {
    statusCriarPlano.className = 'status-formulario';
    statusCriarPlano.textContent = 'Criando plano…';
    botaoCriarPlano.disabled = true;
    try {
      await criarPlano(usuario, campoNomePlano.value.trim());
      statusCriarPlano.classList.add('sucesso');
      statusCriarPlano.textContent = 'Plano criado com sucesso!';
      await carregarPlano();
    } catch (erro) {
      console.error(erro);
      statusCriarPlano.classList.add('erro');
      statusCriarPlano.textContent = `Não foi possível criar o plano: ${erro.message}`;
    } finally {
      botaoCriarPlano.disabled = false;
    }
  });

  botaoEntrarComCodigo.addEventListener('click', async () => {
    const codigo = campoCodigoConvite.value.trim();
    if (!codigo) {
      statusEntrarPlano.className = 'status-formulario erro';
      statusEntrarPlano.textContent = 'Informe um código de convite.';
      return;
    }

    statusEntrarPlano.className = 'status-formulario';
    statusEntrarPlano.textContent = 'Entrando no plano…';
    botaoEntrarComCodigo.disabled = true;
    try {
      const resultado = await entrarComCodigo(usuario, codigo);
      statusEntrarPlano.classList.add('sucesso');
      statusEntrarPlano.textContent = resultado.jaEraMembro
        ? 'Você já fazia parte deste plano!'
        : 'Você entrou no plano com sucesso!';
      await carregarPlano();
    } catch (erro) {
      console.error(erro);
      statusEntrarPlano.classList.add('erro');
      statusEntrarPlano.textContent = erro.message;
    } finally {
      botaoEntrarComCodigo.disabled = false;
    }
  });

  await carregarPlano();
}
