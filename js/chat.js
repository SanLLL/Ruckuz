import { supabase } from "./supabase.js";
import {
    createProfilePopup,
    openProfile,
    setCurrentUser,
    setOnlineUsers
} from "./profilePopup.js";

const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    location.href = "../";
}

setCurrentUser(session.user.id);
createProfilePopup();

const presenceChannel = supabase.channel("ruckuz-presence", {
    config: {
        presence: {
            key: session.user.id
        }
    }
});
presenceChannel
    .on("presence", { event: "sync" }, () => {
        updateOnlineUsers();
    })
    .on("presence", { event: "join" }, () => {
        updateOnlineUsers();
    })
    .on("presence", { event: "leave" }, () => {
        updateOnlineUsers();
    })
    .subscribe(async status => {
        if (status !== "SUBSCRIBED") {
            return;
        }
        await presenceChannel.track({
            user_id: session.user.id,
            online_at: new Date().toISOString()
        });
        updateOnlineUsers();
    });
function updateOnlineUsers() {
    const state =
        presenceChannel.presenceState();
    const onlineUsers =
        new Set();
    for (const key in state) {
        const presences =
            state[key];
        for (const presence of presences) {
            if (presence.user_id) {
                onlineUsers.add(
                    presence.user_id
                );
            }
        }
    }
    currentOnlineUsers =
        onlineUsers;
    setOnlineUsers(
        onlineUsers
    );
    renderMemberList();
}

const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const send = document.getElementById("send");
const memberList = document.getElementById("memberList");
let memberProfiles = {};
let currentOnlineUsers = new Set();
const avatarUpload = document.getElementById("avatarUpload");
avatarUpload.onchange = uploadAvatar;
const fileButton = document.getElementById("fileButton");
const fileUpload = document.getElementById("fileUpload");
fileButton.onclick = () => {
    fileUpload.click();
};

fileUpload.onchange = uploadChatFile;
let profiles = {};
let currentChannel = "general";
const channelButtons =
    document.querySelectorAll(
        ".channelButton"
    );

const currentChannelName =
    document.getElementById(
        "currentChannelName"
    );

channelButtons.forEach(
    button => {
        button.onclick = async () => {
            const channel =
                button.dataset.channel;
            if (
                channel ===
                currentChannel
            ) {
                return;
            }
            currentChannel =
                channel;
            channelButtons.forEach(
                other => {
                    other.classList.remove(
                        "active"
                    );
                }
            );
            button.classList.add(
                "active"
            );
            currentChannelName.textContent =
                button.textContent
                    .replace("#", "")
                    .trim();
            await loadMessages();
        };
    }
);

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

async function loadMemberProfiles() {
    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(
            "id, username, avatar_url"
        )
        .order(
            "username",
            {
                ascending: true
            }
        );
    if (error) {
        console.error(
            "Member list loading error:",
            error
        );
        return;
    }
    memberProfiles = {};
    for (const profile of data) {
        memberProfiles[
            profile.id
        ] = profile;
    }
    renderMemberList();
}

function renderMemberList() {
    if (!memberList) {
        return;
    }
    memberList.innerHTML = "";
    const profiles =
        Object.values(
            memberProfiles
        );

    profiles.sort((a, b) => {
        const aOnline =
            currentOnlineUsers.has(a.id);
        const bOnline =
            currentOnlineUsers.has(b.id);
        if (
            aOnline &&
            !bOnline
        ) {
            return -1;
        }
        if (
            !aOnline &&
            bOnline
        ) {
            return 1;
        }
        return a.username.localeCompare(
            b.username
        );
    });
    for (const profile of profiles) {
        createMemberElement(
            profile
        );
    }
}

