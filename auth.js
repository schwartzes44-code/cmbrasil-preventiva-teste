'use strict';

function explicarErroAutenticacao(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || 'Erro desconhecido');
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (code === 'email_not_confirmed') return 'Seu e-mail ainda não foi confirmado no Supabase.';
  if (code === 'pgrst125' || message.includes('Invalid path specified'))
    return 'Erro de endereço da API (PGRST125). Confira a URL do projeto Supabase.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network'))
    return 'Falha de conexão com o Supabase. Verifique sua internet e tente novamente.';
  return `Não foi possível entrar: ${message}${code ? ` (${code})` : ''}`;
}

async function entrar(email, senha) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({email, password: senha});
  if (error) throw new Error(explicarErroAutenticacao(error));
  if (!data?.user) throw new Error('O Supabase não retornou um usuário autenticado.');
  return data.user;
}

async function sair() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw new Error(explicarErroAutenticacao(error));
}

async function usuarioAtual() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data?.user || null;
}
