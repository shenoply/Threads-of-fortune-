// Rugs that belong to the story (your father's Fayoum Hearth): they are never put up as auction lots,
// so an auction catalogue should leave them out of its pools (auction/sessions.ts catalogue()).
export const STORY_RUGS: readonly string[] = ['fayoum-hearth'];
export const auctionable = (typeId: string) => !STORY_RUGS.includes(typeId);
