const CBU_BANK_WEIGHTS = [7, 1, 3, 9, 7, 1, 3];
const CBU_ACCOUNT_WEIGHTS = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

export const normalizeCbu = (value?: string | null) => (value || '').replace(/\D/g, '');
export const normalizeBankAlias = (value?: string | null) => (value || '').trim().toUpperCase();

const validVerifier = (digits: string, weights: number[], verifier: string) =>
    String((10 - (digits.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 10)) % 10) === verifier;

export const isValidCbu = (value?: string | null) => {
    const cbu = normalizeCbu(value);
    return cbu.length === 22
        && validVerifier(cbu.slice(0, 7), CBU_BANK_WEIGHTS, cbu[7])
        && validVerifier(cbu.slice(8, 21), CBU_ACCOUNT_WEIGHTS, cbu[21]);
};

export const isValidBankAlias = (value?: string | null) => {
    const alias = normalizeBankAlias(value);
    return alias.length >= 6 && alias.length <= 20 && /^[A-Z0-9]+(?:[._-][A-Z0-9]+)*$/.test(alias);
};

export const maskCbu = (value?: string | null) => {
    const cbu = normalizeCbu(value);
    return cbu ? `•••• ${cbu.slice(-4)}` : null;
};
