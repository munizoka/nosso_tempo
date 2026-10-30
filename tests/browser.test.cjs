// Teste de interface isolado: nenhuma chamada ao Firebase real é permitida.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const f=path.resolve(root,'.'+pathname);
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(f,(err,bytes)=>{
    if(err){res.writeHead(404).end();return}
    const ext=path.extname(f);
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg'};
    res.writeHead(200,{'content-type':types[ext]||'application/octet-stream'}).end(bytes);
  });
});
const mock=()=>{
  window.__writes=[];
  const snap={exists:false,data:()=>({})};
  const ref=(c,id)=>({
    get:()=>Promise.resolve(snap),onSnapshot:cb=>{cb(snap);return()=>{}},
    set:data=>{window.__writes.push({c,id,data});return Promise.reject(Error('Escrita desativada'))},
    update:data=>{window.__writes.push({c,id,data});return Promise.reject(Error('Escrita desativada'))},
    delete:()=>{window.__writes.push({c,id});return Promise.reject(Error('Escrita desativada'))}
  });
  const db={collection:c=>({doc:id=>ref(c,id),onSnapshot:cb=>{cb({docs:[]});return()=>{}},orderBy(){return this},limit(){return this},get:()=>Promise.resolve({docs:[]})})};
  const auth={currentUser:null,onAuthStateChanged:cb=>{setTimeout(()=>cb(null),0);return()=>{}},signInWithPopup:()=>Promise.reject(Error('Login real proibido')),signOut:()=>Promise.resolve()};
  const getAuth=()=>auth;
  getAuth.GoogleAuthProvider=function(){};
  window.firebase={apps:[],initializeApp(config){this.apps.push({config})},firestore:()=>db,auth:getAuth};
  window.firebase.firestore.FieldValue={serverTimestamp:()=>new Date()};
  window.AudioContext=class{constructor(){this.state='running';this.destination={}}createGain(){return{gain:{value:0},connect(){return this}}}createMediaElementSource(){return{connect(){return this}}}resume(){}};
};
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.addInitScript(mock);
    await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const alerts=[];
    page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss()});
    await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction('typeof window.switchTab === "function"');
    await page.waitForTimeout(100);
    let ok=0;
    async function test(label,run){await run();console.log('✅ '+label);ok++}
    await test('Tela inicial e perfis',async()=>{
      assert.equal(await page.title(),'Nossa Linha do Tempo');
      assert.equal(await page.locator('#avatar-vitoria').count(),1);
      assert.equal(await page.locator('#gb-legacy-welcome-login').count(),1);
    });
    await test('Nenhuma escrita ao abrir o site',async()=>assert.equal(await page.evaluate('window.__writes.length'),0));
    await test('Edição de avatar requer permissão',async()=>{
      await page.evaluate('solicitarEdicaoAvatar("Vitoria")');
      assert.ok(alerts.some(x=>/conta Google autorizada/.test(x)));
    });
    await test('Lista de lugares acessível sem login',async()=>{
      assert.equal(await page.evaluate('switchTab("lugares"); !document.getElementById("view-lugares").classList.contains("hidden")'),true);
      assert.ok((await page.locator('#lista-lugares').innerText()).includes('Xerém'));
    });
    await test('Visitante não salva lugares',async()=>{
      await page.locator('#input-novo-lugar').fill('Teste');
      await page.evaluate('adicionarLugar()');
      assert.equal(await page.evaluate('window.__writes.length'),0);
    });
    await test('Menu abre GabiBot',async()=>{
      assert.equal(await page.evaluate('switchTab("chat"); !document.getElementById("view-chat").classList.contains("hidden")'),true);
    });
    await test('ViMória continua navegável',async()=>{
      assert.equal(await page.evaluate('switchTab("jogo"); !document.getElementById("view-jogo").classList.contains("hidden")'),true);
    });
    await test('Navegação mobile básica',async()=>{
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate('switchTab("lugares"); !document.getElementById("view-lugares").classList.contains("hidden")'),true);
    });
    await test('Firebase real não recebeu gravações',async()=>assert.equal(await page.evaluate('window.__writes.length'),0));
    console.log('RESULTADO: '+ok+'/9 testes de interface isolados aprovados.');
    console.log('OBS: O teste bloqueia Firebase e Gemini reais; não substitui avaliação manual visual com CSS/CDNs.');
  }catch(e){console.error('❌ Teste visual falhou:',e);process.exitCode=1}
  finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();