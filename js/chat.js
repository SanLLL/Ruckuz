import {
    supabase,
    getPersistentSession,
    clearPersistentLogin
} from "./supabase.js";

import {
    getCookie,
    setCookie
} from "./cookies.js";

import {
    createProfilePopup,
    openProfile,
    setCurrentUser,
    setOnlineUsers
} from "./profilePopup.js";

import {
    renderEmojiHTML,
    wireEmojiFallbacks,
    buildEmojiPicker,
    getComposerText,
    clearComposer,
    insertEmojiAtCaret,
    upgradeTypedCustomEmojis,
    isEmojiOnlyText
} from "./emojis.js";

const bootTheme =
    getCookie(
        "ruckuz-theme"
    ) ||
    localStorage.getItem(
        "ruckuz-theme"
    ) ||
    "light";
document.body.classList.toggle(
    "darkMode",
    bootTheme === "dark"
);
document.documentElement.dataset.ruckuzTheme = bootTheme;
const appLoadingScreen = document.getElementById("appLoadingScreen");
const appLoadingText = document.getElementById("appLoadingText");
function setAppLoadingText(
    text
) {
    if (
        appLoadingText
    ) {
        appLoadingText.textContent =
            text;
    }
}

function finishAppLoading() {
    if (
        !appLoadingScreen
    ) {
        return;
    }
    appLoadingScreen.classList.add(
        "leaving"
    );
    setTimeout(
        () => {

            appLoadingScreen.remove();
        },
        230
    );
}

setAppLoadingText(
    "Checking account..."
);

const session = await getPersistentSession();
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
    refreshSelfUserPanel();
}

const messages =
    document.getElementById(
        "messages"
    );

const input =
    document.getElementById(
        "messageInput"
    );

clearComposer(
    input
);

const emojiButton =
    document.getElementById(
        "emojiButton"
    );

const emojiPicker =
    document.getElementById(
        "emojiPicker"
    );

const emojiGrid =
    document.getElementById(
        "emojiGrid"
    );

const memberList =
    document.getElementById(
        "memberList"
    );

const mobileMemberList =
    document.getElementById(
        "mobileMemberList"
    );

let memberProfiles = {};
let currentOnlineUsers =
    new Set();

const avatarUpload =
    document.getElementById(
        "avatarUpload"
    );

avatarUpload.onchange =
    uploadAvatar;

const fileButton =
    document.getElementById(
        "fileButton"
    );
const fileUpload =
    document.getElementById(
        "fileUpload"
    );

const sendButton =
    document.getElementById(
        "sendButton"
    );

function updateSendButtonVisibility() {
    const text =
        getComposerText(
            input
        ).trim();

    const shouldShow =
        text.length > 0;
    sendButton.classList.toggle(
        "visible",
        shouldShow
    );
    sendButton.disabled =
        !shouldShow;
    sendButton.setAttribute(
        "aria-hidden",
        shouldShow
            ? "false"
            : "true"
    );
}
updateSendButtonVisibility();
fileButton.onclick = () => {
    fileUpload.click();
};

fileUpload.onchange =
    uploadChatFile;

function isDarkMode() {
    return document.body.classList.contains(
        "darkMode"
    );
}

function themedButtonPath(
    name
) {
    return isDarkMode()
        ? `../assets/buttons/dark/${name}dark.png`
        : `../assets/buttons/light/${name}light.png`;
}

function volumeIconPath(
    volume,
    muted
) {
    if (
        muted ||
        volume === 0
    ) {
        return isDarkMode()
            ? "../assets/icons/volumedarkmute.png"
            : "../assets/icons/volumelightmute.png";
    }
    if (
        isDarkMode()
    ) {
        if (
            volume <= 0.33
        ) {
            return "../assets/icons/volumedark3.png";
        }
        if (
            volume <= 0.66
        ) {
            return "../assets/icons/volumedark2.png";

        }
        return "../assets/icons/volumedark1.png";

    }
    if (
        volume <= 0.33
    ) {
        return "../assets/icons/volumelight3.png";

    }
    if (
        volume <= 0.66
    ) {
        return "../assets/icons/volumelight2.png";
    }
    return "../assets/icons/volumelight1.png";
}

function syncStaticThemeArt(
    root = document
) {

    root
        .querySelectorAll(
            "[data-light-src][data-dark-src]"
        )
        .forEach(
            image => {

                image.src =
                    isDarkMode()
                        ? image.dataset.darkSrc
                        : image.dataset.lightSrc;
            }
        );
}

function syncMediaThemeArt(
    root = document
) {

    root
        .querySelectorAll(
            ".customMediaPlayer"
        )
        .forEach(
            player => {

                const media =
                    player.querySelector(
                        ".mediaElement"
                    );

                const playIcon =
                    player.querySelector(
                        ".mediaPlayIcon"
                    );

                const volumeIcon =
                    player.querySelector(
                        ".mediaVolumeIcon"
                    );

                if (
                    media &&
                    playIcon
                ) {

                    playIcon.src =
                        media.paused
                            ? themedButtonPath(
                                "play"
                            )
                            : themedButtonPath(
                                "pause"
                            );
                }

                if (
                    media &&
                    volumeIcon
                ) {

                    volumeIcon.src =
                        volumeIconPath(
                            media.volume,
                            media.muted
                        );
                }
            }
        );
}

