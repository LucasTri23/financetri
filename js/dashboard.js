import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';

const usuario = await exigirLogin();
if (usuario) {
  await iniciarPainel(usuario);
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataTexto) {
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

async function iniciarPainel(usuario) {
  montarBarraLateral('painel', usuario);

  const valorSaldo = document.getElementById('valorSaldo');
  const valorEntradas = document.getElementById('valorEntradas');
  const valorSaidas = document.getElementById('valorSaidas');
  const periodoAtual = document.getElementById('periodoAtual');
  const estadoTransacoes = document.getElementById('estadoTransacoes');
  const tabelaResumo = document.getElementById('tabelaResumo');
  const corpoTabelaResumo = document.getElementById('corpoTabelaResumo');

  try {
    const periodo = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    periodoAtual.textContent = periodo;

    const [dividas, saidas, entradas] = await Promise.all([
      listarDocumentos(usuario.uid, 'dividas'),
      listarDocumentos(usuario.uid, 'saidas'),
      listarDocumentos(usuario.uid, 'entradas'),
    ]);

    const parcelasDoMes = dividas.filter((d) => dentroDoMesAtual(d.proximoVencimento));
    const saidasDoMes = saidas.filter((s) => dentroDoMesAtual(s.data));
    const entradasDoMes = entradas.filter((e) => dentroDoMesAtual(e.data));

    const totalParcelas = parcelasDoMes.reduce((soma, d) => soma + (d.valorParcela || 0), 0);
    const totalSaidas = saidasDoMes.reduce((soma, s) => soma + (s.valor || 0), 0);
    const totalEntradas = entradasDoMes.reduce((soma, e) => soma + (e.valor || 0), 0);
    const saldo = totalEntradas - totalSaidas - totalParcelas;

    valorEntradas.textContent = formatarMoeda(totalEntradas);
    valorSaidas.textContent = formatarMoeda(totalSaidas + totalParcelas);
    valorSaldo.textContent = formatarMoeda(saldo);

    const itensProximos = [
      ...parcelasDoMes.map((d) => ({
        data: d.proximoVencimento,
        descricao: d.descricao,
        parcela: `${d.parcelaAtual + 1 <= d.totalParcelas ? d.parcelaAtual + 1 : d.totalParcelas}/${d.totalParcelas}`,
        valor: d.valorParcela,
      })),
      ...saidasDoMes.map((s) => ({
        data: s.data,
        descricao: s.descricao,
        parcela: '—',
        valor: s.valor,
      })),
    ]
      .filter((item) => item.data)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 12);

    if (itensProximos.length === 0) {
      estadoTransacoes.textContent =
        'Nenhuma dívida ou saída cadastrada ainda. Importe uma fatura ou cadastre manualmente para começar.';
      tabelaResumo.hidden = true;
      return;
    }

    estadoTransacoes.hidden = true;
    tabelaResumo.hidden = false;
    corpoTabelaResumo.innerHTML = itensProximos
      .map(
        (item) => `
          <tr>
            <td>${formatarData(item.data)}</td>
            <td>${item.descricao}</td>
            <td>${item.parcela}</td>
            <td>${formatarMoeda(item.valor)}</td>
          </tr>`,
      )
      .join('');
  } catch (erro) {
    console.error(erro);
    estadoTransacoes.textContent = `Não foi possível carregar os dados: ${erro.message}`;
  }
}
