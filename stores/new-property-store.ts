import { z } from 'zod'
import { create } from 'zustand'

import type { DetailsDraft, Location } from '@/lib/validators/property'

// Screens in the order the flow shows them
export const screenSchema = z.enum(['start', 'details', 'location', 'map', 'acquisition', 'documents', 'review', 'confirmation'])

export type Screen = z.infer<typeof screenSchema>;

const SCREENS = screenSchema.options;

export type NewPropertyStoreState = {
    propertyId?: string;
    screen: Screen;
    savingDraft: boolean;
    draftSavedAt: Date | null;
    details: DetailsDraft;
    location: Location | null;
};

export type NewPropertyStoreActions = {
    setPropertyId: (propertyId: string) => void;
    setScreen: (screen: Screen) => void;
    setSavingDraft: (saving: boolean) => void;
    setDraftSavedAt: (savedAt: Date) => void;
    handleNext: () => void;
    handleBack: () => void;
    reset: () => void;
    /** Merges the given fields into the details draft */
    updateDetails: (details: DetailsDraft) => void;
    setLocation: (location: Location) => void;
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
    // TODO: persist the draft once there is an API for it. For now this only records the save time.
    reset: () => set({ screen: 'start', savingDraft: false, draftSavedAt: null, details: {}, location: null }),
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
    location: null,
    setLocation: (location: Location) => set({ location }),
}))
