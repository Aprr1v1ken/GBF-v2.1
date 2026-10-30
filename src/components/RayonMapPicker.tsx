import React from 'react';
import { LocationMapPicker } from './LocationMapPicker.tsx';

export const RayonMapPicker: React.FC<{
  latitude: string;
  longitude: string;
  onSelect: (latitude: number, longitude: number) => void;
}> = ({ latitude, longitude, onSelect }) => {
  return (
    <LocationMapPicker
      latitude={latitude}
      longitude={longitude}
      onSelect={onSelect}
      title="Pilih Titik Pos Rayon di Google Maps"
      pinColor="#06b6d4"
      pinBorderColor="#155e75"
      pinLabel="Pos Rayon Pelayanan"
    />
  );
};

export default RayonMapPicker;
