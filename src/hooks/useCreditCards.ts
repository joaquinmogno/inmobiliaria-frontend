import { useEffect, useState } from 'react';
import { creditCardsService, type CardScope, type CreditCard } from '../services/credit-cards.service';

export function useCreditCards(scope: CardScope) {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        void creditCardsService.list(scope).then(result => {
            if (active) { setCards(result); setError(''); }
        }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las tarjetas.'); });
        return () => { active = false; };
    }, [scope, revision]);
    return { cards, error, refresh: () => setRevision(value => value + 1) };
}
