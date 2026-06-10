import cloudinary.uploader


class CloudinaryService:

    @staticmethod
    def upload_profile_image(file):

        result = cloudinary.uploader.upload(
            file,
            folder="profile_images",
            resource_type="image"
        )

        return result["secure_url"]

    @staticmethod
    def upload_resume(file):

        result = cloudinary.uploader.upload(
            file,
            folder="resumes",
            resource_type="raw"
        )

        return result["secure_url"]