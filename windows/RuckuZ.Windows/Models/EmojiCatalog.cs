using System.Collections.Generic;

namespace RuckuZ_Windows.Models;

public static class EmojiCatalog
{
    public static IReadOnlyDictionary<string, string> Items { get; } =
        new Dictionary<string, string>
        {
            ["\U0001F47D"] = "alien.png",
            ["\U0001F630"] = "coldfear.png",
            ["\U0001F620"] = "anger.png",
            ["\U0001FAE4"] = "diagonalneutral.png",
            ["\U0001F924"] = "drooling.png",
            ["\U0001F611"] = "expressionless.png",
            ["\U0001F641"] = "frown.png",
            ["\U0001F600"] = "happy.png",
            ["\U0001F604"] = "happyclosed.png",
            ["\U0001F60D"] = "hearteyes.png",
            ["\U0001F979"] = "holdingtears.png",
            ["\U0001F617"] = "kissy.png",
            ["\U0001F61A"] = "kissyblush.png",
            ["\U0001F619"] = "kissyclosed.png",
            ["\U0001F618"] = "kissyheart.png",
            ["\U0001F606"] = "laughing.png",
            ["\U0001F610"] = "neutral.png",
            ["\U0001F636"] = "nomouth.png",
            ["\U0001F97A"] = "pleading.png",
            ["\U0001F4A9"] = "poop.png",
            ["\U0001F923"] = "rofl.png",
            ["\U0001F642"] = "smile.png",
            ["\U0001F970"] = "smilehearts.png",
            ["\U0001F972"] = "smiletear.png",
            ["\U0001F603"] = "smiley.png",
            ["\U0001F60F"] = "smirk.png",
            ["\U0001F929"] = "stareyes.png",
            ["\U0001F602"] = "tearedlaughing.png",
            ["\U0001F601"] = "teethhappy.png",
            ["\U0001F643"] = "upsidedown.png",
            ["\U0001F62D"] = "crying.png",
            ["\U0001F609"] = "wink.png",
            ["\U0001FAE0"] = "melting.png",
            ["\U0001F612"] = "annoyed.png",
            ["\U0001F605"] = "coldsweat.png",
            ["\U0001F608"] = "hornedsmile.png",
            ["\U0001F47F"] = "hornedanger.png",
            ["\U0001F60B"] = "licking.png",
            ["\U0001F92C"] = "swearing.png",
            ["\U0001F628"] = "fear.png"
        };

    public static bool IsEmojiOnly(string text)
    {
        string remaining = text;

        foreach (string emoji in Items.Keys)
        {
            remaining = remaining.Replace(emoji, "", System.StringComparison.Ordinal);
        }

        return !string.IsNullOrWhiteSpace(text) && string.IsNullOrWhiteSpace(remaining);
    }
}
