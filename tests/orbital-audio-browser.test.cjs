const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs/promises');
test('sound produces audio and responds to throttle, mute, pause and fuel cutoff on desktop and mobile',{timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chromium'})});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://music.test/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/NASA-SPACEx/')return route.fulfill({contentType:'text/html',body:'<button id="play">Play</button>'});
    const file=path.join(__dirname,'..',url.pathname.replace('/NASA-SPACEx/',''));
    return route.fulfill({contentType:file.endsWith('.mp3')?'audio/mpeg':'text/javascript',body:await fs.readFile(file)});
   });
   await page.goto('https://music.test/NASA-SPACEx/');
   await page.addScriptTag({url:'https://music.test/NASA-SPACEx/simulator/audio.js'});
   await page.evaluate(()=>{window.audio=new OrbitalAudio();audio.configure({music:false});document.querySelector('#play').onclick=()=>audio.unlock();});
   assert.equal(await page.evaluate(()=>audio.info().unlocked),false,'no sound before interaction');
   await page.locator('#play')[mobile?'tap':'click']();
   await page.waitForFunction(()=>audio.info().unlocked);
   await page.evaluate(()=>{
    window.analyser=audio.ctx.createAnalyser();analyser.fftSize=2048;audio.master.connect(analyser);
    window.rms=()=>{const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);};
    window.flight={phase:'flying',thrust:100,throttle:.1,body:'Earth',altitude:100};
    audio.sync(flight);
   });
   await page.waitForTimeout(450);
   const low=await page.evaluate(()=>({level:audio.info().engineLevel,rms:rms()}));assert(low.rms>0.0001,'engine outputs actual audio samples');
   await page.evaluate(()=>audio.sync({...flight,throttle:1}));await page.waitForTimeout(450);
   const high=await page.evaluate(()=>({level:audio.info().engineLevel,rms:rms()}));assert(high.level>low.level);assert(high.rms>low.rms,'higher throttle is louder');
   await page.evaluate(()=>{audio.configure({mode:'realistic'});audio.sync({...flight,body:'Moon',throttle:1});});
   assert((await page.evaluate(()=>audio.info().engineLevel))<high.level,'realistic vacuum uses quieter cabin vibration');
   await page.evaluate(()=>{audio.cue('stage');audio.setBlocked(true);});
   assert.equal(await page.evaluate(()=>audio.info().activeCues),0);await page.waitForTimeout(450);
   assert(await page.evaluate(()=>rms())<.00001,'pause silences the mix');
   await page.evaluate(()=>{audio.sync({...flight,throttle:1});audio.configure({muted:true});});
   await page.waitForTimeout(450);assert(await page.evaluate(()=>rms())<.00001,'mute silences output');
   await page.evaluate(()=>{audio.configure({muted:false});audio.sync({...flight,throttle:1});});
   await page.waitForTimeout(350);assert(await page.evaluate(()=>rms())>.0001,'unmute restores engine');
   await page.evaluate(()=>audio.sync({...flight,thrust:0}));await page.waitForTimeout(600);
   assert.equal(await page.evaluate(()=>audio.info().engineLevel),0);assert(await page.evaluate(()=>rms())<.00001,'empty tank/cutoff silences the engine');
   await page.evaluate(()=>{for(let i=0;i<100;i++)audio.cue('build');});
   assert(await page.evaluate(()=>audio.info().activeCues)<=16,'rapid taps cannot accumulate unlimited sound sources');
   await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>audio.info().activeCues),0,'finished sources are released');
   await page.evaluate(()=>{audio.cue('landed');audio.sync({...flight,hidden:true});});
   await page.waitForTimeout(350);assert(await page.evaluate(()=>rms())<.00001,'hidden tab is silent');assert.equal(await page.evaluate(()=>audio.info().activeCues),0);
   await page.evaluate(()=>{audio.configure({music:true});audio.sync({...flight,thrust:0,hidden:false});});await page.waitForFunction(()=>Object.values(audio.tracks).some(t=>!t.media.paused&&t.media.currentTime>0));await page.waitForTimeout(700);assert(await page.evaluate(()=>rms())>.0001,'background music can play independently of engine thrust');await page.evaluate(()=>audio.setBlocked(true));await page.waitForTimeout(450);assert(await page.evaluate(()=>rms())<.00001,'pause silences music as well as effects');
   await page.evaluate(()=>audio.sync({...flight,thrust:0,orbit:true,hidden:false}));
   assert.equal(await page.evaluate(()=>audio.info().musicTrack),'exploration');
   await page.evaluate(()=>audio.sync({...flight,phase:'countdown',thrust:0}));
   await page.waitForFunction(()=>audio.tracks.launch?.media.currentTime>0);
   assert.equal(await page.evaluate(()=>audio.info().musicTrack),'launch');
   assert.match(await page.evaluate(()=>audio.tracks.launch.media.src),/NASA-SPACEx\/public\/audio\/beyond-the-event-horizon\.mp3$/);
   await page.evaluate(()=>audio.sync({...flight,phase:'surface',thrust:0}));
   await page.waitForTimeout(2000);
   assert.equal(await page.evaluate(()=>audio.tracks.launch.media.paused),true,'outgoing track pauses after crossfade');
   await page.evaluate(()=>audio.configure({music:false}));
   assert(await page.evaluate(()=>Object.values(audio.tracks).every(t=>t.media.paused)),'music toggle pauses both recordings');
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();}
});
