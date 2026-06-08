import { parseFaturaPdf } from './pdfParser.js';
import { exigirLogin } from './firebase.js';
import { montarBarraLateral } from './layout.js';
import { CATEGORIAS, sugerirCategoria } from './categorias.js';
// salvarTransacoesImportadas é importado sob demanda (só quando o usuário
// clica em "Salvar"): assim, se o Firebase falhar ao carregar, a
// leitura/revisão do PDF continua funcionando.

const usuario = await exigirLogin();
if (usuario) {
  montarBarraLateral('importar', usuario);
  iniciarImportacao();
}

function iniciarImportacao() {

const inputArquivo = document.getElementById('arquivoFatura');
const statusImportacao = document.getElementById('statusImportacao');
const cartaoRevisao = document.getElementById('cartaoRevisao');
const corpoTabela = document.getElementById('corpoTabelaTransacoes');
const botaoSalvar = document.getElementById('botaoSalvar');
const statusSalvar = document.getElementById('statusSalvar');

const PDF_JS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';
const PDF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

// pdf.js é carregado sob demanda como módulo ES (evita depender de um global
// vindo de <script>, e funciona com o build .mjs distribuído pelo pacote).
let pdfjsLibPromise = null;
function carregarPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(PDF_JS_URL).then((modulo) => {
      modulo.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      return modulo;
    });
  }
  return pdfjsLibPromise;
}

let transacoesAtuais = [];

