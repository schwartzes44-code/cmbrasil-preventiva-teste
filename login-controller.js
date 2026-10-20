
'use strict';

// CMBrasil Preventiva 2.0
// Controle da tela de autenticacao

async function iniciarLogin() {
  const telaLogin = document.getElementById('tela-login');
  const aplicativo = document.querySelector('main');
  const formulario = document.getElementById('form-login');
  const mensagemErro = document.getElementById('login-erro');
  const botaoEntrar = document.getElementById('btn-entrar');

  // Esconde o aplicativo durante a verificacao.
  aplicativo.hidden = true;
  telaLogin.hidden = true;

  try {
    const usuario = await usuarioAtual();

    if (usuario) {
      aplicativo.hidden = false;
    } else {
      telaLogin.hidden = false;
    }
  } catch (erro) {
    telaLogin.hidden = false;
  }

  formulario.addEventListener('submit', async function(evento) {
    evento.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    mensagemErro.textContent = '';
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = 'Entrando...';

    try {
      await entrar(email, senha);

      telaLogin.hidden = true;
      aplicativo.hidden = false;

      document.getElementById('login-senha').value = '';
    } catch (erro) {
      mensagemErro.textContent = erro.message;
    } finally {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = 'Entrar';
    }
  });
}

document.addEventListener('DOMContentLoaded', iniciarLogin);
