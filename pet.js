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
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');

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
let isAnimating = false; // Evita cortar a animação de pulo

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
            iniciarJogo();
            atualizarBarrasNaTela();
            atualizarExpressao(); // Mostra o rosto certo logo ao logar
        } else {
            petDocRef.set({
                fome: 100, energia: 100, banheiro: 100, alegria: 100,
                nascimento: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                iniciarJogo();
                atualizarBarrasNaTela();
                atualizarExpressao();
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
// 3. MOTOR DO JOGO E EXPRESSÕES FACIAIS
// ==========================================

// Descobre qual rosto ela deve fazer dependendo das barras
function obterImagemEstadoAtual() {
    // A ordem aqui define a prioridade! Se ela estiver apertada, é o mais urgente.
    if (status.banheiro <= 30) return '21.png'; // Rosto apertada para o banheiro
    if (status.fome <= 30) return '22.png';     // Rosto faminta/brava
    if (status.energia <= 30) return '23.png';  // Rosto cansada/com sono
    if (status.alegria <= 30) return '24.png';  // Rosto triste/entediada
    
    return '16.png'; // Se nada estiver abaixo de 30%, ela fica feliz e normal!
}

function atualizarExpressao() {
    // Só muda o rosto se ela não estiver no meio de um pulo de ação
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
        atualizarExpressao(); // Checa se precisa mudar de rosto
    }, 3000);
    
    saveLoop = setInterval(() => { salvarBancoDeDados(); }, 15000);
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
    isAnimating = true; // Avisa que ela está dando o pulo
    bruxaImg.src = novaImagem;
    bruxaImg.classList.remove('breathe-anim'); 
    bruxaImg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bruxaImg.style.transform = 'scale(1.1) translateY(-15px)';
    
    clearTimeout(timeoutAnimacao);
    
    timeoutAnimacao = setTimeout(() => {
        // Quando a ação termina, ela volta pro rosto de acordo com a necessidade atual
        bruxaImg.src = obterImagemEstadoAtual(); 
        bruxaImg.style.transform = 'scale(1) translateY(0)';
        
        setTimeout(() => { 
            bruxaImg.classList.add('breathe-anim'); 
            isAnimating = false; // Pulo terminou, motor volta ao normal
        }, 300);
    }, 1500);
}

btnFood.addEventListener('click', () => {
    status.fome = Math.min(100, status.fome + 20);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('17.png'); // Foto Comendo
});

btnSleep.addEventListener('click', () => {
    status.energia = Math.min(100, status.energia + 30);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('18.png'); // Foto Dormindo
});

btnBath.addEventListener('click', () => {
    status.banheiro = 100;
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('19.png'); // Foto no Banheiro
});

btnFun.addEventListener('click', () => {
    status.alegria = Math.min(100, status.alegria + 25);
    atualizarBarrasNaTela();
    salvarBancoDeDados();
    animarAcao('20.png'); // Foto Brincando
});
