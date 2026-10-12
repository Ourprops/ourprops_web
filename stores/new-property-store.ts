import { z } from 'zod'
import { create } from 'zustand'

// Screens in the order the flow shows them
export const screenSchema = z.enum(['start', 'details', 'location', 'map', 'acquisition', 'documents', 'review', 'confirmation'])

export type Screen = z.infer<typeof screenSchema>;

const SCREENS = screenSchema.options;

export const Details = z.object({
    name: z.string().min(1, "Property name is required"),
    type: z.enum(['residential', 'commercial', 'industrial', 'land', 'mixed-use', 'other']),
    description: z.string().optional(),
})

export const regionSchema = z.enum(["Greater Accra", "Ashanti", "Eastern", "Western", "Central", "Northern", "Upper East", "Upper West", "Volta", "Bono", "Bono East", "Ahafo", "North East", "Oti", "Savannah", "Western North"])

export const Location = z.object({
    address: z.string().optional(),
    city: z.string().min(1, "City is required"),
    municipality: z.string().min(1, "Municipality is required"),
    region: regionSchema
})


export type NewPropertyStoreState = {
    screen: Screen;
    /** When the draft was last saved, or null if it hasn't been saved yet */
    draftSavedAt: Date | null;
    details: z.infer<typeof Details> | null;
    location: z.infer<typeof Location> | null;
};

export type NewPropertyStoreActions = {
    setScreen: (screen: Screen) => void;
    handleNext: () => void;
    handleBack: () => void;
    reset: () => void;
    setDetails: (details: z.infer<typeof Details>) => void;
    setLocation: (location: z.infer<typeof Location>) => void;
};

export type NewPropertyStore = NewPropertyStoreState & NewPropertyStoreActions;



export const useNewPropertyStore = create<NewPropertyStore>((set) => ({
    screen: 'start',
    draftSavedAt: null,
    // Parse so a bad value (for example from a URL or saved draft) fails loudly instead of leaving the flow on no screen
    setScreen: (screen: Screen) => set({ screen: screenSchema.parse(screen) }),
    // TODO: persist the draft once there is an API for it. For now this only records the save time.
    reset: () => set({ screen: 'start', draftSavedAt: null }),
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
    details: null,
    setDetails: (details: z.infer<typeof Details>) => set({ details }),
    location: null,
    setLocation: (location: z.infer<typeof Location>) => set({ location }),
}))
