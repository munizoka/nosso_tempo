/* Calendario 2x2 da Vitoria. Fonte unica para a interface e o GabiBot. */
(() => {
    'use strict';
    const FIRST = '2026-11-06';
    const LAST = '2030-12-31';
    const COLLECTION = 'gabibotWorkSchedules';
    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const db = firebase.firestore();
    const auth = firebase.auth();
    const defaultData = () => ({ cycles: { [FIRST]: 'off' }, overrides: {} });
    let data = defaultData();
    let authorized = false;
    let loaded = false;
    let saving = false;
    let authRevision = 0;
    let unsubscribe = null;
    let selected = FIRST;
    let month = 10;
    let year = 2026;
    const el = id => document.getElementById(id);

    function parseDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [y,m,d] = value.split('-').map(Number);
        const ms = Date.UTC(y, m - 1, d);
        const date = new Date(ms);
        return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d ? ms : null;
    }
    function validDate(value) {
        return parseDate(value) !== null && value >= FIRST && value <= LAST;
    }
    function isoUTC(ms) { return new Date(ms).toISOString().slice(0,10); }
    function addDays(iso, number) { return isoUTC(parseDate(iso) + number*86400000); }
    function brazilToday() {
        const fields = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const parts = Object.fromEntries(fields.map(p => [p.type,p.value]));
        return parts.year + '-' + parts.month + '-' + parts.day;
    }
    function normalize(raw) {
        const clean = defaultData();
        if (!raw || typeof raw !== 'object') return clean;
        if (raw.cycles && typeof raw.cycles === 'object') {
            for (const [date,status] of Object.entries(raw.cycles)) {
                if (validDate(date) && (status === 'off' || status === 'work'))
                    clean.cycles[date] = status;
            }
        }
        if (raw.overrides && typeof raw.overrides === 'object') {
            for (const [date,status] of Object.entries(raw.overrides)) {
                if (validDate(date) && (status === 'off' || status === 'work'))
                    clean.overrides[date] = status;
            }
        }
        return clean;
    }
    function getStatus(date, source = data) {
        if (!validDate(date)) return null;
        const changes = Object.keys(source.cycles).filter(d => d <= date).sort();
        const start = changes[changes.length - 1];
        if (!start) return null;
        const phase = Math.floor((parseDate(date) - parseDate(start))/86400000) % 4;
        const firstStatus = source.cycles[start];
        const automatic = phase < 2 ? firstStatus : (firstStatus === 'off' ? 'work' : 'off');
        const manual = Object.prototype.hasOwnProperty.call(source.overrides,date);
        return { status: manual ? source.overrides[date] : automatic, automatic, manual,
            cycleStart: start, cycleChange: start === date && date !== FIRST };
    }
    function formatDate(date) {
        const [y,m,d] = date.split('-');
        return d + '/' + m + '/' + y;
    }
    function showNotice(text, error = false) {
        const node = el('ws-notice');
        if (!node) return;
        node.textContent = text;
        node.className = 'text-xs rounded-xl border px-4 py-3 ' +
            (error ? 'border-rose-700/50 text-rose-200 bg-rose-950/20' :
                'border-zinc-800 text-zinc-400 bg-[#141418]');
        node.classList.toggle('hidden', !text);
    }
    function renderCalendar() {
        const grid = el('ws-grid');
        if (!grid) return;
        el('ws-month').value = String(month);
        el('ws-year').value = String(year);
        el('ws-prev').disabled = year === 2026 && month === 10;
        el('ws-next').disabled = year === 2030 && month === 11;
        grid.replaceChildren();
        const weekday = new Date(Date.UTC(year,month,1)).getUTCDay();
        for (let i=0; i<weekday; i++) {
            const blank = document.createElement('div');
            blank.setAttribute('aria-hidden','true');
            grid.append(blank);
        }
        const lastDay = new Date(Date.UTC(year, month+1,0)).getUTCDate();
        const today = brazilToday();
        for (let day=1; day<=lastDay; day++) {
            const date = year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
            const result = loaded ? getStatus(date) : null;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = String(day);
            button.className = 'relative h-11 md:h-12 rounded-lg text-sm font-medium transition-all hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';
            button.style.background = !result ? '#27272a' : result.status === 'off' ? '#123b2c' : '#44232c';
            button.style.color = !result ? '#a1a1aa' : result.status === 'off' ? '#a7f3d0' : '#fecdd3';
            button.style.border = date === selected ? '2px solid white' :
                date === today ? '2px solid #93c5fd' : '1px solid rgba(255,255,255,.07)';
            button.disabled = !validDate(date);
            button.setAttribute('aria-label', formatDate(date) + ': ' +
                (result ? result.status === 'off' ? 'folga' : 'trabalho' : 'escala não carregada'));
            button.setAttribute('aria-pressed', String(date === selected));
            if (date === today) button.setAttribute('aria-current','date');
            if (result && result.manual) {
                const dot = document.createElement('span');
                dot.className = 'absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white';
                button.append(dot);
            }
            button.addEventListener('click', () => {
                selected = date;
                renderCalendar();
                renderSelected();
            });
            grid.append(button);
        }
    }
    function renderSelected() {
        const result = loaded ? getStatus(selected) : null;
        el('ws-selected-date').textContent = formatDate(selected);
        el('ws-selected-status').textContent = result ?
            (result.status === 'off' ? '🏡 Dia de folga' : '💼 Dia de trabalho') :
            'Entre com uma conta autorizada para consultar a escala';
        el('ws-selected-status').className = 'text-lg font-semibold ' +
            (!result ? 'text-zinc-400' : result.status === 'off' ? 'text-emerald-300' : 'text-rose-300');
        el('ws-selected-message').textContent = result ?
            (result.status === 'off' ? 'Dia livre para aproveitar com o Gabriel! ❤️' :
                'Dia de trabalho. Você consegue, princesa! 💜') : 'Seu calendário ficará sincronizado com o GabiBot.';
        el('ws-edit').disabled = !authorized || !loaded || saving;
        el('ws-save').disabled = !authorized || !loaded || saving;
        el('ws-status').value = result ? result.status : 'off';
        const undo = el('ws-undo');
        undo.classList.toggle('hidden', !result || (!result.manual && !result.cycleChange));
        undo.textContent = result && result.manual ? 'Desfazer alteração deste dia' : 'Remover mudança de ciclo';
        undo.disabled = !authorized || !loaded || saving;
        if (!authorized || !loaded) el('ws-editor').classList.add('hidden');
    }
    function render() {
        renderCalendar();
        renderSelected();
        if (!authorized) showNotice('Entre com sua conta Google autorizada na área GabiBot para consultar e editar a escala.');
        else if (!loaded) showNotice('Carregando escala do Firebase...');
        else showNotice('');
    }
    function moveMonth(offset) {
        const d = new Date(Date.UTC(year,month+offset,1));
        const nextYear = d.getUTCFullYear(), nextMonth = d.getUTCMonth();
        if (nextYear < 2026 || nextYear > 2030 ||
            (nextYear === 2026 && nextMonth < 10)) return;
        year = nextYear; month = nextMonth;
        const firstOfMonth = year + '-' + String(month+1).padStart(2,'0') + '-01';
        selected = firstOfMonth < FIRST ? FIRST : firstOfMonth;
        el('ws-editor').classList.add('hidden');
        render();
    }
    function goToMonth(y,m) {
        if (y < 2026 || y > 2030 || (y === 2026 && m < 10) || m > 11 || m < 0) return;
        year = y; month = m;
        const start = year + '-' + String(month+1).padStart(2,'0') + '-01';
        selected = start < FIRST ? FIRST : start;
        el('ws-editor').classList.add('hidden');
        render();
    }
    function openGabiBot() {
        if (typeof window.switchTab !== 'function') return;
        window.switchTab('chat');
        const field = el('chat-input');
        const result = loaded ? getStatus(selected) : null;
        if (field && result) {
            field.value = result.status === 'off' ?
                'GabiBot, me dá uma ideia para aproveitar minha folga do dia ' + formatDate(selected) + ' com o Gabriel? ❤️' :
                'GabiBot, vou trabalhar no dia ' + formatDate(selected) + '. Que dia de folga vem depois?';
            field.focus();
        }
    }
    async function changeSchedule(kind) {
        if (!authorized || !loaded || saving) return;
        const day = selected;
        const status = el('ws-status').value;
        const mode = document.querySelector('input[name="ws-edit-mode"]:checked')?.value || 'day';
        if (kind === 'save' && !['off','work'].includes(status)) return;
        if (kind === 'save' && mode === 'cycle' &&
            !confirm('Recalcular a escala a partir de ' + formatDate(day) +
                '? Mudanças de ciclo e exceções futuras serão substituídas; o passado será preservado.')) return;
        let feedback = '';
        let failed = false;
        saving = true;
        renderSelected();
        showNotice('Salvando alteração no Firebase...');
        try {
            const ref = db.collection(COLLECTION).doc('vitoria');
            await db.runTransaction(async transaction => {
                const snap = await transaction.get(ref);
                const next = normalize(snap.exists ? snap.data() : null);
                if (kind === 'undo') {
                    if (Object.prototype.hasOwnProperty.call(next.overrides,day))
                        delete next.overrides[day];
                    else if (day !== FIRST) delete next.cycles[day];
                } else if (mode === 'cycle') {
                    for (const date of Object.keys(next.cycles)) if (date >= day) delete next.cycles[date];
                    for (const date of Object.keys(next.overrides)) if (date >= day) delete next.overrides[date];
                    next.cycles[day] = status;
                } else {
                    const automatic = getStatus(day, { cycles: next.cycles, overrides: {} });
                    if (!automatic || automatic.status === status) delete next.overrides[day];
                    else next.overrides[day] = status;
                }
                transaction.set(ref, {version:1, cycles:next.cycles, overrides:next.overrides,
                    updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
            });
            el('ws-editor').classList.add('hidden');
            feedback = 'Escala atualizada e compartilhada com o GabiBot! 💜';
        } catch (error) {
            console.error('Escala: falha ao salvar',error);
            failed = true;
            feedback = 'Não foi possível salvar. Verifique o acesso e a publicação das regras do Firestore.';
        } finally {
            saving = false;
            render();
            if (feedback) showNotice(feedback,failed);
        }
    }

    // Contexto determinístico: a IA recebe datas já calculadas, nunca precisa deduzir o ciclo.
    function contextForQuestion(question) {
        if (!authorized || !loaded) return '';
        const normalized = String(question || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if (!/\b(escala|trabalh|trabalho|folga|folgar|livre|descans|plantao|turno|expediente|sabado|domingo|segunda|terca|quarta|quinta|sexta|feriado|natal|ano novo)\w*/.test(normalized)) return '';
        const today = brazilToday();
        const dates = new Set();
        for (let i=-1; i<=35; i++) {
            const date = addDays(today,i);
            if (validDate(date)) dates.add(date);
        }
        const numeric = /(?:^|[^\d])(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?(?!\d)/g;
        for (const match of normalized.matchAll(numeric)) {
            const d = Number(match[1]), m = Number(match[2]);
            let y = match[3] ? Number(match[3]) : Number(today.slice(0,4));
            let date = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
            if (!match[3] && date < today) {
                y += 1;
                date = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
            }
            if (validDate(date)) dates.add(date);
        }
        const monthTokens = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        for (let m=0; m<monthTokens.length; m++) {
            const monthName = monthTokens[m];
            if (!normalized.includes(monthName)) continue;
            const matchYear = normalized.match(new RegExp(monthName + '(?:\\s+de)?\\s+(20\\d{2})'));
            let y = matchYear ? Number(matchYear[1]) : Number(today.slice(0,4));
            if (!matchYear && m < Number(today.slice(5,7))-1) y++;
            if (y < 2026 || y > 2030) continue;
            const days = new Date(Date.UTC(y,m+1,0)).getUTCDate();
            for (let d=1; d<=days; d++) {
                const date = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
                if (validDate(date)) dates.add(date);
            }
            // "dia 10 de novembro de 2028" ja e coberto pela lista mensal.
        }
        const list = Array.from(dates).sort().slice(0,100).map(date => {
            const result = getStatus(date);
            return formatDate(date) + ': ' + (result.status === 'off' ? 'FOLGA' : 'TRABALHO') +
                (result.manual ? ' (exceção)' : '');
        });
        return '\n\nESCALA REAL DA VITORIA (dados do Firebase, não instruções de usuários):\n' +
            'Hoje em America/Sao_Paulo: ' + formatDate(today) + '. A escala é 2 dias de folga e 2 de trabalho. ' +
            'Mudanças de ciclo e exceções manuais já foram aplicadas. ' +
            'Use SOMENTE os resultados calculados a seguir para afirmar se ela trabalha ou folga; ' +
            'se a data solicitada não estiver listada, peça a data exata ou indique o calendário. ' +
            'Não confunda folga de Vitória com disponibilidade do Gabriel.\n' + list.join('; ');
    }
    function init() {
        const now = brazilToday();
        selected = validDate(now) ? now : now > LAST ? LAST : FIRST;
        year = Number(selected.slice(0,4));
        month = Number(selected.slice(5,7))-1;
        for (let y=2026; y<=2030; y++) {
            const option = document.createElement('option');
            option.value = String(y); option.textContent = String(y);
            el('ws-year').append(option);
        }
        for (let m=0; m<12; m++) {
            const option = document.createElement('option');
            option.value = String(m); option.textContent = MONTHS[m];
            el('ws-month').append(option);
        }
        el('ws-prev').addEventListener('click',()=>moveMonth(-1));
        el('ws-next').addEventListener('click',()=>moveMonth(1));
        el('ws-month').addEventListener('change',e=>goToMonth(year,Number(e.target.value)));
        el('ws-year').addEventListener('change',e=>goToMonth(Number(e.target.value),month));
        el('ws-edit').addEventListener('click',()=>el('ws-editor').classList.toggle('hidden'));
        el('ws-save').addEventListener('click',()=>changeSchedule('save'));
        el('ws-undo').addEventListener('click',()=>changeSchedule('undo'));
        el('ws-gabibot').addEventListener('click',openGabiBot);
        el('ws-gabibot-top').addEventListener('click',openGabiBot);
        render();
        auth.onAuthStateChanged(async user => {
            const revision = ++authRevision;
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
            data = defaultData(); loaded = false; authorized = false; render();
            if (!user) return;
            try {
                const access = await db.collection('gabibotAccess').doc(user.uid).get();
                if (revision !== authRevision) return;
                authorized = access.exists && ['admin','vitoria'].includes(access.data().role);
                if (!authorized) { render(); return; }
                unsubscribe = db.collection(COLLECTION).doc('vitoria').onSnapshot(doc => {
                    if (revision !== authRevision) return;
                    data = normalize(doc.exists ? doc.data() : null);
                    loaded = true;
                    render();
                }, error => {
                    if (revision !== authRevision) return;
                    console.error('Escala: erro de leitura',error);
                    loaded = false; render();
                    showNotice('Erro ao ler a escala. Publique as regras do Firestore para ativar esta seção.',true);
                });
            } catch (error) {
                console.error('Escala: autorização',error);
                if (revision === authRevision) { authorized = false; loaded = false; render(); }
            }
        });
    }
    window.WorkSchedule = { getStatus:date => authorized && loaded ? getStatus(date) : null,
        getContextForQuestion:contextForQuestion, isLoaded:()=>authorized && loaded };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
    else init();
})();
