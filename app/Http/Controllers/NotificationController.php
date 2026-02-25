<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Notifications\SystemUpdateNotification;
use App\Models\User;

class NotificationController extends Controller
{
    /**
     * Get the authenticated user's unread and recent notifications.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([], 401);
        }

        return response()->json([
            'unread_count' => $user->unreadNotifications->count(),
            'notifications' => $user->notifications()->take(10)->get()
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([], 401);
        }

        $notification = $user->notifications()->find($id);
        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read for the user.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([], 401);
        }

        $user->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Generate a test system update notification (for demo/admin purposes).
     */
    public function sendTestNotification(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([], 401);
        }

        // Just sending to the current logged-in user for demonstration.
        $user->notify(new SystemUpdateNotification(
            'New System Update!',
            'Version 1.2 has been deployed. Check out the new advanced report filtering features.'
        ));

        return response()->json(['message' => 'Test notification sent!']);
    }

    /**
     * Broadcast a notification to all users (Admin action).
     */
    public function broadcastNotification(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $users = User::all();
        \Illuminate\Support\Facades\Notification::send($users, new SystemUpdateNotification(
            $request->title,
            $request->message
        ));

        return response()->json(['message' => 'Broadcast sent successfully to ' . $users->count() . ' users!']);
    }
}
