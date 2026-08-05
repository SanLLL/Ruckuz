import { supabase } from "./supabase.js";
import {
    createProfilePopup,
    openProfile,
    setCurrentUser
} from "./profilePopup.js";

const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    location.href = "../";
}

setCurrentUser(session.user.id);
createProfilePopup();

const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const send = document.getElementById("send");
const avatarUpload = document.getElementById("avatarUpload");
avatarUpload.onchange = uploadAvatar;
let profiles = {};

async function loadProfiles() {

    const { data, error } = await supabase
        .from("profiles")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    profiles = {};
    for (const profile of data) {
        profiles[profile.id] = profile;
    }

}

async function loadMessages() {
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    messages.innerHTML = "";

    for (const message of data) {
        addMessage(message);
    }

    messages.scrollTop = messages.scrollHeight;

}

function addMessage(message) {
    const profile = profiles[message.user_id] || {
        username: message.username,
        avatar_url: "/assets/avatars/ruckuz.png"

    };

    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
        <div class="messageRow">

            <img
                class="avatar"
                src="${profile.avatar_url}"
                alt="${profile.username}"
            >

            <div class="messageContent">

                <div class="username">
                    ${profile.username}
                </div>

                <div class="text">
                    ${message.content}
                </div>

            </div>

        </div>
    `;

    const avatar = div.querySelector(".avatar");
    avatar.onclick = () => {
        openProfile(message.user_id);

    };

    messages.appendChild(div);

}

send.onclick = sendMessage;
input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        sendMessage();

    }

});

async function sendMessage() {
    const text = input.value.trim();
    if (text === "") return;
    const { error } = await supabase
        .from("messages")
        .insert({
            user_id: session.user.id,
            username:
                session.user.user_metadata.username ??
                session.user.email,
            content: text

        });

    if (error) {

        console.error(error);

        return;

    }

    input.value = "";

}

async function uploadAvatar() {
    const file = avatarUpload.files[0];
    if (!file) return;
    const extension = file.name.split(".").pop();
    const fileName = `${session.user.id}.${extension}`;
    const { error: uploadError } = await supabase
        .storage
        .from("avatars")
        .upload(fileName, file, {
            upsert: true
        });

    if (uploadError) {
        console.error(uploadError);
        return;

    }

    const { data } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(fileName);

    const avatarUrl = data.publicUrl;
    const { error: profileError } = await supabase
        .from("profiles")
        .update({
            avatar_url: avatarUrl

        })

        .eq("id", session.user.id);
    if (profileError) {
        console.error(profileError);
        return;

    }

    profiles[session.user.id].avatar_url = avatarUrl;
    alert("Avatar Changed!");

}

await loadProfiles();
await loadMessages();
supabase
.channel("messages")
.on(

    "postgres_changes",

    {

        event: "INSERT",
        schema: "public",
        table: "messages"

    },

    payload => {
        addMessage(payload.new);
        messages.scrollTop = messages.scrollHeight;

    }

)

.subscribe();
