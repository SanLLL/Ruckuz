const recoveryLinkPresent =
    window.location.hash.includes(
        "type=recovery"
    ) ||
    new URLSearchParams(
        window.location.search
    ).has(
        "code"
    );

const {
    supabase,
    clearPersistentLogin
} =
    await import(
        "./supabase.js"
    );

const newPassword =
    document.getElementById(
        "newPassword"
    );

const confirmPassword =
    document.getElementById(
        "confirmPassword"
    );

const changePasswordButton =
    document.getElementById(
        "authButton"
    );

const statusText =
    document.getElementById(
        "status"
    );

let recoverySession =
    null;

function enablePasswordReset(
    session
) {

    if (
        !session
    ) {
        return;
    }

    recoverySession =
        session;

    changePasswordButton.disabled =
        false;

    statusText.textContent =
        "";

}

supabase.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event ===
            "PASSWORD_RECOVERY"
        ) {

            enablePasswordReset(
                session
            );

        }

    }
);

const {
    data: {
        session
    },
    error: sessionError
} =
    await supabase.auth.getSession();

if (
    sessionError
) {
    console.error(
        "Recovery session error:",
        sessionError
    );

}

if (
    recoveryLinkPresent &&
    session
) {

    enablePasswordReset(
        session
    );

}

if (
    !recoveryLinkPresent
) {

    changePasswordButton.disabled =
        true;

    statusText.textContent =
        "This password reset link is invalid or has expired.";

}

changePasswordButton.onclick =
    async () => {

        statusText.textContent =
            "";

        if (
            !recoverySession
        ) {

            statusText.textContent =
                "This password reset link is invalid or has expired.";
            return;

        }

        const password =
            newPassword.value;

        const confirmation =
            confirmPassword.value;

        if (
            password.length < 8
        ) {

            statusText.textContent =
                "Password must be at least 8 characters.";
            return;

        }

        if (
            password !==
            confirmation
        ) {

            statusText.textContent =
                "The passwords don't match.";
            return;
        }

        changePasswordButton.disabled =
            true;
        changePasswordButton.textContent =
            "Changing...";

        const {
            error
        } =
            await supabase.auth
                .updateUser({
                    password:
                        password
                });

        if (
            error
        ) {

            console.error(
                "Password update error:",
                error
            );

            changePasswordButton.disabled =
                false;
            changePasswordButton.textContent =
                "Change Password";

            statusText.textContent =
                error.message;
            return;
        }

        statusText.textContent =
            "Password changed. Returning to login...";
        await supabase.auth.signOut();
        clearPersistentLogin();
        setTimeout(
            () => {

                location.replace(
                    "/"
                );
            },
            1200
        );
    };
