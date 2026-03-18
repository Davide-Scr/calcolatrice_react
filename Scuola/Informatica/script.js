// Game data and state
const levels = [
  {question: "Il Database ha perso la tabella 'eroi'. Come la ricrei?", options:[
    {t:"INSERT INTO eroi VALUES ('Tu','Coraggioso');",ok:false},
    {t:"CREATE TABLE eroi (nome VARCHAR(50), titolo VARCHAR(50));",ok:true},
    {t:"SELECT * FROM eroi;",ok:false},
    {t:"DROP TABLE eroi;",ok:false}
  ],badge:'DDL Maestro'},
  {question: "Il tuo nome è scomparso dalla tabella 'eroi'. Come lo reinserisci?", options:[
    {t:"UPDATE eroi SET nome='Tu' WHERE titolo='Coraggioso';",ok:false},
    {t:"INSERT INTO eroi (nome,titolo) VALUES ('Tu','Coraggioso');",ok:true},
    {t:"DROP TABLE eroi;",ok:false},
    {t:"ALTER TABLE eroi ADD nome;",ok:false}
  ],badge:'DML Eroe'},
  {question: "Vuoi permettere ad 'Apprendista' di leggere la tabella 'eroi'. Cosa fai?", options:[
    {t:"GRANT SELECT ON eroi TO Apprendista;",ok:true},
    {t:"ALLOW Apprendista TO READ eroi;",ok:false},
    {t:"PERMIT Apprendista SELECT eroi;",ok:false},
    {t:"GRANT ALL ON eroi TO Apprendista;",ok:false}
  ],badge:'DCL Custode'},
  {question: "Hai fatto un errore nell'aggiornamento. Come torni indietro?", options:[
    {t:"UNDO LAST;",ok:false},
    {t:"ROLLBACK;",ok:true},
    {t:"CANCEL TRANSACTION;",ok:false},
    {t:"SAVEPOINT;",ok:false}
  ],badge:'TCL Mago'}
];

// Game state
let current = 0;
const badges = [];
let hp = 100; const maxHp = 100;
let attacks = []; // {id,el,x,y,w,h,vx,vy}
let running = false;

// DOM refs (initialized after DOMContentLoaded)
let arena, soul, hpFill, questionEl, optionsEl, badgesEl, overlayIntro, overlayFinal, startBtn, retryBtn, levelLabel, levelNum, levelMax, finalBadges, hpText, hpMaxText, hpHearts;
let bgAudio, audioToggle, volSlider;

// runtime copy of levels (shuffled each play)
let gameLevels = [];