function createMemberElement(profile) {
    const div =
        document.createElement("div");
    div.className =
        "memberItem";
    const isOnline =
        currentOnlineUsers.has(
            profile.id
        );
    const avatar =
        profile.avatar_url ||
        "/Ruckuz/assets/avatars/ruckuz.png";
    div.innerHTML = `
        <div class="memberAvatarWrapper">
            <img
                class="memberAvatar"
                src="${avatar}?v=${Date.now()}"
                alt="${escapeHTML(profile.username)}"
            >
            <span
                class="memberOnlineDot ${
                    isOnline
                        ? "online"
                        : ""
                }"
            ></span>
        </div>
        <div class="memberInfo">
            <div class="memberName">
                ${escapeHTML(profile.username)}
            </div>
            <div
                class="memberStatus ${
                    isOnline
                        ? "online"
                        : ""
                }"
            >
                ${
                    isOnline
                        ? "Online"
                        : "offline"
                }
            </div>
        </div>
    `;
    div.onclick = () => {
        openProfile(
            profile.id
        );
    };
    memberList.appendChild(
        div
    );
}

async function loadMessages() {
    const { data, error } =
        await supabase
            .from("messages")
            .select("*")
            .eq(
                "channel",
                currentChannel
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );
    if (error) {
        console.error(error);
        return;
    }
    messages.innerHTML = "";
    for (const message of data) {
        addMessage(
            message
        );
    }
    messages.scrollTop = messages.scrollHeight;
}

function getGifEmbedUrl(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        return null;
    }

    try {
        const url = new URL(trimmed);
        const hostname = url.hostname.toLowerCase();

        if (
            url.pathname.toLowerCase().endsWith(".gif") ||
            url.pathname.toLowerCase().includes(".gif/")
        ) {
            return trimmed;
        }

        if (
            hostname === "giphy.com" ||
            hostname.endsWith(".giphy.com")
        ) {
            return trimmed;
        }

        if (
            hostname === "tenor.com" ||
            hostname.endsWith(".tenor.com")
        ) {
            return trimmed;
        }

        if (
            hostname === "cdn.discordapp.com" ||
            hostname === "media.discordapp.net"
        ) {
            if (
                url.pathname.toLowerCase().includes(".gif")
            ) {
                return trimmed;
            }
        }

    } catch (error) {
        return null;
    }

    return null;
}

