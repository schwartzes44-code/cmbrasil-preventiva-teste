'use strict';
const KEY='cmbrasil_preventiva_v1';
const DEFAULT='Olá, *{primeiro_nome}*! 😊\n\nPassando para lembrar que sua parcela junto à *CMBrasil – Casa do Microcrédito* vence hoje, *{data}*.\n\nPara evitar encargos por atraso, orientamos que realize o pagamento até o final do dia.\n\nCaso já tenha efetuado o pagamento, desconsidere esta mensagem.\n\nAgradecemos sua parceria!\n*CMBrasil Imperatriz*';
const $=id=>document.getElementById(id);
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{clients:[],template:DEFAULT}}catch{return{clients:[],template:DEFAULT}}};
let state=load();if(!Array.isArray(state.clients))state.clients=[];
if(typeof state.template!=='string')state.template=DEFAULT;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=s=>Number((s||'0').replace(/\./g,'').replace(',','.'));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fullDate=s=>s&&/^\d{2}\/\d{2}\/\d{2}$/.test(s)?s.slice(0,6)+'20'+s.slice(6):s;
const normalizedPhone=s=>{let p=String(s||'').replace(/\D/g,'');if(p.length===11||p.length===10)p='55'+p;return /^55\d{10,11}$/.test(p)?p:''};
function warn(message){$('warning').hidden=!message;$('warning').textContent=message||''}
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
async function importPDF(file){if(!file)return;warn('');$('status').textContent='Lendo PDF...';try{
 if(!window.pdfjsLib)throw Error('Leitor PDF indisponível. Conecte-se à internet e tente novamente.');
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';
 for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);text+='\n'+lineText((await page.getTextContent()).items)}
 const report=parseReport(text);const docs=report.clients.reduce((a,c)=>a+c.docs.length,0);
 const amount=report.clients.reduce((a,c)=>a+c.amount,0);
 if(!report.expectedClients||!report.expectedDocs||!report.expectedAmount)throw Error('Resumo Geral não encontrado ou incompleto. Confira se o PDF é o relatório Carteira por Agente.');
 if(report.clients.length!==report.expectedClients||docs!==report.expectedDocs||Math.abs(amount-report.expectedAmount)>0.02){
  throw Error(`Conferência divergente. Extraído: ${report.clients.length} clientes, ${docs} documentos, ${money(amount)}. PDF: ${report.expectedClients} clientes, ${report.expectedDocs} documentos, ${money(report.expectedAmount)}. Nenhum dado foi substituído.`);
 }
 const previous=new Map(state.clients.map(c=>[c.id,c]));
 state.clients=report.clients.map(c=>{const old=previous.get(c.id);return old?{...c,status:old.status,lastOpen:old.lastOpen,markedAt:old.markedAt}:c});
 state.report={name:file.name,agent:report.agent,range:report.range,loadedAt:new Date().toISOString(),clients:report.expectedClients,docs:report.expectedDocs,amount:report.expectedAmount};
 save();render();$('status').textContent='Importação concluída: '+report.expectedClients+' clientes, '+report.expectedDocs+' documentos.';
 }catch(err){$('status').textContent='Não foi possível importar.';warn(err.message||String(err))}finally{$('pdf').value=''}}
function message(c){const first=c.name.trim().split(/\s+/)[0];return state.template.replace(/\{nome\}/gi,c.name).replace(/\{primeiro_nome\}/gi,first).replace(/\{data\}/gi,c.due).replace(/\{valor\}/gi,money(c.amount))}
function openWhatsApp(id){const c=state.clients.find(x=>x.id===id);if(!c||!c.phone)return;const url='https://wa.me/'+c.phone+'?text='+encodeURIComponent(message(c));c.lastOpen=new Date().toISOString();save();render();const w=window.open(url,'_blank','noopener,noreferrer');if(!w)location.href=url}
function setStatus(id,status){const c=state.clients.find(x=>x.id===id);if(!c)return;c.status=status;c.markedAt=new Date().toISOString();save();render()}
function render(){const cs=state.clients;const pending=cs.filter(c=>c.status==='pending');$('nClients').textContent=cs.length;$('nPending').textContent=pending.length;$('nSent').textContent=cs.filter(c=>c.status==='sent').length;$('nMissing').textContent=cs.filter(c=>!c.phone).length;$('nAmount').textContent=money(cs.reduce((a,c)=>a+c.amount,0));$('meta').textContent=state.report?`${state.report.agent} • ${state.report.range?.join(' a ')||''} • ${state.report.docs} documentos • ${state.report.name}`:'Importe um relatório para começar.';
 const query=$('search').value.toLocaleLowerCase('pt-BR');const filter=$('filter').value;
 const shown=cs.filter(c=>(c.name+' '+c.city+' '+c.code).toLocaleLowerCase('pt-BR').includes(query)).filter(c=>filter==='all'||(filter==='missing'?!c.phone:c.status===filter));
 $('list').innerHTML=shown.length?shown.map(c=>`<div class="client"><div><h4>${escapeHTML(c.name)}</h4><div class="detail">${escapeHTML(c.city||'Cidade não informada')} • ${escapeHTML(c.agent)} • Venc. ${escapeHTML(c.due)} • <b>${money(c.amount)}</b></div><div class="detail">${c.phone?escapeHTML('+'+c.phone):'Sem telefone do cliente'} • ${c.docs.length} parcela(s) • <span class="tag ${c.status==='sent'?'sent':c.status==='skip'?'skip':''}">${{pending:'Pendente',sent:'Marcado enviado',skip:'Não enviar'}[c.status]||'Pendente'}</span>${c.lastOpen?' • WhatsApp aberto anteriormente':''}</div></div><div class="client-actions"><button class="wa" data-open="${escapeHTML(c.id)}" ${!c.phone||c.status==='skip'?'disabled':''}>WhatsApp ↗</button><button data-mark="${escapeHTML(c.id)}" data-value="sent">Marcar enviado</button><button data-mark="${escapeHTML(c.id)}" data-value="skip">Não enviar</button><button data-mark="${escapeHTML(c.id)}" data-value="pending">Reabrir</button></div></div>`).join(''):'<p class="empty">Nenhum cliente encontrado.</p>';
 document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>openWhatsApp(el.dataset.open));document.querySelectorAll('[data-mark]').forEach(el=>el.onclick=()=>setStatus(el.dataset.mark,el.dataset.value));
}
$('pdf').onchange=e=>importPDF(e.target.files[0]);$('search').oninput=render;$('filter').onchange=render;$('template').value=state.template;$('template').oninput=e=>{state.template=e.target.value;save()};$('reset').onclick=()=>{if(confirm('Restaurar o texto padrão?')){state.template=DEFAULT;$('template').value=DEFAULT;save()}};
$('backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CMBrasil_Preventiva_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('restore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.clients)||typeof data.template!=='string')throw Error('Backup inválido.');if(!confirm('Substituir os dados atuais pelos do backup?'))return;state=data;save();$('template').value=state.template;warn('');render()}catch(err){warn(err.message)}finally{e.target.value=''}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
