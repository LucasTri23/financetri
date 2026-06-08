import {
  auth,
  aguardarUsuario,
  signInWithEmailAndPassword,
  entrarComGoogle,
} from './firebase.js';

const formLogin = document.getElementById('formLogin');
const campoEmail = document.getElementById('email');
const campoSenha = document.getElementById('senha');
const botaoEntrar = document.getElementById('botaoEntrar');
const botaoGoogle = document.getElementById('botaoGoogle');
const statusLogin = document.getElementById('statusLogin');

const MENSAGENS_ERRO = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/popup-closed-by-user': 'A janela de login do Google foi fechada antes de concluir.',
};

function mensagemDeErro(erro) {
  return MENSAGENS_ERRO[erro.code] || `Erro: ${erro.message}`;
}

async function irParaPainel() {
  window.location.href = 'dashboard.html';
}

// Se já houver sessão ativa, pula direto para o painel.
aguardarUsuario().then((usuario) => {
  if (usuario) irParaPainel();
});

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  statusLogin.textContent = 'Entrando…';
  botaoEntrar.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, campoEmail.value, campoSenha.value);
    await irParaPainel();
  } catch (erro) {
    statusLogin.textContent = mensagemDeErro(erro);
  } finally {
    botaoEntrar.disabled = false;
  }
});

botaoGoogle.addEventListener('click', async () => {
  statusLogin.textContent = 'Abrindo login do Google…';
  botaoGoogle.disabled = true;
  try {
    await entrarComGoogle();
    await irParaPainel();
  } catch (erro) {
    statusLogin.textContent = mensagemDeErro(erro);
  } finally {
    botaoGoogle.disabled = false;
  }
});
