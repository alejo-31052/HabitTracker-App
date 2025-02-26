// Check if WebAuthn (Biometrics) is supported
if (!window.PublicKeyCredential) {
    console.log("Biometric Authentication NOT supported on this browser.");
} else {
    console.log("Biometric Authentication Supported!");
}
