using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using RuckuZ_Windows.Models;
using RuckuZ_Windows.Services;
using Supabase.Realtime;
using Supabase.Realtime.Interfaces;
using Supabase.Realtime.PostgresChanges;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Windows.Media.Core;
using Windows.Storage.Pickers;
using Windows.System;

namespace RuckuZ_Windows;

public sealed partial class MainWindow
{
    private RealtimeChannel? messagesRealtimeChannel;
    private RealtimeChannel? profilesRealtimeChannel;
    private RealtimeChannel? socialRealtimeChannel;
    private RealtimeChannel? presenceChannel;
    private RealtimePresence<UserPresence>? presenceTracker;

    private readonly Dictionary<TextBlock, DateTimeOffset> timestampBlocks = new();
    private DispatcherTimer? timestampTimer;

    private bool messagesReloadQueued;
    private bool membersReloadQueued;
    private bool socialReloadQueued;

    private static readonly IReadOnlyDictionary<string, string> ChannelLabels =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["general"] = "general-chat",
            ["meme"] = "meme-chat",
            ["media"] = "media-chat",
            ["gaming"] = "gaming-chat"
        };

    private RuckuZApi Api => RuckuZApi.Instance;

    private async Task LoadProfilesAsync()
    {
        JsonArray rows = await Api.GetArrayAsync(
            "profiles",
            "select=*"
        );

        profiles.Clear();

        foreach (JsonNode? node in rows)
        {
            if (node is not JsonObject profile)
            {
                continue;
            }

            string id = profile.String("id");
            if (!string.IsNullOrWhiteSpace(id))
            {
                profiles[id] = profile;
            }
        }

        profiles.TryGetValue(currentUserId, out myProfile);
    }

    private async Task LoadMemberProfilesAsync()
    {
        JsonArray rows = await Api.GetArrayAsync(
            "profiles",
            "select=id,username,avatar_url,status_text,ruckuz_id,is_deleted&is_deleted=eq.false&order=username.asc"
        );

        memberProfiles.Clear();

        foreach (JsonNode? node in rows)
        {
            if (node is not JsonObject profile)
            {
                continue;
            }

            string id = profile.String("id");
            if (!string.IsNullOrWhiteSpace(id))
            {
                memberProfiles[id] = profile;
            }
        }
    }

    private async Task LoadMessagesAsync()
    {
        string channel = Uri.EscapeDataString(currentChannel);

        JsonArray rows = await Api.GetArrayAsync(
            "messages",
            $"select=*&channel=eq.{channel}&order=created_at.asc"
        );

        MessagesPanel.Children.Clear();
        timestampBlocks.Clear();

        foreach (JsonNode? node in rows)
        {
            if (node is JsonObject message)
            {
                MessagesPanel.Children.Add(CreateMessageElement(message));
            }
        }

        await Task.Delay(25);
        ScrollMessagesToBottom();
    }

    private UIElement CreateMessageElement(JsonObject message)
    {
        string messageId = message.String("id");
        bool pending = messageId.StartsWith("local-", StringComparison.Ordinal);
        string userId = message.String("user_id");
        bool authorDeleted = message.Bool("author_deleted");

        JsonObject? profile = null;
        if (!authorDeleted)
        {
            profiles.TryGetValue(userId, out profile);
        }

        string username = authorDeleted
            ? message.String("username", "DeletedUser")
            : profile.String("username", message.String("username", "RuckuZ User"));

        string avatarUrl = authorDeleted
            ? ""
            : profile.String("avatar_url");

        DateTimeOffset createdAt = message.Date("created_at");
        bool mine = string.Equals(userId, currentUserId, StringComparison.Ordinal);

        var outerButton = new Button
        {
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            BorderThickness = new Thickness(0),
            Padding = new Thickness(0),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Stretch,
            Tag = message
        };

        var row = new Grid
        {
            Padding = new Thickness(0, 9, 0, 9),
            ColumnSpacing = 12
        };

        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(48) });
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        Border avatar = CreateAvatarBorder(avatarUrl, 48);
        Grid.SetColumn(avatar, 0);
        row.Children.Add(avatar);

        var content = new StackPanel
        {
            Spacing = 3,
            MinWidth = 0
        };
        Grid.SetColumn(content, 1);

        var header = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 8
        };

        var usernameBlock = new TextBlock
        {
            Text = username,
            FontFamily = RuckuZFont(),
            FontSize = 16,
            FontWeight = Microsoft.UI.Text.FontWeights.Bold,
            Foreground = BrushFor("primary")
        };

        if (!authorDeleted && !string.IsNullOrWhiteSpace(userId))
        {
            usernameBlock.Tapped += async (_, _) => await OpenProfileAsync(userId);
        }

        var timestamp = new TextBlock
        {
            Text = FormatMessageTimestamp(createdAt),
            VerticalAlignment = VerticalAlignment.Center,
            FontFamily = RuckuZFont(),
            FontSize = 12,
            Foreground = BrushFor("muted")
        };
        timestampBlocks[timestamp] = createdAt;

        header.Children.Add(usernameBlock);
        header.Children.Add(timestamp);

        content.Children.Add(header);

        string messageText = message.String("content");
        string? gifUrl = GetGifEmbedUrl(messageText);

        if (!string.IsNullOrWhiteSpace(gifUrl))
        {
            content.Children.Add(CreateRemoteImage(gifUrl, 500, 330));
        }
        else if (!string.IsNullOrEmpty(messageText))
        {
            content.Children.Add(CreateEmojiText(messageText));
        }

        string fileUrl = message.String("file_url");
        string fileType = message.String("file_type");
        string fileName = message.String("file_name", "Attachment");

        if (!string.IsNullOrWhiteSpace(fileUrl))
        {
            content.Children.Add(CreateAttachment(fileUrl, fileType, fileName));
        }

        if (pending)
        {
            content.Children.Add(new TextBlock
            {
                Text = "Sending...",
                FontFamily = RuckuZFont(),
                FontSize = 12,
                Foreground = BrushFor("muted")
            });
        }
        else if (!string.IsNullOrWhiteSpace(message.String("edited_at")))
        {
            content.Children.Add(new TextBlock
            {
                Text = "edited",
                FontFamily = RuckuZFont(),
                FontSize = 12,
                Foreground = BrushFor("muted")
            });
        }

        row.Children.Add(content);
        outerButton.Content = row;

        if (mine && !pending)
        {
            var menu = new MenuFlyout();

            var editItem = new MenuFlyoutItem { Text = "Edit" };
            editItem.Click += async (_, _) => await EditMessageAsync(message);
            menu.Items.Add(editItem);

            var deleteItem = new MenuFlyoutItem { Text = "Delete" };
            deleteItem.Click += async (_, _) => await DeleteMessageAsync(message);
            menu.Items.Add(deleteItem);

            outerButton.ContextFlyout = menu;
        }

        return outerButton;
    }

    private RichTextBlock CreateEmojiText(string text)
    {
        bool emojiOnly = EmojiCatalog.IsEmojiOnly(text);

        var rich = new RichTextBlock
        {
            TextWrapping = TextWrapping.Wrap,
            FontFamily = RuckuZFont(),
            FontSize = emojiOnly ? 28 : 16,
            Foreground = BrushFor("text")
        };

        var paragraph = new Paragraph();
        int index = 0;
        int plainStart = 0;

        while (index < text.Length)
        {
            KeyValuePair<string, string>? match = null;

            foreach (KeyValuePair<string, string> item in EmojiCatalog.Items)
            {
                if (text.AsSpan(index).StartsWith(item.Key.AsSpan(), StringComparison.Ordinal))
                {
                    match = item;
                    break;
                }
            }

            if (match is null)
            {
                index++;
                continue;
            }

            if (index > plainStart)
            {
                paragraph.Inlines.Add(new Run
                {
                    Text = text.Substring(plainStart, index - plainStart)
                });
            }

            paragraph.Inlines.Add(new InlineUIContainer
            {
                Child = new Image
                {
                    Source = AppBitmap($"Assets/emojis/{match.Value.Value}"),
                    Width = emojiOnly ? 46 : 24,
                    Height = emojiOnly ? 46 : 24,
                    Stretch = Stretch.Uniform,
                    Margin = new Thickness(1, 0, 1, -4)
                }
            });

            index += match.Value.Key.Length;
            plainStart = index;
        }

        if (plainStart < text.Length)
        {
            paragraph.Inlines.Add(new Run
            {
                Text = text.Substring(plainStart)
            });
        }

        rich.Blocks.Add(paragraph);
        return rich;
    }

    private UIElement CreateAttachment(string fileUrl, string fileType, string fileName)
    {
        if (fileType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return CreateRemoteImage(fileUrl, 520, 360);
        }

        if (fileType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
        {
            var player = new MediaPlayerElement
            {
                Width = 520,
                Height = 310,
                MaxWidth = 520,
                AreTransportControlsEnabled = true,
                Source = MediaSource.CreateFromUri(new Uri(fileUrl))
            };

            return player;
        }

        if (fileType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return new MediaPlayerElement
            {
                Width = 430,
                Height = 72,
                AreTransportControlsEnabled = true,
                Source = MediaSource.CreateFromUri(new Uri(fileUrl))
            };
        }

        Button openButton = CreateDrawnButton(
            string.IsNullOrWhiteSpace(fileName) ? "Open File" : fileName,
            280,
            52
        );

        openButton.Click += async (_, _) =>
        {
            await Launcher.LaunchUriAsync(new Uri(fileUrl));
        };

        return openButton;
    }

    private Image CreateRemoteImage(string url, double maxWidth, double maxHeight)
    {
        var image = new Image
        {
            MaxWidth = maxWidth,
            MaxHeight = maxHeight,
            HorizontalAlignment = HorizontalAlignment.Left,
            Stretch = Stretch.Uniform,
            Margin = new Thickness(0, 4, 0, 3)
        };

        try
        {
            image.Source = new BitmapImage(new Uri(url));
        }
        catch
        {
        }

        image.Tapped += async (_, _) =>
        {
            if (Uri.TryCreate(url, UriKind.Absolute, out Uri? uri))
            {
                await Launcher.LaunchUriAsync(uri);
            }
        };

        return image;
    }

    private Border CreateAvatarBorder(string? avatarUrl, double size)
    {
        var image = new Image
        {
            Stretch = Stretch.UniformToFill
        };

        if (!string.IsNullOrWhiteSpace(avatarUrl) && Uri.TryCreate(avatarUrl, UriKind.Absolute, out Uri? remote))
        {
            image.Source = new BitmapImage(remote);
        }
        else
        {
            image.Source = AppBitmap("Assets/avatars/ruckuz.png");
        }

        return new Border
        {
            Width = size,
            Height = size,
            CornerRadius = new CornerRadius(size / 2),
            BorderBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 107, 88, 184)),
            BorderThickness = new Thickness(2),
            Child = image
        };
    }

    private static string? GetGifEmbedUrl(string text)
    {
        if (!Uri.TryCreate(text.Trim(), UriKind.Absolute, out Uri? uri))
        {
            return null;
        }

        string host = uri.Host.ToLowerInvariant();
        string path = uri.AbsolutePath.ToLowerInvariant();

        if (path.EndsWith(".gif", StringComparison.Ordinal) ||
            path.Contains(".gif/", StringComparison.Ordinal) ||
            host == "giphy.com" || host.EndsWith(".giphy.com", StringComparison.Ordinal) ||
            host == "tenor.com" || host.EndsWith(".tenor.com", StringComparison.Ordinal) ||
            ((host == "cdn.discordapp.com" || host == "media.discordapp.net") && path.Contains(".gif", StringComparison.Ordinal)))
        {
            return uri.ToString();
        }

        return null;
    }

    private async void ChannelButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string channel)
        {
            return;
        }

        if (channel == currentChannel)
        {
            return;
        }

        currentChannel = channel;
        CurrentChannelName.Text = $"# {ChannelLabels[currentChannel]}";
        MessageInput.PlaceholderText = $"Message #{ChannelLabels[currentChannel]}";
        UpdateChannelArt();

        LoadingOverlay.Visibility = Visibility.Visible;
        LoadingText.Text = $"Loading #{ChannelLabels[currentChannel]}...";

        try
        {
            await LoadMessagesAsync();
        }
        catch (Exception exception)
        {
            await ShowMessageAsync("Couldn't load channel", exception.Message);
        }
        finally
        {
            LoadingOverlay.Visibility = Visibility.Collapsed;
        }
    }

    private void UpdateChannelArt()
    {
        ApplyChannelButtonState(GeneralChannelButton, "general");
        ApplyChannelButtonState(MemeChannelButton, "meme");
        ApplyChannelButtonState(MediaChannelButton, "media");
        ApplyChannelButtonState(GamingChannelButton, "gaming");
    }

    private void ApplyChannelButtonState(Button button, string channel)
    {
        bool active = string.Equals(
            currentChannel,
            channel,
            StringComparison.Ordinal
        );

        if (active)
        {
            button.Background = new SolidColorBrush(
                darkMode
                    ? Windows.UI.Color.FromArgb(255, 64, 56, 99)
                    : Windows.UI.Color.FromArgb(255, 107, 88, 184)
            );

            button.Foreground = new SolidColorBrush(
                Windows.UI.Color.FromArgb(255, 255, 255, 255)
            );

            button.FontWeight = Microsoft.UI.Text.FontWeights.Bold;
            return;
        }

        button.Background = new SolidColorBrush(
            Windows.UI.Color.FromArgb(0, 0, 0, 0)
        );

        button.Foreground = BrushFor("primary");
        button.FontWeight = Microsoft.UI.Text.FontWeights.Normal;
    }

    private void MessageInput_TextChanged(object sender, TextChangedEventArgs e)
    {
        SendButton.Visibility = string.IsNullOrWhiteSpace(MessageInput.Text)
            ? Visibility.Collapsed
            : Visibility.Visible;
    }

    private async void MessageInput_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == VirtualKey.Enter)
        {
            e.Handled = true;
            await SendMessageAsync();
        }
    }

    private async void SendButton_Click(object sender, RoutedEventArgs e)
    {
        await SendMessageAsync();
    }

    private async Task SendMessageAsync()
    {
        string text = MessageInput.Text.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        string username = myProfile.String(
            "username",
            SupabaseService.Instance.Client.Auth.CurrentUser?.Email ?? "RuckuZ User"
        );

        var localMessage = new JsonObject
        {
            ["id"] = $"local-{Guid.NewGuid():N}",
            ["user_id"] = currentUserId,
            ["username"] = username,
            ["content"] = text,
            ["channel"] = currentChannel,
            ["created_at"] = DateTimeOffset.UtcNow.ToString("O")
        };

        UIElement localElement = CreateMessageElement(localMessage);
        MessagesPanel.Children.Add(localElement);
        MessageInput.Text = "";
        ScrollMessagesToBottom();

        try
        {
            await Api.PostAsync(
                "messages",
                new
                {
                    user_id = currentUserId,
                    username,
                    content = text,
                    channel = currentChannel
                }
            );

            await LoadMessagesAsync();
        }
        catch (Exception exception)
        {
            MessagesPanel.Children.Remove(localElement);
            await ShowMessageAsync("Message not sent", exception.Message);
        }
    }

    private async void MediaButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add("*");
        InitializePicker(picker);

        Windows.Storage.StorageFile? file = await picker.PickSingleFileAsync();
        if (file == null)
        {
            return;
        }

        var info = new FileInfo(file.Path);
        if (info.Length > 50L * 1024L * 1024L)
        {
            await ShowMessageAsync("File too large", "The maximum chat upload size is 50 MB.");
            return;
        }

        string contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        string username = myProfile.String(
            "username",
            SupabaseService.Instance.Client.Auth.CurrentUser?.Email ?? "RuckuZ User"
        );

        var localMessage = new JsonObject
        {
            ["id"] = $"local-{Guid.NewGuid():N}",
            ["user_id"] = currentUserId,
            ["username"] = username,
            ["content"] = "",
            ["file_url"] = new Uri(file.Path).AbsoluteUri,
            ["file_type"] = contentType,
            ["file_name"] = file.Name,
            ["channel"] = currentChannel,
            ["created_at"] = DateTimeOffset.UtcNow.ToString("O")
        };

        UIElement localElement = CreateMessageElement(localMessage);
        MessagesPanel.Children.Add(localElement);
        ScrollMessagesToBottom();

        try
        {
            string extension = Path.GetExtension(file.Name);
            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = ".file";
            }

            string remotePath = $"{currentUserId}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";

            string publicUrl = await Api.UploadPublicFileAsync(
                "chat-files",
                remotePath,
                file.Path,
                contentType
            );

            await Api.PostAsync(
                "messages",
                new
                {
                    user_id = currentUserId,
                    username,
                    content = "",
                    file_url = publicUrl,
                    file_type = contentType,
                    file_name = file.Name,
                    channel = currentChannel
                }
            );

            await LoadMessagesAsync();
        }
        catch (Exception exception)
        {
            MessagesPanel.Children.Remove(localElement);
            await ShowMessageAsync("Upload failed", exception.Message);
        }
    }

    private void InitializePicker(FileOpenPicker picker)
    {
        IntPtr hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);
    }

    private async void EmojiButton_Click(object sender, RoutedEventArgs e)
    {
        var grid = new GridView
        {
            MaxWidth = 500,
            MaxHeight = 410,
            SelectionMode = ListViewSelectionMode.None,
            IsItemClickEnabled = false,
            Padding = new Thickness(6)
        };

        foreach (KeyValuePair<string, string> item in EmojiCatalog.Items)
        {
            var button = new Button
            {
                Width = 58,
                Height = 58,
                Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
                BorderThickness = new Thickness(0),
                Padding = new Thickness(5),
                Tag = item.Key,
                Content = new Image
                {
                    Source = AppBitmap($"Assets/emojis/{item.Value}"),
                    Width = 44,
                    Height = 44,
                    Stretch = Stretch.Uniform
                }
            };

            button.Click += (_, _) =>
            {
                int start = MessageInput.SelectionStart;
                string emoji = (string)button.Tag;
                MessageInput.Text = MessageInput.Text.Insert(start, emoji);
                MessageInput.SelectionStart = start + emoji.Length;
                MessageInput.Focus(FocusState.Programmatic);
            };

            grid.Items.Add(button);
        }

        var dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = "Custom Emojis",
            Content = grid,
            CloseButtonText = "Close"
        };

        await dialog.ShowAsync();
    }

    private async Task EditMessageAsync(JsonObject message)
    {
        string original = message.String("content");

        var editor = new TextBox
        {
            Text = original,
            AcceptsReturn = true,
            TextWrapping = TextWrapping.Wrap,
            MinWidth = 420,
            MinHeight = 100,
            FontFamily = RuckuZFont(),
            FontSize = 17
        };

        var dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = "Edit Message",
            Content = editor,
            PrimaryButtonText = "Save",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary
        };

        ContentDialogResult result = await dialog.ShowAsync();
        if (result != ContentDialogResult.Primary)
        {
            return;
        }

        string newText = editor.Text.Trim();
        string fileUrl = message.String("file_url");

        if (string.IsNullOrWhiteSpace(newText) && string.IsNullOrWhiteSpace(fileUrl))
        {
            await ShowMessageAsync("Can't save message", "A message can't be empty.");
            return;
        }

        if (newText == original.Trim())
        {
            return;
        }

        string id = Uri.EscapeDataString(message.String("id"));
        string user = Uri.EscapeDataString(currentUserId);

        await Api.PatchAsync(
            "messages",
            $"id=eq.{id}&user_id=eq.{user}",
            new
            {
                content = newText,
                edited_at = DateTimeOffset.UtcNow.ToString("O")
            }
        );

        await LoadMessagesAsync();
    }

    private async Task DeleteMessageAsync(JsonObject message)
    {
        bool confirmed = await ShowConfirmAsync(
            "Delete message?",
            "This message will be removed from RuckuZ.",
            "Delete"
        );

        if (!confirmed)
        {
            return;
        }

        string id = Uri.EscapeDataString(message.String("id"));
        string user = Uri.EscapeDataString(currentUserId);

        await Api.DeleteAsync(
            "messages",
            $"id=eq.{id}&user_id=eq.{user}"
        );

        await LoadMessagesAsync();
    }

    private void ScrollMessagesToBottom()
    {
        MessagesScrollViewer.UpdateLayout();
        MessagesScrollViewer.ChangeView(
            null,
            MessagesScrollViewer.ScrollableHeight,
            null,
            true
        );
    }

    private string FormatMessageTimestamp(DateTimeOffset timestamp)
    {
        DateTimeOffset local = timestamp.ToLocalTime();
        DateTimeOffset now = DateTimeOffset.Now;
        TimeSpan age = now - local;

        if (age.TotalHours < 24)
        {
            return local.ToString("HH:mm");
        }

        if (age.TotalHours < 48)
        {
            return $"yesterday at {local:HH:mm}";
        }

        return local.ToString("dd.MM.yyyy");
    }

    private void StartTimestampTimer()
    {
        timestampTimer ??= new DispatcherTimer
        {
            Interval = TimeSpan.FromMinutes(1)
        };

        timestampTimer.Tick -= TimestampTimer_Tick;
        timestampTimer.Tick += TimestampTimer_Tick;
        timestampTimer.Start();
    }

    private void TimestampTimer_Tick(object? sender, object e)
    {
        foreach (KeyValuePair<TextBlock, DateTimeOffset> item in timestampBlocks.ToArray())
        {
            item.Key.Text = FormatMessageTimestamp(item.Value);
        }
    }

    private async Task RenderMemberListAsync()
    {
        MembersListPanel.Children.Clear();

        IEnumerable<JsonObject> ordered = memberProfiles.Values
            .OrderByDescending(profile => onlineUsers.Contains(profile.String("id")))
            .ThenBy(profile => profile.String("username"), StringComparer.OrdinalIgnoreCase);

        foreach (JsonObject profile in ordered)
        {
            string id = profile.String("id");
            bool online = onlineUsers.Contains(id);

            var button = new Button
            {
                HorizontalAlignment = HorizontalAlignment.Stretch,
                HorizontalContentAlignment = HorizontalAlignment.Stretch,
                Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
                BorderThickness = new Thickness(0),
                Padding = new Thickness(4),
                Tag = id
            };

            var row = new Grid { ColumnSpacing = 10, Padding = new Thickness(4, 4, 4, 4) };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(42) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border avatar = CreateAvatarBorder(profile.String("avatar_url"), 42);
            row.Children.Add(avatar);

            var info = new StackPanel();
            Grid.SetColumn(info, 1);

            info.Children.Add(new TextBlock
            {
                Text = profile.String("username", "RuckuZ User"),
                FontFamily = RuckuZFont(),
                FontSize = 14,
                FontWeight = Microsoft.UI.Text.FontWeights.Bold,
                Foreground = BrushFor("primary"),
                TextTrimming = TextTrimming.CharacterEllipsis
            });

            info.Children.Add(new TextBlock
            {
                Text = online ? "Online" : "offline",
                FontFamily = RuckuZFont(),
                FontSize = 12,
                Foreground = online
                    ? new SolidColorBrush(Windows.UI.Color.FromArgb(255, 46, 159, 90))
                    : BrushFor("muted")
            });

            string status = profile.String("status_text").Trim();
            if (!string.IsNullOrWhiteSpace(status))
            {
                info.Children.Add(new TextBlock
                {
                    Text = status,
                    FontFamily = RuckuZFont(),
                    FontSize = 12,
                    Foreground = BrushFor("muted"),
                    TextTrimming = TextTrimming.CharacterEllipsis
                });
            }

            row.Children.Add(info);
            button.Content = row;
            button.Click += async (_, _) => await OpenProfileAsync(id);

            MembersListPanel.Children.Add(button);
        }

        await Task.CompletedTask;
    }

    private void RefreshSelfPanel()
    {
        string username = myProfile.String(
            "username",
            SupabaseService.Instance.Client.Auth.CurrentUser?.Email ?? "RuckuZ User"
        );

        SelfUsername.Text = username;

        string status = myProfile.String("status_text").Trim();
        SelfStatus.Text = string.IsNullOrWhiteSpace(status)
            ? "Online"
            : status;

        string avatar = myProfile.String("avatar_url");
        SelfAvatar.Source = string.IsNullOrWhiteSpace(avatar)
            ? AppBitmap("Assets/avatars/ruckuz.png")
            : new BitmapImage(new Uri(avatar));
    }

    private async Task StartRealtimeAsync()
    {
        string? accessToken = SupabaseService.Instance.Client.Auth.CurrentSession?.AccessToken;
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            SupabaseService.Instance.Client.Realtime.SetAuth(accessToken);
        }

        messagesRealtimeChannel = SupabaseService.Instance.Client.Realtime.Channel("ruckuz-windows-messages");
        messagesRealtimeChannel.Register(
            new PostgresChangesOptions("public", "messages", PostgresChangesOptions.ListenType.All)
        );
        messagesRealtimeChannel.AddPostgresChangeHandler(
            PostgresChangesOptions.ListenType.All,
            (_, _) => QueueMessagesReload()
        );
        await messagesRealtimeChannel.Subscribe();

        profilesRealtimeChannel = SupabaseService.Instance.Client.Realtime.Channel("ruckuz-windows-profiles");
        profilesRealtimeChannel.Register(
            new PostgresChangesOptions("public", "profiles", PostgresChangesOptions.ListenType.All)
        );
        profilesRealtimeChannel.AddPostgresChangeHandler(
            PostgresChangesOptions.ListenType.All,
            (_, _) => QueueMembersReload()
        );
        await profilesRealtimeChannel.Subscribe();

        socialRealtimeChannel = SupabaseService.Instance.Client.Realtime.Channel("ruckuz-windows-social");
        socialRealtimeChannel.Register(
            new PostgresChangesOptions("public", "friend_requests", PostgresChangesOptions.ListenType.All)
        );
        socialRealtimeChannel.Register(
            new PostgresChangesOptions("public", "friends", PostgresChangesOptions.ListenType.All)
        );
        socialRealtimeChannel.AddPostgresChangeHandler(
            PostgresChangesOptions.ListenType.All,
            (_, _) => QueueSocialReload()
        );
        await socialRealtimeChannel.Subscribe();

        presenceChannel = SupabaseService.Instance.Client.Realtime.Channel("ruckuz-presence");
        presenceTracker = presenceChannel.Register<UserPresence>(currentUserId);

        presenceTracker.AddPresenceEventHandler(
            IRealtimePresence.EventType.Sync,
            (_, _) => QueuePresenceRefresh()
        );
        presenceTracker.AddPresenceEventHandler(
            IRealtimePresence.EventType.Join,
            (_, _) => QueuePresenceRefresh()
        );
        presenceTracker.AddPresenceEventHandler(
            IRealtimePresence.EventType.Leave,
            (_, _) => QueuePresenceRefresh()
        );

        await presenceChannel.Subscribe();
        await presenceTracker.Track(
            new UserPresence
            {
                UserId = currentUserId,
                OnlineAt = DateTimeOffset.UtcNow.ToString("O")
            }
        );

        RefreshPresenceState();
    }

    private async Task StopRealtimeAsync()
    {
        try
        {
            if (presenceTracker != null)
            {
                await presenceTracker.Untrack();
            }
        }
        catch
        {
        }

        try { messagesRealtimeChannel?.Unsubscribe(); } catch { }
        try { profilesRealtimeChannel?.Unsubscribe(); } catch { }
        try { socialRealtimeChannel?.Unsubscribe(); } catch { }
        try { presenceChannel?.Unsubscribe(); } catch { }

        messagesRealtimeChannel = null;
        profilesRealtimeChannel = null;
        socialRealtimeChannel = null;
        presenceChannel = null;
        presenceTracker = null;
    }

    private void QueueMessagesReload()
    {
        DispatcherQueue.TryEnqueue(async () =>
        {
            if (messagesReloadQueued)
            {
                return;
            }

            messagesReloadQueued = true;
            await Task.Delay(120);

            try
            {
                await LoadMessagesAsync();
            }
            catch (Exception exception)
            {
                System.Diagnostics.Debug.WriteLine(exception);
            }
            finally
            {
                messagesReloadQueued = false;
            }
        });
    }

    private void QueueMembersReload()
    {
        DispatcherQueue.TryEnqueue(async () =>
        {
            if (membersReloadQueued)
            {
                return;
            }

            membersReloadQueued = true;
            await Task.Delay(150);

            try
            {
                await LoadProfilesAsync();
                await LoadMemberProfilesAsync();
                RefreshSelfPanel();
                await RenderMemberListAsync();
            }
            catch (Exception exception)
            {
                System.Diagnostics.Debug.WriteLine(exception);
            }
            finally
            {
                membersReloadQueued = false;
            }
        });
    }

    private void QueueSocialReload()
    {
        DispatcherQueue.TryEnqueue(async () =>
        {
            if (socialReloadQueued)
            {
                return;
            }

            socialReloadQueued = true;
            await Task.Delay(150);

            try
            {
                await RefreshSocialCountsAsync();
            }
            catch (Exception exception)
            {
                System.Diagnostics.Debug.WriteLine(exception);
            }
            finally
            {
                socialReloadQueued = false;
            }
        });
    }

    private void QueuePresenceRefresh()
    {
        DispatcherQueue.TryEnqueue(async () =>
        {
            RefreshPresenceState();
            await RenderMemberListAsync();
            RefreshSelfPanel();
        });
    }

    private void RefreshPresenceState()
    {
        onlineUsers.Clear();

        if (presenceTracker == null)
        {
            return;
        }

        foreach (List<UserPresence> presences in presenceTracker.CurrentState.Values)
        {
            foreach (UserPresence presence in presences)
            {
                if (!string.IsNullOrWhiteSpace(presence.UserId))
                {
                    onlineUsers.Add(presence.UserId);
                }
            }
        }

        onlineUsers.Add(currentUserId);
    }
}
