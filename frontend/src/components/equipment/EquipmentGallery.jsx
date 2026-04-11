import React from 'react'
import SmartImage from '../SmartImage.jsx'

export default function EquipmentGallery({ image, itemName, galleryImages = [] }) {
  const [fieldImage, closeupImage, maintenanceImage, landscapeImage] = galleryImages

  return (
    <>
      <div className="details-media-grid">
        <SmartImage src={image} fallbackSrc="/tractor.svg" alt={itemName} labelForFallback={itemName} />
        <SmartImage src={fieldImage} fallbackSrc="/fields.svg" alt="Field operations" />
      </div>

      <div className="details-thumb-grid">
        <SmartImage src={closeupImage} fallbackSrc="/hero.svg" alt="Equipment close view" />
        <SmartImage src={maintenanceImage || closeupImage} fallbackSrc="/tractor.svg" alt="Maintenance detail" />
        <SmartImage src={landscapeImage || fieldImage} fallbackSrc="/fields.svg" alt="Farm landscape detail" />
      </div>
    </>
  )
}
