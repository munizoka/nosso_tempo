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
    await test('Trilha sonora começa muda e só pode ser ativada manualmente',async()=>{
      const inicial=await page.evaluate(()=>{
        const music=document.getElementById('bg-music');
        const slider=document.getElementById('volume-slider');
        return {volume:music.volume,slider:slider.value,paused:music.paused,
          icon:document.getElementById('vol-icon').innerHTML};
      });
      assert.equal(inicial.slider,'0');
      assert.equal(inicial.volume,0);
      assert.equal(inicial.paused,true);
      assert.match(inicial.icon,/x1="23"/); // ícone de mudo
      const depois=await page.evaluate(()=>{
        initWebAudio();
        const ganhoInicial=gainNode.gain.value;
        setVolume(0.55);
        const ganhoAumentado=gainNode.gain.value;
        const slider=document.getElementById('volume-slider').value;
        const volumeHTML=document.getElementById('bg-music').volume;
        setVolume(0);
        return {ganhoInicial,ganhoAumentado,slider,volumeHTML,
          ganhoFinal:gainNode.gain.value,paused:document.getElementById('bg-music').paused};
      });
      assert.equal(depois.ganhoInicial,0);
      assert.equal(depois.ganhoAumentado,0.55);
      assert.equal(depois.slider,'0.55');
      assert.equal(depois.volumeHTML,1); // Web Audio controla o ganho
      assert.equal(depois.ganhoFinal,0);
      assert.equal(depois.paused,true);
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
    await test('Importador inicia desativado e sem gravações',async()=>{
      assert.equal(await page.locator('#gb-bulk-file').count(),1);
      assert.equal(await page.locator('#gb-bulk-import').isDisabled(),true);
      assert.equal(await page.evaluate('window.__writes.length'),0);
    });
    await test('Escala mostra prévia 2x2 sem depender de Firebase real',async()=>{
      await page.evaluate('switchTab("escala")');
      await page.locator('#ws-year').selectOption('2026');
      await page.locator('#ws-month').selectOption('10');
      const folga=page.locator('#ws-grid button[aria-label^="06/11/2026"]');
      const trabalho=page.locator('#ws-grid button[aria-label^="08/11/2026"]');
      assert.match(await folga.getAttribute('aria-label'),/folga.*prévia/i);
      assert.match(await trabalho.getAttribute('aria-label'),/trabalho.*prévia/i);
      assert.equal(await page.locator('#ws-grid button[aria-label^="01/11/2026"]').isDisabled(),true);
      await folga.click();
      assert.match(await page.locator('#ws-selected-status').innerText(),/^Folga$/i);
      assert.match(await page.locator('#ws-notice').innerText(),/Prévia/i);
      assert.equal(await page.locator('#ws-gabibot').count(),0);
      assert.equal(await page.locator('#ws-gabibot-top').count(),1);
      assert.equal(await page.locator('#ws-edit').isDisabled(),true);
      assert.match(await page.locator('#ws-notice').innerText(),/Prévia|prévia/i);
      assert.equal(await page.evaluate('window.WorkSchedule.isLoaded()'),false);
      assert.equal(await page.evaluate('window.WorkSchedule.getContextForQuestion("folga amanhã")'),'');
      assert.equal(await page.evaluate('window.__writes.length'),0);
    });
    await test('Menu abre GabiBot',async()=>{
      assert.equal(await page.evaluate('switchTab("chat"); !document.getElementById("view-chat").classList.contains("hidden")'),true);
    });
    await test('ViMória continua navegável',async()=>{
      assert.equal(await page.evaluate('switchTab("jogo"); !document.getElementById("view-jogo").classList.contains("hidden")'),true);
    });
    await test('Escala compacta preserva navegação e atalho no celular',async()=>{
      await page.setViewportSize({width:390,height:844});
      await page.evaluate('switchTab("escala")');
      const right=page.locator('#ws-next');
      await page.locator('#ws-year').selectOption('2026');
      await page.locator('#ws-month').selectOption('10');
      await right.click();
      assert.equal(await page.locator('#ws-month').inputValue(),'11');
      await page.locator('#ws-prev').click();
      assert.equal(await page.locator('#ws-month').inputValue(),'10');
      // Nesta suite todos os CDNs externos são bloqueados, inclusive o
      // Tailwind. Assim, dimensões CSS computadas não seriam confiáveis.
      // Conferimos a estrutura responsiva + navegação real no DOM.
      const layout=await page.evaluate(()=>{
        const section=document.getElementById('view-escala');
        const grid=document.getElementById('ws-grid');
        const link=document.getElementById('ws-gabibot-top');
        return {
          compactSection:section.classList.contains('max-w-2xl') &&
                         section.classList.contains('space-y-3'),
          sevenColumns:grid.classList.contains('grid-cols-7'),
          compactShortcut:link.classList.contains('shrink-0'),
          editorClosed:document.getElementById('ws-editor').classList.contains('hidden'),
          extraBotButtons:document.querySelectorAll('#ws-gabibot').length
        };
      });
      assert.equal(layout.compactSection,true);
      assert.equal(layout.sevenColumns,true);
      assert.equal(layout.compactShortcut,true);
      assert.equal(layout.editorClosed,true);
      assert.equal(layout.extraBotButtons,0);
      await page.locator('#ws-gabibot-top').click();
      assert.equal(await page.locator('#view-chat').isVisible(),true);
    });
    await test('Navegação mobile básica',async()=>{
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate('switchTab("lugares"); !document.getElementById("view-lugares").classList.contains("hidden")'),true);
    });
    await test('Firebase real não recebeu gravações',async()=>assert.equal(await page.evaluate('window.__writes.length'),0));
    console.log('RESULTADO: '+ok+'/13 testes de interface isolados aprovados.');
    console.log('OBS: O teste bloqueia Firebase e Gemini reais; não substitui avaliação manual visual com CSS/CDNs.');
  }catch(e){console.error('❌ Teste visual falhou:',e);process.exitCode=1}
  finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();