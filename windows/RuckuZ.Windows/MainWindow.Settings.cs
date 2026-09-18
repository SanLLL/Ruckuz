using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using RuckuZ_Windows.Models;
using RuckuZ_Windows.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Windows.ApplicationModel.DataTransfer;
using Windows.Storage.Pickers;

namespace RuckuZ_Windows;

public sealed partial class MainWindow
{
    private bool darkMode;
    private static string PreferencesFolder
    {
        get
        {
            string path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "RuckuZ"
            );
            Directory.CreateDirectory(path);
            return path;
        }
    }

    private static string ThemePath => Path.Combine(PreferencesFolder, "theme.txt");
    private void LoadSavedTheme()
    {
        try
        {
            darkMode = File.Exists(ThemePath) &&
                       string.Equals(File.ReadAllText(ThemePath).Trim(), "dark", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            darkMode = false;
        }
    }

    private void SaveTheme()
    {
        try
        {
            File.WriteAllText(ThemePath, darkMode ? "dark" : "light");
        }
        catch
        {
        }
    }

    private string ThemeAsset(string category, string lightName, string darkName)
    {
        string name = darkMode ? darkName : lightName;
        return $"Assets/{category}/{(darkMode ? "dark" : "light")}/{name}";
    }

    private BitmapImage AppBitmap(string relativePath)
    {
        return new BitmapImage(new Uri($"ms-appx:///{relativePath.TrimStart('/')}"));
    }

    private SolidColorBrush BrushFor(string kind)
    {
        Windows.UI.Color color = (kind, darkMode) switch
        {
            ("primary", false) => Windows.UI.Color.FromArgb(255, 75, 52, 124),
            ("text", false) => Windows.UI.Color.FromArgb(255, 48, 37, 79),
            ("muted", false) => Windows.UI.Color.FromArgb(255, 101, 94, 114),
            ("primary", true) => Windows.UI.Color.FromArgb(255, 222, 207, 255),
            ("text", true) => Windows.UI.Color.FromArgb(255, 245, 240, 255),
            ("muted", true) => Windows.UI.Color.FromArgb(255, 190, 179, 212),
            _ => Windows.UI.Color.FromArgb(255, 107, 88, 184)
        };

        return new SolidColorBrush(color);
    }

    private void ApplyTheme()
    {
        string themeFolder = darkMode ? "dark" : "light";
        string buttonName = darkMode ? "buttondark.png" : "buttonlight.png";
        string inputName = darkMode ? "inputdark.png" : "inputlight.png";

        AuthBackgroundBrush.ImageSource = AppBitmap(darkMode ? "Assets/bg/darknote.png" : "Assets/bg/paper.png");
        AppBackgroundBrush.ImageSource = AppBitmap(darkMode ? "Assets/bg/darknote.png" : "Assets/bg/paper.png");

        AuthBrandPanel.Background = new SolidColorBrush(
            darkMode
                ? Windows.UI.Color.FromArgb(247, 25, 20, 42)
                : Windows.UI.Color.FromArgb(247, 47, 36, 77)
        );

        AuthFormPanel.Background = new SolidColorBrush(
            darkMode
                ? Windows.UI.Color.FromArgb(225, 29, 25, 43)
                : Windows.UI.Color.FromArgb(0, 0, 0, 0)
        );

        SetResourceBrush("RuckuZPrimaryBrush", darkMode ? "#DECFFF" : "#4B347C");
        SetResourceBrush("RuckuZTextBrush", darkMode ? "#F5F0FF" : "#30254F");
        SetResourceBrush("RuckuZMutedBrush", darkMode ? "#BEB3D4" : "#655E72");
        SetResourceBrush("RuckuZAccentBrush", darkMode ? "#8B6CFF" : "#6B58B8");
        SetResourceBrush("RuckuZPanelBrush", darkMode ? "#F41B1829" : "#F7FFFDF6");
        SetResourceBrush("RuckuZHeaderBrush", darkMode ? "#EE211D30" : "#ECFFFDF6");
        SetResourceBrush("RuckuZSelfBrush", darkMode ? "#332B49" : "#EDE5FF");

        LoginTabArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        RegisterTabArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        AuthMainButtonArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        UsernameInputArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{inputName}");
        EmailInputArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{inputName}");
        PasswordInputArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{inputName}");

        RequestsButtonArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        FriendsButtonArt.Source = AppBitmap(
            darkMode
                ? "Assets/buttons/dark/buttondark.png"
                : "Assets/buttons/buttonwhite.png"
        );
        SettingsButtonArt.Source = AppBitmap(
            darkMode
                ? "Assets/buttons/dark/themedark.png"
                : "Assets/buttons/light/themelight.png"
        );

        GeneralChannelArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        MemeChannelArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        MediaChannelArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");
        GamingChannelArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{buttonName}");

        MediaButtonArt.Source = AppBitmap(darkMode ? "Assets/buttons/dark/mediadark.png" : "Assets/buttons/light/medialight.png");
        ComposerInputArt.Source = AppBitmap($"Assets/buttons/{themeFolder}/{inputName}");
        SendButtonArt.Source = AppBitmap(darkMode ? "Assets/buttons/dark/senddark.png" : "Assets/buttons/light/sendlight.png");
        EmojiButtonArt.Source = AppBitmap(darkMode ? "Assets/buttons/dark/emojidark.png" : "Assets/buttons/light/emojilight.png");

        RootGrid.RequestedTheme = darkMode ? ElementTheme.Dark : ElementTheme.Light;
        UpdateDynamicThemeArt(RootGrid);
    }

    private void SetResourceBrush(string key, string color)
    {
        if (RootGrid.Resources[key] is SolidColorBrush brush)
        {
            brush.Color = ParseColor(color);
        }
    }

    private static Windows.UI.Color ParseColor(string hex)
    {
        string value = hex.TrimStart('#');
        byte a = 255;
        int offset = 0;

        if (value.Length == 8)
        {
            a = Convert.ToByte(value.Substring(0, 2), 16);
            offset = 2;
        }

        byte r = Convert.ToByte(value.Substring(offset, 2), 16);
        byte g = Convert.ToByte(value.Substring(offset + 2, 2), 16);
        byte b = Convert.ToByte(value.Substring(offset + 4, 2), 16);
        return Windows.UI.Color.FromArgb(a, r, g, b);
    }

    private void UpdateDynamicThemeArt(DependencyObject root)
    {
        int count = VisualTreeHelper.GetChildrenCount(root);
        for (int i = 0; i < count; i++)
        {
            DependencyObject child = VisualTreeHelper.GetChild(root, i);

            if (child is Image image && image.Tag is string tag)
            {
                if (tag == "drawn-button-art")
                {
                    image.Source = AppBitmap(
                        darkMode
                            ? "Assets/buttons/dark/buttondark.png"
                            : "Assets/buttons/light/buttonlight.png"
                    );
                }
                else if (tag == "drawn-input-art")
                {
                    image.Source = AppBitmap(
                        darkMode
                            ? "Assets/buttons/dark/inputdark.png"
                            : "Assets/buttons/light/inputlight.png"
                    );
                }
            }

            UpdateDynamicThemeArt(child);
        }
    }

    private Button CreateDrawnButton(string text, double width, double height)
    {
        var art = new Image
        {
            Tag = "drawn-button-art",
            Source = AppBitmap(
                darkMode
                    ? "Assets/buttons/dark/buttondark.png"
                    : "Assets/buttons/light/buttonlight.png"
            ),
            Stretch = Stretch.Fill
        };

        var label = new TextBlock
        {
            Text = text,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            TextAlignment = TextAlignment.Center,
            TextWrapping = TextWrapping.Wrap,
            FontFamily = RuckuZFont(),
            FontSize = 16,
            Foreground = BrushFor("primary")
        };

        var grid = new Grid();
        grid.Children.Add(art);
        grid.Children.Add(label);

        return new Button
        {
            Width = width,
            Height = height,
            Padding = new Thickness(0),
            BorderThickness = new Thickness(0),
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            Content = grid
        };
    }

    private void SetDrawnButtonText(Button button, string text)
    {
        if (button.Content is not Grid grid)
        {
            return;
        }

        foreach (UIElement child in grid.Children)
        {
            if (child is TextBlock label)
            {
                label.Text = text;
                return;
            }
        }
    }

    private Grid CreateThemedTextInput(string value, string placeholder, int maxLength, out TextBox textBox)
    {
        var grid = new Grid
        {
            Height = 58
        };

        grid.Children.Add(new Image
        {
            Tag = "drawn-input-art",
            Source = AppBitmap(
                darkMode
                    ? "Assets/buttons/dark/inputdark.png"
                    : "Assets/buttons/light/inputlight.png"
            ),
            Stretch = Stretch.Fill
        });

        textBox = new TextBox
        {
            Text = value,
            PlaceholderText = placeholder,
            MaxLength = maxLength,
            Margin = new Thickness(16, 4, 16, 4),
            Padding = new Thickness(0),
            BorderThickness = new Thickness(0),
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            FontFamily = RuckuZFont(),
            FontSize = 17,
            Foreground = BrushFor("text"),
            VerticalContentAlignment = VerticalAlignment.Center
        };

        grid.Children.Add(textBox);
        return grid;
    }

    private async void SettingsButton_Click(object sender, RoutedEventArgs e)
    {
        await ShowSettingsDialogAsync();
    }

    private async Task ShowSettingsDialogAsync()
    {
        await LoadProfilesAsync();
        RefreshSelfPanel();

        string username = myProfile.String("username", "RuckuZ User");
        string status = myProfile.String("status_text");
        string ruckuzId = myProfile.String("ruckuz_id", "RuckuZ ID unavailable");

        var panel = new StackPanel
        {
            Width = 520,
            Spacing = 12
        };

        var identity = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 12
        };
        identity.Children.Add(CreateAvatarBorder(myProfile.String("avatar_url"), 70));

        var identityText = new StackPanel
        {
            VerticalAlignment = VerticalAlignment.Center
        };
        identityText.Children.Add(new TextBlock
        {
            Text = username,
            FontFamily = RuckuZFont(),
            FontSize = 24,
            FontWeight = Microsoft.UI.Text.FontWeights.Bold,
            Foreground = BrushFor("primary")
        });
        identityText.Children.Add(new TextBlock
        {
            Text = ruckuzId,
            FontFamily = RuckuZFont(),
            FontSize = 14,
            Foreground = BrushFor("muted")
        });
        identity.Children.Add(identityText);
        panel.Children.Add(identity);

        Button changeAvatar = CreateDrawnButton("Change Picture", 190, 48);
        panel.Children.Add(changeAvatar);

        panel.Children.Add(SettingsHeading("Username"));
        panel.Children.Add(new TextBlock
        {
            Text = "Your RuckuZ userID won't change.",
            FontFamily = RuckuZFont(),
            FontSize = 14,
            Foreground = BrushFor("muted")
        });
        Grid usernameShell = CreateThemedTextInput(username, "Username", 32, out TextBox usernameInput);
        panel.Children.Add(usernameShell);
        var usernameCount = SettingsCount(usernameInput.Text.Length, 32);
        panel.Children.Add(usernameCount);
        usernameInput.TextChanged += (_, _) => usernameCount.Text = $"{usernameInput.Text.Length} / 32";
        Button saveUsername = CreateDrawnButton("Save Username", 170, 48);
        panel.Children.Add(saveUsername);

        panel.Children.Add(new Border
        {
            Height = 2,
            Margin = new Thickness(0, 12, 0, 4),
            Background = BrushFor("muted"),
            Opacity = 0.45
        });

        panel.Children.Add(SettingsHeading("Custom Status"));
        panel.Children.Add(new TextBlock
        {
            Text = "This appears on your profile.",
            FontFamily = RuckuZFont(),
            FontSize = 14,
            Foreground = BrushFor("muted")
        });
        Grid statusShell = CreateThemedTextInput(status, "Custom status", 80, out TextBox statusInput);
        panel.Children.Add(statusShell);
        var statusCount = SettingsCount(statusInput.Text.Length, 80);
        panel.Children.Add(statusCount);
        statusInput.TextChanged += (_, _) => statusCount.Text = $"{statusInput.Text.Length} / 80";
        Button saveStatus = CreateDrawnButton("Save Status", 150, 48);
        panel.Children.Add(saveStatus);

        panel.Children.Add(SettingsHeading("RuckuZ ID"));
        var idRow = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 10
        };
        idRow.Children.Add(new TextBlock
        {
            Text = ruckuzId,
            VerticalAlignment = VerticalAlignment.Center,
            FontFamily = RuckuZFont(),
            FontSize = 16,
            Foreground = BrushFor("text")
        });
        Button copyId = CreateDrawnButton("Copy", 90, 42);
        idRow.Children.Add(copyId);
        panel.Children.Add(idRow);

        panel.Children.Add(SettingsHeading("Appearance"));
        Button themeButton = new()
        {
            Width = 88,
            Height = 58,
            Padding = new Thickness(0),
            BorderThickness = new Thickness(0),
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            Content = new Image
            {
                Source = AppBitmap(
                    darkMode
                        ? "Assets/buttons/dark/themedark.png"
                        : "Assets/buttons/light/themelight.png"
                ),
                Stretch = Stretch.Uniform
            }
        };
        panel.Children.Add(themeButton);

        var accountRow = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 16,
            Margin = new Thickness(0, 14, 0, 0)
        };
        Button logout = new()
        {
            Padding = new Thickness(0),
            BorderThickness = new Thickness(0),
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            Content = new Image
            {
                Source = AppBitmap("Assets/buttons/logout.png"),
                Stretch = Stretch.None
            }
        };
        Button delete = new()
        {
            Padding = new Thickness(0),
            BorderThickness = new Thickness(0),
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            Content = new Image
            {
                Source = AppBitmap("Assets/buttons/delete.png"),
                Stretch = Stretch.None
            }
        };
        accountRow.Children.Add(logout);
        accountRow.Children.Add(delete);
        panel.Children.Add(accountRow);

        ContentDialog? dialog = null;

        changeAvatar.Click += async (_, _) => await ChangeAvatarAsync();

        saveUsername.Click += async (_, _) =>
        {
            string next = usernameInput.Text.Trim();
            if (next.Length < 2 || next.Length > 32 || next.Contains('\n') || next.Contains('\r') || next.Contains('\t'))
            {
                await ShowMessageAsync("Username not saved", "Username must be 2 to 32 characters and can't contain line breaks or tabs.");
                return;
            }

            SetDrawnButtonText(saveUsername, "Saving...");
            saveUsername.IsEnabled = false;

            try
            {
                await Api.PatchAsync(
                    "profiles",
                    $"id=eq.{Uri.EscapeDataString(currentUserId)}",
                    new { username = next }
                );

                await SupabaseService.Instance.Client.Auth.Update(
                    new Supabase.Gotrue.UserAttributes
                    {
                        Data = new Dictionary<string, object>
                        {
                            ["username"] = next
                        }
                    }
                );

                if (myProfile != null)
                {
                    myProfile["username"] = next;
                }
                if (profiles.TryGetValue(currentUserId, out JsonObject? profile))
                {
                    profile["username"] = next;
                }
                if (memberProfiles.TryGetValue(currentUserId, out JsonObject? member))
                {
                    member["username"] = next;
                }

                RefreshSelfPanel();
                await RenderMemberListAsync();
                SetDrawnButtonText(saveUsername, "Username changed");
            }
            catch (Exception exception)
            {
                await ShowMessageAsync("Username not saved", exception.Message);
                SetDrawnButtonText(saveUsername, "Save Username");
            }
            finally
            {
                saveUsername.IsEnabled = true;
            }
        };

        saveStatus.Click += async (_, _) =>
        {
            string next = statusInput.Text.Trim();
            SetDrawnButtonText(saveStatus, "Saving...");
            saveStatus.IsEnabled = false;

            try
            {
                await Api.PatchAsync(
                    "profiles",
                    $"id=eq.{Uri.EscapeDataString(currentUserId)}",
                    new { status_text = next }
                );

                if (myProfile != null)
                {
                    myProfile["status_text"] = next;
                }
                if (profiles.TryGetValue(currentUserId, out JsonObject? profile))
                {
                    profile["status_text"] = next;
                }
                if (memberProfiles.TryGetValue(currentUserId, out JsonObject? member))
                {
                    member["status_text"] = next;
                }

                RefreshSelfPanel();
                await RenderMemberListAsync();
                SetDrawnButtonText(saveStatus, "Status saved");
            }
            catch (Exception exception)
            {
                await ShowMessageAsync("Status not saved", exception.Message);
                SetDrawnButtonText(saveStatus, "Save Status");
            }
            finally
            {
                saveStatus.IsEnabled = true;
            }
        };

        copyId.Click += (_, _) =>
        {
            var package = new DataPackage();
            package.SetText(ruckuzId);
            Clipboard.SetContent(package);
            SetDrawnButtonText(copyId, "Copied");
        };

        themeButton.Click += (_, _) =>
        {
            darkMode = !darkMode;
            SaveTheme();
            ApplyTheme();
            if (themeButton.Content is Image image)
            {
                image.Source = AppBitmap(
                    darkMode
                        ? "Assets/buttons/dark/themedark.png"
                        : "Assets/buttons/light/themelight.png"
                );
            }
        };

        logout.Click += async (_, _) =>
        {
            dialog?.Hide();
            bool confirmed = await ShowConfirmAsync("Logout?", "Sign out of RuckuZ on this PC?", "Logout");
            if (!confirmed)
            {
                return;
            }

            await SupabaseService.Instance.Client.Auth.SignOut();
            await ReturnToAuthAsync();
        };

        delete.Click += async (_, _) =>
        {
            dialog?.Hide();
            bool confirmed = await ShowConfirmAsync(
                "Delete Account?",
                "Your account will become a deleted RuckuZ account. Existing messages and media stay in chat.",
                "Delete Account"
            );
            if (!confirmed)
            {
                return;
            }

            LoadingOverlay.Visibility = Visibility.Visible;
            LoadingText.Text = "Deleting account...";

            try
            {
                JsonObject? result = await Api.InvokeFunctionAsync("delete-account");
                if (result != null && result["ok"] is JsonValue okValue && !okValue.GetValue<bool>())
                {
                    throw new InvalidOperationException("RuckuZ couldn't delete the account.");
                }

                await SupabaseService.Instance.Client.Auth.SignOut();
                await ReturnToAuthAsync();
            }
            catch (Exception exception)
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
                await ShowMessageAsync("Account not deleted", exception.Message);
            }
        };

        dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = "Settings",
            Content = new ScrollViewer
            {
                MaxHeight = 620,
                Content = panel
            },
            CloseButtonText = "Close"
        };

        await dialog.ShowAsync();
    }

    private TextBlock SettingsHeading(string text)
    {
        return new TextBlock
        {
            Text = text,
            Margin = new Thickness(0, 8, 0, 0),
            FontFamily = RuckuZFont(),
            FontSize = 23,
            FontWeight = Microsoft.UI.Text.FontWeights.Bold,
            Foreground = BrushFor("primary")
        };
    }

    private TextBlock SettingsCount(int current, int max)
    {
        return new TextBlock
        {
            Text = $"{current} / {max}",
            HorizontalAlignment = HorizontalAlignment.Right,
            Margin = new Thickness(0, -8, 8, 0),
            FontFamily = RuckuZFont(),
            FontSize = 13,
            Foreground = BrushFor("muted")
        };
    }

    private async Task ChangeAvatarAsync()
    {
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".png");
        picker.FileTypeFilter.Add(".jpg");
        picker.FileTypeFilter.Add(".jpeg");
        picker.FileTypeFilter.Add(".webp");
        picker.FileTypeFilter.Add(".gif");
        InitializePicker(picker);

        Windows.Storage.StorageFile? file = await picker.PickSingleFileAsync();
        if (file == null)
        {
            return;
        }

        LoadingOverlay.Visibility = Visibility.Visible;
        LoadingText.Text = "Uploading profile picture...";

        try
        {
            string extension = Path.GetExtension(file.Name);
            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = ".png";
            }

            string remotePath = $"{currentUserId}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            string publicUrl = await Api.UploadPublicFileAsync(
                "avatars",
                remotePath,
                file.Path,
                file.ContentType
            );

            await Api.PatchAsync(
                "profiles",
                $"id=eq.{Uri.EscapeDataString(currentUserId)}",
                new { avatar_url = publicUrl }
            );

            if (myProfile != null)
            {
                myProfile["avatar_url"] = publicUrl;
            }
            if (profiles.TryGetValue(currentUserId, out JsonObject? profile))
            {
                profile["avatar_url"] = publicUrl;
            }
            if (memberProfiles.TryGetValue(currentUserId, out JsonObject? member))
            {
                member["avatar_url"] = publicUrl;
            }

            RefreshSelfPanel();
            await RenderMemberListAsync();
            await LoadMessagesAsync();
        }
        catch (Exception exception)
        {
            await ShowMessageAsync("Picture not changed", exception.Message);
        }
        finally
        {
            LoadingOverlay.Visibility = Visibility.Collapsed;
        }
    }
}
