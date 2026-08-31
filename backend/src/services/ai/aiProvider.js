/**
 * MoneyLink V2 — Adaptateur de Fournisseurs IA (AI Provider Strategy)
 * Supporte :
 * 1. Moteur Natif Financier (Zero-Dependency, Déterministe & Instantané)
 * 2. Google Gemini (via GEMINI_API_KEY / AI_API_KEY)
 * 3. OpenAI GPT (via OPENAI_API_KEY)
 * 4. Anthropic Claude (via ANTHROPIC_API_KEY)
 * 
 * Règle de sécurité FinTech stricte :
 * - Aucune transaction ne peut être déclenchée.
 * - Seules les données financières consolidées autorisées de l'utilisateur sont fournies en contexte.
 * - Fallback automatique vers le moteur natif si l'API externe est inaccessible.
 */

export class AiProviderAdapter {
  /**
   * Détecte le fournisseur IA actif configuré dans les variables d'environnement
   */
  static getActiveProvider() {
    const configured = (process.env.AI_PROVIDER || '').toUpperCase();
    if (configured === 'NATIVE') return 'NATIVE';
    if (configured === 'GEMINI') return 'GEMINI';
    if (configured === 'OPENAI') return 'OPENAI';
    if (configured === 'ANTHROPIC') return 'ANTHROPIC';
    if (process.env.GEMINI_API_KEY) return 'GEMINI';
    if (process.env.OPENAI_API_KEY) return 'OPENAI';
    if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
    return 'NATIVE';
  }

  /**
   * Génère une réponse via le fournisseur approprié avec repli gracieux (fallback)
   */
  static async generateCompletion({ prompt, financialSummary, language = 'fr', nativeFallbackText }) {
    const provider = this.getActiveProvider();

    if (provider === 'NATIVE') {
      return {
        provider: 'NATIVE',
        text: nativeFallbackText
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(financialSummary, language);

      if (provider === 'OPENAI') {
        const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 450
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply && reply.trim()) {
            return { provider: 'OPENAI', text: reply.trim() };
          }
        }
      } else if (provider === 'GEMINI') {
        const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${systemPrompt}\n\nQuestion de l'utilisateur : ${prompt}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 450
            }
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim()) {
            return { provider: 'GEMINI', text: reply.trim() };
          }
        }
      } else if (provider === 'ANTHROPIC') {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;
        const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 450,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.content?.[0]?.text;
          if (reply && reply.trim()) {
            return { provider: 'ANTHROPIC', text: reply.trim() };
          }
        }
      }
    } catch (err) {
      console.warn(`[AI Provider ${provider} Fallback] : ${err.message}. Utilisation du moteur natif.`);
    }

    // Repli systématique vers le texte généré par le moteur déterministe certifié
    return {
      provider: 'NATIVE_FALLBACK',
      text: nativeFallbackText
    };
  }

  /**
   * Construit le contexte d'instructions et les données financières réelles de l'utilisateur
   */
  static buildSystemPrompt(summary, language = 'fr') {
    const isWolof = String(language).toLowerCase().startsWith('wo');
    
    return `
Tu es l'Assistant Financier Intelligent MoneyLink au Sénégal (FinTech tiers de confiance & séquestre).
RÈGLES ABSOLUES DE SÉCURITÉ :
1. Tu es STRICTEMENT CONSULTATIF. Tu ne peux pas initier de virement, modifier de solde ou exécuter de transaction.
2. Tu t'appuies UNIQUEMENT sur les données financières réelles fournies ci-dessous. N'invente aucun chiffre.
3. Langue de réponse : ${isWolof ? 'Wolof sénégalais naturel, fluide et courtois' : 'Français soigné, clair et synthétique'}.
4. Sois concis (3 à 5 phrases maximum), précis et encourage l'épargne responsable (tontines, coffres).

DONNÉES FINANCIÈRES RÉELLES DE L'UTILISATEUR (XOF / FCFA) :
- Solde disponible : ${summary.availableBalance.toLocaleString('fr-FR')} FCFA
- Solde sous séquestre : ${summary.lockedBalance.toLocaleString('fr-FR')} FCFA
- Dépenses de la semaine : ${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA
- Dépenses du mois : ${summary.spentThisMonth.toLocaleString('fr-FR')} FCFA
- Variation hebdomadaire : ${summary.weeklyVariationPercent}%
- Capacité d'épargne estimée : ${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA
- Total épargné : ${summary.totalSaved.toLocaleString('fr-FR')} FCFA
- Principal poste de dépense : ${summary.categories?.[0]?.name || 'Achats marketplace'} (${summary.categories?.[0]?.amount?.toLocaleString('fr-FR') || 0} FCFA)
`.trim();
  }
}

export default AiProviderAdapter;