function createGifHTML(url) {
    return `
        <div class="messageGif">
            <img
                src="${escapeHTML(url)}"
                alt="GIF"
                loading="lazy"
            >
        </div>
    `;
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
    let textHTML = "";
    let gifHTML = "";
    const gifUrl = getGifEmbedUrl(message.content);
    if (gifUrl) {
        gifHTML = createGifHTML(gifUrl);
    } else {
        textHTML = `
            <div class="text">
                ${escapeHTML(message.content || "")}
            </div>
        `;
    }
    let fileHTML = "";
    if (message.file_url) {
        const fileType = message.file_type || "";
        if (fileType.startsWith("image/")) {
            fileHTML = `
                <div class="messageFile">
                    <img
                        src="${escapeHTML(message.file_url)}"
                        alt="${escapeHTML(
                            message.file_name || "Uploaded image"
                        )}"
                        loading="lazy"
                    >
                </div>
            `;
        } else if (fileType.startsWith("video/")) {

            fileHTML = `
                <div class="messageFile">
                    <div class="customMediaPlayer customVideoPlayer">
                        <video
                            class="mediaElement"
                            src="${message.file_url}"
                            preload="metadata"
                            playsinline
                        ></video>

                        <div class="mediaControls">

                            <button
                                class="mediaPlayButton"
                                type="button"
                                aria-label="Play"
                            >
                                ▶
                            </button>

                            <span class="mediaTime">
                                0:00 / 0:00
                            </span>

                            <input
                                class="mediaProgress"
                                type="range"
                                min="0"
                                max="100"
                                value="0"
                                step="0.1"
                                aria-label="Video progress"
                            >

                            <button
                                class="mediaMuteButton"
                                type="button"
                                aria-label="Mute"
                            >
                                🔊
                            </button>

                            <input
                                class="mediaVolume"
                                type="range"
                                min="0"
                                max="1"
                                value="1"
                                step="0.01"
                                aria-label="Volume"
                            >

                            <button
                                class="mediaFullscreenButton"
                                type="button"
                                aria-label="Fullscreen"
                            >
                                ⛶
                            </button>

                        </div>
                    </div>
                </div>
            `;

        } else if (fileType.startsWith("audio/")) {

            fileHTML = `
                <div class="messageFile">
                    <div class="customMediaPlayer customAudioPlayer">

                        <div class="audioPlayerIcon">
                            ♪
                        </div>

                        <div class="audioPlayerMain">

                            <div class="audioFileName">
                                ${escapeHTML(
                                    message.file_name || "Audio"
                                )}
                            </div>

                            <div class="audioControls">

                                <button
                                    class="mediaPlayButton"
                                    type="button"
                                    aria-label="Play"
                                >
                                    ▶
                                </button>

                                <span class="mediaTime">
                                    0:00 / 0:00
                                </span>

                                <input
                                    class="mediaProgress"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value="0"
                                    step="0.1"
                                    aria-label="Audio progress"
                                >

                                <button
                                    class="mediaMuteButton"
                                    type="button"
                                    aria-label="Mute"
                                >
                                    🔊
                                </button>

                                <input
                                    class="mediaVolume"
                                    type="range"
                                    min="0"
                                    max="1"
                                    value="1"
                                    step="0.01"
                                    aria-label="Volume"
                                >

                            </div>

                        </div>

                        <audio
                            class="mediaElement"
                            src="${message.file_url}"
                            preload="metadata"
                        ></audio>

                    </div>
                </div>
            `;

        } else {

            fileHTML = `
                <div class="messageFile">

                    <a
                        class="fileAttachment"
                        href="${escapeHTML(message.file_url)}"
                        target="_blank"
                        rel="noopener"
                        download
                    >
                        📎 ${escapeHTML(
                            message.file_name || "Download file"
                        )}
                    </a>
                </div>
            `;
        }
    }
    div.innerHTML = `
        <div class="messageRow">

            <div class="messageMenu">
                  ⋮
            </div>
            <img
                class="avatar"
                src="${escapeHTML(profile.avatar_url)}?v=${Date.now()}"
                alt="${escapeHTML(profile.username)}"
            >
            <div class="messageContent">
                <div class="username">
                    ${escapeHTML(profile.username)}
                </div>
                ${textHTML}
                ${gifHTML}
                ${fileHTML}
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
        dropdown.style.left =
            `${rect.left + window.scrollX}px`;
        dropdown.style.top =
            `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.display = "flex";
    };
    let longPressTimer = null;
    let longPressTriggered = false;
    div.addEventListener(
        "touchstart",
        (event) => {
            longPressTriggered = false;
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                event.preventDefault();
                closeAllMenus();
                openMobileMessageMenu(
                    message,
                    div
                );
            }, 600);
        },
        { passive: false }
    );
    div.addEventListener(
        "touchend",
        () => {
            clearTimeout(longPressTimer);
        }
    );
    div.addEventListener(
        "touchmove",
        () => {
            clearTimeout(longPressTimer);
        }
    );
    div.addEventListener(
        "touchcancel",
        () => {

            clearTimeout(longPressTimer);
        }
    );
    messages.appendChild(div);
    initializeMediaPlayers(div);
}
send.onclick = sendMessage;
input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        sendMessage();
    }

});

