import { auth, db } from "./script.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";

// **Handle Email/Password Login**
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful!");
            window.location.href = "index.html"; // Redirect to main app
        } catch (error) {
            alert(error.message);
        }
    });
}

// **Handle Biometric Login**
const biometricLoginBttn = document.getElementById("biometric-login");
if (biometricLoginBttn) {
    biometricLoginBttn.addEventListener("click", async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                alert("No user found. Please log in manually.");
                return;
            }

            // Retrieve the biometric credential ID from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("User data not found.");
                return;
            }

            const biometricCredentialId = docSnap.data().biometricCredentialId;
            if (!biometricCredentialId) {
                alert("Biometric login not enabled for this account.");
                return;
            }

            // Proceed with WebAuthn authentication using the stored credential ID
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    allowCredentials: [{
                        type: "public-key",
                        id: new Uint8Array(biometricCredentialId), // Use the stored credential ID
                    }],
                    timeout: 60000,
                },
            });

            if (credential) {
                alert("Biometric authentication successful! Redirecting...");
                window.location.href = "index.html";  // Redirect to the main app page
            } else {
                alert("Failed to authenticate using biometrics.");
            }
        } catch (error) {
            console.error("Biometric login failed:", error);
            alert("Failed to authenticate. Please try using Email/Password login.");
        }
    });
}
