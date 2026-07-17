// Questions
const quizQuestions = [
    {
        question: "What does 'IP' stand for in IP address?",
        choices: ["Internet Protocol", "Internal Program", "Interface Processor", "Intranet Port"],
        correct: "Internet Protocol"
    },
    {
        question: "Which of the following is considered the 'brain' of a computer?",
        choices: ["RAM", "SSD", "CPU (Central Processing Unit)", "GPU"],
        correct: "CPU (Central Processing Unit)"
    },
    {
        question: "What is the primary function of a Firewall?",
        choices: [
            "To speed up internet connections",
            "To monitor and filter network traffic",
            "To delete old duplicate files",
            "To backup lost database data"
        ],
        correct: "To monitor and filter network traffic"
    },
    {
        question: "Which of these is a widely used open-source operating system?",
        choices: ["Windows 11", "macOS", "Linux", "iOS"],
        correct: "Linux"
    },
    {
        question: "What is the main purpose of DNS (Domain Name System)?",
        choices: [
            "To translate domain names (like google.com) into IP addresses",
            "To securely encrypt password fields",
            "To connect wireless mice to computers",
            "To host online multiplayer servers"
        ],
        correct: "To translate domain names (like google.com) into IP addresses"
    },
    {
        question: "Which term refers to the practice of tricking users into giving away sensitive login details?",
        choices: ["Phishing", "Spamming", "Debugging", "Caching"],
        correct: "Phishing"
    },
    {
        question: "What does 'RAM' stand for in computer hardware?",
        choices: ["Read Access Memory", "Random Access Memory", "Rapid Action Module", "Run Active Method"],
        correct: "Random Access Memory"
    },
    {
        question: "In database management, what does SQL stand for?",
        choices: ["Simple Query Language", "System Quick Link", "Structured Query Language", "Secure Queue Layout"],
        correct: "Structured Query Language"
    },
    {
        question: "Which port number is standard for secure web traffic (HTTPS)?",
        choices: ["21", "80", "443", "8080"],
        correct: "443"
    },
    {
        question: "What technology is used to run multiple virtual operating systems on a single physical machine?",
        choices: ["Virtualization", "Compilation", "Encryption", "Fragmentation"],
        correct: "Virtualization"
    }
];

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBDuplfLusCuNumacqO_uy7_3ipcALIrMA",
    authDomain: "quiz-na-ta.firebaseapp.com",
    projectId: "quiz-na-ta",
    storageBucket: "quiz-na-ta.firebasestorage.app",
    messagingSenderId: "511195486300",
    appId: "1:511195486300:web:c8d2491c8b5baf37f9ee99",
    measurementId: "G-SXYCXZ87JH"
};

// Firebase & Firestore Database
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Audio Effects
const clickSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
const correctSound = new Audio("audio/correct.mp3");
const wrongSound = new Audio("audio/fahh.mp3");
const gameOverSound = new Audio("audio/gameover.wav");

// Game State Variables
let shuffledQuestions = []; 
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = 10;
let timerInterval;
let playerName = "Anonymous";

// Elements
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const logoutBtn = document.getElementById("logout-btn"); 
const questionText = document.getElementById("question-text");
const choicesContainer = document.getElementById("choices-container");
const timerText = document.getElementById("timer");
const scoreboard = document.getElementById("score-board");
const finalScoreText = document.getElementById("final-score");
const startLeaderboard = document.getElementById("start-leaderboard");
const endLeaderboard = document.getElementById("end-leaderboard");


// =========================================================================
// GLOBAL DATABASE FUNCTIONS 
// =========================================================================

function saveHighScore(name, newScore) {
    db.collection("leaderboard")
        .add({
            name: name,
            score: newScore,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log("Score successfully saved to the cloud!");
        })
        .catch((error) => {
            console.error("Error saving score: ", error);
        });
}

function showLeaderboard(targetElement) {
    targetElement.innerHTML = `<li class="leaderboard-item" style="color: #888; justify-content: center;">Loading global scores...</li>`;

    db.collection("leaderboard")
        .orderBy("score", "desc")
        .limit(5)
        .get()
        .then((querySnapshot) => {
            targetElement.innerHTML = "";

            if (querySnapshot.empty) {
                targetElement.innerHTML = `<li class="leaderboard-item" style="color: #888; justify-content: center;">No global scores yet!</li>`;
                return;
            }

            let index = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const li = document.createElement("li");
                li.className = "leaderboard-item";
                li.innerHTML = `<span>${index}. ${data.name}</span> <span>${data.score} pts</span>`;
                targetElement.appendChild(li);
                index++;
            });
        })
        .catch((error) => {
            console.error("Error getting leaderboard: ", error);
            targetElement.innerHTML = `<li class="leaderboard-item" style="color: #ff4757; justify-content: center;">Error loading leaderboard.</li>`;
        });
}


// =========================================================================
// ISOLATED AUTHENTICATION & PROFILE CONTROLLER
// =========================================================================
const auth = firebase.auth();

