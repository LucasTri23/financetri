// Tela "Saídas": mostra os gastos do mês atual (saídas avulsas, recorrentes
// e parcelas de compras parceladas) e permite cadastrar novos manualmente,
// com suporte a parcelamento, recorrência, meio de pagamento, categoria e
// quem paga (você ou outra pessoa do plano compartilhado).
import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';
import { CATEGORIAS } from './categorias.js';
import { buscarPlanoDoUsuario, preencherSelecaoDeIntegrante, emailDoIntegrante } from './plano.js';
import { salvarSaidaManual, salvarDividaManual } from './firestore.js';

const usuario = await exigirLogin();
if (usuario) {
  await iniciarFormulario(usuario);
}

const ROTULO_POR_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.chave, c.rotulo]));

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataTexto) {
  if (!dataTexto) return '—';
  const [ano, mes, dia] = dataTexto.split('-');
  return `${dia}/${mes}/${ano}`;
}

function dentroDoMesAtual(dataTexto) {
  if (!dataTexto) return false;
  const agora = new Date();
  const [ano, mes] = dataTexto.split('-').map(Number);
  return ano === agora.getFullYear() && mes === agora.getMonth() + 1;
}

async function listarDocumentos(uid, nomeColecao) {
  const instantaneo = await getDocs(collection(db, 'usuarios', uid, nomeColecao));
  return instantaneo.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function iniciarFormulario(usuario) {
  montarBarraLateral('saidas', usuario);

  const estadoSaidas = document.getElementById('estadoSaidas');
  const tabelaSaidas = document.getElementById('tabelaSaidas');
  const corpoTabelaSaidas = document.getElementById('corpoTabelaSaidas');

  async function carregarGastosDoMes() {
    estadoSaidas.hidden = false;
    estadoSaidas.classList.remove('erro');
    estadoSaidas.textContent = 'Carregando…';
    tabelaSaidas.hidden = true;

    try {
      const [saidas, dividas] = await Promise.all([
        listarDocumentos(usuario.uid, 'saidas'),
        listarDocumentos(usuario.uid, 'dividas'),
      ]);

      const itens = [
        ...saidas
          .filter((s) => dentroDoMesAtual(s.data))
          .map((s) => ({
            data: s.data,
            descricao: s.descricao,
            categoria: s.categoria,
            parcela: '—',
            pagoPor: s.pagadorEmail,
            valor: s.valor,
          })),
        ...dividas
          .filter((d) => dentroDoMesAtual(d.proximoVencimento))
          .map((d) => ({
            data: d.proximoVencimento,
            descricao: d.descricao,
            categoria: d.categoria,
            parcela: `${Math.min(d.parcelaAtual + 1, d.totalParcelas)}/${d.totalParcelas}`,
            pagoPor: d.pagadorEmail,
            valor: d.valorParcela,
          })),
      ].sort((a, b) => (a.data || '').localeCompare(b.data || ''));

      if (itens.length === 0) {
        estadoSaidas.textContent = 'Nenhuma saída cadastrada neste mês ainda.';
        return;
      }

      estadoSaidas.hidden = true;
      tabelaSaidas.hidden = false;
      corpoTabelaSaidas.innerHTML = itens
        .map(
          (item) => `
            <tr>
              <td>${formatarData(item.data)}</td>
              <td>${item.descricao}</td>
              <td>${ROTULO_POR_CATEGORIA[item.categoria] || ROTULO_POR_CATEGORIA.outros}</td>
              <td>${item.parcela}</td>
              <td>${item.pagoPor || '—'}</td>
              <td>${formatarMoeda(item.valor)}</td>
            </tr>`,
        )
        .join('');
    } catch (erro) {
      console.error(erro);
      estadoSaidas.classList.add('erro');
      estadoSaidas.textContent = `Não foi possível carregar os gastos: ${erro.message}`;
    }
  }

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

  await carregarGastosDoMes();

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
      await carregarGastosDoMes();
    } catch (erro) {
      console.error(erro);
      statusSaida.classList.add('erro');
      statusSaida.textContent = `Não foi possível salvar: ${erro.message}`;
    } finally {
      botaoSalvar.disabled = false;
    }
  });
}
