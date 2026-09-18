using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Shapes;

namespace RuckuZ_Windows;

public partial class App : Application
{
    private Window? _window;
    
    public App()
    {
        InitializeComponent();

        UnhandledException +=
            App_UnhandledException;
    }

    protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        _window.Activate();
    }

    private void App_UnhandledException(
        object sender,
        Microsoft.UI.Xaml.UnhandledExceptionEventArgs e
    )
    {
        try
        {
            string folder =
                System.IO.Path.Combine(
                    Environment.GetFolderPath(
                        Environment.SpecialFolder
                            .LocalApplicationData
                    ),
                    "RuckuZ"
                );

            System.IO.Directory
                .CreateDirectory(
                    folder
                );

            string crashFile =
                System.IO.Path.Combine(
                    folder,
                    "crash.log"
                );

            System.IO.File
                .WriteAllText(
                    crashFile,
                    e.Exception.ToString()
                );
        }
        catch
        {
        }

        e.Handled =
            false;
    }
}
