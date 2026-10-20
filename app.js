'use strict';
const $=id=>document.getElementById(id);
const DEFAULT='Olá, *{nome}*!\n\nPassando para lembrar que sua parcela junto à *CMBrasil – Casa do Microcrédito* vence em *{data}*.\n\nCaso já tenha efetuado o pagamento, desconsidere esta mensagem.\n\nAgradecemos sua parceria!\n*CMBrasil Imperatriz*';
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=s=>Number((s||'0').replace(/\./g,'').replace(',','.'));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fullDate=s=>s&&/^\d{2}\/\d{2}\/\d{2}$/.test(s)?s.slice(0,6)+'20'+s.slice(6):s;
const normalizedPhone=s=>{let p=String(s||'').replace(/\D/g,'');if(p.length===11||p.length===10)p='55'+p;return /^55\d{10,11}$/.test(p)?p:''};

function lineText(items){const lines=[];for(const it of items){if(!it.str||!it.str.trim())continue;const y=Math.round((it.transform?.[5]||0)*2)/2;let l=lines.find(x=>Math.abs(x.y-y)<2);if(!l){l={y,items:[]};lines.push(l)}l.items.push({x:it.transform?.[4]||0,text:it.str})}return lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ').replace(/\s+/g,' ').trim()).join('\n')}
function parseReport(text){
 const dates=[...text.matchAll(/Vencimento:\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/g)];
 const agent=(text.match(/Agente de Cr[eé]dito:\s*(\S+)/i)||[])[1]||'NÃO IDENTIFICADO';
 const sumText=text.slice(text.lastIndexOf('Resumo Geral'));
 const expectedClients=Number((sumText.match(/Quantidade de Clientes\s+(\d+)/)||[])[1]||0);
 const expectedDocs=Number((sumText.match(/Quantidade de Documentos\s+(\d+)/)||[])[1]||0);
 const expectedAmount=num((sumText.match(/Valor Receber\s+([\d.]+,\d{2})/)||[])[1]);
 const parts=text.split(/(?=Cliente:\s*\d{5,}\s*-\s*)/);
 const clients=[];
 for(const part of parts){
  const match=part.match(/^Cliente:\s*(\d{5,})\s*-\s*(.*?)\s+CPF:/s);if(!match)continue;
  const code=match[1],name=match[2].replace(/\s+/g,' ').trim();
  const header=(part.match(/Endere[cç]o:[\s\S]*?(?=\u00daltimo Pagamento:|Nome C[oô]njuge:|Refer[eê]ncia Pessoal|Meio:)/i)||[])[0]||'';
  const phoneLinks=[...header.matchAll(/https?:\/\/wa\.me\/(55\d{10,11})/g)].map(x=>x[1]);
  const fones=(header.match(/Fones:\s*([\s\S]*?)(?=\bE-mail:|https?:\/\/wa\.me\/|\n|$)/i)||[])[1]||'';
  const phone=phoneLinks[0]||normalizedPhone((fones.match(/\(?\d{2}\)?[\s-]*9?\d{4}[\s-]*\d{4}/)||[])[0]);
  const city=(header.match(/Cidade:\s*(.*?)\s+CEP:/i)||[])[1]?.trim()||'';
  const docs=[];
  const rows=part.split('\n').filter(l=>/^\s*\d{8}-\d{2}-\d{3}\/\d+\s+\d{2}\/\d{2}\/\d{2}/.test(l));
  for(const row of rows){const head=row.match(/^\s*(\d{8}-\d{2}-\d{3}\/\d+)\s+(\d{2}\/\d{2}\/\d{2})/);if(!head)continue;
   const values=[...row.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)].map(m=>m[0]);
   if(values.length<2)continue;
   docs.push({contract:head[1],due:fullDate(head[2]),amount:num(values[1])});
  }
  if(!docs.length)continue;
  const dueDates=[...new Set(docs.map(d=>d.due))];
  const due=dueDates.length===1?dueDates[0]:'MÚLTIPLOS';
  const amount=Math.round(docs.reduce((a,d)=>a+d.amount,0)*100)/100;
  clients.push({id:agent+'::'+code+'::'+due,code,name,phone,city,agent,due,amount,docs,status:'pending',lastOpen:null,markedAt:null});
 }
 return {clients,agent,expectedClients,expectedDocs,expectedAmount,range:dates[0]?.slice(1,3)||[]};
}
const Preventiva=(()=>{
 const codes=['XAMA1','XAMA2','XAMA3','XAMA4','XAMA6'];
 let profile=null,cycle=null,clients=[],staged=new Map(),template=DEFAULT,started=false,epoch=0;
 const warn=s=>{$('warning').hidden=!s;$('warning').textContent=s||''};
 const check=(data,error)=>{if(error)throw Error(error.message||'Falha na consulta Supabase');return data};
 const dateBR=s=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'—';
 const role=()=>profile?.papel;
 function render(){
  const cartera=$('filter-carteira').value,filter=$('filter-status').value,q=$('search').value.toLocaleLowerCase('pt-BR');
  const base=clients.filter(c=>cartera==='all'||c.carteira===cartera);
  const shown=base.filter(c=>(c.nome+' '+c.cidade+' '+c.codigo).toLocaleLowerCase('pt-BR').includes(q)).filter(c=>filter==='all'||(filter==='opened'?!!c.aberto_em:filter==='pending'?!c.aberto_em:!c.telefone));
  $('n-clients').textContent=base.length;$('n-opened').textContent=base.filter(c=>c.aberto_em).length;
  $('n-pending').textContent=base.filter(c=>!c.aberto_em).length;$('n-missing').textContent=base.filter(c=>!c.telefone).length;
  $('n-rate').textContent=(base.length?Math.round(100*base.filter(c=>c.aberto_em).length/base.length):0)+'%';
  $('cycle-label').textContent=cycle?'Vencimento '+dateBR(cycle.vencimento):'Nenhum ciclo publicado';
  $('cycle-updated').textContent=cycle?'Publicado em '+new Date(cycle.publicado_em).toLocaleString('pt-BR'):'Aguardando publicação';
  $('list-meta').textContent=base.length+' clientes visíveis • '+shown.length+' na busca';
  $('list').innerHTML=shown.length?shown.map(c=>`<article class="client"><div><h4>${escapeHTML(c.nome)}</h4><div class="detail">${escapeHTML(c.carteira)} · ${escapeHTML(c.cidade||'Cidade não informada')} · Venc. ${escapeHTML(c.vencimento)} · ${money(c.valor)} · ${c.documentos} documento(s)</div><div class="detail">${c.telefone?'+'+escapeHTML(c.telefone):'Sem telefone'} · <span class="tag ${c.aberto_em?'opened':''}">${c.aberto_em?'WhatsApp aberto em '+new Date(c.aberto_em).toLocaleString('pt-BR'):'Sem ação'}</span></div></div><button class="wa" data-open="${c.id}" ${!c.telefone?'disabled':''}>Abrir WhatsApp ↗</button></article>`).join(''):'<p class="empty">Nenhum cliente encontrado.</p>';
  $('list').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openWhatsApp(b.dataset.open)));
 }
 async function refresh(){
  const e=epoch;
  const [cy,cl]=await Promise.all([supabaseClient.from('p2_ciclos').select('id,vencimento,publicado_em').limit(1).maybeSingle(),supabaseClient.from('p2_clientes').select('id,carteira,codigo,nome,cidade,telefone,vencimento,valor,documentos,aberto_em').order('nome').limit(10000)]);
  check(cy.data,cy.error);check(cl.data,cl.error);
  if(e!==epoch)return;
  cycle=cy.data;clients=cl.data||[];render();
 }
 function message(c){return template.replace(/\{nome\}/gi,c.nome).replace(/\{primeiro_nome\}/gi,c.nome.split(/\s+/)[0]).replace(/\{data\}/gi,c.vencimento).replace(/\{valor\}/gi,money(c.valor))}
 async function openWhatsApp(id){
  const c=clients.find(x=>x.id===id);if(!c||!c.telefone)return;
  const b=$('list').querySelector(`[data-open="${id}"]`);if(b)b.disabled=true;
  // Abrir janela imediatamente no clique evita bloqueio de pop-up após requisição assíncrona.
  const tab=window.open('about:blank','_blank');
  try{
   if(!tab)throw Error('Permita janelas pop-up para abrir o WhatsApp. Nenhuma abertura foi registrada.');
   const {error}=await supabaseClient.rpc('p2_registrar_abertura',{p_cliente_id:id});
   if(error)throw Error(error.message);
   const url='https://wa.me/'+c.telefone+'?text='+encodeURIComponent(message(c));
   tab.location.replace(url);
   c.aberto_em=c.aberto_em||new Date().toISOString();render();warn('');
  }catch(e){if(tab&&!tab.closed)tab.close();warn('WhatsApp não aberto: '+e.message);}finally{if(b)b.disabled=false;}
 }
 async function importPDF(file){
  if(!file)return;const carteira=$('upload-carteira').value;warn('');$('import-status').textContent='Conferindo '+file.name+'...';
  try{
   if(role()!=='admin')throw Error('Somente administrador pode importar');
   if(!window.pdfjsLib)throw Error('Leitor PDF indisponível. Confira sua internet.');
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';
   for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);text+='\n'+lineText((await page.getTextContent()).items);}
   const report=parseReport(text),docs=report.clients.reduce((s,c)=>s+c.docs.length,0),amount=report.clients.reduce((s,c)=>s+c.amount,0);
   if(!report.expectedClients||!report.expectedDocs||!report.expectedAmount)throw Error('Resumo Geral não encontrado ou incompleto.');
   if(report.clients.length!==report.expectedClients||docs!==report.expectedDocs||Math.abs(amount-report.expectedAmount)>0.02)
    throw Error(`Conferência divergente. Extraído: ${report.clients.length} clientes, ${docs} documentos, ${money(amount)}. PDF: ${report.expectedClients} clientes, ${report.expectedDocs} documentos, ${money(report.expectedAmount)}. Nenhum dado foi substituído.`);
   const agentCode=(report.agent.match(/XAMA\d+/i)||[])[0]?.toUpperCase();
   if(agentCode&&agentCode!==carteira)throw Error('O PDF identifica '+agentCode+', mas foi selecionada '+carteira);
   const due=$('cycle-date').value;if(!due||![1,5,10,15,20].includes(Number(due.slice(8,10))))throw Error('Selecione a data de vencimento (dias 1, 5, 10, 15 ou 20).');
   const dates=report.clients.flatMap(c=>c.docs.map(d=>d.due));
   const dueBR=dateBR(due);
   if(dates.some(d=>d!==dueBR))throw Error('O PDF contém vencimentos diferentes de '+dueBR+'. Confirme a data e use o relatório do ciclo correto.');
   staged.set(carteira,{file:file.name,clients:report.clients.map(c=>({carteira,codigo:c.code,nome:c.name,cidade:c.city||'',telefone:c.phone||'',vencimento:c.due,valor:c.amount,documentos:c.docs.length})),docs,amount,due});
   $('import-status').textContent='PDF validado: '+file.name+' · '+report.expectedClients+' clientes.';renderStaged();
  }catch(e){$('import-status').textContent='Importação não validada.';warn(e.message);}finally{$('pdf').value='';}
 }
 function renderStaged(){
  const date=$('cycle-date').value;
  $('staged-list').innerHTML=codes.map(code=>{const s=staged.get(code);return `<span>${code}: ${s&&s.due===date?s.clients.length+' clientes ✓':'aguardando PDF'}</span>`}).join('');
  $('publish').disabled=!(role()==='admin'&&codes.every(c=>staged.get(c)?.due===date));
 }
 async function publish(){
  if(role()!=='admin'||$('publish').disabled)return;
  const date=$('cycle-date').value,rows=codes.flatMap(c=>staged.get(c)?.clients||[]);
  if(!confirm(`PUBLICAR ${dateBR(date)}?\n\n${rows.length} clientes das cinco carteiras.\nTODOS os clientes, pendências e registros de abertura do ciclo anterior serão excluídos.\n\nEsta operação não pode ser desfeita.`))return;
  $('publish').disabled=true;warn('');$('import-status').textContent='Publicando ciclo no Supabase...';
  try{
   const {data,error}=await supabaseClient.rpc('p2_publicar_ciclo',{p_vencimento:date,p_clientes:rows});
   check(data,error);staged.clear();renderStaged();await refresh();$('import-status').textContent=`Novo ciclo publicado com sucesso: ${data.publicados} clientes.`;
  }catch(e){warn('Publicação não concluída: '+e.message+'. O ciclo anterior foi preservado se a transação falhou.');$('import-status').textContent='Falha na publicação.';renderStaged();}
 }
 function setup(){if(started)return;started=true;
  $('pdf').addEventListener('change',e=>importPDF(e.target.files[0]));
  $('cycle-date').addEventListener('change',()=>{renderStaged();});
  $('publish').addEventListener('click',publish);
  $('search').addEventListener('input',render);$('filter-status').addEventListener('change',render);$('filter-carteira').addEventListener('change',render);
  $('refresh').addEventListener('click',()=>refresh().catch(e=>warn('Atualização não concluída: '+e.message)));
  $('template').value=template;
  $('template').addEventListener('input',e=>{template=e.target.value;localStorage.setItem('p2_template',template)});
  $('reset-template').addEventListener('click',()=>{template=DEFAULT;$('template').value=DEFAULT;localStorage.setItem('p2_template',template)});
 }
 async function start(){
  warn('');const {data,error}=await supabaseClient.rpc('p2_meu_acesso');check(data,error);
  if(!data||!data.ativo)throw Error('Usuário sem perfil autorizado na Preventiva 2.0. Solicite liberação ao administrador.');
  profile=data;epoch++;
  template=localStorage.getItem('p2_template')||DEFAULT;
  setup();$('template').value=template;
  $('user-label').textContent=profile.nome;
  $('role-label').textContent=profile.papel==='admin'?'Administrador':'Agente · '+profile.carteira;
  $('admin-section').hidden=role()!=='admin';$('filter-carteira').hidden=role()!=='admin';
  $('filter-carteira').value=role()==='admin'?'all':profile.carteira;
  await refresh();
 }
 function clear(){profile=null;cycle=null;clients=[];staged.clear();epoch++;}
 return {start,clear};
})();
