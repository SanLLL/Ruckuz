const CUSTOM_EMOJIS = new Map([
    ["\u{1F47D}", "alien.png"],
    ["\u{1F630}", "coldfear.png"],
    ["\u{1F620}", "anger.png"],
    ["\u{1FAE4}", "diagonalneutral.png"],
    ["\u{1F924}", "drooling.png"],
    ["\u{1F611}", "expressionless.png"],
    ["\u{1F641}", "frown.png"],
    ["\u{1F600}", "happy.png"],
    ["\u{1F604}", "happyclosed.png"],
    ["\u{1F60D}", "hearteyes.png"],
    ["\u{1F979}", "holdingtears.png"],
    ["\u{1F617}", "kissy.png"],
    ["\u{1F61A}", "kissyblush.png"],
    ["\u{1F619}", "kissyclosed.png"],
    ["\u{1F618}", "kissyheart.png"],
    ["\u{1F606}", "laughing.png"],
    ["\u{1F610}", "neutral.png"],
    ["\u{1F636}", "nomouth.png"],
    ["\u{1F97A}", "pleading.png"],
    ["\u{1F4A9}", "poop.png"],
    ["\u{1F923}", "rofl.png"],
    ["\u{1F642}", "smile.png"],
    ["\u{1F970}", "smilehearts.png"],
    ["\u{1F972}", "smiletear.png"],
    ["\u{1F603}", "smiley.png"],
    ["\u{1F60F}", "smirk.png"],
    ["\u{1F929}", "stareyes.png"],
    ["\u{1F602}", "tearedlaughing.png"],
    ["\u{1F601}", "teethhappy.png"],
    ["\u{1F643}", "upsidedown.png"],
    ["\u{1F62D}", "crying.png"],
    ["\u{1F609}", "wink.png"],
    ["\u{1FAE0}", "melting.png"],
    ["\u{1F612}", "annoyed.png"],
    ["\u{1F630}", "coldfear.png"],
    ["\u{1F605}", "coldsweat.png"],
    ["\u{1F608}", "hornedsmile.png"],
    ["\u{1F47F}", "hornedanger.png"],
    ["\u{1F60B}", "licking.png"],
    ["\u{1F92C}", "swearing.png"],
]);

const DEFAULT_PICKER_EMOJIS = [
    "\u{1F60E}",
    "\u{1F914}",
    "\u{1F634}",
    "\u{1F621}",
    "\u{1F92F}",
    "\u{1F525}",
    "\u2764\uFE0F",
    "\u{1F44D}",
    "\u{1F44E}",
    "\u{1F389}",
    "\u2728",
    "\u{1F480}"
];

const failedCustomEmojis =
    new Set();
const segmenter =
    typeof Intl !== "undefined" &&
    typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(
            undefined,
            {
                granularity: "grapheme"
            }
        )
        : null;

function splitGraphemes(text) {
    if (segmenter) {
        return Array.from(
            segmenter.segment(text),
            part => part.segment
        );

    }
    return Array.from(text);

}

function escapeHTML(text) {
    const div =
        document.createElement("div");
    div.textContent =
        text;
    return div.innerHTML;

}

function getEmojiFile(emoji) {
    if (
        failedCustomEmojis.has(
            emoji
        )
    ) {
        return null;
    }
    return (
        CUSTOM_EMOJIS.get(
            emoji
        ) ||
        null
    );
}

function getEmojiUrl(fileName) {
    return new URL(
        `../assets/emojis/${fileName}`,
        import.meta.url
    ).href;

}

export function renderEmojiHTML(text) {

    return splitGraphemes(
        text || ""
    )
        .map(emoji => {

            const fileName =
                getEmojiFile(
                    emoji
                );

            if (!fileName) {

                return escapeHTML(
                    emoji
                );

            }
            const url =
                getEmojiUrl(
                    fileName
                );

            return `
                <img
                    class="ruckuzEmoji"
                    src="${escapeHTML(url)}"
                    alt="${escapeHTML(emoji)}"
                    data-fallback="${encodeURIComponent(emoji)}"
                >
            `;

        })
        .join("");

}

export function wireEmojiFallbacks(
    container
) {
    container
        .querySelectorAll(
            ".ruckuzEmoji[data-fallback]"
        )
        .forEach(img => {
            const emoji =
                decodeURIComponent(
                    img.dataset.fallback ||
                    ""
                );

            const fallback = () => {
                failedCustomEmojis.add(
                    emoji
                );
                img.replaceWith(
                    document.createTextNode(
                        emoji
                    )
                );

            };

            if (
                img.complete &&
                img.naturalWidth === 0
            ) {

                fallback();
                return;

            }

            img.addEventListener(
                "error",
                fallback,
                {
                    once: true
                }
            );
        });

}

