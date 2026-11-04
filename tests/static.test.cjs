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
// Regressão: saudações não devem enviar memórias irrelevantes ao Gemini.
const tokenizeFn=html.match(/        function tokenize\(text\) \{[\s\S]*?\n        \}/)?.[0];
const knowledgeFn=html.match(/        function knowledgeFor\(question\) \{[\s\S]*?\n        \}/)?.[0];
check('Funções de seleção das memórias disponíveis',!!tokenizeFn&&!!knowledgeFn);
const testMemories=[
 {id:'viagem',title:'Beto Carrero',category:'Viagens',content:'Gabriel e Vitoria viajaram para Santa Catarina.',eventDate:'2025-07-15'},
 {id:'pc',title:'Computador do Gabriel',category:'Tecnologia',content:'Gabriel usa RTX 5060 Ti.',eventDate:''}
];
const testKnowledge=new Function('memories','isMember',tokenizeFn+'\n'+knowledgeFn+'\nreturn knowledgeFor;')(testMemories,()=>true);
check('Cumprimento não envia memórias irrelevantes',testKnowledge('Tudo certo?')==='Nenhuma memória adicional selecionada.');
check('Cumprimento informal não envia memórias irrelevantes',testKnowledge('Eai meu mano?')==='Nenhuma memória adicional selecionada.');
check('Perguntas pessoais continuam usando memórias',testKnowledge('Lembra da nossa viagem?').includes('Beto Carrero'));
check('Pergunta direta mantém a memória relevante',testKnowledge('Quando fomos ao Beto Carrero?').includes('Beto Carrero'));
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
// Primeira etapa do remake da Floresta Sombria — PNGs 250–256 isolados.
const forestRemakeSource=mario.match(/        const forestRemakePaths=\{[\s\S]*?\n        \};/)?.[0];
check('Catálogo visual da nova Floresta Sombria está disponível',!!forestRemakeSource);
const forestRemakeFiles=new Function(forestRemakeSource+'\nreturn forestRemakePaths;')();
check('Sete imagens 250–256 existem com nomes exatos na raiz do repositório',
 Object.keys(forestRemakeFiles).length===7&&
 forestRemakeFiles.sky==='250 dark.png'&&
 forestRemakeFiles.mountains==='251.png'&&
 forestRemakeFiles.distantForest==='252.png'&&
 forestRemakeFiles.groundTop==='253.png'&&
 forestRemakeFiles.groundSoil==='254.png'&&
 forestRemakeFiles.ancestorTree==='255.png'&&
 forestRemakeFiles.witchHouse==='256 witchs house.png'&&
 Object.values(forestRemakeFiles).every(file=>
  fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Fase 2 carrega sprites completos sem inferir spritesheets',
 mario.includes('function forestDetectAlphaBounds(img)')&&
 mario.includes('function forestDrawParallax(key,speed,width,bottomY,alpha=1)')&&
 mario.includes('ctx.drawImage(img,r.x,r.y,r.w,r.h,destX,y,width,height)')&&
 mario.includes('function forestDrawWholeAtGround(key,x,groundY,height,alpha=1)')&&
 mario.includes('function drawForestScenery()')&&
 !mario.includes("valleyAtlas('ancestorTree'"));
check('Chão sombrio tem terra contínua e topo com repetição espelhada',
 mario.includes('function drawForestGround(b)')&&
 mario.includes("const dirt=forestRemakeArt.groundSoil")&&
 mario.includes("const top=forestRemakeArt.groundTop")&&
 mario.includes("ctx.fillStyle='#251a2e'")&&
 mario.includes('ctx.translate(destX+w,0);ctx.scale(-1,1)'));
check('Casa da bruxa é cenário íntegro ancorado em y380 e não permite entrada ainda',
 mario.includes('const FOREST_WITCH_HOUSE_X=1630;')&&
 mario.includes('const FOREST_WITCH_HOUSE_HEIGHT=235;')&&
 mario.includes("forestDrawWholeAtGround('witchHouse',")&&
 mario.includes('FOREST_WITCH_HOUSE_X,380,FOREST_WITCH_HOUSE_HEIGHT,.99)')&&
 !mario.includes('function enterWitchHouse(')&&
 !mario.includes('witchHouseAudio.play('));
check('Checkpoint fica antes da clareira e fora do corpo da casa',
 mario.includes('const FOREST_CHECKPOINT_X=1540;')&&
 mario.includes('checkpointReached=true;checkpointX=FOREST_CHECKPOINT_X-20;')&&
 mario.includes('drawObject(flag,FOREST_CHECKPOINT_X,312,42,68)')&&
 mario.includes('forestDrawWholeAtGround(\'witchHouse\''));
check('Fase 2 preserva largura, cutscenes, totens e outras fases',
 mario.includes('const FOREST_END = 3400;')&&
 mario.includes('function drawForestTotem()')&&
 mario.includes("if(state==='forestIntro'||state==='forestOutro')drawForestStoryActors()")&&
 mario.includes('function drawLevelOne()')&&
 mario.includes('function drawLevelThree()'));
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
check('Vitoria e vilão se voltam ao herói na introdução da fase 3',
 mario.includes('facing:intro?-1:1,')&&mario.includes('if(intro)ctx.scale(-1,1)'));

check('Menu inicial contém ações principais', ['sgb-menu','NOVO JOGO','CARREGAR JOGO','OPÇÕES','SAIR DO JOGO'].every(x=>mario.includes(x)));
check('Três saves independentes em localStorage',mario.includes('super-gabriel-bros-save-slots-v1')&&mario.includes('function sanitiseSave(')&&mario.includes('function startNewCampaign(')&&mario.includes('function loadCampaign('));
check('Novo jogo não carrega inventário legado',mario.includes('function loadInventory(){')&&mario.includes('return {version:2,story:[],consumables:{life:0,shield:0,speed:0,jump:0,burger:0}};'));
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

const superAssets=['78.png','79.png','80.png','81.png','82.png','83.png'];
check('Seis novos sprites e itens foram enviados',superAssets.every(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Fase 2 encara Gabriel antes da fuga',mario.includes('const princessFacing=slide>.12?')&&mario.includes('const villainFacing=slide>.12?')&&mario.includes('shrink*villainFacing'));
check('Corações animados e dano sem recriação a cada frame',mario.includes('sgb-heart-hit')&&mario.includes('damagedHeartUntil')&&mario.includes('signature!==lastHeartSignature')&&mario.includes('83.png'));
check('Blocos de interrogação substituídos por moedas coletáveis',!mario.includes("type:'surprise'")&&mario.includes('const COIN_PICKUPS=[')&&mario.includes('function updateLevelCoins()')&&mario.includes('drawLevelCoins()'));
check('Hambúrguer 79.png continua no catálogo até ativação intencional',mario.includes("burger:{id:'burger'") && mario.includes("asset:'79.png'") &&
 mario.includes("if(id==='burger')return activateSuperFromBurger();") &&
 mario.includes('function activateSuperFromBurger()'));
check('Super Gabriel usa novas imagens de transformação e investida',mario.includes("idle:'139.png'")&&mario.includes("dash:'142.png'")&&mario.includes("jumpRise:'143.png'")&&mario.includes('trySuperDash()'));
check('Investida tem input X e botão B condicionado',mario.includes("e.code==='KeyX'&&!e.repeat")&&mario.includes('id="btn-dash"')&&mario.includes("show=isSuperGabriel()&&state==='playing'"));
check('Investida derrota inimigos e corvos',mario.includes('defeatEnemy(enemy,150);continue;')&&mario.includes('bird.alive=false;score+=180;setHUD();continue;'));
check('Super Forca dura fase inteira e conserva save legado dentro das regras',mario.includes('superPower.until=Number.POSITIVE_INFINITY') &&
 mario.includes('superRemaining:isSuperGabriel()?SUPER_DURATION:0') &&
 mario.includes("data.phase==='playing'&&data.superRemaining>0?Number.POSITIVE_INFINITY:0") &&
 mario.includes('if(!inventoryOpen&&!menuOpen){') &&
 rules.includes('data.payload.superRemaining <= 12'));
check('Moedas coletadas ficam únicas no save da campanha',mario.includes('collectedPickups.add(coin.id)')&&mario.includes('collectedPickups.has(coin.id)')&&mario.includes('coins=data.coins')&&mario.includes('collectedPickups=new Set();'));
check('Firestore continua isolado e aceita burger + poder temporário',rules.includes("'jump','burger'")&&rules.includes("'superRemaining'")&&rules.includes('gbIsSelf(userId)'));
check('Firestore aceita saldo de moedas opcional sem quebrar saves antigos',rules.includes("'legacy','superRemaining','coins'")&&rules.includes("!('coins' in data.payload)")&&rules.includes('data.payload.coins <= 9999'));


check('Botao B vertical acima do A',mario.includes('flex-direction:column;align-items:center') &&
 mario.indexOf('id="btn-dash"')<mario.indexOf('id="btn-jump" class="action-btn"'));
check('Indicador de Super Forca agora mostra duracao da fase',mario.includes('id="sgb-super-meter" role="status"') &&
 mario.includes("meter.classList.toggle('active',show)") &&
 mario.includes("style.width='100%'") &&
 mario.includes('SUPER FORÇA · ATÉ O FIM DA FASE'));
check('Bolota e Alhopó têm sprites novos e não usam mais a tartaruga',[
 '84 bolota idle.png','202 bolota walk 1.png','203 bolota mid.png',
 '204 bolota walk 2.png','87 bolota dead.png','88 bolota espanto.png',
 '205 leak idle.png','206 leek shocked.png','207 leek walk 1.png',
 '208 leek mid.png','208 leek walk 2.png','209 leek dead.png'
].every(asset=>mario.includes(asset))&&mario.includes("img.onerror=()=>")&&
 !mario.includes("turtle:{")&&!mario.includes("type:'turtle'"));
check('Patrulha, alerta e perseguicao com memoria',mario.includes("enemy.aiState='alert'") &&
 mario.includes("enemy.aiState='chase'")&&mario.includes('enemy.patrolSpeed*1.25') &&
 mario.includes('enemy.alertUntil=elapsedSeconds+.42'));
check('Perseguicao respeita chao e bloqueios',mario.includes('!hasFloorAhead(enemy,terrain)')&&
 mario.includes("enemy.vx=0; // Perseguição não força a queda em buracos.")&&
 mario.includes('function enemyCanSpotHero(enemy,terrain)'));
check('Sprites e particulas de inimigos derrotados',mario.includes('fallenEnemies.push(')&&
 mario.includes('const sprite=sprites.dead')&&mario.includes('defeatEnemy(enemy,150)')&&
 mario.includes('defeatEnemy(enemy,100)'));
check('Efeitos das moedas e checkpoints',mario.includes('drawCombatFxWorld()')&&
 mario.includes('function checkpointChime()')&&
 mario.includes("['#fff6ad','#ffe376','#eea534']")&&
 mario.includes('skyCheckpointReached=true;skyCheckpointX=1650;score+=250;setHUD();'));
const spotSource=mario.match(/        function enemyCanSpotHero\(enemy,terrain\)\{[\s\S]*?\n        \}/)?.[0];
check('Deteccao de inimigos extraivel para regressao',!!spotSource);
function spotWithPlayer(player){
 return new Function('player',spotSource+'\nreturn enemyCanSpotHero;')(player);
}
const sampleEnemy={x:80,y:348,w:32,h:32,vx:1.5};
check('Inimigo avista Gabriel somente a frente',spotWithPlayer({x:175,y:348,w:32,h:32})(sampleEnemy,[])===true &&
 spotWithPlayer({x:25,y:348,w:32,h:32})(sampleEnemy,[])===false);
check('Inimigo nao ve Gabriel atras de parede ou longe',spotWithPlayer({x:175,y:348,w:32,h:32})(
 sampleEnemy,[{x:145,y:335,w:25,h:70,type:'brick'}])===false &&
 spotWithPlayer({x:450,y:348,w:32,h:32})(sampleEnemy,[])===false);


check('Novo botao de ativacao usa hamburguer e tecla T',mario.includes('id="btn-power"') &&
 mario.includes('src="79.png"') && mario.includes("e.code==='KeyT'&&!e.repeat") &&
 mario.includes("activateSuperFromBurger();") && mario.includes("e.code==='KeyX'&&!e.repeat"));
check('Botao B deslocado para cima e direita',mario.includes('left:clamp(22px,4vw,52px)') &&
 mario.includes('top:clamp(-42px,-7dvh,-22px)') &&
 mario.includes("button.classList.toggle('sgb-dash-visible',show)"));
check('Perseguicao possui retorno a patrulha apos 10 segundos',mario.includes('const ENEMY_LOST_SIGHT_SECONDS=10')&&
 mario.includes('function enemyHasVisualContact(enemy,terrain)') &&
 mario.includes("enemy.aiState='patrol'") &&
 mario.includes('enemy.lastSeenAt=elapsedSeconds') &&
 mario.includes('enemy.vx=enemy.patrolDirection*enemy.patrolSpeed'));

const powerSource=mario.match(/        function activateSuperFromBurger\(\)\{[\s\S]*?\n        \}/)?.[0];
check('Ativacao de Super Forca isolada para regressao',!!powerSource);
const powerDemo=new Function(`
 const inventory={consumables:{burger:2}},superPower={until:0,dashUntil:1,cooldownUntil:1};
 let state='playing',menuOpen=false,elapsedSeconds=5,writes=0;
 function isSuperGabriel(){return elapsedSeconds<superPower.until}
 function persistInventory(){writes++}
 function renderInventory(){}
 function updateDashButton(){}
 function showItemToast(){}
 function cancelGabrielAfk(){} // AFK é cosmético no simulador isolado do poder.
 ${powerSource}
 return {trigger:activateSuperFromBurger,get:()=>({burger:inventory.consumables.burger,until:superPower.until,writes})};
`)();
check('Ativacao consome um hamburguer e dura indefinidamente nesta fase',powerDemo.trigger()===true &&
 powerDemo.get().burger===1 && powerDemo.get().until===Infinity && powerDemo.get().writes===1);
check('Repetir atalho nao consome segundo hamburguer',powerDemo.trigger()===false &&
 powerDemo.get().burger===1 && powerDemo.get().writes===1);

const chaseSource=mario.match(/        function updateEnemies\(\)\{[\s\S]*?\n        \}/)?.[0];
check('Loop de inimigos isolado para regressao',!!chaseSource);
const chaseDemo=new Function(`
 let elapsedSeconds=0, invulnerable=2;
 const player={x:250,y:348,w:32,h:32,vy:0,jumpPower:-10};
 const enemies=[{x:100,y:348,w:32,h:32,vx:1.5,type:'mushroom',alive:true,
 aiState:'chase',patrolSpeed:1.5,patrolDirection:1,lastSeenAt:0}];
 let canSee=false;
 function enemyHasVisualContact(){return canSee}
 function enemyCanSpotHero(){return false}
 function activeBlocks(){return []}
 function isColliding(){return false}
 function hasFloorAhead(){return true}
 function enemyDifficultyMultiplier(){return 1}
 function updateLeekShowOff(){}
 function isDashing(){return false}
 function defeatEnemy(){}
 function setHUD(){}
 function loseLife(){throw Error('unexpected contact')}
 const ENEMY_LOST_SIGHT_SECONDS=10;
 ${chaseSource}
 return {setTime:t=>elapsedSeconds=t,setVision:v=>canSee=v,step:updateEnemies,state:()=>enemies[0].aiState};
`)();
chaseDemo.setTime(9.9);chaseDemo.step();
check('Perseguicao continua antes dos dez segundos sem contato',chaseDemo.state()==='chase');
chaseDemo.setTime(10.1);chaseDemo.step();
check('Perseguicao termina depois de dez segundos sem contato',chaseDemo.state()==='patrol');


// Polimento antes da Fase 4: andar dos mobs, fala transformada e Game Over.
check('Game Over com mensagem de Vitoria sem acento',
 mario.includes("overlay('GAME OVER','A VITORIA FOI TALARICADA','CLIQUE EM RECOMEÇAR')") &&
 !mario.includes("overlay('GAME OVER','AS VIDAS ACABARAM'"));

check('Inimigos alinham os três frames de caminhada',
 mario.includes('function alignEnemyWalkFrames(type)')&&
 mario.includes('alignEnemyWalkFrames(type);')&&
 mario.includes('height-source.height')&&
 mario.includes("const names=['walk1','walkMid','walk2']"));
const walkAlignSource=mario.match(/        function alignEnemyWalkFrames\(type\)\{[\s\S]*?\n        \}/)?.[0];
check('Alinhamento de sprite extraível',!!walkAlignSource);
const walkingImages={mushroom:{
 walk1:{width:40,height:50},walkMid:{width:42,height:48},walk2:{width:44,height:46}}};
const drawCalls=[];
new Function('processedAssets','document',walkAlignSource+'\nalignEnemyWalkFrames("mushroom")')(
 {mobFrames:walkingImages},
 {createElement:()=>({width:0,height:0,getContext:()=>({imageSmoothingEnabled:false,
 drawImage:(...args)=>drawCalls.push(args)})})}
);
check('Frames walk1, walkMid e walk2 mantêm base e dimensão iguais',
 ['walk1','walkMid','walk2'].every(x=>
 walkingImages.mushroom[x].width===44&&walkingImages.mushroom[x].height===50)&&
 drawCalls.length===3&&drawCalls[0][2]===0&&drawCalls[1][2]===2&&drawCalls[2][2]===4);
check('Quadros do inimigo dependem de deslocamento e não da posição X',
 mario.includes('const traveled=Math.abs(enemy.x-oldX)') &&
 mario.includes('enemy.walkDistance=(enemy.walkDistance||0)+traveled') &&
 mario.includes('enemyWalkPose(e.walkDistance||0)') &&
 !mario.includes('elapsedSeconds*8+e.x*.03'));

const actualEnemySource=mario.match(/        function updateEnemies\(\)\{[\s\S]*?\n        \}/)?.[0];
function simulateWalk(vx){
 return new Function(`
 const enemies=[{x:100,y:348,w:32,h:32,vx:${vx},type:'mushroom',alive:true}];
 const player={x:400,y:340,w:24,h:40,vy:0,jumpPower:-13};
 let elapsedSeconds=0,invulnerable=2;
 function activeBlocks(){return []} function enemyCanSpotHero(){return false}
 function enemyHasVisualContact(){return false} function hasFloorAhead(){return true}
 function isColliding(){return false} function enemyDifficultyMultiplier(){return 1}
 function updateLeekShowOff(){}
 function isDashing(){return false} function defeatEnemy(){}
 function setHUD(){} function loseLife(){}
 const ENEMY_LOST_SIGHT_SECONDS=10;
 ${actualEnemySource}
 const distances=[],frames=[];
 for(let i=0;i<22;i++){
   updateEnemies();
   const e=enemies[0];distances.push(e.walkDistance);
   frames.push(Math.floor((e.walkDistance||0)/7)%4);
 }
 return {distances,frames};
 `)();
}
const walkRight=simulateWalk(2),walkLeft=simulateWalk(-2);
check('Esquerda e direita alternam no mesmo ritmo por distância',
 walkLeft.frames.join(',')===walkRight.frames.join(',') &&
 [0,1,2,3].every(frame=>walkRight.frames.includes(frame)) &&
 walkLeft.distances.every((v,i)=>v===walkRight.distances[i]));

// Gabriel 2026: imagens individuais substituem pintura da boca.
const gabrielFiles=[
 '125.png','126 idle.png','127 walk 1.png','128 walk 2.png','129 up.png',
 '130.png','131.png','132.png','133.png','134.png','135.png',
 '136.png','137.png','138.png','139.png','140.png','141.png',
 '142.png','143.png','144.png','145.png'
];
check('21 novas imagens Gabriel publicadas no GitHub',
 gabrielFiles.every(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Poses adultas carregadas e recortadas pela transparência',
 mario.includes('const gabrielSpritePaths=')&&
 mario.includes("idle:'126 idle.png'")&&mario.includes("walk1:'190 walk 1.png',walkMid:'191 mid.png',walk2:'192 walk 2.png'")&&
 mario.includes("talkOpen:'131.png'")&&mario.includes("talkClosed:'132.png'")&&
 mario.includes("dash:'142.png'")&&mario.includes("jumpApex:'144.png'")&&
 mario.includes('processedAssets.gabriel[form][pose]=cropSprite(image)'));
check('Diálogos do herói usam boca aberta e fechada sem pintura no rosto',
 mario.includes("speaking,voiceOpen:Math.floor(gameNow/160)%2===0")&&
 mario.includes("if(speaking)return voiceOpen?'talkOpen':'talkClosed'")&&
 mario.includes('drawGabrielNew(player.x+player.w/2,player.y+player.h)')&&
 !mario.includes("isSuperGabriel()&&sprite===powerful)"));
check('Vitoria possui animação de boca própria sem remendo no rosto',
 mario.includes('function drawVitoriaNew(')&&
 mario.includes("speaking,voiceOpen:Math.floor(gameNow/165)%2===0")&&
 mario.includes("if(speaking)return voiceOpen?'talkOpen':'talkClosed'")&&
 !mario.includes('drawSpeakingSprite(processedAssets.princess,'));
const poseSource=mario.match(/        function gabrielPoseName\(\{[\s\S]*?\n        \}/)?.[0];
check('Seletor de poses do novo Gabriel está disponível',!!poseSource);
const selectPose=new Function(poseSource+'\nreturn gabrielPoseName;')();
check('Pulo em três fases guiado pela velocidade',
 selectPose({grounded:false,vy:-10})==='jumpRise'&&
 selectPose({grounded:false,vy:-1})==='jumpApex'&&
 selectPose({grounded:false,vy:8})==='jumpFall');
check('Somente Super Gabriel pode executar dash',
 selectPose({powered:true,dashing:true})==='dash'&&
 selectPose({powered:false,dashing:true})==='idle');
check('Gabriel normal percorre o ciclo passo-meio-passo-meio',
 [0,1,2,3,4].map(walkFrame=>selectPose({moving:true,walkFrame})).join(',')===
 'walk1,walkMid,walk2,walkMid,walk1'&&selectPose({moving:false})==='idle');
check('Dialogo prioriza imagens de boca dos dois personagens',
 selectPose({powered:false,speaking:true,voiceOpen:true})==='talkOpen'&&
 selectPose({powered:true,speaking:true,voiceOpen:false})==='talkClosed');
check('145.png é a pose oficial de queda do Super Gabriel',
 mario.includes("dash:'142.png',jumpRise:'143.png',jumpApex:'144.png',jumpFall:'145.png'")&&
 mario.includes("jumpRise:'136.png',jumpApex:'137.png',jumpFall:'138.png'")&&
 !mario.includes("jumpFallAlt:'145.png'")&&
 mario.includes("const sprite=form[pose]||"));
check('Gabriel usa tamanho compatível com NPCs na CANO BURGER',
 mario.includes('drawGabrielNew(player.x+player.w/2,CANO_FLOOR,{inShop:true})')&&
 mario.includes("const height=powered?(pose==='dash'?65:69):64"));
check('Sprites legados preservados apenas como fallback',
 mario.includes('processedAssets.heroFrames?.[0]')&&
 mario.includes('processedAssets.superHeroFrames?.[0]'));

// Investida: ajuste pontual de ergonomia, com demais mecânicas preservadas.
check('Investida menos intensa, com cooldown original',
 mario.includes('DASH_SPEED=9, DASH_DURATION=.40, DASH_COOLDOWN=.95') &&
 mario.includes('player.vx=superPower.facing*DASH_SPEED') &&
 !mario.includes('player.vx=superPower.facing*13'));
const moveSection=mario.match(/          const effectiveSpeed=player\.speed\*[\s\S]*?          else player\.vx=0;/)?.[0];
check('Controle de movimento da investida disponível para regressão',!!moveSection);
function checkDashMotion(facing,pressedLeft,pressedRight){
 const player={vx:0,direction:facing,speed:5.5};
 const superPower={facing,dashUntil:1,cooldownUntil:1.1};
 const keys={left:pressedLeft,right:pressedRight};
 const elapsedSeconds=.1,activeBuffs={speedUntil:0};
 const DASH_SPEED=9;
 const isDashing=()=>elapsedSeconds<superPower.dashUntil;
 new Function('player','superPower','keys','elapsedSeconds','activeBuffs','isDashing','DASH_SPEED',moveSection)(
 player,superPower,keys,elapsedSeconds,activeBuffs,isDashing,DASH_SPEED);
 return {speed:player.vx,direction:player.direction,active:isDashing(),cooldown:superPower.cooldownUntil};
}
const dashRight=checkDashMotion(1,false,false),dashLeft=checkDashMotion(-1,false,false);
check('Dash mantém mesma intensidade nos dois sentidos',
 dashRight.speed===9&&dashLeft.speed===-9&&dashRight.active&&dashLeft.active);
const stopRight=checkDashMotion(1,true,false),stopLeft=checkDashMotion(-1,false,true);
check('Direção oposta interrompe o dash e devolve controle',
 stopRight.speed===-5.5&&!stopRight.active&&stopRight.direction===-1&&
 stopLeft.speed===5.5&&!stopLeft.active&&stopLeft.direction===1);
check('Interromper dash não altera cooldown',
 stopRight.cooldown===1.1&&stopLeft.cooldown===1.1);

 
// CANO BURGER: destino horizontal independente com economia de campanha.
const canoSprites=[
 '94 humberto.png','95 alan.png','96 alan walk 1.png','97 alan walk 2.png',
 '98 alan up.png','99 alan down.png','100 alan open.png','101 alan close.png',
 '102 alan greet.png','103 alan happy.png','104 thinking.png','105 alan surprised.png',
 '106 alan cruzado.png','107 humberto idle.png','108 humberto walk 1.png',
 '109 humberto walk 2.png','110 humberto up.png','111 humberto down.png',
 '112 humbeto open.png','113 humberto close.png','114 humberto happy.png',
 '115 humberto tchau.png','116 humberto braços cruzados.png',
 '117 humberto surprised.png','118 braços cruzados.png',
 '119.png','120.png','121.png','122.png','123.png','124.png'
];
check('31 arquivos CANO BURGER publicados na raiz',
 canoSprites.every(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('CANO BURGER no mapa sem substituir fase 1–3',
 mario.includes("id:'shop',name:'CANO BURGER'")&&
 mario.includes("if(node.id==='shop'){enterCanoShop();return;}")&&
 mario.includes("if(state==='shop'){drawCanoShop();return;}")
);
check('Duas portas utilizáveis e loja como fase horizontal',
 mario.includes('CANO_WIDTH=2240')&&mario.includes('CANO_FRONT_X=160')&&
 mario.includes("if(Math.abs(x-CANO_FRONT_X)<76)")&&mario.includes("if(Math.abs(x-CANO_BACK_X)<76)")&&
 mario.includes('drawCanoShop()')&&mario.includes('updateCanoShop(dt)'));
check('Balção vende apenas o hambúrguer da Super Força por 10 moedas',
 mario.includes('CANO_PRICE=10')&&mario.includes("addConsumable('burger',1)")&&
 mario.includes("coins-=CANO_PRICE")&&mario.includes('canoBuyBurger()'));
check('NPCs usam sprites separados, escala normalizada e passeiam',
 mario.includes('const canoNpcPaths=')&&mario.includes('const scale=height/img.height')&&
 mario.includes('npc.x+=npc.dir*distance')&&mario.includes("npc.pose=['walk1','walkMid','walk2','walkMid'][Math.floor(npc.walked/9)%4]"));
check('Discussões são embaralhadas e não repetem antes de esgotar baralho',
 (mario.match(/\[\['ALAN',/g)||[]).length>=10&&
 mario.includes('function shuffledShopDeck(avoidFirst=shopLastConversation)')&&
 mario.includes('shopConversationDeck.shift()')&&mario.includes('shopLastConversation=index'));
check('Discussão termina antes de NPC notar Gabriel',
 mario.includes('shopConversation.noticed=true')&&
 mario.includes('if(shopConversation.noticed&&!shopConversation.recognized)')&&
 mario.includes("shopConversation.lines.push(['ALAN'")&&
 mario.includes("shopConversation.lines.push(['HUMBERTO'"));
const canoBuySource=mario.match(/        function canoBuyBurger\(\)\{[\s\S]*?\n        \}/)?.[0];
check('Função de compra pode ser isolada para testes',!!canoBuySource);
function simulateCanoPurchase(balance,stock){
 const f=new Function(
  "let state='shop',shopPanelOpen=true,coins="+balance+
  ",inventory={consumables:{burger:"+stock+"}},CANO_PRICE=10,activeSlot=0,saveCount=0,shopClock=0,canoSelectedItem='burger',shopActors=[{name:'alan'},{name:'humberto'}];"+
  "function addConsumable(id,n){if(inventory.consumables[id]>=99)return false;inventory.consumables[id]+=n;return true;}"+
  "function unlockInventory(){}function renderInventory(){}function setHUD(){}"+
  "function saveCurrentSlot(){saveCount++;}function canoUpdateCounter(){}function showItemToast(){}"+
  canoBuySource+
  "return {buy:canoBuyBurger,get:()=>({coins,stock:inventory.consumables.burger,saveCount})};"
 );
 return f();
}
const shopCanBuy=simulateCanoPurchase(20,0);
check('Compra cobra 10 moedas e concede exatamente 1 hambúrguer',
 shopCanBuy.buy()===true&&shopCanBuy.get().coins===10&&shopCanBuy.get().stock===1&&shopCanBuy.get().saveCount===1);
const shopCannotBuy=simulateCanoPurchase(9,0);
check('Sem saldo não desconta moedas nem concede item',
 shopCannotBuy.buy()===false&&shopCannotBuy.get().coins===9&&shopCannotBuy.get().stock===0);
const shopFull=simulateCanoPurchase(100,99);
check('Inventário cheio impede compra e preserva saldo',
 shopFull.buy()===false&&shopFull.get().coins===100&&shopFull.get().stock===99);

// A loja e as fases usam o mesmo seletor do Gabriel.
check('CANO BURGER compartilha animação sem saltos indevidos',
 mario.includes('const walkFrame=powered?Math.floor(superRunClock/.09)%4:')&&
 mario.includes('inShop?Math.floor(shopHeroDistance/22)%4:player.animFrame')&&
 mario.includes("grounded:inShop||state!=='playing'||player.grounded")&&
 mario.includes('drawGabrielNew(player.x+player.w/2,CANO_FLOOR,{inShop:true})'));
check('Gabriel volta ao Idle quando para na loja',
 selectPose({grounded:true,moving:false})==='idle');


// Polimento Super Gabriel: conjunto mínimo 146, 147 e 149.
// São arquivos opcionais até o upload ser publicado na branch main.
// A ausência temporária não deve quebrar cenas nem o restante da campanha.
check('Corrida Super referencia somente as duas novas poses enviadas',
 mario.includes("runPassing1:'146 run 1.png'")&&
 mario.includes("runPassing2:'147 run 2.png'")&&
 !mario.includes('148 super jump takeoff.png')&&
 mario.includes("landing:'149 landing.png'"));
check('Renderizador tem fallback quando os novos PNGs ainda estão ausentes',
 mario.includes('const sprite=form[pose]||')&&
 mario.includes("form.idle||")&&
 mario.includes('processedAssets.superHeroFrames?.[0]'));
const superRunSource=mario.match(/        function gabrielPoseName\(\{[\s\S]*?\n        \}/)?.[0];
check('Seletor da corrida Super pode ser testado isoladamente',!!superRunSource);
const selectSuperPose=new Function(superRunSource+'\nreturn gabrielPoseName;')();
const motion=[0,1,2,3,4,5,6,7].map(index=>selectSuperPose({powered:true,moving:true,walkFrame:index}));
check('Corrida Super completa ciclo 139/146/139/147 sem Dash',
 motion.join(',')==='idle,runPassing1,idle,runPassing2,idle,runPassing1,idle,runPassing2'&&
 !motion.includes('dash'));
check('Quadro 149 aparece apenas ao pousar como Super Gabriel',
 selectSuperPose({powered:true,grounded:true,landing:true,moving:true})==='landing'&&
 selectSuperPose({powered:false,grounded:true,landing:true,moving:true,walkFrame:0})==='walk1'&&
 selectSuperPose({powered:true,grounded:false,landing:true,vy:10})==='jumpFall');
check('Dash exclusivo continua prioritário ao pouso',
 selectSuperPose({powered:true,dashing:true,landing:true,moving:true})==='dash');
check('Salto original 143/144/145 continua sem uso de 148',
 selectSuperPose({powered:true,grounded:false,vy:-12})==='jumpRise'&&
 selectSuperPose({powered:true,grounded:false,vy:0})==='jumpApex'&&
 selectSuperPose({powered:true,grounded:false,vy:9})==='jumpFall');
check('Temporizador de aterrissagem usa colisão real com solo',
 mario.includes('else if(superWasAirborne){')&&
 mario.includes('superLandingUntil=elapsedSeconds+.12;')&&
 mario.includes("landing:powered&&state==='playing'&&player.grounded&&elapsedSeconds<superLandingUntil"));
check('Ciclo de corrida Super fica pausado no ar, no Dash e parado',
 mario.includes('superRunClock+=dt;')&&
 mario.includes('superRunClock=0;')&&
 mario.includes('Math.floor(superRunClock/.09)%4'));


// CANO BURGER: NPCs autônomos e cena especial de dança.
const canoNewSprites=[
 '150 alan falling.png','151 Alan após a queda.png',
 '152 Alan se levantando, envergonhado.png','153 Alan Conferindo o Smartphone.png',
 '154.png','155 sleeping.png','156 alan dance 1.png','157 alan dance 2.png',
 '158 humberto falling.png','159 humberto down.png','160.png',
 '161 smartphone.png','162 looking.png','163 sleeping.png',
 '164 laughing.png','165 sarcs.png'
];
check('Todos os 16 sprites novos de Alan e Humberto estão publicados',
 canoNewSprites.every(file=>fs.existsSync(path.join(root,file))&&
 fs.statSync(path.join(root,file)).size>1000));
check('Sprites das atividades associam pose e arquivo corretos',
 mario.includes("slip:'150 alan falling.png',fall:'151 Alan após a queda.png'")&&
 mario.includes("phoneLook:'153 Alan Conferindo o Smartphone.png',phoneType:'154.png'")&&
 mario.includes("sleep:'155 sleeping.png',dance1:'156 alan dance 1.png',dance2:'157 alan dance 2.png'")&&
 mario.includes("slip:'158 humberto falling.png',fall:'159 humberto down.png'")&&
 mario.includes("sleep:'163 sleeping.png',laugh:'164 laughing.png',sarcasm:'165 sarcs.png'"));
check('Dança permanece no baralho, mas não abre a visita obrigatoriamente',
 mario.includes('PARA DE VIADAGEM MLK! ISSO AQUI É UMA HAMBURGUERIA!')&&
 mario.includes('const index=shopConversationDeck.shift();')&&
 mario.includes('const dancing=index===10||index===canoArguments.length-1;')&&
 !mario.includes('shopDancePending'));
check('Primeira cena é embaralhada a cada entrada na loja',
 mario.includes('shopConversationDeck=shuffledShopDeck(shopFirstEventPrevious)')&&
 mario.includes('if(shopConversationCount===0)shopFirstEventPrevious=index')&&
 mario.includes('shopConversationCount++'));
check('Banter aguarda ação autônoma e diálogos seguem sem corte',
 mario.includes('if(shopActors.some(n=>n.activity))return false')&&
 mario.includes('npc.pose=canoConversationPose(npc)')&&
 mario.includes("shopConversation.lines.push(['ALAN'")&&
 mario.includes("shopConversation.lines.push(['HUMBERTO'"));
check('Celular, cochilo, dança, risadas e quedas têm rotina própria',
 mario.includes("let pool=npc.name==='alan'?")&&
 mario.includes("['phone','phone','sleep','dance','dance','trip','phone','sleep']")&&
 mario.includes("['phone','phone','sleep','laugh','sarcasm','trip']")&&
 mario.includes("if(action.kind==='trip')")&&
 mario.includes("if(action.kind==='phone')"));
check('Vendedores só escolhem nova atividade ao chegar a destino',
 mario.includes("if(Math.abs(npc.target-npc.x)<8){")&&
 mario.includes("shopClock<shopNextConversation&&Math.random()<.40"));
check('Queda não é exibida com altura de sprite em pé',
 mario.includes("npc.pose==='fall'?38:")&&
 mario.includes("npc.pose==='slip'?55:npc.pose==='getup'?54:66"));
check('Gabriel aguarda conclusão da queda antes de conversar com o NPC',
 mario.includes("if(npc.activity?.kind==='trip')")&&
 mario.includes('ESPERA ELE SE LEVANTAR PRIMEIRO!'));
const activitySource=mario.match(/        function canoUpdateActivity\(npc\)\{[\s\S]*?\n        \}/)?.[0];
check('Rotina de animação de NPC extraível para regressão',!!activitySource);
function activityPose(kind,second){
 const npc={pose:'idle',rest:0,activity:{kind,start:0,duration:kind==='trip'?3:
  kind==='phone'?5.2:kind==='dance'?3.7:5.8}};
 const fn=new Function('shopClock',activitySource+'\nreturn canoUpdateActivity;')(second);
 const ongoing=fn(npc);
 return {ongoing,pose:npc.pose};
}
check('Sequência de escorregão termina em levantar antes de voltar a Idle',
 activityPose('trip',.2).pose==='slip'&&
 activityPose('trip',1).pose==='fall'&&
 activityPose('trip',2.4).pose==='getup'&&
 activityPose('trip',3.2).pose==='idle');
check('Celular alterna quadros sem deslocamento',
 activityPose('phone',.2).pose==='phoneLook'&&
 activityPose('phone',.8).pose==='phoneType');
check('Dança alterna quadros 156 e 157',
 activityPose('dance',.2).pose==='dance2'&&
 activityPose('dance',.5).pose==='dance1');


// Regressão: nova vitrine e animações autônomas.
const shuffleSource=mario.match(/        function shuffledShopDeck\([\s\S]*?\n        \}/)?.[0];
check('Função de embaralhamento isolável',!!shuffleSource);
const shuffleDeck=new Function('canoArguments','shopLastConversation',
 shuffleSource+'\nreturn shuffledShopDeck;')(Array.from({length:33},(_,i)=>i),4);
const firstDeck=shuffleDeck(8);
check('Baralho não repete a abertura nem perde cenas',
 firstDeck.length===33&&new Set(firstDeck).size===33&&firstDeck[0]!==8&&firstDeck[0]!==4);
check('A dança fica mais comum, mas tem cooldown de 32 segundos',
 mario.includes("'dance','dance','trip'")&&
 mario.includes("shopClock<(npc.nextDanceAt||0)")&&
 mario.includes("npc.nextDanceAt=shopClock+32")&&
 mario.includes("if(dancing)shopActors[0].nextDanceAt=shopClock+32"));
check('Novas provocações ácidas foram incorporadas ao baralho',
 mario.includes('TU É UM ACIDENTE COM CPF!')&&
 mario.includes('DE NOVO ESSA VIADAGEM, MLK?!')&&
 mario.includes('TÔ PREOCUPADO COM O CHÃO, COITADO!'));

const shopHtml=mario.split('<section id="cano-shop-panel"')[1]?.split('<section id="sgb-menu"')[0]||'';
check('Balcão contém seis slots, sendo um hambúrguer e cinco vazios',
 (shopHtml.match(/class="cano-stock-slot/g)||[]).length===6&&
 (shopHtml.match(/data-cano-item="burger"/g)||[]).length===1&&
 (shopHtml.match(/data-cano-item="empty"/g)||[]).length===5);
check('Balcão separa saldo, preço, estoque e descrição',
 ['cano-shop-money','cano-shop-price','cano-shop-stock','cano-shop-item-name',
  'cano-shop-description'].every(id=>shopHtml.includes('id="'+id+'"')));
check('Seleção funciona por hover, clique e foco do teclado',
 (shopHtml.match(/onmouseenter="canoPreviewShopItem/g)||[]).length===6&&
 (shopHtml.match(/onclick="canoSelectShopItem/g)||[]).length===6&&
 (shopHtml.match(/onfocus="canoPreviewShopItem/g)||[]).length===6&&
 (shopHtml.match(/onblur="canoClearShopPreview/g)||[]).length===6);
check('Preço e saldo são atualizados dinamicamente sem comprar slot vazio',
 mario.includes("money.textContent='🪙 '+coins+' moedas'")&&
 mario.includes("price.textContent=burger?'🪙 '+CANO_PRICE+' moedas':'—'")&&
 mario.includes("buy.disabled=!burger||canoSelectedItem!=='burger'||coins<CANO_PRICE||stock>=99")&&
 mario.includes("if(state!=='shop'||!shopPanelOpen||canoSelectedItem!=='burger')return false"));
check('Vitrine informa indisponibilidade de itens futuros',
 mario.includes("name.textContent=burger?'Hambúrguer da Super Força':'Espaço reservado'")&&
 mario.includes('Novo item chegando em breve à CANO BURGER.'));
check('Layout minimalista se adapta a mobile e tela horizontal',
 mario.includes('.cano-shop-body{display:grid;grid-template-columns:')&&
 mario.includes('@media(max-width:530px)')&&
 mario.includes('@media(max-height:500px) and (min-width:580px)'));

// Teste de cenário clean: imagens 120 e 124 desativadas (não excluídas do repositório).
const shopDrawer=mario.split('function drawCanoShop(){')[1]?.split('\n        function ')[0]||'';
check('CANO BURGER não carrega foreground 120 nem decorações 124',
 !mario.includes("canoForeground:'120.png'")&&
 !mario.includes("canoDecor:'124.png'"));
check('CANO BURGER não desenha imagens 120 ou 124 na cena',
 !shopDrawer.includes('extras.canoForeground')&&
 !shopDrawer.includes('extras.canoDecor'));
check('CANO BURGER mantém cenário, balcão e ambas as portas',
 mario.includes("canoBackground:'119.png'")&&
 mario.includes("canoCounter:'121.png'")&&
 mario.includes("canoFront:'122.png'")&&
 mario.includes("canoBack:'123.png'")&&
 shopDrawer.includes('extras.canoBackground')&&
 shopDrawer.includes('extras.canoCounter')&&
 shopDrawer.includes('extras.canoFront')&&
 shopDrawer.includes('extras.canoBack'));


// Vitoria adulta: 16 arquivos incluindo dois 176 diferentes e 174 com nome real.
const vitoriaFiles=[
 '166 vitoria idle.png','167 vitoria walk.png','168 walk 2.png',
 '169 vitoria up.png','170 vitoria down.png','171 vitoria opened.png',
 '172 closed.png','173 vitoria surprised.png','174 viroria happy.png',
 '175 hmm.png','176 high.png','176 vitoria jumping.png','177 landing.png',
 '178 worried.png','179 celebrating.png','180 ok.png'
];
check('16 arquivos novos da Vitoria publicados com nomes exatos',
 vitoriaFiles.every(file=>fs.existsSync(path.join(root,file))&&
 fs.statSync(path.join(root,file)).size>1000));
check('Nova Vitoria usa carregamento e recorte por alpha',
 mario.includes('const vitoriaSpritePaths={')&&
 mario.includes('processedAssets.vitoria[pose]=cropSprite(image)')&&
 mario.includes("idle:'166 vitoria idle.png'")&&
 mario.includes("talkOpen:'171 vitoria opened.png'")&&
 mario.includes("talkClosed:'172 closed.png'")&&
 mario.includes("happy:'174 viroria happy.png'")&&
 mario.includes("jumpRise:'176 vitoria jumping.png',jumpApex:'176 high.png'"));
check('Pose da Vitoria é selecionada de forma isolável',
 /function vitoriaPoseName\(/.test(mario));
const vitoriaPoseSource=mario.match(/        function vitoriaPoseName\([\s\S]*?\n        \}/)?.[0];
const selectVitoria=new Function(vitoriaPoseSource+'\nreturn vitoriaPoseName;')();
check('Vitoria alterna fala em boca aberta/fechada sem mudar escala',
 selectVitoria({speaking:true,voiceOpen:true})==='talkOpen'&&
 selectVitoria({speaking:true,voiceOpen:false})==='talkClosed'&&
 selectVitoria({speaking:false,pose:'worried'})==='worried');
check('Vitoria percorre o ciclo passo-meio-passo-meio',
 [0,1,2,3,4].map(walkFrame=>selectVitoria({moving:true,walkFrame})).join(',')===
 'walk1,walkMid,walk2,walkMid,walk1'&&selectVitoria({moving:false})==='idle');
check('Vitoria tem altura visual próxima ao novo Gabriel e pés alinhados',
 mario.includes('const VITORIA_VISUAL_HEIGHT=68;')&&
 mario.includes('const princess={x:7485,y:312,w:32,h:68}')&&
 mario.includes('drawSpriteOnFeet(image,centerX,footY,height,facing)'));
check('Três fases e cutscene inicial usam novo renderizador',
 mario.includes('drawVitoriaNew(princess.x+princess.w/2,princess.y+princess.h,')&&
 (mario.match(/drawVitoriaNew\(0,0,\{/g)||[]).length===3&&
 !mario.includes('drawSpeakingSprite(processedAssets.princess,'));
check('Sprite antigo de Vitoria disponível somente como fallback',
 mario.includes('processedAssets.vitoria.idle||processedAssets.princess'));
check('Todas as poses adicionais estão nomeadas e prontas para futuras ações',
 ['lookUp','lookDown','surprised','happy','thinking','jumpRise','jumpApex','landing',
 'worried','celebrating','ok'].every(p=>new RegExp('\\b'+p+':').test(mario)));


// Vale das Origens — regressão da reconstrução integral da Fase 1.
const valleyArtSource=mario.match(/        const valleyAssetPaths=\{[\s\S]*?\n        \};/)?.[0];
check('Catálogo de assets do Vale da Fase 1 é isolável',!!valleyArtSource);
const valleyAssets=new Function(valleyArtSource+'\nreturn valleyAssetPaths;')();
const valleyFiles=Object.values(valleyAssets);
check('24 assets no Vale incluindo plataforma 248 e abismo 249, sem Super Suco',
 valleyFiles.length===24&&valleyAssets.grassTrim==='238 grass.png'&&
 !valleyFiles.includes('232 potion.png')&&
 valleyFiles.every(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Novo moinho, árvores e cerca usam PNGs completos',
 valleyAssets.windmill==='241 moinho.png'&&
 valleyAssets.treeOak==='235 tree.png'&&
 valleyAssets.treeCurved==='236 giga tree.png'&&
 valleyAssets.fenceComplete==='237 fancy.png'&&
 !valleyFiles.includes('227 atenção 10.png')&&
 !valleyFiles.includes('221 atenção 5.png')&&
 !valleyFiles.includes('224 atenção 8.png'));
check('Ponte, rocha e novo abismo usam sprites corretos',
 valleyAssets.bridge==='239 bridge.png'&&
 valleyAssets.rock==='240 rock.png'&&
 valleyAssets.woodPlatform==='248.png'&&
 valleyAssets.hole==='249.png'&&
 !valleyFiles.includes('243_pit.png')&&
 !valleyFiles.includes('242 hole.png')&&
 !valleyFiles.includes('219 bridge.png')&&
 !valleyFiles.includes('227.png'));
check('Remanescem apenas os atlas de solo, tocha e brilho',
 ['211 atenção.png','229 torch.png','233 shines.png']
 .every(file=>valleyFiles.includes(file))&&
 mario.includes('function valleyFrame(key,col,row,cols,rows)')&&
 mario.includes('valleyAtlasCache=new Map()'));
const valleyLayoutSource=mario.match(/        const VALLEY_END=8000;[\s\S]*?        const level2Blocks=\[/)?.[0]?.split('        const level2Blocks=[')[0];
check('Geometria da nova fase de 8000px isolável',!!valleyLayoutSource);
const valleyWorld=new Function(valleyLayoutSource+
 '\nreturn {VALLEY_END,princess,castle,level1Blocks,level1EnemyTemplate,valleyCheckpoints,valleyChests,valleyGaps};')();
const valleyGrounds=valleyWorld.level1Blocks.filter(b=>b.type==='valleyGround').sort((a,b)=>a.x-b.x);
check('Quatro buracos preservam colisões e usam o centro proporcional do painel 249',
 valleyWorld.valleyGaps.length===4&&
 valleyWorld.valleyGaps.every(g=>g.w===128)&&
 valleyWorld.valleyGaps.map(g=>g.x).join(',')==='1472,2880,4352,6080'&&
 mario.includes('const sx=Math.round(iw*.30),sw=Math.round(iw*.40);')&&
 mario.includes('const sy=Math.round(ih*.26),sh=Math.round(ih*.52);')&&
 mario.includes('const height=Math.round(width*sh/sw);')&&
 mario.includes('ctx.drawImage(art,sx,sy,sw,sh,x,y,width,height);')&&
 mario.includes('drawValleyGapBackdrops();'));
check('Novo chão cobre cinco áreas de 8000 px com buracos fáceis',
 valleyWorld.VALLEY_END===8000&&valleyGrounds.length===5&&
 valleyGrounds[0].x===0&&
 valleyGrounds.at(-1).x+valleyGrounds.at(-1).w===valleyWorld.VALLEY_END&&
 valleyGrounds.slice(1).every((g,i)=>g.x-(valleyGrounds[i].x+valleyGrounds[i].w)<=128));
check('Castelo e Vitoria ficam perto do fim da fase',
 valleyWorld.princess.x>7300&&valleyWorld.castle.x>valleyWorld.princess.x&&
 valleyWorld.castle.x+valleyWorld.castle.w<=valleyWorld.VALLEY_END);
check('Bolota e Alhopó ficam em solo válido',
 valleyWorld.level1EnemyTemplate.length>=8&&
 valleyWorld.level1EnemyTemplate.every(e=>
  ['mushroom','leek'].includes(e.type)&&
  valleyGrounds.some(g=>e.x>=g.x&&e.x+e.w<=g.x+g.w)));
check('Dois checkpoints e três baús entregam somente moedas',
 valleyWorld.valleyCheckpoints.length===2&&
 valleyWorld.valleyChests.length===3&&
 valleyWorld.valleyCheckpoints.every(x=>valleyGrounds.some(g=>x>=g.x&&x<=g.x+g.w))&&
 mario.includes("showItemToast('BAÚ ENCONTRADO! +3 MOEDAS')")&&
 !mario.includes("addConsumable('superJuice'"));
check('Câmera, respawn e saves seguem nova largura sem alterar esquema Firebase',
 mario.includes('level===1?VALLEY_END-GAME_WIDTH')&&
 mario.includes('level===1?VALLEY_END:level===2?FOREST_END:SKY_END')&&
 mario.includes('lv===1?VALLEY_END-40:3900')&&
 mario.includes('player.x=level===1?(checkpointReached?checkpointX:50)')&&
 rules.includes('sgbValidSave(data,slotId)'));
check('Fase 1 usa parallax, spritesheets recortados e plataforma unilateral',
 mario.includes('function drawValleyBackground()')&&
 mario.includes('function drawValleyTerrain()')&&
 mario.includes("valleyAtlas('soil'")&&
 mario.includes("valleyStandaloneAtFoot(asset,obj.x,380,obj.h,.96)")&&
 mario.includes("b.type==='valleyPlatform'||b.type==='valleyBridge'")&&
 mario.includes("function drawLevelOne(){\n          drawValleyBackground();"));

check('Faixa 238 foi incluída sem recortar spritesheet nem alterar colisão',
 mario.includes("grassTrim:'238 grass.png'")&&
 mario.includes('function drawValleyLowVegetation()')&&
 mario.includes('const groundY=380,drawY=Math.round(groundY-h*.722)')&&
 mario.includes("ground.type!=='valleyGround'")&&
 mario.includes('drawValleyLowVegetation();')&&
 mario.includes('ctx.rect(ground.x,groundY-164,ground.w,164)')&&
 !mario.includes("grassTrim',0,0"));
check('Solo possui preenchimento contínuo sob os tiles para evitar frestas',
 mario.includes("ctx.fillStyle='#875029';ctx.fillRect(b.x,b.y,b.w,b.h)")&&
 mario.includes("ctx.fillStyle='#4cb342';ctx.fillRect(b.x,b.y,b.w,12)")&&
 mario.includes("valleyAtlas('soil'"));
check('Camadas de parallax espelhadas para evitar juntas verticais bruscas',
 mario.includes('const shift=cameraX*speed;')&&
 mario.includes('ctx.translate(sx+width,0);ctx.scale(-1,1);')&&
 mario.includes("valleyParallax('forest',.24"));

check('Moinho e árvores aparecem inteiros em proporção original e ancorados no chão',
 mario.includes('function valleyTrimStandalone(img)')&&
 mario.includes('opacity<16')&&
 mario.includes("const valleyWholeObjects=new Set(['windmill','bridge','rock','treeOak','treeCurved','fenceComplete','chestClosed','chestOpen'])")&&
 mario.includes('const width=Math.round(height*iw/ih)')&&
 mario.includes("valleyStandaloneAtFoot('windmill',obj.x,380,obj.h,.99)")&&
 !mario.includes("valleyAtlas('windmill'")&&
 !mario.includes("valleyAtlas('trees'"));
check('Cerca completa substitui atlas antigo e fica acima da vegetação',
 mario.includes("valleyStandaloneAtFoot('fenceComplete',x,380,51,.98)")&&
 mario.includes('drawValleyForegroundProps();')&&
 !mario.includes("valleyAtlas('fences'"));
check('Quatro placas individuais 244–247 aparecem acima do terreno',
 valleyAssets.signRight==='244_sign_right.png'&&
 valleyAssets.signLeft==='245_sign_left.png'&&
 valleyAssets.signUp==='246_sign_up.png'&&
 valleyAssets.signWarning==='247_sign_warning.png'&&
 mario.includes("const valleySignAssets=['signRight','signLeft','signUp','signWarning'];")&&
 mario.includes('valleyStandaloneAtFoot(key,sign.x,380,90,1)')&&
 mario.includes('for(const sign of valleySigns)drawValleySign(sign)')&&
 !mario.includes("ctx.lineTo(x+72,y+20)")&&
 !mario.includes("valleyAtlas('signs'"));
check('Nenhum sprite fragmentado de madeira, pedra ou folha de encosta é desenhado',
 mario.includes('function drawValleyWoodPlatform(block)')&&
 mario.includes('function drawValleyRock(block)')&&
 !mario.includes("valleyAtlas('wood'")&&
 !mario.includes("valleyAtlas('slopes'")&&
 !mario.includes("valleyAtlas('stone'")&&
 !mario.includes("valleyAtlas('rocks'")&&
 !mario.includes("valleyAtlas('plants'"));
check('Parallax não inclui camadas responsáveis por faixas artificiais no céu',
 !valleyFiles.includes('215 forest 2.png')&&
 !valleyFiles.includes('216 jungle.png')&&
 !mario.includes("valleyParallax('jungle'")&&
 !mario.includes("valleyParallax('forest2'")&&
 mario.includes("valleyParallax('mountains',.10"));

check('Pontes compartilham a altura do chão e não deixam Gabriel flutuando',
 valleyWorld.level1Blocks.filter(b=>b.type==='valleyBridge').length===2&&
 valleyWorld.level1Blocks.filter(b=>b.type==='valleyBridge').every(b=>b.y===380)&&
 mario.includes('function drawValleyBridge(block)')&&
 mario.includes('const x=block.x-13,y=block.y-deckOffset;')&&
 mario.includes("valleyImage('bridge',x,y,width,height);"));
check('Pedras possuem textura 240 sem alterar o tamanho das hitboxes',
 valleyWorld.level1Blocks.filter(b=>b.type==='valleyStone').length===3&&
 mario.includes("const img=valleyArt.rock;")&&
 mario.includes("const foot=block.y+block.h;")&&
 mario.includes("valleyStandaloneAtFoot('rock',block.x+(block.w-width)/2,foot,height)"));
check('Baús abertos e fechados são recortados externamente e apoiados no solo',
 valleyWorld.valleyChests.every(c=>c.y+c.h===380)&&
 mario.includes("'chestClosed','chestOpen'")&&
 mario.includes('chest.y+chest.h,height);')&&
 mario.includes("showItemToast('BAÚ ENCONTRADO! +3 MOEDAS')"));
check('Textura 249 fica abaixo da grama sem água ou plataforma invisível',
 mario.includes("hole:'249.png'")&&
 mario.includes('function drawValleyGapBackdrops()')&&
 mario.includes('ctx.rect(gap.x,groundY-lipOverlap,gap.w,lipOverlap)')&&
 mario.includes('ctx.rect(gap.x-sideOverlap,groundY,')&&
 mario.includes("ctx.fillStyle='#38241f'")&&
 !mario.includes("valleyAtlas('water'")&&
 !valleyFiles.includes('225 atenção 9.png')&&
 !valleyWorld.level1Blocks.some(b=>b.type==='valleyHole'));
check('Todas as placas que indicam o caminho principal apontam para a direita',
 valleyWorld.level1Blocks.filter(b=>b.type==='valleyBridge').every(b=>b.y===380)&&
 mario.includes("{x:4650,p:0}")&&
 !mario.includes("{x:4650,p:1}")&&
 mario.includes("{x:3100,p:0}")&&
 !mario.includes("{x:3100,p:2}")&&
 mario.includes("{x:7260,p:3}"));

check('Plataforma 248 é desenhada inteira em proporção natural sem recortes',
 mario.includes("woodPlatform:'248.png'")&&
 mario.includes('function drawValleyWoodPlatform(block)')&&
 mario.includes('const width=block.w+24,height=Math.round(width*ih/iw);')&&
 mario.includes('const deckOffset=Math.round(height*.29);')&&
 mario.includes("valleyImage('woodPlatform',block.x-12,block.y-deckOffset,width,height);")&&
 !mario.includes("valleyAtlas('wood'"));
check('Fundo 249 não mostra a borda superior e não invade a cena acima do solo',
 mario.includes("hole:'249.png'")&&
 mario.includes('const groundY=380;')&&
 mario.includes('const lipOverlap=4;')&&
 mario.includes('const sideOverlap=12;')&&
 mario.includes('const y=groundY-10;')&&
 !mario.includes('const topY=348;')&&
 mario.includes('ctx.drawImage(art,sx,sy,sw,sh,x,y,width,height);')&&
 mario.includes("drawValleyGapBackdrops(); // parede do abismo atrás das pontes e do solo")&&
 !mario.includes("valleyAtlas('water'"));

// AFK Gabriel: oito imagens, três rotinas e retomada imediata do controle.
const gabrielAfkFiles=[
 '182 picking.png','183 playingg.png','184 playing 2.png',
 '185 watching 1.png','186 watching 2.png',
 '187 sleeping.png','188 bocejo.png','189 guardando portatil.png'
];
check('Oito novos sprites AFK do Gabriel existem no repositorio',
 gabrielAfkFiles.every(name=>fs.existsSync(path.join(root,name))&&
 fs.statSync(path.join(root,name)).size>1000));
check('Carregador mapeia exatamente os oito PNGs AFK',
 mario.includes("afkTakeout:'182 picking.png'")&&
 mario.includes("afkPlay1:'183 playingg.png'")&&
 mario.includes("afkPlay2:'184 playing 2.png'")&&
 mario.includes("afkWatch1:'185 watching 1.png'")&&
 mario.includes("afkWatch2:'186 watching 2.png'")&&
 mario.includes("afkSleep:'187 sleeping.png'")&&
 mario.includes("afkYawn:'188 bocejo.png'")&&
 mario.includes("afkPutaway:'189 guardando portatil.png'"));
check('AFK substitui somente Idle de Gabriel normal e não interfere no Super',
 mario.includes("if(!powered&&!moving&&!speaking&&")&&
 mario.includes("pose=currentGabrielAfkPose()||pose;")&&
 mario.includes("!isSuperGabriel()&&!isDashing()")&&
 mario.includes("pose==='idle'"));
check('AFK é cosmético, sem alterar hitbox, moedas ou estado salvo',
 mario.includes('const gabrielAfk={idle:0,wait:12,action:null,time:0,last:null}')&&
 !/gabrielAfk/.test(mario.match(/function makeSaveSnapshot\(\)\{[\s\S]*?\n        \}/)?.[0]||''));
check('AFK respeita controles mobile, teclado, menus e diálogo',
 mario.includes("if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD',")&&
 mario.includes('cancelGabrielAfk();')&&
 mario.includes("state==='shop'&&!shopPanelOpen&&!shopConversation")&&
 mario.includes("tickGabrielAfk(dt,player.grounded&&Math.abs(player.vx)<.05)")&&
 mario.includes('tickGabrielAfk(dt,direction===0)'));
const afkStart=mario.indexOf('        const GABRIEL_AFK_DURATIONS=');
const afkEnd=mario.indexOf('        // Seletor único para qualquer fase',afkStart);
const afkSource=mario.slice(afkStart,afkEnd);
check('Rotina AFK isolável para testes de comportamento',
 afkStart>=0&&afkEnd>afkStart&&afkSource.includes('function tickGabrielAfk(dt,stationary)'));
function afkSimulator(){
 return new Function(
  "const gabrielAfk={idle:0,wait:12,action:null,time:0,last:null};"+
  "let state='playing',shopPanelOpen=false,shopConversation=null,menuOpen=false,"+
  "inventoryOpen=false,invulnerable=0,powered=false;"+
  "const enemies=[],player={x:50,y:100},"+
  "keys={left:false,right:false,up:false,down:false};"+
  "function isSuperGabriel(){return powered;}function isDashing(){return false;}"+
  afkSource+
  "return {tick:tickGabrielAfk,cancel:cancelGabrielAfk,"+
  "pose:currentGabrielAfkPose,choose:nextGabrielAfkAction,"+
  "at:gabrielAfkPoseAt,state:()=>({...gabrielAfk}),"+
  "setPowered:x=>{powered=x},setMenu:x=>{menuOpen=x},"+
  "setShop:x=>{state='shop';shopConversation=x},"+
  "press:x=>{keys.left=x}};"
 )();
}
const afk=afkSimulator();
check('AFK espera 12 segundos sem se iniciar prematuramente',
 (afk.tick(11.9,true),afk.state().action===null)&&
 (afk.tick(.11,true),!!afk.state().action));
check('AFK escolhe atividades distintas em sequencia',
 ['console','watch','sleep'].every(previous=>afk.choose(previous,.3)!==previous));
check('AFK encerra a atividade e espera antes de repetir',
 (afk.tick(6,true),afk.state().action===null)&&
 (afk.tick(10,true),afk.state().action===null)&&
 (afk.tick(8,true),!!afk.state().action));
check('Um comando interrompe a animação imediatamente',
 (afk.press(true),afk.tick(.01,false),afk.state().action===null)&&
 afk.state().idle===0);
check('AFK não é reproduzido durante menu, Super ou conversa de NPC',
 (afk.press(false),afk.tick(12.1,true),afk.setPowered(true),
  afk.tick(.01,true),afk.state().action===null)&&
 (afk.setPowered(false),afk.tick(12.1,true),afk.setMenu(true),
  afk.tick(.01,true),afk.state().action===null)&&
 (afk.setMenu(false),afk.setShop({lines:[]}),afk.tick(15,true),
  afk.state().action===null));
const afkPose=afk.at;
check('Portatil: pegar, jogar dois quadros, guardar',
 afkPose('console',.1)==='afkTakeout'&&
 afkPose('console',.9)==='afkPlay1'&&
 afkPose('console',1.05)==='afkPlay2'&&
 afkPose('console',4.8)==='afkPutaway');
check('Relogio e cochilo utilizam todos os seus quadros',
 afkPose('watch',.5)==='afkWatch1'&&
 afkPose('watch',2.1)==='afkWatch2'&&
 afkPose('sleep',.3)==='afkYawn'&&
 afkPose('sleep',2)==='afkSleep'&&
 afkPose('sleep',4.4)==='afkYawn');

// Integração visual 190–208 (208 são dois PNGs com nomes diferentes).
const newWalkAssets=[
 '190 walk 1.png','191 mid.png','192 walk 2.png',
 '193 alan walk 1.png','194 alan mid.png','195 alan walk 2.png',
 '196 humberto walk 1.png','197 humberto mid.png','198 humberto walk 2.png',
 '199 vitoria walk 1.png','200 vitoria mid.png','201 vitoria walk 2.png',
 '202 bolota walk 1.png','203 bolota mid.png','204 bolota walk 2.png',
 '205 leak idle.png','206 leek shocked.png','207 leek walk 1.png',
 '208 leek mid.png','208 leek walk 2.png'
];
check('Vinte imagens novas com nomes exatos estão disponíveis no repositório',
 newWalkAssets.every(name=>fs.existsSync(path.join(root,name))&&
 fs.statSync(path.join(root,name)).size>1000));
check('Caminhadas de Alan, Humberto e Vitoria agora têm três poses',
 [
 "walk1:'193 alan walk 1.png',walkMid:'194 alan mid.png',walk2:'195 alan walk 2.png'",
 "walk1:'196 humberto walk 1.png',walkMid:'197 humberto mid.png'",
 "walk1:'199 vitoria walk 1.png',walkMid:'200 vitoria mid.png'"
 ].every(fragment=>mario.includes(fragment)));
check('Alhopó substitui todos os cinco inimigos tartaruga',
 (mario.match(/type:'leek'/g)||[]).length>=5 &&
 !mario.includes("type:'turtle'")&&!mario.includes("turtle:{"));
const visualHeightSource=mario.match(/const height=e\.type==='leek'\?49:e\.type==='mushroom'\?42:e\.h;/)?.[0];
check('Altura visual dos inimigos mantém escalas e hitboxes independentes',
 !!visualHeightSource);
const enemyVisualHeight=e=>new Function('e',visualHeightSource+'return height;')(e);
check('Bolota aumenta para 42px e mantém colisão de 32x32',
 enemyVisualHeight({type:'mushroom',h:32})===42 &&
 valleyWorld.level1EnemyTemplate.some(e=>e.type==='mushroom')&&
 valleyWorld.level1EnemyTemplate.filter(e=>e.type==='mushroom')
 .every(e=>e.w===32&&e.h===32));
check('Alhopó permanece com 49px visuais e hitbox de 32x32',
 enemyVisualHeight({type:'leek',h:32})===49 &&
 valleyWorld.level1EnemyTemplate.some(e=>e.type==='leek')&&
 valleyWorld.level1EnemyTemplate.filter(e=>e.type==='leek')
 .every(e=>e.w===32&&e.h===32));
check('Outros tipos preservam a própria altura de colisão',
 enemyVisualHeight({type:'outro',h:32})===32);
check('Arquivo PNG de derrota 209 do Alhopó existe e é válido',
 fs.existsSync(path.join(root,'209 leek dead.png')) &&
 fs.statSync(path.join(root,'209 leek dead.png')).size>1000);
check('Derrota do Alhopó exibe 209 com fallback e sem tartaruga',
 mario.includes("walk2:'208 leek walk 2.png',dead:'209 leek dead.png'")&&
 mario.includes('const sprite=sprites.dead')&&
 mario.includes('if(sprite)drawSpriteOnFeet(sprite,e.x+e.w/2,e.y+e.h,e.h,e.facing)')&&
 mario.includes("else if(e.type==='leek'&&sprites.idle)")&&
 !mario.includes("90 turtle dead.png")&&
 mario.includes("const original=e.type==='mushroom'?processedAssets.enemyFrames?.[0]:null"));
const enemyWalkSource=mario.match(/        const ENEMY_WALK_STEPS=[\s\S]*?\n        function alignEnemyWalkFrames\(/)?.[0]?.split('        function alignEnemyWalkFrames(')[0];
check('Ciclo de inimigos isolável e testável',!!enemyWalkSource);
const enemyWalkPose=new Function(enemyWalkSource+'\nreturn enemyWalkPose;')();
check('Bolota e Alhopó seguem 1→mid→2→mid independente do sentido',
 [0,7,14,21,28].map(enemyWalkPose).join(',')===
 'walk1,walkMid,walk2,walkMid,walk1' &&
 enemyWalkPose(-14)===enemyWalkPose(14));
const showOffSource=mario.match(/        function updateLeekShowOff\(enemy,grounded\)\{[\s\S]*?\n        \}/)?.[0];
check('Rotina do Alhopó valentão extraível para testes',!!showOffSource);
const showOff=new Function(
 "let elapsedSeconds=20;const player={x:1000};"+
 showOffSource+
 "return {step:updateLeekShowOff,time:t=>elapsedSeconds=t};"
)();
const leek={type:'leek',aiState:'patrol',x:50,vx:1.8,
 patrolSpeed:1.8,patrolDirection:1,facing:1,nextShowOffAt:14,showOffUntil:0};
showOff.step(leek,true);
check('Alhopó faz pose sozinho e interrompe a caminhada',
 leek.vx===0&&leek.showOffUntil>20&&leek.nextShowOffAt>20);
showOff.time(20.3);showOff.step(leek,true);
check('Alhopó permanece imóvel durante a pose',leek.vx===0);
showOff.time(22);showOff.step(leek,true);
check('Alhopó retorna à patrulha na mesma direção',
 leek.showOffUntil===0&&leek.vx===1.8);
leek.aiState='chase';leek.showOffUntil=30;
showOff.step(leek,true);
check('Alhopó interrompe a valentia quando começa a perseguir Gabriel',
 leek.showOffUntil===0);
check('Oscilação da pose é puramente visual, sem modificar posição de colisão',
 mario.includes('const bob=showingOff?Math.round(Math.sin(elapsedSeconds*13)*1.5):0')&&
 mario.includes('drawSpriteOnFeet(frame,e.x+e.w/2+sway,e.y+e.h-bob,height,facing)'));
