// ==========================================
// 1. CHAVES DO FIREBASE (ATUALIZADAS)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCbkO3-M-Ulz0Yg_ZuN-jpWVcD1EHmcUm0",
    authDomain: "nosso-tempo-cd9c8.firebaseapp.com",
    projectId: "nosso-tempo-cd9c8",
    storageBucket: "nosso-tempo-cd9c8.firebasestorage.app",
    messagingSenderId: "812792210449",
    appId: "1:812792210449:web:df98d32608446979ae7db0"
};

// Inicializa o Firebase
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

// ==========================================
// 2. SISTEMA DE LOGIN COM MEMÓRIA (PERSISTÊNCIA)
// ==========================================

// Configura o Firebase para lembrar do celular/navegador pra sempre
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
      console.error("Erro na persistência:", error);
  });

// Botão de Entrar
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login deu certo! A tela vai trocar pelo observador abaixo.
            loginError.style.display = 'none';
        })
        .catch((error) => {
            loginError.style.display = 'block';
            console.error(error.message);
        });
});

// Botão de Sair
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Observador "Olheiro" do Firebase: Fica vigiando se alguém entrou ou saiu
auth.onAuthStateChanged((user) => {
    if (user) {
        // Tem gente logada! Esconde o login e mostra a masmorra
        loginScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        console.log("Logado como:", user.email);
        
        // (No próximo passo, vamos colocar aqui o código que busca as barrinhas do Firestore)
    } else {
        // Ninguém logado. Mostra o login e esconde a masmorra
        loginScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
    }
});