function syncThemeArt(
    root = document
) {

    syncStaticThemeArt(
        root
    );

    syncMediaThemeArt(
        root
    );

    if (
        typeof themeToggle !==
        "undefined" &&
        themeToggle
    ) {
        themeToggle.setAttribute(
            "aria-label",
            isDarkMode()
                ? "Switch to light mode"
                : "Switch to dark mode"
        );
    }
}

if (
    sendButton
) {

    sendButton.onclick =
        sendMessage;
}

let profiles = {};
function closeEmojiPicker() {
    emojiPicker.classList.remove(
        "open"
    );
    emojiPicker.setAttribute(
        "aria-hidden",
        "true"
    );
    emojiButton.setAttribute(
        "aria-expanded",
        "false"
    );
}

buildEmojiPicker(
    emojiGrid,
    emoji => {
        insertEmojiAtCaret(
            input,
            emoji
        );
        updateSendButtonVisibility();
    }
);

emojiButton.onclick =
    event => {
        event.stopPropagation();
        const opening =
            !emojiPicker.classList.contains(
                "open"
            );
        if (opening) {
            emojiPicker.classList.add(
                "open"
            );
            emojiPicker.setAttribute(
                "aria-hidden",
                "false"
            );
            emojiButton.setAttribute(
                "aria-expanded",
                "true"
            );
        } else {
            closeEmojiPicker();
        }
    };

emojiPicker.onclick =
    event => {
        event.stopPropagation();
    };
document.addEventListener(
    "click",
    event => {
        if (
            !emojiPicker.contains(
                event.target
            ) &&
            event.target !==
                emojiButton
        ) {
            closeEmojiPicker();
        }
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape" &&
            emojiPicker.classList.contains(
                "open"
            )
        ) {
            closeEmojiPicker();
        }
    }
);

input.addEventListener(
    "input",
    () => {
        upgradeTypedCustomEmojis(
            input
        );
        updateSendButtonVisibility();

    }
);

