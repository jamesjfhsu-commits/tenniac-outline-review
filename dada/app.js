import outline from './outline.js';
const $ = id => document.getElementById(id);
function el(tag, text, cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function rich(node,text){
  const tokens=String(text).split(/(【汪靜 Q\d+】|（(?:可選深度|待確認)[^）]*）|<br>|\*\*.*?\*\*)/g);
  for(const t of tokens){if(t==='<br>')node.append(el('br'));else if(t.startsWith('【汪靜'))node.append(el('span',t.slice(1,-1),'badge'));else if(/^（(?:可選深度|待確認)/.test(t))node.append(el('span',t,'pill'));else if(t.startsWith('**'))node.append(el('strong',t.slice(2,-2)));else node.append(document.createTextNode(t));}return node;
}
const sections=[['open','OPEN',outline.open],...outline.topics.map((t,i)=>[t.id,'Topic '+(i+1)+' · '+t.title,t]),['news','近期新聞',outline.news]];
for(const [id,title,data] of sections){
 const card=el('article',null,'outline-card');card.id=id;
 const heading=el('div',null,'section-heading');const text=el('div');text.append(el('p',id==='open'?'03 ／ THE CONVERSATION':id==='news'?'04 ／ AROUND THE COURT':'TOPIC 0'+id.slice(1),'eyebrow'),el('h2',title));
 const image=el('img');image.src='../assets/stickers/'+({open:'hello',t1:'serve',t2:'hello',t3:'run',news:'news'}[id])+'.webp';image.alt='';image.width=72;image.height=72;heading.append(text,image);card.append(heading);
 if(id==='open')card.append(rich(el('p'),data));
 else if(id==='news'){const link=el('a',data.label);link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';const list=el('ul');data.points.forEach(p=>list.append(rich(el('li'),p)));card.append(link,list);}
 else {const parts=el('div',null,'parts');for(const p of data.parts){const block=el('div',null,'part');block.append(el('h3',p.lead),rich(el('p'),p.text.replace(/<br>$/,'')));if(p.backup){const detail=el('details');detail.append(el('summary','備用追問'),rich(el('p'),p.text.replace(/<br>$/,'')));card.append(detail);}else parts.append(block);}card.insertBefore(parts,card.children[1]||null);}
 $('outline').append(card);
}
const KEY='outline-review-dada-v1';let fields={};try{const stored=JSON.parse(localStorage.getItem(KEY)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))fields=stored;}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(fields));}catch{}renderPreview();}
function bind(node,key){node.value=fields[key]||'';node.addEventListener('input',()=>{fields[key]=node.value;save();});node.addEventListener('change',()=>{fields[key]=node.value;save();});}
for(const [id,title]of sections){const f=el('fieldset');f.append(el('legend',id.startsWith('t')?'Topic '+id.slice(1):title));const choices=el('div',null,'actions');choices.setAttribute('role','group');choices.setAttribute('aria-label',title+'的評價');for(const value of ['保留','要修改','有疑問']){const b=el('button',value);b.type='button';b.setAttribute('aria-pressed',String(fields[id+':choice']===value));b.addEventListener('click',()=>{fields[id+':choice']=fields[id+':choice']===value?'':value;for(const other of choices.children)other.setAttribute('aria-pressed',String(other.textContent===fields[id+':choice']));save();});choices.append(b);}const label=el('label','我的建議');label.htmlFor=id+'-note';const note=el('textarea');note.id=id+'-note';note.rows=3;bind(note,id+':note');f.append(choices,label,note);$('review-fields').append(f);}
for(const id of ['name','role','story-fill','story-line'])bind($(id),id);
function compile(){const lines=['訪綱回饋｜'+outline.title,'名字：'+(fields.name||''),'身分：'+(fields.role||'')];for(const [id,title]of sections){if(fields[id+':choice']||fields[id+':note'])lines.push('',title+'｜'+(fields[id+':choice']||''),fields[id+':note']||'');}if(fields['story-fill'])lines.push('','第一次來達達，我最想先'+fields['story-fill']+'。');if(fields['story-line'])lines.push('','這集最想讓聽眾帶走的一句話：'+fields['story-line']);return lines.join('\n');}
function renderPreview(){$('preview').textContent=compile();}
async function copy(){try{await navigator.clipboard.writeText(compile());return true;}catch{const range=document.createRange();range.selectNodeContents($('preview'));getSelection().removeAllRanges();getSelection().addRange(range);$('preview').focus();return false;}}
$('copy').onclick=async()=>{$('message').textContent=await copy()?'回饋已複製。':'請複製已選取的回饋文字。';};
$('mail').onclick=async()=>{if(!$('name').value.trim()){$('name').focus();$('message').textContent='請先填寫名字。';return;}const href=body=>'mailto:service@tenniactennis.com?subject='+encodeURIComponent('【訪綱回饋】達達運動｜'+fields.name)+'&body='+encodeURIComponent(body);let body=compile();if(href(body).length>1900){const copied=await copy();const note='\n\n（內容較長，請貼上完整回饋）';while(body.length&&href(body+note).length>1900)body=body.slice(0,-50);body+=note;$('message').textContent=copied?'完整回饋已複製，請貼到信件中。':'請複製已選取的完整回饋，貼到信件中。';}else $('message').textContent='請在郵件程式中確認並寄出。';location.href=href(body);};
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([compile()],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='達達訪綱回饋.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('clear').onclick=()=>{if(confirm('確定清除你在此頁的所有回饋？')){fields={};save();location.reload();}};renderPreview();
const welcomes={heart:'說聲嗨就好，今天先交一個球友。',wink:'穿上白色，一起當今天最整齊的那一隊。',jump:'打完球再乾杯，記得量力而為。'};
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.party-buttons [data-pose]').forEach(button=>button.onclick=()=>{const pose=button.dataset.pose;const image=$('party-mascot');image.src='../assets/stickers/'+pose+'.webp';image.alt='小球怪示意'+button.textContent;$('welcome').textContent=welcomes[pose];document.querySelectorAll('.party-buttons [data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(!reduced)gsap.fromTo(image,{scale:.8,autoAlpha:.6},{scale:1,autoAlpha:1,duration:.35,ease:'back.out(1.7)',overwrite:true});});
window.reviewDebug={compile};
