// Categorias de gastos compartilhadas entre a importação de faturas e os
// formulários de cadastro manual (dívidas, saídas, entradas).

export const CATEGORIAS = [
  { chave: 'moradia', rotulo: '🏠 Moradia' },
  { chave: 'alimentacao', rotulo: '🍔 Alimentação' },
  { chave: 'transporte', rotulo: '🚗 Transporte' },
  { chave: 'saude', rotulo: '🏥 Saúde' },
  { chave: 'lazer', rotulo: '🎉 Lazer' },
  { chave: 'compras', rotulo: '🛍️ Compras' },
  { chave: 'educacao', rotulo: '📚 Educação' },
  { chave: 'trabalho', rotulo: '💼 Trabalho' },
  { chave: 'familia', rotulo: '❤️ Família / Relacionamentos' },
  { chave: 'pets', rotulo: '🐶 Pets' },
  { chave: 'financeiro', rotulo: '💸 Financeiro (parcelas, empréstimos, taxas)' },
  { chave: 'outros', rotulo: '📦 Outros' },
];

const PALAVRAS_POR_CATEGORIA = {
  moradia: ['aluguel', 'condomini', 'energia', 'eletric', 'luz ', 'agua', 'saneamento', 'internet', 'gas ', 'imobiliari'],
  alimentacao: ['lanche', 'restaurant', 'padaria', 'supermerc', 'minimercado', 'mercearia', 'hortifruti', 'acougue', 'ifood', 'ifd*', 'burguer', 'pizza', 'cafe', 'bar ', 'acai', 'sorvete', 'gelato', 'latte', 'doceria', 'churrasc', 'hamburg', 'gourmet'],
  transporte: ['uber', '99app', '99*', 'posto', 'combustivel', 'estacionamento', 'pedagio', 'metro', 'onibus', 'taxi', 'mecanic', 'oficina', 'autopeca'],
  saude: ['farmacia', 'drogaria', 'drogasil', 'clinica', 'hospital', 'laborator', 'dentista', 'odonto', 'medic', 'fisioterap', 'academia', 'pilates'],
  lazer: ['cinema', 'netflix', 'spotify', 'ingresso', 'viagem', 'turismo', 'turi', 'hotel', 'pousada', 'steam', 'playstation', 'xbox', 'globo', 'hbo', 'disney', 'prime video', 'show'],
  compras: ['mercadolivre', 'mercado livre', 'magazine', 'amazon', 'shopee', 'shopping', 'boulevard', 'magalu', 'americanas', 'aliexpress', 'centauro', 'renner', 'riachuelo', 'loja'],
  educacao: ['escola', 'faculdade', 'universidad', ' curso', 'udemy', 'livraria', 'colegio', 'pos-graduacao'],
  trabalho: ['coworking', 'escritorio', 'assinatura profissional'],
  familia: ['presente', 'floricultura', 'buffet'],
  pets: ['petshop', 'pet shop', 'veterinari', 'racao', 'petz', 'cobasi'],
  financeiro: ['juros', 'iof', 'anuidade', 'tarifa', 'seguro', 'emprestimo', 'financiamento', ' taxa'],
};

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

// Tenta adivinhar a categoria a partir de palavras-chave na descrição da
// transação. É só um ponto de partida — o usuário pode corrigir na revisão.
export function sugerirCategoria(descricao) {
  const texto = normalizar(descricao);
  for (const [chave, palavras] of Object.entries(PALAVRAS_POR_CATEGORIA)) {
    if (palavras.some((palavra) => texto.includes(palavra))) return chave;
  }
  return 'outros';
}