const settingsButton = document.getElementById("settingsButton");
const mobileSettingsButton = document.getElementById("mobileSettingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings = document.getElementById("closeSettings");
const selfUserAvatar = document.getElementById("selfUserAvatar");
const selfUsername = document.getElementById("selfUsername");
const selfPresence = document.getElementById("selfPresence");
const selfCustomStatus = document.getElementById("selfCustomStatus");
const selfOnlineDot = document.getElementById("selfOnlineDot");
const settingsAvatar = document.getElementById("settingsAvatar");
const settingsUsername = document.getElementById("settingsUsername");
const settingsChangeAvatar = document.getElementById("settingsChangeAvatar");
const usernameInput = document.getElementById("usernameInput");
const usernameCharacterCount = document.getElementById("usernameCharacterCount");
const saveUsername = document.getElementById("saveUsername");
const saveUsernameLabel = saveUsername.querySelector(".drawnButtonContent");
const usernameSaveMessage = document.getElementById("usernameSaveMessage");
const settingsRuckuzId = document.getElementById("settingsRuckuzId");
const copyRuckuzId = document.getElementById("copyRuckuzId");
const customStatusInput = document.getElementById("customStatusInput");
const statusCharacterCount = document.getElementById("statusCharacterCount");
const saveCustomStatus = document.getElementById("saveCustomStatus");
const saveCustomStatusLabel = saveCustomStatus.querySelector(".drawnButtonContent");
const statusSaveMessage = document.getElementById("statusSaveMessage");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const deleteAccountStatus = document.getElementById("deleteAccountStatus");
function getMyProfile() {
    return (
        profiles[session.user.id] ||
        null
    );
}
function refreshSelfUserPanel() {
    const profile =
        getMyProfile();
    if (!profile) {
        return;
    }
    selfUserAvatar.src =
        profile.avatar_url ||
        "/Ruckuz/assets/avatars/ruckuz.png";
    selfUsername.textContent =
        profile.username ||
        session.user.email;
    const online =
        currentOnlineUsers.has(
            session.user.id
        );
    selfPresence.textContent =
        online
            ? "Online"
            : "Connecting...";
    selfOnlineDot.classList.toggle(
        "online",
        online
    );
    const customStatus =
        (profile.status_text || "")
            .trim();
    selfCustomStatus.textContent =
        customStatus ||
        "Set status";
}

function refreshSettingsProfile() {
    const profile =
        getMyProfile();
    if (!profile) {
        return;
    }
    settingsAvatar.src =
        profile.avatar_url ||
        "/Ruckuz/assets/avatars/ruckuz.png";
    settingsUsername.textContent =
        profile.username ||
        session.user.email;
    settingsRuckuzId.textContent =
        profile.ruckuz_id ||
        "ID unavailable";
    usernameInput.value =
        profile.username ||
        "";
    usernameCharacterCount.textContent =
        `${usernameInput.value.length} / 32`;
    customStatusInput.value =
        profile.status_text ||
        "";
    statusCharacterCount.textContent =
        `${customStatusInput.value.length} / 80`;

}

function openSettings() {
    refreshSettingsProfile();
    statusSaveMessage.textContent =
        "";
    settingsOverlay.classList.add(
        "open"
    );
}

function closeSettingsPanel() {
    settingsOverlay.classList.remove(
        "open"
    );
}

settingsButton.onclick =
    openSettings;
settingsChangeAvatar.onclick = () => {
    avatarUpload.click();
};
mobileSettingsButton.onclick = () => {
    mobileMenu.classList.remove(
        "open"
    );
    openSettings();
};

closeSettings.onclick =
    closeSettingsPanel;
settingsOverlay.onclick =
    event => {
        if (
            event.target ===
            settingsOverlay
        ) {

            closeSettingsPanel();
        }
    };

usernameInput.addEventListener(
    "input",
    () => {
        usernameCharacterCount.textContent =
            `${usernameInput.value.length} / 32`;
    }
);
saveUsername.onclick =
    async () => {
        const newUsername =
            usernameInput
                .value
                .trim();
        usernameSaveMessage.textContent =
            "";
        if (
            newUsername.length < 2 ||
            newUsername.length > 32
        ) {

            usernameSaveMessage.textContent = "Username must be 2 to 32 characters.";
            return;

        }

        if (
            /[\r\n\t]/.test(
                newUsername
            )
        ) {

            usernameSaveMessage.textContent = "That username contains invalid characters.";
            return;
        }
        const profile =
            getMyProfile();
        if (
            profile &&
            profile.username === newUsername
        ) {
            usernameSaveMessage.textContent = "That's already your username.";
            return;
        }

        saveUsername.disabled = true;
        saveUsernameLabel.textContent = "Saving...";
        const {
            error: profileError
        } = await supabase
            .from("profiles")
            .update({
                username:
                    newUsername
            })
            .eq(
                "id",
                session.user.id
            );

        if (profileError) {
            console.error(
                "Username update error:",
                profileError
            );
            saveUsername.disabled = false;
            saveUsernameLabel.textContent = "Save Username";
            usernameSaveMessage.textContent = "Couldn't change username.";
            return;
        }

        const {
            error: authError
        } = await supabase.auth.updateUser({
            data: {
                username:
                    newUsername
            }
        });


        if (authError) {

            console.warn(
                "Auth username metadata couldn't sync:",
                authError
            );

        }

        if (
            profiles[
                session.user.id
            ]
        ) {

            profiles[
                session.user.id
            ].username =
                newUsername;
        }

        if (
            memberProfiles[
                session.user.id
            ]
        ) {

            memberProfiles[
                session.user.id
            ].username =
                newUsername;
        }

        document
            .querySelectorAll(
                `.message[data-user="${session.user.id}"] .username`
            )
            .forEach(
                element => {
                    element.textContent =
                        newUsername;
                }
            );

        refreshSelfUserPanel();
        refreshSettingsProfile();
        renderMemberList();
        saveUsername.disabled = false;
        saveUsernameLabel.textContent = "Save Username";
        
        usernameSaveMessage.textContent = "Username changed.";
    };

customStatusInput.addEventListener(
    "input",
    () => {
        statusCharacterCount.textContent =
            `${customStatusInput.value.length} / 80`;
    }
);

saveCustomStatus.onclick =
    async () => {
        const newStatus =
            customStatusInput
                .value
                .trim();
        saveCustomStatus.disabled =
            true;
        saveCustomStatusLabel.textContent = "Saving...";
        statusSaveMessage.textContent =
            "";
        const {
            error
        } =
            await supabase
                .from("profiles")
                .update({
                    status_text:
                        newStatus
                })
                .eq(
                    "id",
                    session.user.id
                );
        saveCustomStatus.disabled =
            false;
        saveCustomStatusLabel.textContent = "Save Status";
        if (error) {
            console.error(
                "Status update error:",
                error
            );
            statusSaveMessage.textContent = "Couldn't save status.";
            return;
        }
        if (
            profiles[
                session.user.id
            ]
        ) {
            profiles[
                session.user.id
            ].status_text =
                newStatus;
        }
        if (
            memberProfiles[
                session.user.id
            ]
        ) {
            memberProfiles[
                session.user.id
            ].status_text =
                newStatus;
        }
        renderMemberList();
        refreshSelfUserPanel();
        refreshSettingsProfile();
        statusSaveMessage.textContent =
            "Status saved!";
    };

copyRuckuzId.onclick =
    async () => {
        const id =
            settingsRuckuzId
                .textContent
                .trim();
        try {
            await navigator.clipboard
                .writeText(id);
            copyRuckuzId.textContent =
                "Copied!";
            setTimeout(
                () => {
                    copyRuckuzId.textContent =
                        "Copy";
                },
                1200
            );
        } catch (error) {
            console.error(
                "Copy failed:",
                error
            );
        }
    };

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
            "id, username, avatar_url, status_text, is_deleted"
        )
        .eq(
            "is_deleted",
            false
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
    if (memberList) {
        memberList.innerHTML = "";
    }
    if (mobileMemberList) {
        mobileMemberList.innerHTML = "";
    }
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
        ) return -1;
        if (
            !aOnline &&
            bOnline
        ) return 1;
        return a.username.localeCompare(
            b.username
        );
    });
    for (const profile of profiles) {
        if (memberList) {
            memberList.appendChild(
                createMemberElement(
                    profile
                )
            );
        }
        if (mobileMemberList) {
            mobileMemberList.appendChild(
                createMemberElement(
                    profile
                )
            );
        }
    }
}

