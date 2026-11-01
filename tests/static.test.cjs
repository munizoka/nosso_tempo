const fs=require('node:fs');
const cp=require('node:child_process');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
function check(label,yes){assert.ok(yes,label);console.log('✅ '+label)}
check('Painel de memórias',html.includes('gb-open-admin')&&html.includes('gabibotSharedMemories'));
check('Importador privado em lote e validação', html.includes('gb-bulk-file') && html.includes('gbBulkValidar') && html.includes("!isAdmin()") && html.includes('gabibotSharedMemories'));
check('Histórico opcional e timestamp servidor',html.includes('gabibotChatSettings')&&html.includes('keepHistory')&&html.includes('serverTimestamp()'));
check('Login Google para edição',html.includes('loginParaEditarConteudo')&&html.includes('solicitarEdicaoAvatar'));
check('Proteção de gravação na interface',html.includes('if (!podeEditarConteudo())'));
check('Sem escrita automática de lugares',!html.includes('lugaresRef.set({ lista: lugaresVisitados })'));
check('Texto dos lugares escapado',html.includes('escaparLugar(lugar)'));
check('Regras com consentimento e isolamento',rules.includes('gbIsSelf(userId)')&&rules.includes('data.saveHistory == true'));
check('Regras sem acesso público indiscriminado',!rules.includes('allow read, write: if true;')&&!rules.includes('request.time < timestamp.date'));
let count=0;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 if(/\bsrc\s*=/.test(match[1])) continue;
 const suffix=/\btype=["']module["']/.test(match[1])?'.mjs':'.js';
 const tmp=path.join(os.tmpdir(),'gb-check-'+process.pid+'-'+count+suffix);
 fs.writeFileSync(tmp,match[2]);
 const res=cp.spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
 fs.unlinkSync(tmp);
 assert.equal(res.status,0,'Erro JS script '+count+': '+res.stderr);
 count++;
}
console.log('✅ Sintaxe: '+count+' scripts. Para testar permissões execute npm run test:rules.');


const mario=fs.readFileSync(path.join(root,'mario.html'),'utf8');
const gameScript=mario.match(/<script>([\s\S]*?)<\/script>/)?.[1];
check('Super Gabriel Bros contém JavaScript',!!gameScript);
new Function(gameScript); // sintaxe do motor da plataforma
check('Inventário com dezoito espaços',mario.includes('inv-story-grid')&&mario.includes('inv-consumable-grid')&&mario.includes('for(let n=0;n<9;n++)'));
check('Sprite 68 e categorias RPG',mario.includes('68.png')&&mario.includes('ITENS DE HISTÓRIA')&&mario.includes('CONSUMÍVEIS'));
check('Relógio virtual congela na pausa',mario.includes('if(!inventoryOpen&&!menuOpen){')&&mario.includes('gameNow+=dt*1000')&&mario.includes("if(!sceneReady||inventoryOpen||menuOpen||state==='menu')return"));
check('Consumíveis integrados a escudo, vidas e bônus temporários',mario.includes('function useInventoryItem(')&&mario.includes('activeBuffs.shield')&&mario.includes('activeBuffs.jumpUntil')&&mario.includes('activeBuffs.speedUntil'));
check('Coleta única e persistência',mario.includes('collectedPickups.has(pickup.id)')&&mario.includes('function persistInventory(')&&mario.includes('localStorage.setItem(GAME_SAVE_KEY'));
check('Pistas não podem ser descartadas',mario.includes("ITEM_CATALOG[id]?.kind!=='consumable'")&&mario.includes("ITEM_CATALOG[id]?.kind!=='story'"));
check('Drink 67 na Fase 3 via animação ao inventário',mario.includes('drawSkyDrinkTransfer')&&mario.includes("giveStoryItem('drink')")&&mario.includes("villainDrink: '67.png'"));
check('Inventário disponível a partir da Fase 3',mario.includes('function unlockInventory(')&&mario.includes("level=3;state='title3';cameraX=0;unlockInventory()"));

const gameManifest=JSON.parse(fs.readFileSync(path.join(root,'mario.webmanifest'),'utf8'));
check('PWA orientado para tela horizontal',gameManifest.orientation==='landscape'&&['fullscreen','standalone'].includes(gameManifest.display));
check('Instalação como aplicativo no iOS',mario.includes('apple-mobile-web-app-capable" content="yes"')&&mario.includes('href="./mario.webmanifest"'));
check('Controles com margem para safe-area iPhone',mario.includes('env(safe-area-inset-left) + 30px')&&mario.includes('env(safe-area-inset-right) + 30px'));
check('Direcional com quatro setas visuais idênticas', ['#btn-up::before','#btn-down::before','#btn-left::before','#btn-right::before'].every(x=>mario.includes(x)));
check('Canvas ocupa viewport horizontal de celular',mario.includes('function shouldFillMobileLandscape()')&&mario.includes("canvas.style.width=Math.floor(maxWidth)+'px'")&&mario.includes("canvas.style.height=Math.floor(maxHeight)+'px'"));
check('Vitoria e vilão se voltam ao herói na introdução da fase 3',mario.includes("'VITORIA',intro?-1:1")&&mario.includes('if(intro)ctx.scale(-1,1)'));

