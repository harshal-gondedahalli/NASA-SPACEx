/* Recorded soundtrack with original procedural mission effects. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.OrbitalAudio=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const scriptURL=typeof document!=='undefined'?document.currentScript?.src:null;
 const musicBase=scriptURL?new URL('../public/audio/',scriptURL).href:'../public/audio/';
 const TRACKS={exploration:'orbiting-eternity.mp3',launch:'beyond-the-event-horizon.mp3'};
 const KEY='junior-orbital-audio-v1',clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 class Sound{
  constructor(host=globalThis){
   this.host=host;this.ctx=null;this.nodes=new Set();this.blocked=false;this.engineLevel=0;this.lastCue=null;this.wasBurning=false;
   this.settings={muted:false,volume:.35,mode:'cinematic',music:true};this.tracks={};this.musicTrack='exploration';this.musicDucked=false;this.musicError=null;
   try{const v=JSON.parse(host.localStorage.getItem(KEY)||'null');if(v){this.settings.muted=v.muted===true;if(Number.isFinite(v.volume))this.settings.volume=clamp(v.volume,0,1);if(v.mode==='realistic')this.settings.mode=v.mode;if(typeof v.music==='boolean')this.settings.music=v.music;}}catch{}
  }
  save(){try{this.host.localStorage.setItem(KEY,JSON.stringify(this.settings));}catch{}}
  configure(values){if(typeof values.muted==='boolean')this.settings.muted=values.muted;if(typeof values.music==='boolean')this.settings.music=values.music;if(Number.isFinite(values.volume))this.settings.volume=clamp(values.volume,0,1);if(['cinematic','realistic'].includes(values.mode))this.settings.mode=values.mode;this.save();if(this.settings.muted||!this.settings.volume)this.stop();this.levels();if(this.settings.music&&!this.settings.muted&&this.settings.volume)this.startMusic();else this.stopMusic();}
  unlock(){
   for(const track of Object.values(this.tracks))track.failed=false;
   try{
    if(!this.ctx){
     const Context=this.host.AudioContext||this.host.webkitAudioContext;if(!Context)return Promise.resolve(false);
     this.ctx=new Context();const c=this.ctx;
     this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
     this.engine=c.createGain();this.engine.gain.value=0;this.engine.connect(this.master);
     const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);
     for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
     this.noise=c.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
     this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=240;
     this.noise.connect(this.filter);this.filter.connect(this.engine);this.noise.start();
     this.rumble=c.createOscillator();this.rumble.type='sine';this.rumble.frequency.value=42;
     this.rumbleGain=c.createGain();this.rumbleGain.gain.value=.15;this.rumble.connect(this.rumbleGain);this.rumbleGain.connect(this.engine);this.rumble.start();
    }
    const pending=this.ctx.state==='running'?Promise.resolve():this.ctx.resume();
    return Promise.resolve(pending).then(()=>{this.levels();if(this.settings.music&&!this.settings.muted&&this.settings.volume)this.startMusic();return this.ctx.state==='running';}).catch(()=>false);
   }catch{return Promise.resolve(false);}
  }
  startMusic(){
   if(!this.ctx||this.ctx.state!=='running'||!this.settings.music||this.settings.muted||!this.settings.volume||this.blocked||!this.host.Audio)return;
   const name=this.musicTrack;let track=this.tracks[name];
   if(!track){
    const media=new this.host.Audio(musicBase+TRACKS[name]);media.loop=true;media.preload='none';
    const gain=this.ctx.createGain();gain.gain.value=0;const source=this.ctx.createMediaElementSource(media);source.connect(gain);gain.connect(this.master);
    track=this.tracks[name]={media,gain,pending:false,timer:null,failed:false,target:0};
    media.addEventListener('error',()=>{track.failed=true;this.musicError='Unable to load '+TRACKS[name];});
   }
   for(const [key,item]of Object.entries(this.tracks)){
    const target=key===name?(this.musicDucked?.10:.24):0;
    if(item.target!==target){item.target=target;item.gain.gain.setTargetAtTime(target,this.ctx.currentTime,.35);}
    if(key!==name&&!item.timer&&!item.media.paused)item.timer=this.host.setTimeout(()=>{item.media.pause();item.timer=null;},1800);
   }
   if(track.timer){this.host.clearTimeout(track.timer);track.timer=null;}
   if(track.media.paused&&!track.pending&&!track.failed){track.pending=true;Promise.resolve(track.media.play()).then(()=>{this.musicError=null;if(this.blocked||this.settings.muted||!this.settings.music)track.media.pause();}).catch(()=>{track.failed=true;this.musicError='Tap a sound control to retry playback';}).finally(()=>{track.pending=false;});}
  }
  stopMusic(){for(const track of Object.values(this.tracks)){if(track.timer)this.host.clearTimeout(track.timer);track.timer=null;track.media.pause();track.target=0;track.gain.gain.cancelScheduledValues(this.ctx.currentTime);track.gain.gain.setValueAtTime(0,this.ctx.currentTime);}}
  levels(){if(!this.ctx||!this.master)return;this.master.gain.setTargetAtTime(this.blocked||this.settings.muted?0:this.settings.volume,this.ctx.currentTime,.025);}
  stop(){
   this.engineLevel=0;this.wasBurning=false;
   if(this.engine)this.engine.gain.setTargetAtTime(0,this.ctx.currentTime,.015);
   for(const node of [...this.nodes]){try{node.stop();}catch{}node.disconnect();this.nodes.delete(node);}
  }
  setBlocked(value){this.blocked=!!value;if(this.blocked){this.stop();this.stopMusic();}else this.startMusic();this.levels();}
  cue(name){
   if(!this.ctx||this.ctx.state!=='running'||this.settings.muted||!this.settings.volume||this.blocked)return false;
   const notes={
    sample:[[523,.08,0,.08],[784,.12,.1,.07]],
    flag:[[392,.09,0,.08],[587,.18,.12,.07]],
    step:[[65,.05,0,.025]],
    alert:[[880,.08,0,.06],[660,.1,.14,.06]],
    build:[[500,.035,0,.08],[740,.04,.035,.05]],
    launch:[[440,.12,0,.1],[660,.14,.15,.1]],
    ignition:[[85,.16,0,.15]],
    stage:[[120,.07,0,.16],[65,.15,.07,.1]],
    deploy:[[240,.07,0,.1],[340,.07,.09,.08]],
    landed:[[523,.16,0,.1],[659,.16,.18,.1],[784,.3,.36,.1]],
    crashed:[[110,.18,0,.1],[75,.25,.2,.08]]
   }[name];if(!notes)return false;
   this.lastCue=name;
   for(const [frequency,duration,delay,volume]of notes){
    if(this.nodes.size>=16)break;
    const c=this.ctx,start=c.currentTime+delay,node=c.createOscillator(),gain=c.createGain();
    node.type=['stage','ignition','crashed'].includes(name)?'triangle':'sine';node.frequency.value=frequency;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    node.connect(gain);gain.connect(this.master);this.nodes.add(node);
    node.onended=()=>{node.disconnect();gain.disconnect();this.nodes.delete(node);};
    node.start(start);node.stop(start+duration+.01);
   }
   return true;
  }
  sync(state){
   const dramatic=state.phase==='countdown'||state.phase==='flying'&&(['departure','capture','descent','encounter'].includes(state.mission)||!state.orbit&&!['earth-orbit','lunar-orbit','coast','departure-window'].includes(state.mission)&&(state.body==='Moon'||state.thrust>0));
   this.musicTrack=dramatic?'launch':'exploration';this.musicDucked=state.phase==='countdown'||state.thrust>0;
   const blocked=!!(state.paused||state.hidden);if(blocked!==this.blocked)this.setBlocked(blocked);
   this.startMusic();
   if(!this.ctx||!this.engine)return;
   const burning=state.phase==='flying'&&state.thrust>0&&!blocked&&!this.settings.muted&&this.settings.volume>0;
   const throttle=clamp(Number(state.throttle)||0,0,1),space=state.body==='Moon'||state.altitude>70000;
   this.engineLevel=burning?Math.sqrt(throttle)*(this.settings.mode==='realistic'&&space?.045:.32):0;
   // Realistic mode represents cabin vibration in vacuum, not exterior sound.
   this.engine.gain.setTargetAtTime(this.engineLevel,this.ctx.currentTime,.06);
   this.filter.frequency.setTargetAtTime(160+throttle*650,this.ctx.currentTime,.08);
   this.rumble.frequency.setTargetAtTime(35+throttle*25,this.ctx.currentTime,.08);
   if(burning&&!this.wasBurning)this.cue('ignition');this.wasBurning=burning;
  }
  info(){return {available:!!(this.host.AudioContext||this.host.webkitAudioContext),unlocked:this.ctx?.state==='running',...this.settings,blocked:this.blocked,engineLevel:this.engineLevel,activeCues:this.nodes.size,lastCue:this.lastCue,musicTrack:this.musicTrack,musicError:this.musicError};}
 }
 return Sound;
});

