import { z } from 'zod'
import { create } from 'zustand'

import type { DetailsDraft, LocationDraft, SavedDraft } from '@/lib/validators/property'

// Screens in the order the flow shows them
export const screenSchema = z.enum(['start', 'details', 'location', 'map', 'acquisition', 'documents', 'review', 'confirmation'])

export type Screen = z.infer<typeof screenSchema>;

const SCREENS = screenSchema.options;

export type NewPropertyStoreState = {
    /** The draft's id on the server, set by the first save */
    propertyId?: string;
    screen: Screen;
    savingDraft: boolean;
    draftSavedAt: Date | null;
    details: DetailsDraft;
    location: LocationDraft;
};

export type NewPropertyStoreActions = {
    setPropertyId: (propertyId: string) => void;
    setScreen: (screen: Screen) => void;
    setSavingDraft: (saving: boolean) => void;
    setDraftSavedAt: (savedAt: Date) => void;
    handleNext: () => void;
    handleBack: () => void;
    reset: () => void;
    /** Resumes a draft saved earlier, starting from the first step */
    loadDraft: (draft: SavedDraft) => void;
    /** Merges the given fields into the details draft */
    updateDetails: (details: DetailsDraft) => void;
    /** Merges the given fields into the location draft */
    updateLocation: (location: LocationDraft) => void;
};

export type NewPropertyStore = NewPropertyStoreState & NewPropertyStoreActions;



export const useNewPropertyStore = create<NewPropertyStore>((set) => ({
    propertyId: undefined,
    screen: 'start',
    savingDraft: false,
    draftSavedAt: null,
    // Parse so a bad value (for example from a URL or saved draft) fails loudly instead of leaving the flow on no screen
    setScreen: (screen: Screen) => set({ screen: screenSchema.parse(screen) }),
    setPropertyId: (propertyId: string) => set({ propertyId }),
    setSavingDraft: (saving: boolean) => set({ savingDraft: saving }),
    setDraftSavedAt: (savedAt: Date) => set({ draftSavedAt: savedAt }),
    reset: () => set({ propertyId: undefined, screen: 'start', savingDraft: false, draftSavedAt: null, details: {}, location: {} }),
    loadDraft: (draft: SavedDraft) => set({
        propertyId: draft.id,
        screen: 'details',
        savingDraft: false,
        draftSavedAt: new Date(draft.updatedAt),
        details: draft.details,
        location: draft.location,
    }),
    handleNext: () => set((state: NewPropertyStore) => {
        const currentIndex = SCREENS.indexOf(state.screen);
        if (currentIndex === SCREENS.length - 1) return state;
        return { ...state, screen: SCREENS[currentIndex + 1] };
    }),
    handleBack: () => set((state: NewPropertyStore) => {
        const currentIndex = SCREENS.indexOf(state.screen);
        if (currentIndex === 0) return state;
        return { ...state, screen: SCREENS[currentIndex - 1] };
    }),
    details: {},
    updateDetails: (details: DetailsDraft) => set((state) => ({ details: { ...state.details, ...details } })),
    location: {},
    updateLocation: (location: LocationDraft) => set((state) => ({ location: { ...state.location, ...location } })),
}))
