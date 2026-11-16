import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
interface WhatsAppLinkProps {
    phone?: string | null;
    className?: string;
}

export default function WhatsAppLink({ phone, className = "" }: WhatsAppLinkProps) {
    if (!phone?.trim()) return <span className={className}>Teléfono no informado</span>;
    const parsedPhone = parsePhoneNumberFromString(phone, 'AR');
    if (!parsedPhone?.isValid()) {
        return <span className={className}>{phone}<span className="block text-xs">Número de teléfono inválido</span></span>;
    }

    const whatsappUrl = `https://wa.me/${parsedPhone.number.slice(1)}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 -mx-2 hover:bg-green-50 hover:text-green-700 hover:underline transition-colors cursor-pointer ${className}`}
            title="Abrir en WhatsApp"
            aria-label={`${phone}: abrir WhatsApp en otra pestaña`}
            onClick={(e) => e.stopPropagation()} // Prevent triggering row clicks if any
        >
            {phone}
        </a>
    );
}
