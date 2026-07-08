const WORD_MIME_TYPES = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const PDF_MIME_TYPES = new Set(['application/pdf']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TYPES_BY_EXTENSION = new Map<string, Set<string>>([
    ['.pdf', PDF_MIME_TYPES],
    ['.doc', new Set(['application/msword'])],
    ['.docx', new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])],
    ['.jpg', new Set(['image/jpeg'])],
    ['.jpeg', new Set(['image/jpeg'])],
    ['.png', new Set(['image/png'])],
    ['.webp', new Set(['image/webp'])],
]);

export const MAIN_CONTRACT_ACCEPT = '.pdf,.doc,.docx';
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
export const MAIN_CONTRACT_FORMATS_LABEL = 'PDF, DOC o DOCX';
export const ATTACHMENT_FORMATS_LABEL = 'PDF, DOC, DOCX, JPG, PNG o WEBP';

const MAIN_CONTRACT_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export type DocumentKind = 'pdf' | 'word' | 'image' | 'other';

export function getFileExtension(value: string | null | undefined) {
    if (!value) return '';
    const cleanValue = value.split('?')[0].split('#')[0].toLowerCase();
    const lastSegment = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = lastSegment.lastIndexOf('.');
    return dotIndex >= 0 ? lastSegment.slice(dotIndex) : '';
}

function hasAllowedExtension(file: File, extensions: string[]) {
    return extensions.includes(getFileExtension(file.name));
}

function hasMatchingMimeType(file: File) {
    const extension = getFileExtension(file.name);
    return MIME_TYPES_BY_EXTENSION.get(extension)?.has(file.type) || false;
}

function validateFileSize(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return 'El archivo supera el limite maximo de 30 MB.';
    }
    return null;
}

export function validateMainContractFile(file: File) {
    if (!hasAllowedExtension(file, MAIN_CONTRACT_EXTENSIONS) || !hasMatchingMimeType(file)) {
        return `Formato no permitido. El contrato principal debe ser ${MAIN_CONTRACT_FORMATS_LABEL}.`;
    }
    return validateFileSize(file);
}

export function validateAttachmentFile(file: File) {
    if (!hasAllowedExtension(file, ATTACHMENT_EXTENSIONS) || !hasMatchingMimeType(file)) {
        return `Formato no permitido. Solo se aceptan ${ATTACHMENT_FORMATS_LABEL}.`;
    }
    return validateFileSize(file);
}

export function getDocumentKind(pathOrName: string | null | undefined, mimeType = ''): DocumentKind {
    if (WORD_MIME_TYPES.has(mimeType)) return 'word';
    if (PDF_MIME_TYPES.has(mimeType)) return 'pdf';
    if (IMAGE_MIME_TYPES.has(mimeType)) return 'image';

    const extension = getFileExtension(pathOrName);
    if (extension === '.doc' || extension === '.docx') return 'word';
    if (extension === '.pdf') return 'pdf';
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) return 'image';
    return 'other';
}

export function isWordDocument(pathOrName: string | null | undefined, mimeType = '') {
    return getDocumentKind(pathOrName, mimeType) === 'word';
}

export function getDocumentTypeLabel(pathOrName: string | null | undefined, mimeType = '') {
    const kind = getDocumentKind(pathOrName, mimeType);
    if (kind === 'word') return 'WORD';
    if (kind === 'pdf') return 'PDF';
    if (kind === 'image') return 'IMG';
    return 'DOC';
}

export function getDocumentActionLabel(pathOrName: string | null | undefined, mimeType = '') {
    return isWordDocument(pathOrName, mimeType) ? 'DESCARGAR' : 'VER';
}

export function getFilenameFromPath(path: string | null | undefined) {
    if (!path) return 'archivo';
    return decodeURIComponent(path.split('/').pop() || 'archivo');
}
