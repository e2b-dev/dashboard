import { STORAGE_BUCKET_NAME } from '@/configs/storage'
import { FileObject } from '@supabase/storage-js'
import { supabaseAdmin } from './supabase/admin'

/**
 * Upload a file to Supabase Storage
 * @param fileBuffer - The file buffer to upload
 * @param destination - The destination path in the bucket
 * @param contentType - The content type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  fileBuffer: Buffer,
  destination: string,
  contentType: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(destination, fileBuffer, {
      contentType,
      cacheControl: 'public, max-age=31536000',
      upsert: true,
    })

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`)
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(destination)

  return urlData.publicUrl
}

/**
 * Get a list of files from Supabase Storage
 * @param folderPath - The path of the folder in the bucket
 * @returns The list of files
 */
export async function getFiles(folderPath: string): Promise<FileObject[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .list(folderPath, {
      sortBy: { column: 'name', order: 'asc' },
    })

  if (error) {
    throw new Error(`Error listing files: ${error.message}`)
  }

  return data
}
/**
 * Delete a file from Supabase Storage
 * @param filePath - The path of the file in the bucket
 */
export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .remove([filePath])

  if (error) {
    throw new Error(`Error deleting file: ${error.message}`)
  }
}

/**
 * Get a signed URL for a file (for temporary access)
 * @param filePath - The path of the file in the bucket
 * @param expiresInMinutes - How long the URL should be valid for (in minutes)
 * @returns The signed URL
 */
export async function getSignedUrl(
  filePath: string,
  expiresInMinutes = 15
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .createSignedUrl(filePath, expiresInMinutes * 60)

  if (error) {
    throw new Error(`Error creating signed URL: ${error.message}`)
  }

  return data.signedUrl
}
