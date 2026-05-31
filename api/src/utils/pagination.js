/**
 * Paginação offset-based (page/limit) com teto de tamanho de página.
 *
 * Escolha consciente: page/limit (em vez de cursor) porque os conjuntos aqui
 * são pequenos e limitados no tempo (histórico/eventos das últimas horas) e o
 * page/limit é mais simples de documentar e consumir. Para volumes grandes ou
 * streams em tempo real, cursor seria preferível (sem "saltos" quando há
 * inserções entre páginas).
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export function paginateArray(items, page, pageSize) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    slice,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
      has_more: start + pageSize < total,
    },
  };
}
