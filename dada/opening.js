// Clip time equals timeline time; the final fade continues after the 25 s story.
gsap.registerPlugin(SplitText, MotionPathPlugin);
gsap.ticker.lagSmoothing(0);
function attachMusic(tl, audio, button, reduced = false) {
 let on = !reduced, held = false;
 const gate = document.querySelector('[data-start]');
 const host = document.querySelector('#star');
 const bubble = document.querySelector('.gate-bubble');
 let wave, bob;
 const hideGate = () => {
  gate.hidden = true; bubble.hidden = true;
  wave?.kill(); bob?.kill();
  host.classList.remove('gate-host');
 };
 const showGate = () => {
  tl.timeScale(1);
  gate.hidden = false; bubble.hidden = false;
  host.classList.add('gate-host');
  gsap.set(host,{autoAlpha:1,x:0,y:0,rotation:-6,scale:1});
  if (!reduced) {
   wave=gsap.to(host,{rotation:6,duration:.8,repeat:-1,yoyo:true,ease:'sine.inOut'});
   bob=gsap.to(bubble,{y:-4,duration:.8,repeat:-1,yoyo:true,ease:'sine.inOut'});
  }
 };
 const exitGate = () => {
  // A disposable visual keeps the hop independent of seekable scene state.
  const hop=host.cloneNode(true);
  hop.removeAttribute('id'); hop.className='gate-host gate-exit';
  hop.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  host.parentElement.append(hop);
  gsap.set(hop,{x:0,y:0,rotation:0,autoAlpha:1});
  gsap.timeline({onComplete:()=>hop.remove()})
   .to(hop,{scaleX:1.15,scaleY:.8,duration:.08})
   .to(hop,{x:stage.clientWidth,y:-65,scaleX:.95,scaleY:1.05,duration:.22,ease:'power2.out'})
   .to(hop,{y:20,duration:.14,ease:'power2.in'});
  gsap.to(bubble,{scale:0,autoAlpha:0,duration:.15});
  gsap.to(gate,{scale:0,autoAlpha:0,duration:.18,onComplete:()=>{gate.hidden=true;}});
  wave?.kill(); bob?.kill(); bubble.hidden=true;
  host.classList.remove('gate-host');
 };
 audio.volume = 1;
 const play = () => audio.play().catch(() => {
  on = false; audio.pause(); render();
 });
 const render = () => {
  button.setAttribute('aria-pressed', String(on));
  button.textContent = on ? '🔇 關配樂' : '🔊 開配樂';
 };
 let lastCheck = 0, lastFrame = performance.now();
 const stats = {corrections:0, largest:0, long:0};
 const debug = new URLSearchParams(location.search).get('debug') === 'sync';
 const overlay = debug ? document.createElement('output') : null;
 if (overlay) { overlay.className='sync-debug'; stage.append(overlay); }
 const paintStats = () => { if(overlay) overlay.textContent=`sync corrections: ${stats.corrections} | largest: ${stats.largest.toFixed(3)} s | long frames > 50 ms: ${stats.long}`; };
 paintStats();
 const startAt = t => { tl.timeScale(1); audio.currentTime = t; tl.time(t); return audio.play(); };
 const sync = () => {
  const frame = performance.now();
  if (overlay && !tl.paused() && !document.hidden && frame-lastFrame>50) stats.long++;
  lastFrame=frame; paintStats();
  if (!on || held || reduced || document.hidden || audio.paused || tl.paused() || tl.progress() >= 1) return;
  const now = performance.now();
  if (now - lastCheck < 250) return;
  lastCheck = now;
  const drift = tl.time() - audio.currentTime;
  if (Math.abs(drift)>1) {
   stats.corrections++; stats.largest=Math.max(stats.largest,Math.abs(drift));
   tl.timeScale(1); tl.time(audio.currentTime);
  } else {
   const rate = Math.abs(drift)<.05 ? 1 : 1-gsap.utils.clamp(-.1,.1,drift*.5);
   if(rate!==1) { stats.corrections++; stats.largest=Math.max(stats.largest,Math.abs(drift)); }
   tl.timeScale(rate);
  }
  paintStats();
 };
 gsap.ticker.add(sync);
 const toggle = () => {
  on = !on; render();
  if (!on) { tl.timeScale(1); audio.pause(); return; }
  held = false;
  if (!reduced && tl.progress() >= 1) tl.restart();
  startAt(reduced ? 0 : tl.time()).catch(() => { on=false; audio.pause(); render(); });
 };
 const visibility = () => {
  if (document.hidden) audio.pause();
  else if (on && !held && !tl.paused() && tl.progress() < 1) {
   audio.currentTime = tl.time(); play();
  }
 };
 button.addEventListener('click', toggle);
 document.addEventListener('visibilitychange', visibility);
 render();
 return {
  start() {
   if (reduced) return;
   render();
   const begin = (clicked = false) => {
    on = true; held = false; render();
    return startAt(0).then(() => { if(clicked)exitGate();else hideGate(); tl.restart(); });
   };
   gate.onclick = () => { begin(true).catch(() => { showGate(); }); };
   begin().catch(() => { tl.pause(0); showGate(); });
  },
  stop() {
   tl.timeScale(1);
   hideGate();
   held = true; audio.pause();
  },
  restart() {
   tl.timeScale(1);
   held = false;
   if (on) {audio.currentTime=0; if (!document.hidden) play();}
  },
  destroy() {
   tl.timeScale(1); overlay?.remove();
   held=true; gsap.ticker.remove(sync); audio.pause();
   button.removeEventListener('click', toggle);
   document.removeEventListener('visibilitychange', visibility);
  }
 };
}
// Finite, seekable story; pose switches are sets at the squash, never crossfades.
const stage = document.querySelector('#opening');
const q = s => stage.querySelectorAll(s);
const titleSplit = SplitText.create('.title-lines', {type:'lines', linesClass:'title-line'});
const cheerSplit = SplitText.create('.opening-title h1', {type:'chars', smartWrap:true});
const mm = gsap.matchMedia();
mm.add({reduce:'(prefers-reduced-motion: reduce)', normal:'(prefers-reduced-motion: no-preference)'}, context => {
 const reduced = context.conditions.reduce;
 const star=q('#star'), poses=q('.pose');
 gsap.set(poses,{autoAlpha:0});gsap.set(q('[data-pose="hello"]'),{autoAlpha:1});
 gsap.set(q('.court-wash,.cone,.floating-sticker,.court-board,.friend,.confetti,.opening-title,.speech,.opening-cta,#replay-opening,.nice,.hearts,.blush,.sweat,#ball'),{autoAlpha:0});
 const tl=gsap.timeline({paused:true,defaults:{duration:.3,ease:'power2.out'}});
 window.__opening=tl;
 const music=attachMusic(tl,stage.querySelector('#opening-music'),stage.querySelector('[data-sound]'),reduced);
 const starts=[0,3.5,7,11,14];
 starts.forEach((t,i)=>tl.addLabel('s'+(i+1),t));
 if(!reduced)tl.to(q('[data-sound]'),{scale:1.06,duration:.5,repeat:5,yoyo:true,ease:'sine.inOut'},0);
 const captions=q('.caption-scene');
 gsap.set(captions,{autoAlpha:0,y:8});
 captions.forEach((cap,i)=>{
  if(i)tl.to(captions[i-1],{autoAlpha:0,y:-4,duration:.2},starts[i]);
  tl.fromTo(cap,{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.4,immediateRender:false},starts[i]);
 });
 function swap(name,at){
  tl.to(star,{scaleX:1.08,scaleY:.9,duration:.24,ease:'power2.in'},at)
   .set(poses,{autoAlpha:0},at+.24).set(q(`[data-pose="${name}"]`),{autoAlpha:1},at+.24)
   .to(star,{scaleX:.96,scaleY:1.06,duration:.24},at+.24)
   .to(star,{scaleX:1,scaleY:1,duration:.4,ease:'back.out(3)'},at+.48);
 }
 tl.set(star,{x:()=>stage.clientWidth/2,rotation:-3},0)
  .to(q('.cone'),{autoAlpha:.45,stagger:.56,duration:.6},.2)
  .fromTo(q('.blush'),{scale:.6,autoAlpha:0},{scale:1.5,autoAlpha:.8,duration:1.2},.8)
  .to(q('.sweat'),{autoAlpha:1,y:8,duration:.6},1.3)
  .to(star,{x:0,rotation:0,duration:1},3.5)
  .to(q('.blush,.sweat'),{autoAlpha:0,duration:.6},3.5)
  .fromTo(q('.floating-sticker'),{y:-70,autoAlpha:0},{y:0,autoAlpha:1,stagger:.2,duration:.8},3.5);
 swap('question',3.5);
 tl.to(star,{x:-22,rotation:-4,duration:.36},5.2).to(star,{x:22,rotation:4,duration:.36},5.56)
  .to(q('.floating-sticker'),{y:-6,duration:.36,repeat:1,yoyo:true},4.7)

  .to(star,{x:0,rotation:0,duration:.6},5.92)
  .fromTo(q('.hearts'),{y:0,autoAlpha:1},{y:-60,autoAlpha:0,duration:1.2,immediateRender:false},6);
 swap('heart',5.7);
 tl.to(q('.court-wash'),{autoAlpha:1,duration:.8},7)
  .to(q('.lamp'),{autoAlpha:0,duration:.6},7)
  .fromTo(q('.court-board'),{y:30,autoAlpha:0},{y:0,autoAlpha:1,duration:.6},7);
 // Each crossing takes one second; all rallies stop within this scene.
 q('.court-ball').forEach((ball,i)=>tl.fromTo(ball,{x:0,y:0},{x:i===0?60:30,y:i===0?-4:i===3?0:-20,duration:1,repeat:2,yoyo:i!==3,ease:i===0||i===3?'none':'sine.inOut'},7.4));
 swap('keep',7.5);swap('serve',9.2);
 tl.to(star,{x:-10,rotation:-4,duration:.4},8.5)
  .to(star,{x:14,rotation:3,duration:.24,ease:'power3.out'},9.7)
  .fromTo(q('#ball'),{x:0,y:0,autoAlpha:1},{x:155,y:-60,autoAlpha:0,duration:1,immediateRender:false},9.7)
  .to(star,{x:0,rotation:0,duration:.7},10)
  .fromTo(q('.nice'),{scale:.3,autoAlpha:0},{scale:1,autoAlpha:1,duration:.6,ease:'back.out(2)'},10)
  .to(q('.nice'),{autoAlpha:0,duration:.4},10.6)
  .to(q('.court-board'),{autoAlpha:.22,duration:.6},11)
  .fromTo(q('.friend'),{scale:0,y:25,autoAlpha:0},{scale:1,y:0,autoAlpha:1,stagger:.24,duration:.6,ease:'back.out(2)'},11);
 q('.friend').forEach((friend,i)=>tl.to(friend,{rotation:i%2?-12:12,y:-10,duration:.3,repeat:1,yoyo:true},11.4+i*.2));
 swap('jump',11);
 tl.to(star,{y:-45,duration:.48},11.9).to(star,{y:0,scaleX:1.1,scaleY:.88,duration:.44,ease:'power2.in'},12.38).to(star,{scaleX:1,scaleY:1,duration:.4},12.82)
  .set(q('.opening-title'),{autoAlpha:1},11.3)
  .fromTo(cheerSplit.chars,{y:12,autoAlpha:0},{y:0,autoAlpha:1,stagger:.06,duration:.4},11.3);
 q('.confetti').forEach((piece,i)=>tl.fromTo(piece,{x:0,y:0,scale:0,autoAlpha:0},{x:Math.sin(i*2.4)*stage.clientWidth*.42,y:-70-(i%5)*30,rotation:(i*137)%360,scale:1,autoAlpha:1,duration:.7},11.7).to(piece,{y:100,autoAlpha:0,duration:1.5},12.4));
 swap('hello',14);
 tl.to(star,{rotation:-6,duration:.32},15.7).to(star,{rotation:6,duration:.3,repeat:1,yoyo:true},16.02)
  .to(star,{rotation:0,duration:.38},16.62)
  .fromTo(q('.speech'),{scale:.3,autoAlpha:0},{scale:1,autoAlpha:1,duration:.6,ease:'back.out(1.7)'},14.6)
  .to(q('.opening-cta,#replay-opening'),{autoAlpha:1,duration:.6},15)
  .to(q('#skip-opening'),{autoAlpha:0,duration:.6},16)
  .set({}, {},17);
 // Map each original scene to its specified slower interval, including pose holds.
 const oldStarts=[0,3.5,7,11,14], newStarts=[5.5,9.5,13.5,18,21.5], lengths=[4,4,4.5,3.5,3.5], oldLengths=[3.5,3.5,4,3,3];
 tl.getChildren(false,true,true).forEach(child=>{
  const at=child.startTime();
  const i=Math.max(0,oldStarts.findLastIndex(t=>at>=t));
  const ratio=lengths[i]/oldLengths[i];
  child.duration(child.duration()*ratio);
  child.startTime(newStarts[i]+(at-oldStarts[i])*ratio);
  // Serve pose and launch share the song drop at 16 seconds.
  if (i===2 && Math.abs(at-9.44)<.001) child.startTime(16);
  if (i===2 && Math.abs(at-9.7)<.001) child.startTime(16);
 });

 tl.getChildren(false,true,false).forEach(child=>{
  if (Math.abs(child.startTime()-(9.5+2.44*4/3.5))<.0001 && child.duration()===0 && child.targets().some(e=>e.classList?.contains('pose'))) child.startTime(12.3);
 });
 // Absolute clip times: plugin travel and hold motion stay deterministic on seek.
 tl.to(q('.pick-xiaoxin'),{motionPath:{path:[{x:0,y:0},{x:60,y:-65},{x:stage.clientWidth<=600?82.5:99,y:stage.clientWidth<=600?160:210}],curviness:1.5},scale:.3,duration:.8,ease:'power2.inOut'},11.5)
  .to(q('.pick-xiaoxin'),{autoAlpha:0,duration:.15},12.3)
  .to(q('.pick-xiaobai,.pick-quiet'),{scale:1.15,duration:.12},11.5)
  .to(q('.pick-xiaobai,.pick-quiet'),{scale:0,autoAlpha:0,duration:.45,ease:'back.in(1.7)'},11.62)
  .set(poses,{autoAlpha:0},13.5).set(q('[data-pose="run"]'),{autoAlpha:1},13.5)
  .fromTo(star,{x:-80},{x:0,duration:.7,immediateRender:false},13.5)
  .set(q('.opening-title'),{autoAlpha:0},21.5);
 for(const [start,end] of [[6.3,9.45],[21.8,25]]){
  tl.fromTo(star,{scale:1},{scale:1.03,duration:1.6,repeat:1,yoyo:true,ease:'sine.inOut',immediateRender:false},start);
  tl.fromTo(star,{rotation:-3},{rotation:3,duration:.8,repeat:2,yoyo:true,ease:'sine.inOut',immediateRender:false},start);
  for(let t=start+.6;t+.16<end;t+=2.2)tl.to(star,{scaleY:.94,duration:.08},t).to(star,{scaleY:1,duration:.08},t+.08);
 }
 newStarts.forEach((at,i)=>tl.addLabel('s'+(i+1),at));
 tl.addLabel('title',0);
 gsap.set(star,{autoAlpha:0});
 tl.set(star,{autoAlpha:0},0).set(star,{autoAlpha:1},5.5);
 tl.fromTo(q('.stage-top>span'),{autoAlpha:0},{autoAlpha:1,duration:.3},5.5);
 tl.set(q('.title-card'),{autoAlpha:1},0);
 tl.set(q('.lamp-bulb'),{attr:{class:'lamp-bulb'},scale:1},0);
 // Positive y points down: each landing is y=0, with diminishing height.
 const ball=q('.prop-ball');
 tl.set(ball,{x:()=>-stage.clientWidth*.55,y:-180,autoAlpha:1},0)
  .to(ball,{x:0,duration:3,ease:'none'},0);
 for(let i=0;i<6;i++){
  const landing=(i+1)*.5, height=150-i*23;
  tl.set(q('.lamp-bulb')[i],{attr:{class:'lamp-bulb is-on'},scale:1.15},landing)
   .to(q('.lamp-bulb')[i],{scale:1,duration:.12},landing);
  if(i)tl.to(ball,{y:-height,duration:.25,ease:'power2.out'},landing-.5);
  tl.to(ball,{y:0,duration:i?.25:.5,ease:'power2.in'},i?landing-.25:0)
   .set(ball,{scaleX:1.25,scaleY:.75},landing)
   .to(ball,{scaleX:1,scaleY:1,duration:.12},landing);
 }
 tl.to(ball,{autoAlpha:0,duration:.2},3.2)
  .fromTo(q('.title-brand'),{y:-15,autoAlpha:0},{y:0,autoAlpha:1,duration:.35},3)
  .fromTo(titleSplit.lines,{scale:.7,y:15,autoAlpha:0},{scale:1,y:0,autoAlpha:1,stagger:.18,duration:.4,ease:'back.out(1.7)'},3.05)
  .fromTo(q('.title-guest'),{y:20,autoAlpha:0},{y:0,autoAlpha:1,duration:.35},3.45)
  .to(q('.title-card'),{autoAlpha:0,y:-25,duration:.5},5)
  .set({}, {},25);
 const breath=gsap.to(star,{scale:1.02,duration:2,repeat:-1,yoyo:true,ease:'sine.inOut',paused:true});
 let visible=true;
 tl.eventCallback('onComplete',()=>{if(!reduced&&visible)breath.play();});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&tl.progress()===1&&!reduced)breath.play();else breath.pause();});observer.observe(stage);
 document.querySelector('#skip-opening').onclick=()=>{music.stop();tl.progress(1).pause();};
 document.querySelector('#replay-opening').onclick=()=>{breath.pause().progress(0);music.restart();if(!reduced)tl.restart();};
 let disposed=false;
 const decoded = Promise.allSettled([...stage.querySelectorAll('img')].map(i=>i.decode()));
 let decodeTimer;
 Promise.race([decoded,new Promise(resolve=>{decodeTimer=setTimeout(resolve,1500);})]).then(()=>{
  clearTimeout(decodeTimer);
  if(!disposed) { if(reduced)tl.progress(1).pause();else music.start(); }
 });
 return()=>{disposed=true;clearTimeout(decodeTimer);music.destroy();observer.disconnect();breath.kill();tl.kill();};
});
