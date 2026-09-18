using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using RuckuZ_Windows.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace RuckuZ_Windows;

public sealed partial class MainWindow
{
    private async Task<JsonArray> LoadFriendRowsAsync()
    {
        string user = Uri.EscapeDataString(currentUserId);
        return await Api.GetArrayAsync(
            "friends",
            $"select=*&or=(user_id.eq.{user},friend_id.eq.{user})"
        );
    }

    private async Task<JsonArray> LoadPendingFriendRequestsAsync()
    {
        string user = Uri.EscapeDataString(currentUserId);
        return await Api.GetArrayAsync(
            "friend_requests",
            $"select=*&receiver_id=eq.{user}&status=eq.pending&order=created_at.desc"
        );
    }

    private async Task<JsonArray> LoadAllPendingRequestsForMeAsync()
    {
        string user = Uri.EscapeDataString(currentUserId);
        return await Api.GetArrayAsync(
            "friend_requests",
            $"select=*&or=(sender_id.eq.{user},receiver_id.eq.{user})&status=eq.pending"
        );
    }

    private async Task RefreshSocialCountsAsync()
    {
        JsonArray friends = await LoadFriendRowsAsync();
        JsonArray requests = await LoadPendingFriendRequestsAsync();

        HashSet<string> friendIds = GetFriendIds(friends);

        FriendsButtonText.Text = $"Friends {friendIds.Count}";
        RequestsButtonText.Text = $"Requests {requests.Count}";
    }