check('Menu inicial contém ações principais', ['sgb-menu','NOVO JOGO','CARREGAR JOGO','OPÇÕES','SAIR DO JOGO'].every(x=>mario.includes(x)));
check('Três saves independentes em localStorage',mario.includes('super-gabriel-bros-save-slots-v1')&&mario.includes('function sanitiseSave(')&&mario.includes('function startNewCampaign(')&&mario.includes('function loadCampaign('));
check('Novo jogo não carrega inventário legado',mario.includes('function loadInventory(){')&&mario.includes('return {version:2,story:[],consumables:{life:0,shield:0,speed:0,jump:0}};'));
check('Legado recuperável e isolado',mario.includes('slotTable[0]=sanitiseSave(')&&mario.includes("legacy:true")&&mario.includes("slotTable.every(x=>!x)"));
check('Dificuldade afeta vidas e inimigos',mario.includes('function gameLives(')&&mario.includes('enemyDifficultyMultiplier()'));
check('Tela inicial pausa relógio sem atualizar física',mario.includes('if(!inventoryOpen&&!menuOpen)')&&mario.includes("state==='menu'"));
check('Firebase tem coleções de saves isoladas',rules.includes('match /superGabrielSaves/{userId}/slots/{slotId}')&&rules.includes('sgbValidSave(request.resource.data,slotId)')&&rules.includes('gbIsSelf(userId)'));
check('Nuvem envia apenas por escolha do jogador',mario.includes('window.sgbCloudUpload=async function()')&&mario.includes("window.sgbCloudDownload=async function()"));
check('Menu conserva cenário alternativo caso imagens falhem',mario.includes("url('58.png')"));

const menuScenes=['76.jpg','69.jpg','72.jpg','70.jpg','74.jpg','71.jpg','73.jpg','75.jpg'];
check('Todas as oito artes do menu existem na raiz',menuScenes.every(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Slideshow usa sequência cinematográfica combinada',mario.includes("const SGB_MENU_SCENES="+JSON.stringify(menuScenes).replaceAll('"',"'")));
check('Transições no intervalo de dez segundos',mario.includes('const SGB_MENU_SCENE_DURATION=10000')&&mario.includes('transition:opacity 2.1s'));
check('Crossfade usa duas camadas separadas',mario.includes("class=\"sgb-menu-slide is-visible\"")&&mario.includes("class=\"sgb-menu-slide\"")&&mario.includes("incoming.classList.add('is-visible')"));
check('Menu pausa transições ao iniciar fase',mario.includes('sgbStopSlideshow();')&&mario.includes('sgbStartSlideshow();'));
check('Navegador com movimento reduzido respeitado',mario.includes('prefers-reduced-motion: reduce')&&mario.includes('sgbReducedMotion?.matches'));
check('Interação do menu tem hover, clique e ripple',mario.includes('.sgb-menu-btn:not(:disabled):hover')&&mario.includes('.sgb-menu-btn:not(:disabled):active')&&mario.includes('sgb-button-ripple'));

check('Menu clean mantém logo pixelado',mario.includes('class="sgb-logo"')&&mario.includes("font-size:clamp(19px,2.6vw,28px)")&&mario.includes('text-shadow:2px 2px #49305a'));
check('Painel clean substitui molduras grossas por vidro',mario.includes('backdrop-filter:blur(18px)')&&mario.includes('border:1px solid rgba(234,224,255,.15)')&&!mario.includes('border:4px solid #a7a0cb'));
check('Novo Jogo é o único botão destacado na abertura',mario.includes('class="sgb-menu-btn primary" onclick="sgbMenuPage(\'new\')"')&&mario.includes('class="sgb-menu-btn" onclick="sgbMenuPage(\'load\')"'));
check('Menu mantém animações suaves, mas sem relevo pesado',mario.includes('transition:transform .22s')&&mario.includes('sgb-button-ripple')&&!mario.includes('0 4px 0 #201535'));

check('Ícone 77.jpg disponível no GitHub',fs.existsSync(path.join(root,'77.jpg'))&&fs.statSync(path.join(root,'77.jpg')).size>1000);
check('iOS tem Apple Touch Icon próprio',mario.includes('rel="apple-touch-icon" href="./77.jpg?v=20261101"'));
check('Favicon também utiliza arte do Gabriel',mario.includes('rel="icon" href="./77.jpg?v=20261101" type="image/jpeg"'));
const sgbManifest=JSON.parse(fs.readFileSync(path.join(root,'mario.webmanifest'),'utf8'));
check('Manifesto do app aponta para 77.jpg',sgbManifest.icons?.some(icon=>icon.src==='./77.jpg'&&icon.type==='image/jpeg'&&icon.purpose==='any'));
