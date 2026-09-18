using Supabase.Gotrue;
using Supabase.Gotrue.Interfaces;
using System;
using System.IO;
using Newtonsoft.Json;

namespace RuckuZ_Windows.Services;

public sealed class WindowsSessionPersistence : IGotrueSessionPersistence<Session>
{
    private static string SessionPath
    {
        get
        {
            string folder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "RuckuZ"
            );

            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "supabase-session.json");
        }
    }

    public void SaveSession(Session session)
    {
        try
        {
            string json = JsonConvert.SerializeObject(session);
            File.WriteAllText(SessionPath, json);
        }
        catch
        {

        }
    }

    public Session? LoadSession()
    {
        try
        {
            if (!File.Exists(SessionPath))
            {
                return null;
            }

            string json = File.ReadAllText(SessionPath);
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            return JsonConvert.DeserializeObject<Session>(json);
        }
        catch
        {
            DestroySession();
            return null;
        }
    }

    public void DestroySession()
    {
        try
        {
            if (File.Exists(SessionPath))
            {
                File.Delete(SessionPath);
            }
        }
        catch
        {

        }
    }
}
