// Modal para subir o seleccionar imagen de perfil
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Swal from 'sweetalert2';
import getCroppedImg from '../../utils/cropImage.js';
import './UploadAvatarModal.css';

const defaultAvatars = [
  'https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/avatars/default/foto_defecto_1.png',
  'https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/avatars/default/foto_defecto_2.png',
  'https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/avatars/default/foto_defecto_3.png',
  'https://mcrdacssebaldbevaybu.supabase.co/storage/v1/object/public/avatars/avatars/default/foto_defecto_4.png'
];

export default function UploadAvatarModal({ onClose, onUpload, previousImages = [], onSelectPrevious }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const file = await getCroppedImg(imageSrc, croppedAreaPixels);
    onUpload({ file });
    onClose();
  };

  const confirmAndSelect = async (url) => {
    const confirm = await Swal.fire({
      title: '¿Usar esta imagen?',
      imageUrl: url,
      imageWidth: 120,
      imageHeight: 120,
      showCancelButton: true,
      confirmButtonText: 'Sí, usar',
      cancelButtonText: 'Cancelar'
    });
    if (confirm.isConfirmed) {
      onSelectPrevious(url);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content avatar-upload-modal">
        <h2>Actualizar imagen de perfil</h2>
        <input type="file" accept="image/*" onChange={onFileChange} />

        <hr className="divider" />

        {/* Imágenes del sistema */}
        <h4>Imágenes del sistema</h4>
        <div className="avatar-scroll">
          {defaultAvatars.map((url) => (
            <img
              key={url}
              src={url}
              alt="Avatar por defecto"
              className="avatar-option"
              onClick={() => confirmAndSelect(url)}
            />
          ))}
        </div>

        {previousImages.length > 0 && (
          <>
            <hr className="divider" />
            <h4>Últimas imágenes cargadas</h4>
            <div className="avatar-scroll">
              {previousImages.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Avatar previo"
                  className="avatar-option"
                  onClick={() => confirmAndSelect(url)}
                />
              ))}
            </div>
          </>
        )}

        {imageSrc && (
          <>
            <div className="cropper-container">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="slider-wrapper">
              <label>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="zoom-slider"
              />
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="confirm-btn" onClick={handleUpload}>Subir imagen</button>
        </div>
      </div>
    </div>
  );
}
