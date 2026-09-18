using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace RuckuZ_Windows.Services;

public sealed class RuckuZApi
{
    private static readonly HttpClient Http = new();
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static RuckuZApi Instance { get; } = new();

    private RuckuZApi()
    {
    }

    private static string AccessToken
    {
        get
        {
            return SupabaseService.Instance.Client.Auth.CurrentSession?.AccessToken
                ?? throw new InvalidOperationException("No authenticated RuckuZ session is available.");
        }
    }

    private static HttpRequestMessage CreateRequest(HttpMethod method, string relativeUrl)
    {
        var request = new HttpRequestMessage(
            method,
            $"{SupabaseService.ProjectUrl}/{relativeUrl.TrimStart('/')}"
        );

        request.Headers.TryAddWithoutValidation("apikey", SupabaseService.PublicKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);
        return request;
    }

    private static async Task<string> SendAsync(HttpRequestMessage request)
    {
        using HttpResponseMessage response = await Http.SendAsync(request);
        string body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"RuckuZ server request failed ({(int)response.StatusCode}): {body}"
            );
        }

        return body;
    }

    public async Task<JsonArray> GetArrayAsync(string table, string query)
    {
        using var request = CreateRequest(
            HttpMethod.Get,
            $"rest/v1/{table}?{query}"
        );

        string body = await SendAsync(request);
        return JsonNode.Parse(body)?.AsArray() ?? new JsonArray();
    }

    public async Task<JsonObject?> GetSingleAsync(string table, string query)
    {
        using var request = CreateRequest(
            HttpMethod.Get,
            $"rest/v1/{table}?{query}"
        );

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.pgrst.object+json"));

        try
        {
            string body = await SendAsync(request);
            return JsonNode.Parse(body)?.AsObject();
        }
        catch (InvalidOperationException exception)
            when (exception.Message.Contains("406", StringComparison.Ordinal))
        {
            return null;
        }
    }

    public async Task<JsonArray> PostAsync(string table, object value)
    {
        using var request = CreateRequest(
            HttpMethod.Post,
            $"rest/v1/{table}"
        );

        request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
        request.Content = new StringContent(
            JsonSerializer.Serialize(value, JsonOptions),
            Encoding.UTF8,
            "application/json"
        );

        string body = await SendAsync(request);
        return string.IsNullOrWhiteSpace(body)
            ? new JsonArray()
            : JsonNode.Parse(body)?.AsArray() ?? new JsonArray();
    }

    public async Task<JsonArray> PatchAsync(string table, string query, object value)
    {
        using var request = CreateRequest(
            HttpMethod.Patch,
            $"rest/v1/{table}?{query}"
        );

        request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
        request.Content = new StringContent(
            JsonSerializer.Serialize(value, JsonOptions),
            Encoding.UTF8,
            "application/json"
        );

        string body = await SendAsync(request);
        return string.IsNullOrWhiteSpace(body)
            ? new JsonArray()
            : JsonNode.Parse(body)?.AsArray() ?? new JsonArray();
    }

    public async Task DeleteAsync(string table, string query)
    {
        using var request = CreateRequest(
            HttpMethod.Delete,
            $"rest/v1/{table}?{query}"
        );

        await SendAsync(request);
    }

    public async Task<string> UploadPublicFileAsync(
        string bucket,
        string remotePath,
        string localPath,
        string contentType
    )
    {
        byte[] bytes = await File.ReadAllBytesAsync(localPath);
        string encodedPath = EncodeStoragePath(remotePath);

        using var request = CreateRequest(
            HttpMethod.Post,
            $"storage/v1/object/{Uri.EscapeDataString(bucket)}/{encodedPath}"
        );

        request.Headers.TryAddWithoutValidation("x-upsert", "false");
        request.Content = new ByteArrayContent(bytes);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(contentType)
                ? "application/octet-stream"
                : contentType
        );

        await SendAsync(request);

        return $"{SupabaseService.ProjectUrl}/storage/v1/object/public/{Uri.EscapeDataString(bucket)}/{encodedPath}";
    }

    public async Task<JsonObject?> InvokeFunctionAsync(string functionName, object? body = null)
    {
        using var request = CreateRequest(
            HttpMethod.Post,
            $"functions/v1/{Uri.EscapeDataString(functionName)}"
        );

        request.Content = new StringContent(
            JsonSerializer.Serialize(body ?? new { }, JsonOptions),
            Encoding.UTF8,
            "application/json"
        );

        string result = await SendAsync(request);
        if (string.IsNullOrWhiteSpace(result))
        {
            return null;
        }

        return JsonNode.Parse(result) as JsonObject;
    }

    private static string EncodeStoragePath(string path)
    {
        string[] parts = path.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        return string.Join('/', Array.ConvertAll(parts, Uri.EscapeDataString));
    }
}