const authOverlay = document.getElementById("auth-overlay-card");
const profileOverlay = document.getElementById("profile-overlay-card");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authLoginBtn = document.getElementById("auth-login-btn");
const authSignupBtn = document.getElementById("auth-signup-btn");
const authErrorMsg = document.getElementById("auth-error-msg");

const profileNameInput = document.getElementById("profile-name-input");
const saveProfileBtn = document.getElementById("save-profile-btn");
const profileErrorMsg = document.getElementById("profile-error-msg");
const displayPlayerName = document.getElementById("display-player-name");

function evaluateSessionState(user) {
    if (user) {
        authOverlay.classList.add("hidden");
        
        // Check if the user has already chosen a username profile update
        if (user.displayName) {
            profileOverlay.classList.add("hidden");
            startScreen.classList.remove("hidden");
            playerName = user.displayName;
            displayPlayerName.innerText = playerName;
            showLeaderboard(startLeaderboard);
        } else {
            // New user missing a display name setup -> Trigger the profile form
            startScreen.classList.add("hidden");
            profileOverlay.classList.remove("hidden");
        }
    } else {
        // Logged out clear-downs
        startScreen.classList.add("hidden");
        profileOverlay.classList.add("hidden");
        gameScreen.classList.add("hidden");
        endScreen.classList.add("hidden");
        authOverlay.classList.remove("hidden");
        authEmail.value = "";
        authPassword.value = "";
        profileNameInput.value = "";
    }
}

// Log In Action
authLoginBtn.addEventListener("click", () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    
    if(!email || !password) {
        authErrorMsg.innerText = "Please fill in all credentials.";
        authErrorMsg.style.display = "block";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
            authErrorMsg.innerText = err.message;
            authErrorMsg.style.display = "block";
        });
});

// Sign Up Action
authSignupBtn.addEventListener("click", () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if(!email || !password) {
        authErrorMsg.innerText = "Please specify an email and password.";
        authErrorMsg.style.display = "block";
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .catch(err => {
            authErrorMsg.innerText = err.message;
            authErrorMsg.style.display = "block";
        });
});

// Save Locked Nickname Profile Action
saveProfileBtn.addEventListener("click", () => {
    const chosenName = profileNameInput.value.trim();
    const user = auth.currentUser;

    if (!chosenName) {
        profileErrorMsg.innerText = "Please choose a valid nickname.";
        profileErrorMsg.style.display = "block";
        return;
    }

    // Update Firebase account with their chosen permanent profile name
    user.updateProfile({ displayName: chosenName })
        .then(() => {
            evaluateSessionState(user); // Refresh page layout view
        })
        .catch(err => {
            profileErrorMsg.innerText = err.message;
            profileErrorMsg.style.display = "block";
        });
});

// Global Log Out Action
logoutBtn.addEventListener("click", () => {
    auth.signOut().catch(err => console.error("Sign out error:", err));
});

// Sync tracking context state automatically
auth.onAuthStateChanged((user) => evaluateSessionState(user));
// =========================================================================


// Start Game Event
startBtn.addEventListener("click", () => {
    startGame();
});

restartBtn.addEventListener("click", startGame);

// Helper function: Fisher-Yates Shuffle Algorithm
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

function startGame() {
    score = 0;
    currentQuestionIndex = 0;
    scoreboard.innerText = `Score: ${score}`;

    shuffledQuestions = shuffle([...quizQuestions]);

    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= shuffledQuestions.length) {
        endGame();
        return;
    }

    const currentQ = shuffledQuestions[currentQuestionIndex];
    questionText.innerText = currentQ.question;
    choicesContainer.innerHTML = "";

    const randomizedChoices = shuffle([...currentQ.choices]);

    randomizedChoices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerText = choice;
        btn.onclick = () => {
            clickSound.currentTime = 0;
            clickSound.play();
            selectAnswer(btn, choice, currentQ.correct);
        };
        choicesContainer.appendChild(btn);
    });

    timeLeft = 10;
    timerText.innerText = `Time Left: ${timeLeft}s`;
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerText.innerText = `Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            revealCorrectAnswer(currentQ.correct);
        }
    }, 1000);
}

function selectAnswer(selectedButton, choice, correctAnswer) {
    clearInterval(timerInterval);

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => (btn.disabled = true));

    if (choice === correctAnswer) {
        selectedButton.classList.add("correct-answer");
        correctSound.currentTime = 0;
        correctSound.play();
        score += 1;
        scoreboard.innerText = `Score: ${score}`;
    } else {
        selectedButton.classList.add("wrong-answer");
        wrongSound.currentTime = 0;
        wrongSound.play();
        buttons.forEach((btn) => {
            if (btn.innerText === correctAnswer) {
                btn.classList.add("correct-answer");
            }
        });
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1500);
}

function revealCorrectAnswer(correctAnswer) {
    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => {
        btn.disabled = true;
        if (btn.innerText === correctAnswer) {
            btn.classList.add("correct-answer");
        }
    });

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1500);
}

function endGame() {
    clearInterval(timerInterval);
    gameOverSound.play();

    saveHighScore(playerName, score);

    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
    finalScoreText.innerText = `Final Score: ${score}/${shuffledQuestions.length}`;

    showLeaderboard(endLeaderboard);
}