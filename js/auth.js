import { supabase } from "./supabase.js";
const {
    data: { session }
} = await supabase.auth.getSession();
if (session) {
    location.href = "pages/chat.html";
}

let registerMode = false;
const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const button = document.getElementById("authButton");
const statusText = document.getElementById("status");
const switchMode = document.getElementById("switchMode");
const switchText = document.getElementById("switchText");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

function updateUI() {
    if (registerMode) {
        username.style.display = "block";
        button.textContent = "Create Account";
        switchText.innerHTML =
            'Already have an account? <span id="switchMode">Login</span>';

        loginTab.classList.remove("active");
        registerTab.classList.add("active");

    } else {

        username.style.display = "none";
        button.textContent = "Login";
        switchText.innerHTML =
            'Don\'t have an account? <span id="switchMode">Register</span>';

        registerTab.classList.remove("active");
        loginTab.classList.add("active");

    }

    document.querySelector("#switchMode").onclick = toggleMode;
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

button.onclick = async () => {
    statusText.textContent = "";
    if (registerMode) {
        const { error } = await supabase.auth.signUp({
            email: email.value,
            password: password.value,
            options: {
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
                avatar_url: "/assets/avatars/ruckuz.png"

            });

        if (profileError) {
            console.error(profileError);

        }

    }

    location.href = "pages/chat.html";

};