export function buildEmojiPicker(
    container,
    onPick
) {
    container.innerHTML =
        "";
    const emojis = [
        ...new Set([
            ...CUSTOM_EMOJIS.keys(),
            ...DEFAULT_PICKER_EMOJIS
        ])
    ];

    for (const emoji of emojis) {
        const button =
            document.createElement(
                "button"
            );
        button.type =
            "button";
        button.className =
            "emojiChoice";
        button.setAttribute(
            "aria-label",
            "Insert emoji"
        );

        const fileName =
            getEmojiFile(
                emoji
            );

        if (fileName) {
            const img =
                document.createElement(
                    "img"
                );
            img.className =
                "emojiPickerImage";
            img.src =
                getEmojiUrl(
                    fileName
                );
            img.alt =
                emoji;

            img.addEventListener(
                "error",
                () => {
                    failedCustomEmojis.add(
                        emoji
                    );
                    button.textContent =
                        emoji;
                },
                {
                    once: true
                }
            );

            button.appendChild(
                img
            );
        } else {
            button.textContent =
                emoji;
        }

        button.onclick =
            () => {

                onPick(
                    emoji
                );
            };

        container.appendChild(
            button
        );
    }
}

function createComposerEmojiNode(
    emoji
) {

    const fileName =
        getEmojiFile(
            emoji
        );

    if (!fileName) {

        return document.createTextNode(
            emoji
        );

    }

    const token =
        document.createElement(
            "span"
        );

    token.className =
        "composerEmojiToken";

    token.dataset.emoji =
        emoji;

    token.contentEditable =
        "false";

    const img =
        document.createElement(
            "img"
        );

    img.className =
        "composerEmojiImage";

    img.src =
        getEmojiUrl(
            fileName
        );

    img.alt =
        emoji;

    img.addEventListener(
        "error",
        () => {

            failedCustomEmojis.add(
                emoji
            );

            token.replaceWith(
                document.createTextNode(
                    emoji
                )
            );
        },
        {
            once: true
        }
    );

    token.appendChild(
        img
    );

    return token;
}

export function getComposerText(
    composer
) {
    function readNode(node) {
        if (
            node.nodeType ===
            Node.TEXT_NODE
        ) {
            return (
                node.nodeValue ||
                ""
            );
        }

        if (
            node.nodeType !==
            Node.ELEMENT_NODE
        ) {
            return "";
        }

        if (
            node.classList.contains(
                "composerEmojiToken"
            )
        ) {
            return (
                node.dataset.emoji ||
                ""
            );
        }

        if (
            node.tagName === "BR"
        ) {
            return "\n";
        }

        let result = "";
        for (
            const child
            of node.childNodes
        ) {
            result +=
                readNode(
                    child
                );
        }
        return result;
    }

    return readNode(
        composer
    );
}

export function clearComposer(
    composer
) {
    composer.innerHTML =
        "";

}

function moveCaretToEnd(
    composer
) {
    composer.focus();
    const selection =
        window.getSelection();
    const range =
        document.createRange();
    range.selectNodeContents(
        composer
    );
    range.collapse(
        false
    );

    selection.removeAllRanges();
    selection.addRange(
        range
    );
}

export function insertEmojiAtCaret(
    composer,
    emoji
) {

    composer.focus();

    const node =
        createComposerEmojiNode(
            emoji
        );

    const selection =
        window.getSelection();

    if (
        selection &&
        selection.rangeCount > 0
    ) {
        const range =
            selection.getRangeAt(0);

        if (
            composer.contains(
                range.commonAncestorContainer
            ) ||
            range.commonAncestorContainer ===
                composer
        ) {
            range.deleteContents();
            range.insertNode(
                node
            );
            range.setStartAfter(
                node
            );
            range.collapse(
                true
            );

            selection.removeAllRanges();
            selection.addRange(
                range
            );
            return;
        }

    }

    composer.appendChild(
        node
    );

    moveCaretToEnd(
        composer
    );

}

export function upgradeTypedCustomEmojis(
    composer
) {
    const walker =
        document.createTreeWalker(
            composer,
            NodeFilter.SHOW_TEXT
        );

    const textNodes = [];
    while (
        walker.nextNode()
    ) {
        const node =
            walker.currentNode;

        if (
            node.parentElement &&
            node.parentElement.closest(
                ".composerEmojiToken"
            )
        ) {
            continue;
        }

        textNodes.push(
            node
        );
    }

    let changed =
        false;

    for (
        const textNode
        of textNodes
    ) {

        const text =
            textNode.nodeValue ||
            "";

        const parts =
            splitGraphemes(
                text
            );

        if (
            !parts.some(
                emoji =>
                    Boolean(
                        getEmojiFile(
                            emoji
                        )
                    )
            )
        ) {

            continue;
        }

        const fragment =
            document.createDocumentFragment();
        for (
            const part
            of parts
        ) {
            fragment.appendChild(
                createComposerEmojiNode(
                    part
                )
            );
        }
        textNode.replaceWith(
            fragment
        );
        changed =
            true;
    }
    if (changed) {
        moveCaretToEnd(
            composer
        );
    }
}

export function isEmojiOnlyText(
    text
) {
    const parts =
        splitGraphemes(
            (text || "").trim()
        )
        .filter(
            part =>
                !/^\s+$/u.test(
                    part
                )
        );
    if (parts.length === 0) {
        return false;
    }

    return parts.every(
        part => {
            if (
                /^\p{Regional_Indicator}{2}$/u
                    .test(part)
            ) {
                return true;
            }
            if (
                /^[#*0-9]\uFE0F?\u20E3$/u
                    .test(part)
            ) {

                return true;
            }

            return (
                /\p{Extended_Pictographic}/u
                    .test(part)
            );
        }
    );
}