function initializeMediaPlayers(container) {
    const players =
        container.querySelectorAll(".customMediaPlayer");
    players.forEach(player => {
        const media =
            player.querySelector(".mediaElement");
        const playButton =
            player.querySelector(".mediaPlayButton");
        const progress =
            player.querySelector(".mediaProgress");
        const volume =
            player.querySelector(".mediaVolume");
        const muteButton =
            player.querySelector(".mediaMuteButton");
        const fullscreenButton =
            player.querySelector(".mediaFullscreenButton");
        const timeDisplay =
            player.querySelector(".mediaTime");
        if (!media || !playButton) return;
        
        function formatTime(seconds) {
            if (!Number.isFinite(seconds)) {
                return "0:00";
            }
            const minutes =
                Math.floor(seconds / 60);
            const remainingSeconds =
                Math.floor(seconds % 60)
                    .toString()
                    .padStart(2, "0");
            return `${minutes}:${remainingSeconds}`;
        }
        function updateTime() {
            const current =
                formatTime(media.currentTime);
            const duration =
                formatTime(media.duration);
            if (timeDisplay) {
                timeDisplay.textContent =
                    `${current} / ${duration}`;
            }
            if (
                progress &&
                Number.isFinite(media.duration) &&
                media.duration > 0
            ) {
                const percentage =
                    (media.currentTime / media.duration) * 100;
                progress.value = percentage;
                progress.style.setProperty(
                    "--progress",
                    `${percentage}%`
                );
            }
        }
        function updatePlayButton() {
            if (media.paused) {
                playButton.textContent = "▶";
                playButton.setAttribute(
                    "aria-label",
                    "Play"
                );

                player.classList.remove(
                    "mediaPlaying"
                );

            } else {
                playButton.textContent = "Ⅱ";
                playButton.setAttribute(
                    "aria-label",
                    "Pause"
                );

                player.classList.add(
                    "mediaPlaying"
                );
            }
        }
        playButton.addEventListener(
            "click",
            async event => {
                event.stopPropagation();
                if (media.paused) {
                    try {
                        await media.play();
                    } catch (error) {
                        console.error(
                            "Media playback error:",
                            error
                        );
                    }

                } else {

                    media.pause();

                }

            }
        );
        media.addEventListener(
            "play",
            updatePlayButton
        );
        media.addEventListener(
            "pause",
            updatePlayButton
        );
        media.addEventListener(
            "ended",
            () => {
                updatePlayButton();
                if (progress) {
                    progress.value = 0;
                    progress.style.setProperty(
                        "--progress",
                        "0%"
                    );
                }
            }
        );
        media.addEventListener(
            "timeupdate",
            updateTime
        );
        media.addEventListener(
            "loadedmetadata",
            updateTime
        );
        if (progress) {
            progress.addEventListener(
                "input",
                event => {
                    if (
                        !Number.isFinite(
                            media.duration
                        )
                    ) return;
                    const percentage =
                        Number(event.target.value);
                    media.currentTime =
                        (percentage / 100) *
                        media.duration;
                }
            );

        }
        if (volume) {
            volume.addEventListener(
                "input",
                event => {
                    media.volume =
                        Number(event.target.value);
                    volume.style.setProperty(
                        "--volume",
                        `${media.volume * 100}%`
                    );
                    media.muted =
                        media.volume === 0;
                    updateMuteButton();
                }
            );
        }

        if (volume) {
        
            volume.value = media.volume;
        
            volume.style.setProperty(
                "--volume",
                `${media.volume * 100}%`
            );
        
        }
        function updateMuteButton() {
            if (!muteButton) return;
            if (
                media.muted ||
                media.volume === 0
            ) {
                muteButton.textContent = "🔇";
            } else if (media.volume < 0.5) {
                muteButton.textContent = "🔉";
            } else {
                muteButton.textContent = "🔊";
            }
        }
        if (muteButton) {
            muteButton.addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                    media.muted =
                        !media.muted;
                    if (
                        !media.muted &&
                        media.volume === 0
                    ) {
                        media.volume = 1;

                        if (volume) {
                            volume.value = 1;
                        }
                    }
                    updateMuteButton();
                }
            );
        }
        if (fullscreenButton) {
            fullscreenButton.addEventListener(
                "click",
                async event => {
                    event.stopPropagation();
                    try {
                        if (document.fullscreenElement) {
                            await document.exitFullscreen();
                            return;
                        }
                        if (
                            media.tagName === "VIDEO" &&
                            typeof media.webkitEnterFullscreen === "function"
                        ) {
                            media.webkitEnterFullscreen();
                            return;
                        }
                        if (player.requestFullscreen) {
                            await player.requestFullscreen();
                        } else if (player.webkitRequestFullscreen) {
                            player.webkitRequestFullscreen();
        
                        }
        
                    } catch (error) {
                        console.error(
                            "Fullscreen error:",
                            error
                        );
        
                    }
        
                }
            );
        
        }
        media.addEventListener(
            "click",
            () => {
                if (media.paused) {
                    media.play().catch(() => {});
                } else {
                    media.pause();
                }

            }
        );

        updatePlayButton();
        updateMuteButton();
        updateTime();

    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text === "") return;
    const tempId =
        `local-${crypto.randomUUID()}`;
    const localMessage =
        createLocalMessage(text, tempId);
    messages.appendChild(localMessage);
    messages.scrollTop =
        messages.scrollHeight;
    input.value = "";
    try {
        const { error } =
            await supabase
                .from("messages")
                .insert({
                    user_id:
                        session.user.id,
                    username:
                        session.user.user_metadata.username ??
                        session.user.email,
                    content:
                        text,
                    channel:
                        currentChannel
                });
        if (error) {
            throw error;
        }
        localMessage.remove();
    } catch (error) {
        console.error(
            "Message sending error:",
            error
        );
        const status =
            localMessage.querySelector(
                ".localMessageStatus"
            );
        if (status) {
            status.textContent =
                "Failed to send";
            status.classList.add(
                "messageFailed"
            );
        }
    }
}

