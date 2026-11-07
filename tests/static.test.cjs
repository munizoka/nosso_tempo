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
check('Quinze assets 250–264 são carregados com nomes exatos do GitHub',
 Object.keys(forestRemakeFiles).length===15&&
 forestRemakeFiles.sky==='250 dark.png'&&
 forestRemakeFiles.mountains==='251.png'&&
 forestRemakeFiles.distantForest==='252.png'&&
 forestRemakeFiles.groundTop==='253.png'&&
 forestRemakeFiles.groundSoil==='254.png'&&
 forestRemakeFiles.ancestorTree==='255.png'&&
 forestRemakeFiles.witchHouse==='256 witchs house.png'&&
 forestRemakeFiles.witchHouseClean==='257 no smoke.png'&&
 forestRemakeFiles.smokeLeft==='258 smoke left.png'&&
 forestRemakeFiles.smokeCenter==='259 mid smoke.png'&&
 forestRemakeFiles.smokeRight==='260 smoke right.png'&&
 forestRemakeFiles.windowGlow==='261 glow.png'&&
 forestRemakeFiles.witchFence==='262 cerca.png'&&
 forestRemakeFiles.witchMushrooms==='263 cogumelo.png'&&
 forestRemakeFiles.witchPath==='264 caminho.png'&&
 Object.values(forestRemakeFiles).every(file=>
  fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>1000));
check('Fase 2 carrega sprites completos sem inferir spritesheets',
 mario.includes('function forestDetectAlphaBounds(img,minimumAlpha=16)')&&
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
 mario.includes('ctx.translate(destX+w+1,0);ctx.scale(-1,1)'));
check('Casa da bruxa é cenário íntegro ancorado em y380 e não permite entrada ainda',
 mario.includes('const FOREST_WITCH_HOUSE_X=3790;')&&
 mario.includes('const FOREST_WITCH_HOUSE_HEIGHT=235;')&&
 mario.includes("forestDrawWholeAtGround('witchHouse',")&&
 mario.includes('FOREST_WITCH_HOUSE_X,380,FOREST_WITCH_HOUSE_HEIGHT,.99)')&&
 !mario.includes('function enterWitchHouse(')&&
 !mario.includes('witchHouseAudio.play('));
check('Dois checkpoints progressivos no chão antes e depois da clareira',
 mario.includes('const FOREST_CHECKPOINTS=[3000,5520];')&&
 mario.includes('for(const x of FOREST_CHECKPOINTS){')&&
 mario.includes('checkpointReached=true;checkpointX=x;score+=250;setHUD();')&&
 mario.includes('if(x<=checkpointX||player.x+player.w<=x-6||')&&
 mario.includes('if(flag)drawObject(flag,x,312,42,68)'));
check('Fase 2 tem 7800px sem alterar cutscenes e outras fases',
 mario.includes('const FOREST_END = 7800;')&&
 mario.includes('function drawForestTotem()')&&
 mario.includes("if(state==='forestIntro'||state==='forestOutro')drawForestStoryActors()")&&
 mario.includes('function drawLevelOne()')&&
 mario.includes('function drawLevelThree()'));

