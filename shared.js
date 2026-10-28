/* KIDORA shared logic: state, sidebar/topbar, XP, badges, confetti */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const rand=n=>Math.floor(Math.random()*n);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const ds=(d=new Date())=>d.toLocaleDateString('en-CA');

const LEVELS=[['Seedling',0],['Explorer',1000],['Adventurer',2000],['Pioneer',3500],['Legend',5000]];
const AVATARS=[['🧑🏻',0],['🦊',0],['🐼',1000],['🦄',2000],['🐉',3500],['🚀',5000]];
const BADGES=[
  {id:'spark',icon:'⚡',name:'7-Day Spark',desc:'Reach a 7 day streak',test:s=>s.streak>=7},
  {id:'curious',icon:'🔭',name:'Curious Mind',desc:'Finish 3 lessons',test:s=>s.done.length>=3},
  {id:'scholar',icon:'🎓',name:'Little Scholar',desc:'Finish 8 lessons',test:s=>s.done.length>=8},
  {id:'thinker',icon:'🧠',name:'Quick Thinker',desc:'Play 3 challenges',test:s=>s.games>=3},
  {id:'lightning',icon:'🌩️',name:'Lightning Fingers',desc:'Score 10+ in Speed Math',test:s=>s.speedBest>=10},
  {id:'master',icon:'🃏',name:'Memory Master',desc:'Win Memory Match',test:s=>s.memWins>=1},
  {id:'chatter',icon:'💬',name:'Chatterbox',desc:'Ask Buddy 3 questions',test:s=>s.chats>=3},
  {id:'lucky',icon:'🍀',name:'Lucky Spinner',desc:'Spin the daily wheel',test:s=>s.spins>=1},
  {id:'rocket',icon:'🚀',name:'Rocket Learner',desc:'Reach 2,000 XP',test:s=>s.xp>=2000},
  {id:'legend',icon:'👑',name:'KIDORA Legend',desc:'Reach 5,000 XP',test:s=>s.xp>=5000}
];
const DEF={name:'Super Learner',avatar:'🧑🏻',xp:1240,streak:7,done:[],games:0,speedBest:0,memWins:0,chats:0,spins:0,lastSpin:'',goal:3,accent:'#7557ff',sound:true,todayDate:'',todayN:0,todayXP:0,lastDay:'',seen:null};
let S;
try{S={...DEF,...JSON.parse(localStorage.getItem('kidora')||'{}')}}catch(e){S={...DEF}}
function save(){try{localStorage.setItem('kidora',JSON.stringify(S))}catch(e){}}

/* daily rollover + streak */
(function(){
  const t=ds();
  if(S.lastDay!==t){
    const y=ds(new Date(Date.now()-864e5));
    if(S.lastDay)S.streak=S.lastDay===y?S.streak+1:1;
    S.lastDay=t;S.todayDate=t;S.todayN=0;S.todayXP=0;
  }
  if(!S.seen)S.seen=BADGES.filter(b=>b.test(S)).map(b=>b.id);
  save();
  document.documentElement.style.setProperty('--purple',S.accent);
})();

function levelInfo(xp){
  let i=0;LEVELS.forEach((l,k)=>{if(xp>=l[1])i=k});
  const c=LEVELS[i],n=LEVELS[i+1];
  return{i,name:c[0],next:n?n[0]:null,pct:n?Math.round((xp-c[1])/(n[1]-c[1])*100):100,toNext:n?n[1]-xp:0};
}
const fmt=n=>n.toLocaleString('en-US');

