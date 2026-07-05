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
    def upload_audio(file, session_id, round_type):
        """
        Upload an audio file to Cloudinary.

        Args:
            file: Django UploadedFile object.
            session_id: UUID of the interview session.
            round_type: "technical" or "hr".

        Returns:
            str: The secure URL of the uploaded audio.
        """
        try:
            result = cloudinary.uploader.upload(
                file,
                folder=f"interviews/{session_id}/{round_type}/audio",
                resource_type="video",  # Cloudinary treats audio as video resource type
                overwrite=True,
                invalidate=True,
            )
            return result["secure_url"]
        except Exception:
            raise ValueError(f"Audio failed to upload for {round_type} round.")
