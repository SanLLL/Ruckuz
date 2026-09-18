using Microsoft.UI.Xaml;
using RuckuZ_Windows.Services;
using System;
using System.Collections.Generic;

namespace RuckuZ_Windows;

public sealed partial class MainWindow :
    Window
{
    private bool registerMode =
        false;

    private bool authBusy =
        false;

    public MainWindow()
    {

        InitializeComponent();

        Title =
            "RuckuZ";

        UpdateAuthMode();

    }

    private void PasswordInput_PasswordChanged(
        object sender,
        RoutedEventArgs e
    )
    {

        PasswordPlaceholder.Visibility =
            string.IsNullOrEmpty(
                PasswordInput.Password
            )
                ? Visibility.Visible
                : Visibility.Collapsed;

    }

    private void UpdateAuthMode()
    {

        if (
            registerMode
        )
        {

            UsernameShell.Visibility =
                Visibility.Visible;

            AuthHeading.Text =
                "Join RuckuZ";

            AuthIntro.Text =
                "Create your RuckuZ account.";

            AuthButtonLabel.Text =
                "Create Account";

            ModeHint.Text =
                "Already have an account? Login";

            ForgotPasswordButton.Visibility =
                Visibility.Collapsed;

            LoginTabArt.Opacity =
                0.54;

            RegisterTabArt.Opacity =
                1;

        }
        else
        {

            UsernameShell.Visibility =
                Visibility.Collapsed;

            AuthHeading.Text =
                "Welcome back";

            AuthIntro.Text =
                "Login to your RuckuZ account.";

            AuthButtonLabel.Text =
                "Login";

            ModeHint.Text =
                "Don't have an account? Register";

            ForgotPasswordButton.Visibility =
                Visibility.Visible;

            LoginTabArt.Opacity =
                1;

            RegisterTabArt.Opacity =
                0.54;

        }

        if (
            !authBusy
        )
        {

            StatusText.Text =
                "";

        }

    }

    private void LoginTab_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        if (
            authBusy
        )
        {
            return;
        }

        registerMode =
            false;

        UpdateAuthMode();

    }

    private void RegisterTab_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        if (
            authBusy
        )
        {
            return;
        }

        registerMode =
            true;

        UpdateAuthMode();

    }

    private void SetAuthBusy(
        bool busy,
        string? busyText = null
    )
    {

        authBusy =
            busy;

        EmailInput.IsEnabled =
            !busy;

        PasswordInput.IsEnabled =
            !busy;

        UsernameInput.IsEnabled =
            !busy;

        LoginButton.IsEnabled =
            !busy;

        LoginTabButton.IsEnabled =
            !busy;

        RegisterTabButton.IsEnabled =
            !busy;

        ForgotPasswordButton.IsEnabled =
            !busy;

        if (
            busy &&
            !string.IsNullOrWhiteSpace(
                busyText
            )
        )
        {

            AuthButtonLabel.Text =
                busyText;

        }
        else
        {

            AuthButtonLabel.Text =
                registerMode
                    ? "Create Account"
                    : "Login";

        }

    }

    private async void LoginButton_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        if (
            authBusy
        )
        {
            return;
        }

        StatusText.Text =
            "";

        string email =
            EmailInput
                .Text
                .Trim();


        string password =
            PasswordInput
                .Password;


        string username =
            UsernameInput
                .Text
                .Trim();


        if (
            registerMode &&
            string.IsNullOrWhiteSpace(
                username
            )
        )
        {

            StatusText.Text =
                "Enter a username.";

            UsernameInput.Focus(
                FocusState.Programmatic
            );

            return;

        }

        if (
            string.IsNullOrWhiteSpace(
                email
            )
        )
        {

            StatusText.Text =
                "Enter your email.";

            EmailInput.Focus(
                FocusState.Programmatic
            );

            return;

        }

        if (
            string.IsNullOrWhiteSpace(
                password
            )
        )
        {

            StatusText.Text =
                "Enter your password.";

            PasswordInput.Focus(
                FocusState.Programmatic
            );

            return;

        }

        try
        {

            await SupabaseService
                .Instance
                .InitializeAsync();


            if (
                registerMode
            )
            {

                await RegisterAsync(
                    email,
                    password,
                    username
                );

            }
            else
            {

                await LoginAsync(
                    email,
                    password
                );

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


            StatusText.Text =
                GetFriendlyAuthError(
                    exception
                );

        }
        finally
        {

            SetAuthBusy(
                false
            );

        }

    }

    private async System.Threading.Tasks.Task LoginAsync(
        string email,
        string password
    )
    {

        SetAuthBusy(
            true,
            "Logging in..."
        );

        var session =
            await SupabaseService
                .Instance
                .Client
                .Auth
                .SignIn(
                    email,
                    password
                );

        if (
            session?.User == null
        )
        {

            throw new Exception(
                "Login failed."
            );

        }

        string signedInEmail =
            session.User.Email ??
            email;

        AuthHeading.Text =
            "You're in";

        AuthIntro.Text =
            "Signed in as " +
            signedInEmail;

        StatusText.Text =
            "Login successful.";

        PasswordInput.Password =
            "";

    }

    private async System.Threading.Tasks.Task RegisterAsync(
        string email,
        string password,
        string username
    )
    {

        SetAuthBusy(
            true,
            "Creating account..."
        );

        var options =
            new Supabase.Gotrue.SignUpOptions
            {

                RedirectTo =
                    "https://ruckuz.org/",

                Data =
                    new Dictionary<string, object>
                    {
                        {
                            "username",
                            username
                        }
                    }

            };

        await SupabaseService
            .Instance
            .Client
            .Auth
            .SignUp(
                email,
                password,
                options
            );

        registerMode =
            false;

        UpdateAuthMode();

        EmailInput.Text =
            email;

        PasswordInput.Password =
            "";

        UsernameInput.Text =
            "";

        StatusText.Text =
            "Check your email to verify your RuckuZ account, then log in.";

    }

    private async void ForgotPassword_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        if (
            authBusy
        )
        {
            return;
        }

        string email =
            EmailInput
                .Text
                .Trim();

        StatusText.Text =
            "";

        if (
            string.IsNullOrWhiteSpace(
                email
            )
        )
        {

            StatusText.Text =
                "Enter your email address first.";

            EmailInput.Focus(
                FocusState.Programmatic
            );

            return;

        }

        try
        {

            authBusy =
                true;

            EmailInput.IsEnabled =
                false;

            PasswordInput.IsEnabled =
                false;

            LoginButton.IsEnabled =
                false;

            LoginTabButton.IsEnabled =
                false;

            RegisterTabButton.IsEnabled =
                false;

            ForgotPasswordButton.IsEnabled =
                false;

            ForgotPasswordButton.Content =
                "Sending...";

            await SupabaseService
                .Instance
                .InitializeAsync();

            var options =
                new Supabase.Gotrue
                    .ResetPasswordForEmailOptions
                {
                    Email =
                        email,

                    RedirectTo =
                        "https://ruckuz.org/reset-password"
                };

            await SupabaseService
                .Instance
                .Client
                .Auth
                .ResetPasswordForEmail(
                    options
                );

            StatusText.Text =
                "If an account uses that email, a password reset link has been sent.";

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

            StatusText.Text =
                "Couldn't send the reset email.";

        }
        finally
        {

            authBusy =
                false;

            EmailInput.IsEnabled =
                true;

            PasswordInput.IsEnabled =
                true;

            LoginButton.IsEnabled =
                true;

            LoginTabButton.IsEnabled =
                true;

            RegisterTabButton.IsEnabled =
                true;

            ForgotPasswordButton.IsEnabled =
                true;

            ForgotPasswordButton.Content =
                "Forgot password?";

        }

    }

    private static string GetFriendlyAuthError(
        Exception exception
    )
    {

        string message =
            exception.Message;

        string lowerMessage =
            message.ToLowerInvariant();

        if (
            lowerMessage.Contains(
                "invalid login credentials"
            )
        )
        {

            return
                "Incorrect email or password.";

        }

        if (
            lowerMessage.Contains(
                "email not confirmed"
            )
        )
        {

            return
                "Verify your email before logging in.";

        }

        if (
            lowerMessage.Contains(
                "user already registered"
            )
        )
        {

            return
                "An account already uses that email.";

        }

        if (
            lowerMessage.Contains(
                "password"
            ) &&
            lowerMessage.Contains(
                "characters"
            )
        )
        {
            return message;

        }

        if (
            lowerMessage.Contains(
                "unable to validate email"
            )
        )
        {

            return
                "Enter a valid email address.";
        }
        return message;
    }
}