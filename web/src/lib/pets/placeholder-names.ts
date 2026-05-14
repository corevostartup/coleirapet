/**
 * Nomes leves para pets recém-criados (login inicial ou novo pet).
 * O tutor pode trocar pelo nome real no perfil.
 */
export const FUN_PLACEHOLDER_PET_NAMES = [
  "Bolinho de Pelo",
  "Comandante Bigode",
  "Dono(a) do Sofá",
  "Estrela do Cochilo",
  "Larica em Potencial",
  "Peludo Misterioso",
  "Príncipe/Princesa a Definir",
  "Rei das Pelúcias",
  "Soneca de Luxo",
  "Terror dos Biscoitos",
] as const;

export function pickRandomFunPlaceholderPetName(): string {
  const list = FUN_PLACEHOLDER_PET_NAMES;
  return list[Math.floor(Math.random() * list.length)]!;
}
