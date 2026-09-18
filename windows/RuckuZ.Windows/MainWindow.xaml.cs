using Microsoft.UI.Xaml;
using System;
namespace RuckuZ.Windows;
public sealed partial class MainWindow : Window
{

    public MainWindow()
    {

        InitializeComponent();
        Title =
            "RuckuZ";

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

        StatusText.Text =
            "RuckuZ login connection comes next.";
    }
}
