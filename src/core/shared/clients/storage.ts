import { STORAGE_BUCKET_NAME } from '@/configs/storage'
import { supabaseAdmin } from './supabase/admin'

type StorageFileObject = NonNullable<
  Awaited<ReturnType<ReturnType<typeof supabaseAdmin.storage.from>['list']>>['data']
>[number]

export async function uploadFile(
  fileBuffer: Buffer,
  destination: string,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
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

export async function getFiles(folderPath: string): Promise<StorageFileObject[]> {
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

export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET_NAME)
    .remove([filePath])

  if (error) {
    throw new Error(`Error deleting file: ${error.message}`)
  }
}

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
