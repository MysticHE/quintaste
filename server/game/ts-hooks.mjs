/**
 * Module hooks that let the API load the game simulation straight from src/game (TypeScript, extensionless imports)
 * with Node's built-in type stripping, so client and server run one implementation (GAME_PLAN §12.3).
 */
export async function resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && /^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier)) {
    const found = await next(specifier + '.ts', context);
    return { ...found, format: 'module-typescript' };
  }
  const found = await next(specifier, context);
  return found.url.endsWith('.ts') ? { ...found, format: 'module-typescript' } : found;
}
