import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from './nanoid';

// AI Model definitions
export const AI_MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o', color: 'model-gpt4', short: 'G4o', url: 'https://chat.openai.com/' },
  { id: 'gpt-4', label: 'GPT-4', color: 'model-gpt4', short: 'G4', url: 'https://chat.openai.com/' },
  { id: 'gpt-3.5', label: 'GPT-3.5', color: 'model-gpt35', short: 'G3', url: 'https://chat.openai.com/' },
  { id: 'claude-3-opus', label: 'Claude 3 Opus', color: 'model-claude', short: 'C3O', url: 'https://claude.ai/' },
  { id: 'claude-3-sonnet', label: 'Claude 3 Sonnet', color: 'model-claude', short: 'C3S', url: 'https://claude.ai/' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', color: 'model-gemini', short: 'G15', url: 'https://gemini.google.com/' },
  { id: 'gemini-flash', label: 'Gemini Flash', color: 'model-gemini', short: 'GF', url: 'https://gemini.google.com/' },
  { id: 'llama-3', label: 'Llama 3', color: 'model-llama', short: 'L3', url: 'https://ollama.ai/' },
  { id: 'custom', label: 'Custom / Other', color: 'model-custom', short: '??', url: null },
];

// Sample seed data
const SEED_PROMPTS = [
  {
    id: nanoid(),
    title: 'Code Review Expert',
    content: 'Review the following {{language}} code for:\n1. Bugs and potential issues\n2. Performance improvements\n3. Security vulnerabilities\n4. Best practices violations\n5. Readability and maintainability\n\nCode:\n```{{language}}\n{{code}}\n```\n\nProvide specific, actionable feedback with examples.',
    description: 'Comprehensive code review prompt with variable injection for any language',
    tags: ['coding', 'review', 'quality'],
    model: 'gpt-4o',
    collectionId: null,
    isFavorite: true,
    isPinned: true,
    rating: 5,
    usageCount: 23,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['language', 'code'],
  },
  {
    id: nanoid(),
    title: 'Blog Post Writer',
    content: 'Write a comprehensive, engaging blog post about {{topic}} for {{audience}}.\n\nRequirements:\n- Tone: {{tone}}\n- Length: approximately {{word_count}} words\n- Include: an attention-grabbing headline, compelling introduction, 3-5 main sections with subheadings, actionable takeaways, and a strong conclusion\n- SEO focus: naturally incorporate {{keyword}} throughout\n\nMake it conversational yet authoritative.',
    description: 'Flexible blog post template with full customization options',
    tags: ['writing', 'content', 'SEO', 'blog'],
    model: 'claude-3-sonnet',
    collectionId: null,
    isFavorite: false,
    isPinned: false,
    rating: 4,
    usageCount: 15,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['topic', 'audience', 'tone', 'word_count', 'keyword'],
  },
  {
    id: nanoid(),
    title: 'SQL Query Optimizer',
    content: 'Analyze and optimize the following SQL query:\n\n```sql\n{{query}}\n```\n\nDatabase: {{database_type}}\nExpected row count: {{row_count}}\n\nPlease provide:\n1. Explanation of current query issues\n2. Optimized version with explanations\n3. Index recommendations\n4. Execution plan analysis tips',
    description: 'Optimize slow SQL queries with targeted recommendations',
    tags: ['SQL', 'database', 'performance', 'coding'],
    model: 'gpt-4o',
    collectionId: null,
    isFavorite: true,
    isPinned: false,
    rating: 5,
    usageCount: 31,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['query', 'database_type', 'row_count'],
  },
  {
    id: nanoid(),
    title: 'Cold Email Outreach',
    content: 'Write a personalized cold email to {{recipient_name}} at {{company_name}}.\n\nContext:\n- My name: {{sender_name}}\n- My company: {{my_company}}\n- What we offer: {{value_prop}}\n- Why relevant to them: {{relevance}}\n\nRequirements:\n- Subject line that gets opened\n- Under 150 words body\n- One clear CTA\n- Non-pushy, value-first tone\n- P.S. line that adds value',
    description: 'High-converting cold email template for B2B outreach',
    tags: ['sales', 'email', 'outreach', 'B2B'],
    model: 'claude-3-opus',
    collectionId: null,
    isFavorite: false,
    isPinned: false,
    rating: 4,
    usageCount: 8,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['recipient_name', 'company_name', 'sender_name', 'my_company', 'value_prop', 'relevance'],
  },
  {
    id: nanoid(),
    title: 'Image Alt Text Generator',
    content: 'Generate SEO-optimized alt text for the following image description:\n\n{{image_description}}\n\nContext:\n- Website topic: {{website_topic}}\n- Target keyword: {{keyword}}\n\nProvide:\n1. Primary alt text (under 125 characters)\n2. Extended description for complex images\n3. Title attribute suggestion\n4. Explanation of SEO reasoning',
    description: 'Generate accessible, SEO-friendly alt text for web images',
    tags: ['SEO', 'accessibility', 'web', 'content'],
    model: 'gemini-1.5-pro',
    collectionId: null,
    isFavorite: false,
    isPinned: false,
    rating: 3,
    usageCount: 5,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['image_description', 'website_topic', 'keyword'],
  },
  {
    id: nanoid(),
    title: 'API Documentation Writer',
    content: 'Write comprehensive API documentation for the following endpoint:\n\nEndpoint: {{method}} {{path}}\nDescription: {{description}}\n\nRequest:\n- Headers: {{headers}}\n- Body schema: {{body_schema}}\n\nResponse examples: {{response_examples}}\n\nFormat as Markdown with:\n- Overview section\n- Parameters table\n- Request/Response examples with code blocks\n- Error codes table\n- Rate limiting notes',
    description: 'Generate professional API documentation from endpoint specs',
    tags: ['documentation', 'API', 'coding', 'technical writing'],
    model: 'gpt-4o',
    collectionId: null,
    isFavorite: true,
    isPinned: false,
    rating: 5,
    usageCount: 19,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    versions: [],
    variables: ['method', 'path', 'description', 'headers', 'body_schema', 'response_examples'],
  },
];