function createLocalMessage(text, tempId) {
    const profile =
        profiles[session.user.id] || {
            username:
                session.user.user_metadata.username ??
                session.user.email,
            avatar_url:
                "/Ruckuz/assets/avatars/ruckuz.png"
        };
    const div =
        document.createElement("div");
    div.className =
        "message localMessage";
    div.dataset.localId =
        tempId;
    div.innerHTML = `
        <div class="messageRow">
            <div class="messageMenu">
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
                    ${escapeHTML(text)}
                </div>
                <div class="localMessageStatus">
                    <span class="messageSpinner"></span>
                    Sending...
                </div>
            </div>
        </div>
    `;
    return div;
}

function escapeHTML(text) {
    const div =
        document.createElement("div");
    div.textContent =
        text;
    return div.innerHTML;
}

async function uploadChatFile() {
    const file = fileUpload.files[0];
    if (!file) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert("That file is too large. Maximum size is 50 MB.");
        fileUpload.value = "";
        return;
    }
    const previewId =
        `upload-${crypto.randomUUID()}`;
    const preview =
        createUploadingPreview(file, previewId);
    messages.appendChild(preview);
    messages.scrollTop =
        messages.scrollHeight;
    try {
        const extension =
            file.name.includes(".")
                ? file.name.split(".").pop()
                : "file";
        const fileName =
            `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        const {
            error: uploadError
        } = await supabase
            .storage
            .from("chat-files")
            .upload(
                fileName,
                file,
                {
                    contentType:
                        file.type || "application/octet-stream",
                    cacheControl: "3600",
                    upsert: false
                }
            );
        if (uploadError) {
            throw uploadError;
        }
        const {
            data: publicUrlData
        } = supabase
            .storage
            .from("chat-files")
            .getPublicUrl(fileName);
        const fileUrl =
            publicUrlData.publicUrl;
        const {
            error: messageError
        } = await supabase
            .from("messages")
            .insert({
                user_id:
                    session.user.id,
                username:
                    session.user.user_metadata.username ??
                    session.user.email,
                content: "",
                file_url:
                    fileUrl,
                file_type:
                    file.type || "application/octet-stream",
                file_name:
                    file.name,
                channel:
                    currentChannel
            });
        if (messageError) {
            throw messageError;
        }
        preview.remove();
    } catch (error) {
        console.error(
            "File upload failed:",
            error
        );
        preview.remove();
        alert(
            "The file couldn't be uploaded. Please try again."
        );
    }
    fileUpload.value = "";
}

function createUploadingPreview(file, previewId) {
    const div =
        document.createElement("div");
    div.className = "message";
    div.dataset.uploadId =
        previewId;
    div.innerHTML = `
        <div class="messageRow">
            <div class="messageMenu">
            </div>
            <img
                class="avatar"
                src="${
                    profiles[session.user.id]?.avatar_url ||
                    "/Ruckuz/assets/avatars/ruckuz.png"
                }"
                alt="You"
            >
            <div class="messageContent">
                <div class="username">
                    ${
                        profiles[session.user.id]?.username ||
                        session.user.email
                    }
                </div>
                <div class="uploadingFile">
                    <div class="uploadPreview"></div>
                    <div class="uploadingOverlay">
                        <div class="uploadSpinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const previewContainer =
        div.querySelector(".uploadPreview");
    if (file.type.startsWith("image/")) {
        const img =
            document.createElement("img");
        img.src =
            URL.createObjectURL(file);
        img.alt =
            file.name;
        previewContainer.appendChild(img);
    } else if (file.type.startsWith("video/")) {
        const video =
            document.createElement("video");
        video.src =
            URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;
        previewContainer.appendChild(video);
    } else {
        const fileBox =
            document.createElement("div");
        fileBox.style.padding =
            "25px";
        fileBox.style.color =
            "white";
        fileBox.style.fontWeight =
            "bold";
        fileBox.textContent =
            `📎 ${file.name}`;

        previewContainer.appendChild(fileBox);
    }
    return div;
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

