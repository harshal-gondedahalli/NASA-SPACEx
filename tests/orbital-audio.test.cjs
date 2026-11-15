const {test}=require('node:test');
const assert=require('node:assert/strict');
const Sound=require('../simulator/audio.js');
test('audio is optional and storage restrictions do not interrupt play',async()=>{
 const sound=new Sound({get localStorage(){throw Error('blocked');}});
 assert.equal(await sound.unlock(),false);
 assert.doesNotThrow(()=>{sound.configure({muted:true,volume:.2});sound.sync({phase:'flying',thrust:1,throttle:1});sound.cue('stage');sound.stop();});
});
test('audio preferences survive reload and invalid saved values are bounded',()=>{
 let value='{"volume":9,"mode":"unknown"}';const host={localStorage:{getItem:()=>value,setItem:(_,v)=>value=v}};
 const sound=new Sound(host);assert.equal(sound.info().volume,1);assert.equal(sound.info().mode,'cinematic');
 sound.configure({volume:.25,mode:'realistic',muted:true});const reloaded=new Sound(host);
 assert.equal(reloaded.info().volume,.25);assert.equal(reloaded.info().mode,'realistic');assert.equal(reloaded.info().muted,true);
});
test('recordings follow scenes, duck for burns, crossfade, and preserve position on pause',async()=>{
 const timers=new Map();let sequence=0;
 const param=()=>({value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},cancelScheduledValues(){}});
 const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){},stop(){}});
 class Context{constructor(){this.state='running';this.currentTime=0;this.sampleRate=10;this.destination={}}createGain(){return node()}createBuffer(){return {getChannelData:()=>new Float32Array(20)}}createBufferSource(){return node()}createBiquadFilter(){return node()}createOscillator(){return node()}createMediaElementSource(){return node()}}
 class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=17;this.plays=0}addEventListener(){}play(){this.paused=false;this.plays++;return Promise.resolve()}pause(){this.paused=true}}
 const sound=new Sound({AudioContext:Context,Audio,setTimeout(fn){timers.set(++sequence,fn);return sequence},clearTimeout(id){timers.delete(id)}});
 assert.equal(Object.keys(sound.tracks).length,0);await sound.unlock();await Promise.resolve();
 assert.match(sound.tracks.exploration.media.src,/public\/audio\/orbiting-eternity.mp3$/);
 sound.sync({phase:'countdown'});await Promise.resolve();assert.equal(sound.musicTrack,'launch');assert.equal(sound.tracks.launch.target,.10);
 sound.sync({phase:'flying',orbit:true,thrust:0});assert.equal(sound.musicTrack,'exploration');assert.equal(sound.tracks.exploration.target,.24);
 for(const fn of [...timers.values()])fn();assert(sound.tracks.launch.media.paused);assert(!sound.tracks.exploration.media.paused);
 sound.setBlocked(true);assert(Object.values(sound.tracks).every(t=>t.media.paused));assert.equal(sound.tracks.exploration.media.currentTime,17);
 sound.setBlocked(false);await Promise.resolve();assert(!sound.tracks.exploration.media.paused);
 sound.configure({muted:true});assert(Object.values(sound.tracks).every(t=>t.media.paused));
 sound.configure({muted:false,music:false});sound.sync({phase:'surface'});assert(Object.values(sound.tracks).every(t=>t.media.paused));
});