/* toast, sound, confetti */
let _t;
function toast(msg){
  let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('show');clearTimeout(_t);_t=setTimeout(()=>el.classList.remove('show'),2800);
}
function beep(kind){
  if(!S.sound)return;
  try{
    const c=new(window.AudioContext||window.webkitAudioContext)();
    const seq=kind==='bad'?[190]:kind==='up'?[520,660,880]:[660,820];
    seq.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.value=.05;o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.1);o.stop(c.currentTime+i*.1+.12)});
  }catch(e){}
}
function confetti(n=110){
  const c=document.createElement('canvas');c.className='confetti';document.body.appendChild(c);
  const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const cols=['#7557ff','#ff5c8a','#4fd6d0','#c8f45b','#ffd866'];
  const p=Array.from({length:n},()=>({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*.6,vx:(Math.random()-.5)*14,vy:-Math.random()*16-4,s:5+Math.random()*7,c:cols[rand(5)],r:Math.random()*6}));
  let f=0;
  (function tick(){
    x.clearRect(0,0,c.width,c.height);
    p.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.45;q.r+=.2;x.save();x.translate(q.x,q.y);x.rotate(q.r);x.fillStyle=q.c;x.fillRect(-q.s/2,-q.s/2,q.s,q.s*.6);x.restore()});
    if(++f<110)requestAnimationFrame(tick);else c.remove();
  })();
}

/* XP + badges */
function checkBadges(){
  BADGES.forEach(b=>{
    if(b.test(S)&&!S.seen.includes(b.id)){
      S.seen.push(b.id);save();
      setTimeout(()=>{toast(`${b.icon} New badge: ${b.name}!`);confetti(140)},900);
    }
  });
}
function addXP(n,msg,count=true){
  const before=levelInfo(S.xp).i;
  if(S.todayDate!==ds()){S.todayDate=ds();S.todayN=0;S.todayXP=0}
  S.xp+=n;S.todayXP+=n;if(count)S.todayN++;
  save();
  const after=levelInfo(S.xp);
  if(after.i>before){toast(`🎉 LEVEL UP! You are now a ${after.name}!`);confetti(180);beep('up')}
  else{toast(`✦ +${n} XP · ${msg}`);beep('ok')}
  checkBadges();refreshChrome();
  document.dispatchEvent(new Event('kidora:update'));
}

/* sidebar + topbar */
const NAV=[['index.html','◉','Overview','overview'],['learning-hub.html','▣','Learning Hub','hub'],['challenge-lab.html','◇','Challenge Lab','lab'],['ai-buddy.html','✦','AI Buddy','buddy'],['rewards.html','♢','Rewards','rewards']];
const NAV2=[['settings.html','⚙','Settings','settings'],['help.html','?','Help Center','help']];
function refreshChrome(){
  const page=document.body.dataset.page,li=levelInfo(S.xp);
  const link=([h,i,t,k])=>`<a href="${h}" class="${k===page?'active':''}">${i} <span>${t}</span></a>`;
  const sb=$('#sidebar');
  if(sb)sb.innerHTML=`
    <div class="brand"><div class="brand-mark">✦</div><div><b>KIDORA</b><small>LEARN BEYOND</small></div></div>
    <div class="menu-label">Workspace</div><nav class="nav">${NAV.map(link).join('')}</nav>
    <div class="menu-label">Account</div><nav class="nav secondary">${NAV2.map(link).join('')}</nav>
    <div class="side-bottom"><small>Level</small><div class="lv">${li.name} · ${fmt(S.xp)} XP</div>
      <div class="mini-bar"><i style="width:${li.pct}%"></i></div>
      <a class="upgrade" href="challenge-lab.html">Start Quest →</a></div>`;
  const tb=$('#topbar');
  if(tb){
    const h=new Date().getHours(),g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
    const d=new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    const q=tb.querySelector('.search')?.value||'';
    tb.innerHTML=`<div class="greeting">${d} · <b>${g}, ${S.name.replace(/</g,'&lt;')} 👋</b></div>
      <div class="actions"><input class="search" placeholder="Search lessons..." value="${q.replace(/"/g,'&quot;')}"><a class="icon-btn" href="help.html" title="Help">?</a><a class="avatar" href="settings.html" title="Settings">${S.avatar}</a></div>`;
    tb.querySelector('.search').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.value.trim())location.href='learning-hub.html?q='+encodeURIComponent(e.target.value.trim())});
  }
}
document.addEventListener('DOMContentLoaded',()=>{refreshChrome();checkBadges()});
