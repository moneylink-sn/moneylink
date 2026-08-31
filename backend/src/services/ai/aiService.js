/**
 * MoneyLink V2 — Service MoneyLink IA (Assistant Financier Intelligent & Conseiller Commercial)
 * Analyse des données financières réelles autorisées de l'utilisateur.
 * Garde-fous stricts : L'IA ne peut JAMAIS initier de paiement, modifier de solde ou exécuter une transaction.
 */

import { query, pool, memoryStore } from '../../config/db.js';
import crypto from 'crypto';
import { AiProviderAdapter } from './aiProvider.js';

export class AiService {
  /**
   * Extrait et calcule l'ensemble des métriques financières autorisées pour un utilisateur
   */
  static async getUserFinancialSummary(userId) {
    let transactions = [];
    let orders = [];
    let wallet = null;
    let savings = [];

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevWeekStart = new Date(startOfWeek);
    prevWeekStart.setDate(startOfWeek.getDate() - 7);

    if (pool) {
      try {
        const txRes = await query(
          'SELECT * FROM transactions WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at DESC LIMIT 100',
          [userId]
        );
        transactions = txRes.rows || [];

        const ordRes = await query(
          'SELECT * FROM orders WHERE buyer_id = $1 OR merchant_id = (SELECT id FROM merchants WHERE user_id = $1 LIMIT 1) ORDER BY created_at DESC',
          [userId]
        );
        orders = ordRes.rows || [];

        const wRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
        wallet = wRes.rows[0] || null;

        const savRes = await query('SELECT * FROM savings_goals WHERE owner_id = $1', [userId]);
        savings = savRes.rows || [];
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour AiService.getUserFinancialSummary :', err.message);
      }
    }

    if (!transactions.length && memoryStore.transactions) {
      transactions = memoryStore.transactions.filter(t => t.sender_id === userId || t.receiver_id === userId);
    }
    if (!orders.length && memoryStore.orders) {
      const merchantId = memoryStore.merchants?.find(m => m.user_id === userId)?.id;
      orders = memoryStore.orders.filter(o => o.buyer_id === userId || (merchantId && o.merchant_id === merchantId));
    }
    if (!wallet && memoryStore.wallets) {
      wallet = memoryStore.wallets.find(w => w.user_id === userId) || null;
    }
    if (!savings.length && memoryStore.savings_goals) {
      savings = memoryStore.savings_goals.filter(s => s.owner_id === userId);
    }

    // Calculs Dépenses & Revenus
    let spentThisWeek = 0;
    let spentPrevWeek = 0;
    let spentThisMonth = 0;
    let totalIncomeThisMonth = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      const amount = parseFloat(t.amount || 0);
      const tDate = new Date(t.created_at || now);
      const isExpense = t.sender_id === userId || t.type === 'ESCROW_DEPOSIT' || t.type === 'TRANSFER_OUT' || t.type === 'SUBSCRIPTION_PAYMENT';
      const isIncome = t.receiver_id === userId || t.type === 'ESCROW_RELEASE' || t.type === 'DEPOSIT';

      if (isExpense) {
        if (tDate >= startOfWeek) spentThisWeek += amount;
        else if (tDate >= prevWeekStart && tDate < startOfWeek) spentPrevWeek += amount;
        if (tDate >= startOfMonth) spentThisMonth += amount;

        const cat = (t.metadata && t.metadata.category) || (t.type === 'SUBSCRIPTION_PAYMENT' ? 'Abonnement' : 'Achats & Marketplace');
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      }

      if (isIncome && tDate >= startOfMonth) {
        totalIncomeThisMonth += amount;
      }
    });

    // Compléter avec les commandes passées
    orders.forEach(o => {
      if (o.buyer_id === userId) {
        const oDate = new Date(o.created_at || now);
        const amount = parseFloat(o.total_amount || 0);
        if (oDate >= startOfWeek && spentThisWeek === 0) spentThisWeek += amount;
        if (oDate >= startOfMonth && spentThisMonth === 0) spentThisMonth += amount;
      }
    });

    // Tri des postes de dépenses
    const sortedCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount, percentage: spentThisMonth > 0 ? Math.round((amount / spentThisMonth) * 100) : 100 }))
      .sort((a, b) => b.amount - a.amount);

    // Variation hebdomadaire
    let weeklyVariationPercent = 0;
    if (spentPrevWeek > 0) {
      weeklyVariationPercent = Math.round(((spentThisWeek - spentPrevWeek) / spentPrevWeek) * 100);
    }

    // Capacité d'épargne estimée (entre 20% et 35% du solde ou du surplus)
    const availableBal = parseFloat(wallet?.available_balance || 0);
    const estimatedSavingsCapacity = Math.max(0, Math.round(Math.min(availableBal * 0.3, 100000)));

    // Total épargné actif
    const totalSaved = savings.reduce((acc, s) => acc + parseFloat(s.current_amount || 0), 0);

    return {
      availableBalance: availableBal,
      lockedBalance: parseFloat(wallet?.locked_balance || 0),
      currency: wallet?.currency || 'XOF',
      spentThisWeek,
      spentPrevWeek,
      spentThisMonth,
      weeklyVariationPercent,
      totalIncomeThisMonth,
      estimatedSavingsCapacity,
      totalSaved,
      savingsGoalsCount: savings.length,
      categories: sortedCategories.length > 0 ? sortedCategories : [
        { name: 'Achats & Séquestre', amount: spentThisMonth || spentThisWeek, percentage: 100 }
      ]
    };
  }

  /**
   * Génère des insights et alertes budgétaires personnalisés
   */
  static async getInsights(userId, language = 'fr') {
    const summary = await this.getUserFinancialSummary(userId);
    const isWolof = String(language).toLowerCase().startsWith('wo');

    const tips = [];
    const alerts = [];

    // Conseil sur l'évolution des dépenses
    if (summary.weeklyVariationPercent > 10) {
      alerts.push({
        id: 'alt_exp_up',
        type: 'WARNING',
        title: isWolof ? '⚠️ Saytu sa dépense yi' : '⚠️ Augmentation des dépenses',
        message: isWolof
          ? `Sa dépense yi ci ayubés bi yokk nañu ${summary.weeklyVariationPercent} % kom ayubés bi weesu.`
          : `Vos dépenses ont augmenté de ${summary.weeklyVariationPercent} % par rapport à la semaine dernière.`
      });
    } else if (summary.weeklyVariationPercent < -10) {
      tips.push({
        id: 'tip_exp_down',
        type: 'SUCCESS',
        title: isWolof ? '👏 Bravoo ci sa denc !' : '👏 Excellente maîtrise budgétaire',
        message: isWolof
          ? `Waññi nga sa dépense yi ${Math.abs(summary.weeklyVariationPercent)} % ci ayubés bi. Yaay borom !`
          : `Vous avez réduit vos dépenses de ${Math.abs(summary.weeklyVariationPercent)} % cette semaine. Continuez ainsi !`
      });
    }

    // Conseil capacité d'épargne
    if (summary.estimatedSavingsCapacity > 5000) {
      tips.push({
        id: 'tip_savings',
        type: 'INFO',
        title: isWolof ? '💡 Digle MoneyLink ci denc' : '💡 Conseil d\'épargne MoneyLink',
        message: isWolof
          ? `Mën nga denc ba ${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA ci sa coffre MoneyLink te dula sonal.`
          : `Selon vos habitudes, vous pouvez mettre de côté environ ${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA ce mois-ci sans impacter vos besoins courants.`
      });
    }

    // Conseil général tontine / coffres
    if (summary.savingsGoalsCount === 0) {
      tips.push({
        id: 'tip_tontine',
        type: 'ACTION',
        title: isWolof ? '🎯 Ubbil sa bët ci tontine' : '🎯 Créez un objectif d\'épargne',
        message: isWolof
          ? 'Sos sa benn coffre tontine ngir Tabaski, Magal walla sa porosey.'
          : 'Créez votre premier coffre tontine pour financer vos projets (Tabaski, Magal, vacances).'
      });
    }

    // Message principal résumé
    const mainAdvice = isWolof
      ? `Ci ayubés bi, depensé nga ${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA. Sa solde disponible tollu na ci ${summary.availableBalance.toLocaleString('fr-FR')} FCFA.`
      : `Cette semaine, vous avez dépensé ${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA. Votre solde disponible est de ${summary.availableBalance.toLocaleString('fr-FR')} FCFA.`;

    return {
      summary,
      mainAdvice,
      tips,
      alerts
    };
  }

  /**
   * Analyse une question de l'utilisateur et produit une réponse financière pertinente
   */
  static async askQuestion(userId, userQuestion, language = 'fr') {
    if (!userQuestion || !userQuestion.trim()) {
      throw new Error('La question ne peut pas être vide.');
    }

    const question = userQuestion.trim();
    const lower = question.toLowerCase();
    const isWolof = String(language).toLowerCase().startsWith('wo') ||
      lower.includes('ñaata') || lower.includes('xaliss') || lower.includes('denc') || lower.includes('dakar');

    const summary = await this.getUserFinancialSummary(userId);

    // Classification d'intention (Intent Classification)
    let intent = 'GENERAL';
    let responseText = '';

    if (lower.includes('combien') && (lower.includes('dépensé') || lower.includes('depense') || lower.includes('semaine') || lower.includes('mois'))) {
      intent = 'EXPENSE_ANALYSIS';
      if (isWolof) {
        responseText = `Ci ayubés bi, depensé nga ${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA. Ci weer wi yepp, ${summary.spentThisMonth.toLocaleString('fr-FR')} FCFA nga genne.`;
      } else {
        responseText = `📊 Vous avez dépensé **${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA** cette semaine (et un total de **${summary.spentThisMonth.toLocaleString('fr-FR')} FCFA** ce mois-ci).`;
      }
    } else if (lower.includes('où part') || lower.includes('ou part') || lower.includes('poste') || lower.includes('catégorie') || lower.includes('categorie')) {
      intent = 'SPENDING_BREAKDOWN';
      const topCat = summary.categories[0] || { name: 'Achats généraux', amount: summary.spentThisMonth, percentage: 100 };
      if (isWolof) {
        responseText = `Sa xaliss lu ëpp ci « ${topCat.name} » la dem (${topCat.amount.toLocaleString('fr-FR')} FCFA, maanaam ${topCat.percentage}% ci sa dépense yi).`;
      } else {
        responseText = `📍 Votre principal poste de dépense est **« ${topCat.name} »** qui représente **${topCat.percentage}%** de vos sorties d'argent (${topCat.amount.toLocaleString('fr-FR')} FCFA).`;
      }
    } else if (lower.includes('économiser') || lower.includes('economiser') || lower.includes('denc') || lower.includes('épargne') || lower.includes('epargne') || lower.includes('combien puis-je')) {
      intent = 'SAVINGS_ADVICE';
      if (isWolof) {
        responseText = `💡 Mën nga denc ba **${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA** ci weer wi te dula jaaxal. Sa solde disponible tollu na ci ${summary.availableBalance.toLocaleString('fr-FR')} FCFA.`;
      } else {
        responseText = `💡 D'après vos flux récents, vous pouvez économiser sereinement jusqu'à **${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA** ce mois-ci tout en conservant votre train de vie habituel.`;
      }
    } else if (lower.includes('analyse') || lower.includes('bilan') || lower.includes('conseil') || lower.includes('conseils')) {
      intent = 'FINANCIAL_HEALTH';
      if (isWolof) {
        responseText = `📈 Bilan MoneyLink : Sa solde disponible mooy ${summary.availableBalance.toLocaleString('fr-FR')} FCFA. Dépense ayubés bi : ${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA. Digle : Ubbil benn coffre tontine ngir denc sa xaliss ci jàmm.`;
      } else {
        const trend = summary.weeklyVariationPercent > 0
          ? `Attention, vos dépenses sont en hausse de +${summary.weeklyVariationPercent}% cette semaine.`
          : `Bonne gestion, vos dépenses sont maîtrisées (-${Math.abs(summary.weeklyVariationPercent)}% cette semaine).`;
        responseText = `📈 **Analyse de votre santé financière MoneyLink** :\n- Solde disponible : **${summary.availableBalance.toLocaleString('fr-FR')} FCFA**\n- Dépenses de la semaine : **${summary.spentThisWeek.toLocaleString('fr-FR')} FCFA**\n- ${trend}\n- Capacité d'épargne estimée : **${summary.estimatedSavingsCapacity.toLocaleString('fr-FR')} FCFA**.`;
      }
    } else {
      intent = 'GENERAL_ASSISTANCE';
      if (isWolof) {
        responseText = `Dalal ak jàmm ! Man la sa assistant MoneyLink. Mën nga ma laaj : « Ñaata laa depensé ? », « Fan la sama xaliss di dem ? » walla « Ñaata laa mën a denc ? ».`;
      } else {
        responseText = `Bonjour ! Je suis votre **Assistant Financier MoneyLink**. Je peux analyser vos dépenses, identifier vos postes principaux d'achats, et vous proposer des conseils d'épargne sur-mesure. Posez-moi vos questions comme : *« Où part mon argent ? »* ou *« Combien puis-je économiser ce mois-ci ? »*.`;
      }
    }

    // Traitement via l'adaptateur de fournisseur d'IA (Natif ou API externe configurée via .env)
    const completionResult = await AiProviderAdapter.generateCompletion({
      prompt: question,
      financialSummary: summary,
      language: isWolof ? 'wo' : 'fr',
      nativeFallbackText: responseText
    });

    const finalResponseText = completionResult.text || responseText;
    const aiProviderUsed = completionResult.provider || 'NATIVE';

    // Sauvegarde de l'échange dans l'historique des conversations
    const userMsgId = `ai_usr_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const botMsgId = `ai_bot_${crypto.randomUUID ? crypto.randomUUID() : (Date.now() + 1)}`;
    const nowIso = new Date().toISOString();

    const userEntry = {
      id: userMsgId,
      user_id: userId,
      role: 'USER',
      message: question,
      intent,
      context_data: { language: isWolof ? 'wo' : 'fr', provider: aiProviderUsed },
      created_at: nowIso
    };

    const botEntry = {
      id: botMsgId,
      user_id: userId,
      role: 'ASSISTANT',
      message: finalResponseText,
      intent,
      context_data: {
        spent_this_week: summary.spentThisWeek,
        spent_this_month: summary.spentThisMonth,
        savings_capacity: summary.estimatedSavingsCapacity,
        provider: aiProviderUsed
      },
      created_at: new Date(Date.now() + 500).toISOString()
    };

    if (pool) {
      try {
        await query(
          'INSERT INTO ai_conversations (id, user_id, role, message, intent, context_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userEntry.id, userEntry.user_id, userEntry.role, userEntry.message, userEntry.intent, JSON.stringify(userEntry.context_data), userEntry.created_at]
        );
        await query(
          'INSERT INTO ai_conversations (id, user_id, role, message, intent, context_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [botEntry.id, botEntry.user_id, botEntry.role, botEntry.message, botEntry.intent, JSON.stringify(botEntry.context_data), botEntry.created_at]
        );
      } catch (dbErr) {
        console.warn('⚠️ Fallback memoryStore pour ai_conversations :', dbErr.message);
      }
    }

    if (memoryStore.ai_conversations) {
      memoryStore.ai_conversations.push(userEntry, botEntry);
    }

    return {
      question,
      response: finalResponseText,
      intent,
      provider: aiProviderUsed,
      summary,
      messageId: botMsgId,
      createdAt: botEntry.created_at
    };
  }

  /**
   * Récupère l'historique des conversations IA d'un utilisateur
   */
  static async getConversations(userId, limit = 50) {
    if (pool) {
      try {
        const res = await query(
          'SELECT * FROM ai_conversations WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
          [userId, limit]
        );
        if (res.rows && res.rows.length > 0) return res.rows;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getConversations :', err.message);
      }
    }

    if (memoryStore.ai_conversations) {
      return memoryStore.ai_conversations
        .filter(c => c.user_id === userId)
        .slice(-limit);
    }

    return [];
  }
}

export default AiService;
