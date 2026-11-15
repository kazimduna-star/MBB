import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';
import {buildWorld,G} from './world.js';
import {Animator} from './animator.js';

const $=id=>document.getElementById(id), cl=(v,a,b)=>Math.min(b,Math.max(a,v));
const cv=$('c'), R=new THREE.WebGLRenderer({canvas:cv,antialias:true});
R.setPixelRatio(Math.min(devicePixelRatio,2)); R.setSize(innerWidth,innerHeight);
R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;
R.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,700);
const world=buildWorld(scene);
const player=new THREE.Group(), pos=player.position; scene.add(player);

// планер
const glider=new THREE.Mesh(new THREE.BoxGeometry(2.6,.03,1),new THREE.MeshBasicMaterial({color:0xffd36b}));
glider.position.set(0,1.35,-.15); glider.visible=false; player.add(glider);

// ---- загрузка модели ----
let vrm,anim;
const loader=new GLTFLoader(); loader.register(p=>new VRMLoaderPlugin(p));
loader.load('girl.vrm',gltf=>{
  vrm=gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse(o=>{o.frustumCulled=false; if(o.isMesh)o.castShadow=true;});
  player.add(vrm.scene); anim=new Animator(vrm); $('load').remove();
},e=>{$('pct').textContent=Math.round(e.loaded/(e.total||22780164)*100)+'%'},
err=>{$('load').textContent='Не удалось загрузить girl.vrm: '+err.message});

// ---- ввод ----
const K={}, joy={x:0,y:0}; let jump=false, sprintBtn=false;
addEventListener('keydown',e=>{K[e.code]=1; if(e.code==='Space'){jump=true;e.preventDefault();} if(e.code==='KeyF'&&anim)anim.wave();});
addEventListener('keyup',e=>K[e.code]=0);
let yaw=Math.PI,pitch=.35,dist=5.5,ld=null;
cv.onpointerdown=e=>{ld={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)};
cv.onpointermove=e=>{
  let dx,dy;
  if(document.pointerLockElement===cv){dx=e.movementX;dy=e.movementY;}
  else if(ld&&ld.id===e.pointerId){dx=e.clientX-ld.x;dy=e.clientY-ld.y;ld.x=e.clientX;ld.y=e.clientY;}
  else return;
  yaw-=dx*.005; pitch=cl(pitch+dy*.005,-.2,1.25);
};
cv.onpointerup=e=>{if(ld&&ld.id===e.pointerId)ld=null};
cv.ondblclick=()=>cv.requestPointerLock&&cv.requestPointerLock();
cv.addEventListener('wheel',e=>{dist=cl(dist+e.deltaY*.005,2.5,12)},{passive:true});
// сенсорные кнопки
const st=$('stick'),kn=$('knob'); let sid=null;
const sm=e=>{const r=st.getBoundingClientRect(),dx=e.clientX-(r.left+60),dy=e.clientY-(r.top+60),l=Math.min(1,Math.hypot(dx,dy)/50),a=Math.atan2(dy,dx);
  joy.x=Math.cos(a)*l;joy.y=Math.sin(a)*l;kn.style.transform=`translate(${joy.x*45}px,${joy.y*45}px)`};
st.onpointerdown=e=>{sid=e.pointerId;st.setPointerCapture(sid);sm(e)};
st.onpointermove=e=>{if(e.pointerId===sid)sm(e)};
st.onpointerup=st.onpointercancel=()=>{sid=null;joy.x=joy.y=0;kn.style.transform=''};
$('bj').onpointerdown=()=>jump=true;
$('bs').onpointerdown=()=>sprintBtn=!sprintBtn;
$('bw').onpointerdown=()=>anim&&anim.wave();

// ---- звук ----
let AC; const chime=()=>{try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime;
  o.frequency.setValueAtTime(880,n);o.frequency.exponentialRampToValueAtTime(1760,n+.15);
  g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.4);o.connect(g).connect(AC.destination);o.start();o.stop(n+.4)}catch(e){}};

// ---- физика и игровой цикл ----
let vy=0,grounded=true,glide=false,face=0,hvx=0,hvz=0,score=0;
const total=world.orbs.length;
function step(dt){
  let ix=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0)+joy.x;
  let iz=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)-joy.y;
  const L=Math.min(1,Math.hypot(ix,iz)); if(L>0){const m=Math.hypot(ix,iz);ix/=m;iz/=m;}
  const sy=Math.sin(yaw),cy=Math.cos(yaw);
  let dx=-sy*iz+cy*ix, dz=-cy*iz-sy*ix;
  const spr=K.ShiftLeft||K.ShiftRight||sprintBtn;
  let spd=L*(spr?10:6.5);
  if(glide){spd=11; if(L<.1){dx=Math.sin(face);dz=Math.cos(face);}}
  const k=1-Math.exp(-(grounded?12:glide?4:3)*dt);
  hvx+=(dx*spd-hvx)*k; hvz+=(dz*spd-hvz)*k;
  const sp=Math.hypot(hvx,hvz);
  if(sp>.4){let d=Math.atan2(hvx,hvz)-face; d=Math.atan2(Math.sin(d),Math.cos(d)); face+=d*(1-Math.exp(-12*dt));}
  player.rotation.y=face;

  if(jump){jump=false; if(grounded){vy=9.5;grounded=false;} else glide=!glide;}
  vy-=26*dt; if(glide)vy=Math.max(vy,-2.8);
  pos.x=cl(pos.x+hvx*dt,-170,170); pos.z=cl(pos.z+hvz*dt,-170,170); pos.y+=vy*dt;
  const gy=G(pos.x,pos.z); let landed=false;
  if(pos.y<=gy){landed=!grounded&&vy<-8; pos.y=gy;vy=0;grounded=true;glide=false;}
  else if(grounded){ if(pos.y-gy<.7)pos.y=gy; else grounded=false; }
  glider.visible=glide;

  // сферы
  for(let i=world.orbs.length-1;i>=0;i--){
    const o=world.orbs[i];
    if(o.position.distanceTo(new THREE.Vector3(pos.x,pos.y+1,pos.z))<1.8){
      scene.remove(o); world.orbs.splice(i,1); score++; chime();
      $('score').textContent=score>=total?'✦ Все сферы собраны! ✨':`✦ ${score} / ${total}`;
    }
  }
  anim.update(dt,{sp,ground:grounded,vy,glide,landed});
  vrm.update(dt);

  // камера
  const tg=new THREE.Vector3(pos.x,pos.y+1.35,pos.z);
  const want=tg.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(dist));
  want.y=Math.max(want.y,G(want.x,want.z)+.6);
  cam.position.lerp(want,1-Math.exp(-10*dt)); cam.lookAt(tg);
}
const clock=new THREE.Clock(); let t=0;
(function loop(){
  const dt=Math.min(clock.getDelta(),.05); t+=dt;
  if(vrm)step(dt);
  world.update(t,dt,pos,cam.position);
  R.render(scene,cam); requestAnimationFrame(loop);
})();
addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
