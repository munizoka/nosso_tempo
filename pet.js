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

// Elementos do Jogo (Barras e Imagem)
const bruxaImg = document.getElementById('bruxa-img');
const barFome = document.getElementById('bar-fome');
const barEnergia = document.getElementById('bar-energia');
const barBanheiro = document.getElementById('bar-banheiro');
const barAlegria = document.getElementById('bar-alegria');

// Botões de Ação
const btnFood = document.getElementById('btn-food');
const btnSleep = document.getElementById('btn-sleep');
const btnBath = document.getElementById('btn-bath');
const btnFun = document.getElementById('btn-fun');

// Status da Bruxinha (Começam em 100%)
let status = {
    fome: 100,
    energia: 100,
    banheiro: 100,
    alegria: 100
};

// ==========================================
// 2. SISTEMA DE LOGIN COM MEMÓRIA
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
        iniciarJogo(); // Liga o motor do jogo!
    } else {
        loginScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
        pararJogo();
    }
});

// ==========================================
// 3. MOTOR DO JOGO (CAINDO COM O TEMPO)
// ==========================================
let gameLoop;

function atualizarBarrasNaTela() {
    // Atualiza a largura das barras (o CSS garante que o movimento seja suave)
    barFome.style.width = status.fome + '%';
    barEnergia.style.width = status.energia + '%';
    barBanheiro.style.width = status.banheiro + '%';
    barAlegria.style.width = status.alegria + '%';

    // Muda as cores suavemente para vermelho se o status ficar baixo (< 30%)
    barFome.style.backgroundColor = status.fome > 30 ? '#4caf50' : '#f44336';
    barEnergia.style.backgroundColor = status.energia > 30 ? '#ffeb3b' : '#f44336';
    barBanheiro.style.backgroundColor = status.banheiro > 30 ? '#2196f3' : '#f44336';
    barAlegria.style.backgroundColor = status.alegria > 30 ? '#e91e63' : '#f44336';
}

function iniciarJogo() {
    // A cada 3 segundos, as necessidades caem um pouquinho
    gameLoop = setInterval(() => {
        status.fome = Math.max(0, status.fome - 1);
        status.energia = Math.max(0, status.energia - 0.5); // Sono cai mais devagar
        status.banheiro = Math.max(0, status.banheiro - 0.8);
        status.alegria = Math.max(0, status.alegria - 1.2); // Fica entediada mais rápido
        atualizarBarrasNaTela();
    }, 3000);
}

function pararJogo() {
    clearInterval(gameLoop);
}

// ==========================================
// 4. INTERAÇÕES E ANIMAÇÃO FLUIDA
// ==========================================
let timeoutAnimacao;

function animarAcao(novaImagem) {
    // 1. Troca a imagem para a ação (comendo, dormindo)
    bruxaImg.src = novaImagem;
    
    // 2. Pausa a respiração normal e dá um "pulinho" suave usando CSS Transform
    bruxaImg.classList.remove('breathe-anim'); 
    bruxaImg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bruxaImg.style.transform = 'scale(1.1) translateY(-15px)';
    
    clearTimeout(timeoutAnimacao);
    
    // 3. Depois de 1.5 segundos, a imagem volta ao chão e a foto volta pra normal
    timeoutAnimacao = setTimeout(() => {
        bruxaImg.src = '16.png'; // A imagem base
        bruxaImg.style.transform = 'scale(1) translateY(0)';
        
        // 4. Espera o pulo terminar e volta a respirar
        setTimeout(() => {
            bruxaImg.classList.add('breathe-anim');
        }, 300);
    }, 1500);
}

// Quando clica nas barrinhas
btnFood.addEventListener('click', () => {
    status.fome = Math.min(100, status.fome + 20); // Enche 20%
    atualizarBarrasNaTela();
    animarAcao('17.png'); // Substitua pelo número da foto dela comendo
});

btnSleep.addEventListener('click', () => {
    status.energia = Math.min(100, status.energia + 30);
    atualizarBarrasNaTela();
    animarAcao('18.png'); // Foto dormindo
});

btnBath.addEventListener('click', () => {
    status.banheiro = 100; // Banheiro enche tudo de uma vez
    atualizarBarrasNaTela();
    animarAcao('19.png'); // Foto no banheiro
});

btnFun.addEventListener('click', () => {
    status.alegria = Math.min(100, status.alegria + 25);
    atualizarBarrasNaTela();
    animarAcao('20.png'); // Foto feliz/brincando
});
