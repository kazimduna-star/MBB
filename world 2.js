import * as THREE from 'three';
const rnd=(a,b)=>a+Math.random()*(b-a);
const up=new THREE.Vector3(0,1,0);

// высота рельефа
export const H=(x,z)=>{
  const d=Math.hypot(x,z), k=Math.min(1,Math.max(0,(d-12)/20));
  let h=(Math.sin(x*.045)*3.2+Math.cos(z*.05)*2.6+Math.sin((x+z)*.11)*.9+Math.sin(x*.21)*Math.cos(z*.19)*.35)*k;
  h-=6*Math.exp(-((x-45)**2+(z+35)**2)/500);
  h+=Math.max(0,(d-130)/18)**2;
  return h;
};
export const G=(x,z)=>Math.max(H(x,z),-.9);

export function buildWorld(scene){
  scene.fog=new THREE.Fog(0xcfe8ff,90,330);
  scene.add(new THREE.HemisphereLight(0xcfe9ff,0x8fbf7a,1.1));
  const sun=new THREE.DirectionalLight(0xfff0d2,2.6);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=sc.bottom=-26; sc.right=sc.top=26; sc.near=1; sc.far=160;
  sun.shadow.bias=-.0004; sun.shadow.normalBias=.04;
  scene.add(sun,sun.target);

  // небо
  const sky=new THREE.Mesh(new THREE.SphereGeometry(500,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 p;void main(){float h=clamp(p.y,0.,1.);vec3 c=mix(vec3(.88,.94,1.),vec3(.28,.58,.96),pow(h,.55));vec3 s=normalize(vec3(.5,.55,.65));float d=max(dot(p,s),0.);c+=vec3(1.,.85,.6)*(pow(d,600.)*2.+pow(d,12.)*.25);gl_FragColor=vec4(c,1.);}'}));
  scene.add(sky);

  // рельеф
  const N=150, geo=new THREE.PlaneGeometry(420,420,N,N); geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position, col=new Float32Array(p.count*3);
  const sand=new THREE.Color(0xf0dfa6), rock=new THREE.Color(0x9aa7a0), snow=new THREE.Color(0xe6edf5);
  const g1=new THREE.Color(0x76d46c), g2=new THREE.Color(0x3f9f55), c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i), h=H(x,z); p.setY(i,h);
    const n=Math.sin(x*.3)*Math.cos(z*.27)*.5+.5;
    if(h<-.5)c.copy(sand); else if(h>9)c.copy(snow); else if(h>6)c.copy(rock); else c.copy(g1).lerp(g2,Math.min(1,n*.7+h*.04));
    col.set([c.r,c.g,c.b],i*3);
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3)); geo.computeVertexNormals();
  const ter=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true})); ter.receiveShadow=true; scene.add(ter);

  // вода
  const water=new THREE.Mesh(new THREE.PlaneGeometry(420,420).rotateX(-Math.PI/2),
    new THREE.MeshPhongMaterial({color:0x4cc3ff,transparent:true,opacity:.72,shininess:90,specular:0xffffff}));
  water.position.y=-.8; scene.add(water);

  // площадка и статуя
  const stone=new THREE.MeshLambertMaterial({color:0xece6d8});
  const plaza=new THREE.Mesh(new THREE.CylinderGeometry(10,10,.08,48),stone); plaza.position.y=.02; plaza.receiveShadow=true; scene.add(plaza);
  const statue=new THREE.Group(); statue.position.set(0,0,8);
  const pil=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,3,8),stone); pil.position.y=1.5; pil.castShadow=true;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,.07,8,40),new THREE.MeshBasicMaterial({color:0xffd77a})); ring.position.y=3.8;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,70,16,1,true),new THREE.MeshBasicMaterial({color:0x9ff6ff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.y=35; statue.add(pil,ring,beam); scene.add(statue);

  // деревья: сакура и зелёные
  const T=300, m4=new THREE.Matrix4(), q=new THREE.Quaternion(), cc=new THREE.Color();
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.28,2.2,6).translate(0,1.1,0),new THREE.MeshLambertMaterial({color:0x7a5236}),T);
  const crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7,1).translate(0,3.4,0),new THREE.MeshLambertMaterial(),T);
  trunk.castShadow=crown.castShadow=true;
  const pk=[0xff9fc2,0xffc2d8,0xf48fb1], gk=[0x4caf50,0x66bb6a,0x2e9e5b];
  for(let k=0;k<T;){
    const x=rnd(-170,170), z=rnd(-170,170), h=H(x,z);
    if(Math.hypot(x,z)<16||h<-.3||h>7)continue;
    const s=rnd(.8,1.6);
    m4.compose(new THREE.Vector3(x,h,z),q.setFromAxisAngle(up,rnd(0,6.28)),new THREE.Vector3(s,s*rnd(.9,1.2),s));
    trunk.setMatrixAt(k,m4); crown.setMatrixAt(k,m4);
    crown.setColorAt(k,cc.setHex((Math.random()<.45?pk:gk)[k%3])); k++;
  }
  scene.add(trunk,crown);

  // цветы
  const F=2500, fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,5,4).translate(0,.2,0),new THREE.MeshLambertMaterial(),F);
  const fk=[0xffffff,0xffe066,0xff8fb8,0xb39dff];
  for(let k=0;k<F;){
    const x=rnd(-150,150), z=rnd(-150,150), h=H(x,z);
    if(h<-.3||h>6)continue;
    m4.makeTranslation(x,h,z); fl.setMatrixAt(k,m4); fl.setColorAt(k,cc.setHex(fk[k%4])); k++;
  }
  scene.add(fl);

  // облака
  const clouds=[], cm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,fog:false});
  for(let i=0;i<16;i++){
    const cg=new THREE.Group();
    for(let j=0;j<5;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(rnd(7,12),10,8),cm); s.position.set(j*9-18,rnd(-2,2),rnd(-4,4)); s.scale.y=.55; cg.add(s);}
    cg.position.set(rnd(-300,300),rnd(80,120),rnd(-300,300)); scene.add(cg); clouds.push(cg);
  }

  // лепестки
  const PN=500, pa=new Float32Array(PN*3);
  for(let i=0;i<PN;i++)pa.set([rnd(-30,30),rnd(0,14),rnd(-30,30)],i*3);
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pa,3));
  const petals=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffc0d6,size:.18,transparent:true,opacity:.9,depthWrite:false}));
  petals.frustumCulled=false; scene.add(petals);

  // сферы ветра (коллекционные)
  const orbs=[], og=new THREE.IcosahedronGeometry(.32,1), om=new THREE.MeshBasicMaterial({color:0x7ffff0});
  const sm=new THREE.MeshBasicMaterial({color:0x4de8ff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let i=0;i<25;i++){
    const a=rnd(0,6.28), r=rnd(14,120), x=Math.cos(a)*r, z=Math.sin(a)*r;
    const o=new THREE.Group(); o.add(new THREE.Mesh(og,om),new THREE.Mesh(new THREE.SphereGeometry(.7,12,8),sm));
    o.userData.y0=G(x,z)+rnd(1.3,3.6); o.position.set(x,o.userData.y0,z); scene.add(o); orbs.push(o);
  }

  function update(t,dt,pp,cp){
    sun.position.set(pp.x+30,pp.y+33,pp.z+39); sun.target.position.copy(pp);
    sky.position.copy(cp);
    ring.rotation.set(t*.6,t,0);
    orbs.forEach((o,i)=>{o.position.y=o.userData.y0+Math.sin(t*2+i)*.2; o.rotation.y=t*2;});
    clouds.forEach(cg=>{cg.position.x+=dt*1.5; if(cg.position.x>320)cg.position.x=-320;});
    for(let i=0;i<PN;i++){
      const j=i*3; pa[j]+=Math.sin(t+i)*dt*.7; pa[j+1]-=dt*(.7+(i%5)*.1); pa[j+2]+=Math.cos(t*.8+i)*dt*.5;
      if(pa[j+1]<pp.y-2||Math.abs(pa[j]-pp.x)>32||Math.abs(pa[j+2]-pp.z)>32){pa[j]=pp.x+rnd(-30,30);pa[j+1]=pp.y+rnd(6,14);pa[j+2]=pp.z+rnd(-30,30);}
    }
    pg.attributes.position.needsUpdate=true;
  }
  return {orbs,update};
}