function createMemberElement(
    profile,
    mobile = false
) {
    const div =
        document.createElement(
            "div"
        );
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
                alt="${escapeHTML(profile.username)}">
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
                ${
                    (profile.status_text || "").trim()
                        ? `
                            <div class="memberCustomStatus">
                                ${escapeHTML(
                                    profile.status_text.trim()
                                )}
                            </div>
                        `
                        : ""
                }
        </div>
    `;
    div.onclick = () => {
        openProfile(
            profile.id
        );
    };
    return div;
}

function padTimestampNumber(
    value
) {
    return String(
        value
    ).padStart(
        2,
        "0"
    );
}

function formatMessageClock(
    date
) {

    return (
        padTimestampNumber(
            date.getHours()
        ) +
        ":" +
        padTimestampNumber(
            date.getMinutes()
        )
    );

}

function formatMessageTimestamp(
    createdAt
) {
    const sentDate =
        new Date(
            createdAt
        );

    if (
        Number.isNaN(
            sentDate.getTime()
        )
    ) {
        return "";

    }

    const now =
        Date.now();

    const age =
        Math.max(
            0,
            now -
            sentDate.getTime()
        );

    const oneDay =
        24 *
        60 *
        60 *
        1000;

    const twoDays =
        48 *
        60 *
        60 *
        1000;

    if (
        age < oneDay
    ) {
        return formatMessageClock(
            sentDate
        );
    }

    if (
        age < twoDays
    ) {

        return (
            "yesterday at " +
            formatMessageClock(
                sentDate
            )
        );
    }
    return (
        padTimestampNumber(
            sentDate.getDate()
        ) +
        "." +
        padTimestampNumber(
            sentDate.getMonth() + 1
        ) +
        "." +
        sentDate.getFullYear()
    );

}

function refreshMessageTimestamps() {
    document
        .querySelectorAll(
            ".message[data-created-at]"
        )
        .forEach(
            messageElement => {
                const timestamp =
                    messageElement.querySelector(
                        ".messageTimestamp"
                    );

                if (!timestamp) {
                    return;
                }

                timestamp.textContent =
                    formatMessageTimestamp(
                        messageElement.dataset.createdAt
                    );
            }
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

function renderMessageBodyHTML(
    message
) {

    const gifUrl =
        getGifEmbedUrl(
            message.content
        );


    if (gifUrl) {

        return createGifHTML(
            gifUrl
        );

    }

    const emojiOnly =
        isEmojiOnlyText(
            message.content || ""
        );

    return `
        <div class="text${
            emojiOnly
                ? " emojiOnly"
                : ""
        }">
            ${renderEmojiHTML(
                message.content || ""
            )}
        </div>
    `;

}

function refreshRenderedMessage(
    element,
    message
) {
    if (!element) {
        return;
    }
    const defaultAvatar =
        "/Ruckuz/assets/avatars/ruckuz.png";
    const profile =
        message.author_deleted
            ? {
                username:
                    message.username,

                avatar_url:
                    defaultAvatar
            }
            : (
                profiles[
                    message.user_id
                ] || {
                    username:
                        message.username,

                    avatar_url:
                        defaultAvatar
                }
            );
    
    const username =
        element.querySelector(
            ".username"
        );
    if (username) {
        username.textContent =
            profile.username;
    }
    const avatar =
        element.querySelector(
            ".avatar"
        );
    if (avatar) {
        avatar.src =
            profile.avatar_url ||
            defaultAvatar;
        avatar.alt =
            profile.username;
    }
    const body =
        element.querySelector(
            ".messageBody"
        );

    if (body) {
        body.innerHTML =
            renderMessageBodyHTML(
                message
            );
        wireEmojiFallbacks(
            body
        );
    }

    let editedMarker =
        element.querySelector(
            ".editedMarker"
        );

    if (message.edited_at) {
        if (!editedMarker) {
            editedMarker =
                document.createElement(
                    "span"
                );
            editedMarker.className =
                "editedMarker";
            element
                .querySelector(
                    ".messageContent"
                )
                ?.appendChild(
                    editedMarker
                );
        }
        editedMarker.textContent =
            "edited";
        
    } else if (editedMarker) {
        editedMarker.remove();
    }
}

function addMessage(message) {
    const defaultAvatar =
        "/Ruckuz/assets/avatars/ruckuz.png";
    const profile =
        message.author_deleted
            ? {
                username:
                    message.username,
                avatar_url:
                    defaultAvatar
            }
            : (
                profiles[
                    message.user_id
                ] || {
                    username:
                        message.username,
                    avatar_url:
                        defaultAvatar
                }
            );
    
    const createdAt =
        message.created_at ||
        new Date().toISOString();
    
    const div = document.createElement("div");
    div.className = "message";
    div.dataset.id = message.id;
    div.dataset.user = message.user_id;
    div.dataset.createdAt = createdAt;
    const messageBodyHTML = renderMessageBodyHTML(message);
    
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
        
                    <div
                        class="customMediaPlayer customVideoPlayer">
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
                                aria-label="Play">
                                <img
                                    class="mediaButtonIcon mediaPlayIcon"
                                    src="${themedButtonPath("play")}"
                                    alt="">
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
                                aria-label="Video progress">
                            <button
                                class="mediaMuteButton"
                                type="button"
                                aria-label="Mute">
                                <img
                                    class="mediaButtonIcon mediaVolumeIcon"
                                    src="${volumeIconPath(
                                        1,
                                        false
                                    )}"
                                    alt="">
                            </button>
                            <input
                                class="mediaVolume"
                                type="range"
                                min="0"
                                max="1"
                                value="1"
                                step="0.01"
                                aria-label="Volume">
                            <button
                                class="mediaFullscreenButton"
                                type="button"
                                aria-label="Fullscreen">
                                ⛶
                            </button>
                        </div>
                    </div>
                </div>
            `;

        } else if (fileType.startsWith("audio/")) {
            fileHTML = `
                <div class="messageFile">
                    <div
                        class="customMediaPlayer customAudioPlayer">
                        <div class="audioPlayerIcon">
                            ♪
                        </div>
                        <div class="audioPlayerMain">
                            <div class="audioFileName">
                                ${escapeHTML(
                                    message.file_name ||
                                    "Audio"
                                )}
                            </div>
                            <div class="audioControls">
                                <button
                                    class="mediaPlayButton"
                                    type="button"
                                    aria-label="Play">
                                    <img
                                        class="mediaButtonIcon mediaPlayIcon"
                                        src="${themedButtonPath("play")}"
                                        alt="">
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
                                    aria-label="Audio progress">
                                <button
                                    class="mediaMuteButton"
                                    type="button"
                                    aria-label="Mute">
                                    <img
                                        class="mediaButtonIcon mediaVolumeIcon"
                                        src="${volumeIconPath(
                                            1,
                                            false
                                        )}"
                                        alt="">
                                </button>
                                <input
                                    class="mediaVolume"
                                    type="range"
                                    min="0"
                                    max="1"
                                    value="1"
                                    step="0.01"
                                    aria-label="Volume">
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
                <div class="messageHeader">
                    <div class="username">
                        ${escapeHTML(
                            profile.username
                        )}
                    </div>
                    <span class="messageTimestamp">
                        ${formatMessageTimestamp(
                            createdAt
                        )}
                    </span>
                </div>
                <div class="messageBody">
                    ${messageBodyHTML}
                </div>
                ${
                    message.edited_at
                        ? `
                            <span class="editedMarker">
                                edited
                            </span>
                        `
                        : ""
                }
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
    function clearLongPressState() {
        clearTimeout(
            longPressTimer
        );
        longPressTimer = null;
        div.classList.remove(
            "mobileHoldActive"
        );
    }
    div.addEventListener(
        "touchstart",
        (event) => {
            longPressTriggered =
                false;
            longPressTimer =
                setTimeout(
                    () => {
                        longPressTriggered =
                            true;
                        div.classList.add(
                            "mobileHoldActive"
                        );
                        event.preventDefault();
                        closeAllMenus();
                        openMobileMessageMenu(
                            message,
                            div
                        );
                    },
                    600
                );
        },
        {
            passive: false
        }
    );
    
    div.addEventListener(
        "touchend",
        () => {
            clearLongPressState();
        }
    );
    div.addEventListener(
        "touchmove",
        () => {
            clearLongPressState();
        }
    );
    div.addEventListener(
        "touchcancel",
        () => {
            clearLongPressState();
        }
    );
    
    wireEmojiFallbacks(
        div
    );
    messages.appendChild(
        div
    );
    initializeMediaPlayers(
        div
    );
}

input.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.isComposing
        ) {
            event.preventDefault();
            sendMessage();
        }
    }
);

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
            player.querySelector(
                ".mediaTime"
            );
        const playIcon =
            playButton?.querySelector(
                ".mediaPlayIcon"
            );
        const muteIcon =
            muteButton?.querySelector(
                ".mediaVolumeIcon"
            );
        if (
            !media ||
            !playButton
        ) {
            return;
        }
        
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
            if (
                media.paused
            ) {
                if (
                    playIcon
                ) {
                    playIcon.src =
                        themedButtonPath(
                            "play"
                        );
                }
                playButton.setAttribute(
                    "aria-label",
                    "Play"
                );
                player.classList.remove(
                    "mediaPlaying"
                );
        
            } else {
                if (
                    playIcon
                ) {
                    playIcon.src =
                        themedButtonPath(
                            "pause"
                        );
                }
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

        media.addEventListener(
            "volumechange",
            () => {
                if (
                    volume
                ) {
                    const shownVolume =
                        media.muted
                            ? 0
                            : media.volume;
                    volume.style.setProperty(
                        "--volume",
                        `${shownVolume * 100}%`
                    );
                }
                updateMuteButton();
            }
        );
        
        function updateMuteButton() {
            if (
                !muteButton
            ) {
                return;
            }
        
            if (
                muteIcon
            ) {
                muteIcon.src =
                    volumeIconPath(
                        media.volume,
                        media.muted
                    );
        
            }
            muteButton.setAttribute(
                "aria-label",
                (
                    media.muted ||
                    media.volume === 0
                )
                    ? "Unmute"
                    : "Mute"
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

async function waitForInitialMediaMetadata() {
    const mediaElements =
        Array.from(
            messages.querySelectorAll(
                ".customMediaPlayer .mediaElement"
            )
        );
    if (
        mediaElements.length === 0
    ) {
        return;
    }
    let finishedCount =
        0;
    setAppLoadingText(
        `Preparing media 0 / ${mediaElements.length}`
    );
    function waitForOneMedia(
        media
    ) {
        return new Promise(
            resolve => {
                if (
                    media.readyState >= 1
                ) {
                    finishedCount++;
                    setAppLoadingText(
                        `Preparing media ${finishedCount} / ${mediaElements.length}`
                    );
                    resolve();
                    return;
                }
                let finished =
                    false;
                let timeoutId =
                    null;
                function done() {
                    if (
                        finished
                    ) {
                        return;
                    }
                    finished =
                        true;
                    if (
                        timeoutId
                    ) {
                        clearTimeout(
                            timeoutId
                        );
                    }
                    media.removeEventListener(
                        "loadedmetadata",
                        done
                    );
                    media.removeEventListener(
                        "error",
                        done
                    );
                    finishedCount++;
                    setAppLoadingText(
                        `Preparing media ${finishedCount} / ${mediaElements.length}`
                    );
                    resolve();
                }
                media.addEventListener(
                    "loadedmetadata",
                    done
                );
                media.addEventListener(
                    "error",
                    done
                );
                timeoutId =
                    setTimeout(
                        done,
                        7000
                    );
                if (
                    media.readyState < 1
                ) {
                    media.load();
                }
            }
        );
    }

    await Promise.all(
        mediaElements.map(
            waitForOneMedia
        )
    );
}

async function waitForRuckuzFont() {
    if (
        !document.fonts ||
        !document.fonts.ready
    ) {
        return;
    }
    await Promise.race([
        document.fonts.ready,
        new Promise(
            resolve => {
                setTimeout(
                    resolve,
                    2500
                );
            }
        )
    ]);
}

async function sendMessage() {
    const text =
        getComposerText(
            input
        ).trim();
    if (text === "") {
        return;
    }
    const tempId =
        `local-${crypto.randomUUID()}`;
    const localMessage =
        createLocalMessage(
            text,
            tempId
        );
    messages.appendChild(
        localMessage
    );
    messages.scrollTop =
        messages.scrollHeight;
    clearComposer(
        input
    );
    updateSendButtonVisibility();
    closeEmojiPicker();
    try {
        const { error } =
            await supabase
                .from("messages")
                .insert({
                    user_id:
                        session.user.id,
                    username:
                        profiles[
                            session.user.id
                        ]?.username ??
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

    const createdAt =
        new Date().toISOString();
    const div =
        document.createElement("div");
    div.className =
        "message localMessage";
    div.dataset.localId =
        tempId;
    div.dataset.createdAt =
    createdAt;
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
                <div class="messageHeader">
                    <div class="username">
                        ${profile.username}
                    </div>
                    <span class="messageTimestamp">
                        ${formatMessageTimestamp(
                            createdAt
                        )}
                    </span>
                </div>
                <div class="text${
                    isEmojiOnlyText(text)
                        ? " emojiOnly"
                        : ""
                }">
                    ${renderEmojiHTML(text)}
                </div>
                <div class="localMessageStatus">
                    <span class="messageSpinner"></span>
                    Sending...
                </div>
            </div>
        </div>
    `;
    wireEmojiFallbacks(
        div
    );
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
                    profiles[session.user.id]?.username ??
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
    const createdAt =
    new Date().toISOString();
    const div =
        document.createElement("div");
    div.className = "message";
    div.dataset.uploadId =
        previewId;
    div.dataset.createdAt =
    createdAt;
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
                <div class="messageHeader">
                    <div class="username">
                        ${
                            profiles[
                                session.user.id
                            ]?.username ||
                            session.user.email
                        }
                    </div>
                    <span class="messageTimestamp">
                        ${formatMessageTimestamp(
                            createdAt
                        )}
                    </span>
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
    if (
        memberProfiles[
            session.user.id
        ]
    ) {
        memberProfiles[
            session.user.id
        ].avatar_url =
            avatarUrl;
    }
    renderMemberList();
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

    refreshSelfUserPanel();
    refreshSettingsProfile();
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
            const messageElement = document.querySelector(`.message[data-id="${message.id}"]`);
            if (messageElement) {
                startEditingMessage(
                    message,
                    messageElement
                );
            }
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

function startEditingMessage(
    message,
    messageElement
) {
    const body =
        messageElement.querySelector(
            ".messageBody"
        );
    if (!body) {
        return;
    }
    if (
        body.querySelector(
            ".messageEditBox"
        )
    ) {
        return;
    }
    const originalText =
        message.content || "";
    body.innerHTML = `
        <div class="messageEditBox">
            <textarea
                class="messageEditTextarea"
                maxlength="2000"
            ></textarea>
            <div class="messageEditActions">
                <button
                    type="button"
                    class="messageEditSave">
                    Save
                </button>
                <button
                    type="button"
                    class="messageEditCancel">
                    Cancel
                </button>
            </div>
            <div class="messageEditStatus">
            </div>
        </div>
    `;
    const textarea =
        body.querySelector(
            ".messageEditTextarea"
        );
    const saveButton =
        body.querySelector(
            ".messageEditSave"
        );
    const cancelButton =
        body.querySelector(
            ".messageEditCancel"
        );
    const status =
        body.querySelector(
            ".messageEditStatus"
        );
    textarea.value =
        originalText;
    textarea.focus();
    textarea.setSelectionRange(
        textarea.value.length,
        textarea.value.length
    );
    function cancelEditing() {
        refreshRenderedMessage(
            messageElement,
            message
        );
    }
    async function saveEditing() {
        const newText =
            textarea
                .value
                .trim();
        if (
            newText === "" &&
            !message.file_url
        ) {
            status.textContent =
                "A message can't be empty.";
            return;
        }
        if (
            newText ===
            originalText.trim()
        ) {

            cancelEditing();
            return;

        }
        saveButton.disabled =
            true;
        cancelButton.disabled =
            true;
        saveButton.textContent =
            "Saving...";
        status.textContent =
            "";
        const {
            data,
            error
        } =
            await supabase
                .from(
                    "messages"
                )
                .update({
                    content:
                        newText,

                    edited_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    message.id
                )
                .eq(
                    "user_id",
                    session.user.id
                )
                .select()
                .single();
        if (error) {
            console.error(
                "Message edit error:",
                error
            );
            saveButton.disabled =
                false;
            cancelButton.disabled =
                false;
            saveButton.textContent =
                "Save";
            status.textContent =
                "Couldn't save the edit.";
            return;
        }
        Object.assign(
            message,
            data
        );
        refreshRenderedMessage(
            messageElement,
            message
        );
    }
    saveButton.onclick =
        saveEditing;
    cancelButton.onclick =
        cancelEditing;
    textarea.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                event.preventDefault();
                cancelEditing();
            }
            if (
                event.key ===
                    "Enter" &&
                (
                    event.ctrlKey ||
                    event.metaKey
                )
            ) {
                event.preventDefault();
                saveEditing();
            }
        }
    );
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
const confirmOverlay =
    document.getElementById(
        "confirmOverlay"
    );
