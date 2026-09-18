import { supabase, getPersistentSession, rememberSession } from "./supabase.js";
const authLoadingScreen = document.getElementById("authLoadingScreen");
function revealLoginScreen() {
    document.documentElement.classList.remove(
        "authBooting"
    );
    if (!authLoadingScreen) {
        return;
    }
    authLoadingScreen.classList.add(
        "leaving"
    );
    setTimeout(
        () => {

            authLoadingScreen.remove();
        },
        210
    );
}

let session = null;
try {
    session =
        await getPersistentSession();
} catch (error) {
    console.error(
        "Session check failed:",
        error
    );
}
if (session) {
    location.replace(
        "/chat"
    );
} else {
    revealLoginScreen();
}

let registerMode = false;
const username =
    document.getElementById(
        "username"
    );

const usernameShell =
    document.getElementById(
        "usernameShell"
    );

const email =
    document.getElementById(
        "email"
    );

const password =
    document.getElementById(
        "password"
    );

const button =
    document.getElementById(
        "authButton"
    );

const buttonLabel =
    document.getElementById(
        "authButtonLabel"
    );

const statusText =
    document.getElementById(
        "status"
    );

const switchMode =
    document.getElementById(
        "switchMode"
    );

const switchText =
    document.getElementById(
        "switchText"
    );

const loginTab =
    document.getElementById(
        "loginTab"
    );

const registerTab =
    document.getElementById(
        "registerTab"
    );

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );

const authHeading =
    document.getElementById(
        "authHeading"
    );

const authIntro =
    document.getElementById(
        "authIntro"
    );

function updateUI() {

    if (
        registerMode
    ) {

        usernameShell.style.display =
            "block";

        forgotPassword.style.display =
            "none";

        buttonLabel.textContent =
            "Create Account";

        authHeading.textContent =
            "Join RuckuZ";

        authIntro.textContent =
            "Create your RuckuZ account.";

        switchText.innerHTML =
            'Already have an account? <span id="switchMode">Login</span>';

        loginTab.classList.remove(
            "active"
        );

        registerTab.classList.add(
            "active"
        );

    } else {

        usernameShell.style.display =
            "none";

        forgotPassword.style.display =
            "block";

        buttonLabel.textContent =
            "Login";

        authHeading.textContent =
            "Welcome back";

        authIntro.textContent =
            "Login to your RuckuZ account.";

        registerTab.classList.remove(
            "active"
        );

        loginTab.classList.add(
            "active"
        );

    }

    document.querySelector(
        "#switchMode"
    ).onclick =
        toggleMode;

}

function toggleMode() {
    registerMode = !registerMode;
    updateUI();

}

switchMode.onclick = toggleMode;
loginTab.onclick = () => {
    registerMode = false;
    updateUI();

};

registerTab.onclick = () => {
    registerMode = true;
    updateUI();

};

forgotPassword.onclick =
    async () => {
        
        statusText.textContent =
            "";

        const resetEmail =
            email
                .value
                .trim();

        if (
            resetEmail === ""
        ) {

            statusText.textContent =
                "Enter your email address first.";
            email.focus();
            return;

        }

        forgotPassword.disabled =
            true;
        
        forgotPassword.textContent =
            "Sending...";

        const {
            error
        } =
            await supabase.auth
                .resetPasswordForEmail(
                    resetEmail,
                    {
                        redirectTo:
                            "https://ruckuz.org/reset-password"
                    }
                );

        forgotPassword.disabled =
            false;

        forgotPassword.textContent =
            "Forgot password?";

        if (
            error
        ) {

            console.error(
                "Password reset email error:",
                error
            );

            statusText.textContent =
                "Couldn't send the reset email.";
            return;
        }
        
        statusText.textContent =
            "If an account uses that email, a password reset link has been sent.";
    };

button.onclick = async () => {
    statusText.textContent = "";
    if (registerMode) {
        const { error } = await supabase.auth.signUp({
            email: email.value,
            password: password.value,
            options: {
                emailRedirectTo:
                    "https://ruckuz.org/",
                data: {
                    username: username.value
                }
            }
        });

        if (error) {
            statusText.textContent = error.message;
            return;

        }

        location.href = "pages/verify.html";
        return;

    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value

    });

    if (error) {
        statusText.textContent = error.message;
        return;
    }

    rememberSession(
        data.session
    );

    const user = data.user;
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
        const { error: profileError } = await supabase
            .from("profiles")
            .insert({
                id: user.id,
                username:
                    user.user_metadata.username ??
                    user.email.split("@")[0],
                avatar_url: "/Ruckuz/assets/avatars/ruckuz.png"
            });
        
        if (profileError) {
            console.error(profileError);
        }
    }
    location.href = "/chat";

};