// Usage history for stats
const SEED_USAGE = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 15) + 1,
}));

export const usePromptStore = create(
  persist(
    (set, get) => ({
      prompts: SEED_PROMPTS,
      usageHistory: SEED_USAGE,

      // CRUD
      addPrompt: (promptData) => {
        const now = new Date().toISOString();
        const newPrompt = {
          id: nanoid(),
          isFavorite: false,
          isPinned: false,
          rating: 0,
          usageCount: 0,
          versions: [],
          createdAt: now,
          updatedAt: now,
          variables: extractVariables(promptData.content),
          ...promptData,
        };
        set((state) => ({ prompts: [newPrompt, ...state.prompts] }));
        return newPrompt;
      },

      updatePrompt: (id, updates) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id !== id) return p;
            // Save current state as version before updating
            const currentVersion = {
              id: nanoid(),
              content: p.content,
              title: p.title,
              savedAt: new Date().toISOString(),
              label: `v${(p.versions?.length || 0) + 1}`,
            };
            return {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
              variables: updates.content ? extractVariables(updates.content) : p.variables,
              versions: [...(p.versions || []), currentVersion].slice(-20), // Keep last 20 versions
            };
          }),
        }));
      },

      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          ),
        }));
      },

      togglePin: (id) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, isPinned: !p.isPinned } : p
          ),
        }));
      },

      revertToVersion: (promptId, version) => {
        set((state) => ({
          prompts: state.prompts.map((p) => {
            if (p.id !== promptId) return p;
            const currentVersion = {
              id: nanoid(),
              content: p.content,
              title: p.title,
              savedAt: new Date().toISOString(),
              label: `v${(p.versions?.length || 0) + 1} (before revert)`,
            };
            return {
              ...p,
              content: version.content,
              title: version.title,
              updatedAt: new Date().toISOString(),
              variables: extractVariables(version.content),
              versions: [...(p.versions || []), currentVersion].slice(-20),
            };
          }),
        }));
      },

      recordUsage: (id) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
          ),
          usageHistory: updateOrAddUsage(state.usageHistory, today),
        }));
      },

      ratePrompt: (id, rating) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, rating } : p
          ),
        }));
      },

      duplicatePrompt: (id) => {
        const { prompts, addPrompt } = get();
        const original = prompts.find((p) => p.id === id);
        if (!original) return;
        addPrompt({
          ...original,
          title: `${original.title} (Copy)`,
          isFavorite: false,
          isPinned: false,
          usageCount: 0,
          versions: [],
        });
      },

      importPrompts: (data) => {
        const now = new Date().toISOString();
        const imported = (data.prompts || data).map((p) => ({
          ...p,
          id: nanoid(), // Regenerate IDs to avoid conflicts
          importedAt: now,
          variables: extractVariables(p.content || ''),
        }));
        set((state) => ({ prompts: [...imported, ...state.prompts] }));
      },

      getStats: () => {
        const { prompts, usageHistory } = get();
        const totalUsage = prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
        const modelCounts = prompts.reduce((acc, p) => {
          acc[p.model] = (acc[p.model] || 0) + 1;
          return acc;
        }, {});
        const tagCounts = prompts.reduce((acc, p) => {
          (p.tags || []).forEach((t) => { acc[t] = (acc[t] || 0) + 1; });
          return acc;
        }, {});
        const topPrompts = [...prompts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 5);
        return { totalUsage, modelCounts, tagCounts, topPrompts, usageHistory: usageHistory.slice(0, 14).reverse() };
      },
    }),
    {
      name: 'promptvault-prompts',
    }
  )
);

// Helper: extract {{variable}} names from content
export function extractVariables(content) {
  if (!content) return [];
  const matches = [...content.matchAll(/\{\{([^}]+)\}\}/g)];
  return [...new Set(matches.map((m) => m[1].trim()))];
}

function updateOrAddUsage(history, today) {
  const existing = history.find((h) => h.date === today);
  if (existing) {
    return history.map((h) => h.date === today ? { ...h, count: h.count + 1 } : h);
  }
  return [{ date: today, count: 1 }, ...history];
}
