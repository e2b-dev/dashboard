'use client'

import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  maxFiles: number
  currentFileCount: number
  isUploading: boolean
  disabled?: boolean
  accept?: string
}

export default function FileDropZone({
  onFilesSelected,
  maxFiles,
  currentFileCount,
  isUploading,
  disabled = false,
  accept,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const remaining = maxFiles - currentFileCount

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList).slice(0, remaining)
      if (files.length > 0) {
        onFilesSelected(files)
      }
    },
    [onFilesSelected, remaining]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled && remaining > 0) {
        setIsDragOver(true)
      }
    },
    [disabled, remaining]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (!disabled && remaining > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [disabled, remaining, handleFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled && remaining > 0) {
      fileInputRef.current?.click()
    }
  }, [disabled, remaining])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles]
  )

  const isDisabled = disabled || remaining <= 0

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-4 transition-colors cursor-pointer',
        isDragOver && 'border-fg-accent bg-bg-accent/10',
        !isDragOver && !isDisabled && 'border-stroke hover:border-fg-tertiary hover:bg-bg-hover',
        isDisabled && 'cursor-not-allowed opacity-50 border-stroke'
      )}
    >
      <Upload className="size-5 text-fg-tertiary" />
      <p className="text-sm text-fg-secondary">
        {isUploading
          ? 'Uploading...'
          : remaining > 0
            ? 'Drag files here or click to upload'
            : 'Maximum files reached'}
      </p>
      {remaining > 0 && !isUploading && (
        <p className="text-xs text-fg-tertiary">
          Up to {remaining} more file{remaining !== 1 ? 's' : ''} (max 10MB each)
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={isDisabled}
      />
    </div>
  )
}
