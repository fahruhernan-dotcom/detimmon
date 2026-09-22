import React from 'react';
import { useRegistrationWizard } from './hooks/useRegistrationWizard';
import WizardHeader from './components/WizardHeader';
import WizardProgressBar from './components/WizardProgressBar';
import {
  WizardLoadingScreen,
  WizardNotFoundScreen,
  WizardClosedScreen
} from './components/WizardStateScreens';
import Step1PackageSelection from './components/Step1PackageSelection';
import Step2ParticipantIdentity from './components/Step2ParticipantIdentity';
import Step3PaymentInstructions from './components/Step3PaymentInstructions';
import Step4ProofUpload from './components/Step4ProofUpload';
import Step5SuccessReceipt from './components/Step5SuccessReceipt';
import DuplicateWarningModals from './components/DuplicateWarningModals';

/**
 * PublicRegistrationWizard — Mobile-First Public Web Registration Experience
 * Standalone intake portal: Public Web → Supabase
 * - 100% Isolated from Admin Command Center
 * - Dynamic per-event configuration & URL routing
 * - Atomic anti-duplication protection
 */
export default function PublicRegistrationWizard({ activeEvent = null }) {
  const wizard = useRegistrationWizard({ activeEvent });

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 flex flex-col justify-center items-center font-sans selection:bg-[#0A192F] selection:text-white">
      {/* Top Header & Brand Bar */}
      <WizardHeader
        onBack={wizard.handleBackToLanding}
        eventTitle={wizard.eventTitle}
      />

      {/* Loading State Screen */}
      {wizard.isLoadingEvent ? (
        <WizardLoadingScreen />
      ) : wizard.eventNotFound ? (
        <WizardNotFoundScreen />
      ) : !wizard.isRegistrationOpen ? (
        <WizardClosedScreen closeMessage={wizard.webConfig?.close_message} />
      ) : (
        /* Main Wizard Card */
        <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_12px_40px_rgba(10,25,47,0.06)] overflow-hidden animate-fade-in">
          {/* Step Progress Bar - Quiet Luxury 4-Phases */}
          <WizardProgressBar step={wizard.step} />

          <div className="p-6 sm:p-8 space-y-6">
            {/* ── STEP 1: PILIH PAKET & JADWAL ── */}
            {wizard.step === 1 && (
              <Step1PackageSelection
                isWebinar={wizard.isWebinar}
                eventDate={wizard.eventDate}
                eventTime={wizard.eventTime}
                eventVenue={wizard.eventVenue}
                webConfig={wizard.webConfig}
                packageType={wizard.packageType}
                setPackageType={wizard.setPackageType}
                groupPackageKey={wizard.groupPackageKey}
                isGroupPackage={wizard.isGroupPackage}
                currentEvent={wizard.currentEvent}
                singlePrice={wizard.singlePrice}
                groupPrice={wizard.groupPrice}
                groupTotalPax={wizard.groupTotalPax}
                groupPaidCount={wizard.groupPaidCount}
                groupBonusCount={wizard.groupBonusCount}
                voucherInput={wizard.voucherInput}
                setVoucherInput={wizard.setVoucherInput}
                appliedVoucher={wizard.appliedVoucher}
                voucherError={wizard.voucherError}
                voucherValidating={wizard.voucherValidating}
                handleApplyVoucher={wizard.handleApplyVoucher}
                handleRemoveVoucher={wizard.handleRemoveVoucher}
                onBack={wizard.handleBackToLanding}
                onNext={() => wizard.setStep(2)}
              />
            )}

            {/* ── STEP 2: IDENTITAS PESERTA ── */}
            {wizard.step === 2 && (
              <Step2ParticipantIdentity
                primaryData={wizard.primaryData}
                setPrimaryData={wizard.setPrimaryData}
                isGroupPackage={wizard.isGroupPackage}
                groupFillMode={wizard.groupFillMode}
                setGroupFillMode={wizard.setGroupFillMode}
                groupAdditionalCount={wizard.groupAdditionalCount}
                groupTotalPax={wizard.groupTotalPax}
                groupPaidCount={wizard.groupPaidCount}
                groupBonusCount={wizard.groupBonusCount}
                mabarMembers={wizard.mabarMembers}
                handleUpdateMember={wizard.handleUpdateMember}
                handleProceedFromStep2={wizard.handleProceedFromStep2}
                isCheckingStep2={wizard.isCheckingStep2}
                onBack={() => wizard.setStep(1)}
              />
            )}

            {/* ── STEP 3: INSTRUKSI PEMBAYARAN ── */}
            {wizard.step === 3 && (
              <Step3PaymentInstructions
                priceAmount={wizard.priceAmount}
                basePrice={wizard.basePrice}
                isGroupPackage={wizard.isGroupPackage}
                isWebinar={wizard.isWebinar}
                groupTotalPax={wizard.groupTotalPax}
                appliedVoucher={wizard.appliedVoucher}
                packageType={wizard.packageType}
                webConfig={wizard.webConfig}
                primaryData={wizard.primaryData}
                setPrimaryData={wizard.setPrimaryData}
                copiedAccount={wizard.copiedAccount}
                handleCopyAccount={wizard.handleCopyAccount}
                onBack={() => wizard.setStep(2)}
                onNext={() => wizard.setStep(4)}
              />
            )}

            {/* ── STEP 4: LAMPIRAN BUKTI TRANSFER ── */}
            {wizard.step === 4 && (
              <Step4ProofUpload
                proofMethod={wizard.proofMethod}
                setProofMethod={wizard.setProofMethod}
                proofDriveUrl={wizard.proofDriveUrl}
                setProofDriveUrl={wizard.setProofDriveUrl}
                proofFile={wizard.proofFile}
                setProofFile={wizard.setProofFile}
                proofPreview={wizard.proofPreview}
                setProofPreview={wizard.setProofPreview}
                isSubmitting={wizard.isSubmitting}
                handleSubmitRegistration={wizard.handleSubmitRegistration}
                onBack={() => wizard.setStep(3)}
              />
            )}

            {/* ── STEP 5: TANDA TERIMA RESMI ── */}
            {wizard.step === 5 && (
              <Step5SuccessReceipt
                registeredResult={wizard.registeredResult}
                eventTitle={wizard.eventTitle}
                webConfig={wizard.webConfig}
                sanitizePublicMessage={wizard.sanitizePublicMessage}
              />
            )}
          </div>
        </div>
      )}

      {/* ── DUPLICATE WARNING MODALS ── */}
      <DuplicateWarningModals
        duplicateModalOpen={wizard.duplicateModalOpen}
        setDuplicateModalOpen={wizard.setDuplicateModalOpen}
        duplicateModalData={wizard.duplicateModalData}
        onProceedDuplicateReceipt={wizard.handleProceedDuplicateReceipt}
        onProceedToUpdateProof={wizard.handleProceedToUpdateProof}
      />
    </div>
  );
}
