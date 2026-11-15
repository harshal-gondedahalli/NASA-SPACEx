import * as THREE from '../simulator/vendor/three.module.min.js';
const E=window.SpaceLabEngine,$=id=>document.getElementById(id),keys=new Set(),touches=new Map();let s=E.create(),menu=true,last=0,nextDraw=0,renderer,scene,camera,craft,station,targetMarker,satellite;let helpResume=false;
const material=(color,metalness=.3)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.55}),white=material(0xd7e0df),dark=material(0x22323f),gold=material(0xbca06d),blue=material(0x16446e),mint=new THREE.MeshBasicMaterial({color:0x7ce2b8});
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function panels(parent,x,y,z,w=10,h=6){const panel=mesh(new THREE.BoxGeometry(w,h,.12),blue,parent,x,y,z);for(let i=-4;i<=4;i++)mesh(new THREE.BoxGeometry(.035,h+.1,.15),white,panel,i*w/9,0,.1);mesh(new THREE.BoxGeometry(w,.035,.15),white,panel,0,0,.1);}
function clear(){keys.clear();touches.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function pause(value=!s.paused){s.paused=value;clear();hud();}
function start(mode){s=E.create(mode);menu=false;$('menu').hidden=true;$('result').hidden=true;clear();last=0;station.visible=s.mode==='dock';targetMarker.visible=s.mode!=='dock';satellite.visible=false;hud();$('scene').focus();}
function hud(){$('missionName').textContent=E.MODES[s.mode];$('range').textContent=E.range(s).toFixed(1);$('speed').textContent=E.speed(s).toFixed(2);$('fuel').textContent=Math.ceil(s.fuel);$('align').textContent=Math.abs(s.angle*180/Math.PI).toFixed(0);$('message').textContent=s.message;$('paused').hidden=menu||!s.paused;$('pause').textContent=s.paused?'▶':'Ⅱ';$('action').hidden=s.mode==='dock';$('action').textContent=s.mode==='satellite'?'🛰 Deploy':'✦ Scan';if(!menu&&s.phase!=='flying'){$('result').hidden=false;$('resultIcon').textContent=s.phase==='complete'?'🏆':'🛠';$('resultTitle').textContent=s.message;try{if(s.phase==='complete')localStorage.setItem('junior-space-lab-'+s.mode,'complete');}catch{}}if(menu)$('result').hidden=true;}
function command(){const on=k=>keys.has(k)||[...touches.values()].includes(k);return {side:(on('right')?1:0)-(on('left')?1:0),up:(on('up')?1:0)-(on('down')?1:0),forward:(on('forward')?1:0)-(on('back')?1:0),turn:(on('yawRight')?1:0)-(on('yawLeft')?1:0),brake:on('brake')};}
const mapping={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyR:'forward',KeyF:'back',KeyQ:'yawLeft',KeyE:'yawRight',Space:'brake'};
window.addEventListener('keydown',e=>{if(menu||$('instructions').open)return;if(e.code==='KeyP'&&!e.repeat){pause();return;}if(e.code==='Enter'&&!e.repeat){E.interact(s);hud();return;}if(mapping[e.code]){e.preventDefault();if(!s.paused)keys.add(mapping[e.code]);}});window.addEventListener('keyup',e=>keys.delete(mapping[e.code]));for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{if(menu||s.paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);touches.set(e.pointerId,b.dataset.key);b.classList.add('held');};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{touches.delete(e.pointerId);b.classList.remove('held');});}document.addEventListener('touchcancel',clear,{capture:true,passive:true});window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>start(b.dataset.mode);$('pause').onclick=()=>pause();$('restart').onclick=()=>start(s.mode);$('again').onclick=()=>start(s.mode);$('missions').onclick=()=>{menu=true;pause(true);$('result').hidden=true;$('menu').hidden=false;};$('action').onclick=()=>{E.interact(s);hud();};$('help').onclick=()=>{helpResume=!s.paused;pause(true);$('instructions').showModal();};$('closeHelp').onclick=()=>$('instructions').close();$('instructions').addEventListener('close',()=>{if(helpResume&&!menu)pause(false);});
try{
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;scene=new THREE.Scene();scene.background=new THREE.Color(0x02050b);camera=new THREE.PerspectiveCamera(55,1,.1,6000);scene.add(new THREE.HemisphereLight(0xd8e8f4,0x182433,1));const sun=new THREE.DirectionalLight(0xfff1db,3);sun.position.set(-40,50,30);scene.add(sun);
 const stars=[];for(let i=0;i<1100;i++){const z=1-2*i/1100,a=i*2.39996,r=Math.sqrt(1-z*z)*2500;stars.push(Math.cos(a)*r,z*2500,Math.sin(a)*r);}scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(stars,3)),new THREE.PointsMaterial({color:0x9baebe,size:1,sizeAttenuation:false})));
 const earthTex=new THREE.TextureLoader().load(new URL('../simulator/textures/earth-blue-marble.jpg',import.meta.url).href);earthTex.colorSpace=THREE.SRGBColorSpace;mesh(new THREE.SphereGeometry(1000,64,48),new THREE.MeshStandardMaterial({map:earthTex}),scene,0,-1150,-850);
 // Detailed ISS, crew vehicle and deployable satellite models.
 function makeArray(parent,x,y,z,w=12,h=8){
  const wing=new THREE.Group();wing.position.set(x,y,z);parent.add(wing);
  const frame=material(0x9aa8b4,.75),cell=new THREE.MeshStandardMaterial({color:0x174b83,metalness:.48,roughness:.38,emissive:0x07172b});
  mesh(new THREE.BoxGeometry(w,.16,.22),frame,wing,0,0,0);
  mesh(new THREE.BoxGeometry(.16,h,.22),frame,wing,0,0,0);
  for(let i=0;i<6;i++){const yy=-h/2+(i+.5)*h/6;mesh(new THREE.BoxGeometry(w-.35,.045,.12),frame,wing,0,yy,.03);}
  for(let i=0;i<8;i++){const xx=-w/2+(i+.5)*w/8;mesh(new THREE.BoxGeometry(.045,h-.25,.08),frame,wing,xx,0,.04);}
  for(let i=0;i<7;i++)for(let j=0;j<5;j++)mesh(new THREE.BoxGeometry(w/8-.07,h/6-.07,.055),cell,wing,-w/2+(i+.5)*w/7,-h/2+(j+.5)*h/5,.075);
  return wing;
 }
 function makeModule(parent,x,y,z,length=5,radius=1.25,colour=0xd9dfe1){
  const shell=material(colour,.48),module=mesh(new THREE.CylinderGeometry(radius,radius,length,32,1,false),shell,parent,x,y,z);
  module.rotation.x=Math.PI/2;
  const endMat=material(0x8997a2,.65);
  for(const zz of [-length/2-.035,length/2+.035]){
   const cap=mesh(new THREE.CylinderGeometry(radius*.96,radius*.96,.12,32),endMat,parent,x,y,z+zz);cap.rotation.x=Math.PI/2;
   mesh(new THREE.TorusGeometry(radius*.88,.07,8,32),gold,parent,x,y,z+zz);
  }
  for(let k=-1;k<=1;k++)mesh(new THREE.BoxGeometry(radius*1.65,.09,.09),dark,parent,x,y+k*.42,z);
  return module;
 }
 station=new THREE.Group();scene.add(station);
 const trussMat=material(0x9aa6ae,.78),jointMat=material(0x647580,.72),radiatorMat=material(0xe0e5e5,.52);
 // Main integrated truss and solar-array wings.
 mesh(new THREE.BoxGeometry(54,.38,.42),trussMat,station,0,2,-5);
 for(const x of [-25,-17,-9,0,9,17,25]){
  mesh(new THREE.BoxGeometry(.2,1.2,.22),jointMat,station,x,2,-5);
  mesh(new THREE.SphereGeometry(.34,16,12),gold,station,x,2,-5);
 }
 makeArray(station,-24,2,-5,15,10);makeArray(station,24,2,-5,15,10);
 makeArray(station,-24,-10,-5,15,10);makeArray(station,24,-10,-5,15,10);
 // Pressurised laboratory, habitation and connecting modules.
 makeModule(station,0,0,-5,9,1.55,0xe3e5e2);
 makeModule(station,-7,0,-5,5,1.2,0xcbd2d6);
 makeModule(station,7,0,-5,5,1.2,0xcbd2d6);
 makeModule(station,0,0,2,5,1.25,0xd9dfdf);
 makeModule(station,0,0,-12,5,1.15,0xcbd3d8);
 // Forward docking adapter: retain the original approach axis and port position.
 mesh(new THREE.CylinderGeometry(1.3,1.3,3.2,32),white,station,0,0,1.85).rotation.x=Math.PI/2;
 mesh(new THREE.CylinderGeometry(1.05,1.3,.55,32),gold,station,0,0,3.45).rotation.x=Math.PI/2;
 mesh(new THREE.TorusGeometry(1.3,.17,12,48),mint,station,0,0,3.78);
 mesh(new THREE.TorusGeometry(1.05,.055,8,40),dark,station,0,0,3.84);
 // External radiators, handrails, antennas and small station details.
 for(const side of [-1,1]){
  const rad=mesh(new THREE.BoxGeometry(4,.22,7),radiatorMat,station,side*12,-4,-5);
  for(let i=0;i<8;i++)mesh(new THREE.BoxGeometry(3.9,.035,.045),white,station,side*12,-4,-8.1+i*.88);
  mesh(new THREE.CylinderGeometry(.06,.06,5,10),gold,station,side*5,3,-5).rotation.z=Math.PI/2;
 }
 for(let i=0;i<5;i++){mesh(new THREE.BoxGeometry(.08,.08,7),gold,station,-2+i,2.1,-5);}
 const antenna=mesh(new THREE.CylinderGeometry(.035,.035,4,8),white,station,0,4,-8);antenna.rotation.x=.35;
 mesh(new THREE.SphereGeometry(.22,16,12),gold,station,0,5.8,-8);
 // Crew transport vehicle: rounded capsule, service section, windows and RCS details.
 craft=new THREE.Group();scene.add(craft);
 const capsuleMat=material(0xe2e5e4,.72),thermal=material(0x252e38,.68),windowMat=new THREE.MeshStandardMaterial({color:0x142b3d,metalness:.75,roughness:.16});
 mesh(new THREE.CylinderGeometry(.78,.95,2.35,32),capsuleMat,craft).rotation.x=Math.PI/2;
 mesh(new THREE.SphereGeometry(.78,32,20,0,Math.PI*2,0,Math.PI/2),capsuleMat,craft,0,0,-1.15).rotation.x=-Math.PI/2;
 mesh(new THREE.CylinderGeometry(.94,.82,.72,32),thermal,craft,0,0,1.48).rotation.x=Math.PI/2;
 mesh(new THREE.CylinderGeometry(.7,.94,.2,32),gold,craft,0,0,1.93).rotation.x=Math.PI/2;
 mesh(new THREE.ConeGeometry(.78,.9,32),capsuleMat,craft,0,0,-1.75).rotation.x=-Math.PI/2;
 for(const x of [-.35,.35]){const win=mesh(new THREE.SphereGeometry(.17,20,14),windowMat,craft,x,.34,-1.35);win.scale.set(1,.72,.22);}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(new THREE.BoxGeometry(.16,.16,.48),gold,craft,Math.cos(a)*.9,Math.sin(a)*.9,1.25);}
 for(const side of [-1,1]){
  const wing=new THREE.Group();wing.position.set(side*1.2,0,.35);craft.add(wing);
  mesh(new THREE.BoxGeometry(1.5,.08,.75),trussMat,wing);
  for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.32,.035,.68),blue,wing,side*(-.52+i*.35),.07,0);
 }
 mesh(new THREE.TorusGeometry(.42,.075,10,32),dark,craft,0,0,-2.1);
 // Deployable Earth-observation satellite: bus, two photovoltaic wings, antenna and sensors.
 targetMarker=new THREE.Group();scene.add(targetMarker);mesh(new THREE.TorusGeometry(4,.08,8,48),mint,targetMarker);mesh(new THREE.OctahedronGeometry(.6),gold,targetMarker);
 satellite=new THREE.Group();scene.add(satellite);
 const busMat=material(0xc5cbd0,.8),foilMat=material(0xb28c4b,.72);
 mesh(new THREE.BoxGeometry(1.55,1.35,1.45),busMat,satellite);
 mesh(new THREE.BoxGeometry(1.62,.08,1.5),foilMat,satellite,0,.72,0);
 for(const x of [-.48,0,.48])mesh(new THREE.BoxGeometry(.045,.025,1.35),gold,satellite,x,.78,0);
 makeArray(satellite,-2.45,0,0,2.5,1.65);makeArray(satellite,2.45,0,0,2.5,1.65);
 const dish=mesh(new THREE.SphereGeometry(.62,24,12,0,Math.PI*2,0,Math.PI/2),white,satellite,0,.9,-.95);dish.rotation.x=-Math.PI/2;
 mesh(new THREE.CylinderGeometry(.035,.035,1.2,8),gold,satellite,0,1.45,-.95);
 mesh(new THREE.SphereGeometry(.12,12,10),white,satellite,0,2.08,-.95);
 for(const x of [-.55,.55]){mesh(new THREE.CylinderGeometry(.055,.055,.65,10),dark,satellite,x,-.95,0);}
 function draw(){const rect=$('scene').getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();craft.position.set(s.p.x,s.p.y,s.p.z);craft.rotation.y=s.angle;const t=E.target(s);targetMarker.position.set(t.x,t.y,t.z);targetMarker.rotation.z=s.time*.15;satellite.visible=s.deployed;if(s.deployed)satellite.position.set(s.p.x+4,s.p.y,s.p.z-5);camera.position.set(s.p.x*.7+9,s.p.y*.7+7,s.p.z+24);camera.lookAt(s.p.x*.25,s.p.y*.25,s.p.z-22);renderer.render(scene,camera);const v=new THREE.Vector3(t.x,t.y,t.z).project(camera);$('reticle').style.left=(Math.max(8,Math.min(92,(v.x+1)*50)))+'%';$('reticle').style.top=(Math.max(25,Math.min(72,(1-v.y)*50)))+'%';}
 function frame(ms){const dt=last?Math.min(.05,(ms-last)/1000):0;last=ms;if(!menu)E.step(s,command(),dt);if(ms>nextDraw&&!document.hidden){draw();hud();nextDraw=ms+1000/30;}requestAnimationFrame(frame);}requestAnimationFrame(frame);document.body.dataset.ready='true';window.SpaceTraining={state:()=>JSON.parse(JSON.stringify(s)),advance:(input,seconds)=>{if(menu)return false;E.advance(s,input,seconds);hud();draw();return true;},view:()=>({station:station.visible,satellite:satellite.visible,calls:renderer.info.render.calls}),controls:()=>keys.size+touches.size};const requested=new URLSearchParams(location.search).get('mode');if(E.MODES[requested])start(requested);
}catch(error){$('error').hidden=false;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=true);}