const confirmTitle =
    document.getElementById(
        "confirmTitle"
    );
const confirmMessage =
    document.getElementById(
        "confirmMessage"
    );
const confirmCancelButton =
    document.getElementById(
        "confirmCancelButton"
    );
const confirmConfirmButton =
    document.getElementById(
        "confirmConfirmButton"
    );
let confirmResolver = null;
function openConfirmDialog({
    title,
    message,
    confirmText = "Confirm",
    danger = false
}) {
    confirmTitle.textContent =
        title;
    confirmMessage.textContent =
        message;
    confirmConfirmButton.textContent =
        confirmText;
    confirmConfirmButton.classList.toggle(
        "danger",
        danger
    );

    confirmOverlay.classList.add(
        "open"
    );
    confirmOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    return new Promise(
        resolve => {
            confirmResolver =
                resolve;
        }
    );
}
function closeConfirmDialog(
    result
) {
    confirmOverlay.classList.remove(
        "open"
    );
    confirmOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
    const resolver =
        confirmResolver;
    confirmResolver =
        null;
    if (resolver) {
        resolver(
            result
        );
    }
}

confirmCancelButton.onclick =
    () => {
        closeConfirmDialog(
            false
        );
    };

confirmConfirmButton.onclick =
    () => {
        closeConfirmDialog(
            true
        );
    };