function shuffleArray(a){
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Soul movement state
const state = {x:0,y:0,spd:2,keys:{},w:18,h:18};

function resetSoulPos(){
  const rect = arena.getBoundingClientRect();
  state.x = (rect.width/2) - state.w/2;
  state.y = (rect.height/2) - state.h/2;
  updateSoulDom();
}

function updateSoulDom(){
  soul.style.left = state.x + 'px';
  soul.style.top = state.y + 'px';
}

window.addEventListener('resize', ()=>{ if(arena) resetSoulPos(); });
window.addEventListener('keydown', e=>{ state.keys[e.key.toLowerCase()] = true });
window.addEventListener('keyup', e=>{ state.keys[e.key.toLowerCase()] = false });

function spawnAttack(){
  const rect = arena.getBoundingClientRect();
  const side = Math.floor(Math.random()*4);
  let x,y,vx,vy,w=10+Math.random()*18,h=10+Math.random()*18,speed=1.2+Math.random()*2.2;
  if(side===0){ x = Math.random()*rect.width; y = -30; }
  if(side===1){ x = rect.width+30; y = Math.random()*rect.height; }
  if(side===2){ x = Math.random()*rect.width; y = rect.height+30; }
  if(side===3){ x = -30; y = Math.random()*rect.height; }
  const targetX = rect.width/2 + (Math.random()-0.5)*120;
  const targetY = rect.height/2 + (Math.random()-0.5)*120;
  const dx = targetX - x, dy = targetY - y, d = Math.hypot(dx,dy) || 1;
  vx = (dx/d)*speed; vy = (dy/d)*speed;

  const el = document.createElement('div');
  el.className = 'attack'; el.style.width = w+'px'; el.style.height = h+'px';
  el.style.left = x+'px'; el.style.top = y+'px';
  arena.appendChild(el);
  const a = {id:Date.now()+Math.random(),el,x,y,w,h,vx,vy};
  attacks.push(a);
}

let spawnTimer = 0;
let spawnInterval = 900; // ms

function gameTick(delta){
  if(!running) return;
  // move soul
  let dx=0,dy=0; if(state.keys['arrowup']||state.keys['w']) dy -= state.spd; if(state.keys['arrowdown']||state.keys['s']) dy += state.spd; if(state.keys['arrowleft']||state.keys['a']) dx -= state.spd; if(state.keys['arrowright']||state.keys['d']) dx += state.spd;
  const rect = arena.getBoundingClientRect();
  state.x = Math.max(0,Math.min(rect.width - state.w, state.x + dx));
  state.y = Math.max(0,Math.min(rect.height - state.h, state.y + dy));
  updateSoulDom();

  // spawn
  spawnTimer += delta;
  const levelSpeedFactor = 1 + (current*0.18);
  if(spawnTimer > spawnInterval/levelSpeedFactor){ spawnTimer = 0; spawnAttack();
    if(Math.random() < 0.45 + current*0.05) spawnAttack();
  }

  // move attacks
  for(let i=attacks.length-1;i>=0;i--){
    const a = attacks[i]; a.x += a.vx*delta*0.06; a.y += a.vy*delta*0.06; 
    a.el.style.left = a.x+'px'; a.el.style.top = a.y+'px';
    if(a.x < -80 || a.x > rect.width+80 || a.y < -80 || a.y > rect.height+80){ a.el.remove(); attacks.splice(i,1); continue; }
    if(collides(a, state)){
      damage(12 + Math.floor(current*6));
      a.el.remove(); attacks.splice(i,1);
    }
  }
}

function collides(a, s){
  const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.w, ay2 = a.y + a.h;
  const sx1 = s.x, sy1 = s.y, sx2 = s.x + s.w, sy2 = s.y + s.h;
  return !(ax2 < sx1 || ax1 > sx2 || ay2 < sy1 || ay1 > sy2);
}

function damage(amount){ hp = Math.max(0, hp - amount); updateHp(); soul.style.filter = 'hue-rotate(-20deg) saturate(1.4)'; setTimeout(()=>soul.style.filter = '', 220); if(hp <= 0) gameOver(); }

function updateHp(){ 
  hpFill.style.width = (hp/maxHp*100)+'%'; 
  if(hpText) hpText.innerText = hp;
  if(hpMaxText) hpMaxText.innerText = maxHp;
  if(hpHearts){
    hpHearts.innerHTML = '';
    const hearts = 5; 
    const portion = hp / maxHp; 
    for(let i=0;i<hearts;i++){
      const heartPortion = (i+1)/hearts; 
      let icon = '🖤';
      if(portion >= heartPortion) icon = '❤️';
      else if(portion > (i/hearts)) icon = '💔';
      const span = document.createElement('span');
      span.innerText = icon;
      hpHearts.appendChild(span);
    }
  }
}

let lastTs = 0; function loop(ts){ if(!lastTs) lastTs = ts; const delta = ts - lastTs; lastTs = ts; gameTick(delta); requestAnimationFrame(loop); }

function loadLevel(i){
  current = i; levelNum.innerText = (i+1); levelLabel.innerText = 'Livello '+(i+1);
  const lvl = (gameLevels && gameLevels[i]) ? gameLevels[i] : levels[i];
  questionEl.innerText = lvl.question;
  optionsEl.innerHTML = '';
  lvl.options.forEach((opt,idx)=>{
    const btn = document.createElement('button'); btn.className='option'; btn.innerText = opt.t; btn.onclick = ()=>selectOption(opt,btn);
    optionsEl.appendChild(btn);
  });
  spawnInterval = Math.max(500, 900 - i*140);
}

function selectOption(opt,btn){
  Array.from(optionsEl.children).forEach(b=>b.disabled=true);
  if(opt.ok){ btn.classList.add('correct'); badges.push(levels[current].badge); renderBadges(); attacks.forEach(a=>a.el.remove()); attacks = []; setTimeout(()=>{ if(current+1 >= levels.length) finishGame(); else loadLevel(current+1); },900);
  } else { btn.classList.add('wrong'); damage(22); setTimeout(()=>{ if(hp>0) Array.from(optionsEl.children).forEach(b=>b.disabled=false); },700); }
}

function renderBadges(){ badgesEl.innerHTML = ''; badges.forEach(b=>{const s=document.createElement('div');s.className='badge';s.innerText=b;badgesEl.appendChild(s)}); }

function finishGame(){ running=false; overlayFinal.style.display='flex'; finalBadges.innerHTML=''; badges.forEach(b=>{const s=document.createElement('div');s.className='badge';s.innerText=b;finalBadges.appendChild(s)}); }

function gameOver(){ running=false; overlayFinal.style.display='flex'; document.getElementById('finalTitle').innerText='💀 GAME OVER'; document.getElementById('finalText').innerText='Il tuo cuore si è fermato. Riprova per salvare il database.'; finalBadges.innerHTML=''; try{ if(bgAudio && !bgAudio.paused){ bgAudio.pause(); audioToggle && (audioToggle.innerText='♪'); } }catch(e){} }

// Buttons wiring and audio
const bgAudioInit = ()=> document.getElementById('bgAudio');

function wireUI(){
  arena = document.getElementById('arenaCanvas');
  soul = document.getElementById('soul');
  hpFill = document.getElementById('hpFill');
  questionEl = document.getElementById('question');
  optionsEl = document.getElementById('options');
  badgesEl = document.getElementById('badges');
  overlayIntro = document.getElementById('overlayIntro');
  overlayFinal = document.getElementById('overlayFinal');
  startBtn = document.getElementById('startBtn');
  retryBtn = document.getElementById('retryBtn');
  levelLabel = document.getElementById('levelLabel');
  levelNum = document.getElementById('levelNum');
  levelMax = document.getElementById('levelMax');
  finalBadges = document.getElementById('finalBadges');
  hpText = document.getElementById('hpText');
  hpMaxText = document.getElementById('hpMax');
  hpHearts = document.getElementById('hpHearts');
  bgAudio = bgAudioInit();
  audioToggle = document.getElementById('audioToggle');
  volSlider = document.getElementById('volSlider');
  levelMax.innerText = levels.length;

  const storedVol = Number(localStorage.getItem('sqltale_volume'));
  if(!isNaN(storedVol) && volSlider){ volSlider.value = storedVol; }

  startBtn.onclick = ()=>{
    overlayIntro.style.display='none';
    gameLevels = levels.map(l => ({ question: l.question, options: shuffleArray(l.options.map(o=>({t:o.t, ok:o.ok}))), badge: l.badge }));
    running=true; resetSoulPos(); hp = maxHp; updateHp(); loadLevel(0); requestAnimationFrame(loop);
    if(bgAudio){ bgAudio.loop = true; bgAudio.volume = (volSlider ? Number(volSlider.value) : 0.55); bgAudio.play().then(()=>{ audioToggle.innerText = '⏸'; }).catch(()=>{ audioToggle.innerText = '♪'; }); }
  };

  volSlider && volSlider.addEventListener('input', (e)=>{ const v = Number(e.target.value); if(bgAudio) bgAudio.volume = v; localStorage.setItem('sqltale_volume', String(v)); });

  audioToggle && audioToggle.addEventListener('click', ()=>{ if(!bgAudio) return; if(bgAudio.paused){ bgAudio.play().then(()=>{ audioToggle.innerText = '⏸'; }).catch(()=>{ audioToggle.innerText = '♪'; }); } else { bgAudio.pause(); audioToggle.innerText = '♪'; } });

  retryBtn && (retryBtn.onclick = ()=>{ location.reload(); });

  resetSoulPos(); updateHp();
}

document.addEventListener('DOMContentLoaded', wireUI);
