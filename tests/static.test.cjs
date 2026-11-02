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
check('Bloco de interrogação libera hambúrguer ao bater por baixo',mario.includes("b.type==='surprise')hitQuestionBlock(b)")&&mario.includes('burgerDrops.push(')&&mario.includes('updateBurgerDrops(dt)'));
check('Hambúrguer continua guardado até ativação intencional',mario.includes("addConsumable('burger',1)") &&
 mario.includes("if(id==='burger')return activateSuperFromBurger();") &&
 mario.includes('function activateSuperFromBurger()'));
check('Super Gabriel usa sprites de transformação e investida',mario.includes('processedAssets.superHeroFrames=makeFrames(sheet,4)')&&mario.includes('extras.dashSuper:extras.dashHero')&&mario.includes('trySuperDash()'));
check('Investida tem input X e botão B condicionado',mario.includes("e.code==='KeyX'&&!e.repeat")&&mario.includes('id="btn-dash"')&&mario.includes("show=isSuperGabriel()&&state==='playing'"));
check('Investida derrota inimigos e corvos',mario.includes('defeatEnemy(enemy,150);continue;')&&mario.includes('bird.alive=false;score+=180;setHUD();continue;'));
check('Super Forca dura fase inteira e conserva save legado dentro das regras',mario.includes('superPower.until=Number.POSITIVE_INFINITY') &&
 mario.includes('superRemaining:isSuperGabriel()?SUPER_DURATION:0') &&
 mario.includes("data.phase==='playing'&&data.superRemaining>0?Number.POSITIVE_INFINITY:0") &&
 mario.includes('if(!inventoryOpen&&!menuOpen){') &&
 rules.includes('data.payload.superRemaining <= 12'));
check('Blocos coletados permanecem únicos no save',mario.includes('collectedPickups.add(drop.id)')&&mario.includes("collectedPickups.has(questionId(b))")&&mario.includes('collectedPickups=new Set();'));
check('Firestore continua isolado e aceita burger + poder temporário',rules.includes("'jump','burger'")&&rules.includes("'superRemaining'")&&rules.includes('gbIsSelf(userId)'));


check('Botao B vertical acima do A',mario.includes('flex-direction:column;align-items:center') &&
 mario.indexOf('id="btn-dash"')<mario.indexOf('id="btn-jump" class="action-btn"'));
check('Indicador de Super Forca agora mostra duracao da fase',mario.includes('id="sgb-super-meter" role="status"') &&
 mario.includes("meter.classList.toggle('active',show)") &&
 mario.includes("style.width='100%'") &&
 mario.includes('SUPER FORÇA · ATÉ O FIM DA FASE'));
check('Sprites opcionais de cinco poses para os dois inimigos',[
 '84 bolota idle.png','85 bolota walk 1.png','86 bolota walk 2.png',
 '87 bolota dead.png','88 bolota espanto.png','89 trutle espanto.png',
 '90 turtle dead.png','91 turtle walk 1.png','92 turtle idle.png','93 turtle walk 2.png'
].every(asset=>mario.includes(asset))&&mario.includes("img.onerror=()=>"));
check('Patrulha, alerta e perseguicao com memoria',mario.includes("enemy.aiState='alert'") &&
 mario.includes("enemy.aiState='chase'")&&mario.includes('enemy.patrolSpeed*1.25') &&
 mario.includes('enemy.alertUntil=elapsedSeconds+.42'));
check('Perseguicao respeita chao e bloqueios',mario.includes('!hasFloorAhead(enemy,terrain)')&&
 mario.includes("enemy.vx=0; // Perseguição não força a queda em buracos.")&&
 mario.includes('function enemyCanSpotHero(enemy,terrain)'));
check('Sprites e particulas de inimigos derrotados',mario.includes('fallenEnemies.push(')&&
 mario.includes('processedAssets.mobFrames?.[e.type]?.dead')&&mario.includes('defeatEnemy(enemy,150)')&&
 mario.includes('defeatEnemy(enemy,100)'));
