'use strict';
async function iniciarLogin(){
 const login=document.getElementById('tela-login'),app=document.querySelector('main'),form=document.getElementById('form-login'),erro=document.getElementById('login-erro'),btn=document.getElementById('btn-entrar'),diag=document.getElementById('btn-diagnostico'),resultado=document.getElementById('diagnostico-resultado'),logout=document.getElementById('btn-sair');
 if(!login||!app||!form||!erro||!btn)return;
 const mostrarLogin=()=>{app.hidden=true;login.hidden=false;},mostrarApp=()=>{login.hidden=true;app.hidden=false;};
 app.hidden=true;login.hidden=true;
 if(typeof supabaseClient==='undefined'){mostrarLogin();erro.textContent='Biblioteca Supabase indisponível. Verifique conexão/CDN.';return;}
 try{const user=await usuarioAtual();if(user)mostrarApp();else mostrarLogin();}catch(e){mostrarLogin();erro.textContent='Não foi possível verificar sua sessão.';}
 diag?.addEventListener('click',async()=>{diag.disabled=true;resultado.textContent='Testando...';try{resultado.textContent=await diagnosticarConexao();}catch(e){resultado.textContent='Diagnóstico indisponível.';}finally{diag.disabled=false;}});
 logout?.addEventListener('click',async()=>{logout.disabled=true;try{await sair();mostrarLogin();}catch(e){alert(e.message||'Não foi possível sair.');}finally{logout.disabled=false;}});
 form.addEventListener('submit',async e=>{e.preventDefault();erro.textContent='';btn.disabled=true;btn.textContent='Entrando...';try{await entrar(document.getElementById('login-email').value,document.getElementById('login-senha').value);document.getElementById('login-senha').value='';mostrarApp();}catch(e){erro.textContent=e.message||'Erro inesperado no login.';}finally{btn.disabled=false;btn.textContent='Entrar';}});
}
document.addEventListener('DOMContentLoaded',iniciarLogin);