confirmOverlay.onclick =
    event => {
        if (
            event.target ===
            confirmOverlay
        ) {
            closeConfirmDialog(
                false
            );
        }
    };

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape" &&
            confirmOverlay.classList.contains(
                "open"
            )
        ) {
            closeConfirmDialog(
                false
            );
        }
    }
);

async function deleteMessage(
    messageId
) {
    const confirmed =
        await openConfirmDialog({
            title:
                "Delete message?",
            message:
                "This message will be removed for everyone.",
            confirmText:
                "Delete",
            danger:
                true
        });
    
    if (!confirmed) {
        return;
    }
    const { error } =
        await supabase
            .from("messages")
            .delete()
            .eq(
                "id",
                messageId
            );
    if (error) {
        console.error(
            "Message deletion error:",
            error
        );
    }
}

setAppLoadingText(
    "Loading profile..."
);
await loadProfiles();
refreshSelfUserPanel();
refreshSettingsProfile();
setAppLoadingText(
    "Loading members..."
);
await loadMemberProfiles();
setAppLoadingText(
    "Loading messages..."
);
await loadMessages();
refreshMessageTimestamps();
setInterval(
    refreshMessageTimestamps,
    60 * 1000
);
document.addEventListener(
    "visibilitychange",
    () => {
        if (
            !document.hidden
        ) {
            refreshMessageTimestamps();
        }
    }
);
setAppLoadingText(
    "Preparing interface..."
);
await waitForRuckuzFont();
await waitForInitialMediaMetadata();
setAppLoadingText(
    "Ready."
);
finishAppLoading();
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
        event: "UPDATE",
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
        
        const element =
            document.querySelector(
                `.message[data-id="${payload.new.id}"]`
            );

        if (!element) {
            return;
        }

        refreshRenderedMessage(
            element,
            payload.new
        );
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

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const cookieTheme =
    getCookie(
        "ruckuz-theme"
    );