check('Efeitos dos blocos e checkpoints',mario.includes('drawCombatFxWorld()')&&
 mario.includes('function checkpointChime()')&&
 mario.includes("['#ffe88a','#fff7bb','#dbaa64']")&&
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

check('Frames walk1/walk2 alinhados na mesma tela',mario.includes('function alignEnemyWalkFrames(type)') &&
 mario.includes('alignEnemyWalkFrames(type);') &&
 mario.includes('height-source.height') &&
 mario.includes("for(const pose of ['walk1','walk2'])"));
const walkAlignSource=mario.match(/        function alignEnemyWalkFrames\(type\)\{[\s\S]*?\n        \}/)?.[0];
check('Alinhamento de sprites extraível',!!walkAlignSource);
const walkingImages={mushroom:{walk1:{width:40,height:50},walk2:{width:44,height:46}}};
const drawCalls=[];
new Function('processedAssets','document',walkAlignSource+'\nalignEnemyWalkFrames("mushroom")')(
 {mobFrames:walkingImages},
 {createElement:()=>({width:0,height:0,getContext:()=>({imageSmoothingEnabled:false,
   drawImage:(...args)=>drawCalls.push(args)})})}
);
check('Frames mantêm dimensão igual e pés na mesma base',
 walkingImages.mushroom.walk1.width===44 && walkingImages.mushroom.walk2.width===44 &&
 walkingImages.mushroom.walk1.height===50 && walkingImages.mushroom.walk2.height===50 &&
 drawCalls[0][2]===0 && drawCalls[1][2]===4);

check('Quadros do inimigo dependem de deslocamento e não da posição X',
 mario.includes('const traveled=Math.abs(enemy.x-oldX)') &&
 mario.includes('enemy.walkDistance=(enemy.walkDistance||0)+traveled') &&
 mario.includes('Math.floor((e.walkDistance||0)/10)%2') &&
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
 function isDashing(){return false} function defeatEnemy(){}
 function setHUD(){} function loseLife(){}
 const ENEMY_LOST_SIGHT_SECONDS=10;
 ${actualEnemySource}
 const distances=[],frames=[];
 for(let i=0;i<22;i++){
   updateEnemies();
   const e=enemies[0];distances.push(e.walkDistance);
   frames.push(Math.floor((e.walkDistance||0)/10)%2);
 }
 return {distances,frames};
 `)();
}
const walkRight=simulateWalk(2),walkLeft=simulateWalk(-2);
check('Esquerda e direita alternam no mesmo ritmo por distância',
 walkLeft.frames.join(',')===walkRight.frames.join(',') &&
 walkRight.frames.includes(0)&&walkRight.frames.includes(1) &&
 walkLeft.distances.every((v,i)=>v===walkRight.distances[i]));

check('Boca do Super Gabriel tem âncora e animação próprias',
 mario.includes('function drawSpeakingSprite(sprite,centerX,footY,height,character,facing=1,superTalking=false)') &&
 mario.includes('const mouthX=Math.round(w*.23),mouthY=-Math.round(height*.57)') &&
 mario.includes('Math.floor(gameNow/125)%4') &&
 mario.includes('isSuperGabriel()&&sprite===powerful)'));
const talkSource=mario.match(/        function drawSpeakingSprite\(sprite,[\s\S]*?\n        \}/)?.[0];
check('Animação de boca isolada para regressão',!!talkSource);
function mouthAt(t,powered){
 const rects=[];
 const canvas={fillRect:(...a)=>rects.push(a),save(){},restore(){},translate(){},scale(){}};
 new Function('ctx','gameNow','activeDialogueSpeaker','drawSpriteOnFeet','getCharacterSkin',
 talkSource+'\ndrawSpeakingSprite({width:90,height:200},20,120,40,"GABRIEL",1,'+powered+');')(
 canvas,t,()=> 'GABRIEL',()=>{},()=> '#dfa77a');
 return rects;
}
check('Super Gabriel alterna boca fechada, intermediária e aberta',
 JSON.stringify(mouthAt(0,true))!==JSON.stringify(mouthAt(125,true)) &&
 JSON.stringify(mouthAt(125,true))!==JSON.stringify(mouthAt(250,true)));
check('Fala do Gabriel normal mantém desenho anterior',
 JSON.stringify(mouthAt(0,false))!==JSON.stringify(mouthAt(0,true)) &&
 mouthAt(0,false)[0][0]!==mouthAt(0,true)[0][0]);

 
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
