import * as THREE from './vendor/three.module.min.js';
// Original cutaway habitat: an illustrative pressure vessel, not an engineered design.
export function habitatModel(kind='habitat'){
 const g=new THREE.Group(),shell=new THREE.Group(),inside=new THREE.Group();g.add(shell,inside);g.userData.shell=shell;g.userData.interior=inside;
 const mat=(c,m=.15)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:.65}),white=mat(0xdce6e5),dark=mat(0x26333d),gold=mat(0xc8a873),blue=mat(0x4e95a3),green=mat(0x60965d);
 const add=(geo,m,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const floor=add(new THREE.CylinderGeometry(7.8,8.4,.45,40),white,g,0,.1);add(new THREE.CylinderGeometry(8.5,9,1.5,40,1,true),mat(0x77776c),shell,0,.45);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(8,40,24,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x8fc3d4,transparent:true,opacity:.28,metalness:.25,roughness:.2,side:THREE.DoubleSide,depthWrite:false}));dome.position.y=1.1;shell.add(dome);g.userData.glass=dome;
 for(let i=0;i<8;i++){const rib=add(new THREE.TorusGeometry(8,.075,6,64,Math.PI),white,shell,0,1.1);rib.rotation.y=i*Math.PI/8;}
 const airlock=add(new THREE.CylinderGeometry(1.4,1.4,4.5,20),white,shell,0,1.45,8.8);airlock.rotation.x=Math.PI/2;add(new THREE.BoxGeometry(2.1,2.7,.15),blue,shell,0,1.3,11.1);
 const glow=new THREE.PointLight(0xc2eeff,25,16);glow.position.set(0,4,0);inside.add(glow);add(new THREE.CylinderGeometry(6.8,6.8,.08,40),dark,inside,0,.38);
 for(let x=-5;x<=5;x+=2.5){const rail=add(new THREE.BoxGeometry(.035,.02,11),white,inside,x,.44);}
 if(kind==='lab')for(const x of [-4,4]){add(new THREE.BoxGeometry(2,1.2,5),white,inside,x,1,-.7);for(let z=-2;z<=2;z+=2){add(new THREE.CylinderGeometry(.45,.45,.15,16),dark,inside,x,1.68,z);for(let j=0;j<3;j++){const leaf=add(new THREE.SphereGeometry(.4,10,8),green,inside,x+(j-1)*.25,2,z);leaf.scale.set(.8,1.5,.6);}}}
 else for(const x of [-4.8,4.8])for(const z of [-2.6,1.2]){add(new THREE.BoxGeometry(2, .6,2.8),white,inside,x,.75,z);add(new THREE.BoxGeometry(1.7,.15,2.5),blue,inside,x,1.1,z);add(new THREE.BoxGeometry(1.4,.22,.55),white,inside,x,1.25,z-1);}
 add(new THREE.BoxGeometry(3.7,1.8,1.2),white,inside,0,1.3,-5.5);add(new THREE.BoxGeometry(2.8,1,.08),new THREE.MeshStandardMaterial({color:0x6bc8cf,emissive:0x2c888d,emissiveIntensity:.6}),inside,0,1.6,-4.84);for(const x of [-1,0,1])add(new THREE.CylinderGeometry(.09,.09,.12,12),gold,inside,x,1.1,-4.8).rotation.x=Math.PI/2;
 return g;
}
