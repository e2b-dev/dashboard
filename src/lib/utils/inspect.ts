import { FileContentState } from '@/features/dashboard/sandbox/inspect/filesystem/store'

export type FileEncoding = 'utf-8' | 'binary' | 'image'

export async function determineFileContentState(
  blob: Blob
): Promise<FileContentState> {
  const mimeType = blob.type ?? ''

  if (mimeType.startsWith('image/')) {
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })

    return { encoding: 'image', dataUri }
  }

  const buffer = await blob.arrayBuffer()
  const data = new Uint8Array(buffer)

  try {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(data)
    return { encoding: 'utf-8', content }
  } catch {
    return {
      encoding: 'binary',
      dataUri: `data:application/octet-stream;base64,${btoa(String.fromCharCode(...data))}`,
    }
  }
}