    private HashSet<string> GetFriendIds(JsonArray rows)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);

        foreach (JsonNode? node in rows)
        {
            if (node is not JsonObject row)
            {
                continue;
            }

            string userId = row.String("user_id");
            string friendId = row.String("friend_id");

            if (userId == currentUserId && !string.IsNullOrWhiteSpace(friendId))
            {
                result.Add(friendId);
            }
            else if (friendId == currentUserId && !string.IsNullOrWhiteSpace(userId))
            {
                result.Add(userId);
            }
        }

        return result;
    }

    private async void FriendsButton_Click(object sender, RoutedEventArgs e)
    {
        await ShowFriendsDialogAsync();
    }

    private async Task ShowFriendsDialogAsync()
    {
        JsonArray rows = await LoadFriendRowsAsync();
        HashSet<string> friendIds = GetFriendIds(rows);

        var list = new StackPanel
        {
            Spacing = 8,
            MinWidth = 430
        };

        ContentDialog? dialog = null;

        if (friendIds.Count == 0)
        {
            list.Children.Add(new TextBlock
            {
                Text = "You don't have any friends yet!",
                FontFamily = RuckuZFont(),
                FontSize = 17,
                Foreground = BrushFor("muted")
            });
        }
        else
        {
            foreach (string id in friendIds.OrderBy(id => profiles.TryGetValue(id, out JsonObject? p) ? p.String("username") : id))
            {
                if (!profiles.TryGetValue(id, out JsonObject? profile))
                {
                    continue;
                }

                Button row = CreateProfileRowButton(profile);
                row.Click += async (_, _) =>
                {
                    dialog?.Hide();
                    await OpenProfileAsync(id);
                };
                list.Children.Add(row);
            }
        }

        dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = $"Friends ({friendIds.Count})",
            Content = new ScrollViewer
            {
                MaxHeight = 520,
                Content = list
            },
            CloseButtonText = "Close"
        };

        await dialog.ShowAsync();
    }

    private async void RequestsButton_Click(object sender, RoutedEventArgs e)
    {
        await ShowRequestsDialogAsync();
    }

    private async Task ShowRequestsDialogAsync()
    {
        JsonArray requests = await LoadPendingFriendRequestsAsync();

        var list = new StackPanel
        {
            Spacing = 10,
            MinWidth = 500
        };

        if (requests.Count == 0)
        {
            list.Children.Add(new TextBlock
            {
                Text = "No pending friend requests.",
                FontFamily = RuckuZFont(),
                FontSize = 17,
                Foreground = BrushFor("muted")
            });
        }

        foreach (JsonNode? node in requests)
        {
            if (node is not JsonObject request)
            {
                continue;
            }

            string requestId = request.String("id");
            string senderId = request.String("sender_id");
            profiles.TryGetValue(senderId, out JsonObject? senderProfile);

            var row = new Grid
            {
                ColumnSpacing = 10,
                Padding = new Thickness(4)
            };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) });

            var profilePart = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Spacing = 10
            };
            profilePart.Children.Add(CreateAvatarBorder(senderProfile.String("avatar_url"), 42));
            profilePart.Children.Add(new TextBlock
            {
                Text = senderProfile.String("username", "RuckuZ User"),
                VerticalAlignment = VerticalAlignment.Center,
                FontFamily = RuckuZFont(),
                FontSize = 17,
                Foreground = BrushFor("primary")
            });
            Grid.SetColumn(profilePart, 0);
            row.Children.Add(profilePart);

            Button accept = CreateDrawnButton("Accept", 94, 44);
            Grid.SetColumn(accept, 1);
            accept.Click += async (_, _) =>
            {
                accept.IsEnabled = false;
                await Api.PostAsync(
                    "friends",
                    new
                    {
                        user_id = senderId,
                        friend_id = currentUserId
                    }
                );
                await Api.PatchAsync(
                    "friend_requests",
                    $"id=eq.{Uri.EscapeDataString(requestId)}&receiver_id=eq.{Uri.EscapeDataString(currentUserId)}",
                    new { status = "accepted" }
                );
                row.Visibility = Visibility.Collapsed;
                await RefreshSocialCountsAsync();
            };
            row.Children.Add(accept);

            Button decline = CreateDrawnButton("Decline", 94, 44);
            Grid.SetColumn(decline, 2);
            decline.Click += async (_, _) =>
            {
                decline.IsEnabled = false;
                await Api.PatchAsync(
                    "friend_requests",
                    $"id=eq.{Uri.EscapeDataString(requestId)}&receiver_id=eq.{Uri.EscapeDataString(currentUserId)}",
                    new { status = "declined" }
                );
                row.Visibility = Visibility.Collapsed;
                await RefreshSocialCountsAsync();
            };
            row.Children.Add(decline);

            list.Children.Add(row);
        }

        var dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = $"Friend Requests ({requests.Count})",
            Content = new ScrollViewer
            {
                MaxHeight = 520,
                Content = list
            },
            CloseButtonText = "Close"
        };

        await dialog.ShowAsync();
    }

    private Button CreateProfileRowButton(JsonObject profile)
    {
        var button = new Button
        {
            HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Stretch,
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0)),
            BorderThickness = new Thickness(0),
            Padding = new Thickness(6),
            Tag = profile.String("id")
        };

        var row = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 12
        };
        row.Children.Add(CreateAvatarBorder(profile.String("avatar_url"), 44));
        row.Children.Add(new TextBlock
        {
            Text = profile.String("username", "RuckuZ User"),
            VerticalAlignment = VerticalAlignment.Center,
            FontFamily = RuckuZFont(),
            FontSize = 18,
            Foreground = BrushFor("primary")
        });

        button.Content = row;
        return button;
    }

    private async Task OpenProfileAsync(string userId)
    {
        JsonObject? profile;

        if (!profiles.TryGetValue(userId, out profile))
        {
            profile = await Api.GetSingleAsync(
                "profiles",
                $"select=*&id=eq.{Uri.EscapeDataString(userId)}"
            );
        }

        if (profile == null)
        {
            await ShowMessageAsync("Profile unavailable", "This RuckuZ profile couldn't be loaded.");
            return;
        }

        bool isDeleted = profile.Bool("is_deleted");
        bool isSelf = userId == currentUserId;
        bool online = onlineUsers.Contains(userId);

        var panel = new StackPanel
        {
            Width = 410,
            Spacing = 10,
            HorizontalAlignment = HorizontalAlignment.Center
        };

        panel.Children.Add(CreateAvatarBorder(profile.String("avatar_url"), 92));
        panel.Children.Add(new TextBlock
        {
            Text = profile.String("username", "RuckuZ User"),
            HorizontalAlignment = HorizontalAlignment.Center,
            TextAlignment = TextAlignment.Center,
            FontFamily = RuckuZFont(),
            FontSize = 28,
            FontWeight = Microsoft.UI.Text.FontWeights.Bold,
            Foreground = BrushFor("primary")
        });

        panel.Children.Add(new TextBlock
        {
            Text = isDeleted ? "Deleted account" : profile.String("ruckuz_id", "RuckuZ ID unavailable"),
            HorizontalAlignment = HorizontalAlignment.Center,
            FontFamily = RuckuZFont(),
            FontSize = 14,
            Foreground = BrushFor("muted")
        });

        if (!isDeleted)
        {
            panel.Children.Add(new TextBlock
            {
                Text = online ? "Online" : "Offline",
                HorizontalAlignment = HorizontalAlignment.Center,
                FontFamily = RuckuZFont(),
                FontSize = 15,
                Foreground = online
                    ? new SolidColorBrush(Windows.UI.Color.FromArgb(255, 46, 159, 90))
                    : BrushFor("muted")
            });

            string customStatus = profile.String("status_text").Trim();
            panel.Children.Add(new TextBlock
            {
                Text = string.IsNullOrWhiteSpace(customStatus) ? "No custom status" : customStatus,
                HorizontalAlignment = HorizontalAlignment.Center,
                TextAlignment = TextAlignment.Center,
                TextWrapping = TextWrapping.Wrap,
                FontFamily = RuckuZFont(),
                FontSize = 17,
                Foreground = BrushFor("text")
            });

            panel.Children.Add(new TextBlock
            {
                Text = "RuckuZ Member",
                HorizontalAlignment = HorizontalAlignment.Center,
                FontFamily = RuckuZFont(),
                FontSize = 14,
                Foreground = BrushFor("muted")
            });
        }

        ContentDialog? dialog = null;

        if (!isDeleted && !isSelf)
        {
            var actions = new Grid
            {
                ColumnSpacing = 12,
                Margin = new Thickness(0, 8, 0, 0)
            };
            actions.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actions.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Button messageButton = CreateDrawnButton("Message", 180, 50);
            messageButton.IsEnabled = false;
            Grid.SetColumn(messageButton, 0);
            actions.Children.Add(messageButton);

            Button friendButton = CreateDrawnButton("Add Friend", 180, 50);
            Grid.SetColumn(friendButton, 1);
            actions.Children.Add(friendButton);

            string friendState = await GetFriendStateAsync(userId);
            switch (friendState)
            {
                case "friends":
                    SetDrawnButtonText(friendButton, "Friends");
                    friendButton.IsEnabled = false;
                    break;
                case "sent":
                    SetDrawnButtonText(friendButton, "Request Sent");
                    friendButton.IsEnabled = false;
                    break;
                case "received":
                    SetDrawnButtonText(friendButton, "Request Received");
                    friendButton.IsEnabled = false;
                    break;
                default:
                    friendButton.Click += async (_, _) =>
                    {
                        friendButton.IsEnabled = false;
                        SetDrawnButtonText(friendButton, "Sending...");

                        try
                        {
                            await Api.PostAsync(
                                "friend_requests",
                                new
                                {
                                    sender_id = currentUserId,
                                    receiver_id = userId
                                }
                            );
                            SetDrawnButtonText(friendButton, "Request Sent");
                            await RefreshSocialCountsAsync();
                        }
                        catch
                        {
                            friendButton.IsEnabled = true;
                            SetDrawnButtonText(friendButton, "Couldn't Send");
                        }
                    };
                    break;
            }

            panel.Children.Add(actions);
        }

        dialog = new ContentDialog
        {
            XamlRoot = RootGrid.XamlRoot,
            Title = isDeleted ? "Deleted Account" : "Profile",
            Content = panel,
            CloseButtonText = "Close"
        };

        await dialog.ShowAsync();
    }

    private async Task<string> GetFriendStateAsync(string otherUserId)
    {
        JsonArray friendRows = await LoadFriendRowsAsync();
        HashSet<string> friendIds = GetFriendIds(friendRows);
        if (friendIds.Contains(otherUserId))
        {
            return "friends";
        }

        JsonArray requests = await LoadAllPendingRequestsForMeAsync();
        foreach (JsonNode? node in requests)
        {
            if (node is not JsonObject request)
            {
                continue;
            }

            string sender = request.String("sender_id");
            string receiver = request.String("receiver_id");

            if (sender == currentUserId && receiver == otherUserId)
            {
                return "sent";
            }

            if (sender == otherUserId && receiver == currentUserId)
            {
                return "received";
            }
        }

        return "none";
    }
}
