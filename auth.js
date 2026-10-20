
'use strict';

// CMBrasil Preventiva 2.0
// Autenticacao de usuarios pelo Supabase

async function entrar(email, senha) {
  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: senha
    });

  if (error) {
    throw new Error('E-mail ou senha invalidos.');
  }

  return data.user;
}

async function sair() {
  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    throw error;
  }
}

async function usuarioAtual() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}
