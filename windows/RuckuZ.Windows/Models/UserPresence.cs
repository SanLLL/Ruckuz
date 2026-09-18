using Newtonsoft.Json;
using Supabase.Realtime.Models;

namespace RuckuZ_Windows.Models;

public sealed class UserPresence : BasePresence
{
    [JsonProperty("user_id")]
    public string UserId { get; set; } = "";

    [JsonProperty("online_at")]
    public string OnlineAt { get; set; } = "";
}
