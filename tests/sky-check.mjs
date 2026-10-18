import assert from 'node:assert/strict';
import {makeWorld} from '../dist/sky-world.mjs';
import {player,jump,dash,step,respawn,platforms} from '../dist/sky-engine.mjs';
const w=makeWorld();let meshes=0;w.scene.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok([o.position.x,o.position.y,o.position.z].every(Number.isFinite));}});assert.ok(meshes>200);assert.equal(w.feathers.length,6);assert.equal(w.lanterns.length,3);assert.ok(w.platformMeshes.some(x=>x.p.moving));
const plats=platforms(),p=player();for(let i=0;i<60;i++)step(p,1/60,{},plats);assert.equal(p.y,0);assert.equal(p.ground,'island0');assert.ok(jump(p));for(let i=0;i<15;i++)step(p,1/60,{},plats);assert.ok(jump(p));assert.equal(jump(p),false);let peak=p.y;for(let i=0;i<100;i++){step(p,1/60,{},plats);peak=Math.max(peak,p.y);}assert.ok(peak>3);assert.equal(p.y,0);assert.equal(p.jumps,0);assert.ok(dash(p));assert.ok(p.energy<.6);assert.equal(dash(p),false);for(let i=0;i<120;i++)step(p,1/60,{},plats);assert.ok(p.energy>.9);
// Land on a raised stone from above, not from beneath.
const q=player(-20,-34);q.y=6;for(let i=0;i<120;i++)step(q,1/120,{},plats);assert.equal(q.y,2);assert.equal(q.ground,'step1');const r=player(-20,-34);r.y=0;step(r,.016,{},plats);assert.ok(r.y<0);r.checkpoint=2;respawn(r);assert.equal(r.x,26);assert.equal(r.z,-102);assert.equal(r.hearts,3);
// Moving stone carries a grounded adventurer.
const m=player(-6,-81);m.y=5;m.ground='step3';const moving=plats.find(a=>a.id==='step3');moving.deltaX=.1;moving.x+=.1;step(m,.016,{},plats);assert.equal(m.x,-5.9);
console.log(`3D checks passed: ${meshes} meshes, finite geometry, double jump, landing, dash, checkpoint and moving-platform physics.`);