// Testes geométricos independentes do navegador: nenhuma árvore ou inimigo
// pode nascer dentro de um buraco. A casa precisa repousar em chão contínuo.
const forestStageSource=mario.match(/        const level2Blocks=\[[\s\S]*?(?=        \/\/ FASE 3:)/)?.[0];
check('Layout ampliado da Fase 2 pode ser inspecionado isoladamente',!!forestStageSource);
const forestWorld=new Function(forestStageSource+
 '\nreturn {level2Blocks,level2EnemyTemplate,forestGroundSegments,forestGaps,forestTreeSpots,forestRootsHaveGround};')();
check('Fase 2 possui nove trechos de chão até 7800 pixels e oito abismos',
 forestWorld.forestGroundSegments.length===9&&
 forestWorld.forestGroundSegments[0].x===0&&
 forestWorld.forestGroundSegments.at(-1).x+
  forestWorld.forestGroundSegments.at(-1).w===7800&&
 forestWorld.forestGaps.length===8&&
 forestWorld.forestGaps.every(g=>g.w>=120&&g.w<=150));
check('Árvores ancestrais só aparecem em solo firme, com 80px de margem',
 forestWorld.forestTreeSpots.length===8&&
 forestWorld.forestTreeSpots.every(t=>forestWorld.forestRootsHaveGround(t.x,80))&&
 forestWorld.forestTreeSpots.every(t=>!(t.x>=3530&&t.x<=4290))&&
 !forestWorld.forestTreeSpots.some(t=>t.x===575)&&
 mario.includes('if(!forestRootsHaveGround(tree.x))continue;')&&
 mario.includes('tree.x-imageWidth/2,380,tree.h,.96)'));
check('Casa da bruxa fica no meio da fase e tem espaço firme para a base',
 mario.includes('const FOREST_WITCH_HOUSE_X=3790;')&&
 forestWorld.forestGroundSegments.some(g=>3790>=g.x+150&&3790+360<=g.x+g.w)&&
 mario.includes('FOREST_WITCH_HOUSE_X,380,FOREST_WITCH_HOUSE_HEIGHT,.99)')&&
 !mario.includes('function enterWitchHouse('));
check('Inimigos da fase ampliada não nascem sobre buracos nem no totem',
 forestWorld.level2EnemyTemplate.length===13&&
 forestWorld.level2EnemyTemplate.every(e=>
  e.w===32&&e.h===32&&e.y===348&&
  forestWorld.forestGroundSegments.some(g=>e.x>=g.x&&e.x+e.w<=g.x+g.w)&&
  e.x<7400));
check('Plataformas e caminhos estendidos sem bloquear a clareira',
 forestWorld.level2Blocks.filter(b=>b.type==='wood').length>=15&&
 forestWorld.level2Blocks.filter(b=>b.type==='magic'&&b.moving).length>=5&&
 forestWorld.level2Blocks.filter(b=>b.type==='wood'||b.type==='magic')
   .every(b=>b.x+b.w<=3790||b.x>=4200));
check('Segundo ato tem moedas espalhadas apenas sobre trechos seguros',
 [...mario.matchAll(/\{level:2,x:(\d+),y:(\d+)\}/g)].length===20&&
 [...mario.matchAll(/\{level:2,x:(\d+),y:(\d+)\}/g)].every(m=>
  forestWorld.forestGroundSegments.some(g=>Number(m[1])>=g.x&&Number(m[1])+28<=g.x+g.w)));
check('Dois checkpoints ficam sobre solo e separados da cena final',
 [3000,5520].every(x=>forestWorld.forestGroundSegments.some(g=>x-40>=g.x&&x+60<=g.x+g.w))&&
 5520<7800-430&&3000<3790);
check('Fundo dos oito buracos não cria chão nem recebe árvores',
 mario.includes('function drawForestPitDepths()')&&
 mario.includes('for(const gap of forestGaps)')&&
 mario.includes('drawForestPitDepths();')&&
 forestWorld.forestGaps.every(g=>!forestWorld.forestTreeSpots.some(t=>
  t.x>=g.x&&t.x<=g.x+g.w)));
check('Salvamento da Fase 2 aceita posições até 7760 sem afetar Fase 3',
 mario.includes('lv===1?VALLEY_END-40:lv===2?FOREST_END-40:SKY_END-40')&&
 mario.includes('lv===1?VALLEY_END:lv===2?FOREST_END:SKY_END')&&
 rules.includes('data.payload.player.x is number')&&
 rules.includes('data.payload.checkpoint.x is number'));
check('Final da Fase 2 acompanha a largura nova, preservando medalhão e totem',
 mario.includes('const FOREST_GOAL_X=FOREST_END-430;')&&
 mario.includes('const FOREST_TOTEM_X=FOREST_GOAL_X+40;')&&
 mario.includes('const FOREST_CLUE_X=FOREST_END-170;')&&
 mario.includes("giveStoryItem('medallion')")&&
 mario.includes('forestTotemActivated=true;'));

const oneWaySource=mario.match(/        function isOneWayPlatform\(b\)\{[\s\S]*?\n        \}/)?.[0];
check('Colisão unilateral reutilizável está presente no jogo',!!oneWaySource);
function forestOneWayForLevel(level){
 return new Function('level',oneWaySource+'\nreturn isOneWayPlatform;')(level);
}
check('Madeira e magia da Fase 2 deixam atravessar por baixo',
 forestOneWayForLevel(2)({type:'wood'})&&
 forestOneWayForLevel(2)({type:'magic'})&&
 !forestOneWayForLevel(2)({type:'forestGround'})&&
 !forestOneWayForLevel(2)({type:'pipe'})&&
 mario.includes('if(isOneWayPlatform(b))continue;')&&
 mario.includes('if(isOneWayPlatform(b) && !(player.vy>=0&&oldFootY<=b.y+4))continue;'));
check('Colisão das outras fases não muda ao atravessar madeira ou magia',
 !forestOneWayForLevel(1)({type:'wood'})&&
 !forestOneWayForLevel(3)({type:'magic'})&&
 forestOneWayForLevel(1)({type:'valleyPlatform'})&&
 forestOneWayForLevel(1)({type:'valleyBridge'})&&
 forestOneWayForLevel(3)({type:'skyPlatform'}));
check('Pulo sobe por baixo, pouso só ocorre cruzando o deck ao descer',
 mario.includes('const oldFootY=player.y+player.h;')&&
 mario.includes('player.y+=player.vy;')&&
 mario.includes('player.vy>=0&&oldFootY<=b.y+4')&&
 mario.includes('if(player.vy>0){player.y=b.y-player.h;player.vy=0;player.grounded=true;}')&&
 mario.includes('const standing=player.vy>=0&&Math.abs((player.y+player.h)-oldY)<3'));
check('PNG das plataformas 49 e 50 recortado só nas margens transparentes',
 mario.includes('const forestPlatformVisualCache=new Map();')&&
 mario.includes('function drawForestPlatform(b)')&&
 mario.includes('rect=forestDetectAlphaBounds(img);')&&
 mario.includes("const deckInset=Math.round(h*(b.type==='magic'?.32:.16));")&&
 mario.includes('ctx.drawImage(img,r.x,r.y,r.w,r.h,x,y,w,h);')&&
 mario.includes("else if(b.type==='wood'||b.type==='magic')drawForestPlatform(b);")&&
 !mario.includes("drawObject(extras.wood,b.x,b.y,b.w,b.h)"));
check('Grama 253 cobre a borda sem faixa plana e mantém emendas globais',
 mario.includes('const rimHeight=64,rimY=b.y-24;')&&
 mario.includes('const grassSourceY=topRect.y+Math.round(topRect.h*.43);')&&
 mario.includes('const grassSourceH=Math.max(1,Math.round(topRect.h*.12));')&&
 mario.includes('destX-1,rimY,w+2,rimHeight')&&
 mario.includes('ctx.translate(destX+w+1,0);ctx.scale(-1,1);')&&
 !mario.includes("ctx.fillStyle='#356c55';")&&
 !mario.includes('ctx.fillRect(b.x,b.y-7,b.w,15);')&&
 !mario.includes('const first=Math.max(0,Math.floor((cameraX-b.x-w)/w));'));
check('Moedas da Fase 2 sob plataformas seguem coletáveis',
 mario.includes('function updateLevelCoins()')&&
 mario.includes('updateLevelCoins();')&&
 forestOneWayForLevel(2)({type:'wood'})&&
 forestOneWayForLevel(2)({type:'magic'}));


// Regressão real de renderização: extras.wood e extras.magic são CANVAS,
// produzidos por cropSprite(). Uma simples busca de strings não teria
// detectado o bug que deixou TODAS as plataformas invisíveis.
const forestPlatformRenderer=mario.match(
 // Isolar SOMENTE o renderizador: funções da casa e plantas pertencem a outros testes.
 /        const forestPlatformVisualCache=new Map\(\);[\s\S]*?(?=        function forestWitchLayout\(\))/)?.[0];
check('Renderizador da plataforma da Fase 2 existe',!!forestPlatformRenderer);
function testForestPlatformDraw(sourceType){
 const calls=[],ctx={
  drawImage:(...args)=>calls.push({op:'image',args}),
  fillRect:(...args)=>calls.push({op:'fill',args}),
  fillStyle:''
 };
 const original={
  width:400,height:80
 };
 const canvasWood={width:400,height:80};
 const canvasMagic={width:460,height:100};
 const imageWood={width:400,height:80,naturalWidth:400,naturalHeight:80};
 const extras={wood:sourceType==='image'?imageWood:canvasWood,magic:canvasMagic};
 const render=new Function('extras','ctx','forestDetectAlphaBounds',
  forestPlatformRenderer+'\nreturn drawForestPlatform;')(
  extras,ctx,(img)=>{
   if(!img.naturalWidth)throw new Error('Canvas must not be processed as HTMLImageElement');
   return {x:0,y:0,w:img.naturalWidth,h:img.naturalHeight};
  });
 render({x:100,y:315,w:130,h:24,type:'wood'});
 render({x:300,y:260,w:118,h:24,type:'magic',moving:true});
 render({x:364,y:260,w:118,h:24,type:'magic',moving:true});
 return calls;
}
const platformCanvasCalls=testForestPlatformDraw('canvas');
const platformImageCalls=testForestPlatformDraw('image');
check('Plataformas 49 e 50 recortadas em canvas voltam a ser desenhadas',
 platformCanvasCalls.filter(c=>c.op==='image').length===3&&
 platformCanvasCalls.filter(c=>c.op==='fill').length===0&&
 platformCanvasCalls.filter(c=>c.op==='image').every(c=>c.args.length===9));
check('O renderizador desenha também sprites HTMLImageElement',
 platformImageCalls.filter(c=>c.op==='image').length===3);
check('Plataforma móvel segue a posição física atual, sem imagem parada',
 platformCanvasCalls.filter(c=>c.op==='image')[1].args[5]===300&&
 platformCanvasCalls.filter(c=>c.op==='image')[2].args[5]===364);
check('Sprites não carregados mostram piso provisório em vez de invisibilidade',
 (()=>{
  const ctx={fillStyle:'',drawImage:()=>{throw new Error('Should not draw image')},
    fillRect:()=>{ctx.fills++},fills:0};
  const extras={wood:null};
  const render=new Function('extras','ctx','forestDetectAlphaBounds',
    forestPlatformRenderer+'\nreturn drawForestPlatform;')(
    extras,ctx,()=>{throw new Error('No sprite');});
  render({x:100,y:300,w:128,h:24,type:'wood'});
  return ctx.fills===2;
 })());


// Executa o renderizador do chão isolado com Canvas simulado:
// impede que a faixa verde lisa volte a aparecer por transparência.
const forestGroundSource=mario.match(
 /        function drawForestGround\(b\)\{[\s\S]*?(?=        function drawForestBackground\(\))/)?.[0];
check('Renderizador de terreno da Floresta Sombria está disponível',!!forestGroundSource);
const groundDrawOps=[];
const groundContext={
 fillStyle:'',save(){},restore(){},beginPath(){},rect(){},clip(){},
 translate(){},scale(){},
 fillRect(...args){groundDrawOps.push({type:'fill',color:this.fillStyle,args})},
 drawImage(...args){groundDrawOps.push({type:'image',args})}
};
const groundTopMock={naturalWidth:512,naturalHeight:260};
const groundSoilMock={naturalWidth:256,naturalHeight:256};
const mockArt={groundTop:groundTopMock,groundSoil:groundSoilMock};
const drawGround=new Function('forestRemakeArt','forestSourceRect','ctx','cameraX','GAME_WIDTH',
 forestGroundSource+'\nreturn drawForestGround;')(
 mockArt,key=>key==='groundTop'?
 {x:0,y:0,w:512,h:260}:{x:0,y:0,w:256,h:256},
 groundContext,0,800);
drawGround({x:0,y:380,w:550,h:160,type:'forestGround'});
const topOps=groundDrawOps.filter(o=>o.type==='image'&&o.args[0]===groundTopMock);
check('Textura do chão cobre superfície e raízes sem barra verde chapada',
 topOps.some(o=>o.args[6]===356&&o.args[8]===64)&&
 topOps.some(o=>o.args[6]===371&&o.args[8]===22)&&
 !groundDrawOps.some(o=>o.type==='fill'&&o.color==='#356c55'));
check('Terra interna 254 começa perto do topo e é coberta pela relva 253',
 groundDrawOps.some(o=>o.type==='image'&&o.args[0]===groundSoilMock&&
   o.args[6]===392)&&
 topOps.some(o=>o.args[6]===356&&o.args[8]===64));


// A casa usa as COORDENADAS da imagem original 256. Os PNGs 257 e 261
// NÃO recebem crop alfa independente; a fumaça é ancorada na chaminé.
// Capturar somente as funções da casa e sua decoração; a vegetação
// possui dependências próprias que são testadas em outro bloco abaixo.
const witchCoreSource=mario.match(
 /        function forestWitchLayout\(\)\{[\s\S]*?(?=        \/\/ FASE 2 — REATIVIDADE MÁGICA:)/)?.[0];
const witchDecorationsSource=mario.match(
 /        function drawForestWitchDecorations\(\)\{[\s\S]*?(?=        function drawForestScenery\(\))/)?.[0];
const witchRendererSource=witchCoreSource&&witchDecorationsSource
 ? witchCoreSource+'\n'+witchDecorationsSource : null;
check('As funções da casa animada são isoláveis para regressão',!!witchRendererSource);
const witchMockOriginal={naturalWidth:1536,naturalHeight:1024};
const witchMockClean={naturalWidth:1536,naturalHeight:1024};
const witchMockGlow={naturalWidth:1536,naturalHeight:1024};
const witchMockSmoke={
 smokeLeft:{naturalWidth:1535,naturalHeight:1024},
 smokeCenter:{naturalWidth:1536,naturalHeight:1024},
 smokeRight:{naturalWidth:1536,naturalHeight:1024}
};
const witchMockImages={
 witchHouse:witchMockOriginal,
 witchHouseClean:witchMockClean,
 windowGlow:witchMockGlow,
 ...witchMockSmoke
};
const witchMockRects={
 witchHouse:{x:95,y:0,w:1310,h:1024},
 smokeLeft:{x:280,y:190,w:750,h:570},
 smokeCenter:{x:520,y:65,w:555,h:700},
 smokeRight:{x:530,y:190,w:760,h:570}
};
const witchDrawCalls=[],witchLayerStates=[],witchBubbleCircles=[],witchBubblePixels=[];
const witchCtx={
 save(){},restore(){},beginPath(){},fill(){},stroke(){},
 arc(x,y,r){witchBubbleCircles.push([x,y,r]);},
 fillRect(...args){witchBubblePixels.push(args);},
 globalAlpha:1,globalCompositeOperation:'source-over',
 drawImage(...args){
  witchDrawCalls.push(args);
  witchLayerStates.push({src:args[0],alpha:this.globalAlpha,
   composite:this.globalCompositeOperation});
 }
};
const witchMockEnvironment={
 canvas:{getContext(){
  return {drawImage(){},getImageData(){throw Error('Fallback smoke anchor in isolated test')}};
 }}
};
const witchRenderer=new Function('forestRemakeArt','forestSourceRect','ctx','cameraX',
 'GAME_WIDTH','elapsedSeconds','FOREST_WITCH_HOUSE_X',
 'FOREST_WITCH_HOUSE_HEIGHT','forestDrawWholeAtGround','document','console',
 witchRendererSource+
 '\nreturn {forestWitchLayout,drawForestWitchHouse,drawForestWitchDecorations,forestWitchSmokeState,forestWitchGlowStrength,forestWitchBubbleState};')(
 witchMockImages,key=>witchMockRects[key]||null,
 witchCtx,3550,800,1.97,3790,235,
 ()=>{witchDrawCalls.push(['fallback-original-house'])},
 {createElement:()=>({width:0,height:0,getContext:witchMockEnvironment.canvas.getContext})},
 {warn(){}});
const oldWitchLayout=witchRenderer.forestWitchLayout();
witchRenderer.drawForestWitchHouse();
const houseCall=witchDrawCalls.find(call=>call[0]===witchMockClean);
const smokeCalls=witchDrawCalls.filter(call=>Object.values(witchMockSmoke).includes(call[0]));
const glowCall=witchDrawCalls.find(call=>call[0]===witchMockGlow);
check('Casa 257 desenhada integralmente sem perder bordas ou alinhamento',
 oldWitchLayout.x===3790&&oldWitchLayout.y===145&&
 oldWitchLayout.w===Math.round(235*1310/1024)&&
 houseCall?.length===5&&
 houseCall?.[1]===Math.round(3790-95*oldWitchLayout.scale)&&
 houseCall?.[2]===145&&
 houseCall?.[3]===Math.round(1536*oldWitchLayout.scale)&&
 houseCall?.[4]===235);
check('A fumaça de 1535px é desenhada por cima sem mover a casa',
 smokeCalls.length===2&&
 smokeCalls.some(call=>call[0]===witchMockSmoke.smokeLeft)&&
 smokeCalls.every(call=>call.length===9&&
  [call[5],call[6],call[7],call[8]].every(Number.isFinite)));
check('A iluminação ocupa a tela original da casa e não a bbox do brilho',
 glowCall?.length===5&&
 glowCall?.[1]===Math.round(3790-95*oldWitchLayout.scale)&&
 glowCall?.[2]===145&&
 glowCall?.[3]===Math.round(1536*oldWitchLayout.scale)&&
 glowCall?.[4]===Math.round(1024*oldWitchLayout.scale));
check('Bolhas do caldeirão aparecem dentro da área da casa',
 witchBubbleCircles.length===5&&witchBubblePixels.length>=5&&
 witchBubbleCircles.every(([x,y,r])=>
  x>oldWitchLayout.x+oldWitchLayout.w*.68&&
  x<oldWitchLayout.x+oldWitchLayout.w+10&&
  y>oldWitchLayout.y&&y<380&&r>1));
check('Bolhas sobem ao longo do tempo, sem novos PNGs',
 witchRenderer.forestWitchBubbleState(.2).length===5&&
 witchRenderer.forestWitchBubbleState(.2)[0].y<
 witchRenderer.forestWitchBubbleState(0)[0].y&&
 witchRenderer.forestWitchBubbleState(.2)[0].alpha>0);
check('A casa original só funciona como fallback, sem fumaça duplicada',
 !witchDrawCalls.some(call=>call[0]==='fallback-original-house')&&
 mario.includes('if(!clean?.naturalWidth)')&&
 mario.includes("forestDrawWholeAtGround('witchHouse',"));
check('Fumaça e brilho são carregados com proteção de margens e sobreposição',
 mario.includes("forestDetectAlphaBounds(img,smoke?75:16)")&&
 mario.includes("const smokeKeys=['smokeLeft','smokeCenter','smokeRight','smokeCenter'];")&&
 mario.includes("const FOREST_WITCH_SMOKE_INTERVAL=.5;")&&
 mario.includes("const FOREST_WITCH_SMOKE_FADE=.42;")&&
 mario.includes("ctx.globalCompositeOperation='lighter'")&&
 mario.includes("const pulse=forestWitchGlowStrength(elapsedSeconds);"));
check('Fumaça troca de quadro a cada meio segundo sem saltar X/Y',
 [0,.5,1,1.5,2,2.5].map(t=>witchRenderer.forestWitchSmokeState(t).frame)
  .join(',')==='0,1,2,3,0,1'&&
 witchRenderer.forestWitchSmokeState(.04).blend===0&&
 witchRenderer.forestWitchSmokeState(.2).blend>.15&&
 witchRenderer.forestWitchSmokeState(.2).blend<.35&&
 Math.abs(witchRenderer.forestWitchSmokeState(.29).blend-.5)<.01&&
 witchRenderer.forestWitchSmokeState(.49).blend>.99&&
 witchRenderer.forestWitchSmokeState(.49).blend<1&&
 witchRenderer.forestWitchSmokeState(1.49).blend>.99);
check('Brilho da janela tem momentos fortes e fracos bem definidos',
 witchRenderer.forestWitchGlowStrength(.2)>.9&&
 witchRenderer.forestWitchGlowStrength(.7)<.1&&
 witchRenderer.forestWitchGlowStrength(1.12)>.95&&
 witchRenderer.forestWitchGlowStrength(1.28)<.1&&
 witchRenderer.forestWitchGlowStrength(1.8)>.85&&
 witchRenderer.forestWitchGlowStrength(2.24)<.15);
check('Brilho aditivo continua preso ao mesmo X e Y da casa',
 witchLayerStates.some(layer=>layer.src===witchMockGlow&&
   layer.composite==='lighter'&&layer.alpha>.85)&&
 glowCall?.[1]===Math.round(3790-95*oldWitchLayout.scale)&&
 glowCall?.[3]===Math.round(1536*oldWitchLayout.scale));

const magicalSource=mario.match(
 /        \/\/ FASE 2 — REATIVIDADE MÁGICA:[\s\S]*?(?=        function drawForestWitchDecorations\(\))/)?.[0];
check('Olhos e vegetação da Floresta Sombria isoláveis',!!magicalSource);
const magicalDraws={rects:[],images:[],ellipses:0,rotations:0};
const magicalCtx={
 save(){},restore(){},beginPath(){},fill(){},
 translate(){},rotate(){magicalDraws.rotations++},
 fillRect(...args){magicalDraws.rects.push(args)},
 drawImage(...args){magicalDraws.images.push(args)},
 ellipse(){magicalDraws.ellipses++}
};
const magicalTrees=[{x:270,h:245},{x:960,h:220},{x:1850,h:270},
 {x:2590,h:240},{x:4740,h:265},{x:5620,h:218},
 {x:6460,h:260},{x:7320,h:235}];
const magic=new Function('ctx','cameraX','GAME_WIDTH','elapsedSeconds',
 'player','forestTreeSpots','forestRemakeArt','forestSourceRect','forestRootsHaveGround',
 magicalSource+'\nreturn {forestWatchers,forestWatcherAlpha,forestReactiveVisual,forestDrawReactiveMushrooms,drawForestWatchers,drawForestReactivePlants};')(
 magicalCtx,800,800,2,{x:100,w:32},magicalTrees,
 {witchMushrooms:{naturalWidth:200,naturalHeight:120}},
 ()=>({x:0,y:0,w:200,h:120}),()=>true);
check('Olhos surgem em árvores e desaparecem quando Gabriel chega perto',
 magic.forestWatchers.length===5&&
 magic.forestWatcherAlpha(magic.forestWatchers[0],2,100)>.2&&
 magic.forestWatcherAlpha(magic.forestWatchers[0],2,
   magic.forestWatchers[0].x)===0);
check('Cogumelos aumentam brilho próximo ao jogador',
 magic.forestReactiveVisual(1000,2,1000).glow>
 magic.forestReactiveVisual(1000,2,500).glow);
magic.drawForestWatchers();
magic.forestDrawReactiveMushrooms(930,380,31,.97);
magic.drawForestReactivePlants();
check('Olhos, cogumelos e vegetação desenham via Canvas sem imagens novas',
 magicalDraws.rects.length>0&&
 magicalDraws.images.length===1&&
 magicalDraws.ellipses===1&&
 magicalDraws.rotations>0&&
 !/new Image\(/.test(magicalSource));
check('Reatividade pertence apenas ao cenário da Fase 2',
 mario.includes('drawForestWatchers(); // olhos entre as árvores')&&
 mario.includes('drawForestReactivePlants(); // folhas reagem ao jogador')&&
 mario.includes('forestDrawReactiveMushrooms(house.x-45')&&
 mario.includes('forestDrawReactiveMushrooms(house.x+house.w+8'));

check('Cercas, cogumelos e caminho ficam no chão, sem novas colisões',
 mario.includes('function drawForestWitchDecorations()')&&
 mario.includes("forestDrawWholeAtGround('witchFence'")&&
 mario.includes("forestDrawReactiveMushrooms(house.x-45")&&
 mario.includes("forestDrawWholeAtGround('witchPath'")&&
 mario.includes('drawForestWitchDecorations(); // acima do chão, antes de Gabriel')&&
 !mario.includes("type:'witchFence'")&&
 !mario.includes('function enterWitchHouse('));


const atmosphereSource=mario.match(
 /        \/\/ FASE 2 — ATMOSFERA VIVA:[\s\S]*?(?=        function drawForestGround\(b\))/)?.[0];
check('Atmosfera viva da Fase 2 isolável',!!atmosphereSource);
const atmosphereDraws={rects:[],ellipses:[],clips:0};
const atmosphereCtx={
 save(){},restore(){},beginPath(){},clip(){atmosphereDraws.clips++},
 rect(){},fill(){},
 fillRect(...args){atmosphereDraws.rects.push(args)},
 ellipse(...args){atmosphereDraws.ellipses.push(args)}
};
const atmosphereTrees=[{x:270,h:245},{x:960,h:220},{x:1850,h:270},
 {x:2590,h:240},{x:4740,h:265},{x:5620,h:218},
 {x:6460,h:260},{x:7320,h:235}];
const atmosphereGround=[{x:0,w:610},{x:740,w:850},{x:1720,w:900}];
const atmosphere=new Function('ctx','cameraX','GAME_WIDTH','elapsedSeconds',
 'player','forestTreeSpots','forestGroundSegments',
 atmosphereSource+'\nreturn {forestFireflies,forestMistPatches,forestFireflyVisual,forestMistVisual,drawForestFireflies,drawForestMist};')(
 atmosphereCtx,150,800,2,{x:265,w:32},
 atmosphereTrees,atmosphereGround);
check('Vaga-lumes em posições fixas reagem à proximidade do Gabriel',
 atmosphere.forestFireflies.length===48&&
 atmosphere.forestFireflyVisual(atmosphere.forestFireflies[0],2,270).x!==
 atmosphere.forestFireflyVisual(atmosphere.forestFireflies[0],2,400).x);
atmosphere.drawForestFireflies();atmosphere.drawForestMist();
check('Apenas partículas próximas são desenhadas; névoa usa clip',
 atmosphereDraws.rects.length>0&&atmosphereDraws.rects.length<100&&
 atmosphereDraws.ellipses.length>0&&atmosphereDraws.clips>0);
const forestDrawSource=mario.match(/        function drawLevelTwo\(\)\{[\s\S]*?(?=        \/\/ VISUAIS DA FASE 3)/)?.[0];
check('Camadas ficam atrás do herói e não adicionam sprites',
 !!forestDrawSource&&
 forestDrawSource.indexOf('drawForestFireflies();')<
 forestDrawSource.indexOf('drawForestMist();')&&
 forestDrawSource.indexOf('drawForestMist();')<
 forestDrawSource.indexOf('drawEnemies();drawHero();')&&
 !/new Image\(/.test(atmosphereSource));


const skyAtmosphereSource=mario.match(
 /        \/\/ REMAKE FASE 3 — atmosfera celestial[\s\S]*?(?=        function drawSkyBackground\(\))/)?.[0];
check('Remake celestial carrega funções isoláveis',!!skyAtmosphereSource);
const skyAtmosphereCalls={rects:0};
const skyAtmosphereCtx={
 save(){},restore(){},
 fillRect(){skyAtmosphereCalls.rects++}
};
const skyAtmosphereWind=[
 {type:'horizontal',x:520,y:140,w:360,h:245,force:1.05},
 {type:'up',x:1200,y:150,w:290,h:240,lift:.19}
];
const skyAtmosphere=new Function('ctx','GAME_WIDTH','gameNow','cameraX','skyWindZones',
 skyAtmosphereSource+'\nreturn {skyCloudBands,skyCloudPose,drawSkyCloudParallax,skyWindGlints,skyWindGlintPose,drawSkyWindGlints};')(
 skyAtmosphereCtx,800,3000,600,skyAtmosphereWind);
check('Nuvens usam três profundidades e parallax de câmera',
 skyAtmosphere.skyCloudBands.length===3&&
 skyAtmosphere.skyCloudPose(skyAtmosphere.skyCloudBands[0],1,3,0).x!==
 skyAtmosphere.skyCloudPose(skyAtmosphere.skyCloudBands[0],1,3,600).x);
check('Partículas acompanham horizontal e verticalmente as zonas de vento',
 skyAtmosphere.skyWindGlints.length===14&&
 skyAtmosphere.skyWindGlintPose(skyAtmosphere.skyWindGlints[0],3).x!==
 skyAtmosphere.skyWindGlintPose(skyAtmosphere.skyWindGlints[0],4).x&&
 skyAtmosphere.skyWindGlintPose(skyAtmosphere.skyWindGlints[7],3).y!==
 skyAtmosphere.skyWindGlintPose(skyAtmosphere.skyWindGlints[7],4).y);
skyAtmosphere.drawSkyCloudParallax();skyAtmosphere.drawSkyWindGlints();
check('Efeitos em Canvas possuem quantidade fixa e culling',skyAtmosphereCalls.rects>4&&
 skyAtmosphereCalls.rects<150);
const skyRenderSource=mario.match(/        function drawLevelThree\(\)\{[\s\S]*?(?=        function drawCanoShop\(\))/)?.[0]||
 mario.match(/        function drawLevelThree\(\)\{[\s\S]*?(?=        function \w+\(\)\{)/)?.[0];
check('Atmosfera é renderizada antes do terreno e dos personagens',
 !!skyRenderSource&&
 skyRenderSource.includes('drawSkyWindGlints();')&&
 skyRenderSource.indexOf('drawSkyWindGlints();')<
 skyRenderSource.indexOf('for(const b of level3Blocks)')&&
 !/new Image\(/.test(skyAtmosphereSource));


// Fase 3: três arquivos novos e corvos originais sem arte inventada.
check('Novos sprites 265-267 estão presentes',
 ['265.png','266.png','267.png'].every(name=>
 fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>1000));
check('Remake usa 265 para fundo, 266 no parallax e 267 atrás do altar',
 mario.includes("skyPanorama:'265.png'")&&mario.includes("skyRuins:'266.png'")&&
 mario.includes("skyTempleFacade:'267.png'")&&
 mario.includes('drawSkyRuinsParallax(); // ruínas 266 em profundidade')&&
 mario.includes('drawSkyTempleFacade(); // 267 atrás do altar e dos personagens'));
const skyArtSource=mario.match(
 /        \/\/ REMAKE FASE 3: 265 panorama,[\s\S]*?(?=        function drawSkyBackground\(\))/)?.[0];
check('Renderizadores de ruínas e templo estão isoláveis',!!skyArtSource);
const skyArtCalls=[];
const mockArtCtx={save(){},restore(){},drawImage(...args){skyArtCalls.push(args)}};
const skyArt=new Function('extras','ctx','cameraX','GAME_WIDTH',
 'gameNow','SKY_END','SKY_ALTAR_X',skyArtSource+
 '\nreturn {drawSkyRuinsParallax,skyTempleFacadeLayout,drawSkyTempleFacade};')(
 {skyRuins:{width:1000,height:450},skyTempleFacade:{width:800,height:780}},
 mockArtCtx,5600,800,7000,6400,6230);
skyArt.drawSkyRuinsParallax();skyArt.drawSkyTempleFacade();
const facade=skyArt.skyTempleFacadeLayout({width:800,height:780});
check('Parallax visível e templo centralizado no novo extremo',
 skyArtCalls.length>=2&&facade.x+facade.w<=6400&&
 facade.y>=0&&facade.y+facade.h===380&&
 Math.abs(facade.x+facade.w/2-6230)<=.5);
const crowRender=mario.match(
 /        \/\/ FASE 3 — SPRITES CELESTIAIS:[\s\S]*?(?=        \/\/ Posições compartilhadas pela câmera)/)?.[0];
check('Asas procedurais e deformações dos corvos foram removidas',
 !!crowRender&&!mario.includes('function skyBirdFlightPose(')&&
 !mario.includes('function drawSkyBirdWings(')&&
 !/rotate\(|wingLift|feather/.test(crowRender));
const crowOps=[];
const c={save(){},restore(){},translate(){},scale(){},fillRect(){}};
const renderCrow=new Function('skyBirds','ctx','extras','cameraX','GAME_WIDTH','drawObject',
 'gameNow','player','forestDetectAlphaBounds','console',
 crowRender+'\nreturn drawSkyBirds;')(
 [{x:100,y:200,w:38,h:34,vx:-1.5,alive:true,phase:0},
 {x:300,y:200,w:38,h:34,vx:1.5,alive:true,phase:1},
 {x:1600,y:200,w:38,h:34,vx:1.5,alive:true,phase:2}],
 c,{skyCrow:{width:38,height:34}},0,800,(...args)=>crowOps.push(args),
 1000,{x:150,w:32},()=>({x:0,y:0,w:10,h:10}),{warn(){}});
renderCrow();
check('Somente corvos visíveis desenhados com o sprite 61',
 crowOps.length===2&&crowOps.every(a=>a[0].width===38));
check('IA e hitboxes dos corvos preservadas',
 mario.includes('bird.x+=bird.vx*enemyDifficultyMultiplier();')&&
 mario.includes('if(isDashing()&&isColliding(player,bird))')&&
 mario.includes('bird.y=bird.baseY+Math.sin(t*2.5+bird.phase)*24;'));



const nimboCore=mario.match(
 /        \/\/ NIMBO — guardião invulnerável:[\s\S]*?(?=        function updateSkyBirds\(t\))/)?.[0];
check('Nimbo possui IA isolada e sem colisão corporal',!!nimboCore);
const nTest=new Function('SKY_END','player','isDashing','invulnerable','loseLife',
 nimboCore+'\nreturn {freshSkyNimbo,advanceSkyNimbo,skyNimboBoltHits};')(
 3280,{x:200,w:32,y:325,h:55},()=>false,0,()=>{});
const n=nTest.freshSkyNimbo(),hero={x:200,w:32,y:325,h:55};
for(let k=0;k<54;k++)nTest.advanceSkyNimbo(n,.05,hero,true);
check('Depois de ficar parado 2,65s, Nimbo inicia carga no topo',
 n.mode==='charge'&&n.targetX===216&&n.y<40);
const locked=n.targetX;
for(let k=0;k<19;k++)nTest.advanceSkyNimbo(n,.05,
 {x:320,w:32,y:325,h:55},false);
check('Mira fica travada e raio pode ser evitado horizontalmente',
 n.mode==='strike'&&n.targetX===locked&&
 nTest.skyNimboBoltHits(hero,n)&&
 !nTest.skyNimboBoltHits({x:270,w:32,y:325,h:55},n));
for(let k=0;k<5;k++)nTest.advanceSkyNimbo(n,.05,hero,false);
check('Raio dura menos de 0,3s e não acerta durante cooldown',
 n.mode==='cooldown'&&!nTest.skyNimboBoltHits(hero,n));
for(let k=0;k<44;k++)nTest.advanceSkyNimbo(n,.05,hero,false);
check('Descanso devolve Nimbo ao estado de vigia',
 n.mode==='idle'&&n.idleFor===0);
const nimboArt=mario.match(
 /        \/\/ NIMBO VISUAL — 271 a 275[\s\S]*?(?=        function drawSkyBirds\(\))/)?.[0];
check('Sprites opcionais e alerta de impacto estão ligados',
 !!nimboArt&&['271.2.png','272.2.png','273.png','274.png','275.png'].every(f=>mario.includes(f))&&
 nimboArt.includes('Math.round(n.targetX)-16')&&
 !/isColliding\(player,skyNimbo\)/.test(nimboCore));
check('Nimbo vigia com imagens 271.2 e 272.2 sem perder outras poses',
 mario.includes("skyNimboIdle:'271.2.png'")&&
 mario.includes("skyNimboCharge:'272.2.png'")&&
 mario.includes("skyNimboFire:'273.png'")&&
 mario.includes("skyNimboTired:'274.png'")&&
 mario.includes("skyNimboBolt:'275.png'")&&
 ['271.2.png','272.2.png'].every(file=>
  fs.existsSync(path.join(root,file))&&
  fs.statSync(path.join(root,file)).size>1000));
check('Nimbo atualiza só na Fase 3 e fica atrás do herói',
 mario.includes("if(state==='playing')updateSkyNimbo(dt);")&&
 mario.includes('drawSkyNimbo(); // Nimbo no alto da Fase 3')&&
 mario.includes('resetPosition();resetSkyNimbo();setHUD();')&&
 mario.includes('resetPosition();resetSkyNimbo();invulnerable=1.5;')&&
 mario.includes('if(level===3)resetSkyNimbo(); // acompanha posição salva no checkpoint')&&
 mario.includes('function resetSkyNimbo()'));

// Quadros dos corvos com recorte comum para não deslocar o corpo.
check('Artes 268-270 estão presentes no repositório',
 ['268.png','269.png','270.png'].every(name=>
 fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>1000));
check('Três quadros do corvo registrados para voo 16-bit',
 mario.includes("skyCrowUp:'268.png'")&&
 mario.includes("skyCrowMid:'269.png'")&&
 mario.includes("skyCrowDown:'270.png'")&&
 mario.includes("const SKY_CROW_FRAME_KEYS=['skyCrowUp','skyCrowMid','skyCrowDown'];")&&
 !mario.includes('function drawSkyBirdWings('));
const skyFramesSource=mario.match(
 /        \/\/ FASE 3 — SPRITES CELESTIAIS:[\s\S]*?(?=        \/\/ NIMBO VISUAL —)/)?.[0];
check('Alinhamento de poses pode ser testado isoladamente',!!skyFramesSource);
const mockFrames={
 skyCrowUp:{naturalWidth:1254,naturalHeight:1254,key:'up'},
 skyCrowMid:{naturalWidth:1254,naturalHeight:1254,key:'mid'},
 skyCrowDown:{naturalWidth:1254,naturalHeight:1254,key:'down'}
};
const mockBounds={
 up:{x:130,y:150,w:930,h:780},
 mid:{x:105,y:190,w:960,h:690},
 down:{x:145,y:230,w:900,h:820}
};
let frameScans=0;
const skyFrameTest=new Function('extras','forestDetectAlphaBounds','console',
 skyFramesSource+
 '\nreturn {skySharedSpriteBounds,skyCrowFrameKey,SKY_CROW_FRAME_KEYS};')(
 mockFrames,img=>{frameScans++;return mockBounds[img.key]},{warn(){}});
const rect=skyFrameTest.skySharedSpriteBounds(skyFrameTest.SKY_CROW_FRAME_KEYS);
skyFrameTest.skySharedSpriteBounds(skyFrameTest.SKY_CROW_FRAME_KEYS);
check('Recorte alfa de 268-270 compartilhado e calculado uma única vez',
 rect.x===105&&rect.y===150&&rect.w===960&&rect.h===900&&frameScans===3);
check('Ciclo real de voo sobe, abre, desce e abre',
 [0,.15,.30,.45,.60].map(s=>
 skyFrameTest.skyCrowFrameKey(s,{x:100,w:38,phase:0},700)).join(',')===
 'skyCrowUp,skyCrowMid,skyCrowDown,skyCrowMid,skyCrowUp');
check('Batidas aumentam discretamente perto do herói',
 skyFrameTest.skyCrowFrameKey(.12,{x:100,w:38,phase:0},119)==='skyCrowMid'&&
 skyFrameTest.skyCrowFrameKey(.12,{x:100,w:38,phase:0},700)==='skyCrowUp');
check('Nimbo 271-274 mantém o mesmo enquadramento nas mudanças de estado',
 mario.includes('skySharedSpriteBounds(SKY_NIMBO_POSE_KEYS)')&&
 mario.includes('const scale=Math.min(60/source.w,55/source.h);')&&
 mario.includes('ctx.drawImage(img,source.x,source.y,source.w,source.h,'));



// Fase 3: expansão integral, marco e checkpoints sem novos sistemas RPG.
check('Fase 3 de 6400 px preserva altar no extremo',
 mario.includes('const SKY_END=6400;')&&
 mario.includes('const SKY_ALTAR_X=SKY_END-170;')&&
 mario.includes('const SKY_OBSERVATORY_X=3220;'));
check('Observatório usa PNG 276 e mantém SVG como fallback',
 fs.existsSync(path.join(root,'276.png'))&&
 fs.statSync(path.join(root,'276.png')).size>1000&&
 fs.existsSync(path.join(root,'sky_observatory.svg'))&&
 fs.readFileSync(path.join(root,'sky_observatory.svg'),'utf8').includes('<svg')&&
 mario.includes("skyObservatory:'276.png'")&&
 mario.includes("skyObservatoryLegacy:'sky_observatory.svg'")&&
 mario.includes('drawSkyObservatory(); // marco central atrás do Gabriel'));
const extendedSkyData=mario.match(
 /        const level3Blocks=\[[\s\S]*?(?=        function freshSkyBirds\(\))/)?.[0];
check('Geometria das travessias extraível',!!extendedSkyData);
const extendedSky=new Function(extendedSkyData+
 '\nreturn {level3Blocks,skyWindZones,skyBirdTemplate};')();
const grounds=extendedSky.level3Blocks.filter(x=>x.type==='skyGround')
 .sort((a,b)=>a.x-b.x);
const newPlatforms=extendedSky.level3Blocks.filter(x=>
 x.type==='skyPlatform'&&x.x>=3280);
check('Observatório fica sobre terra firme e último bloco termina em 6400',
 grounds.length===9&&grounds.some(x=>x.x<=3220&&x.x+x.w>=3470)&&
 grounds[grounds.length-1].x+grounds[grounds.length-1].w===6400);
check('Mapa ganha dez plataformas, quatro ventos e três corvos',
 newPlatforms.length===10&&extendedSky.skyWindZones.length===8&&
 extendedSky.skyBirdTemplate.length===7);
check('Plataformas adicionais possuem saltos progressivos',
 newPlatforms.every((b,i)=>b.y>=200&&b.y<=310&&b.w>=110&&
 (i===0||b.x>newPlatforms[i-1].x))&&newPlatforms.some(b=>b.moving));
check('Três checkpoints de céu persistem no save',
 mario.includes('const SKY_CHECKPOINTS=[1650,3170,4935];')&&
 mario.includes('skyCheckpointReached=true;skyCheckpointX=x;score+=250;setHUD();')&&
 mario.includes('const flag=x<=skyCheckpointX?extras.checkpointOn:extras.checkpointOff;')&&
 mario.includes('x:clamp(data.skyCheckpoint?.x,0,SKY_END,0)'));
check('Sistema de saves permite x além do antigo limite de 3900',
 mario.includes('lv===2?FOREST_END-40:SKY_END-40,50)')&&
 mario.includes('lv===2?FOREST_END:SKY_END,0)'));
check('Atalho observatorio3 abre o marco sem introdução',
 mario.includes("else if(testMode==='observatorio3')")&&
 mario.includes('player.x=SKY_OBSERVATORY_X-140;')&&
 mario.includes('resetSkyNimbo();setHUD();'));



const observatoryRenderer=mario.match(
 /        \/\/ MARCO CENTRAL — Observatório 276\.png,[\s\S]*?(?=        function drawSkyBackground\(\))/)?.[0];
check('Novo renderizador do Observatório é isolável',!!observatoryRenderer);
const observatoryDraws=[];
const observatoryCtx={
 save(){},restore(){},drawImage(...args){observatoryDraws.push(args)},
 imageSmoothingEnabled:true
};
const observatoryArt={width:900,height:440};
const obs=new Function('ctx','extras','SKY_OBSERVATORY_X','cameraX','GAME_WIDTH','gameNow',
 observatoryRenderer+'\nreturn {skyObservatoryLayout,drawSkyObservatory};')(
 observatoryCtx,{skyObservatory:observatoryArt},
 3220,2760,800,5000);
const broad=obs.skyObservatoryLayout(observatoryArt);
const tall=obs.skyObservatoryLayout({width:320,height:800});
obs.drawSkyObservatory();
check('Arte 276 é centralizada no observatório, sem distorções',
 broad.x+broad.w/2===3220&&broad.y+broad.h===380&&
 broad.w<=520&&broad.h<=310&&
 Math.abs(broad.w/broad.h-900/440)<.02&&
 tall.y+tall.h===380&&tall.w<=520&&tall.h<=310&&
 Math.abs(tall.w/tall.h-320/800)<.02);
check('PNG usa pixels nítidos e desenho atrás de Gabriel',
 observatoryDraws.length===1&&observatoryDraws[0][0]===observatoryArt&&
 observatoryDraws[0][1]===broad.x&&observatoryDraws[0][2]===broad.y&&
 observatoryCtx.imageSmoothingEnabled===false&&
 mario.indexOf('drawSkyObservatory(); // marco central atrás do Gabriel')<
 mario.indexOf('drawHero();',mario.indexOf('function drawLevelThree(){')));
check('PNG 276 usa cropSprite e SVG anterior continua como reserva',
 mario.includes("skyObservatory:'276.png'")&&
 mario.includes("skyObservatoryLegacy:'sky_observatory.svg'")&&
 mario.includes("else extras[key]=cropSprite(img);")===false&&
 mario.includes("'skyObservatoryLegacy','skyCrowUp'")&&
 !mario.includes("'skyObservatory','skyCrowUp'"));


const skyGroundPainter=mario.match(
 /        \/\/ REMAKE FASE 3 — 277\.png[\s\S]*?(?=        function drawSkyWind\(\))/)?.[0];
check('Renderizador do novo chão celestial é isolável',!!skyGroundPainter);
const groundCalls={tiles:[],cornices:[],rects:[],clips:0,strokes:0};
const groundCtx={
 save(){},restore(){},beginPath(){},clip(){groundCalls.clips++},
 rect(...a){groundCalls.rects.push(a)},
 fillRect(){},strokeRect(){groundCalls.strokes++},
 drawImage(...a){groundCalls.tiles.push(a)}
};
const texture277={width:256,height:128};
const cornice59={width:104,height:28};
const groundDraw=new Function('ctx','extras','cameraX','GAME_WIDTH','drawObject',
 skyGroundPainter+'\nreturn drawSkyGround;')(
 groundCtx,{skyGroundTexture:texture277,skyGround:cornice59},
 0,800,(...a)=>groundCalls.cornices.push(a));
groundDraw({x:0,y:380,w:470,h:140,type:'skyGround'});
check('277 repete sem comprimir a textura no fim dos blocos',
 groundCalls.tiles.length>=8&&
 groundCalls.tiles.every(a=>a[0]===texture277&&a[3]===256&&
 a[5]%128===0&&a[7]===128)&&
 groundCalls.clips===1);
check('Cornija original 59 é preservada e desenhada sobre a pedra',
 groundCalls.cornices.length===5&&
 groundCalls.cornices.every(x=>x[0]===cornice59&&x[4]===28)&&
 mario.includes("skyGroundTexture:'277.png'")&&
 mario.includes("skyGround: '59.png'"));
const tileCount=groundCalls.tiles.length;
groundDraw({x:2000,y:380,w:300,h:140,type:'skyGround'});
check('Não renderiza piso fora da câmera',
 groundCalls.tiles.length===tileCount);
const partialCalls=[];
const partialCtx={
 save(){},restore(){},beginPath(){},rect(){},clip(){},
 fillRect(){},strokeRect(){},drawImage(...a){partialCalls.push(a)}
};
const partialGround=new Function('ctx','extras','cameraX','GAME_WIDTH','drawObject',
 skyGroundPainter+'\nreturn drawSkyGround;')(
 partialCtx,{skyGroundTexture:texture277},850,800,()=>{});
partialGround({x:900,y:380,w:270,h:140,type:'skyGround'});
check('Blocos desalinhados usam grade global com recorte nas bordas',
 partialCalls.length>0&&
 partialCalls.some(a=>a[5]<900&&a[5]+a[7]>900)&&
 partialCalls.every(a=>a[7]===128&&a[5]%128===0));
const backup={strokes:0};
const backupCtx={
 save(){},restore(){},beginPath(){},rect(){},clip(){},
 fillRect(){},strokeRect(){backup.strokes++}
};
const backupGround=new Function('ctx','extras','cameraX','GAME_WIDTH','drawObject',
 skyGroundPainter+'\nreturn drawSkyGround;')(
 backupCtx,{},0,800,()=>{});
backupGround({x:0,y:380,w:470,h:140,type:'skyGround'});
check('Chão antigo permanece disponível se 277 não carregar',
 backup.strokes>0&&
 mario.includes("'skyGroundTexture',")&&
 fs.existsSync(path.join(root,'277.png'))&&
 fs.statSync(path.join(root,'277.png')).size>1000);
check('Novo piso altera apenas desenho e mantém blocos e colisões',
 mario.includes("const SKY_END=6400;")&&
 mario.includes("function activeBlocks(){")&&
 !skyGroundPainter.includes("level3Blocks.push(")&&
 !skyGroundPainter.includes("player.y="));


// Regressão de velocidade: os Hz da tela não podem mudar a física do jogo.
const fixedEngine=mario.match(
 /        \/\/ MOTOR DE TEMPO FIXO — a física funciona a 60 Hz[\s\S]*?(?=        setHUD\(\);\n        sgbStartSlideshow\(\);)/)?.[0];
check('Motor usa passo fixo separado da frequência de desenho',!!fixedEngine);
const fixedSimPart=fixedEngine.match(
 /        \/\/ MOTOR DE TEMPO FIXO — a física funciona a 60 Hz[\s\S]*?(?=        function loop\(now\)\{)/)?.[0];
check('Motor contém acumulador fixo independente do requestAnimationFrame',
 !!fixedSimPart&&
 mario.includes('const GAME_PHYSICS_STEP=1/60;')&&
 mario.includes('const GAME_MAX_CATCHUP=.1;')&&
 mario.includes('if(advanceGameSimulation(dt)>0)draw();')&&
 !mario.includes('update(dt,gameNow);draw();'));
const frameRates=[30,60,90,120,144,240];
const fixedPhysicsAtRates=frameRates.map(fps=>{
 let heroX=0,heroY=0,heroVy=-13,count=0;
 const sandbox=new Function('update','gameNow',
 fixedSimPart+'\nreturn {advanceGameSimulation,clock:()=>gameNow};')(
 (step)=>{
   count++;
   heroX+=5.5;
   heroVy=Math.min(heroVy+.6,16);
   heroY+=heroVy;
   assert.ok(Math.abs(step-1/60)<1e-10);
 },0);
 for(let i=0;i<fps;i++)sandbox.advanceGameSimulation(1/fps);
 return {fps,count,heroX,heroY,clock:sandbox.clock()};
});
check('PC 120/144/240 Hz e celular 30/60 Hz simulam mesmos 60 ticks por segundo',
 fixedPhysicsAtRates.every(r=>r.count===60)&&
 fixedPhysicsAtRates.every(r=>r.heroX===fixedPhysicsAtRates[0].heroX)&&
 fixedPhysicsAtRates.every(r=>r.heroY===fixedPhysicsAtRates[0].heroY)&&
 fixedPhysicsAtRates.every(r=>Math.abs(r.clock-1000)<.001));
let largeDeltaTicks=0;
const bigFrame=new Function('update','gameNow',
 fixedSimPart+'\nreturn advanceGameSimulation;')(
 ()=>{largeDeltaTicks++;},0);
bigFrame(5); // troca de aba de cinco segundos não vira 300 passos.
check('Retorno após travamento longo limita a recuperação a 6 passos',
 largeDeltaTicks===6);
const fixedMock={ticks:0,draws:0};
const testLoop=new Function('update','draw','requestAnimationFrame',
 'inventoryOpen','menuOpen','previousFrame','gameNow',
 fixedEngine+ '\nreturn {loop, paused(v){inventoryOpen=v;},pending(){return gameFrameRemainder;}};')(
 ()=>{fixedMock.ticks++},()=>{fixedMock.draws++},()=>{},
 false,false,0,0);
testLoop.loop(1000/120); // meio passo acumulado, sem redesenho
check('Frame intermediário de monitor 120 Hz não acelera física nem desenho',
 fixedMock.ticks===0&&fixedMock.draws===0&&testLoop.pending()>0);
testLoop.paused(true);
testLoop.loop(2000/120); // pausa limpa fração pendente
testLoop.paused(false);
testLoop.loop(3000/120);
check('Inventário limpa acumulação e não cria salto ao retomar',
 fixedMock.ticks===0&&testLoop.pending()>0);
testLoop.loop(4000/120);
check('Dois meios-frames após retomar executam um único passo',
 fixedMock.ticks===1&&fixedMock.draws===1);
check('Gravidade e velocidade original permanecem preservadas',
 mario.includes('speed:5.5,jumpPower:-13,gravity:0.6')&&
 mario.includes('player.x+=player.vx;')&&
 mario.includes('player.vy=Math.min(player.vy+player.gravity,16);')&&
 mario.includes('function updateEnemies()')&&
 mario.includes('function updateSkyBirds(t)'));


// Prólogo de Vitoria: reutiliza saltos e falas, integra os novos sprites.
const prologueAssetSource=mario.match(
 /        const prologueBackgroundPaths=\{[\s\S]*?\n        \};/)?.[0];
const prologuePoseSource=mario.match(
 /        const vitoriaSpritePaths=\{[\s\S]*?\n        \};/)?.[0];
check('Prólogo tem catálogos de cenários e sprites',!!prologueAssetSource&&!!prologuePoseSource);
const castleImages=new Function(prologueAssetSource+'\nreturn prologueBackgroundPaths;')();
const poses=new Function(prologuePoseSource+'\nreturn vitoriaSpritePaths;')();
const castleNames=['281 quarto.png','278 salão real.png','279 biblioteca real.png',
 '280 torre do relogio.png','282 patio.png','283 portão.png'];
const poseNames=['284 confident.png','285 walk 1.png','286 walk 2.png',
 '287 walk 3.png','288 cruzados.png','289 watch.png','290 surprised.png','291 marcha.png'];
check('Seis cenários do castelo 278–283 presentes no repositório',
 Object.keys(castleImages).length===6&&
 castleNames.every(name=>Object.values(castleImages).includes(name)&&
 fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>1000));
check('Novas poses 284–291 e saltos/falas anteriores da Vitoria',
 poseNames.every(name=>Object.values(poses).includes(name)&&
 fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>1000)&&
 poses.jumpRise==='176 vitoria jumping.png'&&
 poses.jumpApex==='176 high.png'&&
 poses.landing==='177 landing.png'&&
 poses.talkOpen==='171 vitoria opened.png'&&
 poses.talkClosed==='172 closed.png');
const prologueCode=mario.match(
 /        \/\/ PRÓLOGO JOGÁVEL —[\s\S]*?(?=        function drawHero\(\)\{)/)?.[0];
check('Motor do prólogo pode ser testado isoladamente',!!prologueCode);
const prologueMemory=new Map;
const prologueKeys={left:false,right:false,up:false,down:false};
let prologueRestartCount=0,prologueSavedStage=0;
const prologueTest=new Function('localStorage','GAME_WIDTH','GAME_HEIGHT','keys',
 'activeSlot','setHUD','restartCurrentLevel','saveCurrentSlot','showItemToast',
 'drawSpriteOnFeet','drawStoryDialogue','storyLine','retroText','pixelText','drawObject',
 'extras','ctx','processedAssets','elapsedSeconds','state','level','cameraX','gameNow',
 prologueCode+'\nreturn {'+
 ' startPrologue,finishPrologueIntro,finishPrologueOutro,prologueInteract,'+
 ' princessPlayer,PROLOGUE_ROOMS,PROLOGUE_FLOOR,PROLOGUE_PLATFORMS,'+
 ' PROLOGUE_GATE_LIBRARY,PROLOGUE_GATE_CLOCK,'+
 ' PROLOGUE_LEVER_LIBRARY,PROLOGUE_LEVER_CLOCK,'+
 ' tick(dt){gameNow+=dt*1000;updatePrologue(dt,gameNow)},'+
 ' state:()=>state, level:()=>level,'+
 ' library:()=>prologueLibraryOpen, clock:()=>prologueClockOpen'+
 '};')(
 {getItem:k=>prologueMemory.get(k)||null,setItem:(k,v)=>prologueMemory.set(k,v)},
 800,450,prologueKeys,0,()=>{},()=>{prologueRestartCount++},
 ()=>{prologueSavedStage++},()=>{},()=>{},()=>{},()=>{},()=>{},
 ()=>{},()=>{}, {},{}, {vitoria:{}},0,'menu',1,0,0);
check('Seis salas cobrem exatamente 7.500px em fase contínua',
 prologueTest.PROLOGUE_ROOMS.length===6&&
 prologueTest.PROLOGUE_ROOMS[0].start===0&&
 prologueTest.PROLOGUE_ROOMS.at(-1).end===7500&&
 prologueTest.PROLOGUE_ROOMS.every((r,i,all)=>i===0||r.start===all[i-1].end));
prologueTest.startPrologue();prologueTest.finishPrologueIntro();
prologueKeys.right=true;
for(let i=0;i<60;i++)prologueTest.tick(1/60);
prologueKeys.right=false;
check('Vitoria anda a 60Hz sem acelerar',
 prologueTest.state()==='prologuePlaying'&&
 Math.abs(prologueTest.princessPlayer.x-(70+60*4.55))<.01);
prologueTest.princessPlayer.x=prologueTest.PROLOGUE_GATE_LIBRARY-34;
prologueTest.princessPlayer.y=312;prologueTest.princessPlayer.grounded=true;
prologueKeys.right=true;
for(let i=0;i<16;i++)prologueTest.tick(1/60);
prologueKeys.right=false;
check('Porta da biblioteca bloqueia passagem antes do enigma',
 prologueTest.princessPlayer.x+prologueTest.princessPlayer.w<prologueTest.PROLOGUE_GATE_LIBRARY);
prologueTest.princessPlayer.x=prologueTest.PROLOGUE_LEVER_LIBRARY.x-14;
prologueTest.princessPlayer.y=312;prologueTest.princessPlayer.grounded=true;
const libraryActive=prologueTest.prologueInteract();
prologueTest.princessPlayer.x=prologueTest.PROLOGUE_LEVER_CLOCK.x-14;
prologueTest.princessPlayer.y=prologueTest.PROLOGUE_LEVER_CLOCK.y-68;
prologueTest.princessPlayer.grounded=true;
const clockActive=prologueTest.prologueInteract();
check('Alavancas da biblioteca e torre são acionáveis',
 libraryActive&&clockActive&&prologueTest.library()&&prologueTest.clock());
check('A torre contém plataformas móveis e dois vãos',
 prologueTest.PROLOGUE_PLATFORMS.filter(p=>p.moving).length===2&&
 prologueTest.PROLOGUE_FLOOR.length===3&&
 prologueTest.PROLOGUE_FLOOR[0].x+prologueTest.PROLOGUE_FLOOR[0].w===4130&&
 prologueTest.PROLOGUE_FLOOR[1].x===4290&&
 prologueTest.PROLOGUE_FLOOR[2].x===4890);
prologueTest.princessPlayer.x=7345;
prologueTest.princessPlayer.y=312;prologueTest.princessPlayer.grounded=true;
prologueTest.tick(1/60);
check('Saída do castelo inicia cena de encerramento',
 prologueTest.state()==='prologueOutro');
prologueTest.finishPrologueOutro();
check('Final passa controle para Gabriel sem alterar sequestro da Fase 1',
 prologueTest.state()==='playing'&&prologueTest.level()===1&&
 prologueRestartCount===1&&prologueSavedStage===1&&
 mario.includes('if(level===1&&isColliding(player,princess)){startCutscene();return;}'));
const finalPrologue=JSON.parse(
 prologueMemory.get('super-gabriel-bros-prologo-local-v1'))[0];
check('Conclusão do prólogo salva por slot, separada do Firestore',
 finalPrologue.started&&finalPrologue.completed&&
 finalPrologue.library&&finalPrologue.clock&&
 mario.includes('saveCurrentSlot(false);startPrologue();closeMainMenu();')&&
 mario.includes("if(prologueSlots[index]?.started&&!prologueSlots[index]?.completed)"));
check('Mapa e testes oferecem acesso direto ao prólogo',
 mario.includes("if(node.id==='prologue'){startPrologue({replay:true});return;}")&&
 mario.includes("testMode==='prologo'")&&mario.includes("testMode==='prologo-final'"));
check('Piada de trinta minutos, ciúme e surpresa mantidos',
 prologueCode.includes('30 MINUTINHOS! HIHIHI!')&&
 prologueCode.includes('OUTRA PRINCESA')&&
 prologueCode.includes("pose='prologueSurprised'")&&
 !prologueCode.includes('ESSE LOIRO'));


// PROLOGO 292-295: imagens isoladas e atlas multiframes sem contaminacao.
const royalAssetSource=mario.match(/        const prologueDecorPaths=\{[\s\S]*?\n        \};/)?.[0];
check('Quatro assets reais registrados',!!royalAssetSource);
const realPaths=new Function(royalAssetSource+'\nreturn prologueDecorPaths;')();
check('292 piso, 293 plataforma, 294 alavanca e 295 soldado presentes',
 realPaths.ground==='292 piso.png'&&realPaths.platform==='293 plataforma.png'&&
 realPaths.lever==='294 alavanca.png'&&realPaths.guard==='295 soldado.png'&&
 Object.values(realPaths).every(n=>fs.existsSync(path.join(root,n))&&
 fs.statSync(path.join(root,n)).size>1000));
const royalDraw=mario.match(/        \/\/ Nova textura 292:[\s\S]*?(?=        function drawPrologueVitoria\(\)\{)/)?.[0];
check('Renderizadores do piso e dos atlas extraíveis',!!royalDraw);
const calls=[],ctxArt={
 save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},
 ellipse(){},fill(){},translate(){},scale(){},drawImage(...args){calls.push(args)}
};
const sources={
 ground:{width:1254,height:1254},platform:{width:1448,height:1086},
 lever:{width:1448,height:1086},guard:{width:1448,height:1086}
};
const guardHero={x:1300,y:312,w:29,h:68};
const artFns=new Function('ctx','prologueDecor','PROLOGUE_FLOOR','PROLOGUE_PLATFORMS',
 'cameraX','GAME_WIDTH','prologueNearLever','retroText','princessPlayer',
 'prologueBanter','gameNow','prologueBanterUntil',
 royalDraw+'\nreturn {drawPrologueGround,drawPrologueLever,drawPrologueGuard,'+
 'prologueGuardPose,prologueLeverGeometry,PROLOGUE_GUARD_FRAMES,PROLOGUE_GUARD};')(
 ctxArt,sources,[{x:0,y:380,w:510,h:120}],[{x:280,y:280,w:140,h:18}],
 0,800,()=>false,()=>{},guardHero,null,0,0);
artFns.drawPrologueGround();
const groundDraws=calls.filter(a=>a[0]===sources.ground);
const platformDraws=calls.filter(a=>a[0]===sources.platform);
check('292 repetido a 135x120 sem esticar a ultima peca',
 groundDraws.length===4&&groundDraws.every(a=>a.length===9&&
 a[1]===32&&a[2]===129&&a[3]===1191&&a[4]===1060&&
 a[6]===380&&a[7]===135&&a[8]===120));
check('293 desenhado com recorte real e acabamento sob a hitbox',
 platformDraws.length===1&&platformDraws[0].length===9&&
 platformDraws[0][1]===11&&platformDraws[0][2]===391&&
 platformDraws[0][3]===1426&&platformDraws[0][4]===365&&
 platformDraws[0][6]===280&&platformDraws[0][7]===140&&
 platformDraws[0][8]>18);
const off=artFns.prologueLeverGeometry({x:310,y:380},false);
const on=artFns.prologueLeverGeometry({x:310,y:380},true);
check('Alavanca ligada e desligada com pedestal fixo e haste mais alta',
 Math.abs(off.x+(325-90)*.085-310)<1.5&&
 Math.abs(on.x+(1010-788)*.085-310)<1.5&&
 off.y+off.h===380&&on.y+on.h===380&&on.h>off.h);
calls.length=0;
artFns.drawPrologueLever({x:310,y:380},false);
artFns.drawPrologueLever({x:310,y:380},true);
const leverDraws=calls.filter(a=>a[0]===sources.lever);
check('294 OFF/ON recortados em areas independentes sem o outro estado',
 leverDraws.length===2&&leverDraws.every(a=>a.length===9)&&
 leverDraws[0][1]===90&&leverDraws[0][2]===319&&
 leverDraws[0][3]===596&&leverDraws[0][4]===572&&
 leverDraws[1][1]===788&&leverDraws[1][2]===168&&
 leverDraws[1][3]===481&&leverDraws[1][4]===723&&
 leverDraws.every(a=>a[6]+a[8]===380));
const guard=artFns.PROLOGUE_GUARD;
const lookLeft=artFns.prologueGuardPose({x:guard.x-90,y:312,w:29,h:68});
const lookRight=artFns.prologueGuardPose({x:guard.x+90,y:312,w:29,h:68});
const highLeft=artFns.prologueGuardPose({x:guard.x-90,y:225,w:29,h:68});
const highRight=artFns.prologueGuardPose({x:guard.x+90,y:225,w:29,h:68});
check('Guarda acompanha esquerda/direita e olha para cima no salto',
 lookLeft.frame===1&&lookLeft.mirror&&
 lookRight.frame===1&&!lookRight.mirror&&
 highLeft.frame===4&&!highLeft.mirror&&
 highRight.frame===3&&!highRight.mirror);
const mouthA=artFns.prologueGuardPose({x:guard.x,y:312,w:29,h:68},guard,true,0);
const mouthB=artFns.prologueGuardPose({x:guard.x,y:312,w:29,h:68},guard,true,180);
check('Guarda tem sprites distintos de boca aberta e fechada',
 mouthA.frame===5&&mouthB.frame===6);
check('Sete poses do soldado isoladas e alinhadas pelos pes',
 artFns.PROLOGUE_GUARD_FRAMES.length===7&&
 artFns.PROLOGUE_GUARD_FRAMES.every(r=>r[1]+r[3]===746)&&
 artFns.PROLOGUE_GUARD_FRAMES.every((r,i,a)=>i===0||
 r[0]>=a[i-1][0]+a[i-1][2]));
check('Guarda nao altera colisoes nem as fases concluídas',
 mario.includes('drawPrologueGuard();\n          drawPrologueVitoria();')&&
 mario.includes('function drawLevelOne(){')&&
 mario.includes('function drawLevelThree(){'));


// Otimização do motor: cache, descarte fora da câmera e HUD incremental.
const perfBackdropSource=mario.match(
 /        const scaledBackdropCache=new WeakMap\(\);[\s\S]*?(?=        \/\/ No iPhone horizontal,)/)?.[0];
check('Cache de fundos estáticos disponível',!!perfBackdropSource);
let perfBufferAllocations=0,perfResizes=0,perfActualDraws=0;
const perfCanvasCtx={drawImage(){perfActualDraws++}};
const perfDoc={
 createElement(name){
  if(name!=='canvas')throw Error('Only canvas allowed');
  perfBufferAllocations++;
  return {width:0,height:0,getContext(){return {
   imageSmoothingEnabled:true,drawImage(){perfResizes++}
  }}};
 }
};
const perfBackdrop=new Function('document','ctx',
 perfBackdropSource+'\nreturn drawScaledBackdrop;')(perfDoc,perfCanvasCtx);
const perfLargeImage={width:2000,height:1200};
perfBackdrop(perfLargeImage,0,0,800,450);
perfBackdrop(perfLargeImage,5,0,800,450);
perfBackdrop(perfLargeImage,10,0,800,450);
check('Imagem de fundo é escalada uma vez em vez de três',
 perfBufferAllocations===1&&perfResizes===1&&perfActualDraws===3);
perfBackdrop({width:800,height:450},0,0,800,450);
check('Panorama já pequeno não cria buffer extra',
 perfBufferAllocations===1&&perfActualDraws===4);
check('Cache aplicado às fases 1, 2, 3, prólogo e loja',
 mario.includes('drawScaledBackdrop(valleyArt.sky,0,0,GAME_WIDTH,GAME_HEIGHT);')&&
 mario.includes('drawScaledBackdrop(forestRemakeArt.sky,0,0,GAME_WIDTH,GAME_HEIGHT);')&&
 mario.includes('drawScaledBackdrop(extras.skyPanorama,0,0,GAME_WIDTH,GAME_HEIGHT);')&&
 mario.includes('drawScaledBackdrop(art,Math.round(x-cameraX),0,tileW,GAME_HEIGHT);')&&
 mario.includes('drawScaledBackdrop(bg,x,0,1120,GAME_HEIGHT);'));
const perfCoinCode=mario.match(
 /        function drawLevelCoins\(\)\{[\s\S]*?(?=        let collectedPickups=new Set\(\);)/)?.[0];
check('Moedas têm renderizador isolável',!!perfCoinCode);
let perfCoinDraws=0;
const perfCoins=new Function('ctx','cameraX','GAME_WIDTH','COIN_PICKUPS',
 'level','collectedPickups','elapsedSeconds',
 perfCoinCode+'\nreturn drawLevelCoins;')(
 {save(){},restore(){},translate(){},fillRect(){perfCoinDraws++}},
 0,800,
 [{level:1,x:110,y:320,w:28,h:28,id:'near'},
  {level:1,x:3300,y:320,w:28,h:28,id:'far'}],
 1,new Set(),0);
perfCoins();
check('Moedas fora de 800px não são pintadas',
 perfCoinDraws>0&&perfCoinDraws<18);
const perfItemCode=mario.match(
 /        function drawLevelPickups\(\)\{[\s\S]*?(?=        function itemUsable\()/)?.[0];
check('Itens têm renderizador isolável',!!perfItemCode);
let perfItemDraws=0;
const perfItems=new Function('ctx','cameraX','GAME_WIDTH','worldPickups',
 'level','collectedPickups','ITEM_CATALOG',
 perfItemCode+'\nreturn drawLevelPickups;')(
 {save(){},restore(){},translate(){},fillRect(){perfItemDraws++},fillText(){}},
 0,800,[{x:110,y:310,w:26,h:26,level:1,itemId:'life',id:'near'},
 {x:1600,y:310,w:26,h:26,level:1,itemId:'life',id:'far'}],
 1,new Set(),{life:{icon:'x'}});
perfItems();
check('Itens fora da câmera deixam de desenhar',perfItemDraws===2);
const perfEnemyCode=mario.match(
 /        function drawEnemies\(\)\{[\s\S]*?(?=        \/\/ AFK do Gabriel NORMAL:)/)?.[0];
check('Inimigos têm renderizador isolável',!!perfEnemyCode);
let perfEnemyDraws=0;
const perfEnemies=new Function('enemies','cameraX','GAME_WIDTH','processedAssets',
 'elapsedSeconds','drawSpriteOnFeet','ctx','enemyWalkPose',
 perfEnemyCode+'\nreturn drawEnemies;')(
 [{alive:true,x:120,y:340,w:32,h:32,type:'mushroom',vx:-1},
  {alive:true,x:3400,y:340,w:32,h:32,type:'mushroom',vx:-1}],
 0,800,{mobFrames:{}},0,()=>{perfEnemyDraws++},
 {save(){},restore(){},fillRect(){},strokeText(){},fillText(){}},
 ()=> 'idle');
perfEnemies();
check('Inimigos distantes não geram drawSprite',perfEnemyDraws===1);
check('Terreno da floresta e partículas possuem descarte fora da câmera',
 mario.includes("if(b.x+b.w<cameraX-95||b.x>cameraX+GAME_WIDTH+95)continue;")&&
 mario.includes("if(e.x+e.w<cameraX-48||e.x>cameraX+GAME_WIDTH+48)continue;")&&
 mario.includes("if(p.x+p.size<cameraX-15||p.x>cameraX+GAME_WIDTH+15)continue;"));
const perfHudCode=mario.match(
 /        function setHUD\(\) \{[\s\S]*?(?=        \/\/ Os sprites originais)/)?.[0];
check('HUD incremental pode ser testado separadamente',!!perfHudCode);
let perfHudWrites=0;
const perfText=()=>({_v:'',get textContent(){return this._v},
 set textContent(v){this._v=v;perfHudWrites++}});
const perfHud={score:perfText(),coins:perfText(),level:perfText(),
 time:perfText(),lives:null};
const perfHudUpdate=new Function('HUD','score','coins','state','level',
 'isPrologueState','elapsedSeconds','lives','damagedHeartUntil',
 'lastHeartSignature','gameLives','updateDashButton',
 perfHudCode+'\nreturn setHUD;')(
 perfHud,0,0,'playing',1,()=>false,0,5,0,'',()=>5,()=>{});
perfHudUpdate();
const perfHudInitialWrites=perfHudWrites;
perfHudUpdate();
check('HUD não reescreve DOM em quadros sem mudanças',
 perfHudInitialWrites===4&&perfHudWrites===perfHudInitialWrites);
check('Medição opcional ?fps=1 não altera o passo fixo do motor',
 mario.includes("get('fps')==='1'")&&
 mario.includes("if(typeof FPS_DEBUG!=='undefined'&&FPS_DEBUG)updateFpsDiagnostics(now);")&&
 mario.includes('const GAME_PHYSICS_STEP=1/60;')&&
 mario.includes('if(advanceGameSimulation(dt)>0)draw();'));


// Novas telas 296–303, barra branca, controles e circulos de protagonista.
const splashSource=mario.match(/        \/\/ LOADING REMAKE —[\s\S]*?(?=        const assets = \{\};)/)?.[0];
check('Controlador de carregamento isolável',!!splashSource);
const splashPaths=mario.match(/        const STAGE_SPLASH_PATHS=\[([\s\S]*?)\];/)?.[1]?.match(/\d{3} loading [^']+\.png/g)||[];
check('Oito imagens 296–303 únicas e presentes',splashPaths.length===8&&
 new Set(splashPaths).size===8&&
 splashPaths.every((name,i)=>name.startsWith(String(296+i))&&
 fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>1000));
check('UI branca minimalista sem porcentagem',
 mario.includes('id="sgb-stage-loading-art"')&&
 mario.includes('id="sgb-stage-loading-hint"')&&
 mario.includes('id="sgb-stage-loading-fill"')&&
 mario.includes('#sgb-stage-loading-fill{height:100%;width:0%;background:white')&&
 !mario.includes('id="sgb-stage-loading-percent"'));
check('Touch e PC aguardam confirmação',splashSource.includes('TOQUE PARA PROSSEGUIR')&&
 splashSource.includes('ESPAÇO / ENTER / E PARA PROSSEGUIR')&&
 splashSource.includes("['Enter','Space','KeyE']")&&
 splashSource.includes("loadingLayer.addEventListener('pointerdown'"));
const loadNode={
 'sgb-stage-loading':{hidden:true,dataset:{},addEventListener(){}},
 'sgb-stage-loading-art':{removeAttribute(){},src:''},
 'sgb-stage-loading-fill':{style:{width:'0%'}},
 'sgb-stage-loading-hint':{textContent:''}
};
const irisOperations=[];
const mockCtx={save(){},restore(){},beginPath(){},rect(){},moveTo(){},
 arc(...args){irisOperations.push({radius:args[2],color:this.fillStyle})},
 fill(mode){irisOperations.push({mode,color:this.fillStyle})}};
const splashFactory=new Function('document','window','Image','performance','keys','ctx',
 'GAME_WIDTH','GAME_HEIGHT','navigator','gameFrameRemainder','state',
 'gabrielSpritePaths','vitoriaSpritePaths','prologueBackgroundPaths',
 'prologueDecorPaths','forestRemakePaths','extraPaths','valleyAssetPaths','mobSpritePaths',
 splashSource+'\nreturn {nextStageSplash,trackSceneImage,sceneAssetRegistry,'+
 'stageResourcePaths,startIrisTransition,drawIrisMask,iris:()=>stageIris};');
const mockPaths={
 checkpointOff:'off.png',checkpointOn:'on.png',skyPanorama:'panorama.png',
 skyRuins:'ruins.png',skyTempleFacade:'facade.png',skyObservatory:'observatory.png',
 skyGroundTexture:'soil.png',skyGround:'ground.png',skyPlatform:'deck.png',
 skyCrowUp:'crow1.png',skyCrowMid:'crow2.png',skyCrowDown:'crow3.png',
 skyNimboIdle:'nimbo1.png',skyNimboCharge:'nimbo2.png',skyNimboFire:'nimbo3.png',
 skyNimboTired:'nimbo4.png',skyNimboBolt:'bolt.png',
 skyAltarOff:'altar1.png',skyAltarOn:'altar2.png',
 windShort:'wind1.png',windLong:'wind2.png',windUp:'wind3.png',
 wood:'wood.png',magic:'magic.png',portal:'portal.png',villain:'villain.png'
};
const mockKeys={left:false,right:false,up:false,down:false};
const splash=splashFactory(
 {getElementById:key=>loadNode[key]},
 {addEventListener(){},matchMedia:()=>({matches:false}),innerWidth:1600},
 function(){}, {now:()=>1000},mockKeys,mockCtx,800,450,
 {maxTouchPoints:0},0,'playing',
 {normal:{idle:'g.png'}},{idle:'v.png'},
 {bedroom:'quarto.png'}, {lever:'alavanca.png'}, {sky:'escuro.png'},
 mockPaths,{sky:'vale.png'},{mushroom:{idle:'cogumelo.png'},leek:{idle:'alho.png'}});
const firstEight=Array.from({length:8},()=>splash.nextStageSplash());
const ninth=splash.nextStageSplash();
check('Imagens sorteadas sem repetição até esgotar as oito',
 new Set(firstEight).size===8&&ninth!==firstEight[7]);
const fakeImage={events:{},addEventListener(type,cb){this.events[type]=cb}};
splash.trackSceneImage(fakeImage,'sprite-ficticio.png');
check('Recurso começa pendente',
 splash.sceneAssetRegistry.get('sprite-ficticio.png').status==='pending');
fakeImage.events.load();
check('Somente o evento load conclui o recurso',
 splash.sceneAssetRegistry.get('sprite-ficticio.png').status==='loaded');
check('Recursos são separados para cada fase',
 splash.stageResourcePaths('prologue').includes('quarto.png')&&
 splash.stageResourcePaths('prologue').includes('alavanca.png')&&
 splash.stageResourcePaths('forest').includes('escuro.png')&&
 splash.stageResourcePaths('sky').includes('panorama.png')&&
 splash.stageResourcePaths('valley').includes('vale.png'));
splash.startIrisTransition('vitoria','opening');
splash.drawIrisMask(1000);
splash.drawIrisMask(1290);
const open=irisOperations.filter(x=>x.radius!==undefined).map(x=>x.radius);
check('Círculo rosado abre gradualmente',
 open.length===2&&open[1]>open[0]&&
 irisOperations.some(x=>x.mode==='evenodd'&&x.color==='#e8a0c5'));
splash.drawIrisMask(1580);
check('Íris termina de abrir',splash.iris()===null);
irisOperations.length=0;
splash.startIrisTransition('gabriel','closing');
splash.drawIrisMask(1000);
splash.drawIrisMask(1290);
const closing=irisOperations.filter(x=>x.radius!==undefined).map(x=>x.radius);
check('Círculo preto fecha gradualmente',
 closing.length===2&&closing[0]>closing[1]&&
 irisOperations.some(x=>x.mode==='evenodd'&&x.color==='#0c0b12'));
check('Motor congela física durante loading e íris',
 mario.includes("if(typeof stageLoading!=='undefined'&&stageLoading){")&&
 mario.includes("if(typeof stageIris!=='undefined'&&stageIris){")&&
 mario.includes('resetStageSceneClock();')&&
 mario.includes('const GAME_PHYSICS_STEP=1/60;'));
check('Começo e fim do prólogo têm transições de Vitoria',
 mario.includes("beginStageLoading('prologue');")&&
 mario.includes("startIrisTransition('vitoria','closing',finishPrologueOutro);")&&
 mario.includes("startIrisTransition(kind==='prologue'?'vitoria':'gabriel','opening');"));
check('Ancoragem da Vitoria corrigida após cinemáticas',
 mario.includes('princessPlayer.x-cameraX+princessPlayer.w/2,')&&
 mario.includes('valleyPrincessSceneAnchor?.x??princess.x+princess.w/2'));
check('Gabriel anima caminhada na saída da Fase 2',
 mario.includes('player.animFrame=(player.animFrame+1)%4;')&&
 mario.includes("const storyWalking=state==='forestOutro'"));
check('Alavancas têm brilho pulsante, mantendo as duas poses',
 mario.includes('Aura mágica suave e três pontos de brilho')&&
 mario.includes("const image=prologueDecor.lever,g=prologueLeverGeometry(lever,on);"));

check('Inventário com dezoito espaços',mario.includes('inv-story-grid')&&mario.includes('inv-consumable-grid')&&mario.includes('for(let n=0;n<9;n++)'));
check('Sprite 68 e categorias RPG',mario.includes('68.png')&&mario.includes('ITENS DE HISTÓRIA')&&mario.includes('CONSUMÍVEIS'));
check('Relógio virtual congela na pausa',mario.includes('if(!inventoryOpen&&!menuOpen){')&&mario.includes('gameNow+=GAME_PHYSICS_STEP*1000')&&mario.includes('gameFrameRemainder=0;')&&mario.includes("if(!sceneReady||inventoryOpen||menuOpen||state==='menu')return"));
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
 mario.includes('skyCheckpointReached=true;skyCheckpointX=x;score+=250;setHUD();')&&
 mario.includes('const SKY_CHECKPOINTS=[1650,3170,4935];'));
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
 mario.includes('lv===1?VALLEY_END-40:lv===2?FOREST_END-40:SKY_END-40')&&
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
 mario.includes("const valleyWholeObjects=new Set(['windmill','bridge','rock','treeOak','treeCurved','fenceComplete','chestClosed','chestOpen','signRight','signLeft','signUp','signWarning'])")&&
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
