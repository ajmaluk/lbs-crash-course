export const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch('/api/upload', {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to upload image securely");
        }

        const data = await response.json();
        return data.secure_url; // the persistent HTTPS URL to the uploaded image
    } catch (error) {
        console.error("Cloudinary Secure Upload Error:", error);
        throw error;
    }
};
