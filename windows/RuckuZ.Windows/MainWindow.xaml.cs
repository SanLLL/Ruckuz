using Microsoft.UI.Xaml;
using System;
namespace RuckuZ_Windows;

public sealed partial class MainWindow :
    Window
{
    private bool registerMode =
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

        if (
            string.IsNullOrEmpty(
                PasswordInput.Password
            )
        )
        {

            PasswordPlaceholder.Visibility =
                Visibility.Visible;

        }
        else
        {

            PasswordPlaceholder.Visibility =
                Visibility.Collapsed;

        }

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

        StatusText.Text =
            "";

    }

    private void LoginTab_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        registerMode =
            false;
        UpdateAuthMode();

    }

    private void RegisterTab_Click(
        object sender,
        RoutedEventArgs e
    )
    {
        registerMode =
            true;

        UpdateAuthMode();

    }

    private void ForgotPassword_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        StatusText.Text =
            "Password reset connection comes next.";

    }

    private void LoginButton_Click(
        object sender,
        RoutedEventArgs e
    )
    {

        string email =
            EmailInput
                .Text
                .Trim();

        string password =
            PasswordInput
                .Password;

        if (
            registerMode &&
            string.IsNullOrWhiteSpace(
                UsernameInput.Text
            )
        )
        {

            StatusText.Text =
                "Enter a username.";
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

            return;

        }

        if (
            registerMode
        )
        {

            StatusText.Text =
                "RuckuZ registration connection comes next.";

        }
        else
        {

            StatusText.Text =
                "RuckuZ login connection comes next.";

        }
    }
}