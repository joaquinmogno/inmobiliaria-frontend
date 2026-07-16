import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
interface WhatsAppLinkProps {
    phone: string;
    className?: string;
}

export default function WhatsAppLink({ phone, className = "" }: WhatsAppLinkProps) {
    const parsedPhone = parsePhoneNumberFromString(phone, 'AR');
    if (!parsedPhone?.isValid()) {
        return <span className={className} title="Número de teléfono inválido">{phone}</span>;
    }

    const whatsappUrl = `https://wa.me/${parsedPhone.number.slice(1)}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 -mx-2 hover:bg-green-50 hover:text-green-700 hover:underline transition-colors cursor-pointer ${className}`}
            title="Abrir en WhatsApp"
            onClick={(e) => e.stopPropagation()} // Prevent triggering row clicks if any
        >
            {phone}
        </a>
    );
}
