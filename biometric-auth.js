import { auth, db } from "./script.js"; // Import Firebase references
import { setDoc, doc, getDoc } from "firebase/firestore";

// Prevent multiple requests being sent
let biometricRequestPending = false;

// Function to register biometrics (User Opt-in)
async function registerBiometricAuth() {
    if (biometricRequestPending) {
        alert("A biometric registration request is already pending.");
        return;
    }

    if (!window.PublicKeyCredential) {
        alert("Your device does not support biometrics.");
        return;
    }

    biometricRequestPending = true;  // Set flag to true when the request starts

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Create a new credential for biometric registration
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { name: "Habit Tracker App" },
                user: {
                    id: new Uint8Array(16), // Use the Firebase UID here
                    name: "User",
                    displayName: "Habit Tracker User",
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 }, // ES256 (default)
                    { type: "public-key", alg: -257 }, // RS256 (optional)
                ],
                authenticatorSelection: { authenticatorAttachment: "platform" },
                timeout: 60000,
                attestation: "direct",
            },
        });

        if (credential) {
            const user = auth.currentUser;
            if (!user) {
                alert("You need to sign up first.");
                return;
            }

            // Store the biometric credential ID in Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                biometricCredentialId: credential.id,  // Store the credential ID in Firestore
                biometricsEnabled: true,  // Mark biometrics as enabled for this user
            }, { merge: true });

            alert("Biometric authentication registered successfully!");
            window.location.href = "index.html";  // Redirect to login page
        }
    } catch (error) {
        console.error("Error registering biometrics:", error);
        alert("Failed to register biometrics. Please try again.");
    } finally {
        biometricRequestPending = false;  // Reset the flag once the request completes
    }
}

// Function to authenticate using biometrics (login)
async function biometricLogin() {
    if (!window.PublicKeyCredential) {
        alert("Your device does not support biometric authentication.");
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert("No user found. Please log in manually.");
            return;
        }

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
            window.location.href = "main.html";  // Redirect to the main app page
        } else {
            alert("Failed to authenticate using biometrics.");
        }
    } catch (error) {
        console.error("Biometric login failed:", error);
        alert("Failed to authenticate. Please try using Email/Password login.");
    }
}

// Attach functions to buttons
document.getElementById("register-biometrics")?.addEventListener("click", registerBiometricAuth);
document.getElementById("biometric-login")?.addEventListener("click", biometricLogin);
