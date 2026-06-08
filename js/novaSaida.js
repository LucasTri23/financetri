// Tela "Nova saída": cadastro manual de gastos, com suporte a parcelamento,
// recorrência, meio de pagamento, categoria e quem paga (você ou outra
// pessoa do plano compartilhado).
import { exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';
import { CATEGORIAS } from './categorias.js';
import { buscarPlanoDoUsuario, preencherSelecaoDeIntegrante, emailDoIntegrante } from './plano.js';
import { salvarSaidaManual, salvarDividaManual } from './firestore.js';

const usuario = await exigirLogin();
if (usuario) {
  await iniciarFormulario(usuario);
}

async function iniciarFormulario(usuario) {
  montarBarraLateral('nova-saida', usuario);

  const formulario = document.getElementById('formSaida');
  const campoDescricao = document.getElementById('descricao');
  const campoValor = document.getElementById('valor');
  const campoData = document.getElementById('data');
  const campoCategoria = document.getElementById('categoria');
  const campoMetodo = document.getElementById('metodo');
  const campoTipoLancamento = document.getElementById('tipoLancamento');
  const blocoParcelas = document.getElementById('blocoParcelas');
  const campoTotalParcelas = document.getElementById('totalParcelas');
  const blocoRecorrencia = document.getElementById('blocoRecorrencia');
  const campoFrequencia = document.getElementById('frequencia');
  const campoPagador = document.getElementById('pagador');
  const botaoSalvar = document.getElementById('botaoSalvar');
  const statusSaida = document.getElementById('statusSaida');

  for (const { chave, rotulo } of CATEGORIAS) {
    const opcao = document.createElement('option');
    opcao.value = chave;
    opcao.textContent = rotulo;
    campoCategoria.appendChild(opcao);
  }

  campoData.value = new Date().toISOString().slice(0, 10);

  campoTipoLancamento.addEventListener('change', () => {
    blocoParcelas.hidden = campoTipoLancamento.value !== 'parcelado';
    blocoRecorrencia.hidden = campoTipoLancamento.value !== 'recorrente';
  });

  let plano = null;
  try {
    plano = await buscarPlanoDoUsuario(usuario);
  } catch (erro) {
    console.error('Não foi possível carregar o plano compartilhado.', erro);
  }
  preencherSelecaoDeIntegrante(campoPagador, usuario, plano);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    statusSaida.className = 'status-formulario';
    statusSaida.textContent = 'Salvando…';
    botaoSalvar.disabled = true;

    try {
      const pagadorUid = campoPagador.value;
      const dadosComuns = {
        descricao: campoDescricao.value.trim(),
        categoria: campoCategoria.value,
        valor: Number.parseFloat(campoValor.value),
        data: campoData.value,
        metodo: campoMetodo.value,
        pagadorUid,
        pagadorEmail: emailDoIntegrante(pagadorUid, usuario, plano),
      };

      if (campoTipoLancamento.value === 'parcelado') {
        await salvarDividaManual(usuario.uid, {
          ...dadosComuns,
          totalParcelas: Number.parseInt(campoTotalParcelas.value, 10),
        });
      } else {
        await salvarSaidaManual(usuario.uid, {
          ...dadosComuns,
          recorrente: campoTipoLancamento.value === 'recorrente',
          frequencia: campoTipoLancamento.value === 'recorrente' ? campoFrequencia.value : null,
        });
      }

      statusSaida.classList.add('sucesso');
      statusSaida.textContent = 'Saída salva com sucesso!';
      formulario.reset();
      campoData.value = new Date().toISOString().slice(0, 10);
      blocoParcelas.hidden = true;
      blocoRecorrencia.hidden = true;
    } catch (erro) {
      console.error(erro);
      statusSaida.classList.add('erro');
      statusSaida.textContent = `Não foi possível salvar: ${erro.message}`;
    } finally {
      botaoSalvar.disabled = false;
    }
  });
}
