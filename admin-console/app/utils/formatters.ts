/**
 * Formata valores monetários de forma resiliente.
 * @param amount O valor numérico a ser formatado.
 * @param currency O código da moeda (ex: 'BRL', 'USD').
 * @returns String formatada ou fallback em caso de erro.
 */
export const formatCurrency = (amount: number, currency: string) => {
  try {
    // Garante que exista uma string e remove espaços, usando BRL como padrão
    const validCurrency = (currency && currency.trim().length === 3) 
      ? currency.toUpperCase() 
      : 'BRL';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: validCurrency,
    }).format(amount || 0);
  } catch (error) {
    console.error("Erro na formatação de moeda:", error);
    // Fallback amigável para não quebrar a UI
    return `R$ ${(amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
};