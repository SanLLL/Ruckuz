import { supabase } from "./supabase.js";
let currentUserId = null;
export function setCurrentUser(id){
    currentUserId = id;
}

export function createProfilePopup(){

    const overlay=document.createElement("div");
    overlay.id="profileOverlay";
    overlay.innerHTML=`
        <div id="profileCard">
            <img id="popupAvatar">
            <h2 id="popupName"></h2>
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

        }

    };

    document.body.appendChild(overlay);

}

export async function openProfile(userId){
    const overlay=document.getElementById("profileOverlay");
    const {data:profile}=await supabase
    .from("profiles")
    .select("*")
    .eq("id",userId)
    .single();
    document.getElementById("popupAvatar").src=profile.avatar_url;
    document.getElementById("popupName").textContent=profile.username;
    document.getElementById("popupJoined").textContent=
        "Joined RuckuZ";

    const button1=document.getElementById("popupButton1");
    const button2=document.getElementById("popupButton2");
    if(userId===currentUserId){
        button1.textContent="🖼 Change Avatar";
        button2.textContent="✏ Change Username";
    }else{

        button1.textContent="💬 Message";
        button2.textContent="➕ Add Friend";

    }

    overlay.style.display="flex";

}
