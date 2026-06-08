// Funções de leitura/escrita no Firestore. Cada usuário guarda seus dados em
// `usuarios/{uid}/dividas|saidas|entradas` (ver Fase 4 do plano para o modelo
// de "plano compartilhado", que moverá esses dados para uma coleção do plano).
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, exigirLogin } from './firebase.js';

function calcularProximoVencimento(dataCompraTexto, parcelaAtual, totalParcelas) {
  const dataCompra = new Date(`${dataCompraTexto}T00:00:00`);
  const parcelasRestantes = totalParcelas - parcelaAtual;
  const proximo = new Date(dataCompra);
  proximo.setMonth(proximo.getMonth() + 1);
  return { proximo: proximo.toISOString().slice(0, 10), parcelasRestantes };
}

async function salvarDivida(uid, transacao) {
  const { proximo, parcelasRestantes } = calcularProximoVencimento(
    transacao.dataTexto,
    transacao.parcelaAtual,
    transacao.totalParcelas,
  );

  await addDoc(collection(db, 'usuarios', uid, 'dividas'), {
    descricao: transacao.descricao,
    categoria: transacao.categoria || 'outros',
    valorParcela: Math.abs(transacao.valor),
    parcelaAtual: transacao.parcelaAtual,
    totalParcelas: transacao.totalParcelas,
    parcelasRestantes,
    dataCompra: transacao.dataTexto,
    proximoVencimento: proximo,
    origem: 'importacao_pdf',
    criadoEm: serverTimestamp(),
  });
}

async function salvarSaida(uid, transacao) {
  await addDoc(collection(db, 'usuarios', uid, 'saidas'), {
    descricao: transacao.descricao,
    categoria: transacao.categoria || 'outros',
    valor: Math.abs(transacao.valor),
    data: transacao.dataTexto,
    metodo: 'cartao_credito',
    origem: 'importacao_pdf',
    criadoEm: serverTimestamp(),
  });
}

async function salvarEntrada(uid, transacao) {
  await addDoc(collection(db, 'usuarios', uid, 'entradas'), {
    descricao: transacao.descricao,
    valor: Math.abs(transacao.valor),
    data: transacao.dataTexto,
    origem: 'importacao_pdf',
    criadoEm: serverTimestamp(),
  });
}

// Salva uma saída cadastrada manualmente (não vinda de importação de fatura).
export async function salvarSaidaManual(uid, dados) {
  await addDoc(collection(db, 'usuarios', uid, 'saidas'), {
    descricao: dados.descricao,
    categoria: dados.categoria || 'outros',
    valor: dados.valor,
    data: dados.data,
    metodo: dados.metodo,
    recorrente: dados.recorrente,
    frequencia: dados.frequencia || null,
    pagadorUid: dados.pagadorUid,
    pagadorEmail: dados.pagadorEmail,
    origem: 'manual',
    criadoEm: serverTimestamp(),
  });
}

// Salva uma compra parcelada cadastrada manualmente como uma dívida — a
// primeira parcela é a que está sendo registrada agora.
export async function salvarDividaManual(uid, dados) {
  const { proximo, parcelasRestantes } = calcularProximoVencimento(dados.data, 1, dados.totalParcelas);

  await addDoc(collection(db, 'usuarios', uid, 'dividas'), {
    descricao: dados.descricao,
    categoria: dados.categoria || 'outros',
    valorParcela: dados.valor,
    parcelaAtual: 1,
    totalParcelas: dados.totalParcelas,
    parcelasRestantes,
    dataCompra: dados.data,
    proximoVencimento: proximo,
    metodo: dados.metodo,
    pagadorUid: dados.pagadorUid,
    pagadorEmail: dados.pagadorEmail,
    origem: 'manual',
    criadoEm: serverTimestamp(),
  });
}

// Salva uma entrada (receita) cadastrada manualmente.
export async function salvarEntradaManual(uid, dados) {
  await addDoc(collection(db, 'usuarios', uid, 'entradas'), {
    descricao: dados.descricao,
    tipo: dados.tipo,
    valor: dados.valor,
    data: dados.data,
    recorrente: dados.recorrente,
    frequencia: dados.frequencia || null,
    recebedorUid: dados.recebedorUid,
    recebedorEmail: dados.recebedorEmail,
    origem: 'manual',
    criadoEm: serverTimestamp(),
  });
}

// Persiste as transações revisadas pelo usuário, encaminhando cada uma para a
// coleção correta conforme o tipo escolhido na tela de revisão.
export async function salvarTransacoesImportadas(transacoes) {
  const usuario = await exigirLogin();
  if (!usuario) throw new Error('Você precisa estar logado para salvar transações.');

  for (const transacao of transacoes) {
    switch (transacao.tipo) {
      case 'divida':
        await salvarDivida(usuario.uid, transacao);
        break;
      case 'saida':
        await salvarSaida(usuario.uid, transacao);
        break;
      case 'entrada':
        await salvarEntrada(usuario.uid, transacao);
        break;
      default:
        // 'pagamento' e outros tipos ignorados não são persistidos
        break;
    }
  }
}
