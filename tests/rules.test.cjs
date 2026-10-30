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
  console.log('\nRESULTADO: '+(total-falhas)+'/'+total+' testes aprovados.');
  if(falhas)process.exitCode=1;
}
principal().catch(e=>{console.error('Falha inicial:',e);process.exitCode=1})
  .finally(async()=>{if(ambiente)await ambiente.cleanup()});