function openMobileMessageMenu(message, messageElement) {
    closeAllMenus();
    const menu =
        createDropdown(message);
    menu.classList.add(
        "mobileMessageDropdown"
    );
    document.body.appendChild(menu);
    const rect =
        messageElement.getBoundingClientRect();
    let left =
        rect.left + window.scrollX;
    let top =
        rect.bottom + window.scrollY + 8;
    const menuWidth =
        190;
    const menuHeight =
        100;
    if (
        left + menuWidth >
        window.innerWidth
    ) {
        left =
            window.innerWidth -
            menuWidth -
            12;
    }
    if (
        top + menuHeight >
        window.innerHeight +
        window.scrollY
    ) {
        top =
            rect.top +
            window.scrollY -
            menuHeight -
            8;
    }
    if (left < 10) {
        left = 10;
    }
    if (top < 10) {
        top = 10;
    }
    menu.style.left =
        `${left}px`;
    menu.style.top =
        `${top}px`;
    menu.style.display =
        "flex";
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
await loadMemberProfiles();
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
        if (
            payload.new.channel !==
            currentChannel
        ) {
            return;
        }
        addMessage(
            payload.new
        );
        messages.scrollTop =
            messages.scrollHeight;
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

const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("ruckuz-theme") === "dark") {
    document.body.classList.add("darkMode");
    themeToggle.textContent = "Light Mode";
}

themeToggle.onclick = () => {

    document.body.classList.toggle("darkMode");

    const darkMode =
        document.body.classList.contains("darkMode");

    if (darkMode) {

        themeToggle.textContent = "Light Mode";

        localStorage.setItem(
            "ruckuz-theme",
            "dark"
        );

    } else {

        themeToggle.textContent = "Dark Mode";

        localStorage.setItem(
            "ruckuz-theme",
            "light"
        );

    }

};

const logoutButton =
    document.getElementById("logoutButton");

logoutButton.onclick = async () => {

    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    const { error } = await supabase.auth.signOut();

    if (error) {

        console.error(error);

        logoutButton.disabled = false;
        logoutButton.textContent = "Logout";

        alert("Couldn't log out. Please try again.");

        return;
    }

    location.href = "../";
};

const friendRequestsButton =
    document.getElementById("friendRequestsButton");
const friendRequestsPanel =
    document.getElementById("friendRequestsPanel");
const closeFriendRequests =
    document.getElementById("closeFriendRequests");
const friendRequestsList =
    document.getElementById("friendRequestsList");
const friendRequestCount =
    document.getElementById("friendRequestCount");


friendRequestsButton.onclick = async () => {
    const isOpen =
        friendRequestsPanel.style.display === "flex";
    if (isOpen) {
        friendRequestsPanel.style.display = "none";

    } else {

        friendRequestsPanel.style.display = "flex";
        await loadFriendRequests();

    }

};


closeFriendRequests.onclick = () => {
    friendRequestsPanel.style.display = "none";

};


async function loadFriendRequests() {

    const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error("Friend request loading error:", error);

        friendRequestsList.innerHTML = `
            <p class="noRequests">
                Couldn't load requests. 
            </p>
        `;

        return;
    }

    friendRequestsList.innerHTML = "";
    friendRequestCount.textContent =
        data.length;
    if (data.length === 0) {
        friendRequestsList.innerHTML = `
            <p class="noRequests">
                No friend requests yet!
            </p>
        `;

        return;
    }

    for (const request of data) {

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", request.sender_id)
            .single();

        if (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );

            continue;
        }

        createFriendRequestElement({
            ...request,
            profiles: profile
        });

    }

}

