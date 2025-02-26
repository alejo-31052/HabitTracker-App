import { initializeApp } from "./firebase/app";
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "./firebase/auth";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    onValue, 
    remove 
} from "./firebase/database";
import { 
    getFirestore, 
    doc, 
    getDoc 
} from "./firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCOiH_CGX-sLRRvL96OWBIe2kmBWJfc6Lo",
    authDomain: "habittrackerapp-fe614.firebaseapp.com",
    projectId: "habittrackerapp-fe614",
    storageBucket: "habittrackerapp-fe614.appspot.com",
    messagingSenderId: "457232994824",
    appId: "1:457232994824:web:7727eefe68d90fa333b7bd",
    measurementId: "G-93KJWH233S",
    databaseURL: "https://habittrackerapp-fe614-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const firestore = getFirestore(app);

export {auth, db, firestore};
let apiKey = "";
let genAI = null;
let model = null;

// **Step 1: Retrieve API Key from Firestore**
async function getApiKey() {
    try {
        let snapshot = await getDoc(doc(firestore, "apikey", "googlegenai"));
        if (snapshot.exists()) {
            apiKey = snapshot.data().key;

            // Initialize Gemini AI with the key
            genAI = new GoogleGenerativeAI(apiKey);
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } else {
            console.error("API Key not found in Firestore!");
        }
    } catch (error) {
        console.error("Error fetching API key:", error);
    }
}

// **Step 2: Ask the AI Chatbot**
async function askChatBot(request) {
    if (!model) {
        console.error("Model not initialized. Call getApiKey() first.");
        return "AI is not available right now.";
    }

    try {
        const result = await model.generateContent(request);
        return result.response.text();
    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Error fetching response. Please try again.";
    }
}

// **Step 3: Handle User Authentication**
document.addEventListener("DOMContentLoaded", async () => {
    await getApiKey(); // Fetch API key at startup

    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;

            if (!email || !password) {
                alert("Please enter both an email and a password.");
                return;
            }

            try {
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Account created! You can now log in.");
                window.location.href = "index.html";
            } catch (error) {
                alert("Error: " + error.message);
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            if (!email || !password) {
                alert("Please enter both an email and a password.");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert("Login successful!");
                window.location.href = "main.html";
            } catch (error) {
                alert("Error: " + error.message);
            }
        });
    }

    onAuthStateChanged(auth, (user) => {
        const userInfo = document.getElementById("user-info");
        const logoutBtn = document.getElementById("logout-btn");

        if (user) {
            if (userInfo) {
                userInfo.textContent = `Logged in as: ${user.email}`;
            }

            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => {
                    signOut(auth).then(() => {
                        alert("Logged out successfully!");
                        window.location.href = "index.html";
                    }).catch((error) => {
                        alert("Error: " + error.message);
                    });
                });
            }

            loadHabits(user.uid);

            const habitForm = document.getElementById("habit-form");
            if (habitForm) {
                habitForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const habitInput = document.getElementById("habit-input").value.trim();
                    if (!habitInput) {
                        alert("Please enter a habit name.");
                        return;
                    }
                    addHabit(user.uid, habitInput);
                    document.getElementById("habit-input").value = "";
                });
            }
        } else {
            if (window.location.pathname.includes("main.html")) {
                window.location.href = "index.html";
            }
        }
    });
});

// **Habit Functions**
function addHabit(userId, habitName) {
    const habitRef = push(ref(db, `habits/${userId}`));
    set(habitRef, {
        id: habitRef.key,
        name: habitName
    });
}

function loadHabits(userId) {
    const habitList = document.getElementById("habit-list");
    if (!habitList) return;

    onValue(ref(db, `habits/${userId}`), (snapshot) => {
        habitList.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const habit = childSnapshot.val();
            displayHabit(habit, userId);
        });
    });
}

function displayHabit(habit, userId) {
    const habitList = document.getElementById("habit-list");

    const li = document.createElement("li");
    li.classList.add("habit-item");
    li.textContent = habit.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.setAttribute("aria-label", `Delete habit: ${habit.name}`);
    deleteBtn.addEventListener("click", () => {
        deleteHabit(userId, habit.id);
    });

    li.appendChild(deleteBtn);
    habitList.appendChild(li);
}

function deleteHabit(userId, habitId) {
    remove(ref(db, `habits/${userId}/${habitId}`));
}

// **Ensure Keyboard Navigation Works**
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        document.activeElement.click();
    }
});
