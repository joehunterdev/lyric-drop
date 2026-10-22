import { useState, useCallback, useEffect } from 'react'

import type { ImageBackground } from '@/types'
import { validateImageFile, logger } from '@/utils'

interface UseImageBackgroundReturn {
  image: ImageBackground | null
  loadImage: (file: File) => Promise<void>
  clearImage: () => void
}

/**
 * Loads a still image and decodes it once into an ImageBitmap for canvas drawing
 */
export function useImageBackground(): UseImageBackgroundReturn {
  const [image, setImage] = useState<ImageBackground | null>(null)

  // Release the previous image when it's replaced or on unmount
  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.url)
        image.bitmap.close()
      }
    }
  }, [image])

  const loadImage = useCallback(async (file: File) => {
    logger.info('Loading image:', file.name)

    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    try {
      // Applies EXIF orientation so phone photos aren't sideways
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      setImage({
        file,
        url: URL.createObjectURL(file),
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
      })
      logger.info('Image loaded:', { width: bitmap.width, height: bitmap.height })
    } catch (error) {
      logger.error('Failed to load image:', error)
      throw new Error('Could not read this image. Please use JPG, PNG or WebP.')
    }
  }, [])

  const clearImage = useCallback(() => {
    setImage(null)
  }, [])

  return {
    image,
    loadImage,
    clearImage,
  }
}