const oldLocalTheme =
    localStorage.getItem(
        "ruckuz-theme"
    );

const savedTheme =
    cookieTheme ||
    oldLocalTheme ||
    "light";

function applyTheme(
    theme,
    save = true
) {

    const dark =
        theme === "dark";
    
    document.body.classList.toggle(
        "darkMode",
        dark
    );

    document.documentElement.dataset.ruckuzTheme =
        dark
            ? "dark"
            : "light";
    
    document.documentElement.style.backgroundColor =
        dark
            ? "#151222"
            : "#fffdf6";

    syncThemeArt();

    if (save) {

        setCookie(
            "ruckuz-theme",
            theme,
            365
        );

        localStorage.setItem(
            "ruckuz-theme",
            theme
        );
    }
}

applyTheme(
    savedTheme,
    false
);

syncThemeArt();

if (
    !cookieTheme &&
    oldLocalTheme
) {

    setCookie(
        "ruckuz-theme",
        oldLocalTheme,
        365
    );
}

themeToggle.onclick = () => {
    const nextTheme =
        document.body.classList.contains(
            "darkMode"
        )
            ? "light"
            : "dark";

    applyTheme(
        nextTheme
    );
};

const logoutButton =
    document.getElementById("logoutButton");
        logoutButton.onclick =
            async () => {
                const confirmed =
                    await openConfirmDialog({
                        title:
                            "Log out?",
                        message:
                            "You will need to sign in again to return to your account.",
                        confirmText:
                            "Log Out",
                        danger:
                            true
                    });
                if (!confirmed) {
                    return;
                }
                logoutButton.disabled =
                    true;
                const { error } =
                    await supabase.auth.signOut();
                if (error) {
                    console.error(error);
                    logoutButton.disabled =
                        false;
                    return;
                }
                clearPersistentLogin();
                location.href =
                    "../";
            };

