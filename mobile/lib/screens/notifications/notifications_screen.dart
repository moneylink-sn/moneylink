import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/formatters.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    final response = await ApiClient.get('/notifications');
    if (response.success && response.data != null) {
      setState(() {
        _notifications = response.data as List<dynamic>;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            onPressed: () async {
              await ApiClient.put('/notifications/read-all');
              await _fetchNotifications();
            },
            icon: const Icon(Icons.done_all),
            tooltip: 'Tout marquer comme lu',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(
                  child: Text('Aucune notification pour le moment.'),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final notif = _notifications[index];
                    final isRead = notif['is_read'] == true;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isRead ? Colors.white : const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isRead ? const Color(0xFFE2E8F0) : AppConstants.primary.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isRead ? const Color(0xFFF1F5F9) : AppConstants.primaryLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.notifications_active_outlined,
                              color: isRead ? AppConstants.textSecondary : AppConstants.primaryDark,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  notif['title'] ?? 'Notification',
                                  style: TextStyle(
                                    fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                                    fontSize: 14,
                                    color: AppConstants.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  notif['message'] ?? '',
                                  style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary, height: 1.4),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  Formatters.formatDate(notif['created_at']),
                                  style: const TextStyle(fontSize: 10, color: AppConstants.textLight),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
