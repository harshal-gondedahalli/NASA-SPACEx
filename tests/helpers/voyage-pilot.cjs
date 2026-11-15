function createPilot(){
 let routeIndex=0;
 return function pilot(s){
 const gate=s.gates.find(g=>!g.done);
 let target=gate||{x:1770,y:270};
 if(!gate){
  // Fly around the shield; signal 2 sits just outside its right edge.
  const points=[{x:1450,y:150},{x:1515,y:145},{x:1710,y:145},{x:1690,y:270},{x:1710,y:410},{x:1515,y:395},{x:1730,y:410}];
  let i=routeIndex;
  if(i<points.length&&(i===1?s.gatekeeper.nodes[0].done:i===3?s.gatekeeper.nodes[1].done:i===5?s.gatekeeper.nodes[2].done:Math.hypot(points[i].x-s.x,points[i].y-s.y)<18))i++;
  routeIndex=i;target=points[i]||{x:1770,y:270};
 }
 const dx=target.x-s.x,dy=target.y-s.y,d=Math.hypot(dx,dy),v=Math.hypot(s.vx,s.vy);
 const desired=Math.atan2(dy-s.vy*.7,dx-s.vx*.7),diff=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
 const limit=gate?115:Math.min(65,Math.max(18,d*.7));
 return {left:diff<-.05,right:diff>.05,thrust:Math.abs(diff)<.3&&v<limit,brake:!gate&&v>limit||Math.abs(diff)>1.3&&v>35};
}
}
module.exports={createPilot};
