import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import { resolveConfirmation, type ConfirmationRequest } from "../services/confirmation";

export default function GlobalConfirmationDialog() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  useEffect(() => {
    const show = (event: Event) => setRequest((event as CustomEvent<ConfirmationRequest>).detail);
    window.addEventListener("confirmation-requested", show);
    return () => window.removeEventListener("confirmation-requested", show);
  }, []);
  const close = () => { setRequest(null); resolveConfirmation(false); };
  const confirm = () => { setRequest(null); resolveConfirmation(true); };
  return <ConfirmationModal isOpen={Boolean(request)} onClose={close} onConfirm={confirm} title={request?.title || "Confirmar acción"} message={request?.message || ""} confirmText={request?.confirmText} type={request?.type} />;
}