function createFriendRequestElement(request) {
    const profile = request.profiles;
    const div =
        document.createElement("div");
    div.className = "friendRequest";
    div.dataset.requestId =
        request.id;
    const avatar =
        profile?.avatar_url ||
        "/Ruckuz/assets/avatars/ruckuz.png";
    div.innerHTML = `
        <img
            class="friendRequestAvatar"
            src="${avatar}?v=${Date.now()}"
            alt="Avatar"
        >

        <div class="friendRequestInfo">
            <div class="friendRequestName">
                ${profile?.username || "Unknown User"}
            </div>
            <div class="friendRequestButtons">
                <button class="acceptRequest">
                    Accept
                </button>
                <button class="declineRequest">
                    Decline
                </button>
            </div>
        </div>
    `;

    div
        .querySelector(".acceptRequest")
        .onclick = () => {
            respondToFriendRequest(
                request.id,
                "accepted",
                div
            );

        };


    div
        .querySelector(".declineRequest")
        .onclick = () => {
            respondToFriendRequest(
                request.id,
                "declined",
                div
            );

        };


    friendRequestsList.appendChild(div);

}

async function respondToFriendRequest(
    requestId,
    newStatus,
    element
) {

    const buttons =
        element.querySelectorAll("button");

    buttons.forEach(button => {
        button.disabled = true;
    });

    const {
        data: request,
        error: requestError
    } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .eq("id", requestId)
        .single();


    if (requestError) {

        console.error(requestError);

        buttons.forEach(button => {
            button.disabled = false;
        });

        return;
    }

    if (newStatus === "accepted") {

        const { error: friendError } =
            await supabase
                .from("friends")
                .insert({
                    user_id: request.sender_id,
                    friend_id: request.receiver_id
                });


        if (friendError) {

            console.error(
                "Friend creation error:",
                friendError
            );

            buttons.forEach(button => {
                button.disabled = false;
            });

            return;
        }

    }

    const { error } =
        await supabase
            .from("friend_requests")
            .update({
                status: newStatus
            })
            .eq("id", requestId);


    if (error) {

        console.error(
            "Request update error:",
            error
        );

        buttons.forEach(button => {
            button.disabled = false;
        });

        return;
    }

    element.remove();

    await loadFriends();

    const remaining =
        document.querySelectorAll(
            ".friendRequest"
        ).length;


    friendRequestCount.textContent =
        remaining;


    if (remaining === 0) {

        friendRequestsList.innerHTML = `
            <p class="noRequests">
                No friend requests yet!
            </p>
        `;

    }

}

const mobileMenuButton =
    document.getElementById("mobileMenuButton");
const mobileMenu =
    document.getElementById("mobileMenu");
const mobileRequestsButton =
    document.getElementById("mobileRequestsButton");
const mobileFriendsButton =
    document.getElementById("mobileFriendsButton");
const mobileLogoutButton =
    document.getElementById("mobileLogoutButton");
const mobileThemeButton =
    document.getElementById("mobileThemeButton");
const mobileRequestCount =
    document.getElementById("mobileRequestCount");
const mobileFriendsCount =
    document.getElementById("mobileFriendsCount");

async function refreshFriendRequestCount() {
    const { count, error } =
        await supabase
            .from("friend_requests")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("receiver_id", session.user.id)
            .eq("status", "pending");
    if (error) {
        console.error(error);
        return;
    }

    friendRequestCount.textContent =
        count ?? 0;
    
    mobileRequestCount.textContent =
        count ?? 0;
}

await refreshFriendRequestCount();
supabase
    .channel("friend-requests")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "friend_requests",
            filter:
                `receiver_id=eq.${session.user.id}`
        },
        async () => {
            await refreshFriendRequestCount();
            if (
                friendRequestsPanel.style.display === "flex"
            ) {

                await loadFriendRequests();
            }
        }
    )

    .subscribe();

const friendsButton =
    document.getElementById("friendsButton");
const friendsPanel =
    document.getElementById("friendsPanel");
const closeFriends =
    document.getElementById("closeFriends");
const friendsList =
    document.getElementById("friendsList");
const friendsCount =
    document.getElementById("friendsCount");

