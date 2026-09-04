import {
    createClient
} from "https://esm.sh/@supabase/supabase-js@2";

import {
    getCookie,
    setCookie,
    deleteCookie
} from "./cookies.js";

const SESSION_COOKIE =
    "ruckuz-refresh-token";
export const supabase =
    createClient(
        "https://msnnsnatkozozlrenfrg.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbm5zbmF0a296b3pscmVuZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDIwOTYsImV4cCI6MjEwMDkxODA5Nn0.BkfWuj8Ce7_9XqlNBEatNpYInZKn0IjAqOkjNUe5Wb4",
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

export function rememberSession(session) {
    if (!session?.refresh_token) {
        return;
    }
    setCookie(
        SESSION_COOKIE,
        session.refresh_token,
        365
    );
}

export function clearPersistentLogin() {
    deleteCookie(
        SESSION_COOKIE
    );
}

export async function getPersistentSession() {
    const {
        data,
        error
    } =
        await supabase.auth.getSession();

    if (error) {
        console.warn(
            "Normal session lookup failed:",
            error
        );
    }

    if (data?.session) {
        rememberSession(
            data.session
        );
        
        return data.session;
    }

    const refreshToken =
        getCookie(
            SESSION_COOKIE
        );

    if (!refreshToken) {
        return null;
    }

    const {
        data: refreshedData,
        error: refreshError
    } =
        await supabase.auth.refreshSession({
            refresh_token:
                refreshToken
        });

    if (
        refreshError ||
        !refreshedData?.session
    ) {

        console.warn(
            "Couldn't restore cookie session:",
            refreshError
        );
        
        clearPersistentLogin();
        return null;
    }

    rememberSession(
        refreshedData.session
    );
    
    return refreshedData.session;
}

supabase.auth.onAuthStateChange(
    (event, session) => {
        if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "INITIAL_SESSION"
        ) {
            if (session) {
                rememberSession(
                    session
                );
            }
        }
        
        if (
            event === "SIGNED_OUT"
        ) {

            clearPersistentLogin();
        }
    }
);
