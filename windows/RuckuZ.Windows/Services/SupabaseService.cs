using System.Threading.Tasks;

namespace RuckuZ_Windows.Services;

public sealed class SupabaseService
{

    private const string ProjectUrl =
        "https://msnnsnatkozozlrenfrg.supabase.co";
        
    private const string PublicKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbm5zbmF0a296b3pscmVuZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDIwOTYsImV4cCI6MjEwMDkxODA5Nn0.BkfWuj8Ce7_9XqlNBEatNpYInZKn0IjAqOkjNUe5Wb4";

    public static SupabaseService Instance
    {
        get;
    } =
        new SupabaseService();

    public Supabase.Client Client
    {
        get;
    }

    private Task? initializeTask;
    private SupabaseService()
    {

        var options =
            new Supabase.SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = false
            };

        Client =
            new Supabase.Client(
                ProjectUrl,
                PublicKey,
                options
            );

    }

    public Task InitializeAsync()
    {

        initializeTask ??=
            Client.InitializeAsync();

        return initializeTask;
    }
}