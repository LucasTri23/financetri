// Tela "Nova entrada": cadastro manual de receitas (salário ou outros tipos),
// com indicação de recorrência e de quem vai receber (você ou outra pessoa
// do plano compartilhado).
import { exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';
import { buscarPlanoDoUsuario, preencherSelecaoDeIntegrante, emailDoIntegrante } from './plano.js';
import { salvarEntradaManual } from './firestore.js';

const usuario = await exigirLogin();
if (usuario) {
  await iniciarFormulario(usuario);
}

async function iniciarFormulario(usuario) {
  montarBarraLateral('nova-entrada', usuario);

  const formulario = document.getElementById('formEntrada');
  const campoDescricao = document.getElementById('descricao');
  const campoValor = document.getElementById('valor');
  const campoData = document.getElementById('data');
  const campoTipo = document.getElementById('tipo');
  const campoTipoLancamento = document.getElementById('tipoLancamento');
  const blocoRecorrencia = document.getElementById('blocoRecorrencia');
  const campoFrequencia = document.getElementById('frequencia');
  const campoRecebedor = document.getElementById('recebedor');
  const botaoSalvar = document.getElementById('botaoSalvar');
  const statusEntrada = document.getElementById('statusEntrada');

  campoData.value = new Date().toISOString().slice(0, 10);

  campoTipoLancamento.addEventListener('change', () => {
    blocoRecorrencia.hidden = campoTipoLancamento.value !== 'recorrente';
  });

  let plano = null;
  try {
    plano = await buscarPlanoDoUsuario(usuario);
  } catch (erro) {
    console.error('Não foi possível carregar o plano compartilhado.', erro);
  }
  preencherSelecaoDeIntegrante(campoRecebedor, usuario, plano);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    statusEntrada.className = 'status-formulario';
    statusEntrada.textContent = 'Salvando…';
    botaoSalvar.disabled = true;

    try {
      const recebedorUid = campoRecebedor.value;
      await salvarEntradaManual(usuario.uid, {
        descricao: campoDescricao.value.trim(),
        tipo: campoTipo.value,
        valor: Number.parseFloat(campoValor.value),
        data: campoData.value,
        recorrente: campoTipoLancamento.value === 'recorrente',
        frequencia: campoTipoLancamento.value === 'recorrente' ? campoFrequencia.value : null,
        recebedorUid,
        recebedorEmail: emailDoIntegrante(recebedorUid, usuario, plano),
      });

      statusEntrada.classList.add('sucesso');
      statusEntrada.textContent = 'Entrada salva com sucesso!';
      formulario.reset();
      campoData.value = new Date().toISOString().slice(0, 10);
      blocoRecorrencia.hidden = true;
    } catch (erro) {
      console.error(erro);
      statusEntrada.classList.add('erro');
      statusEntrada.textContent = `Não foi possível salvar: ${erro.message}`;
    } finally {
      botaoSalvar.disabled = false;
    }
  });
}
