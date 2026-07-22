(function attachFamilyPilotScope(root){
  'use strict';

  const activeOperations = state => (Array.isArray(state?.operations) ? state.operations : [])
    .filter(operation => operation?.status === 'active');

  const wallets = state => Array.isArray(state?.wallets) ? state.wallets : [];

  function canAccessWallet(state, wallet) {
    if (!wallet || wallet.archivedAt) return false;
    if (wallet.ownerMemberId && wallet.ownerMemberId === state?.currentMemberId) return true;
    if (!Array.isArray(wallet.allowedMemberIds)) return true;
    return wallet.allowedMemberIds.includes(state?.currentMemberId);
  }

  function accessibleWallets(state) {
    const available = wallets(state).filter(wallet => canAccessWallet(state, wallet));
    return available.length ? available : wallets(state).filter(wallet => !wallet.archivedAt);
  }

  function defaultWallet(state) {
    const available = accessibleWallets(state);
    return available.find(wallet => wallet.type === 'household_default') || available[0] || null;
  }

  function activeWallet(state) {
    const available = accessibleWallets(state);
    return available.find(wallet => wallet.id === state?.activeWalletId) || defaultWallet(state);
  }

  const isPersonalWallet = wallet => wallet?.type === 'personal';

  function visibleOperations(state) {
    const selected = activeWallet(state);
    if (!selected) return [];
    const operations = activeOperations(state);
    if (isPersonalWallet(selected)) {
      return operations.filter(operation => operation.walletId === selected.id);
    }
    const householdWalletIds = new Set(
      accessibleWallets(state)
        .filter(wallet => !isPersonalWallet(wallet))
        .map(wallet => wallet.id)
    );
    return operations.filter(operation => householdWalletIds.has(operation.walletId));
  }

  function householdCapitalOperations(state) {
    const includedWalletIds = new Set(
      wallets(state)
        .filter(wallet => !wallet.archivedAt && wallet.includedInHouseholdCapital === true)
        .map(wallet => wallet.id)
    );
    return activeOperations(state).filter(operation => includedWalletIds.has(operation.walletId));
  }

  function totals(operations) {
    return operations.reduce((result, operation) => {
      const amount = Number(operation?.amount) || 0;
      if (operation?.kind === 'income') result.income += amount;
      if (operation?.kind === 'expense') result.expense += amount;
      return result;
    }, { income: 0, expense: 0 });
  }

  function capitalSnapshot(state) {
    const selected = activeWallet(state);
    if (!selected) {
      return { wallet: null, scope: 'household', currency: state?.household?.baseCurrency || 'EUR', opening: 0, income: 0, expense: 0, change: 0, capital: 0 };
    }

    if (isPersonalWallet(selected)) {
      const operations = activeOperations(state).filter(operation => operation.walletId === selected.id);
      const flow = totals(operations);
      const opening = Number(selected.openingBalance) || 0;
      const change = flow.income - flow.expense;
      return {
        wallet: selected,
        scope: 'personal',
        currency: selected.nativeCurrency || state?.household?.baseCurrency || 'EUR',
        opening,
        ...flow,
        change,
        capital: opening + change
      };
    }

    const operations = householdCapitalOperations(state);
    const flow = totals(operations);
    const opening = Number(state?.household?.openingCapital) || 0;
    const additionalOpening = wallets(state)
      .filter(wallet => wallet.type !== 'household_default' && wallet.includedInHouseholdCapital === true)
      .reduce((sum, wallet) => sum + (Number(wallet.openingBalance) || 0), 0);
    const change = flow.income - flow.expense;
    return {
      wallet: selected,
      scope: 'household',
      currency: state?.household?.baseCurrency || selected.nativeCurrency || 'EUR',
      opening: opening + additionalOpening,
      ...flow,
      change,
      capital: opening + additionalOpening + change
    };
  }

  function scopeDescriptor(state) {
    const selected = activeWallet(state);
    const personal = isPersonalWallet(selected);
    return {
      wallet: selected,
      scope: personal ? 'personal' : 'household',
      currency: personal ? (selected?.nativeCurrency || state?.household?.baseCurrency || 'EUR') : (state?.household?.baseCurrency || 'EUR'),
      capitalTitle: personal ? 'Личный капитал' : 'Капитал',
      capitalLabel: personal ? (selected?.name || 'Личный кошелёк') : 'включённые кошельки',
      operationsLabel: personal ? (selected?.name || 'Личный кошелёк') : 'Семейный контекст',
      analyticsLabel: personal ? (selected?.name || 'Личный кошелёк') : 'Семейный контекст'
    };
  }

  root.FamilyPilotScope = Object.freeze({
    activeOperations,
    canAccessWallet,
    accessibleWallets,
    defaultWallet,
    activeWallet,
    isPersonalWallet,
    visibleOperations,
    householdCapitalOperations,
    totals,
    capitalSnapshot,
    scopeDescriptor
  });
})(typeof window !== 'undefined' ? window : globalThis);
