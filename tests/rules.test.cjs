const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, query, orderBy, limit, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
const PROJETO='demo-gabibot-seguro', ADMIN='uid-gabriel-teste',
  VITORIA='uid-vitoria-teste', ESTRANHO='uid-estranho-teste';
let ambiente;
let falhas=0, total=0;
async function verificar(nome, fn) {
  total++;
  try { await fn(); console.log('✅ '+nome); }
  catch(error) { falhas++; console.error('❌ '+nome+' — '+error.message); }
}
async function principal() {
  if (process.env.FIRESTORE_EMULATOR_HOST &&
      !/^(127\.0\.0\.1|localhost):8080$/.test(process.env.FIRESTORE_EMULATOR_HOST))
    throw new Error('Testes devem usar o emulador local na porta 8080.');
  ambiente=await initializeTestEnvironment({
    projectId: PROJETO,
    firestore:{rules:fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8'),host:'127.0.0.1',port:8080}
  });
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore();
    await setDoc(doc(db,'gabibotAccess',ADMIN),{role:'admin'});
    await setDoc(doc(db,'gabibotAccess',VITORIA),{role:'vitoria'});
    await setDoc(doc(db,'gabibotChatSettings',ADMIN),{saveHistory:false,updatedAt:new Date('2026-10-30T12:00:00Z')});
    await setDoc(doc(db,'config','avatares'),{Gabriel:'data:image/jpeg;base64,teste'});
    await setDoc(doc(db,'config','lugares'),{lista:['Xerém, RJ']});
  });
  const admin=ambiente.authenticatedContext(ADMIN).firestore();
  const vitoria=ambiente.authenticatedContext(VITORIA).firestore();
  const estranho=ambiente.authenticatedContext(ESTRANHO).firestore();
  const visitante=ambiente.unauthenticatedContext().firestore();
  const caminho='gabibotChats/'+ADMIN+'/messages';
  const mensagem=(texto='Oi, GabiBot!')=>({role:'user',text:texto,seq:1,createdAt:serverTimestamp()});
  await verificar('Visitante não lê cadastro admin',()=>assertFails(getDoc(doc(visitante,'gabibotAccess',ADMIN))));
  await verificar('Admin lê próprio cadastro',()=>assertSucceeds(getDoc(doc(admin,'gabibotAccess',ADMIN))));
  await verificar('Conta desconhecida não lê memórias',()=>assertFails(getDocs(query(collection(estranho,'gabibotSharedMemories'),limit(10)))));
  await verificar('Vitória autorizada lê memórias',()=>assertSucceeds(getDocs(query(collection(vitoria,'gabibotSharedMemories'),limit(10)))));
  await verificar('Visitante não lê memórias',()=>assertFails(getDoc(doc(visitante,'gabibotSharedMemories','teste'))));
  await verificar('Admin cria memória com timestamp servidor',()=>assertSucceeds(setDoc(doc(admin,'gabibotSharedMemories','viagem'),{
    title:'Viagem',content:'Fomos ao parque.',category:'Viagens',eventDate:'2025-07-16',
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  })));
  await verificar('Vitória não edita memória aprovada',()=>assertFails(updateDoc(doc(vitoria,'gabibotSharedMemories','viagem'),{content:'Outra história'})));
  await verificar('Admin edita memória',()=>assertSucceeds(updateDoc(doc(admin,'gabibotSharedMemories','viagem'),{content:'Fomos ao parque juntos.',updatedAt:serverTimestamp()})));
  await verificar('Visitante lê avatares',()=>assertSucceeds(getDoc(doc(visitante,'config','avatares'))));
  await verificar('Visitante não altera avatares',()=>assertFails(updateDoc(doc(visitante,'config','avatares'),{Gabriel:'fraude'})));
  await verificar('Admin altera avatares',()=>assertSucceeds(updateDoc(doc(admin,'config','avatares'),{Gabriel:'nova-foto'})));
  await verificar('Vitória altera lugares',()=>assertSucceeds(updateDoc(doc(vitoria,'config','lugares'),{lista:['Xerém','Petrópolis']})));
  await verificar('Visitante não altera lugares',()=>assertFails(updateDoc(doc(visitante,'config','lugares'),{lista:['Outro']})));
  await verificar('Pet titular salva progresso',()=>assertSucceeds(setDoc(doc(admin,'pets',ADMIN),{nivel:2})));
  await verificar('Pet de outro usuário é privado',()=>assertFails(getDoc(doc(estranho,'pets',ADMIN))));
  await verificar('Sem consentimento nega gravação',()=>assertFails(setDoc(doc(admin,caminho,'sem-consentimento'),mensagem())));
  await verificar('Titular ativa consentimento',()=>assertSucceeds(setDoc(doc(admin,'gabibotChatSettings',ADMIN),{
    saveHistory:true,updatedAt:serverTimestamp()
  })));
  await verificar('Mensagem com serverTimestamp é permitida',()=>assertSucceeds(setDoc(doc(admin,caminho,'consentida'),mensagem())));
  await verificar('Timestamp string não passa',()=>assertFails(setDoc(doc(admin,caminho,'timestamp-invalido'),{
    role:'user',text:'Oi',seq:2,createdAt:'30/10/2026'
  })));
  await verificar('Titular consulta próprio histórico',()=>assertSucceeds(getDocs(query(collection(admin,caminho),orderBy('seq','desc'),limit(10)))));
  await verificar('Vitória não consulta histórico Gabriel',()=>assertFails(getDoc(doc(vitoria,caminho,'consentida'))));
  await verificar('Gabriel não consulta histórico Vitória',()=>assertFails(getDoc(doc(admin,'gabibotChats/'+VITORIA+'/messages','teste'))));
  await verificar('Titular desativa consentimento',()=>assertSucceeds(setDoc(doc(admin,'gabibotChatSettings',ADMIN),{
    saveHistory:false,updatedAt:serverTimestamp()
  })));
  await verificar('Revogação bloqueia mensagem nova',()=>assertFails(setDoc(doc(admin,caminho,'sem-consentimento-depois'),mensagem())));
  await verificar('Titular apaga histórico mesmo após revogar',()=>assertSucceeds(deleteDoc(doc(admin,caminho,'consentida'))));

  // Super Gabriel Bros: saves são privados por UID, sem exigir role do GabiBot.
  const jogo=(id='slot1')=>'superGabrielSaves/'+ADMIN+'/slots/'+id;
  const saveJogo=(slotId='slot1')=>({
    version:1,slotId,updatedAt:serverTimestamp(),
    payload:{
      version:1,savedAt:Date.now(),difficulty:'normal',level:2,phase:'map',
      score:150,lives:5,elapsedSeconds:45,
      player:{x:100,y:340,direction:1},
      checkpoint:{reached:false,x:0},skyCheckpoint:{reached:false,x:0},
      levelComplete:{1:true,2:false,3:false},
      inventory:{version:2,story:['medallion'],consumables:{life:0,shield:0,speed:0,jump:0}},
      collectedPickups:[],inventoryUnlocked:false,legacy:false
    }
  });
  await verificar('SGB dono pode criar slot1',()=>assertSucceeds(setDoc(doc(admin,jogo()),saveJogo())));
  await verificar('SGB dono lê próprio save',()=>assertSucceeds(getDoc(doc(admin,jogo()))));
  await verificar('SGB visitante não lê save',()=>assertFails(getDoc(doc(visitante,jogo()))));
  await verificar('SGB Vitória não lê save do Gabriel',()=>assertFails(getDoc(doc(vitoria,jogo()))));
  await verificar('SGB estranho não altera save de Gabriel',()=>assertFails(setDoc(doc(estranho,jogo()),saveJogo())));
  await verificar('SGB limita nomes a três slots',()=>assertFails(setDoc(doc(admin,jogo('slot4')),saveJogo('slot4'))));
  await verificar('SGB rejeita atributo extra',()=>assertFails(setDoc(doc(admin,jogo('slot2')),{...saveJogo('slot2'),publico:true})));
  await verificar('SGB hambúrguer + poder válido podem ir para a nuvem',()=>{
    const save=saveJogo('slot2');
    save.payload.inventory.consumables.burger=2;
    save.payload.superRemaining=8.5;
    return assertSucceeds(setDoc(doc(admin,jogo('slot2')),save));
  });
  await verificar('SGB bloqueia quantidade inválida de hambúrguer',()=>{
    const save=saveJogo('slot2');
    save.payload.inventory.consumables.burger=-3;
    save.payload.superRemaining=8;
    return assertFails(setDoc(doc(admin,jogo('slot2')),save));
  });
  await verificar('SGB bloqueia duração impossível do poder',()=>{
    const save=saveJogo('slot2');
    save.payload.inventory.consumables.burger=1;
    save.payload.superRemaining=500;
    return assertFails(setDoc(doc(admin,jogo('slot2')),save));
  });
  await verificar('SGB outro usuário cria próprio slot',()=>assertSucceeds(setDoc(doc(estranho,'superGabrielSaves/'+ESTRANHO+'/slots/slot1'),saveJogo())));
  console.log('\nRESULTADO: '+(total-falhas)+'/'+total+' testes aprovados.');
  if(falhas)process.exitCode=1;
}
principal().catch(e=>{console.error('Falha inicial:',e);process.exitCode=1})
  .finally(async()=>{if(ambiente)await ambiente.cleanup()});
