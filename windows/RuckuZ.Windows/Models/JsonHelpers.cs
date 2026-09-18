using System;
using System.Text.Json.Nodes;

namespace RuckuZ_Windows.Models;

public static class JsonHelpers
{
    public static string String(this JsonObject? obj, string key, string fallback = "")
    {
        if (obj is null || !obj.TryGetPropertyValue(key, out JsonNode? node) || node is null)
        {
            return fallback;
        }

        try
        {
            return node.GetValue<string>() ?? fallback;
        }
        catch
        {
            return node.ToString();
        }
    }

    public static bool Bool(this JsonObject? obj, string key, bool fallback = false)
    {
        if (obj is null || !obj.TryGetPropertyValue(key, out JsonNode? node) || node is null)
        {
            return fallback;
        }

        try
        {
            return node.GetValue<bool>();
        }
        catch
        {
            return bool.TryParse(node.ToString(), out bool value) ? value : fallback;
        }
    }

    public static DateTimeOffset Date(this JsonObject? obj, string key)
    {
        string value = obj.String(key);
        return DateTimeOffset.TryParse(value, out DateTimeOffset parsed)
            ? parsed
            : DateTimeOffset.Now;
    }
}
