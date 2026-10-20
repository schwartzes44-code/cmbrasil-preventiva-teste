'use strict';

async function iniciarLogin() {
  const telaLogin = document.getElementById('tela-login');
  const aplicativo = document.querySelector('main');
  const formulario = document.getElementById('form-login');
  const mensagemErro = document.getElementById('login-erro');
  const botaoEntrar = document.getElementById('btn-entrar');
  if (!telaLogin || !aplicativo || !formulario || !mensagemErro || !botaoEntrar) return;

  aplicativo.hidden = true;
  telaLogin.hidden = true;
  try {
    const usuario = await usuarioAtual();
    if (usuario) aplicativo.hidden = false;
    else telaLogin.hidden = false;
  } catch (erro) {
    telaLogin.hidden = false;
    mensagemErro.textContent = 'Não foi possível verificar sua sessão. Tente entrar novamente.';
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    mensagemErro.textContent = '';
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = 'Entrando...';
    try {
      await entrar(email, senha);
      document.getElementById('login-senha').value = '';
      telaLogin.hidden = true;
      aplicativo.hidden = false;
    } catch (erro) {
      mensagemErro.textContent = erro.message || 'Falha inesperada ao entrar.';
    } finally {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = 'Entrar';
    }
  });
}

document.addEventListener('DOMContentLoaded', iniciarLogin);
