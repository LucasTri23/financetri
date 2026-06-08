import {
  auth,
  aguardarUsuario,
  createUserWithEmailAndPassword,
  entrarComGoogle,
} from './firebase.js';

const formCadastro = document.getElementById('formCadastro');
const campoEmail = document.getElementById('email');
const campoSenha = document.getElementById('senha');
const campoConfirmarSenha = document.getElementById('confirmarSenha');
const botaoCriarConta = document.getElementById('botaoCriarConta');
const botaoGoogle = document.getElementById('botaoGoogle');
const statusCadastro = document.getElementById('statusCadastro');

const MENSAGENS_ERRO = {
  'auth/invalid-email': 'E-mail inválido.',
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

formCadastro.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (campoSenha.value !== campoConfirmarSenha.value) {
    statusCadastro.textContent = 'As senhas não conferem. Confira e tente novamente.';
    return;
  }

  statusCadastro.textContent = 'Criando conta…';
  botaoCriarConta.disabled = true;
  try {
    await createUserWithEmailAndPassword(auth, campoEmail.value, campoSenha.value);
    await irParaPainel();
  } catch (erro) {
    statusCadastro.textContent = mensagemDeErro(erro);
  } finally {
    botaoCriarConta.disabled = false;
  }
});

botaoGoogle.addEventListener('click', async () => {
  statusCadastro.textContent = 'Abrindo login do Google…';
  botaoGoogle.disabled = true;
  try {
    await entrarComGoogle();
    await irParaPainel();
  } catch (erro) {
    statusCadastro.textContent = mensagemDeErro(erro);
  } finally {
    botaoGoogle.disabled = false;
  }
});
