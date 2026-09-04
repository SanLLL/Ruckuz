const DEFAULT_DAYS = 365;
export function setCookie(name, value, days = DEFAULT_DAYS) {
    const maxAge =
        Math.floor(days * 24 * 60 * 60);
    const secure =
        location.protocol === "https:"
            ? "; Secure"
            : "";
    document.cookie =
        `${encodeURIComponent(name)}=` +
        `${encodeURIComponent(value)}; ` +
        `Max-Age=${maxAge}; ` +
        `Path=/; ` +
        `SameSite=Lax` +
        secure;
}

export function getCookie(name) {
    const encodedName =
        encodeURIComponent(name) + "=";
    const cookies =
        document.cookie.split(";");
    for (const cookie of cookies) {
        const trimmed =
            cookie.trim();
        if (
            trimmed.startsWith(
                encodedName
            )
        ) {

            return decodeURIComponent(
                trimmed.substring(
                    encodedName.length
                )
            );
        }
    }
    return null;
}

export function deleteCookie(name) {
    const secure =
        location.protocol === "https:"
            ? "; Secure"
            : "";

    document.cookie =
        `${encodeURIComponent(name)}=; ` +
        `Max-Age=0; ` +
        `Path=/; ` +
        `SameSite=Lax` +
        secure;
}
