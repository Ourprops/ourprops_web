import { z } from 'zod'
import { create } from 'zustand'

import type { AcquisitionDraft, BoundaryDraft, DetailsDraft, LocationDraft, SavedDraft } from '@/lib/validators/property'

// Screens in the order the flow shows them
export const screenSchema = z.enum(['start', 'details', 'location', 'boundary', 'acquisition', 'documents', 'review', 'confirmation'])

export type Screen = z.infer<typeof screenSchema>;

const SCREENS = screenSchema.options;

export type NewPropertyStoreState = {
    /** The draft's id on the server, set by the first save */
    propertyId?: string;
    screen: Screen;
    savingDraft: boolean;
    draftSavedAt: Date | null;
    /** Whether the last save failed, so the user can see their changes aren't saved yet */
    draftSaveFailed: boolean;
    /** Whether the user opened this screen from review to change it, so Continue and Back return there */
    editingFromReview: boolean;
    /** Set while the draft is being deleted, so no save can run after it and bring the draft back */
    discarding: boolean;
    details: DetailsDraft;
    location: LocationDraft;
    /** The boundary or pin marked on the map, or null when there is none */
    boundary: BoundaryDraft;
    /** How the user came to own the property, or null before they answer */
    acquisition: AcquisitionDraft;
};

export type NewPropertyStoreActions = {
    setPropertyId: (propertyId: string) => void;
    setScreen: (screen: Screen) => void;
    setSavingDraft: (saving: boolean) => void;
    setDraftSavedAt: (savedAt: Date) => void;
    setDraftSaveFailed: (failed: boolean) => void;
    setDiscarding: (discarding: boolean) => void;
    handleNext: () => void;
    handleBack: () => void;
    /** Opens a screen to change it, returning to review when the user continues or goes back */
    editFromReview: (screen: Screen) => void;
    reset: () => void;
    /** Resumes a draft saved earlier, starting from the first step */
    loadDraft: (draft: SavedDraft) => void;
    /** Merges the given fields into the details draft */
    updateDetails: (details: DetailsDraft) => void;
    /** Merges the given fields into the location draft */
    updateLocation: (location: LocationDraft) => void;
    /** Replaces the boundary or pin; null clears it */
    setBoundary: (boundary: BoundaryDraft) => void;
    /** Replaces the answer about how the property was acquired */
    setAcquisition: (acquisition: AcquisitionDraft) => void;
};

export type NewPropertyStore = NewPropertyStoreState & NewPropertyStoreActions;

export const useNewPropertyStore = create<NewPropertyStore>((set) => ({
    propertyId: undefined,
    screen: 'start',
    savingDraft: false,
    draftSavedAt: null,
    draftSaveFailed: false,
    editingFromReview: false,
    discarding: false,
    // Parse so a bad value (for example from a URL or saved draft) fails loudly instead of leaving the flow on no screen
    setScreen: (screen: Screen) => set({ screen: screenSchema.parse(screen) }),
    setPropertyId: (propertyId: string) => set({ propertyId }),
    setSavingDraft: (saving: boolean) => set({ savingDraft: saving }),
    setDraftSavedAt: (savedAt: Date) => set({ draftSavedAt: savedAt }),
    setDraftSaveFailed: (failed: boolean) => set({ draftSaveFailed: failed }),
    setDiscarding: (discarding: boolean) => set({ discarding }),
    reset: () => set({ propertyId: undefined, screen: 'start', savingDraft: false, draftSavedAt: null, draftSaveFailed: false, editingFromReview: false, discarding: false, details: {}, location: {}, boundary: null, acquisition: null }),
    loadDraft: (draft: SavedDraft) => set({
        propertyId: draft.id,
        screen: 'details',
        savingDraft: false,
        draftSavedAt: new Date(draft.updatedAt),
        draftSaveFailed: false,
        editingFromReview: false,
        discarding: false,
        details: draft.details,
        location: draft.location,
        boundary: draft.boundary ?? null,
        acquisition: draft.acquisition ?? null,
    }),
    handleNext: () => set((state: NewPropertyStore) => {
        if (state.editingFromReview) return { screen: 'review', editingFromReview: false };
        const currentIndex = SCREENS.indexOf(state.screen);
        if (currentIndex === SCREENS.length - 1) return state;
        return { ...state, screen: SCREENS[currentIndex + 1] };
    }),
    handleBack: () => set((state: NewPropertyStore) => {
        if (state.editingFromReview) return { screen: 'review', editingFromReview: false };
        const currentIndex = SCREENS.indexOf(state.screen);
        if (currentIndex === 0) return state;
        return { ...state, screen: SCREENS[currentIndex - 1] };
    }),
    editFromReview: (screen: Screen) => set({ screen: screenSchema.parse(screen), editingFromReview: true }),
    details: {},
    updateDetails: (details: DetailsDraft) => set((state) => ({ details: { ...state.details, ...details } })),
    location: {},
    updateLocation: (location: LocationDraft) => set((state) => ({ location: { ...state.location, ...location } })),
    boundary: null,
    setBoundary: (boundary: BoundaryDraft) => set({ boundary }),
    acquisition: null,
    setAcquisition: (acquisition: AcquisitionDraft) => set({ acquisition }),
}))