friendsButton.onclick = async () => {
    const isOpen =
        friendsPanel.style.display === "flex";
    if (isOpen) {
        friendsPanel.style.display = "none";
    } else {
        friendsPanel.style.display = "flex";
        await loadFriends();
    }
};
closeFriends.onclick = () => {
    friendsPanel.style.display = "none";
};

async function loadFriends() {
    const { data, error } = await supabase
        .from("friends")
        .select("*")
        .or(
            `user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`
        );

    if (error) {

        console.error(
            "Friends loading error:",
            error
        );

        friendsList.innerHTML = `
            <p class="noFriends">
                Couldn't load your friends.
            </p>
        `;

        return;
    }


    friendsList.innerHTML = "";


    if (!data || data.length === 0) {

        friendsCount.textContent = "0";
        mobileFriendsCount.textContent = "0";

        friendsList.innerHTML = `
            <p class="noFriends">
                You don't have any friends yet!
            </p>
        `;

        return;
    }


    const friendIds = data.map(friend => {

        if (friend.user_id === session.user.id) {

            return friend.friend_id;

        }

        return friend.user_id;

    });


    const uniqueFriendIds =
        [...new Set(friendIds)];


    friendsCount.textContent =
        uniqueFriendIds.length;
    
    mobileFriendsCount.textContent =
        uniqueFriendIds.length;


    const {
        data: profilesData,
        error: profilesError
    } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", uniqueFriendIds);


    if (profilesError) {

        console.error(
            "Friend profiles loading error:",
            profilesError
        );

        friendsList.innerHTML = `
            <p class="noFriends">
                Couldn't load friend profiles.
            </p>
        `;

        return;
    }


    const profileMap = {};

    for (const profile of profilesData) {

        profileMap[profile.id] =
            profile;

    }


    for (const friendId of uniqueFriendIds) {

        const profile =
            profileMap[friendId];

        if (!profile) continue;


        createFriendElement(profile);

    }

}


function createFriendElement(profile) {

    const div =
        document.createElement("div");

    div.className = "friendItem";


    const avatar =
        profile.avatar_url ||
        "/Ruckuz/assets/avatars/ruckuz.png";


    div.innerHTML = `
        <img
            class="friendItemAvatar"
            src="${avatar}?v=${Date.now()}"
            alt="${profile.username}"
        >

        <div class="friendItemName">
            ${profile.username}
        </div>
    `;


    div.onclick = () => {

        openProfile(profile.id);

    };


    friendsList.appendChild(div);

}

await loadFriends();
mobileMenuButton.onclick = (event) => {
    event.stopPropagation();
    mobileMenu.classList.toggle("open");

};


mobileRequestsButton.onclick = async () => {
    mobileMenu.classList.remove("open");
    const isOpen =
        friendRequestsPanel.style.display === "flex";
    if (isOpen) {
        friendRequestsPanel.style.display = "none";
    } else {
        friendRequestsPanel.style.display = "flex";
        await loadFriendRequests();

    }

};
mobileFriendsButton.onclick = async () => {
    mobileMenu.classList.remove("open");
    const isOpen =
        friendsPanel.style.display === "flex";
    if (isOpen) {
        friendsPanel.style.display = "none";
    } else {
        friendsPanel.style.display = "flex";
        await loadFriends();
    }
};
mobileLogoutButton.onclick = async () => {
    mobileLogoutButton.disabled = true;
    mobileLogoutButton.textContent =
        "Logging out...";
    const { error } =
        await supabase.auth.signOut();
    if (error) {
        console.error(error);
        mobileLogoutButton.disabled = false;
        mobileLogoutButton.textContent =
            "Logout";
        alert(
            "Couldn't log out. Please try again."
        );
        return;
    }
    location.href = "../";
};
mobileThemeButton.onclick = () => {
    document.body.classList.toggle("darkMode");
    const darkMode =
        document.body.classList.contains("darkMode");
    if (darkMode) {
        mobileThemeButton.textContent =
            "Light Mode";
        localStorage.setItem(
            "ruckuz-theme",
            "dark"
        );

    } else {

        mobileThemeButton.textContent =
            "Dark Mode";
        localStorage.setItem(
            "ruckuz-theme",
            "light"
        );

    }

};
