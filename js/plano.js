// Funções para o recurso de "plano compartilhado": permite que duas pessoas
// juntem suas finanças. Modelo de dados: planos/{planoId} com `membros`
// (lista de uids), `membrosInfo` (uid -> { email }) e um `codigoConvite`
// que outra pessoa usa para entrar no plano.
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

const CARACTERES_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // evita 0/O, 1/I

function gerarCodigoConvite() {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += CARACTERES_CODIGO[Math.floor(Math.random() * CARACTERES_CODIGO.length)];
  }
  return codigo;
}

// Retorna o plano ao qual o usuário pertence (ou null, se nenhum).
export async function buscarPlanoDoUsuario(usuario) {
  const consulta = query(collection(db, 'planos'), where('membros', 'array-contains', usuario.uid));
  const instantaneo = await getDocs(consulta);
  if (instantaneo.empty) return null;
  const documento = instantaneo.docs[0];
  return { id: documento.id, ...documento.data() };
}

// Cria um novo plano compartilhado tendo o usuário atual como dono/membro inicial.
export async function criarPlano(usuario, nome) {
  const codigoConvite = gerarCodigoConvite();
  const referencia = doc(collection(db, 'planos'));
  await setDoc(referencia, {
    nome: nome || `Plano de ${usuario.email}`,
    donoId: usuario.uid,
    membros: [usuario.uid],
    membrosInfo: { [usuario.uid]: { email: usuario.email } },
    codigoConvite,
    criadoEm: serverTimestamp(),
  });
  return { id: referencia.id, codigoConvite };
}

// Usa um código de convite para entrar em um plano existente.
export async function entrarComCodigo(usuario, codigoDigitado) {
  const codigo = codigoDigitado.trim().toUpperCase();
  const consulta = query(collection(db, 'planos'), where('codigoConvite', '==', codigo));
  const instantaneo = await getDocs(consulta);
  if (instantaneo.empty) {
    throw new Error('Código de convite inválido. Confira com quem te convidou.');
  }

  const documento = instantaneo.docs[0];
  const dados = documento.data();
  if ((dados.membros || []).includes(usuario.uid)) {
    return { id: documento.id, jaEraMembro: true };
  }

  await updateDoc(doc(db, 'planos', documento.id), {
    membros: arrayUnion(usuario.uid),
    [`membrosInfo.${usuario.uid}`]: { email: usuario.email },
  });
  return { id: documento.id, jaEraMembro: false };
}

// Preenche um <select> de "quem paga"/"quem recebe" com o usuário atual e,
// se houver um plano compartilhado, com os demais integrantes.
export function preencherSelecaoDeIntegrante(seletor, usuario, plano) {
  seletor.innerHTML = '';

  const opcaoEu = document.createElement('option');
  opcaoEu.value = usuario.uid;
  opcaoEu.textContent = `Eu (${usuario.email})`;
  seletor.appendChild(opcaoEu);

  if (plano) {
    for (const uidMembro of plano.membros || []) {
      if (uidMembro === usuario.uid) continue;
      const opcao = document.createElement('option');
      opcao.value = uidMembro;
      opcao.textContent = (plano.membrosInfo || {})[uidMembro]?.email || 'Outro integrante do plano';
      seletor.appendChild(opcao);
    }
  }
}

// Resolve o e-mail de um integrante do plano a partir do uid (ou do próprio usuário).
export function emailDoIntegrante(uid, usuario, plano) {
  if (uid === usuario.uid) return usuario.email;
  return (plano?.membrosInfo || {})[uid]?.email || 'outro integrante do plano';
}
