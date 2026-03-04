import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        // Use a Promise to wrap the upload_stream callback
        return await new Promise<NextResponse>((resolve) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { upload_preset: uploadPreset },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload stream error:", error);
                        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
                    } else {
                        resolve(NextResponse.json({ secure_url: result?.secure_url }, { status: 200 }));
                    }
                }
            );

            uploadStream.end(buffer);
        });

    } catch (error: unknown) {
        console.error("Backend Upload Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
