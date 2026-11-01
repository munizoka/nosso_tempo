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
check('Relógio virtual congela na pausa',mario.includes('if(!inventoryOpen){')&&mario.includes('gameNow+=dt*1000')&&mario.includes('if(inventoryOpen)return'));
check('Consumíveis integrados a escudo, vidas e bônus temporários',mario.includes('function useInventoryItem(')&&mario.includes('activeBuffs.shield')&&mario.includes('activeBuffs.jumpUntil')&&mario.includes('activeBuffs.speedUntil'));
check('Coleta única e persistência',mario.includes('collectedPickups.has(pickup.id)')&&mario.includes('function persistInventory(')&&mario.includes('localStorage.setItem(INVENTORY_KEY'));
check('Pistas não podem ser descartadas',mario.includes("ITEM_CATALOG[id]?.kind!=='consumable'")&&mario.includes("ITEM_CATALOG[id]?.kind!=='story'"));
check('Drink 67 na Fase 3 via animação ao inventário',mario.includes('drawSkyDrinkTransfer')&&mario.includes("giveStoryItem('drink')")&&mario.includes("villainDrink: '67.png'"));
check('Inventário disponível a partir da Fase 3',mario.includes('function unlockInventory(')&&mario.includes("level=3;state='title3';cameraX=0;unlockInventory()"));
