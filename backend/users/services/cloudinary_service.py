import cloudinary.uploader


class CloudinaryService:

    @staticmethod
    def upload_profile_image(file):

        try:
            result = cloudinary.uploader.upload(
                file,
                folder="profile_images",
                resource_type="image"
            )

            return result["secure_url"]
        except Exception as e:
            print(e)
            raise ValueError("Image failed to upload.")

    @staticmethod
    def upload_resume(file):

        try:
            result = cloudinary.uploader.upload(
                file,
                folder="resumes",
                resource_type="raw"
            )

            return result["secure_url"]
        except Exception:
            raise ValueError("Resume failed to upload.")