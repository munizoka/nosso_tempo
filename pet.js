// ==========================================
// 1. CHAVES DO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCbkO3-M-Ulz0Yg_ZuN-jpWVcD1EHmcUm0",
    authDomain: "nosso-tempo-cd9c8.firebaseapp.com",
    projectId: "nosso-tempo-cd9c8",
    storageBucket: "nosso-tempo-cd9c8.firebasestorage.app",
    messagingSenderId: "812792210449",
    appId: "1:812792210449:web:df98d32608446979ae7db0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos da Tela
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const nameScreen = document.getElementById('name-screen');

const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');

const petNameInput = document.getElementById('pet-name-input');
const btnSaveName = document.getElementById('btn-save-name');
const petNameDisplay = document.getElementById('pet-name-display');

const bruxaImg = document.getElementById('bruxa-img');
const barFome = document.getElementById('bar-fome');
const barEnergia = document.getElementById('bar-energia');
const barBanheiro = document.getElementById('bar-banheiro');
const barAlegria = document.getElementById('bar-alegria');
const ageDisplay = document.getElementById('age-display');

const btnFood = document.getElementById('btn-food');
const btnSleep = document.getElementById('btn-sleep');
const btnBath = document.getElementById('btn-bath');
const btnFun = document.getElementById('btn-fun');

let status = { fome: 100, energia: 100, banheiro: 100, alegria: 100 };
let petDocRef;
let gameLoop;
let saveLoop;
let isAnimating = false; 

// ==========================================
// 2. SISTEMA DE LOGIN E BANCO DE DADOS
// ==========================================
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .then(() => { loginError.style.display = 'none'; })
        .catch((error) => {
            loginError.style.display = 'block';
            console.error(error.message);
        });
});

logoutBtn.addEventListener('click', () => { auth.signOut(); });

auth.onAuthStateChanged((user) => {
    if (user) {
        loginScreen.style.display = 'none';
        gameScreen.style.display = 'none'; // Esconde a masmorra enquanto carrega o banco
        carregarBancoDeDados(user.uid);
    } else {
        loginScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
        if(nameScreen) nameScreen.style.display = 'none';
        pararJogo();
    }
});

function carregarBancoDeDados(uid) {
    petDocRef = db.collection('pets').doc(uid);
    petDocRef.get().then((doc) => {
        if (doc.exists) {
            let dados = doc.data();
            status.fome = dados.fome;
            status.energia = dados.energia;
            status.banheiro = dados.banheiro;
            status.alegria = dados.alegria;
            
            if (dados.nascimento) {
                let dias = Math.floor((Date.now() - dados.nascimento.toDate().getTime()) / (1000 * 60 * 60 * 24));
                ageDisplay.innerText = dias;
            }
            
            atualizarBarrasNaTela();
            atualizarExpressao(); 
            
            // Verifica se a bruxinha já tem um nome gravado
            if (dados.nome) {
                if (petNameDisplay) petNameDisplay.innerText = dados.nome;
                nameScreen.style.display = 'none';
                gameScreen.style.display = 'flex';
                iniciarJogo();
            } else {
                // Perfil antigo sem nome ou algo faltante: mostra a tela de nome
                nameScreen.style.display = 'flex';
            }
        } else {
            // Criação do novo pet no banco de dados, ainda sem nome
            petDocRef.set({
                fome: 100, energia: 100, banheiro: 100, alegria: 100,
                nascimento: firebase.firestore.FieldValue.serverTimestamp(),
                nome: ""
            }).then(() => {
                atualizarBarrasNaTela();
                atualizarExpressao();
                nameScreen.style.display = 'flex'; // Chama a tela de batismo
            });
        }
    });
}

