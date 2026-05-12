import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadVideoToCloudinary = async (videoUrl: string, title: string) => {
  try {
    const result = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      public_id: `zoom_recordings/${title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`,
      eager: [
        { format: 'mp4', video_codec: 'auto' }
      ],
      eager_async: true,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const getVideoUrl = (publicId: string) => {
  try {
    // Return a permanent URL so students can watch anytime
    const url = cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'mp4',
      secure: true
    });
    return url;
  } catch (error) {
    console.error('Cloudinary URL generation error:', error);
    throw error;
  }
};
