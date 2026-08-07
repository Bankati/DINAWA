'use client';

import { useState, useEffect, useCallback } from 'react';
import { paymentsApi, type PaymentDeclaration, type RejectPaymentDto } from '@/lib/payments';
import { ApiError } from '@/lib/auth-context';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Virement bancaire',
  CASH: 'Espèces',
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
};

export default function PaymentValidationPage() {
  const [pendingDeclarations, setPendingDeclarations] = useState<PaymentDeclaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentDeclaration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const loadPendingDeclarations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await paymentsApi.getPendingDeclarations();
      setPendingDeclarations(data);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erreur lors du chargement des paiements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingDeclarations();
  }, [loadPendingDeclarations]);

  const approvePayment = async (payment: PaymentDeclaration) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await paymentsApi.confirmPayment(payment.id);
      setSuccessMessage('Paiement approuvé avec succès');
      loadPendingDeclarations();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erreur lors de l'approbation");
    } finally {
      setIsLoading(false);
    }
  };

  const openRejectDialog = (payment: PaymentDeclaration) => {
    setSelectedPayment(payment);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const closeRejectDialog = () => {
    setSelectedPayment(null);
    setRejectionReason('');
    setShowRejectDialog(false);
  };

  const rejectPayment = async () => {
    if (!selectedPayment || !rejectionReason) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const dto: RejectPaymentDto = { rejectionReason };
      await paymentsApi.rejectPayment(selectedPayment.id, dto);
      setSuccessMessage('Paiement rejeté');
      closeRejectDialog();
      loadPendingDeclarations();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erreur lors du rejet');
    } finally {
      setIsLoading(false);
    }
  };

  const viewProof = (storagePath: string) => {
    window.open(storagePath, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHOD_LABELS[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Validation des paiements</h1>
        <p className="text-gray-600 mb-6">Validez ou rejetez les déclarations de paiement des locataires.</p>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900 text-xl">×</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900 text-xl">×</button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Chargement des paiements...</span>
          </div>
        ) : pendingDeclarations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement en attente</h3>
            <p className="text-gray-600">Tous les paiements ont été traités</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDeclarations.map((payment) => (
              <div key={payment.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4 pb-4 border-b">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {payment.lease?.tenant?.firstName} {payment.lease?.tenant?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{payment.lease?.tenant?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">{formatAmount(payment.paidAmount)} FCFA</p>
                    <p className="text-sm text-gray-600">{getPaymentMethodLabel(payment.paymentMethod)}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📅</span>
                    <span>Déclaré le {formatDate(payment.createdAt)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🏠</span>
                    <span>{payment.lease?.property?.address}</span>
                  </div>
                  {payment.note && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📝</span>
                      <span>{payment.note}</span>
                    </div>
                  )}
                </div>

                {payment.proofStoragePath && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center">
                    <span className="mr-2">📷</span>
                    <span className="flex-1 text-sm text-gray-700">Preuve de paiement disponible</span>
                    <button
                      onClick={() => viewProof(payment.proofStoragePath!)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Voir la preuve
                    </button>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => openRejectDialog(payment)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center"
                  >
                    <span className="mr-2">✕</span>
                    Rejeter
                  </button>
                  <button
                    onClick={() => approvePayment(payment)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <span className="mr-2">✓</span>
                    Approuver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showRejectDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeRejectDialog}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Rejeter le paiement</h2>
              <p className="text-gray-600 mb-4">
                Veuillez indiquer la raison du rejet de ce paiement de {formatAmount(selectedPayment?.paidAmount || 0)} FCFA.
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Raison du rejet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                rows={4}
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeRejectDialog}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={rejectPayment}
                  disabled={!rejectionReason}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