function salvarBancoDeDados() {
    if (petDocRef) {
        petDocRef.update({
            fome: status.fome, energia: status.energia, banheiro: status.banheiro, alegria: status.alegria,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// ==========================================
// 3. EVENTO DA ESCOLHA DE NOME
// ==========================================
if (btnSaveName) {
    btnSaveName.addEventListener('click', () => {
        const novoNome = petNameInput.value.trim() || "Bruxinha"; // Se não digitar nada, assume Bruxinha
        
        // 1. Atualiza no banco de dados e na tela
        petDocRef.update({ nome: novoNome });
        if (petNameDisplay) petNameDisplay.innerText = novoNome;
        
        // 2. Inicia a transição: apaga a tela de nome suavemente
        nameScreen.classList.add('fade-out');
        
        // 3. Espera 1 segundo pela animação e carrega a masmorra com fade-in
        setTimeout(() => {
            nameScreen.style.display = 'none';
            gameScreen.style.display = 'flex';
            gameScreen.classList.add('fade-in'); 
            iniciarJogo();
        }, 1000); 
    });
}

// ==========================================
// 4. MOTOR DO JOGO E EXPRESSÕES FACIAIS
// ==========================================

function obterImagemEstadoAtual() {
    if (status.banheiro <= 30) return '30.png'; 
    if (status.fome <= 30) return '28.png';     
    if (status.energia <= 30) return '29.png';  
    if (status.alegria <= 30) return '31.png';  
    return '16.png'; 
}

function atualizarExpressao() {
    if (!isAnimating) {
        let imagemCorreta = obterImagemEstadoAtual();
        if (bruxaImg.src.indexOf(imagemCorreta) === -1) {
            bruxaImg.src = imagemCorreta;
        }
    }
}

function atualizarBarrasNaTela() {
    barFome.style.width = status.fome + '%';
    barEnergia.style.width = status.energia + '%';
    barBanheiro.style.width = status.banheiro + '%';
    barAlegria.style.width = status.alegria + '%';

    barFome.style.backgroundColor = status.fome > 30 ? '#4caf50' : '#f44336';
    barEnergia.style.backgroundColor = status.energia > 30 ? '#ffeb3b' : '#f44336';
    barBanheiro.style.backgroundColor = status.banheiro > 30 ? '#2196f3' : '#f44336';
    barAlegria.style.backgroundColor = status.alegria > 30 ? '#e91e63' : '#f44336';
}

function iniciarJogo() {
    gameLoop = setInterval(() => {
        status.fome = Math.max(0, status.fome - 1);
        status.energia = Math.max(0, status.energia - 0.5);
        status.banheiro = Math.max(0, status.banheiro - 0.8);
        status.alegria = Math.max(0, status.alegria - 1.2);
        
        atualizarBarrasNaTela();
        atualizarExpressao(); 
    }, 3000);
    
    saveLoop = setInterval(() => { salvarBancoDeDados(); }, 15000);
}

function pararJogo() {
    clearInterval(gameLoop);
    clearInterval(saveLoop);
}

// ==========================================
// 5. INTERAÇÕES COM CLIQUES TURBINADOS
// ==========================================
let timeoutAnimacao;

function animarAcao(novaImagem) {
    isAnimating = true; 
    bruxaImg.src = novaImagem;
    bruxaImg.classList.remove('breathe-anim'); 
    bruxaImg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bruxaImg.style.transform = 'scale(1.1) translateY(-15px)';
    
    clearTimeout(timeoutAnimacao);
    
    timeoutAnimacao = setTimeout(() => {
        bruxaImg.src = obterImagemEstadoAtual(); 
        bruxaImg.style.transform = 'scale(1) translateY(0)';
        
        setTimeout(() => { 
            bruxaImg.classList.add('breathe-anim'); 
            isAnimating = false; 
        }, 300);
    }, 1500);
}

// Ação de Comer (Espetada)
function acaoComer() {
    status.fome = Math.min(100, status.fome + 20);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('32.png');
}
if(btnFood) btnFood.addEventListener('click', acaoComer);
if(barFome && barFome.parentElement) barFome.parentElement.addEventListener('click', acaoComer);

// Ação de Dormir
function acaoDormir() {
    status.energia = Math.min(100, status.energia + 30);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('20.png'); 
}
if(btnSleep) btnSleep.addEventListener('click', acaoDormir);
if(barEnergia && barEnergia.parentElement) barEnergia.parentElement.addEventListener('click', acaoDormir);

// Ação de Banheiro
function acaoBanheiro() {
    status.banheiro = 100;
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('18.png'); 
}
if(btnBath) btnBath.addEventListener('click', acaoBanheiro);
if(barBanheiro && barBanheiro.parentElement) barBanheiro.parentElement.addEventListener('click', acaoBanheiro);

// Ação de Brincar
function acaoBrincar() {
    status.alegria = Math.min(100, status.alegria + 25);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('19.png'); 
}
if(btnFun) btnFun.addEventListener('click', acaoBrincar);
if(barAlegria && barAlegria.parentElement) barAlegria.parentElement.addEventListener('click', acaoBrincar);
