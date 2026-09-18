using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using RuckuZ_Windows.Models;
using RuckuZ_Windows.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace RuckuZ_Windows;

public sealed partial class MainWindow : Window
{
    private bool registerMode;
    private bool authBusy;
    private bool bootStarted;
    private bool appStarted;
    private string currentChannel = "general";
    private string currentUserId = "";
    private JsonObject? myProfile;
    private readonly Dictionary<string, JsonObject> profiles = new(StringComparer.Ordinal);
    private readonly Dictionary<string, JsonObject> memberProfiles = new(StringComparer.Ordinal);
    private readonly HashSet<string> onlineUsers = new(StringComparer.Ordinal);

    public MainWindow()
    {
        InitializeComponent();
        Title = "RuckuZ";

        UpdateAuthMode();
        ResizeWindow(1280, 800);

        Activated += MainWindow_Activated;
        Closed += MainWindow_Closed;
    }

    private void ResizeWindow(int width, int height)
    {
        try
        {
            IntPtr hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
            Microsoft.UI.WindowId windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hwnd);
            Microsoft.UI.Windowing.AppWindow appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);
            appWindow.Resize(new Windows.Graphics.SizeInt32(width, height));
        }
        catch
        {

        }
    }

    private void UpdateTitleBarTheme()
    {
        try
        {
            if (!Microsoft.UI.Windowing.AppWindowTitleBar.IsCustomizationSupported())
            {
                return;
            }

            IntPtr hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
            Microsoft.UI.WindowId windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hwnd);
            Microsoft.UI.Windowing.AppWindow appWindow =
                Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);

            var titleBar = appWindow.TitleBar;

            Windows.UI.Color background = darkMode
                ? Windows.UI.Color.FromArgb(255, 38, 34, 58)
                : Windows.UI.Color.FromArgb(255, 255, 253, 246);

            Windows.UI.Color foreground = darkMode
                ? Windows.UI.Color.FromArgb(255, 245, 240, 255)
                : Windows.UI.Color.FromArgb(255, 48, 37, 79);

            Windows.UI.Color hover = darkMode
                ? Windows.UI.Color.FromArgb(255, 61, 54, 93)
                : Windows.UI.Color.FromArgb(255, 239, 232, 255);

            titleBar.BackgroundColor = background;
            titleBar.ForegroundColor = foreground;
            titleBar.InactiveBackgroundColor = background;
            titleBar.InactiveForegroundColor = foreground;
            titleBar.ButtonBackgroundColor = background;
            titleBar.ButtonForegroundColor = foreground;
            titleBar.ButtonInactiveBackgroundColor = background;
            titleBar.ButtonInactiveForegroundColor = foreground;
            titleBar.ButtonHoverBackgroundColor = hover;
            titleBar.ButtonHoverForegroundColor = foreground;
            titleBar.ButtonPressedBackgroundColor = hover;
            titleBar.ButtonPressedForegroundColor = foreground;
        }
        catch
        {
        }
    }

    private async void MainWindow_Activated(object sender, WindowActivatedEventArgs args)
    {
        if (bootStarted)
        {
            return;
        }

        bootStarted = true;
        await BootAsync();
    }

    private async Task BootAsync()
    {
        LoadingOverlay.Visibility =
            Visibility.Visible;

        LoadingText.Text =
            "Starting RuckuZ...";

        try
        {
            LoadSavedTheme();
            ApplyTheme();

            LoadingText.Text =
                "Checking account...";

            await SupabaseService
                .Instance
                .InitializeAsync();

            var session =
                SupabaseService
                    .Instance
                    .Client
                    .Auth
                    .CurrentSession;

            if (
                session?.User != null
            )
            {
                await EnterAppAsync();

                return;
            }
        }
        catch (
            Exception exception
        )
        {
            System.Diagnostics
                .Debug
                .WriteLine(
                    exception
                );
        }

        LoadingOverlay.Visibility =
            Visibility.Collapsed;

        AuthView.Visibility =
            Visibility.Visible;

        AppView.Visibility =
            Visibility.Collapsed;
    }

    private async void MainWindow_Closed(object sender, WindowEventArgs args)
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

        try
        {
            SupabaseService.Instance.Client.Auth.Shutdown();
        }
        catch
        {
        }
    }

    private void PasswordInput_PasswordChanged(object sender, RoutedEventArgs e)
    {
        PasswordPlaceholder.Visibility = string.IsNullOrEmpty(PasswordInput.Password)
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    private void UpdateAuthMode()
    {
        if (registerMode)
        {
            UsernameShell.Visibility = Visibility.Visible;
            AuthHeading.Text = "Join RuckuZ";
            AuthIntro.Text = "Create your RuckuZ account.";
            AuthButtonLabel.Text = "Create Account";
            ModeHint.Text = "Already have an account? Login";
            ForgotPasswordButton.Visibility = Visibility.Collapsed;
            LoginTabArt.Opacity = 0.54;
            RegisterTabArt.Opacity = 1;
            LoginTabLabel.Opacity = 0.7;
            RegisterTabLabel.Opacity = 1;
        }
        else
        {
            UsernameShell.Visibility = Visibility.Collapsed;
            AuthHeading.Text = "Welcome back";
            AuthIntro.Text = "Login to your RuckuZ account.";
            AuthButtonLabel.Text = "Login";
            ModeHint.Text = "Don't have an account? Register";
            ForgotPasswordButton.Visibility = Visibility.Visible;
            LoginTabArt.Opacity = 1;
            RegisterTabArt.Opacity = 0.54;
            LoginTabLabel.Opacity = 1;
            RegisterTabLabel.Opacity = 0.7;
        }

        if (!authBusy)
        {
            StatusText.Text = "";
        }
    }

    private void LoginTab_Click(object sender, RoutedEventArgs e)
    {
        if (authBusy)
        {
            return;
        }

        registerMode = false;
        UpdateAuthMode();
    }

    private void RegisterTab_Click(object sender, RoutedEventArgs e)
    {
        if (authBusy)
        {
            return;
        }

        registerMode = true;
        UpdateAuthMode();
    }

    private void ModeHint_Tapped(object sender, Microsoft.UI.Xaml.Input.TappedRoutedEventArgs e)
    {
        if (authBusy)
        {
            return;
        }

        registerMode = !registerMode;
        UpdateAuthMode();
    }

    private void SetAuthBusy(bool busy, string? busyText = null)
    {
        authBusy = busy;

        EmailInput.IsEnabled = !busy;
        PasswordInput.IsEnabled = !busy;
        UsernameInput.IsEnabled = !busy;
        LoginButton.IsEnabled = !busy;
        LoginTabButton.IsEnabled = !busy;
        RegisterTabButton.IsEnabled = !busy;
        ForgotPasswordButton.IsEnabled = !busy;

        AuthButtonLabel.Text = busy && !string.IsNullOrWhiteSpace(busyText)
            ? busyText
            : registerMode ? "Create Account" : "Login";
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        if (authBusy)
        {
            return;
        }

        StatusText.Text = "";

        string email = EmailInput.Text.Trim();
        string password = PasswordInput.Password;
        string username = UsernameInput.Text.Trim();

        if (registerMode)
        {
            if (username.Length < 2 || username.Length > 32)
            {
                StatusText.Text = "Username must be 2 to 32 characters.";
                UsernameInput.Focus(FocusState.Programmatic);
                return;
            }

            if (username.Contains('\n') || username.Contains('\r') || username.Contains('\t'))
            {
                StatusText.Text = "That username contains invalid characters.";
                UsernameInput.Focus(FocusState.Programmatic);
                return;
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            StatusText.Text = "Enter your email.";
            EmailInput.Focus(FocusState.Programmatic);
            return;
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            StatusText.Text = "Enter your password.";
            PasswordInput.Focus(FocusState.Programmatic);
            return;
        }

        try
        {
            await SupabaseService.Instance.InitializeAsync();

            if (registerMode)
            {
                await RegisterAsync(email, password, username);
            }
            else
            {
                await LoginAsync(email, password);
            }
        }
        catch (Exception exception)
        {
            System.Diagnostics.Debug.WriteLine(exception);
            StatusText.Text = GetFriendlyAuthError(exception);
        }
        finally
        {
            SetAuthBusy(false);
        }
    }

    private async Task LoginAsync(string email, string password)
    {
        SetAuthBusy(true, "Logging in...");

        var session = await SupabaseService.Instance.Client.Auth.SignIn(email, password);
        if (session?.User == null)
        {
            throw new InvalidOperationException("Login failed.");
        }

        PasswordInput.Password = "";
        await EnterAppAsync();
    }

    private async Task RegisterAsync(string email, string password, string username)
    {
        SetAuthBusy(true, "Creating account...");

        var options = new Supabase.Gotrue.SignUpOptions
        {
            RedirectTo = "https://ruckuz.org/",
            Data = new Dictionary<string, object>
            {
                ["username"] = username
            }
        };

        await SupabaseService.Instance.Client.Auth.SignUp(email, password, options);

        registerMode = false;
        UpdateAuthMode();

        EmailInput.Text = email;
        PasswordInput.Password = "";
        UsernameInput.Text = "";
        StatusText.Text = "Check your email to verify your RuckuZ account, then log in.";
    }

    private async void ForgotPassword_Click(object sender, RoutedEventArgs e)
    {
        if (authBusy)
        {
            return;
        }

        string email = EmailInput.Text.Trim();
        StatusText.Text = "";

        if (string.IsNullOrWhiteSpace(email))
        {
            StatusText.Text = "Enter your email address first.";
            EmailInput.Focus(FocusState.Programmatic);
            return;
        }

        try
        {
            authBusy = true;
            EmailInput.IsEnabled = false;
            PasswordInput.IsEnabled = false;
            LoginButton.IsEnabled = false;
            LoginTabButton.IsEnabled = false;
            RegisterTabButton.IsEnabled = false;
            ForgotPasswordButton.IsEnabled = false;
            ForgotPasswordButton.Content = "Sending...";

            await SupabaseService.Instance.InitializeAsync();

            var options = new Supabase.Gotrue.ResetPasswordForEmailOptions(email)
            {
                RedirectTo = "https://ruckuz.org/reset-password"
            };

            await SupabaseService.Instance.Client.Auth.ResetPasswordForEmail(options);
            StatusText.Text = "If an account uses that email, a password reset link has been sent.";
        }
        catch (Exception exception)
        {
            System.Diagnostics.Debug.WriteLine(exception);
            StatusText.Text = "Couldn't send the reset email.";
        }
        finally
        {
            authBusy = false;
            EmailInput.IsEnabled = true;
            PasswordInput.IsEnabled = true;
            LoginButton.IsEnabled = true;
            LoginTabButton.IsEnabled = true;
            RegisterTabButton.IsEnabled = true;
            ForgotPasswordButton.IsEnabled = true;
            ForgotPasswordButton.Content = "Forgot password?";
        }
    }

    private async Task EnterAppAsync()
    {
        if (appStarted)
        {
            AuthView.Visibility = Visibility.Collapsed;
            AppView.Visibility = Visibility.Visible;
            LoadingOverlay.Visibility = Visibility.Collapsed;
            return;
        }

        var session = SupabaseService.Instance.Client.Auth.CurrentSession;
        if (session?.User == null)
        {
            throw new InvalidOperationException("The RuckuZ session is missing.");
        }

        appStarted = true;
        currentUserId = session.User.Id ?? "";

        AuthView.Visibility = Visibility.Collapsed;
        AppView.Visibility = Visibility.Visible;
        LoadingOverlay.Visibility = Visibility.Visible;

        try
        {
            LoadingText.Text = "Loading profile...";
            await LoadProfilesAsync();
            await LoadMemberProfilesAsync();

            LoadingText.Text = "Loading messages...";
            await LoadMessagesAsync();

            LoadingText.Text = "Loading friends...";
            await RefreshSocialCountsAsync();

            LoadingText.Text = "Connecting live updates...";
            await StartRealtimeAsync();

            StartTimestampTimer();
            RefreshSelfPanel();
            await RenderMemberListAsync();
        }
        catch (Exception exception)
        {
            System.Diagnostics.Debug.WriteLine(exception);
            await ShowMessageAsync(
                "RuckuZ couldn't finish loading",
                exception.Message
            );
        }
        finally
        {
            LoadingOverlay.Visibility = Visibility.Collapsed;
        }
    }

    private async Task ReturnToAuthAsync()
    {
        await StopRealtimeAsync();

        appStarted = false;
        currentUserId = "";
        myProfile = null;
        profiles.Clear();
        memberProfiles.Clear();
        onlineUsers.Clear();
        MessagesPanel.Children.Clear();
        MembersListPanel.Children.Clear();

        AppView.Visibility = Visibility.Collapsed;
        AuthView.Visibility = Visibility.Visible;
        LoadingOverlay.Visibility = Visibility.Collapsed;

        PasswordInput.Password = "";
        StatusText.Text = "";
        registerMode = false;
        UpdateAuthMode();
    }

    private static string GetFriendlyAuthError(Exception exception)
    {
        string message = exception.Message;
        string lowerMessage = message.ToLowerInvariant();

        if (lowerMessage.Contains("invalid login credentials"))
        {
            return "Incorrect email or password.";
        }

        if (lowerMessage.Contains("email not confirmed"))
        {
            return "Verify your email before logging in.";
        }

        if (lowerMessage.Contains("user already registered"))
        {
            return "An account already uses that email.";
        }

        if (lowerMessage.Contains("unable to validate email"))
        {
            return "Enter a valid email address.";
        }

        return message;
    }

    private async Task ShowMessageAsync(string title, string message)
    {
        var dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = title,
            Content = new TextBlock
            {
                Text = message,
                TextWrapping = TextWrapping.Wrap,
                FontFamily = RuckuZFont(),
                FontSize = 16
            },
            CloseButtonText = "OK"
        };

        await dialog.ShowAsync();
    }

    private async Task<bool> ShowConfirmAsync(string title, string message, string confirmText)
    {
        var dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = title,
            Content = new TextBlock
            {
                Text = message,
                TextWrapping = TextWrapping.Wrap,
                FontFamily = RuckuZFont(),
                FontSize = 16
            },
            PrimaryButtonText = confirmText,
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close
        };

        ContentDialogResult result = await dialog.ShowAsync();
        return result == ContentDialogResult.Primary;
    }

    private Microsoft.UI.Xaml.Media.FontFamily RuckuZFont()
    {
        return new Microsoft.UI.Xaml.Media.FontFamily(
            "ms-appx:///Assets/AprilshandwritingRegular-mpGj.otf#Aprils Handwriting"
        );
    }
}
