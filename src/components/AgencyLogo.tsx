import { useEffect, useState } from 'react';
import { getAgencyLogoUrl } from '../services/inmobiliaria.service';

interface AgencyLogoProps {
  inmobiliaria?: { nombre: string; logoUrl?: string | null; logoArchivo?: string | null } | null;
  variant?: 'wide' | 'icon';
  className?: string;
}

/** Muestra el logo institucional cargado o la identidad visual predeterminada. */
export default function AgencyLogo({ inmobiliaria, variant = 'wide', className = '' }: AgencyLogoProps) {
  const source = getAgencyLogoUrl(inmobiliaria);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  const fallback = variant === 'wide' ? '/logo-440.webp' : '/logo-icon.png';
  const alt = inmobiliaria?.nombre ? `Logo de ${inmobiliaria.nombre}` : 'Logo de PropControl';

  return (
    <img
      src={!failed && source ? source : fallback}
      alt={alt}
      className={`h-full w-full object-contain ${source && !failed ? 'p-1' : variant === 'wide' ? 'scale-[2]' : 'p-1.5'} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