deleteAccountButton.onclick =
    async () => {
        const confirmed =
            await openConfirmDialog({
                title:
                    "Delete account?",
                message:
                    "Your account will be deleted. This cannot be undone.",
                confirmText:
                    "Delete Account",
                danger:
                    true
            });

        if (!confirmed) {
            return;
        }

        deleteAccountButton.disabled = true;
        deleteAccountStatus.textContent = "Deleting...";

        const {
            data,
            error
        } =
            await supabase.functions.invoke(
                "delete-account"
            );

        if (error) {
            console.error(
                "Account deletion error:",
                error
            );
            deleteAccountButton.disabled = false;
            deleteAccountStatus.textContent = "Couldn't delete the account.";
            return;
        }

        if (!data?.ok) {
            deleteAccountButton.disabled = false;
            deleteAccountStatus.textContent =
                data?.error ||
                "Couldn't delete the account.";
            return;
        }
        
        await supabase.auth.signOut();
        clearPersistentLogin();
        location.replace(
            "../"
        );
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

const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileRequestsButton = document.getElementById("mobileRequestsButton");
const mobileFriendsButton = document.getElementById("mobileFriendsButton");
const mobileRequestCount = document.getElementById("mobileRequestCount");
const mobileFriendsCount = document.getElementById("mobileFriendsCount");
const mobileChannelsButton = document.getElementById("mobileChannelsButton");
const mobileMembersButton = document.getElementById("mobileMembersButton");
const mobileChannelsPanel = document.getElementById("mobileChannelsPanel");
const mobileMembersPanel = document.getElementById("mobileMembersPanel");
const closeMobileChannels = document.getElementById("closeMobileChannels");
const closeMobileMembers = document.getElementById("closeMobileMembers");
const mobileChannelButtons = document.querySelectorAll(".mobileChannelButton");
mobileChannelButtons.forEach(
    button => {
        button.onclick = async () => {
            const channel =
                button.dataset.channel;
            currentChannel =
                channel;
            channelButtons.forEach(
                desktopButton => {
                    desktopButton.classList.toggle(
                        "active",
                        desktopButton.dataset.channel ===
                            channel
                    );

                }
            );
            mobileChannelButtons.forEach(
                mobileButton => {
                    mobileButton.classList.toggle(
                        "active",
                        mobileButton.dataset.channel ===
                            channel
                    );

                }
            );
            currentChannelName.textContent =
                button.textContent
                    .replace("#", "")
                    .trim();
            mobileChannelsPanel.classList.remove(
                "open"
            );
            await loadMessages();
        };
    }
);

mobileChannelsButton.onclick = () => {
    mobileMenu.classList.remove(
        "open"
    );
    mobileMembersPanel.classList.remove(
        "open"
    );
    mobileChannelsPanel.classList.toggle(
        "open"
    );
};
mobileMembersButton.onclick = () => {
    mobileMenu.classList.remove(
        "open"
    );
    mobileChannelsPanel.classList.remove(
        "open"
    );
    mobileMembersPanel.classList.toggle(
        "open"
    );
};
closeMobileChannels.onclick = () => {
    mobileChannelsPanel.classList.remove(
        "open"
    );
};
closeMobileMembers.onclick = () => {
    mobileMembersPanel.classList.remove(
        "open"
    );
};

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
    
    if (mobileRequestCount) {
        mobileRequestCount.textContent =
            count ?? 0;
    }
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
        if (mobileFriendsCount) {
            mobileFriendsCount.textContent = "0";
        }
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
    
    if (mobileFriendsCount) {
        mobileFriendsCount.textContent =
            uniqueFriendIds.length;
    }

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
