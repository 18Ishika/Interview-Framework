import cloudinary.uploader


class CloudinaryService:

    @staticmethod
    def upload_video(file, session_id, round_type):
        """
        Upload a video file to Cloudinary.

        Args:
            file: Django UploadedFile object.
            session_id: UUID of the interview session.
            round_type: "technical" or "hr".

        Returns:
            str: The secure URL of the uploaded video.
        """
        try:
            result = cloudinary.uploader.upload(
                file,
                folder=f"interviews/{session_id}/{round_type}/video",
                resource_type="video",
                overwrite=True,
                invalidate=True,
            )
            return result["secure_url"]
        except Exception:
            raise ValueError(f"Video failed to upload for {round_type} round.")

    @staticmethod
    def upload_audio(file, user_id, session_id, round_type):
        """
        Upload an audio file to Cloudinary.

        Args:
            file: Django UploadedFile object.
            user_id: ID of the user.
            session_id: UUID of the interview session.
            round_type: "technical" or "hr".

        Returns:
            str: The secure URL of the uploaded audio.
        """
        try:
            folder_name = "techInt" if round_type == "technical" else "hrInt"
            result = cloudinary.uploader.upload(
                file,
                folder=f"audios/{folder_name}/{user_id}/{session_id}",
                resource_type="video",  # Cloudinary treats audio as video resource type
            )
            return result["secure_url"]
        except Exception:
            raise ValueError(f"Audio failed to upload for {round_type} round.")
