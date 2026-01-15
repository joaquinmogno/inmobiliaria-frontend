export function formatDate(value?: string | null): string {
    if (!value) return "-";

    // Tomamos solo la parte YYYY-MM-DD
    const [datePart] = value.split("T"); // 🔑 clave
    const [year, month, day] = datePart.split("-");

    return `${day}/${month}/${year}`;
}
