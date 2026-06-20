import { getEmbedding, cosineSimilarity } from './embedding';

let tagEmbeddingCache = {};

export async function suggestTags(pageEmbedding, customTags = [], threshold = 0.3) {
  if (!customTags.length) return [];

  const tagEmbeddings = [];
  
  for (const tag of customTags) {
    if (!tagEmbeddingCache[tag.id]) {
      tagEmbeddingCache[tag.id] = await getEmbedding(tag.name);
    }
    tagEmbeddings.push({ id: tag.id, emb: tagEmbeddingCache[tag.id] });
  }

  return tagEmbeddings
    .map(({ id, emb }) => ({ id, score: cosineSimilarity(pageEmbedding, emb) }))
    .filter((s) => s.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.id);
}
