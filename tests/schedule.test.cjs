// Testes da escala 2x2, executados sem Firebase nem navegador.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname,'..');
const script = fs.readFileSync(path.join(root,'work-schedule.js'),'utf8');
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules = fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const start = script.indexOf('    function parseDate(');
const end = script.indexOf('    function showNotice(');
assert.ok(start >= 0 && end > start, 'Funções puras do calendário existem');
const algorithm = script.slice(start,end);
const calc = new Function(
  "const FIRST='2026-11-06',LAST='2030-12-31';"+
  "const defaultData=()=>({cycles:{[FIRST]:'off'},overrides:{}});"+
  "let data=defaultData();\n"+algorithm+
  '\nreturn {getStatus, normalize, validDate, addDays};'
)();
function check(label, expected, actual) {
  assert.deepEqual(actual,expected,label);
  console.log('✅ '+label);
}
for (const [date,status] of [
  ['2026-11-06','off'],['2026-11-07','off'],
  ['2026-11-08','work'],['2026-11-09','work'],
  ['2026-11-10','off'],['2026-11-11','off'],
  ['2026-11-12','work'],['2028-02-29','off'],
  ['2030-12-31','off']
]) check('Sequência correta em '+date,status,calc.getStatus(date)?.status);
check('Data anterior ao calendário rejeitada',false,calc.validDate('2026-11-05'));
check('Data depois de 2030 rejeitada',false,calc.validDate('2031-01-01'));
check('Data impossível rejeitada',false,calc.validDate('2027-02-29'));
check('Virada de ano', '2027-01-01',calc.addDays('2026-12-31',1));
check('Ano bissexto', '2028-02-29',calc.addDays('2028-02-28',1));
const model=calc.normalize({
  cycles:{'2026-11-06':'off','2027-01-04':'work'},
  overrides:{'2026-11-08':'off','2028-02-29':'work'}
});
check('Troca pontual prevalece', 'off',calc.getStatus('2026-11-08',model).status);
check('A troca é marcada como manual',true,calc.getStatus('2026-11-08',model).manual);
check('Outros dias anteriores continuam iguais','work',calc.getStatus('2026-11-09',model).status);
check('Novo ciclo inicia no status escolhido','work',calc.getStatus('2027-01-04',model).status);
check('Segundo dia do ciclo','work',calc.getStatus('2027-01-05',model).status);
check('Terceiro dia inverte para folga','off',calc.getStatus('2027-01-06',model).status);
check('Exceção permanece no ano bissexto','work',calc.getStatus('2028-02-29',model).status);
check('Valores inválidos não chegam ao calendário',false,calc.normalize({
  overrides:{'2027-03-08':'férias'}
}).overrides['2027-03-08']!==undefined);
assert.ok(index.includes("id=\"view-escala\"")&&index.includes("work-schedule.js?v=1"));
assert.ok(index.includes("WorkSchedule?.getContextForQuestion(message)"));
assert.ok(index.includes("switchTab('chat')")&&script.includes("window.switchTab('chat')"));
assert.ok(rules.includes('match /gabibotWorkSchedules/{scheduleId}')&&
  rules.includes('gbIsMember() && gbScheduleFields(request.resource.data)'));
console.log('✅ Interface, integração com GabiBot e regras vinculadas.');
