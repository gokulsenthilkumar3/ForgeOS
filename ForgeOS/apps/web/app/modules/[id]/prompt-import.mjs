const demoTitles = new Set([
  'Code Review Expert', 'Blog Post Writer', 'SQL Query Optimizer',
  'Cold Email Outreach', 'Image Alt Text Generator', 'API Documentation Writer',
]);

export function parsePromptImport(source, collectionSource) {
  const root = source && typeof source === 'object' && 'state' in source ? source.state : source;
  const collectionRoot = collectionSource && typeof collectionSource === 'object' && 'state' in collectionSource
    ? collectionSource.state : collectionSource;
  const rawPrompts = Array.isArray(root) ? root : Array.isArray(root?.prompts) ? root.prompts : [];
  const rawCollections = Array.isArray(collectionRoot?.collections) ? collectionRoot.collections
    : Array.isArray(root?.collections) ? root.collections : [];
  if (rawPrompts.length > 1000 || rawCollections.length > 1000) throw new Error('Import exceeds the 1,000-item safety limit');
  const collections = rawCollections.filter(item => typeof item?.name === 'string' && item.name.trim())
    .map(item => ({ id: String(item.id || ''), name: item.name.trim().slice(0, 100), description: String(item.description || '').slice(0, 1000) }));
  const collectionNames = new Map(collections.map(item => [item.id, item.name]));
  const prompts = [];
  for (const item of rawPrompts) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.title === 'string' ? item.title.trim() : typeof item.name === 'string' ? item.name.trim() : '';
    if (!name || name.length > 100) continue;
    let versions = [];
    if (typeof item.content === 'string') {
      versions = (Array.isArray(item.versions) ? item.versions : []).filter(version => typeof version?.content === 'string')
        .map(version => ({ text: version.content, createdAt: version.savedAt || version.createdAt || new Date().toISOString() }));
      versions.push({ text: item.content, createdAt: item.updatedAt || item.createdAt || new Date().toISOString() });
    } else if (Array.isArray(item.versions)) {
      versions = item.versions.filter(version => typeof version?.text === 'string')
        .map(version => ({ text: version.text, createdAt: version.createdAt || new Date().toISOString() }));
    }
    if (!versions.length || versions.some(version => version.text.length > 100_000)) continue;
    prompts.push({
      name, versions,
      metadata: {
        description: typeof item.description === 'string' ? item.description.slice(0, 1000) : '',
        tags: Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').slice(0, 20) : [],
        model: typeof item.model === 'string' ? item.model.slice(0, 100) : '',
        collection: collectionNames.get(String(item.collectionId || '')) || '',
        favorite: item.isFavorite === true,
        pinned: item.isPinned === true,
        rating: Number.isFinite(item.rating) ? Math.max(0, Math.min(5, item.rating)) : 0,
      },
      possibleDemo: demoTitles.has(name),
    });
  }
  return { prompts, collections };
}
