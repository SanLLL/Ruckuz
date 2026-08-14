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
        avatar_url: "/Ruckuz/assets/avatars/ruckuz.png"

    };

    const div = document.createElement("div");
    div.className = "message";
    div.dataset.id = message.id;
    div.dataset.user = message.user_id;
    div.innerHTML = `
        <div class="messageRow">
        
            <div class="messageMenu">
        
                ⋮
        
            </div>

            <img
                class="avatar"
                src="${profile.avatar_url}?v=${Date.now()}"
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

    const menu = div.querySelector(".messageMenu");
    menu.onclick = (event) => {
        event.stopPropagation();
        closeAllMenus();
        const dropdown = createDropdown(message);
        document.body.appendChild(dropdown);
        const rect = menu.getBoundingClientRect();
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.display = "flex";
    
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
    const extension = file.type.split("/")[1] || "png";
    const fileName =
        `${session.user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase
        .storage
        .from("avatars")
        .upload(fileName, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false
        });
    
    if (uploadError) {
        console.error(uploadError);
        return;

    }

    const { data: publicUrlData } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(fileName);
    
    const avatarUrl = publicUrlData.publicUrl;
    
    console.log("Avatar file:", fileName);
    console.log("Avatar URL:", avatarUrl);
    
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

if (profiles[session.user.id]) {
    profiles[session.user.id].avatar_url = avatarUrl;

}

document
    .querySelectorAll(".avatar")
    .forEach(avatar => {
        const message = avatar.closest(".message");
        if (!message) return;
        if (
            
            message.dataset.user === session.user.id
        ) {
            
            avatar.src = avatarUrl;
        }
    });

alert("PFP changed!");

}

function closeAllMenus(){
    document
        .querySelectorAll(".messageDropdown")
        .forEach(menu => menu.remove());

}

function createDropdown(message){
    const menu = document.createElement("div");
    menu.className = "messageDropdown";
    if(message.user_id === session.user.id){
        menu.innerHTML = `
            <button class="editBtn">
                Edit
            </button>
            <button class="deleteBtn">
                Delete
            </button>

        `;

        menu.querySelector(".editBtn").onclick = () => {
            alert("Edit coming next!");
            menu.remove();

        };

        menu.querySelector(".deleteBtn").onclick = () => {
            deleteMessage(message.id);
            
            menu.remove();

        };

    }else{

        menu.innerHTML = `
            <button disabled>
                You can't edit this
            </button>

        `;

    }

    return menu;

}

document.addEventListener("click", closeAllMenus);
async function deleteMessage(messageId){
    const confirmed = confirm(
        "Delete this message?"
    );

    if(!confirmed) return;
    const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);
    if(error){
        console.error(error);

    }

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

.on(
    "postgres_changes",
    {
        event:"DELETE",
        schema:"public",
        table:"messages"
    },
    payload=>{

        const element=document.querySelector(
            `[data-id="${payload.old.id}"]`

        );

        if(element){
            element.remove();

        }

    }
)
.subscribe();
