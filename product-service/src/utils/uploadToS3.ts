import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function uploadToS3(productId: string, body: Express.Multer.File) {
  try {

    const extension = body.mimetype.split("/")[1];
    productId = `${productId}.${extension}`;
  
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: `product-images/${productId}`,
      Body: body.buffer,
      ContentType: body.mimetype, // set the content type based on the uploaded file's mimetype
      ContentDisposition: "inline", // this tells the browser to display the image instead of downloading it, it was constantly downloading before because of this
      Metadata: {
      
      }
    });
    await s3Client.send(putObjectCommand);
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/product-images/${productId}`;

  } catch (error) {
    throw new Error("Error uploading to S3");
  }

}
