import pusher
from decouple import config

class NotificationService:
    _pusher_client = None

    @classmethod
    def get_pusher_client(cls):
        if not cls._pusher_client:
            cls._pusher_client = pusher.Pusher(
                app_id=config("PUSHER_APP_ID"),
                key=config("PUSHER_KEY"),
                secret=config("PUSHER_SECRET"),
                cluster=config("PUSHER_CLUSTER"),
                ssl=True
            )
        return cls._pusher_client

    @classmethod
    def notify_user_evaluation_complete(cls, user_id, round_type, result_data):
        """
        Publishes an 'evaluation_completed' event to the user's private channel.
        :param user_id: ID of the user receiving the notification.
        :param round_type: 'technical', 'hr', 'coding', 'final_report'
        :param result_data: Dictionary containing event data (e.g. session_id, status)
        """
        channel_name = f'user-{user_id}'
        event_name = 'evaluation_completed'
        
        payload = {
            'round_type': round_type,
            'data': result_data
        }
        
        try:
            client = cls.get_pusher_client()
            if not client:
                print("[NotificationService] Pusher credentials missing. Skipping notification.")
                return False
                
            client.trigger(channel_name, event_name, payload)
            print(f"[NotificationService] Sent {event_name} to {channel_name}")
            return True
        except Exception as e:
            print(f"[NotificationService] Failed to send notification: {str(e)}")
            return False