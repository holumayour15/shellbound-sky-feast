export const islands=[{x:0,z:0,y:0,r:23,name:'Lantern Landing'},{x:-28,z:-55,y:3,r:17,name:'Lantern Relay'},{x:26,z:-110,y:7,r:18,name:'Feather Flight'},{x:0,z:-162,y:10,r:19,name:'Storm Sanctuary'}];
export function platforms(){return [...islands.map((p,i)=>({...p,id:'island'+i})),...[[ -12,-25,1],[-20,-34,2],[-14,-73,4],[-6,-81,5],[2,-89,6],[12,-96,7],[17,-130,8],[8,-139,9]].map(([x,z,y],i)=>({x,z,y,r:4.6,id:'step'+i,baseX:x,moving:i===3}))];}
export function player(x=0,z=8){return {x,z,y:0,vy:0,dx:0,dz:-1,ground:null,jumps:0,energy:1,dash:0,inv:0,hearts:3,checkpoint:0,pulse:0,coyote:0};}
export function jump(p){if(p.ground||p.coyote>0||p.jumps<2){p.vy=10.5;p.jumps=p.ground||p.coyote>0?1:p.jumps+1;p.ground=null;p.coyote=0;return true;}return false;}
export function dash(p){if(p.energy>=.45&&p.dash<=0){p.energy-=.45;p.dash=.22;return true;}return false;}
export function step(p,dt,input,plats){p.energy=Math.min(1,p.energy+dt*.3);p.inv=Math.max(0,p.inv-dt);p.pulse=Math.max(0,p.pulse-dt);p.coyote=Math.max(0,p.coyote-dt);let old=p.y;const support=plats.find(a=>a.id===p.ground);if(support){p.x+=support.deltaX||0;p.z+=support.deltaZ||0;}
let x=input.x||0,z=input.z||0,n=Math.hypot(x,z);if(n>0){x/=n;z/=n;p.dx=x;p.dz=z;}let speed=9;if(p.dash>0){speed=28;x=p.dx;z=p.dz;p.dash-=dt;}p.x+=x*speed*dt;p.z+=z*speed*dt;p.vy-=25*dt;p.y+=p.vy*dt;
const floor=plats.filter(a=>Math.hypot(p.x-a.x,p.z-a.z)<a.r+.15&&old>=a.y-.12&&p.y<=a.y&&p.vy<=0).sort((a,b)=>b.y-a.y)[0];
if(floor){p.y=floor.y;p.vy=0;p.jumps=0;p.ground=floor.id;p.coyote=.1;}else{p.ground=null;if(support)p.jumps=1;}return p.y<-22;}
export function respawn(p){let a=islands[p.checkpoint]||islands[0];Object.assign(p,{x:a.x,z:a.z+8,y:a.y+1,vy:0,ground:null,jumps:0,inv:2,hearts:3,dash:0});}
export function distance(p,q){return Math.hypot(p.x-q.x,p.z-q.z);}
