'use strict';
function explicarErroAutenticacao(error) {
 const code=String(error?.code||'').toLowerCase(), msg=String(error?.message||'Erro desconhecido');
 if(code==='invalid_credentials')return 'E-mail ou senha incorretos.';
 if(code==='email_not_confirmed')return 'E-mail ainda não confirmado no Supabase.';
 if(code.includes('rate_limit'))return 'Muitas tentativas. Aguarde alguns minutos.';
 if(code==='pgrst125')return 'Endereço inválido da API (PGRST125).';
 if(/failed to fetch|network|fetch failed|load failed/i.test(msg))return 'Não foi possível alcançar o Supabase. Clique em Diagnosticar conexão.';
 return 'Falha no login: '+msg.slice(0,140)+(code?' ['+code+']':'');
}
async function entrar(email,senha){const {data,error}=await supabaseClient.auth.signInWithPassword({email:email.trim(),password:senha});if(error)throw Error(explicarErroAutenticacao(error));if(!data?.user)throw Error('Servidor não retornou usuário.');return data.user;}
async function sair(){const {error}=await supabaseClient.auth.signOut();if(error)throw Error(explicarErroAutenticacao(error));}
async function usuarioAtual(){const {data,error}=await supabaseClient.auth.getUser();return error?null:(data?.user||null);}
async function diagnosticarConexao(){
 const url=new URL(SUPABASE_URL);
 if(url.pathname!=='/'||!/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname))return 'URL do projeto inválida.';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
 try{const response=await fetch(url.origin+'/auth/v1/health',{method:'GET',mode:'cors',cache:'no-store',headers:{apikey:SUPABASE_KEY},signal:controller.signal});return 'Supabase Auth respondeu HTTP '+response.status+(response.ok?' (conexão disponível).':' (verifique serviço/API).');}
 catch(err){return 'Conexão não concluída ('+(err?.name==='AbortError'?'tempo esgotado':(err?.name||'falha de rede'))+'). Verifique DNS, antivírus ou bloqueadores.';}
 finally{clearTimeout(timeout);}
}
