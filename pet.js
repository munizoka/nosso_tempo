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

// Elementos de Login
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');

// Elementos do Jogo
const bruxaImg = document.getElementById('bruxa-img');
const barFome = document.getElementById('bar-fome');
const barEnergia = document.getElementById('bar-energia');
const barBanheiro = document.getElementById('bar-banheiro');
const barAlegria = document.getElementById('bar-alegria');
const ageDisplay = document.getElementById('age-display');

// Botões
const btnFood = document.getElementById('btn-food');
const btnSleep = document.getElementById('btn-sleep');
const btnBath = document.getElementById('btn-bath');
const btnFun = document.getElementById('btn-fun');

let status = { fome: 100, energia: 100, banheiro: 100, alegria: 100 };
let petDocRef;
let gameLoop;
let saveLoop;

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
        gameScreen.style.display = 'flex';
        carregarBancoDeDados(user.uid);
    } else {
        loginScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
        pararJogo();
    }
});

function carregarBancoDeDados(uid) {
    // Procura o arquivo deste usuário específico no Firebase
    petDocRef = db.collection('pets').doc(uid);
    
    petDocRef.get().then((doc) => {
        if (doc.exists) {
            // A Bruxinha já existe! Recupera a memória
            let dados = doc.data();
            status.fome = dados.fome;
            status.energia = dados.energia;
            status.banheiro = dados.banheiro;
            status.alegria = dados.alegria;
            
            // Calcula a idade
            if (dados.nascimento) {
                let dias = Math.floor((Date.now() - dados.nascimento.toDate().getTime()) / (1000 * 60 * 60 * 24));
                ageDisplay.innerText = dias;
            }
            
            iniciarJogo();
            atualizarBarrasNaTela();
        } else {
            // Primeiro login de sempre! Cria o perfil dela na nuvem
            petDocRef.set({
                fome: 100,
                energia: 100,
                banheiro: 100,
                alegria: 100,
                nascimento: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                iniciarJogo();
                atualizarBarrasNaTela();
            });
        }
    });
}

function salvarBancoDeDados() {
    if (petDocRef) {
        petDocRef.update({
            fome: status.fome,
            energia: status.energia,
            banheiro: status.banheiro,
            alegria: status.alegria,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// ==========================================
// 3. MOTOR DO JOGO
// ==========================================
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
    // Consome os status localmente a cada 3 segundos
    gameLoop = setInterval(() => {
        status.fome = Math.max(0, status.fome - 1);
        status.energia = Math.max(0, status.energia - 0.5);
        status.banheiro = Math.max(0, status.banheiro - 0.8);
        status.alegria = Math.max(0, status.alegria - 1.2);
        atualizarBarrasNaTela();
    }, 3000);
    
    // Salva na nuvem silenciosamente a cada 15 segundos
    saveLoop = setInterval(() => {
        salvarBancoDeDados();
    }, 15000);
}

function pararJogo() {
    clearInterval(gameLoop);
    clearInterval(saveLoop);
}

// ==========================================
// 4. INTERAÇÕES E ANIMAÇÃO
// ==========================================
let timeoutAnimacao;

function animarAcao(novaImagem) {
    bruxaImg.src = novaImagem;
    bruxaImg.classList.remove('breathe-anim'); 
    bruxaImg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bruxaImg.style.transform = 'scale(1.1) translateY(-15px)';
    
    clearTimeout(timeoutAnimacao);
    
    timeoutAnimacao = setTimeout(() => {
        bruxaImg.src = '16.png';
        bruxaImg.style.transform = 'scale(1) translateY(0)';
        setTimeout(() => { bruxaImg.classList.add('breathe-anim'); }, 300);
    }, 1500);
}

btnFood.addEventListener('click', () => {
    status.fome = Math.min(100, status.fome + 20);
    atualizarBarrasNaTela();
    salvarBancoDeDados(); // Salva na hora que clica
    animarAcao('17.png');
});

btnSleep.addEventListener('click', () => {
    status.energia = Math.min(100, status.energia + 30);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('18.png');
});

btnBath.addEventListener('click', () => {
    status.banheiro = 100;
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('19.png');
});

btnFun.addEventListener('click', () => {
    status.alegria = Math.min(100, status.alegria + 25);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('20.png');
});
