import { supabase } from "./supabase.js";
let currentUserId = null;
export function setCurrentUser(id){
    currentUserId = id;
}
let onlineUsers = new Set();
export function setOnlineUsers(users) {
    onlineUsers = users;
    updateCurrentProfileStatus();
}

let currentProfileId = null;
function updateCurrentProfileStatus() {
    if (!currentProfileId) {
        return;
    }
    const status =
        document.getElementById("profileStatus");
    if (!status) {
        return;
    }
    const isOnline =
        onlineUsers.has(currentProfileId);
    if (isOnline) {
        status.innerHTML = `
            <span class="profileStatusDot online"></span>
            Online
        `;
        status.className = "profileStatus online";
    } else {
        status.innerHTML = `
            <span class="profileStatusDot offline"></span>
            Offline
        `;
        status.className = "profileStatus offline";
    }
}

export function createProfilePopup(){
    const overlay=document.createElement("div");
    overlay.id="profileOverlay";
    overlay.innerHTML=`
        <div id="profileCard">
            <img id="popupAvatar">
            <h2 id="popupName"></h2>
            <div id="popupUserId"></div>
            <div id="profileStatus"></div>
            <div id="popupCustomStatus"></div>
            <p id="popupJoined"></p>
            <div class="profileButtons">
                <button id="popupButton1"></button>
                <button id="popupButton2"></button>
            </div>
        </div>
    `;
    overlay.onclick=e=>{
        if(e.target===overlay){
            overlay.style.display="none";
            currentProfileId = null;
        }
    };
    document.body.appendChild(overlay);
}

export async function openProfile(userId){
    currentProfileId = userId;
    const overlay=document.getElementById("profileOverlay");
    const {data:profile}=await supabase
    .from("profiles")
    .select("*")
    .eq("id",userId)
    .single();
    document.getElementById("popupAvatar").src=profile.avatar_url;
    document
        .getElementById(
            "popupName"
        )
        .textContent =
            profile.username;
    document
        .getElementById(
            "popupUserId"
        )
        .textContent =
            profile.ruckuz_id ||
            "RuckuZ ID unavailable";
    const customStatus =
        (profile.status_text || "")
            .trim();
    document
        .getElementById(
            "popupCustomStatus"
        )
        .textContent =
            customStatus ||
            "No custom status";
    document
        .getElementById(
            "popupJoined"
        )
        .textContent =
            "RuckuZ Member";
    
    const button1 =
        document.getElementById("popupButton1");
    const button2 =
        document.getElementById("popupButton2");
    const buttonRow =
        document.querySelector(
            "#profileCard .profileButtons"
        );
    
    button1.onclick = null;
    button2.onclick = null;
    button1.disabled = false;
    button2.disabled = false;
    
    if (userId === currentUserId) {
        buttonRow.style.display = "none";
    
    } else {
    
        buttonRow.style.display = "flex";
        button1.textContent = "Message";
        button2.textContent = "Add Friend";
        
        const {
            data: existingFriend,
            error: friendError
        } = await supabase
            .from("friends")
            .select("id")
            .or(
                `and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`
            )
            .maybeSingle();
        if (friendError) {
            console.error(
                "Friend check error:",
                friendError
            );
        }
        
        if (existingFriend) {
            button2.textContent = "Friends";
            button2.disabled = true;
            button2.onclick = null;
        } else {
            const {
                data: existingRequest,
                error: requestError
            } = await supabase
                .from("friend_requests")
                .select(
                    "id, sender_id, receiver_id, status"
                )
                .or(
                    `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
                )
                .eq("status", "pending")
                .maybeSingle();
            if (requestError) {
                console.error(
                    "Friend request check error:",
                    requestError
                );
            }
            if (existingRequest) {
                if (
                    existingRequest.sender_id ===
                    currentUserId
                ) {
                    button2.textContent =
                        "Request Sent";
                    button2.disabled = true;
                } else {
                    button2.textContent =
                        "Request Received";
                    button2.disabled = true;
                }
            } else {
    
                button2.onclick = async () => {
                    button2.disabled = true;
                    button2.textContent =
                        "Sending...";
                    const { error } =
                        await supabase
                            .from("friend_requests")
                            .insert({
                                sender_id:
                                    currentUserId,
                                receiver_id:
                                    userId
                            });
    
                    if (error) {
                        console.error(error);
                        button2.disabled = false;
                        button2.textContent =
                            "Couldn't Send";
                        return;
                    }
    
                    button2.textContent =
                        "Request Sent";
                };
            }
        }
    }
    updateCurrentProfileStatus();
    overlay.style.display="flex";
}
