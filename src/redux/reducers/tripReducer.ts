// Define the state interface
interface TripState {
  tripData: Record<string, any>;
  selectedRequest: any | null;
}

// Define action types as string literals
type TripAction = 
  | { type: 'SET_TRIP_DATA'; payload: Record<string, any> }
  | { type: 'SET_SELECTED_REQUEST'; payload: any }
  | { type: string; payload?: any }; // fallback

const initialState: TripState = {
  tripData: {},
  selectedRequest: null,
};

const tripReducer = (state = initialState, action: TripAction): TripState => {
  switch (action.type) {
    case 'SET_TRIP_DATA':
      return {
        ...state,
        tripData: {
          ...state.tripData,
          ...action.payload,
        },
      };
    case 'SET_SELECTED_REQUEST':
      return {
        ...state,
        selectedRequest: action.payload,
      };
    default:
      return state;
  }
};

export default tripReducer;