function classificarTipo(transacao) {
  if (transacao.ehEntradaNegativa) return 'pagamento';
  if (transacao.ehParcelado) return 'divida';
  return 'saida';
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function criarLinhaTabela(transacao, indice) {
  const tr = document.createElement('tr');
  tr.dataset.indice = String(indice);

  const tdSelecionar = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.addEventListener('change', () => {
    tr.classList.toggle('linha-removida', !checkbox.checked);
  });
  tdSelecionar.appendChild(checkbox);

  const tdData = document.createElement('td');
  const inputData = document.createElement('input');
  inputData.type = 'date';
  inputData.value = transacao.dataTexto;
  inputData.addEventListener('change', () => { transacao.dataTexto = inputData.value; });
  tdData.appendChild(inputData);

  const tdDescricao = document.createElement('td');
  const inputDescricao = document.createElement('input');
  inputDescricao.type = 'text';
  inputDescricao.value = transacao.descricao;
  inputDescricao.addEventListener('input', () => { transacao.descricao = inputDescricao.value; });
  tdDescricao.appendChild(inputDescricao);

  const tdParcela = document.createElement('td');
  if (transacao.ehParcelado) {
    const inputAtual = document.createElement('input');
    inputAtual.type = 'number';
    inputAtual.min = '1';
    inputAtual.style.width = '48px';
    inputAtual.value = transacao.parcelaAtual;
    inputAtual.addEventListener('input', () => {
      transacao.parcelaAtual = parseInt(inputAtual.value, 10) || null;
    });

    const inputTotal = document.createElement('input');
    inputTotal.type = 'number';
    inputTotal.min = '1';
    inputTotal.style.width = '48px';
    inputTotal.value = transacao.totalParcelas;
    inputTotal.addEventListener('input', () => {
      transacao.totalParcelas = parseInt(inputTotal.value, 10) || null;
    });

    tdParcela.append(inputAtual, document.createTextNode(' / '), inputTotal);
  } else {
    tdParcela.textContent = '—';
  }

  const tdValor = document.createElement('td');
  const inputValor = document.createElement('input');
  inputValor.type = 'number';
  inputValor.step = '0.01';
  inputValor.value = transacao.valor.toFixed(2);
  inputValor.classList.add(transacao.valor < 0 ? 'valor-negativo' : 'valor-positivo');
  inputValor.addEventListener('input', () => {
    transacao.valor = parseFloat(inputValor.value) || 0;
  });
  tdValor.appendChild(inputValor);

  const tdTipo = document.createElement('td');
  const selectTipo = document.createElement('select');
  const opcoes = [
    ['divida', 'Dívida (parcelada)'],
    ['saida', 'Saída'],
    ['entrada', 'Entrada'],
    ['pagamento', 'Pagamento de fatura (ignorar)'],
  ];
  for (const [valor, rotulo] of opcoes) {
    const opt = document.createElement('option');
    opt.value = valor;
    opt.textContent = rotulo;
    selectTipo.appendChild(opt);
  }
  selectTipo.value = classificarTipo(transacao);
  selectTipo.addEventListener('change', () => {
    transacao.tipo = selectTipo.value;
    if (selectTipo.value === 'pagamento') checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
  });
  transacao.tipo = selectTipo.value;
  if (transacao.tipo === 'pagamento') {
    checkbox.checked = false;
    tr.classList.add('linha-removida');
  }
  tdTipo.appendChild(selectTipo);

  const tdCategoria = document.createElement('td');
  const selectCategoria = document.createElement('select');
  for (const { chave, rotulo } of CATEGORIAS) {
    const opt = document.createElement('option');
    opt.value = chave;
    opt.textContent = rotulo;
    selectCategoria.appendChild(opt);
  }
  transacao.categoria = transacao.categoria || sugerirCategoria(transacao.descricao);
  selectCategoria.value = transacao.categoria;
  selectCategoria.addEventListener('change', () => {
    transacao.categoria = selectCategoria.value;
  });
  tdCategoria.appendChild(selectCategoria);

  tr.append(tdSelecionar, tdData, tdDescricao, tdParcela, tdValor, tdTipo, tdCategoria);
  tr.querySelector('input[type="checkbox"]').dataset.papel = 'selecionar';
  return tr;
}

function renderizarTabela(transacoes) {
  corpoTabela.innerHTML = '';
  transacoes.forEach((transacao, indice) => {
    corpoTabela.appendChild(criarLinhaTabela(transacao, indice));
  });
  cartaoRevisao.hidden = transacoes.length === 0;
}

function transacoesSelecionadas() {
  const linhas = [...corpoTabela.querySelectorAll('tr')];
  return linhas
    .filter((linha) => linha.querySelector('[data-papel="selecionar"]').checked)
    .map((linha) => transacoesAtuais[Number(linha.dataset.indice)]);
}

inputArquivo.addEventListener('change', async () => {
  const arquivo = inputArquivo.files[0];
  if (!arquivo) return;

  statusImportacao.textContent = 'Carregando leitor de PDF e identificando transações…';
  statusImportacao.classList.remove('estado-vazio');

  try {
    const [pdfjsLib, buffer] = await Promise.all([carregarPdfJs(), arquivo.arrayBuffer()]);
    const { transacoes, anoFaturaDetectado } = await parseFaturaPdf(pdfjsLib, buffer);

    if (transacoes.length === 0) {
      statusImportacao.textContent =
        'Não consegui reconhecer transações neste PDF. O layout pode ser diferente do esperado.';
      cartaoRevisao.hidden = true;
      return;
    }

    transacoesAtuais = transacoes;
    statusImportacao.textContent =
      `${transacoes.length} transação(ões) encontrada(s) (ano da fatura: ${anoFaturaDetectado}). ` +
      'Revise antes de salvar.';
    renderizarTabela(transacoesAtuais);
  } catch (erro) {
    console.error(erro);
    statusImportacao.textContent = `Erro ao ler o PDF: ${erro.message}`;
  }
});

botaoSalvar.addEventListener('click', async () => {
  const selecionadas = transacoesSelecionadas();
  if (selecionadas.length === 0) {
    statusSalvar.textContent = 'Nenhuma transação selecionada.';
    return;
  }

  botaoSalvar.disabled = true;
  statusSalvar.textContent = 'Salvando…';
  try {
    const { salvarTransacoesImportadas } = await import('./firestore.js');
    await salvarTransacoesImportadas(selecionadas);
    statusSalvar.textContent = `${selecionadas.length} transação(ões) salva(s) com sucesso.`;
  } catch (erro) {
    console.error(erro);
    statusSalvar.textContent = `Erro ao salvar: ${erro.message}`;
  } finally {
    botaoSalvar.disabled = false;
  }
});

}
